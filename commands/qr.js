const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const os = require("os");

module.exports = {
    name: "qr",
    aliases: ["qrcode", "genqr", "makeqr"],
    description: "Generate a QR code from text or a URL.",
    category: "general",
    execute: async ({ sock, jid, args, msg }) => {
        const text = args.join(" ").trim();
        if (!text) {
            return await sock.sendMessage(jid, {
                text:
                    "❓ *Usage:* `.qr <text or URL>`\n\n" +
                    "*Examples:*\n" +
                    "• `.qr https://example.com`\n" +
                    "• `.qr Hello World`\n" +
                    "• `.qr +254700000000`"
            });
        }

        const tmpPath = path.join(os.tmpdir(), `nexus_qr_${Date.now()}.png`);

        try {
            await sock.sendMessage(jid, { text: "⏳ Generating QR code..." });

            await QRCode.toFile(tmpPath, text, {
                type: "png",
                width: 512,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#FFFFFF"
                }
            });

            const imageBuffer = fs.readFileSync(tmpPath);

            await sock.sendMessage(jid, {
                image: imageBuffer,
                caption:
                    `📱 *QR CODE GENERATED*\n\n` +
                    `📝 *Content:* ${text.length > 60 ? text.slice(0, 60) + "..." : text}\n\n` +
                    `_Scan with any QR reader • Nexus-1MD_`
            }, { quoted: msg });

        } catch (err) {
            console.error("QR generation error:", err);
            await sock.sendMessage(jid, { text: "❌ Failed to generate QR code. Please try again." });
        } finally {
            // Clean up temp file
            if (fs.existsSync(tmpPath)) {
                try { fs.unlinkSync(tmpPath); } catch (_) {}
            }
        }
    }
};
