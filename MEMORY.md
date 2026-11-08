# MEMORY

Standing rules for this repository — what an agent must know to change the Agents
Map plugin without breaking an install. Rules only: no history, no narrative.

**Scope.** This file covers **this plugin only**. Second Brain (the framework) is a
separate repository with its own memory; nothing about its internals belongs here.
A capability this plugin needs and the framework lacks is recorded here and raised
there.

---

- **[2026-11-05] The map's styles are still the framework's.** Its class names
  (`agents-map-*`, `map-*`) are defined in the framework's `styles/agents-map.css`,
  which is not part of the plugin contract. Until they move here, a framework
  change to that file can change how the map looks.

- **[2026-11-05] Selection lives in the URL.** `?agent=<id>` opens an agent's panel
  and `?section=<id>` a Section's, through `useUrlSelection`; the Home card links
  to `/agentic-map?section=<id>`. Keep both working when changing the page.

- **[2026-11-08] Audience is the framework's job; Primaries are ours.** `GET /agents`
  already leaves out what a caller's audience does not admit, so the map never filters
  by audience. It does keep other people's own Primaries (`primary-<user id>`) off a
  non-Admin's map, which is display only: the framework does not restrict them.
  The rules are in `ui/people.ts` and tested in Node from `tests/test_plugin.py`.

- **[2026-11-08] Hubs whose id starts with `__` are not Sections.** `__unplaced` and
  `__primaries` have no Section panel and are not counted as Sections
  (`isSyntheticSection`).

- **[2026-11-08] Audience and vault grants are read only by someone with
  `manage_agents`.** Those routes are under `/admin`. A vault the viewer is not a
  member of is counted, never named.
