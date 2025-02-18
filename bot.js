import pkg from 'discord.js';
const { Client, GatewayIntentBits, Partials } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import cron from 'node-cron';

// Load environment variables from .env file
dotenv.config();

// Create a new Discord client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,    
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reactions
  ],
});

const channelId = '1341182816087707742';

// File paths
const progressFilePath = 'progress.json';
const questionsFilePath = 'questions.txt';

// Variable to store the cron job
let scheduledJob;

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

// Function to get the color based on difficulty
const getColorByDifficulty = (difficulty) => {
  switch (difficulty.toLowerCase().trim()) {
    case 'easy':
      return 0x00ff00; // Green
    case 'medium':
      return 0xffff00; // Yellow
    case 'hard':
      return 0xff0000; // Red
    default:
      return 0x0099ff; // Default color
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

  // Cron job to automatically send the next question at 8 AM every day
  scheduledJob = cron.schedule('0 8 * * *', () => {
    const channel = client.channels.cache.get(channelId);
    if (channel) {
      const questions = readQuestionsFromFile();
      if (questions.length === 0) {
        console.log('No questions found!');
        return;
      }

      const progress = readProgress();
      const currentIndex = progress.currentIndex;

      if (currentIndex < questions.length) {
        const questionData = questions[currentIndex].split(' - ');
        const question = questionData[0];
        const difficulty = questionData[1];
        const color = getColorByDifficulty(difficulty);
        sendQuestionWithEmbed(channel, question, difficulty, color);
        updateProgress(currentIndex + 1); // Update the progress for the next question
      } else {
        console.log('All questions have been completed!');
      }
    } else {
      console.log('Channel not found!');
    }
  });
});

// Function to send question with styled embed
const sendQuestionWithEmbed = async (channel, question, difficulty, color) => {
  const currentDate = new Date().toLocaleDateString(); // Format current date

  // Create the embed
  const embed = {
    color: color,
    title: `**Question:** ${question}`,
    description: `Current Date: ${currentDate}`,
    fields: [
      {
        name: `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
        value: "",
        inline: false,
      },
      {
        name: 'Completed By:',
        value: 'React with ✅ to mark as completed!',
        inline: false,
      },
    ],
    timestamp: new Date(),
  };

  // Send the embed message
  const sentMessage = await channel.send({
    embeds: [embed],
  });

  // Add a checkmark emoji reaction
  await sentMessage.react('✅');
};

// Listen for messages
client.on('messageCreate', (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // If the message is '!start', reset progress and start sending the questions
  if (message.content.toLowerCase() === '!start') {
    const questions = readQuestionsFromFile();
    if (questions.length === 0) {
      message.reply('Sorry, no questions found!');
      return;
    }

    // Reset progress to point to the first question
    updateProgress(0);
    
    // Send the first question
    const questionData = questions[0].split(' - ');
    const question = questionData[0];
    const difficulty = questionData[1];
    const color = getColorByDifficulty(difficulty);
    sendQuestionWithEmbed(message.channel, question, difficulty, color);
  }

  // If the message is '!restart', reset the index to the beginning
  if (message.content.toLowerCase() === '!restart') {
    const questions = readQuestionsFromFile();
    if (questions.length === 0) {
      message.reply('Sorry, no questions found!');
      return;
    }

    // Reset the index to 0 (start from the first question)
    updateProgress(0);

    // Send the first question
    message.reply('Questions have been reset. Starting from the first question.');
    const questionData = questions[0].split(' - ');
    const question = questionData[0];
    const difficulty = questionData[1];
    const color = getColorByDifficulty(difficulty);
    sendQuestionWithEmbed(message.channel, question, difficulty, color);
  }

  // If the message is '!next', send the next question
  if (message.content.toLowerCase() === '!next') {
    const questions = readQuestionsFromFile();
    if (questions.length === 0) {
      message.reply('Sorry, no questions found!');
      return;
    }

    const progress = readProgress();
    const currentIndex = progress.currentIndex + 1; // Move to the next question

    if (currentIndex < questions.length) {
      const questionData = questions[currentIndex].split(' - ');
      const question = questionData[0];
      const difficulty = questionData[1];
      const color = getColorByDifficulty(difficulty);
      updateProgress(currentIndex);
      sendQuestionWithEmbed(message.channel, question, difficulty, color);
    } else {
      message.reply('No more questions available!');
    }
  }

  // If the message is '!back', send the previous question
  if (message.content.toLowerCase() === '!back') {
    const questions = readQuestionsFromFile();
    if (questions.length === 0) {
      message.reply('Sorry, no questions found!');
      return;
    }

    const progress = readProgress();
    const currentIndex = progress.currentIndex - 1; // Move to the previous question

    if (currentIndex >= 0) {
      const questionData = questions[currentIndex].split(' - ');
      const question = questionData[0];
      const difficulty = questionData[1];
      const color = getColorByDifficulty(difficulty);
      updateProgress(currentIndex);
      sendQuestionWithEmbed(message.channel, question, difficulty, color);
    } else {
      message.reply('You are already at the first question!');
    }
  }

  // If the message is '!stop', stop the cron job
  if (message.content.toLowerCase() === '!stop') {
    // Stop the cron job
    if (scheduledJob) {
      scheduledJob.stop();
      message.reply('The daily questions have been stopped.');
    } else {
      message.reply('No scheduled job was found.');
    }
  }
});

// Listen for reactions to track completion
client.on('messageReactionAdd', async (reaction, user) => {
  // Check if the reaction is the checkmark emoji
  if (reaction.emoji.name === '✅') {
    const channel = reaction.message.channel;

    // Retrieve the users who have reacted
    const usersReacted = await reaction.users.fetch();
    const userNames = usersReacted
      .filter((user) => !user.bot)
      .map((user) => user.username)
      .join(', ') || 'React with ✅ to mark as completed!';

    // Update the embed with the list of users who reacted
    const embed = reaction.message.embeds[0];
    embed.fields[1].value = `${userNames}`;

    // Edit the original message to include the updated embed
    await reaction.message.edit({ embeds: [embed] });
  }
});

// Listen for reaction removal to update the completion list
client.on('messageReactionRemove', async (reaction, user) => {
  // Check if the reaction is the checkmark emoji
  if (reaction.emoji.name === '✅') {
    const channel = reaction.message.channel;

    // Retrieve the users who have reacted
    const usersReacted = await reaction.users.fetch();
    const userNames = usersReacted
      .filter((user) => !user.bot)
      .map((user) => user.username)
      .join(', ') || 'React with ✅ to mark as completed!';

    // Update the embed with the list of users who reacted
    const embed = reaction.message.embeds[0];
    embed.fields[1].value = `${userNames}`;

    // Edit the original message to include the updated embed
    await reaction.message.edit({ embeds: [embed] });
  }
});

// Log in using the bot's token from the .env file
client.login(process.env.DISCORD_TOKEN);
