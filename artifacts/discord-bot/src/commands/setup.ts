import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { setConfig, getConfig } from '../lib/db.js';
import { successEmbed, errorEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure the tier testing bot for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(o =>
    o.setName('testing_category').setDescription('Category where test tickets are created').setRequired(true)
      .addChannelTypes(ChannelType.GuildCategory))
  .addChannelOption(o =>
    o.setName('eval_category').setDescription('Category where /passeval tickets are moved').setRequired(true)
      .addChannelTypes(ChannelType.GuildCategory))
  .addChannelOption(o =>
    o.setName('results_channel').setDescription('Channel where test results are posted').setRequired(true)
      .addChannelTypes(ChannelType.GuildText))
  .addRoleOption(o =>
    o.setName('tester_role').setDescription('Role that testers have').setRequired(true))
  .addRoleOption(o =>
    o.setName('lt2_role').setDescription('Role for LT2').setRequired(false))
  .addRoleOption(o =>
    o.setName('ht2_role').setDescription('Role for HT2').setRequired(false))
  .addRoleOption(o =>
    o.setName('lt1_role').setDescription('Role for LT1').setRequired(false))
  .addRoleOption(o =>
    o.setName('ht1_role').setDescription('Role for HT1').setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
    return;
  }

  const testingCategory = interaction.options.getChannel('testing_category', true);
  const evalCategory    = interaction.options.getChannel('eval_category', true);
  const resultsChannel  = interaction.options.getChannel('results_channel', true);
  const testerRole      = interaction.options.getRole('tester_role', true);
  const lt2Role         = interaction.options.getRole('lt2_role');
  const ht2Role         = interaction.options.getRole('ht2_role');
  const lt1Role         = interaction.options.getRole('lt1_role');
  const ht1Role         = interaction.options.getRole('ht1_role');

  const existing = getConfig(interaction.guild.id);
  setConfig(interaction.guild.id, {
    ...existing,
    testingCategoryId: testingCategory.id,
    evalCategoryId:    evalCategory.id,
    resultsChannelId:  resultsChannel.id,
    testerRoleId:      testerRole.id,
    tierRoles: {
      lt2: lt2Role?.id,
      ht2: ht2Role?.id,
      lt1: lt1Role?.id,
      ht1: ht1Role?.id,
    },
  });

  await interaction.reply({
    embeds: [
      successEmbed(
        `Setup complete!\n\n` +
        `**Testing Category:** ${testingCategory}\n` +
        `**Eval Category:** ${evalCategory}\n` +
        `**Results Channel:** ${resultsChannel}\n` +
        `**Tester Role:** ${testerRole}\n` +
        `**Tier Roles:** LT2 ${lt2Role ?? 'not set'} · HT2 ${ht2Role ?? 'not set'} · LT1 ${lt1Role ?? 'not set'} · HT1 ${ht1Role ?? 'not set'}`,
      ),
    ],
    ephemeral: true,
  });
}
