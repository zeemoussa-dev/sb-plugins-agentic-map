---
title: Setup and troubleshooting
summary: Installing the Agents Map, its Home card, what it needs, and what to do when the map looks wrong.
order: 5
screens: [/agentic-map]
---

## Setup

An Admin installs the Agents Map from **Admin Center › Marketplace**. It needs Second Brain OS on Plugin API 14.8 or later. It needs no other plugin, and it has **no settings**: it draws what the install already holds.

Once it is installed, **Agents Map** appears in the sidebar's Agents group. An Admin can move or hide it on Admin Center › This install › Navigation.

## The Home card

Add the **Agents Map** card to Home when you edit Home. It comes small or wide and shows:

- how many agents are on your map, and in how many Sections;
- the agent your own messages go to;
- the Sections with the most agents, each a link to that Section on the map (four when small, eight when wide).

It counts the same agents your map draws.

## When something looks wrong

| What you see | Why, and what to do |
|---|---|
| **"No agents connected yet."** | There is no agent you may see. Create one with **+**, or ask an Admin whether the agents' audiences leave you out. |
| **An agent you expect is missing** | Its audience may not include you, so ask an Admin. Agents that belong to a plugin run in the background and are listed on Admin Center › Background Agents, not on the map. Another person's own Primary is never on your map. |
| **An agent sits on the "Agents" hub** | It has no Section. Put it in one on its own settings page. |
| **The Chat tab says only named people can chat** | You are an Admin, but you are not on that agent's list. Ask whoever manages the agent to add you. |
| **"Open to" or "Vaults" is missing from an Overview** | Only people who may manage agents see them, and a Pipeline has neither. |
| **History says the agent worker cannot be reached** | The agent engine is not running. Check System Health. |
| **The plugin shows as incompatible** | The install is on a different Plugin API from the one this version was built for. Update the plugin from the Marketplace, or update the app. |
| **The map looks different after an app update** | The map uses the app's own styles, so an app update can change how it looks. |
