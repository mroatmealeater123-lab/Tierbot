import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { getConfig, getTicket, getProfile } from '../lib/db.js';
import { successEmbed, errorEmbed, tierLabel } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('passeval')
  .setDescription('Move this ticket to eval, rename to {ign}-{tier}-test, and give the tier role');

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

  // Auto-detect tier from player profile (set by /close)
  const profile = getProfile(interaction.guild.id, ticket.playerId);
  let tier = profile?.lastTestedTier;

  // Fallback: check current tier roles on the player
  if (!tier && cfg.tierRoles) {
    try {
      const playerMember = await interaction.guild.members.fetch(ticket.playerId);
      const tierRoleEntries = Object.entries(cfg.tierRoles) as [string, string][];
      for (const [tierKey, roleId] of tierRoleEntries) {
        if (roleId && playerMember.roles.cache.has(roleId)) {
          tier = tierKey;
          break;
        }
      }
    } catch { /* member fetch failed */ }
  }

  if (!tier) {
    await interaction.reply({
      embeds: [errorEmbed('Could not detect the player\'s tier. Run `/close` first, or check their tier roles.')],
      ephemeral: true,
    });
    return;
  }

  // Build channel name: e.g. reacod-ht3-test
  const ign     = ticket.playerIGN.toLowerCase().replace(/[^a-z0-9]/g, '');
  const newName = `${ign}-${tier}-test`;

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
    const earnedRoleId = cfg.tierRoles?.[tier as keyof typeof cfg.tierRoles];
    if (earnedRoleId) await playerMember.roles.add(earnedRoleId);
  } catch (err) {
    console.error('Role assignment failed in /passeval:', err);
  }

  await interaction.editReply({
    embeds: [successEmbed(`Passed to eval — channel renamed to **${newName}** and ${tierLabel(tier)} role assigned.`)],
  });
}
