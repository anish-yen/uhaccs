const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");
const { startReminder, stopReminder } = require("../scheduler/reminderScheduler");

// POST /api/reminders — create a new reminder and start its scheduler
router.post("/", (req, res) => {
  const { user_id, type, interval_minutes } = req.body;

  if (!user_id || !type) {
    return res.status(400).json({ error: "user_id and type are required" });
  }

  const db = getDB();
  const interval = interval_minutes || 30;
  db.run(
    "INSERT INTO reminders (user_id, type, interval_minutes, is_active) VALUES (?, ?, ?, 1)",
    [user_id, type, interval],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const newId = this.lastID;
      const reminder = { id: newId, user_id, type, interval_minutes: interval, is_active: 1 };
      startReminder(reminder);
      res.status(201).json(reminder);
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

// PATCH /api/reminders/:id — update interval or toggle is_active
router.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { interval_minutes, is_active } = req.body;

  const db = getDB();
  db.get("SELECT * FROM reminders WHERE id = ?", [id], (err, reminder) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!reminder) return res.status(404).json({ error: "Reminder not found" });

    const newInterval = interval_minutes ?? reminder.interval_minutes;
    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : reminder.is_active;

    db.run(
      "UPDATE reminders SET interval_minutes = ?, is_active = ? WHERE id = ?",
      [newInterval, newActive, id],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        // Stop old scheduler
        stopReminder(id);

        // If still active, restart with new interval
        if (newActive) {
          startReminder({ ...reminder, interval_minutes: newInterval, is_active: newActive });
        }

        res.json({ ...reminder, interval_minutes: newInterval, is_active: newActive });
      }
    );
  });
});

// DELETE /api/reminders/:id — delete a reminder
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const db = getDB();

  stopReminder(id);

  db.run("DELETE FROM reminders WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Reminder not found" });
    res.json({ success: true, id: Number(id) });
  });
});

module.exports = router;
