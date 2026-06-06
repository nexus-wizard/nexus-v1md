
const fs = require("fs");
const path = require("path");

const STORAGE_FILE = path.join(__dirname, "../database/storage.json");

/**
 * Super simple Pure-JS JSON storage for when real databases are missing.
 * Zero binary dependencies (No SQLite/GLIBC headaches!)
 */
class JsonStore {
    constructor() {
        this.cache = {};
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(STORAGE_FILE)) {
                this.cache = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
            } else {
                this.cache = {};
                this.save();
            }
        } catch (e) {
            console.error("❌ JsonStore Load Error:", e.message);
            this.cache = {};
        }
    }

    save() {
        if (this.saveTimeout) return;
        
        this.saveTimeout = setTimeout(() => {
            try {
                const dir = path.dirname(STORAGE_FILE);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                
                // 🛡️ SAFE SAVE: Prevent circular structure crashes
                const getCircularReplacer = () => {
                    const seen = new WeakSet();
                    return (key, value) => {
                        if (typeof value === "object" && value !== null) {
                            if (seen.has(value)) return;
                            seen.add(value);
                        }
                        return value;
                    };
                };

                const data = JSON.stringify(this.cache, getCircularReplacer(), 2);
                fs.writeFileSync(STORAGE_FILE, data);
                this.saveTimeout = null;
            } catch (e) {
                console.error("❌ JsonStore Save Error:", e.message);
                this.saveTimeout = null;
            }
        }, 1000); 
    }

    getAll() {
        return this.cache;
    }

    get(key, defaultValue = null) {
        return this.cache[key] !== undefined ? this.cache[key] : defaultValue;
    }

    set(key, value) {
        this.cache[key] = value;
        this.save();
    }

    // Sequelize-like polyfills for settings
    async findOrCreate(options) {
        const key = `settings_${options.where.id}`;
        if (!this.cache[key]) {
            this.cache[key] = options.defaults;
            this.save();
        }
        const data = this.cache[key];
        // Return a mock object with update/save methods
        return [{
            ...data,
            dataValues: data,
            update: async (updates) => {
                Object.assign(this.cache[key], updates);
                this.save();
                return this.cache[key];
            },
            save: async () => {
                this.save();
                return this.cache[key];
            }
        }];
    }
}

module.exports = new JsonStore();
