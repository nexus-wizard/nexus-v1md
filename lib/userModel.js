const { DataTypes } = require("sequelize");
const { sequelize } = require("./db");

// Define User Model
const User = sequelize.define("User", {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    xp: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    level: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    coins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    inventory: {
        type: DataTypes.TEXT, // Store as JSON string
        defaultValue: "[]",
    },
    lastDaily: { type: DataTypes.DATE, defaultValue: 0 },
    lastWeekly: { type: DataTypes.DATE, defaultValue: 0 },
    lastMonthly: { type: DataTypes.DATE, defaultValue: 0 },
    lastWork: { type: DataTypes.DATE, defaultValue: 0 },
    lastCrime: { type: DataTypes.DATE, defaultValue: 0 },
    lastRob: { type: DataTypes.DATE, defaultValue: 0 },
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
});

// Helper functions (keeping the same API for the rest of the bot)
const getUser = async (id) => {
    try {
        const [user, created] = await User.findOrCreate({
            where: { id: id },
            defaults: { xp: 0, level: 1, coins: 0, inventory: "[]" }
        });
        return user;
    } catch (error) {
        console.error("❌ getUser Error:", error);
        return null; // Handle null in commands
    }
};

const addXP = async (id, amount) => {
    try {
        const user = await User.findByPk(id);
        if (user) {
            user.xp += amount;
            // Simple leveling logic
            const nextLevelXP = user.level * 100;
            if (user.xp >= nextLevelXP) {
                user.level += 1;
            }
            await user.save();
            return user.dataValues;
        }
    } catch (error) {
        console.error("❌ addXP Error:", error);
    }
};

const addCoins = async (id, amount) => {
    try {
        const user = await User.findByPk(id);
        if (user) {
            user.coins += amount;
            await user.save();
            return user.dataValues;
        }
    } catch (error) {
        console.error("❌ addCoins Error:", error);
    }
};

module.exports = { User, getUser, addXP, addCoins };