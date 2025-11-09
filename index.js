require('dotenv').config();
const fs = require('fs');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.commands = new Collection();

// ✅ Safely load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);

  if (command && command.data && command.data.name) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.warn(`⚠️ Skipping ${file} (missing or invalid .data export)`);
  }
}

client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);


client.on('interactionCreate', async interaction => {
  // Slash command handling
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ There was an error executing that command.', ephemeral: true });
    }
  }

  // Handle selection from Google search results
  if (interaction.isStringSelectMenu() && interaction.customId === 'tidal_google_select') {
    await interaction.deferReply();
    const tidalSearch = client.commands.get('tidalsearch');
    const tidalCmd = client.commands.get('tidal');
    if (!tidalSearch || !tidalCmd) {
      await interaction.editReply('⚠️ Missing commands.');
      return;
    }

    const results = tidalSearch.getSearchResults(interaction.user.id);
    if (!results) {
      await interaction.editReply('⚠️ Search expired. Please use /tidalsearch again.');
      return;
    }

    const selectedIndex = parseInt(interaction.values[0], 10);
    const selected = results[selectedIndex];
    tidalSearch.clearSearchResults(interaction.user.id);

    // Forward link to /tidal download command
    const fakeInteraction = {
      options: {
        getString: () => selected.link,
      },
      reply: async (...args) => interaction.followUp(...args),
      followUp: async (...args) => interaction.followUp(...args),
      user: interaction.user,
    };

    try {
      await tidalCmd.execute(fakeInteraction);
      await interaction.followUp(`✅ Queued **${selected.title}** (${selected.type})`);
    } catch (err) {
      console.error('Error forwarding to /tidal:', err);
      await interaction.followUp('❌ Error adding selection to queue.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

