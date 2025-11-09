require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);

  // ✅ Only push valid slash commands
  if (command && command.data && typeof command.data.toJSON === 'function') {
    commands.push(command.data.toJSON());
    console.log(`📦 Loaded command: ${command.data.name}`);
  } else {
    console.warn(`⚠️ Skipping ${file} (missing or invalid .data export)`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Refreshing application (/) commands...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('✅ Successfully reloaded slash commands.');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();

