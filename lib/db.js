const { Sequelize } = require("sequelize");
const path = require("path");

const dbUrl = process.env.DATABASE_URL;

// Initial state: Fallback to SQLite by default if URL is missing
let sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.join(__dirname, "../database/database.db"),
    logging: false
});

/**
 * Re-initializes the global sequelize instance with new options
 * This is a hack to allow runtime dialect switching without breaking model imports
 */
const rebindInstance = (newSequelize) => {
    Object.assign(sequelize, newSequelize);
    sequelize.options = newSequelize.options;
    sequelize.dialect = newSequelize.dialect;
    sequelize.queryInterface = newSequelize.queryInterface;
    sequelize.connectionManager = newSequelize.connectionManager;
};

// Test connection and sync models
const initDb = async () => {
    if (dbUrl && !process.env.FORCE_SQLITE) {
        try {
            const primaryDb = new Sequelize(dbUrl, {
                logging: false,
                dialectOptions: {
                    ssl: { require: true, rejectUnauthorized: false },
                    connectTimeout: 5000 
                },
                retry: { max: 0 } 
            });
            await primaryDb.authenticate();
            console.log("🗄️ Primary database connected successfully.");
            rebindInstance(primaryDb);
        } catch (error) {
            console.warn("⚠️ Primary database failed. Staying on local SQLite.");
        }
    } else {
        console.log("🗄️ Using local SQLite database.");
    }
    
    try {
        await sequelize.sync({ alter: true }); 
        console.log("✅ Database models synchronized.");
    } catch (syncError) {
        console.error("❌ Database synchronization failed:", syncError.message);
    }
};

module.exports = { sequelize, initDb };