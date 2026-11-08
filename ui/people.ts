import { apiFetch } from '../../pluginHost/api';
import type { SectionSummary } from '../../pluginHost/framework';

// Who is looking at the map, and what of it is theirs (framework API 14, ADR-152/155/156/167).
//
// The framework already leaves out of `GET /agents` every agent whose audience does not admit
// the caller (ADR-161), so nothing here hides an agent for its audience. What it does not leave
// out is other people's own Primaries: they are ordinary agents open to everyone. This file
// keeps each person's map to their own, and gives every person's Primary a hub of its own
// instead of the unplaced one.

/** A person's own Primary is `primary-<user id>` (ADR-156). */
export const PERSON_PRIMARY_PREFIX = 'primary-';
export const PRIMARIES_SECTION_ID = '__primaries';

export interface Viewer {
  userId: string;
  /** Matches the framework's own rule for seeing an agent at all: Admins see every agent. */
  isAdmin: boolean;
}

export function isPersonPrimary(agentId: string): boolean {
  return agentId.startsWith(PERSON_PRIMARY_PREFIX);
}

export function ownPrimaryId(userId: string): string {
  return `${PERSON_PRIMARY_PREFIX}${userId}`;
}

/** The agents this person should find on the map: everything the framework gave, less
 * other people's own Primaries unless the viewer is an Admin (who sets their grants). */
export function agentsForViewer<T extends { id: string }>(agents: T[], viewer: Viewer): T[] {
  if (viewer.isAdmin) return agents;
  const own = ownPrimaryId(viewer.userId);
  return agents.filter((agent) => !isPersonPrimary(agent.id) || agent.id === own);
}

/** Puts every person's Primary on the Primaries hub. */
export function placePersonPrimaries<T extends { id: string; section_id: string | null }>(agents: T[]): T[] {
  return agents.map((agent) => (isPersonPrimary(agent.id) ? { ...agent, section_id: PRIMARIES_SECTION_ID } : agent));
}

export function primariesSection(viewer: Viewer): SectionSummary {
  return {
    id: PRIMARIES_SECTION_ID,
    name: viewer.isAdmin ? "People's Primaries" : 'Your Primary',
    agent_ids: [], color: null, icon: null,
    subtitle: null, description: null, folders: [], fallback_agent_id: null,
  };
}

/** A hub the map draws that is not a real Section, so it has no Section panel. */
export function isSyntheticSection(sectionId: string): boolean {
  return sectionId.startsWith('__');
}

// --- What `/me/primary` says: the agent a person's messages go to. ---

export interface MyPrimary {
  agent_id: string | null;
  /** True when it is the person's own Primary, false when an Admin assigned another agent. */
  own: boolean;
}

/** `null` when the host cannot say (an older 14 host, or no chat capability). */
export function fetchMyPrimary(): Promise<MyPrimary | null> {
  return apiFetch<MyPrimary>('/me/primary').catch(() => null);
}

// --- An agent's audience and vault grants, read by someone who manages agents. ---

export type Audience = 'everyone' | 'admins' | 'members';

export interface AgentAudience {
  agent_id: string;
  audience: Audience;
  members: string[];
}

export function fetchAgentAudience(agentId: string): Promise<AgentAudience | null> {
  return apiFetch<AgentAudience>(`/admin/agents/${encodeURIComponent(agentId)}/audience`).catch(() => null);
}

export function audienceLabel(audience: AgentAudience): string {
  if (audience.audience === 'admins') return 'Admins only';
  if (audience.audience === 'members') {
    const count = audience.members.length;
    return count === 0 ? 'Named people (none named yet)' : `${count} named ${count === 1 ? 'person' : 'people'}`;
  }
  return 'Everyone';
}

/** Mirrors the framework's own chat rule (`may_person_chat`): an Admin is never left out of an
 * Admins-only agent, but is let into a named-people agent only when named. */
export function mayChat(audience: AgentAudience | null, viewer: Viewer): boolean {
  if (audience === null || audience.audience === 'everyone') return true;
  if (audience.audience === 'admins') return viewer.isAdmin;
  return audience.members.includes(viewer.userId);
}

export interface VaultGrant {
  vault_id: string;
  mode: string;
}

export interface MyVault {
  vault_id: string;
  name: string;
  role: string;
}

export function fetchAgentVaultGrants(agentId: string): Promise<VaultGrant[] | null> {
  return apiFetch<{ grants: VaultGrant[] }>(`/admin/agents/${encodeURIComponent(agentId)}/vault-grants`).then(
    (response) => response.grants ?? [],
    () => null,
  );
}

export function fetchMyVaults(): Promise<MyVault[]> {
  return apiFetch<{ vaults: MyVault[] }>('/vaults').then((response) => response.vaults ?? [], () => []);
}

export interface GrantsSeen {
  /** Grants on vaults the viewer is a member of, by name. */
  named: { name: string; mode: string }[];
  /** How many more grants are on vaults the viewer is not a member of (ADR-150: not named). */
  elsewhere: number;
}

/** An agent's grants as the viewer may see them: a vault they are not a member of is counted,
 * never named. */
export function grantsSeenBy(grants: VaultGrant[], myVaults: MyVault[]): GrantsSeen {
  const names = new Map(myVaults.map((vault) => [vault.vault_id, vault.name]));
  const named: GrantsSeen['named'] = [];
  let elsewhere = 0;
  for (const grant of grants) {
    const name = names.get(grant.vault_id);
    if (name === undefined) elsewhere += 1;
    else named.push({ name, mode: grant.mode });
  }
  return { named, elsewhere };
}

export function grantsText(seen: GrantsSeen): string {
  const parts = seen.named.map((grant) => `${grant.name} (${grant.mode === 'write' ? 'reads and writes' : 'reads'})`);
  if (seen.elsewhere > 0) {
    parts.push(`${seen.elsewhere} vault${seen.elsewhere === 1 ? '' : 's'} you are not a member of`);
  }
  return parts.length > 0 ? parts.join(', ') : 'No vault granted';
}
