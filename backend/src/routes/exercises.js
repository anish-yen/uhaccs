const express = require("express");
const router = express.Router();
const { getDB } = require("../db/init");

// GET /api/exercises — return activity log as exercise list
router.get("/", (_req, res) => {
  const db = getDB();
  const userId = 1;

  db.all(
    `SELECT id, type, verified, completed_at
     FROM activity_log
     WHERE user_id = ? AND verified = 1
     ORDER BY completed_at DESC
     LIMIT 50`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });

      const exercises = (rows || []).map((r) => ({
        id: r.id.toString(),
        name: r.type === "water" ? "Water Intake" : "Exercise Rep",
        sets: 1,
        reps: 1,
        weight: 0,
        points: r.type === "water" ? 10 : 25,
        musclesWorked: r.type === "exercise" ? ["quads", "glutes", "hamstrings"] : [],
        date: r.completed_at ? r.completed_at.split("T")[0] : new Date().toISOString().split("T")[0],
        category: r.type === "water" ? "cardio" : "strength",
      }));

      res.json(exercises);
    }
  );
});

// GET /api/exercises/:id
router.get("/:id", (req, res) => {
  const db = getDB();
  db.get(
    "SELECT * FROM activity_log WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!row) return res.status(404).json({ error: "Exercise not found" });
      res.json(row);
    }
  );
});

// POST / PUT / DELETE are no-ops — activities are created via /api/verification
router.post("/", (_req, res) => res.json({ success: true }));
router.put("/:id", (_req, res) => res.json({ success: true }));
router.delete("/:id", (_req, res) => res.json({ success: true }));

module.exports = router;

