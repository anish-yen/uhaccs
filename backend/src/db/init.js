const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "../../data/uhaccs.db");

let db;

function getDB() {
  return db;
}

function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Enable foreign keys
      db.run("PRAGMA foreign_keys = ON", (err) => {
        if (err) {
          reject(err);
          return;
        }

        // --- Users table ---
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            points INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            last_verified_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // --- Reminders table ---
        db.run(`
          CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('water', 'exercise')),
            interval_minutes INTEGER NOT NULL DEFAULT 30,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);

        // --- Activity log (tracks each completed reminder) ---
        db.run(`
          CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reminder_id INTEGER,
            type TEXT NOT NULL,
            verified INTEGER DEFAULT 0,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (reminder_id) REFERENCES reminders(id)
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log("Database initialized");
            resolve();
          }
        });
      });
    });
  });
}

module.exports = { initDB, getDB };
