import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { getConfig, getTicket, setTicket } from '../lib/db.js';
import { successEmbed, errorEmbed } from '../lib/embeds.js';

const TIER_CHOICES = ['lt2', 'ht2', 'lt1', 'ht1'] as const;

export const data = new SlashCommandBuilder()
  .setName('passeval')
  .setDescription('Rename this ticket to the player IGN + tier and move to the eval category')
  .addStringOption(o =>
    o.setName('tier').setDescription('Tier level').setRequired(true)
      .addChoices(...TIER_CHOICES.map(t => ({ name: t.toUpperCase(), value: t }))));

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

  const tier = interaction.options.getString('tier', true);
  const ign = ticket.playerIGN.toLowerCase().replace(/[^a-z0-9]/g, '');
  const newName = `${ign}-${tier}`;

  await interaction.deferReply();

  try {
    const ch = await interaction.guild.channels.fetch(interaction.channelId);
    if (ch?.type === ChannelType.GuildText) {
      await ch.setName(newName);
      await ch.setParent(cfg.evalCategoryId, { lockPermissions: false });
    }
  } catch (err) {
    await interaction.editReply({ embeds: [errorEmbed('Failed to rename/move channel.')] });
    return;
  }

  await interaction.editReply({
    embeds: [successEmbed(`Ticket passed to eval. Channel renamed to **${newName}** and moved to eval category.`)],
  });
}
