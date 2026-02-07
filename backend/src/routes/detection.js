const express = require("express");
const router = express.Router();
const { getRedisClient } = require("../db/redis");

const DETECTION_KEY = (userId) => `user:${userId}:detection`;

// POST /api/detection - Mark exercise as detected
router.post("/", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.body.userId || "default";
    const { detected, exerciseType } = req.body;
    
    const client = await getRedisClient();
    
    // Store detection status
    await client.set(
      DETECTION_KEY(userId),
      JSON.stringify({
        detected: detected || false,
        exerciseType: exerciseType || null,
        detectedAt: new Date().toISOString(),
      }),
      { EX: 3600 } // Expire after 1 hour
    );
    
    res.json({ 
      success: true, 
      detected: detected || false,
      message: detected ? "Exercise detected!" : "Detection status updated"
    });
  } catch (err) {
    console.error("Error updating detection:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/detection - Get detection status
router.get("/", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    const client = await getRedisClient();
    const detectionJson = await client.get(DETECTION_KEY(userId));
    
    if (!detectionJson) {
      return res.json({
        detected: false,
        exerciseType: null,
        detectedAt: null,
      });
    }
    
    const detection = JSON.parse(detectionJson);
    res.json(detection);
  } catch (err) {
    console.error("Error fetching detection:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

