const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");

// POST /api/users — create a new user
router.post("/", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required" });

  const db = getDB();
  db.run("INSERT INTO users (username) VALUES (?)", [username], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(409).json({ error: "Username already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, username });
  });
});

// GET /api/users/:id — get user profile + points/streak
router.get("/:id", (req, res) => {
  const db = getDB();
  db.get("SELECT * FROM users WHERE id = ?", [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });
});

// TODO: GET /api/users/:id/stats — return detailed gamification stats
// - total points, current streak, longest streak
// - activity breakdown (water vs exercise)
// - daily/weekly summary

// TODO: PATCH /api/users/:id — update user settings

module.exports = router;
