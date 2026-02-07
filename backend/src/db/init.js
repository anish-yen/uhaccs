// Database initialization - now using Redis only
// SQLite has been removed due to build issues

const { getRedisClient } = require("./redis");

let dbInitialized = false;

async function initDB() {
  if (dbInitialized) {
    return;
  }
  
  try {
    // Just verify Redis connection
    const client = await getRedisClient();
    const pong = await client.ping();
    if (pong === "PONG") {
      console.log("✅ Database (Redis) initialized");
      dbInitialized = true;
    } else {
      throw new Error("Redis ping failed");
    }
  } catch (err) {
    console.error("❌ Failed to initialize Redis:", err.message);
    console.error("   Please start Redis server first");
    throw err;
  }
}

// Stub function for compatibility (no longer used)
function getDB() {
  throw new Error("SQLite has been removed. Use Redis instead via getRedisClient()");
}

module.exports = { initDB, getDB };
