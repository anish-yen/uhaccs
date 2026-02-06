const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");

// POST /api/reminders — create a new reminder
router.post("/", (req, res) => {
  const { user_id, type, interval_minutes } = req.body;

  if (!user_id || !type) {
    return res.status(400).json({ error: "user_id and type are required" });
  }

  const db = getDB();
  db.run(
    "INSERT INTO reminders (user_id, type, interval_minutes) VALUES (?, ?, ?)",
    [user_id, type, interval_minutes || 30],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// GET /api/reminders/:userId — get all reminders for a user
router.get("/:userId", (req, res) => {
  const db = getDB();
  db.all(
    "SELECT * FROM reminders WHERE user_id = ?",
    [req.params.userId],
    (err, reminders) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(reminders || []);
    }
  );
});

// TODO: PATCH /api/reminders/:id — update interval or toggle is_active
// TODO: DELETE /api/reminders/:id — delete a reminder
// TODO: GET /api/reminders/:id/history — get activity log for a specific reminder

module.exports = router;
