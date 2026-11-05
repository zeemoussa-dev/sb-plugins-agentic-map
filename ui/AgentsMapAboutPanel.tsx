import { useState } from 'react';
import { Link } from 'react-router';
import { Dialog } from '../../pluginHost/framework';
import { IconButton } from '../../pluginHost/framework';

interface AgentsMapAboutPanelProps {
  sectionCount: number;
  agentCount: number;
}

// Doctrine / "how to read this map" overlay — ported from html-prototype/
// agents-map-skilltree-exploration.html's own #skillmapAbout panel (lines
// ~213-231), rewritten against this app's real Section/Hub/ring model
// (concentric Worker/Expert/Producer rings via polarLayout.ts, not the
// prototype's own hex/tree layout — see AgentsMapCanvas.tsx). The shared
// Dialog, which owns Escape-to-close itself.
export function AgentsMapAboutPanel({ sectionCount, agentCount }: AgentsMapAboutPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <IconButton
        icon="help"
        label="How to read this map"
        className="map-about-trigger"
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <Dialog
          title="How to read this map" onClose={() => setIsOpen(false)}
          footer={<Link className="btn btn-ghost" to="/help?topic=agents-map" onClick={() => setIsOpen(false)}>More in Help</Link>}
        >
          <div className="map-about-panel">
            <p className="map-about-tag">
              {sectionCount} section{sectionCount === 1 ? '' : 's'} &middot; {agentCount} agent{agentCount === 1 ? '' : 's'} mapped &middot; 1 Knowledge Base
            </p>

            <div className="map-about-sec">THE RULE</div>
            <p>
              Every agent belongs to exactly one Section (a domain) and exactly one Type, which sets
              its ring: <b>Worker</b> (outermost — runs a recurring capture job), <b>Expert</b> (middle
              — answers questions over the vault), or <b>Producer</b> (innermost — maintains a living
              document). The Knowledge Base sits at the center; agents read from it and Producers
              write back to it.
            </p>

            <div className="map-about-sec">HUBS</div>
            <p>
              Each Section has one Hub. Click a Hub — or the space around it — to focus that Section
              full-size; the arrows at the edges of a focused Section page directly to the next Section
              without returning to the overview first.
            </p>

            <div className="map-about-sec">READING A NODE</div>
            <p>
              Click any agent to open its detail panel — settings, capabilities, and its assigned
              Skills. A dashed marker means more agents than fit on screen at once; click it to see the
              rest.
            </p>
          </div>
        </Dialog>
      )}
    </>
  );
}
