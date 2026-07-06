import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getConfig, getTicket, removeTicket, applyCooldown } from '../lib/db.js';
import { successEmbed, errorEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip this ticket and reset the player\'s cooldown');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);

  if (!cfg.testerRoleId) {
    await interaction.reply({ embeds: [errorEmbed('Run `/setup` first.')], ephemeral: true });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.has(cfg.testerRoleId)) {
    await interaction.reply({ embeds: [errorEmbed('Only testers can skip tickets.')], ephemeral: true });
    return;
  }

  const ticket = getTicket(interaction.guild.id, interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('This channel is not a test ticket.')], ephemeral: true });
    return;
  }

  // Reset the player's waitlist state and restart 3-day cooldown
  const { getProfile, setProfile } = await import('../lib/db.js');
  const playerProfile = getProfile(interaction.guild.id, ticket.playerId);
  if (playerProfile) {
    playerProfile.inWaitlist = false;
    setProfile(interaction.guild.id, ticket.playerId, playerProfile);
  }
  applyCooldown(interaction.guild.id, ticket.playerId);
  removeTicket(interaction.guild.id, interaction.channelId);

  await interaction.reply({
    embeds: [successEmbed(`Ticket skipped. <@${ticket.playerId}>'s 3-day cooldown has been reset. Closing in 5 seconds...`)],
  });

  setTimeout(async () => {
    try {
      const ch = await interaction.guild!.channels.fetch(interaction.channelId);
      await ch?.delete();
    } catch { /* already deleted */ }
  }, 5000);
}
