/**
 * 97s - Discord Bot Core "The Ultimate Merge"
 * Version: 6.0.0 (Leviathan Features + Dashboard API)
 * Theme: Bleed Pink (#db2777) | Dark Mode
 * Trigger: "," (Comma)
 */

require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, 
    ChannelType, ActivityType, ButtonBuilder, ActionRowBuilder, 
    ButtonStyle, Events 
} = require('discord.js');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

// --- 1. CORE CONFIGURATION ---
const CONFIG = {
    TOKEN: process.env.TOKEN || 'YOUR_BOT_TOKEN_HERE',
    PREFIX: ',', 
    COLOR: 0xdb2777,
    footer: '97s Systems • Leviathan v6.0'
};

// --- 2. DATABASE & STATE ---
const DB_FILE = './database.json';
let db = { 
    xp: {}, economy: {}, afk: {}, 
    warns: {}, giveaways: [] 
};

// Load DB safely
if (fs.existsSync(DB_FILE)) { 
    try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } 
    catch { console.log('[DB] Corrupt file, resetting.'); } 
}
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

const musicQueue = new Map();

// --- 3. INITIALIZATION ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// --- 4. EXPRESS API (Dashboard Backend) ---
const app = express();
app.use(cors());
app.use(express.json());

// API: Stats Overview
app.get('/api/stats', (req, res) => {
    res.json({
        servers: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        uptime: client.uptime,
        ping: client.ws.ping
    });
});

// API: Leaderboard
app.get('/api/leaderboard', (req, res) => {
    const sorted = Object.entries(db.xp)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10);
    
    Promise.all(sorted.map(async (entry) => {
        try {
            const user = await client.users.fetch(entry.id);
            return { ...entry, username: user.username, avatar: user.displayAvatarURL() };
        } catch { return { ...entry, username: 'Unknown', avatar: null }; }
    })).then(data => res.json(data));
});

