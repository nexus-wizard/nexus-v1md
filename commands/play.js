const axios = require("axios");

module.exports = {
    name: "play",
    aliases: ["song", "music"],
    description: "Search and download music.",
    category: "download",
    async execute({ sock, jid, args, msg }) {
        const query = args.join(" ");
        if (!query) return await sock.sendMessage(jid, { text: "❓ *Usage:* `.play <song name>`" });

        await sock.sendMessage(jid, { text: `🎵 *Searching for:* ${query}...` });

        try {
            // Using a public music search/dl API
            const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/play?apikey=gifted&query=${encodeURIComponent(query)}`);
            
            if (!data.result || !data.result.download_url) {
                return await sock.sendMessage(jid, { text: "❌ Failed to find the song. Try being more specific." });
            }

            await sock.sendMessage(jid, { 
                audio: { url: data.result.download_url },
                mimetype: "audio/mpeg",
                ptt: false
            }, { quoted: msg });
            
            await sock.sendMessage(jid, { text: `✅ *Playing:* ${data.result.title}` });
        } catch (err) {
            console.error("Play error:", err);
            await sock.sendMessage(jid, { text: "❌ Connection error while searching for music." });
        }
    }
};
