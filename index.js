/**
 * 97s - Discord Bot Core
 * Version: 2.1.0 (Tickets & Welcome Update)
 * Theme: Pink (#db2777) | Black | Gray
 */

require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    PermissionsBitField, 
    ChannelType,
    ActivityType
} = require('discord.js');
const fs = require('fs');

// --- CONFIGURATION ---
const CONFIG = {
    TOKEN: process.env.TOKEN || 'YOUR_BOT_TOKEN_HERE', 
    PREFIX: '!',
    COLOR: 0xdb2777,
    // Change this to the exact name of your welcome channel
    WELCOME_CHANNEL_NAME: 'welcome' 
};

// --- DATABASE (Local) ---
const DB_FILE = './database.json';
let db = { xp: {} };

if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// --- INITIALIZATION ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, // Required for Welcome messages
        GatewayIntentBits.GuildPresences
    ]
});

// --- EVENTS ---

client.once('ready', () => {
    console.log(`[SYSTEM] 97s is online as ${client.user.tag}`);
    console.log(`[SYSTEM] Listening for !ticket and New Members...`);
    
    client.user.setPresence({ 
        activities: [{ name: 'over the server | !help', type: ActivityType.Watching }], 
        status: 'dnd' 
    });
});

// EVENT: User Joins Server (Welcome System)
client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.find(ch => ch.name === CONFIG.WELCOME_CHANNEL_NAME);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`WELCOME TO ${member.guild.name.toUpperCase()}`)
        .setDescription(`Greetings, <@${member.id}>. \nWe have been expecting you.`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor(CONFIG.COLOR)
        .addFields(
            { name: 'User ID', value: `${member.id}`, inline: true },
            { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
        )
        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z5eXhmZ3F4aHZ5eXhmZ3F4aHZ5eXhmZ3F4aHZ5eXhmZ3F4aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L1R1TVTh2RhtDbmCjE/giphy.gif') // Cyberpunk city gif
        .setFooter({ text: '97s Systems • Access Granted' });

    channel.send({ content: `<@${member.id}>`, embeds: [embed] });
});

// EVENT: Message Received
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // XP System
    handleLeveling(message);

    if (!message.content.startsWith(CONFIG.PREFIX)) return;

    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- COMMANDS ---

    // !help
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('97s | PROTOCOLS')
            .setColor(CONFIG.COLOR)
            .addFields(
                { name: '🎫 Support', value: '`!ticket`, `!close`', inline: true },
                { name: '🛡️ Moderation', value: '`!kick`, `!ban`, `!purge`', inline: true },
                { name: '📊 Profile', value: '`!rank`', inline: true }
            );
        return message.reply({ embeds: [embed] });
    }

    // !ticket (Creates a private channel)
    if (command === 'ticket') {
        // Check if ticket already exists
        const existingChannel = message.guild.channels.cache.find(c => c.name === `ticket-${message.author.username.toLowerCase()}`);
        if (existingChannel) return message.reply(`❌ You already have an open ticket: ${existingChannel}`);

        // Create Channel
        const channel = await message.guild.channels.create({
            name: `ticket-${message.author.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: message.guild.id, // @everyone
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: message.author.id, // The user
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: client.user.id, // The bot
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        const embed = new EmbedBuilder()
            .setTitle('🎫 SUPPORT TICKET OPENED')
            .setDescription(`Hello ${message.author}. Support will be with you shortly.\n\nType \`!close\` to close this ticket.`)
            .setColor(CONFIG.COLOR);

        await channel.send({ content: `${message.author}`, embeds: [embed] });
        return message.reply(`✅ Ticket created: ${channel}`);
    }

    // !close (Deletes the ticket)
    if (command === 'close') {
        if (!message.channel.name.startsWith('ticket-')) {
            return message.reply("❌ You can only use this command inside a ticket channel.");
        }
        message.channel.send("🔒 **Closing Ticket in 5 seconds...**");
        setTimeout(() => message.channel.delete(), 5000);
    }

    // !rank
    if (command === 'rank') {
        const target = message.mentions.users.first() || message.author;
        const data = db.xp[target.id] || { xp: 0, level: 0 };
        const xpNext = (data.level + 1) * 100;
        
        const embed = new EmbedBuilder()
            .setTitle('IDENTITY CARD')
            .setColor(CONFIG.COLOR)
            .setDescription(`**User:** ${target.username}\n**Level:** ${data.level}\n**XP:** ${data.xp} / ${xpNext}`);
            
        return message.reply({ embeds: [embed] });
    }

    // !purge
    if (command === 'purge') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const amount = parseInt(args[0]);
        if (!amount) return message.reply("Specify amount: `!purge 5`");
        await message.channel.bulkDelete(amount, true);
    }
});

// --- HELPERS ---
function handleLeveling(message) {
    if (!db.xp[message.author.id]) db.xp[message.author.id] = { xp: 0, level: 0 };
    db.xp[message.author.id].xp += 15;
    const nextLvl = (db.xp[message.author.id].level + 1) * 100;
    if (db.xp[message.author.id].xp >= nextLvl) {
        db.xp[message.author.id].level++;
        db.xp[message.author.id].xp = 0;
        message.channel.send(`🎉 ${message.author} leveled up to **Lvl ${db.xp[message.author.id].level}**!`);
    }
    saveDB();
}

client.login(CONFIG.TOKEN);
