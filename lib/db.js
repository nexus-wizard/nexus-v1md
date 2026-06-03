const { Sequelize } = require("sequelize");
const path = require("path");

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.join(__dirname, "../database/database.db"),
    logging: false, // Set to console.log to see SQL queries during debug
});

// Test connection and sync models
const initDb = async () => {
    try {
        await sequelize.authenticate();
        console.log("🗄️ Database connection established successfully via Sequelize.");
        // sync() creates the tables if they don't exist
        await sequelize.sync(); 
    } catch (error) {
        console.error("❌ Unable to connect to the database:", error);
    }
};

initDb();

module.exports = sequelize;