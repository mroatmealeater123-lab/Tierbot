import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from 'discord.js';
import { getConfig, getQueue, setQueue } from '../lib/db.js';
import { queueInactiveEmbed, errorEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Deactivate the queue and post the no-tester message');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);
  const queue = getQueue(interaction.guild.id);

  if (!queue.active) {
    await interaction.reply({ embeds: [errorEmbed('Queue is not active.')], ephemeral: true });
    return;
  }
  if (!queue.testerIds.includes(interaction.user.id)) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has('Administrator')) {
      await interaction.reply({ embeds: [errorEmbed('Only an active tester or an admin can stop the queue.')], ephemeral: true });
      return;
    }
  }

  setQueue(interaction.guild.id, { active: false, testerIds: [], queue: [] });

  // Edit the queue message
  if (cfg.queueChannelId && cfg.queueMessageId) {
    try {
      const ch = await interaction.guild.channels.fetch(cfg.queueChannelId) as TextChannel;
      const msg = await ch.messages.fetch(cfg.queueMessageId);
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('join_queue')
          .setLabel('Join Queue')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📋')
          .setDisabled(true),
      );
      await msg.edit({ embeds: [queueInactiveEmbed(new Date())], components: [disabledRow] });
    } catch {
      // message may have been deleted
    }
  }

  await interaction.reply({ embeds: [queueInactiveEmbed(new Date())], ephemeral: true });
}
