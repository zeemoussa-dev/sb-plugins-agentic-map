import type { PluginUi } from '../../pluginHost/types';
import { AgentsMapPage } from './AgentsMapPage';
import { MapHomeCard } from './MapHomeCard';

const ui: PluginUi = {
  routes: [{ path: '/agentic-map', component: AgentsMapPage }],
  nav: [{ to: '/agentic-map', label: 'Agents Map', icon: 'hub', group: 'agents' }],
  homeCards: [{
    id: 'map',
    title: 'Agents Map',
    description: 'How many agents each Section has, each a link to it on the map.',
    sizes: ['small', 'wide'],
    defaultSize: 'small',
    requires: 'view_agents',
    href: '/agentic-map',
    component: MapHomeCard,
  }],
  help: [{
    id: 'agents-map',
    title: 'Agents Map',
    summary: 'Every agent, drawn by Section and kind around the knowledge base.',
    body: 'Each Section has a hub; its agents sit on rings by kind: **Workers** outside (they run jobs), **Experts** in the middle (they answer questions) and **Producers** inside (they keep a document up to date). Click a hub to focus its Section, and click it again for the Section\'s panel. Click an agent to open its panel: overview, chat, history, settings and schedule. **Ctrl+K** finds an agent, and **+** creates an agent, a Pipeline or a Section.\n\nYou see only the agents open to you. Your own Primary sits on a hub of its own. The Guide, **Agents Map** in the Wiki\'s Plugins group, has the rest.',
    keywords: ['map', 'agents', 'sections', 'worker', 'expert', 'producer', 'hub', 'primary', 'audience', 'pipeline'],
    href: '/agentic-map',
  }],
};

export default ui;
