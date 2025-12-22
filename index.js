const fs = require('fs');
const path = require('path');
const bot = require('./lib/login.js');
const print = require('./lib/print.js');
const config = require('./config.js');
const myFunctions = require('./lib/myfunction.js');
print.init(bot);
require('./lib/handler')(bot);
require('./lib/autoReload')([ path.join(__dirname, 'plugins'), path.join(__dirname, 'lib'), path.join(__dirname, 'config.js') ]);

bot.commands = new Map();

for (const funcName in myFunctions) {
  bot[funcName] = myFunctions[funcName];
}
print.info(`${Object.keys(myFunctions).length} fungsi dimuat dari myfunction.js`);

const loadCommands = (dir) => {
  const commandFiles = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of commandFiles) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadCommands(fullPath);
    } else if (file.name.endsWith('.js')) {
      try {
        const command = require(fullPath);
        if (command.name) {
          bot.commands.set(command.name, command);
          if (command.aliases && command.aliases.length > 0) {
            command.aliases.forEach(alias => bot.commands.set(alias, command));
          }
        }
      } catch (error) {
        print.error(error, `Load Command ${file.name}`);
      }
    }
  }
};

loadCommands(path.join(__dirname, 'plugins'));
print.success(`${bot.commands.size} total perintah dan alias berhasil dimuat.`);

bot.on('message', async (msg) => {
  if (!msg.text && !msg.caption) return;
  const prefixes = ['.', '/', 'liona'];
  const text = msg.text || msg.caption || '';
  const prefix = prefixes.find(p => text.startsWith(p));
  if (!prefix) return;

  const args = text.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  const command = bot.commands.get(commandName);

  if (!command) return;

  if (config.botMode === 'self' && msg.from.id !== config.ownerId) {
    return;
  }

  try {
    print.info(`Executing command: ${command.name} | User: ${msg.from.username || msg.from.id}`);
    await command.execute(bot, msg, args);
  } catch (error) {
    print.error(error, `Command ${command.name}`);
    print.userError(msg.chat.id);
  }
});

bot.on('new_chat_members', async (msg) => {
  const chatId = msg.chat.id;
  try {
    for (const member of msg.new_chat_members) {
      const mention = member.username ? `@${member.username}` : `[${member.first_name}](tg://user?id=${member.id})`;
      const welcomeText = `🎉 Selamat datang ${mention} di grup *${msg.chat.title}*!\nSemoga betah dan ikut aktif ngobrol bareng 😄`;
      await bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    print.error(err, 'Welcome Message');
  }
});

process.on('SIGINT', () => {
  print.warn('Bot sedang dihentikan...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  print.warn('Bot sedang dihentikan...');
  bot.stopPolling();
  process.exit(0);
});

print.success("Script utama aktif! Bot siap menerima perintah.");