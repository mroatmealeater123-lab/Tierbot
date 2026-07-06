import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from 'discord.js';
import { getConfig, getTicket, removeTicket, getProfile, setProfile, applyCooldown } from '../lib/db.js';
import { resultsEmbed, errorEmbed, tierLabel } from '../lib/embeds.js';

const TIER_CHOICES = ['lt5', 'ht5', 'lt4', 'ht4', 'lt3', 'ht3', 'lt2', 'ht2', 'lt1', 'ht1'] as const;

export const data = new SlashCommandBuilder()
  .setName('close')
  .setDescription('Close the ticket, post results, and assign the tier role')
  .addStringOption(o =>
    o.setName('tier_earned').setDescription('Tier the player earned').setRequired(true)
      .addChoices(...TIER_CHOICES.map(t => ({ name: tierLabel(t), value: t }))));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);

  if (!cfg.testerRoleId) {
    await interaction.reply({ embeds: [errorEmbed('Run `/setup` first.')], ephemeral: true });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.has(cfg.testerRoleId)) {
    await interaction.reply({ embeds: [errorEmbed('Only testers can close tickets.')], ephemeral: true });
    return;
  }

  const ticket = getTicket(interaction.guild.id, interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('This channel is not a test ticket.')], ephemeral: true });
    return;
  }

  const tierEarned = interaction.options.getString('tier_earned', true) as typeof TIER_CHOICES[number];

  await interaction.deferReply();

  // Fetch player — needed to read current roles and assign new ones
  let playerMember;
  try {
    playerMember = await interaction.guild.members.fetch(ticket.playerId);
  } catch { /* member may have left */ }

  // Auto-detect tier_before: prefer stored profile value, then scan current tier roles
  const playerProfile = getProfile(interaction.guild.id, ticket.playerId);
  const ign    = playerProfile?.minecraftIGN ?? ticket.playerIGN;
  const uuid   = playerProfile?.uuid ?? '';
  const region = playerProfile?.region;

  let tierBefore: string = playerProfile?.lastTestedTier ?? '';
  if (!tierBefore && playerMember) {
    // Detect from which tier role they currently hold
    const tierRoles = cfg.tierRoles ?? {};
    for (const [tier, roleId] of Object.entries(tierRoles)) {
      if (roleId && playerMember.roles.cache.has(roleId)) {
        tierBefore = tier;
        break;
      }
    }
  }
  const tierBeforeDisplay = tierBefore ? tierLabel(tierBefore) : 'N/A';

  // Remove all tier roles then add the earned one
  if (playerMember) {
    try {
      const allTierRoleIds = Object.values(cfg.tierRoles ?? {}).filter((id): id is string => !!id);
      if (allTierRoleIds.length) await playerMember.roles.remove(allTierRoleIds);
      const earnedRoleId = cfg.tierRoles?.[tierEarned];
      if (earnedRoleId) await playerMember.roles.add(earnedRoleId);
    } catch (err) {
      console.error('Role assignment failed:', err);
    }
  }

  // Post results
  if (cfg.resultsChannelId) {
    try {
      const resultsCh = await interaction.guild.channels.fetch(cfg.resultsChannelId) as TextChannel;
      await resultsCh.send({
        content: `<@${ticket.playerId}>`,
        embeds: [resultsEmbed(ign, uuid, `<@${ticket.testerId}>`, region, tierBeforeDisplay, tierLabel(tierEarned))],
      });
    } catch { /* results channel may be inaccessible */ }
  }

  // Update profile: clear waitlist, record last tier, apply cooldown
  if (playerProfile) {
    playerProfile.inWaitlist     = false;
    playerProfile.lastTestedTier = tierEarned;
    setProfile(interaction.guild.id, ticket.playerId, playerProfile);
  }
  applyCooldown(interaction.guild.id, ticket.playerId);
  removeTicket(interaction.guild.id, interaction.channelId);

  await interaction.editReply({ embeds: [{ color: 0x57F287, description: '✅ Closing ticket...' }] });

  setTimeout(async () => {
    try {
      const ch = await interaction.guild!.channels.fetch(interaction.channelId);
      await ch?.delete();
    } catch { /* already deleted */ }
  }, 3000);
}
