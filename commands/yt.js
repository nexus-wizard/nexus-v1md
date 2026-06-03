const axios = require("axios");

module.exports = {
    name: "yt",
    aliases: ["youtube", "video"],
    description: "Download YouTube videos.",
    category: "download",
    async execute({ sock, jid, args, msg }) {
        const url = args[0];
        if (!url || !url.includes("youtube.com") && !url.includes("youtu.be")) {
            return await sock.sendMessage(jid, { text: "❓ *Usage:* `.yt <link>`" });
        }

        await sock.sendMessage(jid, { text: "⏳ *Processing your video...* Please wait." });

        try {
            const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/ytmp4?apikey=gifted&url=${encodeURIComponent(url)}`);
            
            if (!data.result || !data.result.download_url) {
                return await sock.sendMessage(jid, { text: "❌ Failed to download. The video might be private or restricted." });
            }

            await sock.sendMessage(jid, { 
                video: { url: data.result.download_url },
                caption: `🎥 *YouTube Downloader*\n\n✨ *Title:* ${data.result.title}\n📦 *Format:* MP4\n\n_Nexus-1MD • Media Delivery_`
            }, { quoted: msg });
        } catch (err) {
            console.error("YouTube error:", err);
            await sock.sendMessage(jid, { text: "❌ Connection error while downloading video." });
        }
    }
};
