const express = require("express");
const router = express.Router();
const { getRedisClient } = require("../db/redis");

const EXERCISES_KEY = "exercises";
const USER_STATS_KEY = (userId) => `user:${userId}:stats`;
const USER_EXERCISES_KEY = (userId) => `user:${userId}:exercises`;

// GET /api/exercises - Get all exercises for a user
router.get("/", async (req, res) => {
  try {
    // Use authenticated user ID if available, otherwise use query param or default
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    const client = await getRedisClient();
    const exercisesJson = await client.get(USER_EXERCISES_KEY(userId));
    
    if (!exercisesJson) {
      return res.json([]);
    }
    
    const exercises = JSON.parse(exercisesJson);
    res.json(exercises);
  } catch (err) {
    console.error("Error fetching exercises:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exercises/:id - Get exercise by ID
router.get("/:id", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    const client = await getRedisClient();
    const exercisesJson = await client.get(USER_EXERCISES_KEY(userId));
    
    if (!exercisesJson) {
      return res.status(404).json({ error: "Exercise not found" });
    }
    
    const exercises = JSON.parse(exercisesJson);
    const exercise = exercises.find((e) => e.id === req.params.id);
    
    if (!exercise) {
      return res.status(404).json({ error: "Exercise not found" });
    }
    
    res.json(exercise);
  } catch (err) {
    console.error("Error fetching exercise:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exercises - Create new exercise
router.post("/", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.body.userId || "default";
    const { name, sets, reps, weight, points, musclesWorked, date, category } = req.body;
    
    if (!name || !sets || !reps || points === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const client = await getRedisClient();
    const exercisesJson = await client.get(USER_EXERCISES_KEY(userId));
    const exercises = exercisesJson ? JSON.parse(exercisesJson) : [];
    
    const newExercise = {
      id: Date.now().toString(),
      name,
      sets: parseInt(sets),
      reps: parseInt(reps),
      weight: weight ? parseFloat(weight) : 0,
      points: parseInt(points),
      musclesWorked: musclesWorked || [],
      date: date || new Date().toISOString().split("T")[0],
      category: category || "strength",
    };
    
    exercises.unshift(newExercise); // Add to beginning
    await client.set(USER_EXERCISES_KEY(userId), JSON.stringify(exercises));
    
    // Update user stats
    await updateUserStats(userId, newExercise.points, newExercise.date);
    
    res.status(201).json(newExercise);
  } catch (err) {
    console.error("Error creating exercise:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/exercises/:id - Update exercise
router.put("/:id", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    const client = await getRedisClient();
    const exercisesJson = await client.get(USER_EXERCISES_KEY(userId));
    
    if (!exercisesJson) {
      return res.status(404).json({ error: "Exercise not found" });
    }
    
    const exercises = JSON.parse(exercisesJson);
    const index = exercises.findIndex((e) => e.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: "Exercise not found" });
    }
    
    exercises[index] = { ...exercises[index], ...req.body };
    await client.set(USER_EXERCISES_KEY(userId), JSON.stringify(exercises));
    
    res.json(exercises[index]);
  } catch (err) {
    console.error("Error updating exercise:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/exercises/:id - Delete exercise
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    const client = await getRedisClient();
    const exercisesJson = await client.get(USER_EXERCISES_KEY(userId));
    
    if (!exercisesJson) {
      return res.status(404).json({ error: "Exercise not found" });
    }
    
    const exercises = JSON.parse(exercisesJson);
    const filtered = exercises.filter((e) => e.id !== req.params.id);
    
    if (filtered.length === exercises.length) {
      return res.status(404).json({ error: "Exercise not found" });
    }
    
    await client.set(USER_EXERCISES_KEY(userId), JSON.stringify(filtered));
    res.json({ message: "Exercise deleted" });
  } catch (err) {
    console.error("Error deleting exercise:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to update user stats
async function updateUserStats(userId, points, date) {
  try {
    const client = await getRedisClient();
    const statsJson = await client.get(USER_STATS_KEY(userId));
    const stats = statsJson ? JSON.parse(statsJson) : {
      level: 1,
      currentXP: 0,
      nextLevelXP: 1000,
      totalPoints: 0,
      streak: 0,
      totalWorkouts: 0,
      rank: "Bronze",
      lastActivityDate: null,
    };
    
    // Update total points
    stats.totalPoints += points;
    stats.currentXP += points;
    stats.totalWorkouts += 1;
    
    // Calculate streak
    const today = new Date().toISOString().split("T")[0];
    const lastDate = stats.lastActivityDate;
    
    if (lastDate) {
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      const diffDays = Math.floor((todayObj - lastDateObj) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Same day, don't change streak
      } else if (diffDays === 1) {
        // Consecutive day, increment streak
        stats.streak += 1;
        stats.lastActivityDate = today;
      } else {
        // Streak broken, reset to 1
        stats.streak = 1;
        stats.lastActivityDate = today;
      }
    } else {
      // First activity
      stats.streak = 1;
      stats.lastActivityDate = today;
    }
    
    // Calculate level (every 1000 XP = 1 level)
    const newLevel = Math.floor(stats.currentXP / 1000) + 1;
    if (newLevel > stats.level) {
      stats.level = newLevel;
      stats.nextLevelXP = newLevel * 1000;
    }
    
    // Calculate rank based on level
    if (stats.level >= 50) stats.rank = "Diamond";
    else if (stats.level >= 30) stats.rank = "Platinum";
    else if (stats.level >= 20) stats.rank = "Gold";
    else if (stats.level >= 10) stats.rank = "Silver";
    else stats.rank = "Bronze";
    
    await client.set(USER_STATS_KEY(userId), JSON.stringify(stats));
  } catch (err) {
    console.error("Error updating user stats:", err);
  }
}

module.exports = router;

