import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import { getConfig, getQueue, setQueue, getTicket, setTicket, getProfile, clearCooldown } from '../lib/db.js';
import { ticketWelcomeEmbed, errorEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('forcetest')
  .setDescription('Force a player into a test ticket, bypassing the queue and cooldown')
  .addUserOption(o => o.setName('user').setDescription('Player to force into testing').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);

  if (!cfg.testerRoleId) {
    await interaction.reply({ embeds: [errorEmbed('Run `/setup` first.')], ephemeral: true });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.has(cfg.testerRoleId)) {
    await interaction.reply({ embeds: [errorEmbed('Only testers can use /forcetest.')], ephemeral: true });
    return;
  }
  if (!cfg.testingCategoryId) {
    await interaction.reply({ embeds: [errorEmbed('Testing category not configured. Run `/setup`.')], ephemeral: true });
    return;
  }

  const target = interaction.options.getUser('user', true);

  await interaction.deferReply({ ephemeral: true });

  // Check if user already has an active ticket
  const { getTickets } = await import('../lib/db.js');
  const existingTickets = Object.values(getTickets(interaction.guild.id));
  if (existingTickets.some(t => t.playerId === target.id)) {
    await interaction.editReply({ embeds: [errorEmbed(`${target} already has an active test ticket.`)] });
    return;
  }

  // Remove from queue if they're in it, clear cooldown + waitlist
  const queue = getQueue(interaction.guild.id);
  queue.queue = queue.queue.filter(id => id !== target.id);
  setQueue(interaction.guild.id, queue);
  clearCooldown(interaction.guild.id, target.id);

  const profile = getProfile(interaction.guild.id, target.id);
  if (profile) {
    profile.inWaitlist = false;
    const { setProfile } = await import('../lib/db.js');
    setProfile(interaction.guild.id, target.id, profile);
  }
  const ign = profile?.minecraftIGN ?? target.username;

  const channelName = `test-${ign.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const ticketChannel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: cfg.testingCategoryId,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: target.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    ],
  });

  setTicket(interaction.guild.id, ticketChannel.id, {
    playerId: target.id,
    playerIGN: ign,
    testerId: interaction.user.id,
    addedMembers: [],
  });

  await ticketChannel.send({
    content: `<@${target.id}> <@${interaction.user.id}>`,
    embeds: [ticketWelcomeEmbed(`<@${target.id}>`, `<@${interaction.user.id}>`, ign)],
  });

  await interaction.editReply({
    embeds: [{ color: 0x57F287, description: `✅ Force-pulled ${target} → ${ticketChannel}` }],
  });
}
