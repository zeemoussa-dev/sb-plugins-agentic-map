import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { HomeCardProps } from '../../pluginHost/types';
import { fetchAgentList, fetchSections, isBackgroundAgent, refusalText, useAuth, type AgentSummary, type SectionSummary } from '../../pluginHost/framework';
import { agentsForViewer, fetchMyPrimary, isPersonPrimary, type MyPrimary } from './people';

/** The map's card on Home: how many agents there are in each Section, each
 * linking to that Section on the map, and the agent the person's own messages go to. */
export function MapHomeCard({ size }: HomeCardProps) {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [myPrimary, setMyPrimary] = useState<MyPrimary | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const viewer = { userId: user.id, isAdmin: user.role === 'admin' };
    // The same agents the map draws: the framework has already left out what the person's
    // audience does not admit; other people's own Primaries and plugins' agents are not counted.
    fetchAgentList().then(
      (list) => setAgents(agentsForViewer(
        list.filter((agent) => !agent.id.startsWith('pipeline:') && !agent.plugin && !isBackgroundAgent(agent)),
        viewer,
      )),
      (error) => setFailure(refusalText(error)),
    );
    fetchSections().then(setSections, () => setSections([]));
    fetchMyPrimary().then(setMyPrimary);
  }, [user.id, user.role]);

  if (failure) return <p className="text-muted">{failure}</p>;
  if (!agents) return <p className="text-muted">Loading the map…</p>;

  const counted = sections
    .map((section) => ({ section, count: agents.filter((agent) => agent.section_id === section.id).length }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  const shown = counted.slice(0, size === 'small' ? 4 : 8);
  const primaryAgent = myPrimary?.agent_id ? agents.find((agent) => agent.id === myPrimary.agent_id) ?? null : null;
  const primaryCount = agents.filter((agent) => isPersonPrimary(agent.id)).length;

  return (
    <>
      <p className="text-muted">
        {agents.length} agent{agents.length === 1 ? '' : 's'} in {counted.length} Section{counted.length === 1 ? '' : 's'}.
      </p>
      {primaryAgent && (
        <p>
          Your messages go to{' '}
          <Link to={`/agentic-map?agent=${encodeURIComponent(primaryAgent.id)}`}>{primaryAgent.name}</Link>
          {myPrimary?.own ? ', your own Primary.' : '.'}
        </p>
      )}
      <ul className="home-list">
        {shown.map(({ section, count }) => (
          <li key={section.id}>
            <Link to={`/agentic-map?section=${encodeURIComponent(section.id)}`}>{section.name}</Link>
            <span className="home-list-when text-muted">{count}</span>
          </li>
        ))}
        {size !== 'small' && user.role === 'admin' && primaryCount > 0 && (
          <li>
            <span>People&apos;s own Primaries</span>
            <span className="home-list-when text-muted">{primaryCount}</span>
          </li>
        )}
      </ul>
      <Link className="home-card-more" to="/agentic-map">Open the map</Link>
    </>
  );
}
