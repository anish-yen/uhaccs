const express = require("express");
const router = express.Router();
const { getUserById, createUser } = require("../db/users");

// POST /api/users — create a new user
router.post("/", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required" });

  try {
    const user = await createUser({ username });
    res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id — get user profile + points/streak
router.get("/:id", async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
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
