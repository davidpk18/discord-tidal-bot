const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require('discord.js');
const { googleTidalSearch } = require('./googleSearch');
const { fetch } = require('undici');

const searchResults = new Map(); // user.id → results[]

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tidalsearch')
    .setDescription('Search Tidal content via Google (album/track/playlist)')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('What to search for on Tidal')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString('query');

    try {
      const results = await googleTidalSearch(query, 5);
      if (!results.length)
        return interaction.editReply('❌ No results found on Tidal.');

      // Save results in memory for this user
      searchResults.set(interaction.user.id, results);

      // Build menu options with emoji for type
      const options = results.map((r, i) => {
        const type = (r.type || '').toUpperCase();
        let typeEmoji = '📀'; // default
        if (type === 'TRACK') typeEmoji = '🎵';
        else if (type === 'ALBUM') typeEmoji = '💿';
        else if (type === 'PLAYLIST') typeEmoji = '📀';

        return {
          label: r.title.substring(0, 100),
          description: `${typeEmoji} ${r.link.replace('https://tidal.com/', '')}`.substring(0, 100),
          value: i.toString(),
        };
      });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('tidal_google_select')
          .setPlaceholder('Select which Tidal item to download')
          .addOptions(options)
      );

      // Build embed
      const embed = new EmbedBuilder()
        .setTitle('🎧 Tidal Search Results')
        .setDescription(
          results
            .map((r, i) => {
              const type = (r.type || '').toUpperCase();
              let typeEmoji = '📀';
              if (type === 'TRACK') typeEmoji = '🎵';
              else if (type === 'ALBUM') typeEmoji = '💿';
              else if (type === 'PLAYLIST') typeEmoji = '📀';
              return `**${i + 1}.** [${r.title}](${r.link}) ${typeEmoji}`;
            })
            .join('\n')
        )
        .setColor('#1DB954')
        .setThumbnail(results[0].thumbnail || 'https://via.placeholder.com/128?text=Tidal')
        .setFooter({ text: `Query: ${query}` });

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('tidalsearch error:', err);
      await interaction.editReply('⚠️ Error searching Tidal.');
    }
  },

  // Helper so index.js can access stored results
  getSearchResults(userId) {
    return searchResults.get(userId);
  },
  clearSearchResults(userId) {
    searchResults.delete(userId);
  },
};

