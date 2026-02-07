const redis = require("redis");

let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error("Redis: Too many reconnection attempts, giving up");
            return new Error("Redis connection failed");
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis Client Connected");
    });

    try {
      await redisClient.connect();
    } catch (err) {
      console.error("❌ Failed to connect to Redis:", err.message);
      console.error("   Make sure Redis is running: redis-server");
      throw err;
    }
  }
  return redisClient;
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

module.exports = { getRedisClient, closeRedis };


