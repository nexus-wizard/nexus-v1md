const axios = require("axios");

module.exports = {
    name: "facebook",
    aliases: ["fb", "fbdl"],
    description: "Download Facebook videos.",
    category: "download",
    async execute({ sock, jid, args, msg }) {
        const url = args[0];
        if (!url || !url.includes("facebook.com") && !url.includes("fb.watch")) {
            return await sock.sendMessage(jid, { text: "❓ *Usage:* `.fb <link>`" });
        }

        await sock.sendMessage(jid, { text: "⏳ *Processing Facebook video...*" });

        try {
            const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/facebook?apikey=gifted&url=${encodeURIComponent(url)}`);
            
            if (!data.result || !data.result.hd) {
                return await sock.sendMessage(jid, { text: "❌ Failed to fetch Facebook video. Ensure it is public." });
            }

            await sock.sendMessage(jid, { 
                video: { url: data.result.hd || data.result.sd },
                caption: "🔵 *Facebook Video Downloader*"
            }, { quoted: msg });
        } catch (err) {
            console.error("Facebook error:", err);
            await sock.sendMessage(jid, { text: "❌ Error connecting to Facebook service." });
        }
    }
};
