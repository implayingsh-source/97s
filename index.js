/**
 * 97s - Discord Bot Core "Bleed Edition"
 * Version: 8.0.0 (Snipe, Roles, Banner, Clean UI)
 * Theme: Bleed Pink (#db2777) | Dark Mode
 * Trigger: "," (Comma)
 */

require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, 
    ChannelType, ActivityType, ButtonBuilder, ActionRowBuilder, 
    ButtonStyle, Events, Collection 
} = require('discord.js');
const fs = require('fs');
const ms = require('ms');
const axios = require('axios');
const http = require('http');
const moment = require('moment');

// --- 1. CORE CONFIGURATION ---
const CONFIG = {
    TOKEN: process.env.TOKEN || 'YOUR_BOT_TOKEN_HERE',
    PREFIX: ',', 
    COLOR: 0xdb2777,
    footer: '97s' // Minimal footer
};

// --- 2. DATABASE & STATE ---
const DB_FILE = './database.json';
let db = { xp: {}, economy: {}, afk: {}, warns: {}, mutes: {} };

if (fs.existsSync(DB_FILE)) { 
    try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } 
    catch { console.log('[DB] Corrupt file, resetting.'); } 
}
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

const musicQueue = new Map();
// SNIPE MEMORY (New Feature)
const snipes = new Collection();

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

// --- 4. UTILITY FUNCTIONS ---
// Updated to allow disabling footer completely
const sendEmbed = (channel, title, desc, footerText = null) => {
    const embed = new EmbedBuilder()
        .setDescription(title ? `**${title}**\n${desc}` : desc)
        .setColor(CONFIG.COLOR);
    
    if (footerText) {
        embed.setFooter({ text: footerText });
    }
    
    return channel.send({ embeds: [embed] });
};

const sendError = (channel, error) => {
    const embed = new EmbedBuilder()
        .setDescription(`✖ ${error}`)
        .setColor(0x2f3136);
    return channel.send({ embeds: [embed] });
};

// --- 5. EVENT LISTENERS ---

client.once(Events.ClientReady, () => {
    console.log(`[SYSTEM] 97s is online as ${client.user.tag}`);
    
    // SET STATUS TO "ky owns me"
    client.user.setPresence({ 
        activities: [{ name: 'ky owns me', type: ActivityType.Streaming, url: 'https://twitch.tv/monstercat' }], 
        status: 'dnd' 
    });
});

// SNIPE LISTENER (Detect deleted messages)
client.on('messageDelete', message => {
    if (message.author.bot) return;
    snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        image: message.attachments.first() ? message.attachments.first().proxyURL : null,
        time: Date.now()
    });
});

