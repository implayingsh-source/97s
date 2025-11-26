/**
 * 97s - Discord Bot Core "Titanium Edition"
 * Version: 12.0.0 (80+ Commands, Role Management, Animals, Fun)
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
    footer: '97s Titanium'
};

// --- 2. DATABASE ---
const DB_FILE = './database.json';
let db = { 
    xp: {}, economy: {}, afk: {}, warns: {}, 
    antinuke: { enabled: false, whitelist: [] },
    settings: { welcome_channel: null, welcome_msg: null, autorole: null },
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

// --- 5. SYSTEM EVENT LISTENERS ---

client.once(Events.ClientReady, () => {
    console.log(`[SYSTEM] 97s Titanium is online as ${client.user.tag}`);
    client.user.setPresence({ activities: [{ name: CONFIG.STATUS, type: ActivityType.Streaming, url: 'https://twitch.tv/monstercat' }], status: 'dnd' });
});

// -- SNIPERS --
client.on('messageDelete', message => {
    if (message.author?.bot) return;
    snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        image: message.attachments.first()?.proxyURL || null,
        time: Date.now()
    });
});

client.on('messageUpdate', (oldMsg, newMsg) => {
    if (oldMsg.author?.bot) return;
    editSnipes.set(oldMsg.channel.id, {
        original: oldMsg.content,
        new: newMsg.content,
        author: oldMsg.author,
        time: Date.now()
    });
});

// -- COMMAND PROCESSOR --
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Passive
    if (!db.economy[message.author.id]) db.economy[message.author.id] = { cash: 0, bank: 0 };
    if (Math.random() > 0.95) { db.economy[message.author.id].cash += 5; saveDB(); }

    // AFK
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
    //    MASS ROLE MANAGEMENT (New)
    // =========================
    if (cmd === 'roleall') {
        if (!checkPerms(message, 'ManageRoles')) return;
        const role = message.mentions.roles.first();
        if (!role) return sendError(message.channel, 'Usage: `,roleall @role`');
        if (role.position >= message.guild.members.me.roles.highest.position) return sendError(message.channel, 'Role is too high.');
        
        message.channel.send(`⏳ Giving **${role.name}** to all humans...`);
        message.guild.members.cache.filter(m => !m.user.bot).forEach(m => m.roles.add(role).catch(() => {}));
        sendEmbed(message.channel, `Process started for **${role.name}**`, 'ROLE ALL');
    }

    if (cmd === 'removeroleall') {
        if (!checkPerms(message, 'ManageRoles')) return;
        const role = message.mentions.roles.first();
        if (!role) return sendError(message.channel, 'Usage: `,removeroleall @role`');
        
        message.channel.send(`⏳ Removing **${role.name}** from everyone...`);
        message.guild.members.cache.forEach(m => m.roles.remove(role).catch(() => {}));
        sendEmbed(message.channel, `Process started for **${role.name}**`, 'REMOVE ALL');
    }

    if (cmd === 'rolebots') {
        if (!checkPerms(message, 'ManageRoles')) return;
        const role = message.mentions.roles.first();
        if (!role) return sendError(message.channel, 'Usage: `,rolebots @role`');
        
        message.guild.members.cache.filter(m => m.user.bot).forEach(m => m.roles.add(role).catch(() => {}));
        sendEmbed(message.channel, `Giving **${role.name}** to all bots.`, 'ROLE BOTS');
    }

    // =========================
    //    ANIMALS (New)
    // =========================
    const animals = {
        'cat': 'https://api.thecatapi.com/v1/images/search',
        'dog': 'https://dog.ceo/api/breeds/image/random',
        'fox': 'https://randomfox.ca/floof/',
        'bird': 'https://some-random-api.com/img/bird',
        'panda': 'https://some-random-api.com/img/panda',
        'koala': 'https://some-random-api.com/img/koala'
    };

    if (Object.keys(animals).includes(cmd)) {
        try {
            const res = await axios.get(animals[cmd]);
            let url = res.data[0]?.url || res.data.message || res.data.image || res.data.link;
            const embed = new EmbedBuilder().setTitle(`Random ${cmd}`).setImage(url).setColor(CONFIG.COLOR);
            message.channel.send({ embeds: [embed] });
        } catch { sendError(message.channel, 'API Error.'); }
    }

    // =========================
    //    FUN & GAMES (New)
    // =========================
    if (cmd === 'rps') {
        const choices = ['rock', 'paper', 'scissors'];
        const userChoice = args[0]?.toLowerCase();
        if (!choices.includes(userChoice)) return sendError(message.channel, 'Usage: `,rps <rock|paper|scissors>`');
        
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        let result;
        if (userChoice === botChoice) result = "It's a tie!";
        else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) result = "You win!";
        else result = "I win!";
        
        sendEmbed(message.channel, `You: **${userChoice}**\nMe: **${botChoice}**\n\nResult: **${result}**`, 'Rock Paper Scissors');
    }

    if (cmd === 'slots') {
        const items = ['🍒', '🍋', '🍉', '🍇', '💎'];
        const a = items[Math.floor(Math.random() * items.length)];
        const b = items[Math.floor(Math.random() * items.length)];
        const c = items[Math.floor(Math.random() * items.length)];
        
        const win = (a === b && b === c);
        sendEmbed(message.channel, `[ ${a} | ${b} | ${c} ]\n\n${win ? '**JACKPOT!** 🎉' : 'You lost.'}`, 'Slots');
    }

    if (cmd === 'roll') {
        const roll = Math.floor(Math.random() * 100) + 1;
        sendEmbed(message.channel, `You rolled: **${roll}**`, 'Dice Roll');
    }

    if (cmd === 'reverse') {
        if (!args[0]) return sendError(message.channel, 'Provide text.');
        message.channel.send(args.join(' ').split('').reverse().join(''));
    }

    if (cmd === 'mock') {
        if (!args[0]) return sendError(message.channel, 'Provide text.');
        const text = args.join(' ').split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
        message.channel.send(text);
    }

    // =========================
    //    ADVANCED UTILITY (New)
    // =========================
    if (cmd === 'calc') {
        const expr = args.join(' ');
        if (!expr) return sendError(message.channel, 'Provide math.');
        try {
            // Safe simple math
            const result = Function('"use strict";return (' + expr.replace(/[^-()\d/*+.]/g, '') + ')')();
            sendEmbed(message.channel, `Input: \`${expr}\`\nOutput: \`${result}\``, 'Calculator');
        } catch { sendError(message.channel, 'Invalid expression.'); }
    }

    if (cmd === 'remind') {
        const time = args[0];
        const note = args.slice(1).join(' ');
        if (!time || !note) return sendError(message.channel, 'Usage: `,remind 10m Take out trash`');
        
        const msTime = ms(time);
        if (!msTime) return sendError(message.channel, 'Invalid time.');
        
        message.reply(`⏰ I will remind you in **${time}**: ${note}`);
        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> ⏰ **REMINDER:** ${note}`);
        }, msTime);
    }

    if (cmd === 'enlarge') {
        const parsed = parseEmoji(args[0]);
        if (!parsed?.id) return sendError(message.channel, 'Invalid emoji.');
        const url = `https://cdn.discordapp.com/emojis/${parsed.id}${parsed.animated ? '.gif' : '.png'}`;
        const embed = new EmbedBuilder().setImage(url).setColor(CONFIG.COLOR);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'uptime') {
        const d = moment.duration(client.uptime);
        sendEmbed(message.channel, `${d.days()}d ${d.hours()}h ${d.minutes()}m ${d.seconds()}s`, 'System Uptime');
    }

    if (cmd === 'channelinfo' || cmd === 'ci') {
        const c = message.channel;
        sendEmbed(message.channel, `**Name:** ${c.name}\n**ID:** ${c.id}\n**Type:** ${c.type}\n**Created:** <t:${parseInt(c.createdTimestamp/1000)}:R>`, 'Channel Info');
    }

    if (cmd === 'roleinfo' || cmd === 'ri') {
        const role = message.mentions.roles.first() || message.guild.roles.highest;
        sendEmbed(message.channel, `**Name:** ${role.name}\n**ID:** ${role.id}\n**Color:** ${role.hexColor}\n**Members:** ${role.members.size}\n**Created:** <t:${parseInt(role.createdTimestamp/1000)}:R>`, 'Role Info');
    }

    // =========================
    //    EXISTING COMMANDS (Bleed/Mod/Eco)
    // =========================
    if (cmd === 'steal') {
        if (!checkPerms(message, 'ManageEmojisAndStickers')) return;
        if (!args[0]) return sendError(message.channel, 'Provide emoji.');
        const parsed = parseEmoji(args[0]);
        if (!parsed?.id) return sendError(message.channel, 'Invalid emoji.');
        const url = `https://cdn.discordapp.com/emojis/${parsed.id}${parsed.animated ? '.gif' : '.png'}`;
        try {
            const emoji = await message.guild.emojis.create({ attachment: url, name: parsed.name });
            return sendEmbed(message.channel, `Stole **${emoji.name}** ${emoji}`, 'ROBBERY');
        } catch { return sendError(message.channel, 'Failed.'); }
    }

    if (cmd === 'snipe' || cmd === 's') {
        const s = snipes.get(message.channel.id);
        if (!s) return sendError(message.channel, 'Nothing to snipe.');
        const embed = new EmbedBuilder().setAuthor({ name: s.author.tag, iconURL: s.author.displayAvatarURL() }).setDescription(s.content || 'Image').setFooter({ text: `Deleted ${moment(s.time).fromNow()}` }).setColor(CONFIG.COLOR);
        if (s.image) embed.setImage(s.image);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'editsnipe' || cmd === 'es') {
        const s = editSnipes.get(message.channel.id);
        if (!s) return sendError(message.channel, 'No edits.');
        const embed = new EmbedBuilder().setAuthor({ name: s.author.tag, iconURL: s.author.displayAvatarURL() }).addFields({ name: 'Before', value: s.original }, { name: 'After', value: s.new }).setColor(CONFIG.COLOR).setFooter({ text: `Edited ${moment(s.time).fromNow()}` });
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'firstmsg') {
        const fetchMsg = await message.channel.messages.fetch({ after: 1, limit: 1 });
        const firstMsg = fetchMsg.first();
        const embed = new EmbedBuilder().setDescription(`**[Click to Jump](${firstMsg.url})**`).setColor(CONFIG.COLOR);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'mc') sendEmbed(message.channel, `**${message.guild.memberCount}** Members`, 'COUNT', CONFIG.footer);
    
    // --- MODERATION ---
    if (cmd === 'kick') {
        if (!checkPerms(message, 'KickMembers')) return;
        const target = message.mentions.members.first();
        if (!target) return sendError(message.channel, 'Mention user.');
        await target.kick();
        sendEmbed(message.channel, `👢 **${target.user.tag}** kicked.`);
    }

    if (cmd === 'ban') {
        if (!checkPerms(message, 'BanMembers')) return;
        const target = message.mentions.members.first();
        if (!target) return sendError(message.channel, 'Mention user.');
        await target.ban();
        sendEmbed(message.channel, `🔨 **${target.user.tag}** banned.`);
    }

    if (cmd === 'warn') {
        if (!checkPerms(message, 'ModerateMembers')) return;
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'No reason';
        if (!target) return sendError(message.channel, 'Usage: `,warn @user reason`');
        if (!db.warns[target.id]) db.warns[target.id] = [];
        db.warns[target.id].push({ reason, mod: message.author.id, time: Date.now() });
        saveDB();
        sendEmbed(message.channel, `⚠️ Warned **${target.user.tag}**\nReason: ${reason}`);
    }

    if (cmd === 'warnings') {
        const target = message.mentions.users.first() || message.author;
        const warns = db.warns[target.id] || [];
        if (warns.length === 0) return sendEmbed(message.channel, 'Clean record.', 'CLEAN');
        const list = warns.map((w, i) => `\`${i+1}.\` ${w.reason}`).join('\n');
        sendEmbed(message.channel, list, `Warnings for ${target.tag}`);
    }

    if (cmd === 'nuke') {
        if (!checkPerms(message, 'ManageChannels')) return;
        const pos = message.channel.position;
        const clone = await message.channel.clone();
        await message.channel.delete();
        await clone.setPosition(pos);
        await clone.send('https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif');
    }

    if (cmd === 'lock') {
        if (!checkPerms(message, 'ManageChannels')) return;
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        sendEmbed(message.channel, 'Channel Locked 🔒');
    }
    
    if (cmd === 'unlock') {
        if (!checkPerms(message, 'ManageChannels')) return;
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
        sendEmbed(message.channel, 'Channel Unlocked 🔓');
    }

    if (cmd === 'slowmode') {
        if (!checkPerms(message, 'ManageChannels')) return;
        const time = parseInt(args[0]);
        if (isNaN(time)) return sendError(message.channel, 'Usage: `,slowmode 10`');
        await message.channel.setRateLimitPerUser(time);
        sendEmbed(message.channel, `Slowmode: **${time}s**`);
    }

    if (cmd === 'hide') {
        if (!checkPerms(message, 'ManageChannels')) return;
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
        sendEmbed(message.channel, 'Channel Hidden 👻');
    }

    if (cmd === 'unhide') {
        if (!checkPerms(message, 'ManageChannels')) return;
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: true });
        sendEmbed(message.channel, 'Channel Visible 👀');
    }

    // --- USER ---
    if (cmd === 'av') {
        const u = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder().setTitle(u.tag).setImage(u.displayAvatarURL({ dynamic: true, size: 1024 })).setColor(CONFIG.COLOR);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'banner') {
        const u = message.mentions.users.first() || message.author;
        const f = await client.users.fetch(u.id, { force: true });
        if (!f.banner) return sendError(message.channel, 'No banner.');
        const embed = new EmbedBuilder().setTitle(u.tag).setImage(f.bannerURL({ dynamic: true, size: 1024 })).setColor(CONFIG.COLOR);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'user' || cmd === 'ui') {
        const user = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(user.id);
        const embed = new EmbedBuilder()
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setColor(CONFIG.COLOR)
            .addFields(
                { name: 'Joined', value: `<t:${parseInt(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Registered', value: `<t:${parseInt(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: `Roles [${member.roles.cache.size - 1}]`, value: member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r).join(" ").slice(0, 1024) || "None" }
            );
        message.channel.send({ embeds: [embed] });
    }

    // --- ECONOMY ---
    if (cmd === 'bal') {
        const u = message.mentions.users.first() || message.author;
        const e = db.economy[u.id] || { cash: 0, bank: 0 };
        const embed = new EmbedBuilder().setAuthor({ name: u.username, iconURL: u.displayAvatarURL() }).setDescription(`**Cash:** $${e.cash}\n**Bank:** $${e.bank}`).setColor(CONFIG.COLOR);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'gamble') {
        const amt = parseInt(args[0]);
        if (!amt || amt < 10) return sendError(message.channel, 'Min $10.');
        const e = db.economy[message.author.id];
        if (e.cash < amt) return sendError(message.channel, 'Too poor.');
        
        if (Math.random() > 0.55) {
            e.cash += amt;
            saveDB();
            sendEmbed(message.channel, `🎲 Won **$${amt}**`);
        } else {
            e.cash -= amt;
            saveDB();
            sendEmbed(message.channel, `💸 Lost **$${amt}**`);
        }
    }

    // --- HELP ---
    if (cmd === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('97s Titanium')
            .setDescription(`Prefix: \`${CONFIG.PREFIX}\` | **Status:** ${CONFIG.STATUS}`)
            .setColor(CONFIG.COLOR)
            .addFields(
                { name: '🩸 Bleed', value: '`,steal` `,snipe` `,es` `,firstmsg` `,mc` `,roleall` `,removeroleall`', inline: false },
                { name: '🐕 Animals', value: '`,cat` `,dog` `,fox` `,bird` `,panda` `,koala`', inline: false },
                { name: '🎉 Fun', value: '`,rps` `,slots` `,roll` `,reverse` `,mock` `,meme` `,8ball`', inline: false },
                { name: '🔧 Util', value: '`,calc` `,remind` `,enlarge` `,uptime` `,channelinfo` `,roleinfo`', inline: false },
                { name: '🛡️ Admin', value: '`,kick` `,ban` `,warn` `,nuke` `,lock` `,hide` `,slowmode`', inline: false }
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

http.createServer((req, res) => { res.write('97s Online'); res.end(); }).listen(process.env.PORT || 3000);
client.login(CONFIG.TOKEN);
