const express = require("express");
const router = express.Router();
const { getRedisClient } = require("../db/redis");

const REMINDERS_KEY = (userId) => `user:${userId}:reminders`;

// POST /api/reminders — create a new reminder
router.post("/", async (req, res) => {
  const { user_id, type, interval_minutes } = req.body;

  if (!user_id || !type) {
    return res.status(400).json({ error: "user_id and type are required" });
  }

  try {
    const client = await getRedisClient();
    const remindersJson = await client.get(REMINDERS_KEY(user_id));
    const reminders = remindersJson ? JSON.parse(remindersJson) : [];
    
    const newReminder = {
      id: Date.now().toString(),
      user_id,
      type,
      interval_minutes: interval_minutes || 30,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    
    reminders.push(newReminder);
    await client.set(REMINDERS_KEY(user_id), JSON.stringify(reminders));
    
    res.status(201).json({ id: newReminder.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reminders/:userId — get all reminders for a user
router.get("/:userId", async (req, res) => {
  try {
    const client = await getRedisClient();
    const remindersJson = await client.get(REMINDERS_KEY(req.params.userId));
    const reminders = remindersJson ? JSON.parse(remindersJson) : [];
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TODO: PATCH /api/reminders/:id — update interval or toggle is_active
// TODO: DELETE /api/reminders/:id — delete a reminder
// TODO: GET /api/reminders/:id/history — get activity log for a specific reminder

module.exports = router;
