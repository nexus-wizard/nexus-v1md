const { ownerNumbers, admins } = require("../config");
const { toJid } = require("./utils");

const isOwner = (sender) => {
    const senderDigits = sender.replace(/\D/g, "");
    if (!senderDigits) return false;

    // 🛡️ 1. Check if it's the bot's own session digits
    if (global.myJid) {
        const botDigits = global.myJid.replace(/\D/g, "");
        if (senderDigits === botDigits) return true;
    }

    // 🛡️ 2. Check config numbers
    const isMatched = ownerNumbers.some(num => {
        const ownerDigits = num.replace(/\D/g, "");
        return ownerDigits && senderDigits === ownerDigits;
    });

    console.log(`🛡️ [Sec] Owner Check: ${sender} -> Digits: ${senderDigits} -> Result: ${isMatched}`);
    return isMatched;
};

const isAdmin = (sender) => {
    return admins.some(admin => admin.split("@")[0] === sender.split("@")[0]) || isOwner(sender);
};

// Simplified middleware runners/builders
const Middlewares = {
    ownerOnly: async (ctx) => {
        if (!isOwner(ctx.sender)) return { ok: false, reply: "❌ This command is for the bot owner only." };
        return { ok: true };
    },
    adminOnly: async (ctx) => {
        if (!isAdmin(ctx.sender)) return { ok: false, reply: "❌ This command is for admins only." };
        return { ok: true };
    },
    groupOnly: async (ctx) => {
        if (!ctx.isGroup) return { ok: false, reply: "⚠️ This command can only be used in a group." };
        return { ok: true };
    }
};

async function runMiddleware(ctx, command) {
    // 1. Automatic flags check
    if (command.isOwnerOnly && !isOwner(ctx.sender)) {
        console.log(`🚫 Middleware: Blocked ${ctx.sender} from Owner-only command ${command.name}`);
        await ctx.sock.sendMessage(ctx.jid, { text: "❌ Owner only!" });
        return false;
    }
    if (command.isAdminOnly && !isAdmin(ctx.sender)) {
        console.log(`🚫 Middleware: Blocked ${ctx.sender} from Admin-only command ${command.name}`);
        await ctx.sock.sendMessage(ctx.jid, { text: "❌ Admin only!" });
        return false;
    }
    if (command.isGroupOnly && !ctx.isGroup) {
        console.log(`🚫 Middleware: Blocked ${ctx.sender} from Group-only command ${command.name}`);
        await ctx.sock.sendMessage(ctx.jid, { text: "⚠️ Group only!" });
        return false;
    }

    // 2. Custom middlewares array
    if (command.middlewares && Array.isArray(command.middlewares)) {
        for (const middleware of command.middlewares) {
            const result = await middleware(ctx, { isOwner, isAdmin });
            if (result && result.ok === false) {
                if (result.reply) await ctx.sock.sendMessage(ctx.jid, { text: result.reply });
                return false;
            }
        }
    }
    return true;
}

module.exports = { runMiddleware, isOwner, isAdmin, Middlewares };