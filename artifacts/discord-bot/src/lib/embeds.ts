import { EmbedBuilder } from 'discord.js';

export const COLORS = {
  queue:   0xE74C3C, // red  — active / inactive queue
  ticket:  0xF1C40F, // gold — test ticket welcome
  results: 0x1ABC9C, // teal — results
  primary: 0x5865F2,
  success: 0x57F287,
  error:   0xED4245,
};

export const FOOTER = { text: '1.21+ Phantom Tiers' };

/** Map internal tier key → display name */
export function tierLabel(tier: string): string {
  const map: Record<string, string> = {
    lt5: 'Low Tier 5',  ht5: 'High Tier 5',
    lt4: 'Low Tier 4',  ht4: 'High Tier 4',
    lt3: 'Low Tier 3',  ht3: 'High Tier 3',
    lt2: 'Low Tier 2',  ht2: 'High Tier 2',
    lt1: 'Low Tier 1',  ht1: 'High Tier 1',
  };
  return map[tier] ?? tier.toUpperCase();
}

/** Crafatar avatar URL for a player UUID */
function avatarUrl(uuid: string): string {
  return `https://crafatar.com/avatars/${uuid}?size=128&overlay=true`;
}

// ── Queue active ──────────────────────────────────────
export function queueActiveEmbed(
  testerId: string,
  queue: string[],
  bannerUrl?: string,
): EmbedBuilder {
  const queueStr = queue.length
    ? queue.map((id, i) => `${i + 1}. <@${id}>`).join('\n')
    : 'No one in queue yet.';

  const embed = new EmbedBuilder()
    .setColor(COLORS.queue)
    .setDescription(
      `**Tester(s) Available!**\n` +
      `⏰ The queue updates every 1 minute.\n` +
      `Use \`/leave\` if you wish to be removed from the waitlist or queue.\n\n` +
      `**Queue:**\n${queueStr}\n\n` +
      `**Active Testers:**\n1. <@${testerId}>`,
    )
    .setFooter(FOOTER)
    .setTimestamp();
  if (bannerUrl) embed.setImage(bannerUrl);
  return embed;
}

// ── Queue inactive ────────────────────────────────────
export function queueInactiveEmbed(lastActive?: Date): EmbedBuilder {
  const lastStr = lastActive
    ? lastActive.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Unknown';

  return new EmbedBuilder()
    .setColor(COLORS.queue)
    .setDescription(
      `**[1.21+] Phantom Tiers**\n` +
      `**No Testers Online**\n\n` +
      `No testers for your region are available at this time.\n` +
      `You will be pinged when a tester is available.\n` +
      `Check back later!\n\n` +
      `Last testing session: ${lastStr}`,
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

// ── Ticket welcome (player info card) ────────────────
export function ticketWelcomeEmbed(
  playerId: string,
  ign: string,
  uuid: string,
  testerMention: string,
  region: string | undefined,
  preferredServer: string | undefined,
  previousTier: string | undefined,
  bannerUrl?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.ticket)
    .setTitle(`${ign}'s Information`)
    .setThumbnail(avatarUrl(uuid))
    .addFields(
      { name: 'User',               value: `<@${playerId}>`,                inline: false },
      { name: 'Tester',             value: testerMention,                   inline: false },
      { name: 'Region',             value: region?.toUpperCase() ?? 'N/A',  inline: false },
      { name: 'Minecraft Username', value: ign,                             inline: false },
      { name: 'Preferred Server',   value: preferredServer ?? 'Not set',    inline: false },
      { name: 'Previous Test',      value: previousTier ? tierLabel(previousTier) : 'N/A', inline: false },
    )
    .setFooter(FOOTER)
    .setTimestamp();
  if (bannerUrl) embed.setImage(bannerUrl);
  return embed;
}

// ── Results ───────────────────────────────────────────
export function resultsEmbed(
  ign: string,
  uuid: string,
  testerMention: string,
  region: string | undefined,
  tierBefore: string,
  tierEarned: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.results)
    .setTitle(`${ign}'s Test Results 🏆`)
    .setThumbnail(avatarUrl(uuid))
    .addFields(
      { name: 'Tester',        value: testerMention,                   inline: false },
      { name: 'Region',        value: region?.toUpperCase() ?? 'N/A',  inline: false },
      { name: 'Username',      value: ign,                             inline: false },
      { name: 'Previous Rank', value: tierLabel(tierBefore),           inline: false },
      { name: 'Rank Earned',   value: tierLabel(tierEarned),           inline: false },
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

// ── Panel ─────────────────────────────────────────────
export function panelEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🏆 1.21+ Phantom Tiers — Tier Testing')
    .setDescription(
      'Welcome to 1.21+ Phantom Tiers tier testing. Use the buttons below to get started.\n\n' +
      '**✅ Verify Account** — Link your Minecraft account\n' +
      '**📋 Enter Waitlist** — Join the testing waitlist\n' +
      '**🌍 Select Region** — Choose your region (NA / EU / AU)\n' +
      '**👤 My Profile** — View your testing profile',
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

// ── Profile ───────────────────────────────────────────
export function profileEmbed(
  userId: string,
  ign: string,
  uuid: string,
  region: string | undefined,
  preferredServer: string | undefined,
  inWaitlist: boolean,
  cooldownUntil?: number,
): EmbedBuilder {
  const cooldownStr = cooldownUntil && cooldownUntil > Date.now()
    ? `<t:${Math.floor(cooldownUntil / 1000)}:R>`
    : 'None';

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('👤 Your Testing Profile')
    .setThumbnail(avatarUrl(uuid))
    .addFields(
      { name: 'Discord',          value: `<@${userId}>`,                       inline: true },
      { name: 'Minecraft IGN',    value: ign,                                  inline: true },
      { name: 'UUID',             value: `\`${uuid}\``,                        inline: false },
      { name: 'Region',           value: region ? region.toUpperCase() : 'Not set', inline: true },
      { name: 'Preferred Server', value: preferredServer ?? 'Not set',         inline: true },
      { name: 'In Waitlist',      value: inWaitlist ? 'Yes' : 'No',            inline: true },
      { name: 'Cooldown',         value: cooldownStr,                          inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

// ── Utility ───────────────────────────────────────────
export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.error).setDescription(`❌ ${message}`).setFooter(FOOTER);
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.success).setDescription(`✅ ${message}`).setFooter(FOOTER);
}
