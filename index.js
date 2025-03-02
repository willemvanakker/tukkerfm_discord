require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    getVoiceConnection, 
    AudioPlayerStatus, 
    NoSubscriberBehavior 
} = require("@discordjs/voice");
const prism = require("prism-media"); // Betere audioverwerking met prism-media
const https = require("https");
const axios = require("axios");

// Bot Token (vervang door jouw token)
const TOKEN = process.env.DISCORD_TOKEN;

const RADIO_URL = "https://stream.tukkerfm.nl/tukkerfm";

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

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });

        function playStream() {
            console.log("🔄 Bezig met laden van de stream...");

            const audioStream = https.get(RADIO_URL, (res) => {
                const resource = createAudioResource(res, { inlineVolume: true });

                if (resource) {
                    console.log("✅ Nieuwe audio resource aangemaakt.");
                    player.play(resource);
                } else {
                    console.error("❌ Fout bij het aanmaken van de audio resource!");
                    setTimeout(playStream, 5000); // Wacht 5 sec en probeer opnieuw
                }
            });

            audioStream.on("error", (error) => {
                console.error("❌ Fout bij het laden van de stream:", error.message);
                setTimeout(playStream, 5000); // Probeer opnieuw na 5 seconden
            });
        }

        player.on(AudioPlayerStatus.Playing, () => {
            console.log("🎶 Audio speler is gestart!");
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log("🛑 Audio speler is gestopt. Probeer opnieuw te starten na een korte pauze...");
            setTimeout(playStream, 2000); // Wacht 2 seconden voor herstart
        });

        player.on("error", (error) => {
            console.error("❌ Fout met de audio speler:", error.message);
            console.log("🔄 Probeer opnieuw te starten...");
            setTimeout(playStream, 5000); // Voorkom snelle herstarts en wacht 5 sec
        });

        playStream(); // Eerste keer starten
        connection.subscribe(player);

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
