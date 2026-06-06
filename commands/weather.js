const axios = require("axios");

module.exports = {
    name: "weather",
    description: "Check current weather for a city.",
    category: "general",
    async execute({ sock, jid, args, msg }) {
        const city = args.join(" ");
        if (!city) return await sock.sendMessage(jid, { text: "❓ *Usage:* `.weather <city>`" });

        try {
            const { data } = await axios.get(`https://api.nabees.online/api/weather?city=${encodeURIComponent(city)}`);
            
            if (!data || !data.result) return await sock.sendMessage(jid, { text: "❌ City not found." });

            const w = data.result;
            const weatherText = `🌤️ *WEATHER: ${w.location || city}*\n━━━━━━━━━━━━━━━━━━━\n` +
                                `🌡️ *Temp:* ${w.temp} °C\n` +
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
