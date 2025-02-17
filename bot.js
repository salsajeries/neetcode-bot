require('dotenv').config(); // Load environment variables from .env file
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

// Create a new Discord client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const channelId = '1341182816087707742';

// Function to read questions from the text file
const readQuestionsFromFile = () => {
  try {
    const data = fs.readFileSync('questions.txt', 'utf-8');
    return data.split('\n').filter(line => line.trim() !== ''); // Remove empty lines
  } catch (error) {
    console.error('Error reading file:', error);
    return []; // Return an empty array if there's an error
  }
};

// When the bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channel = client.channels.cache.get(channelId);
  if (channel) {
    channel.send('Bot is now online and ready to answer!');
  } else {
    console.log('Channel not found!');
  }
});

// Listen for messages
client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === '!question') {
    const questions = readQuestionsFromFile();
    if (questions.length > 0) {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      message.reply(randomQuestion);
    } else {
      message.reply('Sorry, I couldn\'t find any questions!');
    }
  }
});

// Log in using the bot's token from the .env file
client.login(process.env.DISCORD_TOKEN);
