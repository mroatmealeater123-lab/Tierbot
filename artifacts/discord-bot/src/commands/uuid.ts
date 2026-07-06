import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getProfileByIGN, formatUUID } from '../lib/mojang.js';
import { lookupPlayer } from '../lib/mctiers.js';
import { errorEmbed, COLORS, FOOTER } from '../lib/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('uuid')
  .setDescription('Look up a Minecraft player\'s UUID and VTL tier info')
  .addStringOption(o => o.setName('ign').setDescription('Minecraft username').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const ign = interaction.options.getString('ign', true);

  const [mojang, tierData] = await Promise.all([
    getProfileByIGN(ign),
    lookupPlayer(ign),
  ]);

  if (!mojang) {
    await interaction.editReply({ embeds: [errorEmbed(`No Minecraft account found for **${ign}**.`)] });
    return;
  }

  const uuid = formatUUID(mojang.id);

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🔍 Player Lookup — ${mojang.name}`)
    .setThumbnail(`https://crafatar.com/avatars/${mojang.id}?overlay`)
    .addFields(
      { name: 'IGN', value: mojang.name, inline: true },
      { name: 'UUID', value: `\`${uuid}\``, inline: false },
      { name: 'VTL Tier', value: tierData?.tier ?? 'Not ranked', inline: true },
      { name: 'Gamemode', value: tierData?.gamemode ?? 'vanilla', inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
