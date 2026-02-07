// Water drinking detection routes — backed by SQLite activity_log
const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");

// POST /api/water/detect — record a water detection event
router.post("/detect", (req, res) => {
  const { detected, confidence, timestamp } = req.body;
  if (detected === undefined) {
    return res.status(400).json({ error: "detected field is required" });
  }

  const detectionData = {
    detected: detected || false,
    confidence: confidence || 0,
    timestamp: timestamp || new Date().toISOString(),
  };

  if (!detected) {
    return res.json({ success: true, message: "Detection status updated", data: detectionData });
  }

  // Log to activity_log (points are awarded separately via /api/verification)
  const db = getDB();
  db.run(
    "INSERT INTO activity_log (user_id, reminder_id, type, verified) VALUES (1, NULL, 'water', 1)",
    (err) => {
      if (err) console.error("Water detect log error:", err);
    }
  );

  res.json({
    success: true,
    message: "Water drinking detected! +10 points",
    pointsAwarded: 10,
    data: detectionData,
  });
});

// GET /api/water/status
router.get("/status", (_req, res) => {
  res.json({ detected: false, confidence: 0, timestamp: null });
});

// GET /api/water/history — pull from activity_log
router.get("/history", (req, res) => {
  const db = getDB();
  const limit = parseInt(req.query.limit) || 50;

  db.all(
    `SELECT completed_at as timestamp FROM activity_log
     WHERE user_id = 1 AND type = 'water' AND verified = 1
     ORDER BY completed_at DESC LIMIT ?`,
    [limit],
    (err, rows) => {
      if (err) return res.json([]);
      res.json(
        (rows || []).map((r) => ({
          detected: true,
          confidence: 1.0,
          timestamp: r.timestamp,
          manual: true,
        }))
      );
    }
  );
});

// POST /api/water/manual — same as verify(water)
router.post("/manual", (_req, res) => {
  const db = getDB();
  db.run(
    "INSERT INTO activity_log (user_id, reminder_id, type, verified) VALUES (1, NULL, 'water', 1)",
    function (err) {
      if (err) return res.status(500).json({ error: "Failed to log" });
      res.json({
        success: true,
        message: "Water drinking logged!",
        pointsAwarded: 10,
        data: {
          detected: true,
          confidence: 1.0,
          timestamp: new Date().toISOString(),
          manual: true,
        },
      });
    }
  );
});

module.exports = router;

