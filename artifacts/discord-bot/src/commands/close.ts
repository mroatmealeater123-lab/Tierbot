import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from 'discord.js';
import { getConfig, getTicket, removeTicket } from '../lib/db.js';
import { resultsEmbed, errorEmbed } from '../lib/embeds.js';

const TIER_CHOICES = ['lt2', 'ht2', 'lt1', 'ht1'] as const;

export const data = new SlashCommandBuilder()
  .setName('close')
  .setDescription('Close the ticket, post results, and assign the tier role')
  .addStringOption(o =>
    o.setName('tier_earned').setDescription('Tier the player earned').setRequired(true)
      .addChoices(...TIER_CHOICES.map(t => ({ name: t.toUpperCase(), value: t }))))
  .addStringOption(o =>
    o.setName('tier_before').setDescription('Tier the player had before').setRequired(true));

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
  const tierBefore = interaction.options.getString('tier_before', true);

  await interaction.deferReply();

  // Post results in results channel
  if (cfg.resultsChannelId) {
    try {
      const resultsCh = await interaction.guild.channels.fetch(cfg.resultsChannelId) as TextChannel;
      await resultsCh.send({
        content: `<@${ticket.playerId}> <@${ticket.testerId}>`,
        embeds: [resultsEmbed(`<@${ticket.playerId}>`, `<@${ticket.testerId}>`, tierBefore, tierEarned)],
      });
    } catch { /* results channel may be inaccessible */ }
  }

  // Give tier role
  const roleId = cfg.tierRoles?.[tierEarned];
  if (roleId) {
    try {
      const playerMember = await interaction.guild.members.fetch(ticket.playerId);
      // Remove old tier roles first
      const oldRoles = Object.values(cfg.tierRoles ?? {}).filter((id): id is string => !!id);
      await playerMember.roles.remove(oldRoles.filter(r => interaction.guild!.roles.cache.has(r)));
      await playerMember.roles.add(roleId);
    } catch { /* member may have left */ }
  }

  // Reset player waitlist state + apply cooldown so they re-enter waitlist for next test
  const { getProfile, setProfile, applyCooldown } = await import('../lib/db.js');
  const playerProfile = getProfile(interaction.guild.id, ticket.playerId);
  if (playerProfile) {
    playerProfile.inWaitlist = false;
    setProfile(interaction.guild.id, ticket.playerId, playerProfile);
  }
  applyCooldown(interaction.guild.id, ticket.playerId);

  removeTicket(interaction.guild.id, interaction.channelId);

  await interaction.editReply({ embeds: [{ color: 0x57F287, description: '✅ Closing ticket...' }] });

  // Delete the channel after a short delay
  setTimeout(async () => {
    try {
      const ch = await interaction.guild!.channels.fetch(interaction.channelId);
      await ch?.delete();
    } catch { /* already deleted */ }
  }, 3000);
}
