const axios = require("axios");

module.exports = {
    name: "news",
    description: "Get latest global headlines.",
    category: "general",
    async execute({ sock, jid, msg, args }) {
        const source = args[0]?.toLowerCase() || 'cnn'; // Default to CNN
        const validSources = ['cnn', 'merdeka', 'metro'];
        
        if (args[0] && !validSources.includes(source)) {
            return await sock.sendMessage(jid, { text: `❓ *Usage:* \`.news <cnn|merdeka|metro>\`\n_Defaulting to CNN..._` });
        }

        const endpoint = `https://api.nabees.online/api/news/${source}`;

        try {
            const { data } = await axios.get(endpoint);
            
            if (!data || !data.result || data.result.length === 0) {
                return await sock.sendMessage(jid, { text: `❌ No news found from *${source.toUpperCase()}* at the moment.` });
            }

            let response = `📰 *NEWS HEADLINES: ${source.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━\n\n`;
            data.result.slice(0, 5).forEach((news, i) => {
                response += `*#${i + 1}:* ${news.title}\n🔗 ${news.link || ""}\n\n`;
            });

            await sock.sendMessage(jid, { text: response + `━━━━━━━━━━━━━━━━━━━\n_Source: Nabees Online_` }, { quoted: msg });
        } catch (err) {
            console.error("News error:", err);
            await sock.sendMessage(jid, { text: "❌ Error fetching news headlines." });
        }
    }
};
