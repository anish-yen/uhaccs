const express = require("express");
const router = express.Router();
const { getRedisClient } = require("../db/redis");

const ACTIVITY_LOG_KEY = (userId) => `user:${userId}:activity_log`;

// POST /api/verification — frontend sends CV verification result
// The frontend handles computer vision; this endpoint receives the result
router.post("/", async (req, res) => {
  const { user_id, reminder_id, type, verified } = req.body;

  if (!user_id || !reminder_id || !type) {
    return res.status(400).json({ error: "user_id, reminder_id, and type are required" });
  }

  try {
    const client = await getRedisClient();
    
    // Log the activity
    const logJson = await client.get(ACTIVITY_LOG_KEY(user_id));
    const logs = logJson ? JSON.parse(logJson) : [];
    
    logs.push({
      id: Date.now().toString(),
      user_id,
      reminder_id,
      type,
      verified: !!verified,
      completed_at: new Date().toISOString(),
    });
    
    await client.set(ACTIVITY_LOG_KEY(user_id), JSON.stringify(logs));

    // TODO: Award points if verified === true
    // - Update users.points (e.g. +10 for water, +25 for exercise)
    // - Update users.current_streak
    // - Check and update users.longest_streak
    // - Broadcast updated score via WebSocket

    res.json({ success: true, verified: !!verified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TODO: GET /api/verification/log/:userId — paginated activity history

module.exports = router;
