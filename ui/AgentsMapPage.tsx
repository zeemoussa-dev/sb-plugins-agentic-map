import { useCallback, useEffect, useState } from 'react';
import { useUrlSelection } from '../../pluginHost/framework';
import { AgentsMapCanvas } from './AgentsMapCanvas';
import { AgentDetailPanel } from './AgentDetailPanel';
import { SectionDetailPanel } from './SectionDetailPanel';
import { PipelineDetailPanel } from '../../pluginHost/framework';
import { AgentsMapSearchPalette } from './AgentsMapSearchPalette';
import { AgentsMapAboutPanel } from './AgentsMapAboutPanel';
import { AgentTypeMenu, type AgentTypeMenuChoice } from '../../pluginHost/framework';
import { CreateExpertWizardModal, type CreatableAgentType } from '../../pluginHost/framework';
import { PipelineEditorModal } from '../../pluginHost/framework';
import { CreateSectionModal } from './CreateSectionModal';
import { fetchAgentList, type AgentDetail, type JobTreeEntry } from '../../pluginHost/framework';
import { PageLoading } from '../../pluginHost/framework';
import { EmptyState } from '../../pluginHost/framework';
import { Icon } from '../../pluginHost/framework';
import { fetchSections } from '../../pluginHost/framework';
import { useAuth } from '../../pluginHost/framework';
import { layoutAgents, type ClusterMarker, type DependencyEdge } from './layoutAgents';
import {
  agentsForViewer,
  fetchMyPrimary,
  isSyntheticSection,
  placePersonPrimaries,
  primariesSection,
  type MyPrimary,
  type Viewer,
} from './people';
import {
  spliceAllPipelineJobTrees,
  fetchAllPipelineJobTrees,
  fetchPipelineRefs,
  type PipelineRef,
} from './pipelineJobTreeAdapter';
import type { AgentSection, MockAgent } from './mockAgents';

