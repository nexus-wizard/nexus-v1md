/**
 * Centralized utility functions for Nexus-1MD
 */

/**
 * Converts a raw number string to a standard WhatsApp JID
 * @param {string} number - The raw number (e.g., "25479...")
 * @returns {string} - The formatted JID (e.g., "25479...@s.whatsapp.net")
 */
const toJid = (number) => {
    if (!number) return "";
    if (number.includes("@")) return number; // Already a JID
    
    // Remove leading 0 if present (common in Kenyan numbers)
    let clean = number.replace(/^0/, "254");
    
    return `${clean}@s.whatsapp.net`;
};

module.exports = { toJid };
