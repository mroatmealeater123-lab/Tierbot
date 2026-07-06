import { EmbedBuilder } from 'discord.js';

export const COLORS = {
  primary: 0x5865F2,
  success: 0x57F287,
  error: 0xED4245,
  warning: 0xFEE75C,
  neutral: 0x2b2d31,
};

export const FOOTER = { text: 'VTL McTiers' };

export function queueActiveEmbed(testerTag: string, count: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('✅ Tester Active')
    .setDescription('A tester is currently available! Click **Join Queue** below to get in line for your tier test.')
    .addFields(
      { name: 'Tester', value: testerTag, inline: true },
      { name: 'In Queue', value: `${count} player${count !== 1 ? 's' : ''}`, inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

export function queueInactiveEmbed(lastActive?: Date): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle('❌ No Tester Active')
    .setDescription('No tester is currently available. Please try again later.')
    .setFooter({ text: `VTL McTiers${lastActive ? ` • Last active: ${lastActive.toUTCString()}` : ''}` })
    .setTimestamp();
}

export function ticketWelcomeEmbed(playerMention: string, testerMention: string, ign: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🎯 Tier Test')
    .setDescription(`${playerMention}, you have been pulled for your tier test!\nPlease be ready — your tester will begin shortly.`)
    .addFields(
      { name: 'Player', value: `${playerMention} (${ign})`, inline: true },
      { name: 'Tester', value: testerMention, inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

export function resultsEmbed(playerMention: string, testerMention: string, tierBefore: string, tierEarned: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('📋 Tier Test Results')
    .addFields(
      { name: 'Player', value: playerMention, inline: true },
      { name: 'Tester', value: testerMention, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: 'Tier Before', value: tierBefore.toUpperCase(), inline: true },
      { name: 'Tier Earned', value: tierEarned.toUpperCase(), inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

export function panelEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🏆 VTL McTiers — Tier Testing')
    .setDescription(
      'Welcome to VTL tier testing. Use the buttons below to get started.\n\n' +
      '**✅ Verify Account** — Link your Minecraft account\n' +
      '**📋 Enter Waitlist** — Join the testing waitlist (3-day cooldown)\n' +
      '**🌍 Select Region** — Choose your region (NA / EU / AU)\n' +
      '**👤 My Profile** — View your testing profile',
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

export function profileEmbed(
  userId: string,
  ign: string,
  uuid: string,
  region: string | undefined,
  inWaitlist: boolean,
  cooldownUntil?: number,
): EmbedBuilder {
  const cooldownStr = cooldownUntil && cooldownUntil > Date.now()
    ? `<t:${Math.floor(cooldownUntil / 1000)}:R>`
    : 'None';

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('👤 Your Testing Profile')
    .addFields(
      { name: 'Discord', value: `<@${userId}>`, inline: true },
      { name: 'Minecraft IGN', value: ign, inline: true },
      { name: 'UUID', value: `\`${uuid}\``, inline: false },
      { name: 'Region', value: region ? region.toUpperCase() : 'Not set', inline: true },
      { name: 'In Waitlist', value: inWaitlist ? 'Yes' : 'No', inline: true },
      { name: 'Cooldown', value: cooldownStr, inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.error).setDescription(`❌ ${message}`).setFooter(FOOTER);
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.success).setDescription(`✅ ${message}`).setFooter(FOOTER);
}
