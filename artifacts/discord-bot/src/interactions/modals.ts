import { ModalSubmitInteraction } from 'discord.js';
import { getProfileByIGN, formatUUID } from '../lib/mojang.js';
import { getProfile, setProfile, getProfiles } from '../lib/db.js';
import { successEmbed, errorEmbed, profileEmbed } from '../lib/embeds.js';

export async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild) return;

  if (interaction.customId === 'verify_modal') {
    await interaction.deferReply({ ephemeral: true });

    const ign = interaction.fields.getTextInputValue('minecraft_ign').trim();
    const mojang = await getProfileByIGN(ign);

    if (!mojang) {
      await interaction.editReply({
        embeds: [errorEmbed(`No Minecraft account found for **${ign}**. Check the spelling and try again.`)],
      });
      return;
    }

    const uuid = formatUUID(mojang.id);

    // Check if this IGN is already linked to another Discord user
    const allProfiles = getProfiles(interaction.guild.id);
    const taken = Object.entries(allProfiles).find(
      ([uid, p]) => p.uuid === mojang.id && uid !== interaction.user.id,
    );
    if (taken) {
      await interaction.editReply({
        embeds: [errorEmbed(`The account **${mojang.name}** is already linked to another Discord user.`)],
      });
      return;
    }

    const existing = getProfile(interaction.guild.id, interaction.user.id);
    setProfile(interaction.guild.id, interaction.user.id, {
      minecraftIGN: mojang.name,
      uuid: mojang.id,
      region: existing?.region,
      verified: true,
      inWaitlist: existing?.inWaitlist ?? false,
      cooldownUntil: existing?.cooldownUntil,
    });

    await interaction.editReply({
      embeds: [successEmbed(`Account verified! **${mojang.name}** (UUID: \`${uuid}\`) linked to your Discord.`)],
    });
  }
}
