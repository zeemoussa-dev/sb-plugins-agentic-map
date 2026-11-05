# CLAUDE.md — sb-plugins-agentic-map

Guidance for Claude Code working in **this** repository.

## What this repository is

The source of the **Agents Map plugin** for Second Brain OS: the map that draws
every agent by Section and kind around the knowledge base, its drill-downs and
search, each agent's and Section's side panel, and a card for Home.

A published version is installed into an install from its Marketplace. The
framework itself no longer carries the map (`ADR-125` there).

## What this repository is not

- **Not the framework.** Second Brain is a **separate repository**. Its source
  never appears here, and this plugin may import only what the framework exports
  to plugins.
- **Not where agents are set up.** Creating an agent or a Pipeline and editing an
  agent are framework screens (Admin Center › Agents). This plugin opens the
  framework's own dialogs for them, through `pluginHost/framework`.

## Layout

```
plugin.json     id, name, version, framework_api
ui/             the map page, its panels, and the Home card (index.tsx exports them)
```

No backend: every route the map reads is the framework's own.

## Rules

- **The screens import only their own files, `src/pluginHost/`, and react /
  react-router.** Publishing refuses anything else. What the framework offers is
  `pluginHost/framework.ts`, `pluginHost/api.ts`, `pluginHost/types.ts` and the
  other `pluginHost` modules.
- **A framework export this plugin needs and lacks is asked for there**, as an
  addition to `pluginHost/framework.ts`, never copied in here.
- **`framework_api`'s major must match the host's.** When the framework moves
  its major, this plugin is republished against it or it will not load.
- **Publish before believing anything.** `publish_plugin.py <repo> --dry-run` in
  the framework runs every gate, including a real build of these screens.
- **Separate commits per logical change**, never skip hooks, never force-push.
  Update `CHANGELOG.md` and bump `version` for a change that ships.
