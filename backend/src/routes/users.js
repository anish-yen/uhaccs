const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");

// POST /api/users — create a new user
router.post("/", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required" });

  try {
    const db = getDB();
    const stmt = db.prepare("INSERT INTO users (username) VALUES (?)");
    const result = stmt.run(username);
    res.status(201).json({ id: result.lastInsertRowid, username });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id — get user profile + points/streak
router.get("/:id", (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TODO: GET /api/users/:id/stats — return detailed gamification stats
// - total points, current streak, longest streak
// - activity breakdown (water vs exercise)
// - daily/weekly summary

// TODO: PATCH /api/users/:id — update user settings

module.exports = router;
