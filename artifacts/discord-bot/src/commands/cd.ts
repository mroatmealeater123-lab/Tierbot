import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getConfig, clearCooldown, getProfile } from '../lib/db.js';
import { successEmbed, errorEmbed } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('cd')
  .setDescription('Remove a player\'s 3-day testing cooldown')
  .addUserOption(o => o.setName('user').setDescription('Player to clear cooldown for').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);

  if (!cfg.testerRoleId) {
    await interaction.reply({ embeds: [errorEmbed('Run `/setup` first.')], ephemeral: true });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.has(cfg.testerRoleId)) {
    await interaction.reply({ embeds: [errorEmbed('Only testers can clear cooldowns.')], ephemeral: true });
    return;
  }

  const target = interaction.options.getUser('user', true);
  const profile = getProfile(interaction.guild.id, target.id);

  if (!profile) {
    await interaction.reply({ embeds: [errorEmbed(`${target} has no profile — they haven't used the panel yet.`)], ephemeral: true });
    return;
  }
  if (!profile.cooldownUntil || profile.cooldownUntil <= Date.now()) {
    await interaction.reply({ embeds: [errorEmbed(`${target} is not currently on cooldown.`)], ephemeral: true });
    return;
  }

  clearCooldown(interaction.guild.id, target.id);
  await interaction.reply({ embeds: [successEmbed(`Cooldown cleared for ${target}.`)] });
}
