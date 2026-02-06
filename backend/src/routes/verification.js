const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");

// POST /api/verification — frontend sends CV verification result
// The frontend handles computer vision; this endpoint receives the result
router.post("/", (req, res) => {
  const { user_id, reminder_id, type, verified } = req.body;

  if (!user_id || !reminder_id || !type) {
    return res.status(400).json({ error: "user_id, reminder_id, and type are required" });
  }

  const db = getDB();

  // Log the activity
  db.run(
    "INSERT INTO activity_log (user_id, reminder_id, type, verified) VALUES (?, ?, ?, ?)",
    [user_id, reminder_id, type, verified ? 1 : 0],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // TODO: Award points if verified === true
      // - Update users.points (e.g. +10 for water, +25 for exercise)
      // - Update users.current_streak
      // - Check and update users.longest_streak
      // - Broadcast updated score via WebSocket

      res.json({ success: true, verified: !!verified });
    }
  );
});

// TODO: GET /api/verification/log/:userId — paginated activity history

module.exports = router;
