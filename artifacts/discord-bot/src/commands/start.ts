import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getConfig, getQueue, setQueue } from '../lib/db.js';
import { queueActiveEmbed, errorEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Activate the tier testing queue and post the join button');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);
  if (!cfg.testerRoleId) {
    await interaction.reply({ embeds: [errorEmbed('Run `/setup` first.')], ephemeral: true });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.has(cfg.testerRoleId)) {
    await interaction.reply({ embeds: [errorEmbed('Only testers can start the queue.')], ephemeral: true });
    return;
  }

  const queue = getQueue(interaction.guild.id);
  if (queue.active) {
    await interaction.reply({ embeds: [errorEmbed('Queue is already active.')], ephemeral: true });
    return;
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('join_queue')
      .setLabel('Join Queue')
      .setStyle(ButtonStyle.Success)
      .setEmoji('📋'),
  );

  const embed = queueActiveEmbed(interaction.user.id, []);
  const msg = await interaction.reply({ content: '@here', embeds: [embed], components: [row], fetchReply: true });

  setQueue(interaction.guild.id, {
    active: true,
    testerId: interaction.user.id,
    queue: [],
  });

  // Store location for later editing
  const existingCfg = getConfig(interaction.guild.id);
  existingCfg.queueChannelId = interaction.channelId;
  existingCfg.queueMessageId = msg.id;
  const { setConfig } = await import('../lib/db.js');
  setConfig(interaction.guild.id, existingCfg);
}
