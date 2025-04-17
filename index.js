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
const path = require('path');
const fs = require('fs');
const axios = require("axios");
const https = require("https");

// Bot Token (vervang door jouw token)
const TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_ID = "687727107912368190"; // ID van de hoofdbeheerder
const RADIO_URL = "https://stream.tukkerfm.nl/tukkerfm";

// Pad naar het copyright geluidje (plaats een mp3 bestand in je project)
const COPYRIGHT_SOUND_PATH = path.join(__dirname, 'assets', 'copyright.mp3');

// Controleren of het bestand bestaat
if (!fs.existsSync(COPYRIGHT_SOUND_PATH)) {
    console.error(`⚠️ Let op: Het bestand ${COPYRIGHT_SOUND_PATH} bestaat niet!`);
    console.error(`Maak een 'assets' map aan in je project en plaats daar een 'copyright.mp3' bestand in.`);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Houdt bij of de bot actief is in een kanaal
let isActive = false;
// Houdt bij in welke guilds de bot actief is
let activeGuilds = new Set();
// De audiospeler voor de radio
let radioPlayer = null;

client.once("ready", () => {
    console.log(`✅ Ingelogd als ${client.user.tag}!`);

    updateMusicStatus();
    setInterval(updateMusicStatus, 10000);
    
    // Elke minuut controleren of het tijd is om het copyright geluidje af te spelen
    setInterval(checkTimeForCopyrightSound, 60000);
});

// Functie om te controleren of het tijd is voor het copyright geluidje (elk uur)
function checkTimeForCopyrightSound() {
    const now = new Date();
    
    // Als het precies een heel uur is en de bot is actief
    if (now.getMinutes() === 0 && isActive) {
        console.log(`🕒 Het is ${now.getHours()}:00 uur - speel copyright geluidje af`);
        
        // Speel het copyright geluidje af in alle actieve guilds
        activeGuilds.forEach(guildId => {
            playCopyrightSound(guildId);
        });
    }
}

// Functie om het copyright geluidje af te spelen met fade in/out effecten
async function playCopyrightSound(guildId) {
    try {
        const connection = getVoiceConnection(guildId);
        
        if (!connection) {
            console.log(`❌ Geen verbinding in guild ${guildId}`);
            return;
        }
        
        // Fade out van de radio (als de radioPlayer actief is)
        if (radioPlayer && radioPlayer.state.status === AudioPlayerStatus.Playing) {
            console.log("🔊 Start fade out van de radio (2 seconden)...");
            
            // Controleer of de resource inlineVolume heeft
            const radioResource = radioPlayer.state.resource;
            if (radioResource && radioResource.volume) {
                // Fade out in stappen gedurende 2 seconden
                let volume = 1.0; // Start bij 100%
                const fadeSteps = 20; // 20 stappen voor vloeiendere fade
                const stepSize = 1.0 / fadeSteps;
                const stepTime = 2000 / fadeSteps; // 2000ms verdeeld over de stappen
                
                const fadeOutInterval = setInterval(() => {
                    volume -= stepSize; // Verlaag met stepSize (5% per stap)
                    
                    if (volume <= 0) {
                        clearInterval(fadeOutInterval);
                        console.log("🔇 Fade out compleet, pauzeer radio");
                        radioPlayer.pause();
                        playCopyrightWithFadeIn(connection);
                    } else {
                        radioResource.volume.setVolume(volume);
                    }
                }, stepTime); // Elke stepTime (100ms), totaal 2 seconden fade
            } else {
                // Als volume aanpassen niet mogelijk is, gewoon direct pauzeren
                console.log("⚠️ Kan volume niet aanpassen, directe pauze");
                radioPlayer.pause();
                playCopyrightWithFadeIn(connection);
            }
        } else {
            // Als er geen radioPlayer is, direct het copyright geluidje afspelen
            playCopyrightWithFadeIn(connection);
        }
        
    } catch (error) {
        console.error("❌ Fout bij het afspelen van het copyright geluidje:", error);
        
        // Hervat de radiostream bij een fout
        if (radioPlayer) {
            radioPlayer.unpause();
        }
    }
}

// Functie om het copyright geluidje af te spelen met fade in
function playCopyrightWithFadeIn(connection) {
    // Maak een tijdelijke speler voor het copyright geluidje
    const copyrightPlayer = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });
    
    // Maak een resource van het geluidje met inlineVolume zodat we kunnen faden
    const resource = createAudioResource(COPYRIGHT_SOUND_PATH, { 
        inlineVolume: true 
    });
    
    // Start met volume op 0
    resource.volume.setVolume(0);
    
    // Speel het geluidje af
    copyrightPlayer.play(resource);
    connection.subscribe(copyrightPlayer);
    
    // Direct op vol (hoog) volume zetten, geen fade-in voor het copyright geluidje
    resource.volume.setVolume(10.0);
    console.log("🔊 Copyright geluidje op extra hoog volume (10x)");
    
    // Luister naar het einde van het geluidje
    copyrightPlayer.on(AudioPlayerStatus.Idle, () => {
        console.log("✅ Copyright geluidje afgespeeld, hervat de radio met 2 seconden fade-in");
        
        // Hervat de radiostream met fade-in effect
        if (radioPlayer) {
            // Reset het volume van de radio naar 0 voor we beginnen met faden
            const radioResource = radioPlayer.state.resource;
            if (radioResource && radioResource.volume) {
                radioResource.volume.setVolume(0);
            }
            
            // Hervat de radiostream
            radioPlayer.unpause();
            connection.subscribe(radioPlayer);
            
            // Begin met fade-in als de resource volume ondersteunt (2 seconden fade-in)
            if (radioResource && radioResource.volume) {
                let radioVolume = 0;
                const fadeSteps = 20; // 20 stappen voor vloeiendere fade
                const stepSize = 1.0 / fadeSteps;
                const stepTime = 2000 / fadeSteps; // 2000ms verdeeld over de stappen
                
                const fadeInRadioInterval = setInterval(() => {
                    radioVolume += stepSize; // Verhoog met stepSize (5% per stap)
                    
                    if (radioVolume >= 1.0) {
                        clearInterval(fadeInRadioInterval);
                        console.log("🔊 Radio terug op vol volume");
                    } else {
                        radioResource.volume.setVolume(radioVolume);
                    }
                }, stepTime); // Elke stepTime, totaal 2 seconden fade
            }
        }
    });
}

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

        // Maak de globale radiospeler als deze nog niet bestaat
        radioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });

        function playStream() {
            console.log("🔄 Bezig met laden van de stream...");

            const audioStream = https.get(RADIO_URL, (res) => {
                // Zorg ervoor dat we inlineVolume aanzetten voor fade effecten
                const resource = createAudioResource(res, { 
                    inlineVolume: true 
                });

                if (resource) {
                    console.log("✅ Nieuwe audio resource aangemaakt.");
                    // Begin standaard op vol volume
                    resource.volume.setVolume(1.0);
                    radioPlayer.play(resource);
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

        radioPlayer.on(AudioPlayerStatus.Playing, () => {
            console.log("🎶 Audio speler is gestart!");
            isActive = true;
            activeGuilds.add(guild.id);
        });

        radioPlayer.on(AudioPlayerStatus.Idle, () => {
            console.log("🛑 Audio speler is gestopt. Probeer opnieuw te starten na een korte pauze...");
            setTimeout(playStream, 2000); // Wacht 2 seconden voor herstart
        });

        radioPlayer.on("error", (error) => {
            console.error("❌ Fout met de audio speler:", error.message);
            console.log("🔄 Probeer opnieuw te starten...");
            setTimeout(playStream, 5000); // Voorkom snelle herstarts en wacht 5 sec
        });

        playStream(); // Eerste keer starten
        connection.subscribe(radioPlayer);

        await interaction.reply("🎶 Tukker FM speelt nu in je voice channel!");
    }

    if (commandName === "stop") {
        const connection = getVoiceConnection(guild.id);
        if (connection) {
            connection.destroy();
            isActive = false;
            activeGuilds.delete(guild.id);
            await interaction.reply("🛑 Radio gestopt.");
        } else {
            await interaction.reply("❌ De bot zit niet in een voice channel.");
        }
    }

    if (commandName === "copyright") {
        // Controleer of de gebruiker de beheerder is
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({ 
                content: "🚫 Alleen de hoofdbeheerder kan dit commando gebruiken!", 
                ephemeral: true 
            });
        }
        
        // Controleer of de bot in een voice channel zit
        const connection = getVoiceConnection(guild.id);
        if (!connection) {
            return interaction.reply({ 
                content: "❌ De bot moet in een voice channel zitten om het copyright geluidje af te spelen.",
                ephemeral: true
            });
        }
        
        // Speel het copyright geluidje af
        await interaction.reply("🔊 Het copyright geluidje wordt afgespeeld...");
        playCopyrightSound(guild.id);
    }
});

client.login(TOKEN);