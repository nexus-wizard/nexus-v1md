const axios = require("axios");

module.exports = {
    name: "translate",
    aliases: ["tr"],
    description: "Translate text to English (default).",
    category: "general",
    async execute({ sock, jid, args, msg }) {
        const textToTranslate = args.join(" ");
        if (!textToTranslate) return await sock.sendMessage(jid, { text: "❓ *Usage:* `.translate <text>`" });

        try {
            // Using a public translation API (defaults to English target)
            const { data } = await axios.get(`https://api.giftedtech.my.id/api/tools/translate?apikey=gifted&text=${encodeURIComponent(textToTranslate)}&to=en`);
            
            if (!data.results) return await sock.sendMessage(jid, { text: "❌ Translation failed." });

            const translationText = `🌍 *TRANSLATION*\n\n` +
                                    `*Original:* ${textToTranslate}\n` +
                                    `*English:* ${data.results}`;

            await sock.sendMessage(jid, { text: translationText }, { quoted: msg });
        } catch (err) {
            console.error("Translate error:", err);
            await sock.sendMessage(jid, { text: "❌ Error connecting to translation service." });
        }
    }
};
