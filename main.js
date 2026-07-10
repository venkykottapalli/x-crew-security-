'use strict';
// 1. ALL YOUR IMPORTS AT THE VERY TOP
const path = require('path');
const { Client, GatewayIntentBits, Partials, Options, Collection } = require('discord.js');
const { open } = require('lmdb');

// 2. INITIALIZE THE DATABASE GLOBALLY (Outside of any functions/events)
const myDatabase = open({
    path: './database',
    compression: true
});

// ... The rest of your bot setup code (like client initialization) goes below this ...
// Now you can safely use it:
console.log(`[DEBUG] Attempting to load commands from: ${path.resolve(__dirname, 'commands')}`);

const { readdirSync, existsSync } = require("fs");
const fs = require('fs');
const commandsPath = path.join(__dirname, 'commands');
const eventsPath = path.join(__dirname, 'events');
// Robust validation function
function loadBotDirectory(dirPath, type) {
    if (!fs.existsSync(dirPath)) {
        console.error(`[CRITICAL ERROR] The ${type} directory was not found at: ${dirPath}`);
        return []; // Return empty array if directory is missing
    }
    
    // Recursive loader for your nested structure
    const getFiles = (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        let result = [];
        for (const file of files) {
            const res = path.resolve(dir, file.name);
            if (file.isDirectory()) {
                result = result.concat(getFiles(res));
            } else if (file.name.endsWith('.js')) {
                result.push(res);
            }
        }
        return result;
    };
    
    return getFiles(dirPath);
}

// Execute and log
const commandFiles = loadBotDirectory(commandsPath, 'commands');
const eventFiles = loadBotDirectory(eventsPath, 'events');

console.log(`[System] Successfully discovered ${commandFiles.length} commands and ${eventFiles.length} events.`);
const https         = require("https");
require("utf-8-validate");
require("bufferutil");
require("dns-cache")(60000);

const c = {
  reset:  "\x1b[0m",
  bright: "\x1b[1m",
  purple: "\x1b[35m",
  pink:   "\x1b[95m",
  white:  "\x1b[97m",
  gray:   "\x1b[90m",
};

let shardConfig   = {};
let ClusterClient = null;
try {
  const sharding = require("discord-hybrid-sharding");
  const info     = sharding.getInfo();
  if (info?.SHARD_LIST) {
    shardConfig   = { shards: info.SHARD_LIST, shardCount: info.TOTAL_SHARDS };
    ClusterClient = sharding.ClusterClient;
  }
} catch {}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
  ],
  allowedMentions: {
    repliedUser: false,
    parse: ["users", "roles"],
  },
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager:            50,
    PresenceManager:            0,
    VoiceStateManager:        200,
    ReactionManager:            0,
    GuildStickerManager:        0,
    GuildScheduledEventManager: 0,
    AutoModerationRuleManager:  0,
    ApplicationCommandManager:  0,
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: { interval: 600, lifetime: 900 },
    users: {
      interval: 7200,
      filter: () => (user) => user.bot && user.id !== client.user?.id,
    },
  },
  rest: {
    retries: 3,
    timeout: 8_000,
    offset:  0,
  },
  ...shardConfig,
});

if (ClusterClient) client.cluster = new ClusterClient(client);

client.commands = new Collection();
client.cools    = new Collection();

const config = require('./config.js');
({
  path:        path.join(__dirname, "database", "lmdb"),
  compression: true,
  mapSize:     1024 * 1024 * 1024,
});

client.lmdbGet = (key) => myDatabase.get(key);
client.lmdbSet           = (key, value) => lmdb.put(key, value);
client.lmdbDel           = (key)        => lmdb.remove(key);
client.isWhitelisted     = (guildId, userId) => {
  const whitelist = lmdb.get(`whitelist_${guildId}`) || [];
  return whitelist.includes(userId);
};
client.isAntinukeEnabled = (guildId) =>
  lmdb.get(`antinuke_${guildId}`) === "enabled";

client.config = config;
client.emoji  = require("./emojis.json");

const syncEmojis = require("./utils/emojiSync.js");

// ... [rest of your code above] ...

let cmdCount = 0;
const basePath = path.join(__dirname, "commands");

// 1. Check if the directory exists
if (existsSync(basePath)) {
  
  // 2. Loop through the subdirectories
  for (const dir of readdirSync(basePath)) { 
    const dirPath = path.join(basePath, dir);
    
    // 3. Loop through the actual .js files inside
    const files = readdirSync(dirPath).filter((f) => f.endsWith(".js"));
    for (const file of files) {
      const cmd = require(path.join(dirPath, file));
      if (cmd?.name) { 
        client.commands.set(cmd.name, cmd); 
        cmdCount++; 
      }
    }
  }

} else {
  console.log(`${c.pink}${c.bright}[WARNING] The "commands" directory was not found. Skipping command loading.${c.reset}`);
}
let evtCount = 0;
const loadEvents = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) loadEvents(fullPath);
    else if (entry.name.endsWith(".js")) {
      const eventFile = require(fullPath);
      if (typeof eventFile === "function") { eventFile(client); evtCount++; }
    }
  }
};

// 1. Check if the events directory exists before running the function
if (existsSync(eventsPath)) {
  loadEvents(eventsPath);
} else {
  console.log(`${c.pink}${c.bright}[WARNING] The "events" directory was not found. Skipping event loading.${c.reset}`);
}
client.once("clientReady", () => {
  // console.log(banner); // Uncomment this if you made the banner!
  console.log(`${c.purple}${c.bright}  All Commands Loaded ${c.white}✅  ${c.gray}(${cmdCount} commands)${c.reset}`);
  console.log(`${c.purple}${c.bright}  All Events Loaded   ${c.white}✅  ${c.gray}(${evtCount} events)${c.reset}`);
  console.log(`${c.purple}${c.bright}  ─────────────────────────────────────${c.reset}`);
  console.log(`${c.pink}${c.bright}  ${client.user.tag}  ${c.gray}[ping: ${client.ws.ping}ms]${c.reset}`);
  console.log(`${c.purple}${c.bright}  ─────────────────────────────────────${c.reset}\n`);
});
const token = process.env.DISCORDTOKEN || config.token;

(async () => {
  await syncEmojis(token);
  client.login(token);
})();

require("http")
  .createServer(( res) => res.end("Alive"))
  .listen(5000, "0.0.0.0");