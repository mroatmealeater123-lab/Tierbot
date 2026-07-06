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
  // Tier roles — low to high
  .addRoleOption(o => o.setName('lt5_role').setDescription('Role for LT5').setRequired(false))
  .addRoleOption(o => o.setName('ht5_role').setDescription('Role for HT5').setRequired(false))
  .addRoleOption(o => o.setName('lt4_role').setDescription('Role for LT4').setRequired(false))
  .addRoleOption(o => o.setName('ht4_role').setDescription('Role for HT4').setRequired(false))
  .addRoleOption(o => o.setName('lt3_role').setDescription('Role for LT3').setRequired(false))
  .addRoleOption(o => o.setName('ht3_role').setDescription('Role for HT3').setRequired(false))
  .addRoleOption(o => o.setName('lt2_role').setDescription('Role for LT2').setRequired(false))
  .addRoleOption(o => o.setName('ht2_role').setDescription('Role for HT2').setRequired(false))
  .addRoleOption(o => o.setName('lt1_role').setDescription('Role for LT1').setRequired(false))
  .addRoleOption(o => o.setName('ht1_role').setDescription('Role for HT1').setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ embeds: [errorEmbed('This command can only be used in a server.')], ephemeral: true });
    return;
  }

  const testingCategory = interaction.options.getChannel('testing_category', true);
  const evalCategory    = interaction.options.getChannel('eval_category', true);
  const resultsChannel  = interaction.options.getChannel('results_channel', true);
  const testerRole      = interaction.options.getRole('tester_role', true);
  const lt5Role = interaction.options.getRole('lt5_role');
  const ht5Role = interaction.options.getRole('ht5_role');
  const lt4Role = interaction.options.getRole('lt4_role');
  const ht4Role = interaction.options.getRole('ht4_role');
  const lt3Role = interaction.options.getRole('lt3_role');
  const ht3Role = interaction.options.getRole('ht3_role');
  const lt2Role = interaction.options.getRole('lt2_role');
  const ht2Role = interaction.options.getRole('ht2_role');
  const lt1Role = interaction.options.getRole('lt1_role');
  const ht1Role = interaction.options.getRole('ht1_role');

  const existing = getConfig(interaction.guild.id);
  setConfig(interaction.guild.id, {
    ...existing,
    testingCategoryId: testingCategory.id,
    evalCategoryId:    evalCategory.id,
    resultsChannelId:  resultsChannel.id,
    testerRoleId:      testerRole.id,
    tierRoles: {
      // preserve any existing roles not explicitly set in this run
      ...existing.tierRoles,
      ...(lt5Role ? { lt5: lt5Role.id } : {}),
      ...(ht5Role ? { ht5: ht5Role.id } : {}),
      ...(lt4Role ? { lt4: lt4Role.id } : {}),
      ...(ht4Role ? { ht4: ht4Role.id } : {}),
      ...(lt3Role ? { lt3: lt3Role.id } : {}),
      ...(ht3Role ? { ht3: ht3Role.id } : {}),
      ...(lt2Role ? { lt2: lt2Role.id } : {}),
      ...(ht2Role ? { ht2: ht2Role.id } : {}),
      ...(lt1Role ? { lt1: lt1Role.id } : {}),
      ...(ht1Role ? { ht1: ht1Role.id } : {}),
    },
  });

  const tierRolesStr = [
    lt5Role && `LT5 ${lt5Role}`, ht5Role && `HT5 ${ht5Role}`,
    lt4Role && `LT4 ${lt4Role}`, ht4Role && `HT4 ${ht4Role}`,
    lt3Role && `LT3 ${lt3Role}`, ht3Role && `HT3 ${ht3Role}`,
    lt2Role && `LT2 ${lt2Role}`, ht2Role && `HT2 ${ht2Role}`,
    lt1Role && `LT1 ${lt1Role}`, ht1Role && `HT1 ${ht1Role}`,
  ].filter(Boolean).join(' · ') || 'None configured';

  await interaction.reply({
    embeds: [
      successEmbed(
        `Setup complete!\n\n` +
        `**Testing Category:** ${testingCategory}\n` +
        `**Eval Category:** ${evalCategory}\n` +
        `**Results Channel:** ${resultsChannel}\n` +
        `**Tester Role:** ${testerRole}\n` +
        `**Tier Roles:** ${tierRolesStr}`,
      ),
    ],
    ephemeral: true,
  });
}
