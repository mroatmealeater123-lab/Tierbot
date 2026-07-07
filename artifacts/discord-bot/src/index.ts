import {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  ChatInputCommandInteraction,
} from 'discord.js';
import { handleButton, handleSelectMenu } from './interactions/buttons.js';
import { handleModal } from './interactions/modals.js';

// ── Load commands ─────────────────────────────────────
import * as setup     from './commands/setup.js';
import * as panel     from './commands/panel.js';
import * as start     from './commands/start.js';
import * as stop      from './commands/stop.js';
import * as pull      from './commands/pull.js';
import * as close     from './commands/close.js';
import * as passeval  from './commands/passeval.js';
import * as add       from './commands/add.js';
import * as remove    from './commands/remove.js';
import * as uuid      from './commands/uuid.js';
import * as forcetest from './commands/forcetest.js';
import * as cd        from './commands/cd.js';
import * as skip      from './commands/skip.js';

interface Command {
  data: { name: string; toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const ALL_COMMANDS: Command[] = [
  setup, panel, start, stop, pull, close, passeval,
  add, remove, uuid, forcetest, cd, skip,
];

const MAX_GUILDS = 3;
process.stdout.write('🚀 Bot process started\n');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  process.stderr.write('❌ DISCORD_BOT_TOKEN is not set\n');
  process.exit(1);
}
process.stdout.write('✅ Token found, connecting to Discord...\n');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const commands = new Collection<string, Command>();
for (const cmd of ALL_COMMANDS) commands.set(cmd.data.name, cmd);

// ── Ready ─────────────────────────────────────────────
client.once('ready', async c => {
  console.log(`✅ Logged in as ${c.user.tag}`);

  // Enforce startup guild limit — leave extra guilds immediately
  const guilds = [...c.guilds.cache.values()];
  if (guilds.length > MAX_GUILDS) {
    console.log(`⚠️  In ${guilds.length} guilds on startup; leaving extras down to ${MAX_GUILDS}`);
    for (const guild of guilds.slice(MAX_GUILDS)) {
      console.log(`  Leaving "${guild.name}"`);
      await guild.leave().catch(() => null);
    }
  }

  // Deploy slash commands globally
  const rest = new REST().setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), {
      body: ALL_COMMANDS.map(cmd => cmd.data.toJSON()),
    });
    console.log(`✅ ${ALL_COMMANDS.length} slash commands registered globally`);
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
});

// ── Guild limit ───────────────────────────────────────
client.on('guildCreate', async guild => {
  if (client.guilds.cache.size > MAX_GUILDS) {
    console.log(`⚠️  Leaving "${guild.name}" — already in ${MAX_GUILDS} servers`);
    await guild.leave();
  } else {
    console.log(`📥 Joined "${guild.name}" (${client.guilds.cache.size}/${MAX_GUILDS} servers)`);
  }
});

client.on('guildDelete', guild => {
  console.log(`📤 Left "${guild.name}" (${client.guilds.cache.size}/${MAX_GUILDS} servers)`);
});

// ── Interactions ──────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const cmd = commands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(`Error in /${interaction.commandName}:`, err);
      const payload = { content: '⚠️ An error occurred. Please try again.', ephemeral: true };
      try {
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
        else await interaction.reply(payload);
      } catch { /* can't reply */ }
    }
  } else if (interaction.isButton()) {
    try { await handleButton(interaction); }
    catch (err) { console.error('Button error:', err); }
  } else if (interaction.isModalSubmit()) {
    try { await handleModal(interaction); }
    catch (err) { console.error('Modal error:', err); }
  } else if (interaction.isStringSelectMenu()) {
    try { await handleSelectMenu(interaction); }
    catch (err) { console.error('Select menu error:', err); }
  }
});

client.login(TOKEN).catch(err => {
  process.stderr.write(`❌ Login failed: ${err.message}\n`);
  process.exit(1);
});
