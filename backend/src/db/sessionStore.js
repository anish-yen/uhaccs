const RedisStore = require("connect-redis").default;
const { getRedisClient } = require("./redis");

let sessionStore = null;

async function getSessionStore() {
  if (!sessionStore) {
    try {
      const client = await getRedisClient();
      sessionStore = new RedisStore({
        client: client,
        prefix: "sess:",
      });
    } catch (err) {
      console.error("Failed to create Redis session store:", err);
      throw err;
    }
  }
  return sessionStore;
}

module.exports = { getSessionStore };

