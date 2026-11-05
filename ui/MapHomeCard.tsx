import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { HomeCardProps } from '../../pluginHost/types';
import { fetchAgentList, fetchSections, isBackgroundAgent, refusalText, type AgentSummary, type SectionSummary } from '../../pluginHost/framework';

/** The map's card on Home: how many agents there are in each Section, each
 * linking to that Section on the map. */
export function MapHomeCard({ size }: HomeCardProps) {
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    fetchAgentList().then(
      (list) => setAgents(list.filter((agent) => !agent.id.startsWith('pipeline:') && !isBackgroundAgent(agent))),
      (error) => setFailure(refusalText(error)),
    );
    fetchSections().then(setSections, () => setSections([]));
  }, []);

  if (failure) return <p className="text-muted">{failure}</p>;
  if (!agents) return <p className="text-muted">Loading the map…</p>;

  const counted = sections
    .map((section) => ({ section, count: agents.filter((agent) => agent.section_id === section.id).length }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  const shown = counted.slice(0, size === 'small' ? 4 : 8);

  return (
    <>
      <p className="text-muted">
        {agents.length} agent{agents.length === 1 ? '' : 's'} in {counted.length} Section{counted.length === 1 ? '' : 's'}.
      </p>
      <ul className="home-list">
        {shown.map(({ section, count }) => (
          <li key={section.id}>
            <Link to={`/agentic-map?section=${encodeURIComponent(section.id)}`}>{section.name}</Link>
            <span className="home-list-when text-muted">{count}</span>
          </li>
        ))}
      </ul>
      <Link className="home-card-more" to="/agentic-map">Open the map</Link>
    </>
  );
}
