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

  // Block if they're still on cooldown from a previous test
  const cd = cooldownStatus(interaction.guild.id, interaction.user.id);
  if (cd.active && cd.timeLeft) {
    await interaction.editReply({
      embeds: [errorEmbed(`You are on a testing cooldown for **${formatCooldown(cd.timeLeft)}**. You cannot join the queue yet.`)],
    });
    return;
  }

  queue.queue.push(interaction.user.id);
  setQueue(interaction.guild.id, queue);

  // Update queue message with full numbered list
  const cfg = getConfig(interaction.guild.id);
  if (cfg.queueChannelId && cfg.queueMessageId) {
    try {
      const ch = await interaction.guild.channels.fetch(cfg.queueChannelId) as TextChannel;
      const msg = await ch.messages.fetch(cfg.queueMessageId);
      await msg.edit({ embeds: [queueActiveEmbed(queue.testerIds, queue.queue)] });
    } catch { /* queue message may be gone */ }
  }

  const position = queue.queue.length;
  await interaction.editReply({
    embeds: [successEmbed(`You joined the queue! You are at position **#${position}**.\nA tester will pull you soon.`)],
  });
}

async function handleEnterWaitlist(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;

  const profile = getProfile(interaction.guild.id, interaction.user.id);
  if (!profile?.verified) {
    await interaction.reply({ embeds: [errorEmbed('You need to verify your Minecraft account first.')], ephemeral: true });
    return;
  }
  if (!profile.region) {
    await interaction.reply({ embeds: [errorEmbed('Please select your region before entering the waitlist.')], ephemeral: true });
    return;
  }

  // Block if they're still on cooldown from a previous test (cooldown is only ever set by /close)
  const cd = cooldownStatus(interaction.guild.id, interaction.user.id);
  if (cd.active && cd.timeLeft) {
    await interaction.reply({
      embeds: [errorEmbed(`You are on a testing cooldown for **${formatCooldown(cd.timeLeft)}**. You cannot re-enter the waitlist yet.`)],
      ephemeral: true,
    });
    return;
  }

  if (profile.inWaitlist) {
    await interaction.reply({ embeds: [errorEmbed('You are already on the waitlist.')], ephemeral: true });
    return;
  }

  // Show modal asking for preferred server
  const modal = new ModalBuilder()
    .setCustomId('waitlist_modal')
    .setTitle('Enter Waitlist');

  const serverInput = new TextInputBuilder()
    .setCustomId('preferred_server')
    .setLabel('Preferred Server')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Lunar Network, Badlion, Hypixel...')
    .setMinLength(2)
    .setMaxLength(64)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(serverInput));
  await interaction.showModal(modal);
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
        profile.preferredServer,
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
