const { SlashCommandBuilder } = require('discord.js');
const tidalCommand = require('./tidal.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current Tidal download queue'),

    async execute(interaction) {
        const { downloadQueue, isDownloading, currentDownload } = tidalCommand.getQueue();

        if (!isDownloading && downloadQueue.length === 0) {
            await interaction.reply('🕳️ No active or pending downloads.');
            return;
        }

        let message = '';

        if (isDownloading && currentDownload) {
            message += `🎧 **Currently downloading:** ${currentDownload.url}\n👤 Requested by: ${currentDownload.user}\n\n`;
        }

        if (downloadQueue.length > 0) {
            message += '**🪣 In Queue:**\n';
            downloadQueue.forEach((item, i) => {
                message += `#${i + 1} — ${item.url} (by ${item.user})\n`;
            });
        }

        await interaction.reply(message);
    },
};
