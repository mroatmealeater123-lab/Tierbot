import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, OverwriteType } from 'discord.js';
import { getConfig, getTicket, setTicket } from '../lib/db.js';
import { successEmbed, errorEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove a previously /add\'ed user from this ticket')
  .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);

  if (!cfg.testerRoleId) {
    await interaction.reply({ embeds: [errorEmbed('Run `/setup` first.')], ephemeral: true });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.has(cfg.testerRoleId)) {
    await interaction.reply({ embeds: [errorEmbed('Only testers can remove users from tickets.')], ephemeral: true });
    return;
  }

  const ticket = getTicket(interaction.guild.id, interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('This channel is not a test ticket.')], ephemeral: true });
    return;
  }

  const target = interaction.options.getUser('user', true);
  if (!ticket.addedMembers.includes(target.id)) {
    await interaction.reply({ embeds: [errorEmbed(`${target} was not added via /add and cannot be removed this way.`)], ephemeral: true });
    return;
  }

  // Remove channel permission for this user
  try {
    const ch = interaction.guild.channels.cache.get(interaction.channelId) as import('discord.js').TextChannel | undefined;
    if (ch) {
      await ch.permissionOverwrites.delete(target.id);
    }
  } catch { /* permission update failed */ }

  ticket.addedMembers = ticket.addedMembers.filter(id => id !== target.id);
  setTicket(interaction.guild.id, interaction.channelId, ticket);

  await interaction.reply({ embeds: [successEmbed(`Removed ${target} from this ticket.`)] });
}
