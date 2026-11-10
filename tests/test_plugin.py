"""The Agents Map plugin's own checks: its manifest against the host, and the rules in
`ui/people.ts` that decide what each person sees (run in Node, which strips the types)."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((REPO / "plugin.json").read_text(encoding="utf-8"))
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")


def test_manifest_versions_are_semver():
    assert SEMVER.match(MANIFEST["version"])
    assert SEMVER.match(MANIFEST["framework_api"])


def test_framework_api_major_matches_the_host():
    plugin_api = pytest.importorskip("app.plugin_api")
    assert MANIFEST["framework_api"].split(".")[0] == plugin_api.FRAMEWORK_API.split(".")[0]


def test_framework_api_is_not_newer_than_the_host():
    plugin_api = pytest.importorskip("app.plugin_api")
    ours = tuple(int(part) for part in MANIFEST["framework_api"].split("."))
    host = tuple(int(part) for part in plugin_api.FRAMEWORK_API.split("."))
    assert ours <= host


def _framework_guide_rule():
    """The framework's own Help and Guide rule (14.8), loaded by file path as its checker does."""
    import importlib.util

    plugin_api = pytest.importorskip("app.plugin_api")
    path = Path(plugin_api.__file__).parent / "business" / "core" / "plugins" / "plugin_guide.py"
    if not path.is_file():
        pytest.skip("this framework has no plugin_guide.py")
    spec = importlib.util.spec_from_file_location("plugin_guide", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_guide_and_help_pass_the_framework_rule():
    rule = _framework_guide_rule()
    assert rule.guide_problems(REPO, MANIFEST["id"]) == []
    assert rule.help_problems(REPO) == []


def test_guide_links_name_its_own_pages():
    pages = {path.stem for path in (REPO / "wiki").glob("*.md")}
    for path in (REPO / "wiki").glob("*.md"):
        for target in re.findall(r"\(wiki:([^)\s]+)\)", path.read_text(encoding="utf-8")):
            assert target in pages, f"{path.name} links to wiki:{target}, which is not a page"


_PEOPLE_CHECKS = r"""
import assert from 'node:assert/strict';
import * as people from './plugin/ui/people.ts';

const alice = { userId: 'u-alice', isAdmin: false };
const admin = { userId: 'u-admin', isAdmin: true };
const agents = [
  { id: 'default', section_id: null },
  { id: 'primary-u-alice', section_id: null },
  { id: 'primary-u-bob', section_id: null },
  { id: 'sales-expert', section_id: 'sales' },
];

// A person sees their own Primary and not anyone else's; an Admin sees all of them.
assert.deepEqual(people.agentsForViewer(agents, alice).map((a) => a.id), ['default', 'primary-u-alice', 'sales-expert']);
assert.equal(people.agentsForViewer(agents, admin).length, 4);

// Every person's Primary goes to the Primaries hub; other agents keep their Section.
const placed = people.placePersonPrimaries(agents);
assert.deepEqual(placed.map((a) => a.section_id), [null, people.PRIMARIES_SECTION_ID, people.PRIMARIES_SECTION_ID, 'sales']);
assert.equal(people.primariesSection(alice).name, 'Your Primary');
assert.equal(people.primariesSection(admin).name, "People's Primaries");
assert.ok(people.isSyntheticSection(people.PRIMARIES_SECTION_ID));
assert.ok(people.isSyntheticSection('__unplaced'));
assert.ok(!people.isSyntheticSection('sales'));

// The chat rule mirrors the framework's own.
const named = { agent_id: 'x', audience: 'members', members: ['u-alice'] };
assert.ok(people.mayChat(null, alice));
assert.ok(people.mayChat({ agent_id: 'x', audience: 'everyone', members: [] }, alice));
assert.ok(people.mayChat({ agent_id: 'x', audience: 'admins', members: [] }, admin));
assert.ok(!people.mayChat({ agent_id: 'x', audience: 'admins', members: [] }, alice));
assert.ok(people.mayChat(named, alice));
assert.ok(!people.mayChat(named, admin));
assert.equal(people.audienceLabel(named), '1 named person');
assert.equal(people.audienceLabel({ agent_id: 'x', audience: 'admins', members: [] }), 'Admins only');

// A vault the viewer is not a member of is counted, never named.
const seen = people.grantsSeenBy(
  [{ vault_id: 'v1', mode: 'write' }, { vault_id: 'v2', mode: 'read' }, { vault_id: 'v3', mode: 'read' }],
  [{ vault_id: 'v1', name: 'Team', role: 'editor' }],
);
assert.deepEqual(seen, { named: [{ name: 'Team', mode: 'write' }], elsewhere: 2 });
assert.equal(people.grantsText(seen), 'Team (reads and writes), 2 vaults you are not a member of');
assert.equal(people.grantsText({ named: [], elsewhere: 0 }), 'No vault granted');
console.log('ok');
"""


def test_people_rules(tmp_path: Path):
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node is not on PATH")
    # The layout the screens are built in: `<root>/plugin/ui/people.ts` beside `<root>/pluginHost/`.
    ui = tmp_path / "plugin" / "ui"
    ui.mkdir(parents=True)
    host = tmp_path / "pluginHost"
    host.mkdir()
    (host / "api.ts").write_text("export function apiFetch(): Promise<never> { return Promise.reject(new Error('offline')); }\n", encoding="utf-8")
    (host / "framework.ts").write_text("export {};\n", encoding="utf-8")
    source = (REPO / "ui" / "people.ts").read_text(encoding="utf-8")
    source = source.replace("'../../pluginHost/api'", "'../../pluginHost/api.ts'").replace(
        "'../../pluginHost/framework'", "'../../pluginHost/framework.ts'"
    )
    (ui / "people.ts").write_text(source, encoding="utf-8")
    (tmp_path / "check.mts").write_text(_PEOPLE_CHECKS, encoding="utf-8")
    completed = subprocess.run(
        [node, "--experimental-strip-types", "--no-warnings", "check.mts"],
        cwd=tmp_path, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert completed.stdout.strip().endswith("ok")
