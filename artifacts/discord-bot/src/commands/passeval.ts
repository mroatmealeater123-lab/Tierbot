import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { getConfig, getTicket, setTicket, getProfile } from '../lib/db.js';
import { successEmbed, errorEmbed, tierLabel } from '../lib/embeds.js';

const TIER_CHOICES = ['lt5', 'ht5', 'lt4', 'ht4', 'lt3', 'ht3', 'lt2', 'ht2', 'lt1', 'ht1'] as const;

export const data = new SlashCommandBuilder()
  .setName('passeval')
  .setDescription('Move this ticket to eval, rename to {ign}-{tier}, and give the tier role')
  .addStringOption(o =>
    o.setName('tier').setDescription('Tier level').setRequired(true)
      .addChoices(...TIER_CHOICES.map(t => ({ name: tierLabel(t), value: t }))));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const cfg = getConfig(interaction.guild.id);

  if (!cfg.testerRoleId) {
    await interaction.reply({ embeds: [errorEmbed('Run `/setup` first.')], ephemeral: true });
    return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.has(cfg.testerRoleId)) {
    await interaction.reply({ embeds: [errorEmbed('Only testers can use /passeval.')], ephemeral: true });
    return;
  }

  const ticket = getTicket(interaction.guild.id, interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('This channel is not a test ticket.')], ephemeral: true });
    return;
  }
  if (!cfg.evalCategoryId) {
    await interaction.reply({ embeds: [errorEmbed('Eval category not configured. Run `/setup`.')], ephemeral: true });
    return;
  }

  const tier = interaction.options.getString('tier', true) as typeof TIER_CHOICES[number];

  // Build channel name: lowercase IGN + tier (e.g. reacod-ht3)
  const ign     = ticket.playerIGN.toLowerCase().replace(/[^a-z0-9]/g, '');
  const newName = `${ign}-${tier}`;

  await interaction.deferReply();

  // Rename and move channel
  try {
    const ch = await interaction.guild.channels.fetch(interaction.channelId);
    if (ch?.type === ChannelType.GuildText) {
      await ch.setName(newName);
      await ch.setParent(cfg.evalCategoryId, { lockPermissions: false });
    }
  } catch {
    await interaction.editReply({ embeds: [errorEmbed('Failed to rename/move channel.')] });
    return;
  }

  // Assign tier role: remove all tier roles, then give the earned one
  try {
    const playerMember = await interaction.guild.members.fetch(ticket.playerId);
    const allTierRoleIds = Object.values(cfg.tierRoles ?? {}).filter((id): id is string => !!id);
    if (allTierRoleIds.length) await playerMember.roles.remove(allTierRoleIds);
    const earnedRoleId = cfg.tierRoles?.[tier];
    if (earnedRoleId) await playerMember.roles.add(earnedRoleId);
  } catch (err) {
    console.error('Role assignment failed in /passeval:', err);
  }

  await interaction.editReply({
    embeds: [successEmbed(`Passed to eval — channel renamed to **${newName}** and ${tierLabel(tier)} role assigned.`)],
  });
}
