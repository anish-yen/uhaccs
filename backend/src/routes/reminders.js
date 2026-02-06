const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");

// POST /api/reminders — create a new reminder
router.post("/", (req, res) => {
  const { user_id, type, interval_minutes } = req.body;

  if (!user_id || !type) {
    return res.status(400).json({ error: "user_id and type are required" });
  }

  try {
    const db = getDB();
    const stmt = db.prepare(
      "INSERT INTO reminders (user_id, type, interval_minutes) VALUES (?, ?, ?)"
    );
    const result = stmt.run(user_id, type, interval_minutes || 30);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reminders/:userId — get all reminders for a user
router.get("/:userId", (req, res) => {
  try {
    const db = getDB();
    const reminders = db
      .prepare("SELECT * FROM reminders WHERE user_id = ?")
      .all(req.params.userId);
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TODO: PATCH /api/reminders/:id — update interval or toggle is_active
// TODO: DELETE /api/reminders/:id — delete a reminder
// TODO: GET /api/reminders/:id/history — get activity log for a specific reminder

module.exports = router;
