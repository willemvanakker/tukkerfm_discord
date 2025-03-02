const { REST, Routes, SlashCommandBuilder } = require("discord.js");

// Vervang deze gegevens door die van jouw bot
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
    new SlashCommandBuilder()
        .setName("radio")
        .setDescription("Speel Tukker FM af in je voice channel!"),
    new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop de radio en verlaat het voice channel."),
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log("⏳ Bezig met registreren van slash commands...");
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log("✅ Slash commands succesvol geregistreerd!");
    } catch (error) {
        console.error(error);
    }
})();
