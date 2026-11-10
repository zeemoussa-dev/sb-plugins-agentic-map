# CHANGELOG

All notable changes to the Agents Map plugin. The framework (Second Brain) is a
separate repository and is never copied in here.

## [Unreleased]

## 2.1.0 — 2026-11-10

Built for Plugin API 14.8 (`framework_api` 14.8.0), which requires a Guide and Help.

- docs: the Guide, `wiki/`, five pages in the Wiki's Plugins group: what the map is for, reading and moving around it, the agent and Section panels, who sees what, and setup and troubleshooting.
- feat(ui): the map's **?** dialog links to the Guide (the canvas has no title row, so no ⓘ), and its text says what the panel holds now.
- feat(ui): the Help entry covers the Section panel, creating, and who sees what.
- test: the framework's own Help and Guide rule run against this repository, and the Guide's links checked.

## 2.0.0 — 2026-11-08

Rebuilt for Plugin API 14 (`framework_api` 14.0.0). A 13.x host refuses it, and a 14 host refused 1.0.0.

- feat: each person's map is their own. The framework already lists only the agents a person's audience admits (ADR-161); the map also keeps other people's own Primaries (ADR-156) off a non-Admin's map. Admins still see every agent.
- feat: every person's own Primary is drawn on a hub of its own, “Your Primary” or, for an Admin, “People's Primaries”, instead of among the unplaced agents. The viewer's own is marked in its panel, and an agent an Admin assigned to the person says so.
- feat: for someone who manages agents, an agent's overview shows who it is open to (everyone, Admins only, named people) and the vaults it holds. A vault the viewer is not a member of is counted, never named (ADR-150/151).
- feat: an Admin not named on a named-people agent is told so instead of being offered a chat the framework would refuse.
- feat: the Home card counts the same agents the map draws (plugins' own agents and other people's Primaries were counted before) and names the agent the person's messages go to.
- test: the manifest against the host's API, and the who-sees-what rules run in Node.

## 1.0.0 — 2026-11-05

- feat: the Agents Map, moved out of the framework (its `ADR-125`) into this plugin, at `/agentic-map` in the Agents section of the sidebar. Its canvas, Section drill-downs, search, about panel, and agent and Section side panels are as they were; creating an agent or a Pipeline uses the framework's own dialogs.
- feat: a Home card, small or wide: how many agents each Section has, each linking to that Section on the map.
- feat: its Help entry, "Agents Map".
