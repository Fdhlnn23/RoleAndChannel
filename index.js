require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = '!';

// ===== LOAD DATA =====
let data = {};
if (fs.existsSync('./data.json')) {
  try {
    data = JSON.parse(fs.readFileSync('./data.json'));
  } catch {
    data = {};
  }
}

function saveData() {
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
}

// ===== UPDATE CHANNEL =====
async function updateChannel(guild) {
  const guildData = data[guild.id];
  if (!guildData) return;

  for (const item of guildData) {
    const role = guild.roles.cache.get(item.roleId);
    const channel = guild.channels.cache.get(item.channelId);

    if (!role || !channel) continue;

    const count = role.members.size;

    const newName = `${item.baseName}-${count}`;

    if (channel.name !== newName) {
      try {
        await channel.setName(newName);
        console.log(`Updated: ${newName}`);
      } catch (err) {
        console.error('Gagal rename:', err.message);
      }
    }
  }
}

// ===== COMMAND =====
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.split(' ');
  const cmd = args[0].toLowerCase();

  // ===== SET GAME =====
  if (cmd === '!setgame') {
    const role = message.mentions.roles.first();
    const channel = message.mentions.channels.first();

    if (!role || !channel) {
      return message.reply('Format: !setgame @role #channel');
    }

    if (!data[message.guild.id]) {
      data[message.guild.id] = [];
    }

    const baseName = channel.name.replace(/-\d+$/, '');

    const existing = data[message.guild.id].find(
      x => x.channelId === channel.id
    );

    if (existing) {
      existing.roleId = role.id;
      existing.baseName = baseName;
    } else {
      data[message.guild.id].push({
        roleId: role.id,
        channelId: channel.id,
        baseName: baseName
      });
    }

    saveData();

    await message.reply(`✅ Set berhasil: ${baseName}-X`);

    updateChannel(message.guild);
  }

  // ===== REMOVE GAME =====
  if (cmd === '!removegame') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      return message.reply('Format: !removegame #channel');
    }

    if (!data[message.guild.id]) return;

    data[message.guild.id] = data[message.guild.id].filter(
      x => x.channelId !== channel.id
    );

    saveData();

    message.reply('🗑️ Data berhasil dihapus');
  }

  // ===== LIST GAME =====
  if (cmd === '!listgame') {
    const guildData = data[message.guild.id];

    if (!guildData || guildData.length === 0) {
      return message.reply('Belum ada data.');
    }

    let text = '📊 List Game:\n';

    guildData.forEach((item, i) => {
      text += `${i + 1}. <@&${item.roleId}> → <#${item.channelId}>\n`;
    });

    message.reply(text);
  }
});

// ===== EVENTS =====
client.on('guildMemberUpdate', (oldMember, newMember) => {
  updateChannel(newMember.guild);
});

client.on('guildMemberAdd', (member) => {
  updateChannel(member.guild);
});

client.on('guildMemberRemove', (member) => {
  updateChannel(member.guild);
});

// ===== READY =====
client.on('ready', () => {
  console.log(`🚀 Login sebagai ${client.user.tag}`);
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
