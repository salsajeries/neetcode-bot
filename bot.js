import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables from the .env file
dotenv.config();

// Create a new Discord client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const channelId = '1341182816087707742';

// File paths
const progressFilePath = 'progress.json';
const questionsFilePath = 'questions.txt';

// Function to read questions from the text file
const readQuestionsFromFile = () => {
  try {
    const data = fs.readFileSync(questionsFilePath, 'utf-8');
    return data.split('\n').filter(line => line.trim() !== ''); // Remove empty lines
  } catch (error) {
    console.error('Error reading file:', error);
    return [];
  }
};

// Function to read the current progress (question index) from the progress file
const readProgress = () => {
  try {
    if (fs.existsSync(progressFilePath)) {
      const data = fs.readFileSync(progressFilePath, 'utf-8');
      return JSON.parse(data); // Parse and return the current index
    } else {
      // If no progress file exists, create one with index 0
      fs.writeFileSync(progressFilePath, JSON.stringify({ currentIndex: 0 }));
      return { currentIndex: 0 };
    }
  } catch (error) {
    console.error('Error reading progress file:', error);
    return { currentIndex: 0 };
  }
};

// Function to update the progress (question index) in the progress file
const updateProgress = (index) => {
  try {
    fs.writeFileSync(progressFilePath, JSON.stringify({ currentIndex: index }));
  } catch (error) {
    console.error('Error writing to progress file:', error);
  }
};

// When the bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Send a message when the bot is online
  const channel = client.channels.cache.get(channelId);
  if (channel) {
    channel.send('Bot is now online and ready to answer!');
  } else {
    console.log('Channel not found!');
  }
});

// Listen for messages
client.on('messageCreate', (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // If the message is '!start', start sending the questions
  if (message.content.toLowerCase() === '!start') {
    const questions = readQuestionsFromFile();
    if (questions.length === 0) {
      message.reply('Sorry, no questions found!');
      return;
    }

    // Get the current question index
    const progress = readProgress();
    const currentIndex = progress.currentIndex;

    // Send the current question
    if (currentIndex < questions.length) {
      const question = questions[currentIndex];
      message.reply(question);
      // Update the progress to point to the next question
      updateProgress(currentIndex + 1);
    } else {
      message.reply('All questions have been completed!');
    }
  }

  // Optional: Handle !question to send the next question in case of multiple commands
  if (message.content.toLowerCase() === '!question') {
    const questions = readQuestionsFromFile();
    if (questions.length === 0) {
      message.reply('Sorry, no questions found!');
      return;
    }

    // Get the current question index
    const progress = readProgress();
    const currentIndex = progress.currentIndex;

    if (currentIndex < questions.length) {
      const question = questions[currentIndex];
      message.reply(question);
      // Update the progress to point to the next question
      updateProgress(currentIndex + 1);
    } else {
      message.reply('All questions have been completed!');
    }
  }
});

// Log in using the bot's token from the .env file
client.login(process.env.DISCORD_TOKEN);
