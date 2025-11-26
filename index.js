/**
 * 97s - Discord Bot Core "Obsidian Edition"
 * Version: 16.0.0 (Image Manips, Fake Hacking, Server Lockdown)
 * Theme: Bleed Pink (#db2777) | Dark Mode
 * Trigger: "," (Comma)
 */

require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, 
    ChannelType, ActivityType, ButtonBuilder, ActionRowBuilder, 
    ButtonStyle, Events, Collection, AuditLogEvent, parseEmoji 
} = require('discord.js');
const fs = require('fs');
const ms = require('ms');
const http = require('http');
const moment = require('moment');
const axios = require('axios');

// --- 1. CORE CONFIGURATION ---
const CONFIG = {
    TOKEN: process.env.TOKEN || 'YOUR_BOT_TOKEN_HERE',
    PREFIX: ',', 
    COLOR: 0xdb2777,
    STATUS: '𝘬𝘺 𝘖𝘸𝘯𝘴 𝘔𝘦', 
    footer: '97s Obsidian'
};

// --- 2. DATABASE ---
const DB_FILE = './database.json';
let db = { 
    xp: {}, economy: {}, afk: {}, warns: {}, rep: {},
    profiles: {}, 
    autoresponders: {}, 
    antinuke: { enabled: false, whitelist: [] },
    settings: { welcome_channel: null, welcome_msg: null, autorole: null, modlog: null }, 
    voicemaster: { hub: null, channels: [] },
    history: { names: {} }
};

if (fs.existsSync(DB_FILE)) { 
    try { 
        const loaded = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        db = { ...db, ...loaded };
    } catch { console.log('[DB] Corrupt file, resetting.'); } 
}
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// Memory structures
const musicQueue = new Map();
const snipes = new Collection();
const editSnipes = new Collection();

// --- 3. INITIALIZATION ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers
    ]
});

// --- 4. UTILITY ---
const sendEmbed = (channel, desc, title = null, footer = null) => {
    const embed = new EmbedBuilder()
        .setDescription(title ? `**${title}**\n${desc}` : desc)
        .setColor(CONFIG.COLOR);
    if (footer) embed.setFooter({ text: footer });
    return channel.send({ embeds: [embed] });
};

const sendError = (channel, error) => {
    const embed = new EmbedBuilder().setDescription(`✖ ${error}`).setColor(0x2f3136);
    return channel.send({ embeds: [embed] });
};

const logAction = (guild, title, desc) => {
    if (!db.settings.modlog) return;
    const channel = guild.channels.cache.get(db.settings.modlog);
    if (channel) sendEmbed(channel, desc, title, moment().format('LLLL'));
};

// --- 5. SYSTEM EVENT LISTENERS ---

client.once(Events.ClientReady, () => {
    console.log(`[SYSTEM] 97s Obsidian is online as ${client.user.tag}`);
    client.user.setPresence({ activities: [{ name: CONFIG.STATUS, type: ActivityType.Streaming, url: 'https://twitch.tv/monstercat' }], status: 'dnd' });
});

// -- LOGGERS & SNIPERS --
client.on('messageDelete', message => {
    if (message.author?.bot) return;
    snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        image: message.attachments.first()?.proxyURL || null,
        time: Date.now()
    });
    logAction(message.guild, 'Message Deleted', `**Author:** ${message.author.tag}\n**Channel:** ${message.channel}\n**Content:** ${message.content || 'Image'}`);
});

