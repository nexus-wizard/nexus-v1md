/**
 * Shared AI helper for Nexus-1MD
 * Uses Pollinations AI — free, no API key required.
 *
 * Text API:  GET https://text.pollinations.ai/{prompt}?model=openai&system={system}
 * Image API: GET https://image.pollinations.ai/prompt/{prompt}?width=512&height=512&nologo=true
 */

const axios = require("axios");
const { openaiKey, groqKey } = require("../config");

/**
 * Ask a text question with an optional system persona.
 * @param {string} userPrompt  - The user's input
 * @param {string} [system]    - Optional system/persona instruction
 * @returns {Promise<string>}  - The AI's response text
 */
async function askAI(userPrompt, system = "You are Nexus, a helpful, friendly WhatsApp assistant.") {
    // 1. Try Groq (Primary for speed)
    if (groqKey) {
        try {
            const { data } = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
                model: "llama3-8b-8192",
                messages: [{ role: "system", content: system }, { role: "user", content: userPrompt }]
            }, { 
                headers: { "Authorization": `Bearer ${groqKey}` },
                timeout: 10000
            });
            return data.choices[0].message.content.trim();
        } catch (e) {
            console.error("Groq AI failed:", e.message);
        }
    }

    // 2. Try OpenAI (Secondary)
    if (openaiKey) {
        try {
            const { data } = await axios.post("https://api.openai.com/v1/chat/completions", {
                model: "gpt-3.5-turbo",
                messages: [{ role: "system", content: system }, { role: "user", content: userPrompt }]
            }, { 
                headers: { "Authorization": `Bearer ${openaiKey}` },
                timeout: 10000
            });
            return data.choices[0].message.content.trim();
        } catch (e) {
            console.error("OpenAI API Primary failed:", e.message);
        }
    }

    // 2. Fallback to Pollinations AI with multiple models and retries
    const models = ["openai", "mistral", "llama"];
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt++) {
        for (const model of models) {
            try {
                const url = `https://text.pollinations.ai/${encodeURIComponent(userPrompt)}` +
                            `?model=${model}&system=${encodeURIComponent(system)}&seed=${Math.floor(Math.random() * 999999)}`;

                const { data } = await axios.get(url, { 
                    timeout: 20000, 
                    responseType: "text",
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });

                if (data && typeof data === "string" && data.length > 3 && !data.includes("error")) {
                    return data.trim();
                }
            } catch (err) {
                lastError = err;
                if (err.response?.status === 429) {
                    await delay(1000);
                }
                continue;
            }
        }
    }
    
    throw lastError || new Error("AI service overloaded.");
}

/**
 * Generate an image from a text prompt.
 * @param {string} prompt - Description of the image
 * @param {number} [width=768]
 * @param {number} [height=768]
 * @returns {Promise<Buffer>} - Image buffer (JPEG)
 */
async function generateImage(prompt, width = 768, height = 768) {
    try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
                    `?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;

        const { data } = await axios.get(url, { timeout: 60000, responseType: "arraybuffer" });
        return Buffer.from(data);
    } catch (err) {
        console.error("AI Image Generation failed:", err.message);
        if (err.response?.status === 402 || err.response?.status === 429) {
            throw new Error("AI Image Queue is currently full. Please try again in 5-10 minutes.");
        }
        throw new Error("AI Image service is unavailable.");
    }
}

module.exports = { askAI, generateImage };
