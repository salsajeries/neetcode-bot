import { Client, GatewayIntentBits } from "discord.js";
import axios from "axios";
import cron from "node-cron";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const CHANNEL_ID = "1341182816087707742"; // Discord channel ID
const FILE_PATH = "progress.json"; // Store last question & completed status

// Load progress from file
function loadProgress() {
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify({ index: 0, completed: {} }));
  }
  return JSON.parse(fs.readFileSync(FILE_PATH));
}

// Save progress to file
function saveProgress(data) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data));
}

async function fetchNeetCodeProblems() {
  try {
    const response = await axios.get("https://neetcode.io/api/problems");
    return response.data; // Adjust if the API response format is different
  } catch (error) {
    console.error("Error fetching problems:", error);
    return [];
  }
}

async function sendNextQuestion() {
  const problems = await fetchNeetCodeProblems();
  if (!problems.length) return;

  let progress = loadProgress();
  let lastIndex = progress.index;
  if (lastIndex >= problems.length) lastIndex = 0; // Restart if at the end

  const nextProblem = problems[lastIndex];
  progress.index = lastIndex + 1;
  saveProgress(progress);

  const message = `🌟 **Next NeetCode Problem** 🌟\n**${nextProblem.title}**\n🔗 ${nextProblem.link}\n\n✅ React to mark as completed!`;

  const channel = await client.channels.fetch(CHANNEL_ID);
  if (channel) {
    const sentMessage = await channel.send(message);
    await sentMessage.react("✅"); // Add the reaction for marking as completed

    // Save message ID to track completions
    progress.completed[sentMessage.id] = false;
    saveProgress(progress);
  }
}

// Handle reaction events
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return; // Ignore bot reactions

  const progress = loadProgress();
  if (reaction.emoji.name === "✅" && progress.completed.hasOwnProperty(reaction.message.id)) {
    progress.completed[reaction.message.id] = true;
    saveProgress(progress);

    // Edit the message to show completion status
    const updatedMessage = `${reaction.message.content}\n\n🎉 **Completed by ${user.username}!**`;
    await reaction.message.edit(updatedMessage);
  }
});

// Schedule daily at 8 AM UTC
cron.schedule("0 8 * * *", sendNextQuestion);

client.once("ready", () => {
  console.log(`✅ Bot is running as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
