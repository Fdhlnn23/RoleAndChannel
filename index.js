require('dotenv').config();

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
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

  // ===== SET GAME (ADMIN ONLY) =====
  if (cmd === '!setgame') {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Hanya admin yang bisa pakai command ini');
    }

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

  // ===== REMOVE GAME (ADMIN ONLY) =====
  if (cmd === '!removegame') {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Hanya admin yang bisa pakai command ini');
    }

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

  // ===== LIST GAME (SEMUA ORANG) =====
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

// ===== READY (FIX COUNT 0) =====
client.on('ready', async () => {
  console.log(`🚀 Login sebagai ${client.user.tag}`);

  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.members.fetch(); // 🔥 ambil semua member
      console.log(`✅ Loaded members: ${guild.name}`);

      await updateChannel(guild); // langsung update
    } catch (err) {
      console.error(`❌ Gagal fetch di ${guild.name}`, err.message);
    }
  }
});

// ===== OPTIONAL AUTO REFRESH =====
setInterval(() => {
  client.guilds.cache.forEach(guild => {
    updateChannel(guild);
  });
}, 30000); // tiap 30 detik

// ===== LOGIN =====
client.login(process.env.TOKEN);
