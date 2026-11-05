import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { agentEditPath, sessionPath } from '../../pluginHost/framework';
import { EmptyState, LoadingState } from '../../pluginHost/framework';
import { Icon, IconButton } from '../../pluginHost/framework';
import { Notice } from '../../pluginHost/framework';
import { StatusBadge } from '../../pluginHost/framework';
import { Tabs } from '../../pluginHost/framework';
import { ConfirmDialog } from '../../pluginHost/framework';
import { deleteAgent, fetchAgent, type AgentDetail } from '../../pluginHost/framework';
import { ExpandableText } from '../../pluginHost/framework';
import { AgentChatPanel } from '../../pluginHost/framework';
import { fetchHermesSessions, type HermesSession } from '../../pluginHost/framework';
import { AgentJobsTab } from '../../pluginHost/framework';
import { useAuth } from '../../pluginHost/framework';
import { refusalText } from '../../pluginHost/framework';

interface AgentDetailPanelProps {
  agentId: string;
  onClose: () => void;
  // 2026-08-22 -- this panel's own `agent` state updates immediately on a
  // successful mutation, but AgentsMapPage's own separate `agents` state
  // (what the map canvas renders from) is told through this. Optional so
  // this panel still works standalone/in tests with no parent to notify.
  onAgentUpdated?: () => void;
}

// A quick look and a chat. Every setting is on the agent's own page (`ADR-123`).
const TABS = ['overview', 'chat', 'history', 'settings', 'schedule'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  chat: 'Chat',
  history: 'History',
  settings: 'Settings',
  schedule: 'Schedule',
};

function getAgentPurpose(agent: AgentDetail): string {
  const purposeEntry = agent.settings.find((row) => row.key === 'Purpose');
  if (purposeEntry) return purposeEntry.value;
  const domainEntry = agent.settings.find((row) => row.key === 'Domain');
  if (domainEntry) return domainEntry.value;
  // An agent never has a Purpose/Domain settings row (that shape is
  // deliberately never fabricated), but does have instructions.
  if (agent.prompt) return agent.prompt;
  return 'No stated purpose recorded for this agent.';
}

const WORKING_MODE_LABELS: Record<AgentDetail['working_mode'], string> = {
  autonomous: 'Autonomous',
  supervised: 'Supervised',
  manual: 'Manual',
};

// Same formatting as AgentActivityPage.tsx's own (duplicated per this
// codebase's small-helper convention, ADR-002) -- session timestamps are
// real UNIX epoch seconds, not pre-formatted strings.
function formatSessionTimestamp(epochSeconds: number | null): string {
  if (epochSeconds === null) return '—';
  return new Date(epochSeconds * 1000).toLocaleString();
}

