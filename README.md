# TukkerFM Discord Bot

Een eenvoudige Discord-bot die Tukker FM afspeelt in een voice channel. Bevat slash-commands om de radio te starten en te stoppen.

## 📌 Functies
- `/radio` - Speel Tukker FM af in een voice channel
- `/stop` - Stop de radio en verlaat het voice channel

## 🔧 Installatie

### Vereisten
- [Node.js](https://nodejs.org/) (versie 16 of hoger)
- [Discord bot token](https://discord.com/developers/applications)

### Stap 1: Clone de repository
```sh
$ git clone https://github.com/jouwgebruikersnaam/tukkerfm-discord-bot.git
$ cd tukkerfm-discord-bot
```

### Stap 2: Installeer dependencies
```sh
$ npm install
```

### Stap 3: Configureer `.env`
Maak een `.env` bestand in de root van je project en voeg de volgende variabelen toe:
```env
DISCORD_TOKEN=JOUW_BOT_TOKEN
CLIENT_ID=JOUW_CLIENT_ID
```
**Let op:** Deel je token nooit openbaar!

### Stap 4: Registreer Slash Commands
```sh
$ node register-commands.js
```

### Stap 5: Start de bot
```sh
$ node bot.js
```

## 🛠 Configuratie
Je kunt de bot verder aanpassen door de code in `bot.js` te wijzigen.

## 🏆 Contributies
Pull requests zijn welkom! Voor grote wijzigingen, open eerst een issue om de wijziging te bespreken.

## 📜 Licentie
Deze bot wordt uitgebracht onder de MIT-licentie. Zie `LICENSE` voor meer details.

---

### `.env` Bestand
```env
DISCORD_TOKEN=JOUW_BOT_TOKEN
CLIENT_ID=JOUW_CLIENT_ID
```

