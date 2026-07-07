import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');

export type Tier = 'lt5' | 'ht5' | 'lt4' | 'ht4' | 'lt3' | 'ht3' | 'lt2' | 'ht2' | 'lt1' | 'ht1';

export interface GuildConfig {
  testingCategoryId: string;
  evalCategoryId: string;
  resultsChannelId: string;
  testerRoleId: string;
  tierRoles: {
    lt5?: string;
    ht5?: string;
    lt4?: string;
    ht4?: string;
    lt3?: string;
    ht3?: string;
    lt2?: string;
    ht2?: string;
    lt1?: string;
    ht1?: string;
  };
  panelChannelId?: string;
  panelMessageId?: string;
  queueChannelId?: string;
  queueMessageId?: string;
}

export interface QueueState {
  active: boolean;
  testerIds: string[];
  queue: string[];
}

export interface TicketData {
  playerId: string;
  playerIGN: string;
  testerId: string;
  addedMembers: string[];
  tierBefore?: string;
}

export interface UserProfile {
  minecraftIGN: string;
  uuid: string;
  region?: 'na' | 'eu' | 'au';
  preferredServer?: string;
  lastTestedTier?: string;
  verified: boolean;
  inWaitlist: boolean;
  cooldownUntil?: number;
}

function ensureDir(guildId: string): string {
  const dir = path.join(DATA_DIR, guildId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function read<T>(filePath: string, def: T): T {
  if (!fs.existsSync(filePath)) return def;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T; }
  catch { return def; }
}

function write(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Config ────────────────────────────────────────────
export function getConfig(guildId: string): Partial<GuildConfig> {
  return read(path.join(ensureDir(guildId), 'config.json'), {});
}
export function setConfig(guildId: string, cfg: Partial<GuildConfig>): void {
  write(path.join(ensureDir(guildId), 'config.json'), cfg);
}

// ── Queue ─────────────────────────────────────────────
export function getQueue(guildId: string): QueueState {
  const raw = read<Record<string, unknown>>(
    path.join(ensureDir(guildId), 'queue.json'),
    { active: false, testerIds: [], queue: [] },
  );

  // Migrate legacy format: { testerId: string | null } → { testerIds: string[] }
  if (!Array.isArray(raw.testerIds)) {
    const legacyId = typeof raw.testerId === 'string' ? raw.testerId : null;
    raw.testerIds = legacyId ? [legacyId] : [];
    delete raw.testerId;
  }

  return raw as unknown as QueueState;
}
export function setQueue(guildId: string, q: QueueState): void {
  write(path.join(ensureDir(guildId), 'queue.json'), q);
}

// ── Tickets ───────────────────────────────────────────
export function getTickets(guildId: string): Record<string, TicketData> {
  return read(path.join(ensureDir(guildId), 'tickets.json'), {});
}
export function getTicket(guildId: string, channelId: string): TicketData | null {
  return getTickets(guildId)[channelId] ?? null;
}
export function setTicket(guildId: string, channelId: string, ticket: TicketData): void {
  const tickets = getTickets(guildId);
  tickets[channelId] = ticket;
  write(path.join(ensureDir(guildId), 'tickets.json'), tickets);
}
export function removeTicket(guildId: string, channelId: string): void {
  const tickets = getTickets(guildId);
  delete tickets[channelId];
  write(path.join(ensureDir(guildId), 'tickets.json'), tickets);
}

// ── Profiles ──────────────────────────────────────────
export function getProfiles(guildId: string): Record<string, UserProfile> {
  return read(path.join(ensureDir(guildId), 'profiles.json'), {});
}
export function getProfile(guildId: string, userId: string): UserProfile | null {
  return getProfiles(guildId)[userId] ?? null;
}
export function setProfile(guildId: string, userId: string, profile: UserProfile): void {
  const profiles = getProfiles(guildId);
  profiles[userId] = profile;
  write(path.join(ensureDir(guildId), 'profiles.json'), profiles);
}
export function clearCooldown(guildId: string, userId: string): void {
  const p = getProfile(guildId, userId);
  if (!p) return;
  delete p.cooldownUntil;
  setProfile(guildId, userId, p);
}
export function applyCooldown(guildId: string, userId: string): void {
  const p = getProfile(guildId, userId);
  if (!p) return;
  p.cooldownUntil = Date.now() + 3 * 24 * 60 * 60 * 1000;
  setProfile(guildId, userId, p);
}
export function cooldownStatus(guildId: string, userId: string): { active: boolean; timeLeft?: number } {
  const p = getProfile(guildId, userId);
  if (!p?.cooldownUntil || p.cooldownUntil <= Date.now()) return { active: false };
  return { active: true, timeLeft: p.cooldownUntil - Date.now() };
}
export function formatCooldown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}
