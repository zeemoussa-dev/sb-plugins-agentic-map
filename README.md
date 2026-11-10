# Agents Map — a Second Brain OS plugin

Draws every agent on an install by Section and kind around the knowledge base:
Workers on the outer ring, Experts in the middle, Producers inside. Click a
Section's hub to focus it, and an agent to open its panel: overview, chat,
history and schedule. **Ctrl+K** finds an agent. A card on Home shows how many
agents each Section has, and which agent your own messages go to.

## Who sees what

On an install with several people, each person's map is their own:

- **Agents by audience.** The framework lists only the agents a person may
  reach (open to everyone, to Admins, or to named people). Admins see every
  agent.
- **Your Primary.** If you have your own Primary, it sits on a hub of its own,
  marked *Your Primary*. Other people's Primaries are not on your map. Admins
  see them all on a *People's Primaries* hub.
- **Audience and vaults, for people who manage agents.** An agent's overview
  says who it is open to and which vaults it holds. A vault you are not a member
  of is counted, never named. An Admin who is not named on a named-people agent
  gets a note in place of a chat that would be refused.

The chat is the framework's own panel, with its activity list and **Show
reasoning** switch. The plugin has no settings.

## The Guide

The plugin ships its Guide in `wiki/`: **Agents Map** in the Wiki's Plugins group, with
pages on reading the map, the agent and Section panels, who sees what, and setup and
troubleshooting. The map's **?** dialog links to it.

## Installing and checking

Install it from **Admin Center › Marketplace** on a Second Brain OS host with Plugin API
14.8 or later in 14.x (`framework_api` 14.8.0). It needs no other plugin.

From the framework repository, `src/backend/scripts/check_plugin.py <this repo>` runs every
gate: manifest, imports, Help and the Guide, these tests, and a real build of the screens.
