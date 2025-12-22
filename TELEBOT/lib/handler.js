const print = require('./print');

module.exports = (bot) => {
  bot.runtime = () => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  };
  
  bot.on('callback_query', async (q) => {
    try {
      const commandName = q.data;
      const msg = q.message;

      await bot.answerCallbackQuery(q.id);

      const command = bot.commands.get(commandName);

      if (command) {
        print.info(`Menjalankan callback command: ${command.name} | User: ${q.from.username || q.from.id}`);
        await command.execute(bot, msg, []);
      } else {
        print.warn(`Callback data diterima, tapi bukan perintah: ${commandName}`);
      }
    } catch (err) {
      print.error(err, 'Callback Handler');
      await bot.sendMessage(q.message.chat.id, '❌ Terjadi kesalahan saat memproses tombol.');
    }
  });
};