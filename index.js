require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection } = require("@discordjs/voice");
const ffmpeg = require("ffmpeg-static");
const axios = require("axios");

const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.once("ready", () => {
    console.log(`✅ Ingelogd als ${client.user.tag}!`);

    updateMusicStatus();
    setInterval(updateMusicStatus, 10000);
});

async function updateMusicStatus() {
    try {
        const response = await axios.get("https://player.tukker.fm/index.php?c=Tukker%20FM&_=1740953129700");
        const musicData = response.data;
        const artist = musicData.artist;
        const title = musicData.title;

        console.log(`luisterd naar: ${title} - ${artist}`)

        client.user.setActivity(`${title} - ${artist}`, { type: 2 });

    } catch (error) {
        console.error("Fout bij het ophalen van muziekstatus:", error);
    }
}

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, member, guild } = interaction;

    if (commandName === "radio") {
        if (!member.voice.channel) {
            return interaction.reply({ content: "🚫 Je moet in een voice channel zitten!", ephemeral: true });
        }

        const connection = joinVoiceChannel({
            channelId: member.voice.channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        const resource = createAudioResource(
            `https://stream.tukkerfm.nl/tukkerfm`,
            {
                inputType: AudioPlayerStatus.Playing,
                encoderArgs: [
                    '-analyzeduration', '0',
                    '-loglevel', '0',
                    '-f', 's16le',
                    '-ar', '48000',
                    '-ac', '2'
                ],
                ffmpegExecutable: ffmpeg,
            }
        );

        const player = createAudioPlayer();
        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
        });

        await interaction.reply("🎶 Tukker FM speelt nu in je voice channel!");
    }

    if (commandName === "stop") {
        const connection = getVoiceConnection(guild.id);
        if (connection) {
            connection.destroy();
            await interaction.reply("🛑 Radio gestopt.");
        } else {
            await interaction.reply("❌ De bot zit niet in een voice channel.");
        }
    }
});

client.login(TOKEN);
