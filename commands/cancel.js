const { SlashCommandBuilder } = require('discord.js');
const tidalCommand = require('./tidal.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cancel')
        .setDescription('Cancel a Tidal download (by index, all, or your own)')
        .addIntegerOption(option =>
            option.setName('index')
                .setDescription('Cancel a specific queued item (index from /queue)')
        )
        .addBooleanOption(option =>
            option.setName('all')
                .setDescription('Cancel ALL downloads')
        ),

    async execute(interaction) {
        const index = interaction.options.getInteger('index');
        const cancelAll = interaction.options.getBoolean('all') || false;
        const user = interaction.user.tag;

        const result = tidalCommand.cancelDownload(user, { cancelAll, index });
        await interaction.reply(result);
    },
};
