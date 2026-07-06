import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import { getConfig, setConfig } from '../lib/db.js';
import { panelEmbed, errorEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('panel')
  .setDescription('Post the VTL McTiers verification and waitlist panel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);
  if (!cfg.testerRoleId) {
    await interaction.reply({ embeds: [errorEmbed('Run `/setup` first.')], ephemeral: true });
    return;
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_account')
      .setLabel('Verify Account')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId('enter_waitlist')
      .setLabel('Enter Waitlist')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📋'),
    new ButtonBuilder()
      .setCustomId('select_region')
      .setLabel('Select Region')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🌍'),
    new ButtonBuilder()
      .setCustomId('my_profile')
      .setLabel('My Profile')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('👤'),
  );

  await interaction.deferReply({ ephemeral: true });

  const ch = interaction.channel as import('discord.js').TextChannel;
  const msg = await ch.send({
    embeds: [panelEmbed()],
    components: [row],
  });

  // Save panel location
  setConfig(interaction.guild.id, {
    ...cfg,
    panelChannelId: interaction.channelId,
    panelMessageId: msg.id,
  });

  await interaction.editReply({ content: '✅ Panel posted.' });
}
