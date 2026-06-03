const axios = require("axios");

module.exports = {
    name: "weather",
    description: "Check current weather for a city.",
    category: "general",
    async execute({ sock, jid, args, msg }) {
        const city = args.join(" ");
        if (!city) return await sock.sendMessage(jid, { text: "❓ *Usage:* `.weather <city>`" });

        try {
            const { data } = await axios.get(`https://api.giftedtech.my.id/api/search/weather?apikey=gifted&city=${encodeURIComponent(city)}`);
            
            if (!data.results) return await sock.sendMessage(jid, { text: "❌ City not found." });

            const w = data.results;
            const weatherText = `🌤️ *WEATHER: ${w.location}*\n\n` +
                                `🌡️ *Temp:* ${w.temperature}\n` +
                                `🌥️ *Condition:* ${w.condition}\n` +
                                `💧 *Humidity:* ${w.humidity}\n` +
                                `💨 *Wind:* ${w.wind}\n\n` +
                                `_Stay safe and plan accordingly!_`;

            await sock.sendMessage(jid, { text: weatherText }, { quoted: msg });
        } catch (err) {
            console.error("Weather error:", err);
            await sock.sendMessage(jid, { text: "❌ Error fetching weather data." });
        }
    }
};
