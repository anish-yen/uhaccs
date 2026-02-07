const express = require("express");
const router = express.Router();
const { getRedisClient } = require("../db/redis");

const USER_STATS_KEY = (userId) => `user:${userId}:stats`;

// GET /api/user/stats - Get user statistics
router.get("/", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    const client = await getRedisClient();
    const statsJson = await client.get(USER_STATS_KEY(userId));
    
    if (!statsJson) {
      // Return default stats if user doesn't exist
      return res.json({
        level: 1,
        currentXP: 0,
        nextLevelXP: 1000,
        totalPoints: 0,
        streak: 0,
        totalWorkouts: 0,
        rank: "Bronze",
        lastActivityDate: null,
      });
    }
    
    const stats = JSON.parse(statsJson);
    res.json(stats);
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/stats - Update user statistics (usually called internally)
router.put("/", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.body.userId || "default";
    const client = await getRedisClient();
    
    const statsJson = await client.get(USER_STATS_KEY(userId));
    const existingStats = statsJson ? JSON.parse(statsJson) : {
      level: 1,
      currentXP: 0,
      nextLevelXP: 1000,
      totalPoints: 0,
      streak: 0,
      totalWorkouts: 0,
      rank: "Bronze",
      lastActivityDate: null,
    };
    
    const updatedStats = { ...existingStats, ...req.body };
    await client.set(USER_STATS_KEY(userId), JSON.stringify(updatedStats));
    
    res.json(updatedStats);
  } catch (err) {
    console.error("Error updating stats:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