client.on('messageUpdate', (oldMsg, newMsg) => {
    if (oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    editSnipes.set(oldMsg.channel.id, {
        original: oldMsg.content,
        new: newMsg.content,
        author: oldMsg.author,
        time: Date.now()
    });
    logAction(oldMsg.guild, 'Message Edited', `**Author:** ${oldMsg.author.tag}\n**Before:** ${oldMsg.content}\n**After:** ${newMsg.content}`);
});

client.on(Events.GuildBanAdd, async (ban) => {
    logAction(ban.guild, 'User Banned', `**User:** ${ban.user.tag} (${ban.user.id})`);
});

// -- COMMAND PROCESSOR --
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 1. AUTO-RESPONDER
    if (db.autoresponders[message.guild?.id]?.[message.content.toLowerCase()]) {
        message.channel.send(db.autoresponders[message.guild.id][message.content.toLowerCase()]);
        return;
    }

    // 2. PASSIVE (XP/Eco/AFK)
    if (!db.economy[message.author.id]) db.economy[message.author.id] = { cash: 0, bank: 0 };
    if (!db.xp[message.author.id]) db.xp[message.author.id] = { xp: 0, level: 0 };
    
    if (Math.random() > 0.95) { db.economy[message.author.id].cash += 5; }
    db.xp[message.author.id].xp += 15;
    const nextLvl = (db.xp[message.author.id].level + 1) * 100;
    if (db.xp[message.author.id].xp >= nextLvl) {
        db.xp[message.author.id].level++;
        db.xp[message.author.id].xp = 0;
    }
    saveDB();

    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(u => {
            if (db.afk[u.id]) sendEmbed(message.channel, `💤 **${u.username}** is AFK: ${db.afk[u.id]}`, null, CONFIG.footer);
        });
    }
    if (db.afk[message.author.id]) {
        delete db.afk[message.author.id];
        saveDB();
        message.reply("👋 Welcome back.").then(m => setTimeout(() => m.delete(), 5000));
    }

    if (!message.content.startsWith(CONFIG.PREFIX)) return;
    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // =========================
    //    IMAGE MANIPULATION (Massive Expansion)
    // =========================
    const imgCmds = {
        'wasted': 'wasted', 'triggered': 'triggered', 'gay': 'gay', 'jail': 'jail', 
        'passed': 'missionpassed', 'comrade': 'comrade', 'lolice': 'lolice', 
        'glass': 'glass', 'blur': 'blur', 'pixelate': 'pixelate', 
        'simp': 'simpcard', 'horny': 'horny'
    };

    if (Object.keys(imgCmds).includes(cmd)) {
        const u = message.mentions.users.first() || message.author;
        const avatar = u.displayAvatarURL({ extension: 'png', size: 512 });
        const url = `https://some-random-api.com/canvas/${imgCmds[cmd]}?avatar=${avatar}`;
        const embed = new EmbedBuilder().setImage(url).setColor(CONFIG.COLOR).setFooter({ text: CONFIG.footer });
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'tweet') {
        const text = args.join(' ');
        if (!text) return sendError(message.channel, 'Usage: `,tweet hello world`');
        const u = message.author;
        const url = `https://some-random-api.com/canvas/tweet?avatar=${u.displayAvatarURL({ extension: 'png' })}&displayname=${u.username}&username=${u.username}&comment=${encodeURIComponent(text)}`;
        const embed = new EmbedBuilder().setImage(url).setColor(CONFIG.COLOR);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'youtube') {
        const text = args.join(' ');
        if (!text) return sendError(message.channel, 'Usage: `,youtube nice video`');
        const u = message.author;
        const url = `https://some-random-api.com/canvas/youtube-comment?avatar=${u.displayAvatarURL({ extension: 'png' })}&username=${u.username}&comment=${encodeURIComponent(text)}`;
        const embed = new EmbedBuilder().setImage(url).setColor(CONFIG.COLOR);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'stupid') {
        const u = message.mentions.users.first() || message.author;
        const url = `https://some-random-api.com/canvas/its-so-stupid?avatar=${u.displayAvatarURL({ extension: 'png' })}&dog=dog`;
        const embed = new EmbedBuilder().setImage(url).setColor(CONFIG.COLOR);
        message.channel.send({ embeds: [embed] });
    }

    // =========================
    //    FUN & TROLL (New)
    // =========================
    if (cmd === 'hack') {
        const target = message.mentions.users.first();
        if (!target) return sendError(message.channel, 'Mention a user to hack.');
        
        const msg = await message.channel.send(`💻 **Hacking ${target.username}...**`);
        const steps = [
            `🔍 IP Address found: 192.168.0.${Math.floor(Math.random() * 255)}`,
            `📧 Email found: ${target.username}2005@gmail.com`,
            `🔓 Bypassing 2FA...`,
            `📂 Downloading 'homework' folder...`,
            `✅ **Hack Complete.** Data sent to the dark web.`
        ];
        
        for (const step of steps) {
            await new Promise(r => setTimeout(r, 1500));
            await msg.edit(step);
        }
    }

    if (cmd === 'iq') {
        const u = message.mentions.users.first() || message.author;
        const iq = Math.floor(Math.random() * 200);
        sendEmbed(message.channel, `💡 **${u.username}** has an IQ of **${iq}**.`, 'IQ Test');
    }

    if (cmd === 'howhot') {
        const u = message.mentions.users.first() || message.author;
        const pct = Math.floor(Math.random() * 101);
        sendEmbed(message.channel, `🔥 **${u.username}** is **${pct}%** hot.`, 'Hotness Meter');
    }

    // =========================
    //    SERVER MANAGEMENT (New)
    // =========================
    if (cmd === 'lockdown') {
        if (!checkPerms(message, 'Administrator')) return;
        message.channel.send('🔒 **Initiating Server Lockdown...**');
        message.guild.channels.cache.forEach(c => {
            if (c.isTextBased()) {
                c.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }).catch(() => {});
            }
        });
        sendEmbed(message.channel, 'Server is now locked down. No one can speak.', 'DEFCON 1');
    }

    if (cmd === 'unlockdown') {
        if (!checkPerms(message, 'Administrator')) return;
        message.channel.send('🔓 **Lifting Server Lockdown...**');
        message.guild.channels.cache.forEach(c => {
            if (c.isTextBased()) {
                c.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true }).catch(() => {});
            }
        });
        sendEmbed(message.channel, 'Server is normal again.', 'DEFCON 5');
    }

    if (cmd === 'hex') {
        const hex = Math.floor(Math.random()*16777215).toString(16);
        const embed = new EmbedBuilder()
            .setTitle(`#${hex}`)
            .setColor(parseInt(hex, 16))
            .setImage(`https://singlecolorimage.com/get/${hex}/400x100`);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'worldclock') {
        const now = moment();
        sendEmbed(message.channel, 
            `🇺🇸 NYC: ${now.utcOffset(-5).format('LT')}\n🇬🇧 London: ${now.utcOffset(0).format('LT')}\n🇯🇵 Tokyo: ${now.utcOffset(9).format('LT')}\n🇦🇺 Sydney: ${now.utcOffset(11).format('LT')}`, 
            '🌍 World Clock');
    }

    // =========================
    //    AUTO-RESPONDER
    // =========================
    if (cmd === 'ar') {
        if (!checkPerms(message, 'ManageGuild')) return;
        const sub = args[0];
        if (!db.autoresponders[message.guild.id]) db.autoresponders[message.guild.id] = {};

        if (sub === 'add' || sub === 'create') {
            const trigger = args[1]?.toLowerCase();
            const response = args.slice(2).join(' ');
            if (!trigger || !response) return sendError(message.channel, 'Usage: `,ar add <trigger> <response>`');
            db.autoresponders[message.guild.id][trigger] = response;
            saveDB();
            return sendEmbed(message.channel, `Trigger: **${trigger}**\nResponse: **${response}**`, 'Auto Responder Added');
        }
        if (sub === 'remove' || sub === 'delete') {
            const trigger = args[1]?.toLowerCase();
            if (!trigger) return sendError(message.channel, 'Usage: `,ar remove <trigger>`');
            delete db.autoresponders[message.guild.id][trigger];
            saveDB();
            return sendEmbed(message.channel, `Deleted trigger **${trigger}**`);
        }
        if (sub === 'list') {
            const list = Object.keys(db.autoresponders[message.guild.id]).map(k => `\`${k}\``).join(', ') || 'None';
            return sendEmbed(message.channel, list, 'Auto Responders');
        }
        return sendEmbed(message.channel, 'Subcommands: `add`, `remove`, `list`', 'Auto Responder');
    }

    // =========================
    //    MOD LOGGING
    // =========================
    if (cmd === 'setmodlog') {
        if (!checkPerms(message, 'ManageGuild')) return;
        const channel = message.mentions.channels.first();
        if (!channel) return sendError(message.channel, 'Mention a channel.');
        db.settings.modlog = channel.id;
        saveDB();
        sendEmbed(message.channel, `Mod logs will now be sent to ${channel}`, 'LOGGING ENABLED');
    }

    // =========================
    //    UTILITY
    // =========================
    if (cmd === 'urban') {
        const term = args.join(' ');
        if (!term) return sendError(message.channel, 'Provide a word.');
        try {
            const res = await axios.get(`https://api.urbandictionary.com/v0/define?term=${term}`);
            const def = res.data.list[0];
            if (!def) return sendError(message.channel, 'No definition found.');
            sendEmbed(message.channel, `**Definition:**\n${def.definition.slice(0, 1000)}\n\n**Example:**\n${def.example.slice(0, 500)}`, `Urban: ${term}`);
        } catch { sendError(message.channel, 'API Error.'); }
    }

    if (cmd === 'weather') {
        const loc = args.join(' ');
        if (!loc) return sendError(message.channel, 'Provide a location.');
        try {
            const res = await axios.get(`https://wttr.in/${loc}?format=j1`);
            const current = res.data.current_condition[0];
            sendEmbed(message.channel, `**Temp:** ${current.temp_C}°C / ${current.temp_F}°F\n**Condition:** ${current.weatherDesc[0].value}\n**Humidity:** ${current.humidity}%`, `Weather in ${loc}`);
        } catch { sendError(message.channel, 'Location not found.'); }
    }

    if (cmd === 'define') {
        const word = args[0];
        if (!word) return sendError(message.channel, 'Provide a word.');
        try {
            const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            const def = res.data[0].meanings[0].definitions[0].definition;
            sendEmbed(message.channel, def, `Definition: ${word}`);
        } catch { sendError(message.channel, 'Word not found.'); }
    }

    // =========================
    //    FUN
    // =========================
    if (cmd === 'minesweeper' || cmd === 'mines') {
        let grid = '';
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) { grid += Math.random() > 0.8 ? '||💣||' : '||🟩||'; }
            grid += '\n';
        }
        message.channel.send(`**Minesweeper**\n${grid}`);
    }

    if (cmd === 'calc') {
        const expr = args.join(' ');
        if (!expr) return sendError(message.channel, 'Provide math.');
        try {
            const result = Function('"use strict";return (' + expr.replace(/[^-()\d/*+.]/g, '') + ')')();
            sendEmbed(message.channel, `Input: \`${expr}\`\nOutput: \`${result}\``, 'Calculator');
        } catch { sendError(message.channel, 'Invalid expression.'); }
    }

    // =========================
    //    EXISTING COMMANDS (Merged for completeness)
    // =========================
    // Profile
    if (cmd === 'profile' || cmd === 'p') { const t = message.mentions.users.first() || message.author; const p = db.profiles[t.id] || { bio: 'No bio set.', banner: null, spouse: null }; const eco = db.economy[t.id] || { cash: 0, bank: 0 }; const xp = db.xp[t.id] || { level: 0, xp: 0 }; const rep = db.rep[t.id] || 0; const e = new EmbedBuilder().setTitle(`${t.username}'s Profile`).setDescription(`📝 **Bio:** ${p.bio}`).setColor(CONFIG.COLOR).setThumbnail(t.displayAvatarURL({ dynamic: true })).addFields({ name: '💸 Cash', value: `$${eco.cash}`, inline: true }, { name: '🏦 Bank', value: `$${eco.bank}`, inline: true }, { name: '📈 Level', value: `${xp.level}`, inline: true }, { name: '⭐ Rep', value: `${rep}`, inline: true }, { name: '💍 Spouse', value: p.spouse ? `<@${p.spouse}>` : 'Single', inline: true }); if (p.banner) e.setImage(p.banner); else if (t.banner) e.setImage(t.bannerURL({ size: 512 })); message.channel.send({ embeds: [e] }); }
    if (cmd === 'setbio') { const bio = args.join(' '); if (!bio) return; if (!db.profiles[message.author.id]) db.profiles[message.author.id] = {}; db.profiles[message.author.id].bio = bio; saveDB(); sendEmbed(message.channel, `Bio updated.`); }
    if (cmd === 'setbanner') { const url = args[0] || message.attachments.first()?.url; if (!url) return; if (!db.profiles[message.author.id]) db.profiles[message.author.id] = {}; db.profiles[message.author.id].banner = url; saveDB(); sendEmbed(message.channel, `Banner set.`); }
    if (cmd === 'marry') { const t = message.mentions.users.first(); if (!t || t.id === message.author.id) return; message.channel.send(`${t}, **${message.author.username}** proposes! Type \`yes\``); const filter = m => m.author.id === t.id && m.content.toLowerCase() === 'yes'; message.channel.createMessageCollector({ filter, time: 30000, max: 1 }).on('collect', () => { if (!db.profiles[message.author.id]) db.profiles[message.author.id] = {}; if (!db.profiles[t.id]) db.profiles[t.id] = {}; db.profiles[message.author.id].spouse = t.id; db.profiles[t.id].spouse = message.author.id; saveDB(); sendEmbed(message.channel, `❤️ Married!`); }); }
    if (cmd === 'divorce') { delete db.profiles[message.author.id].spouse; saveDB(); sendEmbed(message.channel, `💔 Divorced.`); }

    // Admin
    if (cmd === 'roleall') { if (!checkPerms(message, 'ManageRoles')) return; const role = message.mentions.roles.first(); if (role) { message.channel.send(`⏳ Giving **${role.name}**...`); message.guild.members.cache.filter(m => !m.user.bot).forEach(m => m.roles.add(role).catch(() => {})); } }
    if (cmd === 'removeroleall') { if (!checkPerms(message, 'ManageRoles')) return; const role = message.mentions.roles.first(); if (role) { message.channel.send(`⏳ Removing **${role.name}**...`); message.guild.members.cache.forEach(m => m.roles.remove(role).catch(() => {})); } }
    if (cmd === 'hardban') { if (!checkPerms(message, 'Administrator')) return; const t = message.mentions.members.first(); if (t) { t.ban({ deleteMessageSeconds: 604800 }); sendEmbed(message.channel, `☣️ **${t.user.tag}** hardbanned.`); } }
    if (cmd === 'kick') { if (!checkPerms(message, 'KickMembers')) return; const t = message.mentions.members.first(); if (t) { t.kick(); sendEmbed(message.channel, `👢 **${t.user.tag}** kicked.`); } }
    if (cmd === 'ban') { if (!checkPerms(message, 'BanMembers')) return; const t = message.mentions.members.first(); if (t) { t.ban(); sendEmbed(message.channel, `🔨 **${t.user.tag}** banned.`); } }
    if (cmd === 'nuke') { if (!checkPerms(message, 'ManageChannels')) return; const p = message.channel.position; message.channel.clone().then(c => { message.channel.delete(); c.setPosition(p); c.send('https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif'); }); }
    if (cmd === 'purge') { if (!checkPerms(message, 'ManageMessages')) return; const n = parseInt(args[0]); if (n) message.channel.bulkDelete(n, true); }
    
    // Util
    if (cmd === 'steal') { if (!checkPerms(message, 'ManageEmojisAndStickers')) return; if (args[0]) { const p = parseEmoji(args[0]); if (p?.id) message.guild.emojis.create({ attachment: `https://cdn.discordapp.com/emojis/${p.id}${p.animated ? '.gif' : '.png'}`, name: p.name }).then(e => sendEmbed(message.channel, `Stole **${e.name}** ${e}`)); } }
    if (cmd === 'snipe' || cmd === 's') { const s = snipes.get(message.channel.id); if (s) { const e = new EmbedBuilder().setAuthor({ name: s.author.tag, iconURL: s.author.displayAvatarURL() }).setDescription(s.content || 'Image').setFooter({ text: `Deleted ${moment(s.time).fromNow()}` }).setColor(CONFIG.COLOR); if (s.image) e.setImage(s.image); message.channel.send({ embeds: [e] }); } }
    if (cmd === 'firstmsg') { message.channel.messages.fetch({ after: 1, limit: 1 }).then(m => { const f = m.first(); message.channel.send({ embeds: [new EmbedBuilder().setDescription(`[First Message](${f.url})`).setColor(CONFIG.COLOR)] }); }); }
    if (cmd === 'mc') sendEmbed(message.channel, `**${message.guild.memberCount}** Members`, 'COUNT', CONFIG.footer);
    if (cmd === 'afk') { db.afk[message.author.id] = args.join(' ') || 'AFK'; saveDB(); sendEmbed(message.channel, null, `💤 **${message.author.username}** is now AFK.`, CONFIG.footer); }
    if (cmd === 'av') { const u = message.mentions.users.first() || message.author; message.channel.send({ embeds: [new EmbedBuilder().setTitle(u.tag).setImage(u.displayAvatarURL({ dynamic: true, size: 1024 })).setColor(CONFIG.COLOR)] }); }
    if (cmd === 'banner') { const u = message.mentions.users.first() || message.author; client.users.fetch(u.id, { force: true }).then(f => { if(f.banner) message.channel.send({ embeds: [new EmbedBuilder().setTitle(u.tag).setImage(f.bannerURL({ dynamic: true, size: 1024 })).setColor(CONFIG.COLOR)] }); }); }
    if (cmd === 'user' || cmd === 'ui') { const u = message.mentions.users.first() || message.author; const m = message.guild.members.cache.get(u.id); const e = new EmbedBuilder().setAuthor({ name: u.tag, iconURL: u.displayAvatarURL() }).setThumbnail(u.displayAvatarURL({ dynamic: true })).setColor(CONFIG.COLOR).addFields({ name: 'Joined', value: `<t:${parseInt(m.joinedTimestamp / 1000)}:R>`, inline: true }, { name: 'Registered', value: `<t:${parseInt(u.createdTimestamp / 1000)}:R>`, inline: true }); message.channel.send({ embeds: [e] }); }
    if (cmd === 'bal') { const u = message.mentions.users.first() || message.author; const e = db.economy[u.id] || { cash: 0, bank: 0 }; message.channel.send({ embeds: [new EmbedBuilder().setAuthor({ name: u.username, iconURL: u.displayAvatarURL() }).setDescription(`**Cash:** $${e.cash}\n**Bank:** $${e.bank}`).setColor(CONFIG.COLOR)] }); }
    if (cmd === 'gamble') { const amt = parseInt(args[0]); if (!amt || amt < 10) return; const e = db.economy[message.author.id]; if (e.cash < amt) return; if (Math.random() > 0.55) { e.cash += amt; saveDB(); sendEmbed(message.channel, `🎲 Won **$${amt}**`); } else { e.cash -= amt; saveDB(); sendEmbed(message.channel, `💸 Lost **$${amt}**`); } }

    // --- HELP ---
    if (cmd === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('97s Obsidian')
            .setColor(CONFIG.COLOR)
            .addFields(
                { name: '🖼️ Image', value: '`,tweet` `,youtube` `,wasted` `,triggered` `,gay` `,jail` `,blur` `,pixelate`', inline: false },
                { name: '🎭 Fun', value: '`,hack` `,iq` `,howhot` `,ship` `,meme` `,8ball`', inline: false },
                { name: '🔧 Util', value: '`,urban` `,weather` `,define` `,worldclock` `,hex` `,setmodlog`', inline: false },
                { name: '🛡️ Server', value: '`,lockdown` `,unlockdown` `,nuke` `,purge` `,slowmode`', inline: false },
                { name: '👤 Profile', value: '`,profile` `,setbio` `,setbanner` `,marry` `,divorce`', inline: false },
                { name: '🩸 Bleed', value: '`,steal` `,snipe` `,firstmsg` `,mc` `,rep`', inline: false }
            );
        message.reply({ embeds: [embed] });
    }
});

function checkPerms(message, perm) {
    if (!message.member.permissions.has(PermissionsBitField.Flags[perm])) {
        sendError(message.channel, `Missing: \`${perm}\``);
        return false;
    }
    return true;
}

// --- 6. ERROR HANDLING & KEEPALIVE ---

// Prevent crashes from unhandled errors
process.on('unhandledRejection', (reason, p) => {
    console.error('[ANTI-CRASH] Unhandled Rejection/Catch');
    console.error(reason, p);
});

process.on('uncaughtException', (err, origin) => {
    console.error('[ANTI-CRASH] Uncaught Exception');
    console.error(err, origin);
});

http.createServer((req, res) => { res.write('97s Online'); res.end(); }).listen(process.env.PORT || 3000);
client.login(CONFIG.TOKEN);
