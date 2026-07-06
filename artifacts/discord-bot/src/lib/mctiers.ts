const BASE = 'https://mctiers.com/api/v2';

export interface PlayerTierEntry {
  uuid: string;
  ign: string;
  tier: number;
  pos: number;
  peaked: boolean;
}

export interface GamemodeData {
  title?: string;
  rankings?: PlayerTierEntry[];
}

export interface PlayerResult {
  ign: string;
  uuid: string;
  tier: string | null;
  rawTier: number | null;
  gamemode: string;
}

// Map numeric tier to readable label (McTiers convention)
export function tierLabel(t: number): string {
  const map: Record<number, string> = {
    1: 'HT1', 2: 'LT1', 3: 'HT2', 4: 'LT2',
    5: 'HT3', 6: 'LT3', 7: 'HT4', 8: 'LT4',
  };
  return map[t] ?? `Tier ${t}`;
}

export async function lookupPlayer(uuidOrIGN: string, gamemode = 'vanilla'): Promise<PlayerResult | null> {
  try {
    // Try fetching full gamemode list and searching for the player
    const res = await fetch(`${BASE}/mode/${gamemode}`, {
      headers: { 'User-Agent': 'VTL-Bot/1.0' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GamemodeData;
    const rankings = data.rankings ?? (Array.isArray(data) ? (data as PlayerTierEntry[]) : []);

    const needle = uuidOrIGN.replace(/-/g, '').toLowerCase();
    const found = rankings.find(
      (p: PlayerTierEntry) =>
        p.ign?.toLowerCase() === uuidOrIGN.toLowerCase() ||
        (p.uuid ?? '').replace(/-/g, '').toLowerCase() === needle,
    );
    if (!found) return null;
    return {
      ign: found.ign,
      uuid: found.uuid,
      tier: tierLabel(found.tier),
      rawTier: found.tier,
      gamemode,
    };
  } catch {
    return null;
  }
}

export async function listGamemodes(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/mode/list`, { headers: { 'User-Agent': 'VTL-Bot/1.0' } });
    if (!res.ok) return ['vanilla'];
    const data = (await res.json()) as Record<string, unknown>;
    return Object.keys(data);
  } catch {
    return ['vanilla'];
  }
}
