import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  getProfile,
  setProfile,
  getQueue,
  setQueue,
  cooldownStatus,
  applyCooldown,
  formatCooldown,
  getConfig,
} from '../lib/db.js';
import {
  errorEmbed,
  successEmbed,
  profileEmbed,
  queueActiveEmbed,
} from '../lib/embeds.js';
import { TextChannel } from 'discord.js';

export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  switch (interaction.customId) {
    case 'join_queue': {
      await handleJoinQueue(interaction);
      break;
    }
    case 'verify_account': {
      // Show modal to enter Minecraft IGN
      const modal = new ModalBuilder()
        .setCustomId('verify_modal')
        .setTitle('Verify Your Minecraft Account');

      const ignInput = new TextInputBuilder()
        .setCustomId('minecraft_ign')
        .setLabel('Minecraft Username (IGN)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Steve')
        .setMinLength(2)
        .setMaxLength(16)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(ignInput));
      await interaction.showModal(modal);
      break;
    }
    case 'enter_waitlist': {
      await handleEnterWaitlist(interaction);
      break;
    }
    case 'select_region': {
      await handleSelectRegion(interaction);
      break;
    }
    case 'my_profile': {
      await handleMyProfile(interaction);
      break;
    }
    default:
      break;
  }
}

async function handleJoinQueue(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const queue = getQueue(interaction.guild.id);
  if (!queue.active) {
    await interaction.editReply({ embeds: [errorEmbed('The queue is not active right now.')] });
    return;
  }
  if (queue.queue.includes(interaction.user.id)) {
    const pos = queue.queue.indexOf(interaction.user.id) + 1;
    await interaction.editReply({ embeds: [errorEmbed(`You are already in the queue at position **#${pos}**.`)] });
    return;
  }

  const profile = getProfile(interaction.guild.id, interaction.user.id);
  if (!profile?.verified) {
    await interaction.editReply({ embeds: [errorEmbed('You must verify your Minecraft account first using the **Verify Account** button.')] });
    return;
  }
  if (!profile.region) {
    await interaction.editReply({ embeds: [errorEmbed('Please select your region first using the **Select Region** button.')] });
    return;
  }
  if (!profile.inWaitlist) {
    await interaction.editReply({ embeds: [errorEmbed('You must enter the waitlist first using the **Enter Waitlist** button.')] });
    return;
  }

  // Enforce cooldown at queue entry
  const cd = cooldownStatus(interaction.guild.id, interaction.user.id);
  if (cd.active && cd.timeLeft) {
    await interaction.editReply({
      embeds: [errorEmbed(`You are on a 3-day cooldown. You can re-enter the waitlist <t:${Math.floor((Date.now() + cd.timeLeft) / 1000)}:R>.`)],
    });
    return;
  }

  queue.queue.push(interaction.user.id);
  setQueue(interaction.guild.id, queue);

  // Update queue message
  const cfg = getConfig(interaction.guild.id);
  if (cfg.queueChannelId && cfg.queueMessageId) {
    try {
      const ch = await interaction.guild.channels.fetch(cfg.queueChannelId) as TextChannel;
      const msg = await ch.messages.fetch(cfg.queueMessageId);
      await msg.edit({ embeds: [queueActiveEmbed(`<@${queue.testerId}>`, queue.queue.length)] });
    } catch { /* queue message may be gone */ }
  }

  const position = queue.queue.length;
  await interaction.editReply({
    embeds: [successEmbed(`You joined the queue! You are at position **#${position}**.\nA tester will pull you soon.`)],
  });
}

async function handleEnterWaitlist(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const profile = getProfile(interaction.guild.id, interaction.user.id);
  if (!profile?.verified) {
    await interaction.editReply({ embeds: [errorEmbed('You need to verify your Minecraft account first.')] });
    return;
  }
  if (!profile.region) {
    await interaction.editReply({ embeds: [errorEmbed('Please select your region before entering the waitlist.')] });
    return;
  }

  const cd = cooldownStatus(interaction.guild.id, interaction.user.id);
  if (cd.active && cd.timeLeft) {
    await interaction.editReply({
      embeds: [errorEmbed(`You are on cooldown for **${formatCooldown(cd.timeLeft)}**. You cannot enter the waitlist yet.`)],
    });
    return;
  }

  if (profile.inWaitlist) {
    await interaction.editReply({ embeds: [errorEmbed('You are already on the waitlist.')] });
    return;
  }

  profile.inWaitlist = true;
  setProfile(interaction.guild.id, interaction.user.id, profile);

  // Apply 3-day cooldown immediately upon entering waitlist
  applyCooldown(interaction.guild.id, interaction.user.id);

  const updatedProfile = getProfile(interaction.guild.id, interaction.user.id)!;
  await interaction.editReply({
    embeds: [
      successEmbed(
        `You have entered the waitlist!\n\n` +
        `**IGN:** ${profile.minecraftIGN}\n` +
        `**Region:** ${profile.region.toUpperCase()}\n\n` +
        `You can join the queue when a tester is active. Your next waitlist entry will be available <t:${Math.floor((updatedProfile.cooldownUntil ?? 0) / 1000)}:R>.`,
      ),
    ],
  });
}

async function handleSelectRegion(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const profile = getProfile(interaction.guild.id, interaction.user.id);
  if (!profile?.verified) {
    await interaction.reply({ embeds: [errorEmbed('Verify your account first before selecting a region.')], ephemeral: true });
    return;
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('region_select')
      .setPlaceholder('Choose your region')
      .addOptions(
        { label: 'NA — North America', value: 'na', emoji: '🌎' },
        { label: 'EU — Europe', value: 'eu', emoji: '🌍' },
        { label: 'AU — Australia/Oceania', value: 'au', emoji: '🌏' },
      ),
  );

  await interaction.reply({ content: 'Select your region:', components: [row], ephemeral: true });
}

async function handleMyProfile(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const profile = getProfile(interaction.guild.id, interaction.user.id);
  if (!profile?.verified) {
    await interaction.reply({
      embeds: [errorEmbed('You have not verified your account yet. Click **Verify Account** to get started.')],
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    embeds: [
      profileEmbed(
        interaction.user.id,
        profile.minecraftIGN,
        profile.uuid,
        profile.region,
        profile.inWaitlist,
        profile.cooldownUntil,
      ),
    ],
    ephemeral: true,
  });
}

export async function handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guild) return;

  if (interaction.customId === 'region_select') {
    const region = interaction.values[0] as 'na' | 'eu' | 'au';
    const profile = getProfile(interaction.guild.id, interaction.user.id);
    if (!profile) {
      await interaction.reply({ embeds: [errorEmbed('Profile not found.')], ephemeral: true });
      return;
    }

    profile.region = region;
    setProfile(interaction.guild.id, interaction.user.id, profile);

    const labels: Record<string, string> = { na: 'NA 🌎', eu: 'EU 🌍', au: 'AU 🌏' };
    await interaction.reply({
      embeds: [successEmbed(`Region set to **${labels[region]}**. You can now enter the waitlist.`)],
      ephemeral: true,
    });
  }
}