export function AgentsMapPage() {
  const { user } = useAuth();
  // The framework's own rule for seeing every agent is the Admin role (`may_see_definition`).
  const viewerId = user.id;
  const viewerIsAdmin = user.role === 'admin';
  const [myPrimary, setMyPrimary] = useState<MyPrimary | null>(null);
  const [sections, setSections] = useState<AgentSection[]>([]);
  const [agents, setAgents] = useState<MockAgent[]>([]);
  // Every fetched agent, unreduced (REQ-SB-38-US-01) — `agents` above is
  // `layout.mapAgents`, which now deliberately excludes any agent a
  // cluster marker represents (T01). SectionDrilldown/ClusterDrilldown
  // both need the full set so a Section's own full drill-down never loses
  // an agent to clustering (Scenario 6) and a cluster's own drill-down can
  // resolve its represented agent ids to real agent data.
  const [fullAgents, setFullAgents] = useState<MockAgent[]>([]);
  const [clusters, setClusters] = useState<ClusterMarker[]>([]);
  const [dependencyEdges, setDependencyEdges] = useState<DependencyEdge[]>([]);
  // REQ-SB-66-US-01-T07 -- the SAME per-pipeline Job trees
  // spliceAllPipelineJobTrees already consumes below, flattened and also
  // stored here (no new fetch) so a later click can be resolved against
  // real Job ids without asking the backend a second time (ADR-044
  // Decision 3). Generalized 2026-08-22 from one hardcoded pipeline to
  // every real Pipeline (ADR-004) -- flat, since a Job is looked up by id
  // alone regardless of which Pipeline it came from.
  const [jobs, setJobs] = useState<JobTreeEntry[]>([]);
  // Job id -> its own real parent Pipeline id -- a flattened `jobs` array
  // alone loses this once there's more than one Pipeline (2026-08-22);
  // clicking a Step opens the panel of the Pipeline it belongs to.
  const [jobPipelineIds, setJobPipelineIds] = useState<Map<string, string>>(new Map());
  // 2026-08-30 (operator: "Currently we don't have any Access to the
  // pipeline") -- the SAME per-pipeline Job trees fetchAllPipelineJobTrees
  // already builds (kept in full, not flattened, unlike `jobs` above) --
  // AgentsMapCanvas.tsx needs each Job's own real `depends_on` to find
  // the true entry point (depends_on: []), not just its id, for the new
  // floating pipeline-title label's own placement + whole-chain hover
  // highlight. `pipelineRefs` carries the label's own name/description.
  const [pipelineJobTrees, setPipelineJobTrees] = useState<Map<string, JobTreeEntry[]>>(new Map());
  const [pipelineRefs, setPipelineRefs] = useState<PipelineRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useUrlSelection('agent');
  // Pipeline title label's own click target — independent of
  // selectedAgentId/selectedSectionId (a Pipeline label is never the
  // same click target as an Agent node or a Section Hub).
  const [selectedPipelineId, setSelectedPipelineId] = useUrlSelection('pipeline');
  // 2026-08-30 (operator: "when I hover in the panel it puts the agent
  // i am hovering on in the focus") -- PipelineDetailPanel's own
  // currently-hovered Step id, relayed down to AgentsMapCanvas ->
  // SectionDrilldown, which drives its existing click-to-focus camera
  // from this instead of (or alongside) selectedAgentId.
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  // 2026-08-23 -- SectionDetailPanel's own id, independent of
  // selectedAgentId (a Section Hub and an Agent node are never the same
  // click target, so no id-collision handling is needed the way
  // selectedJob below disambiguates within selectedAgentId).
  const [selectedSectionId, setSelectedSectionId] = useUrlSelection('section');
  // REQ-SB-46-US-01-T01 — the popup wizard's own open/closed flag; the
  // conditional mount below (`{isWizardOpen && <CreateExpertWizardModal .../>}`)
  // is what makes Scenario 11's "closing discards the draft" true by
  // construction, mirroring this file's own existing
  // `{selectedAgentId && <AgentDetailPanel .../>}` pattern.
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<CreatableAgentType>('expert');
  const [isNewPipelineOpen, setIsNewPipelineOpen] = useState(false);
  const [isNewSectionOpen, setIsNewSectionOpen] = useState(false);
  // 2026-08-30 (operator: "The Plus Should show a context menu ... to
  // create Expert, Producer, Worker, Pipeline and Section") — the FAB's
  // own type-select popover state, independent of isWizardOpen: the menu
  // closes the instant a real choice opens its wizard (or on any outside
  // click), never stacked on top of the wizard itself.
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);

  // Extracted so a newly created agent (T05's real onCreated call) can
  // re-run the exact same fetch/layout sequence the mount effect below
  // already runs, refreshing the map with zero duplicated logic.
  const refreshAgents = useCallback(() => {
    let cancelled = false;
    Promise.all([
      fetchAgentList(),
      fetchSections(),
      // fetchAllPipelineJobTrees already degrades per-pipeline internally
      // (a failed /pipelines or individual /jobs fetch just means that
      // Pipeline's single summary node stays unspliced) -- never left to
      // this Promise.all's own rejection, never the full blank-map
      // fallback below (REQ-SB-65-US-01-T02's own degrade constraint).
      fetchAllPipelineJobTrees(),
      // A real, separate fetch from the one fetchAllPipelineJobTrees
      // makes internally (it discards its own refs once it's built
      // pipelineJobTrees) -- refs carry name/description, needed for
      // the pipeline-title label itself, not just job splicing. Same
      // degrade posture: an empty [] on failure just means no labels
      // render, never blocks the rest of the map.
      fetchPipelineRefs().catch(() => [] as PipelineRef[]),
    ])
      .then(([agentList, sectionList, pipelineJobTrees, refs]) => {
        if (cancelled) return;
        // A plugin's own agents are listed on Admin › Background Agents, not drawn here (`ADR-111`).
        // Other people's own Primaries are theirs (ADR-156): only an Admin sees them, and every
        // person's Primary sits on the Primaries hub rather than among the unplaced agents.
        const viewer: Viewer = { userId: viewerId, isAdmin: viewerIsAdmin };
        const ownAgents = placePersonPrimaries(agentsForViewer(agentList.filter((agent) => !agent.plugin), viewer));
        const adaptedAgentList = spliceAllPipelineJobTrees(ownAgents, pipelineJobTrees);
        const layout = layoutAgents(adaptedAgentList, sectionList, [primariesSection(viewer)]);
        setSections(layout.sections);
        setAgents(layout.mapAgents);
        setClusters(layout.clusters);
        setDependencyEdges(layout.dependencyEdges);
        setJobs(Array.from(pipelineJobTrees.values()).flat());
        const pipelineIdByJobId = new Map<string, string>();
        for (const [pipelineId, jobList] of pipelineJobTrees) {
          for (const job of jobList) pipelineIdByJobId.set(job.id, pipelineId);
        }
        setJobPipelineIds(pipelineIdByJobId);
        setPipelineJobTrees(pipelineJobTrees);
        setPipelineRefs(refs);
        // Was a manually-built placeholder array (angleDeg:0, radius:0 —
        // "recomputed by layoutSectionDrilldown() inside every drill-down
        // consumer, never rendered"). That comment stopped being true once
        // layoutSectionDrilldown() started STRETCHING the overview's own
        // already-computed angleDeg/radius instead of discarding them
        // (operator, 2026-08-15: "Same Branch View... more space so
        // spread them") — fed all-zero placeholders, every agent's
        // radiusFraction came out identically negative, collapsing the
        // whole Section View's Agents onto one point below the visible
        // canvas ("The View is empty"). `layout.mapAgents` already has
        // real, tree-shaped geometry AND already contains every eligible
        // agent (clustering — the ONLY reason this used to need a
        // separately-built "full", cluster-marker-unreduced set — is
        // itself dead code right now, `layout.clusters` always `[]`), so
        // reusing it here directly is both simpler and correct.
        setFullAgents(layout.mapAgents);
      })
      .catch(() => {
        if (!cancelled) {
          setSections([]);
          setAgents([]);
          setFullAgents([]);
          setClusters([]);
          setDependencyEdges([]);
          setJobs([]);
          setPipelineJobTrees(new Map());
          setPipelineRefs([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewerId, viewerIsAdmin]);

  useEffect(() => refreshAgents(), [refreshAgents]);

  useEffect(() => {
    let cancelled = false;
    fetchMyPrimary().then((primary) => {
      if (!cancelled) setMyPrimary(primary);
    });
    return () => {
      cancelled = true;
    };
  }, [viewerId]);

  function handleAgentCreated(_agent: AgentDetail) {
    setIsWizardOpen(false);
    refreshAgents();
  }

  // 2026-08-30 (operator: "clicking on the pipeline doesn't bring the
  // pipeline in the focus" -> later corrected, "camera needs to pan and
  // zoom a bit if needed to keep the pipeline end to end visible") --
  // just opening the panel is enough: SectionDrilldown.tsx's own
  // pipelineFocusId prop (selectedPipelineId, set below) already drives
  // BOTH the idle ring/card fallback (its own real entry-point Step)
  // AND the whole-chain camera fit on its own, with no extra state
  // needed here. An earlier version ALSO set hoveredStepId to the entry
  // Step on click, reusing the same state a real Step-row hover drives
  // -- that's what broke "hovering the job in the panel should zoom to
  // the job:" a click left hoveredStepId permanently pointed at the
  // entry Step, so the camera kept zooming to just that one node
  // instead of ever framing the whole chain, and hovering a DIFFERENT
  // Step overwrote it correctly but nothing ever cleared it back.
  function handleSelectPipeline(pipelineId: string) {
    setSelectedPipelineId(pipelineId);
  }

  const hasAgents = agents.length > 0;
  const realSectionCount = sections.filter((section) => !isSyntheticSection(section.id)).length;

  // ADR-044 Decision 3 -- resolves a clicked id against the already-fetched
  // Job list (no new fetch); `null` means selectedAgentId is a real Agent
  // id (or nothing is selected), so AgentDetailPanel mounts exactly as
  // before. AgentsMapCanvas.tsx's own click-handling stays uniform -- this
  // branch lives entirely here, one layer up.
  const selectedJob = selectedAgentId ? jobs.find((job) => job.id === selectedAgentId) ?? null : null;

  return (
    // Flex column filling `.main`'s own real height (operator, 2026-08-15:
    // "Not fixed I need to Scoll a full Page to See the Map" — a PRIOR fix
    // attempt guessed a fixed `calc(100vh - Npx)` offset to approximate
    // the topbar's own footprint, which only ever worked by coincidence at
    // the exact viewport size it was measured against; CSS Grid items
    // (`.main` itself, via `.app-shell`'s own `display: grid`) have a
    // definite size for percentage resolution, so `min-height: 100%` here
    // tracks `.main`'s REAL height directly — whatever it actually is —
    // instead of guessing it. `.agents-map-stage` (agents-map.css) is
    // `flex: 1` so it fills exactly whatever's left after the topbar,
    // with no magic numbers on either side.
    <div className="agents-map-page">
      {/* Top bar (operator, 2026-08-15: "Bring the Page Header top Bar
          and Fit it into our current design") — ported from html-
          prototype/agents-map-skilltree-exploration.html's own
          `.skillmap-topbar` (left: search + doctrine triggers, center:
          wordmark, right: live counts). Adapted, not copied verbatim:
          the app already has its own "Second Brain" wordmark in the
          persistent Sidebar, so the center slot shows this page's own
          title instead of a redundant second wordmark; the prototype's
          fullscreen-toggle button has no real feature behind it here,
          so it's dropped rather than ported as a dead control. */}
      <div className="agents-map-topbar">
        <div className="agents-map-topbar-left">
          <AgentsMapSearchPalette agents={fullAgents} sections={sections} onSelectAgent={setSelectedAgentId} />
          <AgentsMapAboutPanel sectionCount={realSectionCount} agentCount={fullAgents.length} />
        </div>
        <span className="agents-map-topbar-title">Agents Map</span>
        <span className="agents-map-topbar-right">
          {realSectionCount} section{realSectionCount === 1 ? '' : 's'} &middot; {fullAgents.length} agent{fullAgents.length === 1 ? '' : 's'} mapped
        </span>
      </div>
      {loading ? (
        <div className="agents-map-stage">
          <PageLoading title="Loading your Agents Map…" />
        </div>
      ) : (
        <AgentsMapCanvas
          sections={sections}
          agents={agents}
          fullAgents={fullAgents}
          clusters={clusters}
          dependencyEdges={dependencyEdges}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
          onSelectSection={setSelectedSectionId}
          pipelineRefs={pipelineRefs}
          pipelineJobTrees={pipelineJobTrees}
          onSelectPipeline={handleSelectPipeline}
          externalFocusAgentId={hoveredStepId}
          pipelineFocusId={selectedPipelineId}
        />
      )}
      {!loading && !hasAgents && (
        <EmptyState
          icon="hub"
          title="No agents connected yet."
          action={(
            <button type="button" className="btn btn-primary" onClick={() => setIsTypeMenuOpen(true)}>
              <Icon name="add" />Create agent
            </button>
          )}
        >
          Sections and Hubs appear here once an agent exists.
        </EmptyState>
      )}
      {selectedAgentId && selectedJob && jobPipelineIds.has(selectedJob.id) && (
        <PipelineDetailPanel
          pipelineId={jobPipelineIds.get(selectedJob.id) as string}
          onClose={() => setSelectedAgentId(null)}
          onHoverStep={setHoveredStepId}
        />
      )}
      {selectedAgentId && !selectedJob && (
        <AgentDetailPanel
          agentId={selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
          onAgentUpdated={refreshAgents}
          myPrimary={myPrimary}
        />
      )}
      {selectedSectionId && !isSyntheticSection(selectedSectionId) && (
        <SectionDetailPanel
          sectionId={selectedSectionId}
          onClose={() => setSelectedSectionId(null)}
          onSectionUpdated={refreshAgents}
        />
      )}
      {selectedPipelineId && (
        <PipelineDetailPanel
          pipelineId={selectedPipelineId}
          // Clears the canvas focus explicitly here, not via a mount-
          // lifecycle cleanup effect inside PipelineDetailPanel itself
          // (that approach broke under React 18 StrictMode's dev-mode
          // double-invoke -- its simulated mount->unmount->remount ran
          // the cleanup immediately, wiping out the focus this same
          // click had just set via handleSelectPipeline above).
          onClose={() => {
            setSelectedPipelineId(null);
            setHoveredStepId(null);
          }}
          onHoverStep={setHoveredStepId}
          onChanged={refreshAgents}
        />
      )}
      <button
        type="button"
        className="map-fab"
        data-testid="map-fab-create-agent"
        onClick={() => setIsTypeMenuOpen(true)}
        aria-label="Create agent"
        title="Create agent"
      >
        <Icon name="add" />
      </button>
      {isTypeMenuOpen && (
        <AgentTypeMenu
          onClose={() => setIsTypeMenuOpen(false)}
          onSelect={(choice: AgentTypeMenuChoice) => {
            setIsTypeMenuOpen(false);
            if (choice === 'pipeline') {
              setIsNewPipelineOpen(true);
            } else if (choice === 'section') {
              setIsNewSectionOpen(true);
            } else {
              setWizardType(choice);
              setIsWizardOpen(true);
            }
          }}
        />
      )}
      {isWizardOpen && (
        <CreateExpertWizardModal
          agentType={wizardType}
          onClose={() => setIsWizardOpen(false)}
          onCreated={handleAgentCreated}
        />
      )}
      {isNewPipelineOpen && (
        <PipelineEditorModal
          pipeline={null}
          onClose={() => setIsNewPipelineOpen(false)}
          onSaved={(saved) => {
            setIsNewPipelineOpen(false);
            refreshAgents();
            setSelectedPipelineId(saved.id);
          }}
        />
      )}
      {isNewSectionOpen && (
        <CreateSectionModal
          onClose={() => setIsNewSectionOpen(false)}
          onCreated={() => {
            setIsNewSectionOpen(false);
            refreshAgents();
          }}
        />
      )}
    </div>
  );
}