// API: Health Check (Required for Render)
app.get('/', (req, res) => res.send('97s Leviathan API is Online. 🟢'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[API] Server running on port ${PORT}`));

// --- 5. UTILITY FUNCTIONS ---
const sendEmbed = (channel, title, desc, footer = true) => {
    const embed = new EmbedBuilder()
        .setDescription(title ? `**${title}**\n${desc}` : desc)
        .setColor(CONFIG.COLOR);
    if (footer) embed.setFooter({ text: CONFIG.footer });
    return channel.send({ embeds: [embed] });
};

const sendError = (channel, error) => {
    const embed = new EmbedBuilder()
        .setDescription(`✖ **Error:** ${error}`)
        .setColor(0x2f3136);
    return channel.send({ embeds: [embed] });
};

// --- 6. EVENT LISTENERS ---

client.once(Events.ClientReady, () => {
    console.log(`[SYSTEM] 97s Leviathan is online as ${client.user.tag}`);
    
    let i = 0;
    const statuses = [
        { name: `,help | Dashboard Live`, type: ActivityType.Streaming, url: 'https://twitch.tv/monstercat' },
        { name: `${client.guilds.cache.size} Servers`, type: ActivityType.Watching },
        { name: 'Security Protocols', type: ActivityType.Listening }
    ];
    setInterval(() => {
        client.user.setPresence({ activities: [statuses[i]], status: 'dnd' });
        i = (i + 1) % statuses.length;
    }, 10000);
});

// Passive Logic (AFK & XP)
client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    // XP
    if (!db.xp[message.author.id]) db.xp[message.author.id] = { xp: 0, level: 0 };
    db.xp[message.author.id].xp += 15;
    const nextLvl = (db.xp[message.author.id].level + 1) * 100;
    if (db.xp[message.author.id].xp >= nextLvl) {
        db.xp[message.author.id].level++;
        db.xp[message.author.id].xp = 0;
        message.channel.send(`🎉 ${message.author} reached **Level ${db.xp[message.author.id].level}**!`);
    }

    // Economy Passive
    if (!db.economy[message.author.id]) db.economy[message.author.id] = { cash: 0, bank: 0 };
    if (Math.random() > 0.95) db.economy[message.author.id].cash += 5;

    // AFK Check
    message.mentions.users.forEach(u => {
        if (db.afk[u.id]) sendEmbed(message.channel, null, `💤 **${u.username}** is AFK: ${db.afk[u.id]}`);
    });
    if (db.afk[message.author.id]) {
        delete db.afk[message.author.id];
        message.reply("👋 I removed your AFK status.").then(m => setTimeout(() => m.delete(), 5000));
    }
    
    saveDB();
});

// Command Processor
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(CONFIG.PREFIX)) return;

    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // --- A. MODERATION ---
    if (cmd === 'kick') {
        if (!checkPerms(message, 'KickMembers')) return;
        const target = message.mentions.members.first();
        if (!target || !target.kickable) return sendError(message.channel, 'Cannot kick user.');
        await target.kick(args.slice(1).join(' ') || 'N/A');
        return sendEmbed(message.channel, 'KICKED', `👢 **${target.user.tag}** removed.`);
    }

    if (cmd === 'ban') {
        if (!checkPerms(message, 'BanMembers')) return;
        const target = message.mentions.members.first();
        if (!target) return sendError(message.channel, 'Mention user.');
        await target.ban({ reason: args.slice(1).join(' ') });
        return sendEmbed(message.channel, 'BANNED', `🔨 **${target.user.tag}** banned.`);
    }

    if (cmd === 'nuke') {
        if (!checkPerms(message, 'ManageChannels')) return;
        const pos = message.channel.position;
        const clone = await message.channel.clone();
        await message.channel.delete();
        await clone.setPosition(pos);
        await clone.send('https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif');
        return sendEmbed(clone, 'NUKED', 'Channel wiped.');
    }

    if (cmd === 'purge') {
        if (!checkPerms(message, 'ManageMessages')) return;
        const amount = parseInt(args[0]);
        if (!amount || amount > 100) return sendError(message.channel, '1-100 only.');
        await message.channel.bulkDelete(amount, true);
    }

    // --- B. MUSIC ---
    if (cmd === 'play' || cmd === 'p') {
        if (!message.member.voice.channel) return sendError(message.channel, 'Join VC.');
        if (!args[0]) return sendError(message.channel, 'Song/URL needed.');
        
        const song = args.join(' ');
        const queue = musicQueue.get(message.guild.id) || [];
        queue.push({ title: song });
        musicQueue.set(message.guild.id, queue);

        if (queue.length === 1) {
            const embed = new EmbedBuilder()
                .setDescription(`🎵 Now Playing: **${song}**`)
                .setColor(CONFIG.COLOR)
                .setThumbnail('https://i.giphy.com/media/S5Jsw8x8T5ZISuNBk6/giphy.gif');
            return message.channel.send({ embeds: [embed] });
        } else {
            return sendEmbed(message.channel, 'Queued', `📝 **${song}** added.`);
        }
    }

    if (cmd === 'skip') {
        if (!musicQueue.has(message.guild.id)) return sendError(message.channel, 'Empty queue.');
        return sendEmbed(message.channel, 'Skipped', '⏭ Track skipped.');
    }

    // --- C. ECONOMY ---
    if (cmd === 'bal') {
        const u = message.mentions.users.first() || message.author;
        const e = db.economy[u.id] || { cash: 0, bank: 0 };
        return sendEmbed(message.channel, 'BALANCE', `💳 **User:** ${u.username}\n💰 **$${e.cash}**`);
    }

    if (cmd === 'gamble') {
        const amt = parseInt(args[0]);
        if (!amt || amt < 10) return sendError(message.channel, 'Min $10.');
        const e = db.economy[message.author.id];
        if (e.cash < amt) return sendError(message.channel, 'Too poor.');
        
        if (Math.random() > 0.55) {
            e.cash += amt;
            saveDB();
            return sendEmbed(message.channel, 'WIN', `🎲 Won **$${amt}**!`);
        } else {
            e.cash -= amt;
            saveDB();
            return sendEmbed(message.channel, 'LOSS', `💸 Lost **$${amt}**.`);
        }
    }

    // --- D. SOCIAL/UTIL ---
    if (cmd === 'afk') {
        db.afk[message.author.id] = args.join(' ') || 'AFK';
        saveDB();
        return sendEmbed(message.channel, null, `💤 **${message.author.username}** is now AFK.`);
    }

    if (cmd === 'embed') {
        if (!checkPerms(message, 'ManageMessages')) return;
        try {
            const json = JSON.parse(message.content.slice(CONFIG.PREFIX.length + 5));
            if (!json.color) json.color = CONFIG.COLOR;
            message.channel.send({ embeds: [json] });
        } catch { sendError(message.channel, 'Invalid JSON.'); }
    }

    if (cmd === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('97s | LEVIATHAN')
            .setDescription('**[>> Dashboard <<](https://97s-bot.com)**')
            .setColor(CONFIG.COLOR)
            .addFields(
                { name: '🛡️ Mod', value: '`,kick` `,ban` `,nuke` `,purge`', inline: true },
                { name: '🎵 Music', value: '`,play` `,skip`', inline: true },
                { name: '💰 Eco', value: '`,bal` `,gamble`', inline: true },
                { name: '🔧 Util', value: '`,afk` `,embed` `,ping`', inline: true }
            );
        return message.reply({ embeds: [embed] });
    }
});

function checkPerms(message, perm) {
    if (!message.member.permissions.has(PermissionsBitField.Flags[perm])) {
        sendError(message.channel, `Need: \`${perm}\``);
        return false;
    }
    return true;
}

client.login(CONFIG.TOKEN);
