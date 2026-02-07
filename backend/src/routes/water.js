// Water drinking detection routes
const express = require("express");
const router = express.Router();
const { getRedisClient } = require("../db/redis");

const WATER_DETECTION_KEY = (userId) => `user:${userId}:water-detection`;
const WATER_HISTORY_KEY = (userId) => `user:${userId}:water-history`;

// POST /api/water/detect - Detect water drinking
router.post("/detect", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.body.userId || "default";
    
    const { detected, confidence, timestamp } = req.body;
    
    if (detected === undefined) {
      return res.status(400).json({ error: "detected field is required" });
    }
    
    const client = await getRedisClient();
    
    // Store detection status
    const detectionData = {
      detected: detected || false,
      confidence: confidence || 0,
      timestamp: timestamp || new Date().toISOString(),
    };
    
    await client.set(
      WATER_DETECTION_KEY(userId),
      JSON.stringify(detectionData),
      { EX: 300 } // Expire after 5 minutes
    );
    
    // If water was detected, add to history and award points
    if (detected) {
      // Add to history
      const historyJson = await client.get(WATER_HISTORY_KEY(userId));
      const history = historyJson ? JSON.parse(historyJson) : [];
      history.unshift(detectionData);
      
      // Keep only last 100 entries
      if (history.length > 100) {
        history.pop();
      }
      
      await client.set(WATER_HISTORY_KEY(userId), JSON.stringify(history));
      
      // Award points (10 points per water drinking)
      const today = new Date().toISOString().split("T")[0];
      const statsJson = await client.get(`user:${userId}:stats`);
      const stats = statsJson ? JSON.parse(statsJson) : {
        level: 1,
        currentXP: 0,
        nextLevelXP: 1000,
        totalPoints: 0,
        streak: 0,
        totalWorkouts: 0,
        rank: "Bronze",
      };
      
      stats.totalPoints += 10;
      stats.currentXP += 10;
      
      // Level up logic
      while (stats.currentXP >= stats.nextLevelXP) {
        stats.currentXP -= stats.nextLevelXP;
        stats.level += 1;
        stats.nextLevelXP = Math.floor(stats.nextLevelXP * 1.5);
      }
      
      // Update rank based on level
      if (stats.level >= 20) stats.rank = "Diamond";
      else if (stats.level >= 15) stats.rank = "Platinum";
      else if (stats.level >= 10) stats.rank = "Gold";
      else if (stats.level >= 5) stats.rank = "Silver";
      else stats.rank = "Bronze";
      
      await client.set(`user:${userId}:stats`, JSON.stringify(stats));
      
      res.json({ 
        success: true, 
        message: "Water drinking detected! +10 points",
        pointsAwarded: 10,
        data: detectionData
      });
    } else {
      res.json({ 
        success: true, 
        message: "Detection status updated",
        data: detectionData
      });
    }
  } catch (err) {
    console.error("Error detecting water:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/water/status - Get current water detection status
router.get("/status", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    
    const client = await getRedisClient();
    const detectionJson = await client.get(WATER_DETECTION_KEY(userId));
    
    if (!detectionJson) {
      return res.json({
        detected: false,
        confidence: 0,
        timestamp: null,
      });
    }
    
    const detection = JSON.parse(detectionJson);
    res.json(detection);
  } catch (err) {
    console.error("Error fetching water detection status:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/water/history - Get water drinking history
router.get("/history", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    
    const limit = parseInt(req.query.limit) || 50;
    
    const client = await getRedisClient();
    const historyJson = await client.get(WATER_HISTORY_KEY(userId));
    
    if (!historyJson) {
      return res.json([]);
    }
    
    const history = JSON.parse(historyJson);
    res.json(history.slice(0, limit));
  } catch (err) {
    console.error("Error fetching water history:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/water/manual - Manually log water drinking (for testing/fallback)
router.post("/manual", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.body.userId || "default";
    
    const client = await getRedisClient();
    const today = new Date().toISOString().split("T")[0];
    
    // Award points
    const statsJson = await client.get(`user:${userId}:stats`);
    const stats = statsJson ? JSON.parse(statsJson) : {
      level: 1,
      currentXP: 0,
      nextLevelXP: 1000,
      totalPoints: 0,
      streak: 0,
      totalWorkouts: 0,
      rank: "Bronze",
    };
    
    stats.totalPoints += 10;
    stats.currentXP += 10;
    
    // Level up logic
    while (stats.currentXP >= stats.nextLevelXP) {
      stats.currentXP -= stats.nextLevelXP;
      stats.level += 1;
      stats.nextLevelXP = Math.floor(stats.nextLevelXP * 1.5);
    }
    
    // Update rank based on level
    if (stats.level >= 20) stats.rank = "Diamond";
    else if (stats.level >= 15) stats.rank = "Platinum";
    else if (stats.level >= 10) stats.rank = "Gold";
    else if (stats.level >= 5) stats.rank = "Silver";
    else stats.rank = "Bronze";
    
    await client.set(`user:${userId}:stats`, JSON.stringify(stats));
    
    // Add to history
    const detectionData = {
      detected: true,
      confidence: 1.0,
      timestamp: new Date().toISOString(),
      manual: true,
    };
    
    const historyJson = await client.get(WATER_HISTORY_KEY(userId));
    const history = historyJson ? JSON.parse(historyJson) : [];
    history.unshift(detectionData);
    
    if (history.length > 100) {
      history.pop();
    }
    
    await client.set(WATER_HISTORY_KEY(userId), JSON.stringify(history));
    
    res.json({ 
      success: true, 
      message: "Water drinking logged! +10 points",
      pointsAwarded: 10,
      data: detectionData
    });
  } catch (err) {
    console.error("Error manually logging water:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

