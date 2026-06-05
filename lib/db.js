const { Sequelize } = require("sequelize");
const path = require("path");

const dbUrl = process.env.DATABASE_URL;

// Initialize Sequelize (Support PostgreSQL for Heroku, SQLite for local)
const sequelize = dbUrl 
    ? new Sequelize(dbUrl, {
        dialect: "postgres",
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    })
    : new Sequelize({
        dialect: "sqlite",
        storage: path.join(__dirname, "../database/database.db"),
        logging: false,
        dialectOptions: {
            connectTimeout: 60000,
        },
        pool: {
            max: 1, // Single connection for SQLite to avoid locks
            min: 0,
            idle: 10000
        },
        retry: {
            match: [
                /SQLITE_BUSY/
            ],
            name: 'query',
            max: 5
        }
    });


// Test connection and sync models
const initDb = async () => {
    try {
        await sequelize.authenticate();
        console.log("🗄️ Database connection established successfully via Sequelize.");
        // sync() creates the tables if they don't exist
        await sequelize.sync({ alter: true }); 
    } catch (error) {
        console.error("❌ Unable to connect to the database:", error);
    }
};

module.exports = { sequelize, initDb };