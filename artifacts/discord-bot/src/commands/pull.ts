import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { getConfig, getQueue, setQueue, getTicket, setTicket, getProfile, setProfile } from '../lib/db.js';
import { ticketWelcomeEmbed, errorEmbed, queueActiveEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('pull')
  .setDescription('Pull the next player from the queue into a private test ticket');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);
  const queue = getQueue(interaction.guild.id);

  if (!cfg.testerRoleId) {
    await interaction.reply({ embeds: [errorEmbed('Run `/setup` first.')], ephemeral: true });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.has(cfg.testerRoleId)) {
    await interaction.reply({ embeds: [errorEmbed('Only testers can pull players.')], ephemeral: true });
    return;
  }
  if (!queue.active) {
    await interaction.reply({ embeds: [errorEmbed('Queue is not active. Use `/start` first.')], ephemeral: true });
    return;
  }
  if (queue.queue.length === 0) {
    await interaction.reply({ embeds: [errorEmbed('The queue is empty.')], ephemeral: true });
    return;
  }
  if (!cfg.testingCategoryId) {
    await interaction.reply({ embeds: [errorEmbed('Testing category not configured. Run `/setup`.')], ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const playerId = queue.queue.shift()!;
  setQueue(interaction.guild.id, queue);

  // Get player profile and clear their waitlist state
  const profile = getProfile(interaction.guild.id, playerId);
  const ign            = profile?.minecraftIGN ?? 'Unknown';
  const uuid           = profile?.uuid ?? '';
  const region         = profile?.region;
  const preferredServer = profile?.preferredServer;
  const previousTier   = profile?.lastTestedTier;

  if (profile) {
    profile.inWaitlist = false;
    setProfile(interaction.guild.id, playerId, profile);
  }

  // Create private ticket channel
  const channelName = `${ign.toLowerCase().replace(/[^a-z0-9]/g, '')}-test`;
  const ticketChannel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: cfg.testingCategoryId,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: playerId,            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    ],
  });

  setTicket(interaction.guild.id, ticketChannel.id, {
    playerId,
    playerIGN: ign,
    testerId: interaction.user.id,
    addedMembers: [],
  });

  await ticketChannel.send({
    content: `<@${playerId}> <@${interaction.user.id}>`,
    embeds: [ticketWelcomeEmbed(playerId, ign, uuid, `<@${interaction.user.id}>`, region, preferredServer, previousTier, cfg.bannerUrl)],
  });

  // Update queue message to show remaining queue
  if (cfg.queueChannelId && cfg.queueMessageId) {
    try {
      const queueCh = await interaction.guild.channels.fetch(cfg.queueChannelId) as TextChannel;
      const queueMsg = await queueCh.messages.fetch(cfg.queueMessageId);
      await queueMsg.edit({ embeds: [queueActiveEmbed(interaction.user.id, queue.queue, cfg.bannerUrl)] });
    } catch { /* queue message may be gone */ }
  }

  await interaction.editReply({
    embeds: [{ color: 0x57F287, description: `✅ Pulled <@${playerId}> → ${ticketChannel}` }],
  });
}
