export interface MojangProfile {
  id: string;   // UUID without hyphens
  name: string; // IGN
}

export function formatUUID(raw: string): string {
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

export async function getProfileByIGN(ign: string): Promise<MojangProfile | null> {
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(ign)}`);
    if (!res.ok) return null;
    return (await res.json()) as MojangProfile;
  } catch {
    return null;
  }
}

export async function getProfileByUUID(uuid: string): Promise<MojangProfile | null> {
  try {
    const clean = uuid.replace(/-/g, '');
    const res = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${clean}`);
    if (!res.ok) return null;
    return (await res.json()) as MojangProfile;
  } catch {
    return null;
  }
}
