const { SlashCommandBuilder } = require('discord.js');
const { spawn } = require('child_process');

let downloadQueue = [];
let isDownloading = false;
let currentDownload = null; // { interaction, url, user, process }

async function startNextDownload() {
    if (isDownloading || downloadQueue.length === 0) return;

    isDownloading = true;
    const current = downloadQueue.shift();
    currentDownload = current;

    const { interaction, url, user } = current;
    const message = await interaction.followUp(`🎵 Starting download for: ${url}`);

    const process = spawn('/home/dave/.local/bin/tidal-dl-ng', ['dl', url]);
    currentDownload.process = process;

    let outputBuffer = '';
    let lastEdit = Date.now();

    process.stdout.on('data', async (data) => {
        outputBuffer += data.toString();
        if (Date.now() - lastEdit > 3000) {
            const cleanOutput = outputBuffer.split('\n').slice(-8).join('\n');
            try {
                await message.edit(`🎧 **Downloading:** ${url}\n\`\`\`\n${cleanOutput}\n\`\`\``);
            } catch (e) {
                console.error('Edit error:', e.message);
            }
            lastEdit = Date.now();
        }
    });

    process.stderr.on('data', (data) => console.error(`stderr: ${data}`));

    process.on('close', async (code) => {
        if (code === 0) {
            await message.edit(`✅ Finished downloading: ${url}`);
        } else {
            await message.edit(`❌ Download failed or canceled: ${url}`);
        }

        isDownloading = false;
        currentDownload = null;
        startNextDownload();
    });
}

function cancelDownload(userTag, options = {}) {
    const { cancelAll = false, index = null } = options;
    let canceled = [];

    if (currentDownload) {
        if (cancelAll || currentDownload.user === userTag) {
            try {
                currentDownload.process.kill('SIGTERM');
                canceled.push(`🛑 Canceled current download: ${currentDownload.url}`);
            } catch (e) {
                console.error(e);
            }
        }
    }

    if (cancelAll) {
        const count = downloadQueue.length;
        downloadQueue = [];
        canceled.push(`🧹 Cleared ${count} queued download(s).`);
        return canceled.join('\n');
    }

    if (index !== null) {
        const i = index - 1;
        if (i >= 0 && i < downloadQueue.length) {
            const removed = downloadQueue.splice(i, 1)[0];
            canceled.push(`🗑️ Removed queued download #${index}: ${removed.url} (by ${removed.user})`);
        } else {
            canceled.push(`⚠️ Invalid queue index: ${index}`);
        }
        return canceled.join('\n');
    }

    const beforeLength = downloadQueue.length;
    downloadQueue = downloadQueue.filter(item => {
        if (item.user === userTag) {
            canceled.push(`🗑️ Removed from queue: ${item.url}`);
            return false;
        }
        return true;
    });

    if (canceled.length === 0) canceled.push('⚠️ No matching downloads found to cancel.');
    return canceled.join('\n');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tidal')
        .setDescription('Download a track/album/playlist from Tidal')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Tidal link to download')
                .setRequired(true)
        ),

    async execute(interaction) {
        const url = interaction.options.getString('url');
        const user = interaction.user.tag;

        await interaction.reply(`🔄 Added to download queue: ${url}`);
        downloadQueue.push({ interaction, url, user });

        if (!isDownloading) {
            startNextDownload();
        } else {
            const position = downloadQueue.length;
            await interaction.followUp(`⏳ You're #${position} in the queue.`);
        }
    },

    getQueue() {
        return { downloadQueue, isDownloading, currentDownload };
    },
    cancelDownload,
};