function formatSessionDuration(startedAt: number | null, endedAt: number | null): string {
  if (startedAt === null || endedAt === null) return '—';
  const totalSeconds = Math.max(0, Math.round(endedAt - startedAt));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function AgentDetailPanel({ agentId, onClose, onAgentUpdated }: AgentDetailPanelProps) {
  const { may } = useAuth();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailure, setDeleteFailure] = useState<string | null>(null);
  // This agent's session log, filtered server-side by agentId. null while not
  // yet fetched, [] once fetched with no real sessions found.
  const [hermesSessions, setHermesSessions] = useState<HermesSession[] | null>(null);
  const [sessionsUnavailable, setSessionsUnavailable] = useState<string | null>(null);

  useEffect(() => {
    setAgent(null); // clear stale content immediately on agent switch
    setActiveTab('overview');
    setDeleteFailure(null);
    setHermesSessions(null); // clear the previous agent's session log on switch
    fetchAgent(agentId).then(setAgent);
  }, [agentId]);

  useEffect(() => {
    // History tab, not Overview (operator, 2026-08-23).
    if (activeTab !== 'history') return;
    fetchHermesSessions(30, 0, agentId).then(
      (response) => {
        setHermesSessions(response.sessions ?? []);
        setSessionsUnavailable(response.reachable ? null : 'The agent worker cannot be reached, so this agent\'s sessions cannot be read.');
      },
      () => {
        setHermesSessions([]);
        setSessionsUnavailable('This agent\'s sessions could not be read.');
      },
    );
  }, [activeTab, agentId]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAgent(agentId);
      setConfirmingDelete(false);
      onAgentUpdated?.();
      onClose();
    } catch (error) {
      setConfirmingDelete(false);
      setDeleteFailure(refusalText(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {confirmingDelete && agent && (
        <ConfirmDialog
          title={`Delete ${agent.name}?`}
          confirmLabel="Delete agent"
          busy={deleting}
          testId="agent-delete"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => void handleDelete()}
        >
          Its definition, instructions and grants are removed, and nothing routes to it any more. Its past
          sessions stay in Agent Activity. An agent another one still asks is not deleted: you are told which.
        </ConfirmDialog>
      )}
      <div className="side-panel-overlay" onClick={onClose} />
      <aside className="side-panel" aria-label="Agent details">
        <div className="side-panel-header">
          <span className="badge">Agent detail</span>
          <IconButton icon="close" label="Close panel" onClick={onClose} />
        </div>
        {agent && (
          <>
            <div className="side-panel-title">
              <h2>{agent.name} <StatusBadge tone="accent">{agent.type}</StatusBadge></h2>
            </div>
            <div className="side-panel-tabbar">
              <Tabs
                label="Agent sections"
                value={activeTab}
                onChange={(next) => setActiveTab(next as Tab)}
                tabs={TABS.map((tab) => ({ value: tab, label: TAB_LABELS[tab] }))}
              />
            </div>
          </>
        )}
        <div className="side-panel-body">
          {!agent && (
            <div data-testid="agent-detail-loading">
              <LoadingState label="Loading agent" />
            </div>
          )}
          {agent && (
            <div className="side-panel-agent" data-agent-detail={agent.id}>
              {activeTab === 'overview' && (
                <div className="side-panel-section" data-testid="agent-overview-tab">
                  <h3>Overview</h3>
                  <div className="kv-list">
                    {agent.description && (
                      <div className="kv-row" data-testid="overview-description">
                        <span className="kv-key">Description</span>
                        <ExpandableText text={agent.description} />
                      </div>
                    )}
                    <div className="kv-row" data-testid="overview-purpose">
                      <span className="kv-key">Purpose</span>
                      <ExpandableText text={getAgentPurpose(agent)} />
                    </div>
                    <div className="kv-row" data-testid="overview-working-mode">
                      <span className="kv-key">Working mode</span>
                      <span>{WORKING_MODE_LABELS[agent.working_mode]}</span>
                    </div>
                    <div className="kv-row" data-testid="overview-guardrails">
                      <span className="kv-key">Guardrails</span>
                      <ExpandableText text={agent.guardrails || 'No guardrails set yet'} />
                    </div>
                    <div className="kv-row" data-testid="overview-scope">
                      <span className="kv-key">Vault scope</span>
                      <span>{agent.scope.length > 0 ? agent.scope.join(', ') : 'No vault scope assigned yet'}</span>
                    </div>
                    <div className="kv-row" data-testid="overview-tools">
                      <span className="kv-key">Tools</span>
                      <span>{agent.tools.length > 0 ? agent.tools.join(', ') : 'No tools enabled'}</span>
                    </div>
                    <div className="kv-row" data-testid="overview-depends-on">
                      <span className="kv-key">Works for</span>
                      <span>{agent.depends_on.length > 0 ? agent.depends_on.join(', ') : 'Nobody — it is not a specialist'}</span>
                    </div>
                    <div className="kv-row" data-testid="overview-preferred-indexes">
                      <span className="kv-key">Preferred indexes</span>
                      <span>
                        {agent.preferred_index_ids.length > 0
                          ? agent.preferred_index_ids.join(', ')
                          : 'None linked'}
                      </span>
                    </div>
                  </div>
                  <div className="side-panel-section-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setActiveTab('chat')}
                      data-testid="overview-chat-link"
                    >
                      <Icon name="chat" />Chat with {agent.name}
                    </button>
                    {/* Fetches nothing here: that view is one expensive composed read
                        (BUG-086), paid only when the operator navigates to it.
                        A Pipeline has no definition of this kind to read. */}
                    {agent.provider_id === 'hermes' && (
                      <Link
                        className="btn"
                        to={`/agents/${agentId}/profile`}
                        data-testid="overview-profile-detail-link"
                      >
                        Agent definition (instructions, skills, tools, jobs)
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <>
                  {/* Settings live on one page (`ADR-123`): this panel is for a quick look and a chat. */}
                  <div className="side-panel-section" data-testid="agent-settings-moved">
                    <h3>Settings</h3>
                    {deleteFailure && <Notice tone="error">{deleteFailure}</Notice>}
                    <p className="settings-hint">
                      Everything about {agent.name} is set on its own page: identity and vault, instructions,
                      model and tools, routing, schedules, workflows, and a dashboard of how it is doing.
                    </p>
                    <Link className="btn btn-primary" to={agentEditPath(agentId)} data-testid="agent-open-settings">
                      <Icon name="tune" />Open {agent.name}&apos;s settings
                    </Link>
                  </div>
                  {may('manage_agents') && agentId !== 'default' && (
                    <div className="side-panel-section">
                      <h3>Delete this agent</h3>
                      <p className="settings-hint">
                        Removes the agent and its definition. Its past sessions stay in Agent Activity.
                      </p>
                      <button type="button" className="btn btn-danger" disabled={deleting} onClick={() => setConfirmingDelete(true)}>
                        <Icon name="delete" />Delete agent
                      </button>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'chat' && (
                <div className="side-panel-section side-panel-section--chat">
                  <AgentChatPanel
                    agentId={agentId}
                    agentName={agent.name}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="side-panel-section">
                  <h3 style={{ marginTop: 'var(--space-4)' }}>Sessions</h3>
                  {hermesSessions === null ? (
                    <LoadingState rows={3} label="Loading sessions" />
                  ) : sessionsUnavailable ? (
                    <Notice tone="error" testId="history-sessions-unavailable">
                      {sessionsUnavailable}
                    </Notice>
                  ) : hermesSessions.length === 0 ? (
                    <EmptyState icon="history" title="No sessions found for this agent yet." testId="history-no-sessions">
                      Each conversation or job run of this agent appears here.
                    </EmptyState>
                  ) : (
                    <div className="log-list" data-testid="history-sessions">
                      {hermesSessions.map((session) => (
                        <div className="log-item" key={session.id}>
                          <span>
                            {session.is_active ? (
                              <StatusBadge tone="info">Active</StatusBadge>
                            ) : (
                              <StatusBadge tone="success">Done</StatusBadge>
                            )}{' '}
                            <Link to={sessionPath(session.id)}>{session.title || '(untitled session)'}</Link>
                            {' — '}{session.message_count} message
                            {session.message_count === 1 ? '' : 's'}
                            {session.ended_at !== null &&
                              ` — ${formatSessionDuration(session.started_at, session.ended_at)}`}
                          </span>
                          <span className="log-item-meta">{formatSessionTimestamp(session.started_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'schedule' && <AgentJobsTab agentId={agentId} />}

            </div>
          )}
        </div>
      </aside>
    </>
  );
}