// Passive Logic (AFK & XP)
client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    // Economy Passive
    if (!db.economy[message.author.id]) db.economy[message.author.id] = { cash: 0, bank: 0 };
    if (Math.random() > 0.95) db.economy[message.author.id].cash += 5;

    // AFK Check
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(u => {
            if (db.afk[u.id]) sendEmbed(message.channel, null, `💤 **${u.username}** is AFK: ${db.afk[u.id]}`, CONFIG.footer);
        });
    }
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

    // --- A. BLEED FEATURES ---

    // ,snipe
    if (cmd === 'snipe' || cmd === 's') {
        const snipe = snipes.get(message.channel.id);
        if (!snipe) return sendError(message.channel, 'There is nothing to snipe.');
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: snipe.author.tag, iconURL: snipe.author.displayAvatarURL() })
            .setDescription(snipe.content || 'No text content.')
            .setColor(CONFIG.COLOR)
            .setFooter({ text: `Deleted ${moment(snipe.time).fromNow()}` });
        
        if (snipe.image) embed.setImage(snipe.image);
        
        message.channel.send({ embeds: [embed] });
    }

    // ,role @user @role
    if (cmd === 'role') {
        if (!checkPerms(message, 'ManageRoles')) return;
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();

        if (!member || !role) return sendError(message.channel, 'Usage: `,role @user @role`');

        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            sendEmbed(message.channel, null, `**${member.user.username}** has lost the **${role.name}** role.`, CONFIG.footer);
        } else {
            await member.roles.add(role);
            sendEmbed(message.channel, null, `**${member.user.username}** has been given the **${role.name}** role.`, CONFIG.footer);
        }
    }

    // ,av / ,banner
    if (cmd === 'av' || cmd === 'avatar') {
        const u = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder().setTitle(u.tag).setImage(u.displayAvatarURL({ dynamic: true, size: 1024 })).setColor(CONFIG.COLOR);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'banner') {
        const u = message.mentions.users.first() || message.author;
        // Need to fetch user to get banner
        const fetchedUser = await client.users.fetch(u.id, { force: true });
        if (!fetchedUser.banner) return sendError(message.channel, 'User has no banner.');
        
        const embed = new EmbedBuilder().setTitle(u.tag).setImage(fetchedUser.bannerURL({ dynamic: true, size: 1024 })).setColor(CONFIG.COLOR);
        message.channel.send({ embeds: [embed] });
    }

    // ,whois (Detailed)
    if (cmd === 'whois' || cmd === 'ui') {
        const user = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(user.id);
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setColor(CONFIG.COLOR)
            .addFields(
                { name: 'Joined', value: `<t:${parseInt(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Registered', value: `<t:${parseInt(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: `Roles [${member.roles.cache.size - 1}]`, value: member.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position).map(r => r).join(" ").slice(0, 1024) || "None" }
            )
            .setFooter({ text: `ID: ${user.id}` });
        message.channel.send({ embeds: [embed] });
    }

    // --- B. MODERATION ---
    if (cmd === 'kick') {
        if (!checkPerms(message, 'KickMembers')) return;
        const target = message.mentions.members.first();
        if (!target || !target.kickable) return sendError(message.channel, 'Cannot kick user.');
        await target.kick(args.slice(1).join(' ') || 'N/A');
        return sendEmbed(message.channel, 'KICKED', `👢 **${target.user.tag}** removed.`, CONFIG.footer);
    }

    if (cmd === 'ban') {
        if (!checkPerms(message, 'BanMembers')) return;
        const target = message.mentions.members.first();
        if (!target) return sendError(message.channel, 'Mention user.');
        await target.ban({ reason: args.slice(1).join(' ') });
        return sendEmbed(message.channel, 'BANNED', `🔨 **${target.user.tag}** banned.`, CONFIG.footer);
    }

    if (cmd === 'mute') {
        if (!checkPerms(message, 'ModerateMembers')) return;
        const target = message.mentions.members.first();
        const time = args[1];
        if (!target || !time) return sendError(message.channel, 'Usage: `,mute @user 10m`');
        
        const msTime = ms(time);
        if (!msTime) return sendError(message.channel, 'Invalid time.');

        try {
            await target.timeout(msTime, 'Muted by 97s');
            sendEmbed(message.channel, 'MUTED', `🤐 **${target.user.tag}** muted for **${time}**.`, CONFIG.footer);
        } catch (e) { sendError(message.channel, 'Hierarchy Error.'); }
    }

    if (cmd === 'unmute') {
        if (!checkPerms(message, 'ModerateMembers')) return;
        const target = message.mentions.members.first();
        if (!target) return sendError(message.channel, 'Mention user.');
        await target.timeout(null);
        return sendEmbed(message.channel, 'UNMUTED', `🗣 **${target.user.tag}** released.`, CONFIG.footer);
    }

    if (cmd === 'purge') {
        if (!checkPerms(message, 'ManageMessages')) return;
        const amount = parseInt(args[0]);
        if (!amount || amount > 100) return sendError(message.channel, '1-100 only.');
        await message.channel.bulkDelete(amount, true);
        message.channel.send(`🧹 Cleared ${amount} messages.`).then(m => setTimeout(() => m.delete(), 3000));
    }

    // --- C. ECONOMY (Cleaned up) ---
    if (cmd === 'bal') {
        const u = message.mentions.users.first() || message.author;
        const e = db.economy[u.id] || { cash: 0, bank: 0 };
        // Clean "Bleed style" embed - No title, No footer, just data
        const embed = new EmbedBuilder()
            .setAuthor({ name: u.username, iconURL: u.displayAvatarURL() })
            .setDescription(`**Cash:** $${e.cash}\n**Bank:** $${e.bank}\n**Total:** $${e.cash + e.bank}`)
            .setColor(CONFIG.COLOR);
        return message.channel.send({ embeds: [embed] });
    }

    if (cmd === 'gamble') {
        const amt = parseInt(args[0]);
        if (!amt || amt < 10) return sendError(message.channel, 'Min $10.');
        const e = db.economy[message.author.id];
        if (e.cash < amt) return sendError(message.channel, 'Too poor.');
        
        if (Math.random() > 0.55) {
            e.cash += amt;
            saveDB();
            return sendEmbed(message.channel, null, `🎲 You won **$${amt}**`, null);
        } else {
            e.cash -= amt;
            saveDB();
            return sendEmbed(message.channel, null, `💸 You lost **$${amt}**`, null);
        }
    }

    // --- D. SOCIAL/FUN ---
    if (cmd === 'afk') {
        db.afk[message.author.id] = args.join(' ') || 'AFK';
        saveDB();
        return sendEmbed(message.channel, null, `💤 **${message.author.username}** is now AFK.`, CONFIG.footer);
    }

    if (cmd === 'say') {
        if (!checkPerms(message, 'ManageMessages')) return;
        const text = args.join(' ');
        if (!text) return;
        message.delete();
        message.channel.send(text);
    }

    // --- E. HELP ---
    if (cmd === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('97s')
            .setDescription(`**Prefix:** \`${CONFIG.PREFIX}\``)
            .setColor(CONFIG.COLOR)
            .addFields(
                { name: 'System', value: '`,snipe` `,afk` `,ping` `,uptime`', inline: true },
                { name: 'User', value: '`,av` `,banner` `,whois` `,role`', inline: true },
                { name: 'Admin', value: '`,kick` `,ban` `,mute` `,unmute` `,purge`', inline: true },
                { name: 'Eco', value: '`,bal` `,gamble`', inline: true }
            );
        return message.reply({ embeds: [embed] });
    }
});

function checkPerms(message, perm) {
    if (!message.member.permissions.has(PermissionsBitField.Flags[perm])) {
        sendError(message.channel, `Missing: \`${perm}\``);
        return false;
    }
    return true;
}

// Keep Render alive
http.createServer((req, res) => {
    res.write('97s Online');
    res.end();
}).listen(process.env.PORT || 3000);

client.login(CONFIG.TOKEN);
