import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getConfig, getTicket, setTicket } from '../lib/db.js';
import { successEmbed, errorEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('add')
  .setDescription('Add a user to this test ticket')
  .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);

  if (!cfg.testerRoleId) {
    await interaction.reply({ embeds: [errorEmbed('Run `/setup` first.')], ephemeral: true });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.has(cfg.testerRoleId)) {
    await interaction.reply({ embeds: [errorEmbed('Only testers can add users to tickets.')], ephemeral: true });
    return;
  }

  const ticket = getTicket(interaction.guild.id, interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('This channel is not a test ticket.')], ephemeral: true });
    return;
  }

  const target = interaction.options.getUser('user', true);
  if (ticket.addedMembers.includes(target.id)) {
    await interaction.reply({ embeds: [errorEmbed(`${target} is already in this ticket.`)], ephemeral: true });
    return;
  }

  const ch = interaction.guild.channels.cache.get(interaction.channelId) as import('discord.js').TextChannel | undefined;
  if (!ch) {
    await interaction.reply({ embeds: [errorEmbed('Channel not found.')], ephemeral: true });
    return;
  }
  try {
    await ch.permissionOverwrites.edit(target.id, {
      ViewChannel: true,
      SendMessages: true,
    });
  } catch {
    await interaction.reply({ embeds: [errorEmbed('Failed to update channel permissions.')], ephemeral: true });
    return;
  }

  ticket.addedMembers.push(target.id);
  setTicket(interaction.guild.id, interaction.channelId, ticket);

  await interaction.reply({ embeds: [successEmbed(`Added ${target} to this ticket.`)] });
}
