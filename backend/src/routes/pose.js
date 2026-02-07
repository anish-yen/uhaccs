// Pose detection and analysis routes
const express = require("express");
const router = express.Router();
const { getRedisClient } = require("../db/redis");

const POSE_DATA_KEY = (userId) => `user:${userId}:pose-data`;
const POSE_HISTORY_KEY = (userId) => `user:${userId}:pose-history`;
const POSE_ANALYSIS_KEY = (userId) => `user:${userId}:pose-analysis`;

// POST /api/pose/data - Store pose detection data
router.post("/data", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.body.userId || "default";
    
    const { 
      landmarks, 
      exerciseType, 
      confidence, 
      timestamp,
      formScore,
      repCount 
    } = req.body;
    
    if (!landmarks || !Array.isArray(landmarks)) {
      return res.status(400).json({ error: "landmarks array is required" });
    }
    
    const client = await getRedisClient();
    
    // Store current pose data
    const poseData = {
      landmarks,
      exerciseType: exerciseType || null,
      confidence: confidence || 0,
      timestamp: timestamp || new Date().toISOString(),
      formScore: formScore || null,
      repCount: repCount || null,
    };
    
    await client.set(
      POSE_DATA_KEY(userId),
      JSON.stringify(poseData),
      { EX: 300 } // Expire after 5 minutes
    );
    
    // Add to history (keep last 100 entries)
    const historyJson = await client.get(POSE_HISTORY_KEY(userId));
    const history = historyJson ? JSON.parse(historyJson) : [];
    history.push(poseData);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    
    await client.set(POSE_HISTORY_KEY(userId), JSON.stringify(history));
    
    res.json({ 
      success: true, 
      message: "Pose data stored",
      data: poseData
    });
  } catch (err) {
    console.error("Error storing pose data:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pose/analysis - Store pose analysis results
router.post("/analysis", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.body.userId || "default";
    
    const { 
      exerciseType,
      formScore,
      repCount,
      duration,
      quality,
      feedback,
      landmarks
    } = req.body;
    
    if (!exerciseType) {
      return res.status(400).json({ error: "exerciseType is required" });
    }
    
    const client = await getRedisClient();
    
    const analysis = {
      id: Date.now().toString(),
      exerciseType,
      formScore: formScore || 0,
      repCount: repCount || 0,
      duration: duration || 0,
      quality: quality || "good",
      feedback: feedback || [],
      landmarks: landmarks || [],
      timestamp: new Date().toISOString(),
    };
    
    // Store analysis
    const analysisJson = await client.get(POSE_ANALYSIS_KEY(userId));
    const analyses = analysisJson ? JSON.parse(analysisJson) : [];
    analyses.unshift(analysis); // Add to beginning
    
    // Keep only last 50 analyses
    if (analyses.length > 50) {
      analyses.pop();
    }
    
    await client.set(POSE_ANALYSIS_KEY(userId), JSON.stringify(analyses));
    
    // If repCount > 0, automatically create an exercise entry
    if (repCount > 0 && exerciseType) {
      const exercisesJson = await client.get(`user:${userId}:exercises`);
      const exercises = exercisesJson ? JSON.parse(exercisesJson) : [];
      
      // Calculate points based on exercise type and reps
      const pointsMap = {
        pushup: 10,
        squat: 15,
        'overhead-raise': 12,
        plank: 8,
        standing: 5,
      };
      
      const basePoints = pointsMap[exerciseType] || 10;
      const totalPoints = basePoints * repCount;
      
      const newExercise = {
        id: Date.now().toString(),
        name: exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1).replace('-', ' '),
        sets: 1,
        reps: repCount,
        weight: 0,
        points: totalPoints,
        musclesWorked: getMusclesForExercise(exerciseType),
        date: new Date().toISOString().split("T")[0],
        category: "strength",
        detectedBy: "pose-detection",
        formScore: formScore,
      };
      
      exercises.unshift(newExercise);
      await client.set(`user:${userId}:exercises`, JSON.stringify(exercises));
      
      // Update user stats
      const statsJson = await client.get(`user:${userId}:stats`);
      const stats = statsJson ? JSON.parse(statsJson) : {
        level: 1,
        currentXP: 0,
        nextLevelXP: 1000,
        totalPoints: 0,
        streak: 0,
        totalWorkouts: 0,
        rank: "Bronze",
      };
      
      stats.totalPoints += totalPoints;
      stats.currentXP += totalPoints;
      stats.totalWorkouts += 1;
      
      // Level up logic
      while (stats.currentXP >= stats.nextLevelXP) {
        stats.currentXP -= stats.nextLevelXP;
        stats.level += 1;
        stats.nextLevelXP = Math.floor(stats.nextLevelXP * 1.5);
      }
      
      // Update rank based on level
      if (stats.level >= 20) stats.rank = "Diamond";
      else if (stats.level >= 15) stats.rank = "Platinum";
      else if (stats.level >= 10) stats.rank = "Gold";
      else if (stats.level >= 5) stats.rank = "Silver";
      else stats.rank = "Bronze";
      
      await client.set(`user:${userId}:stats`, JSON.stringify(stats));
    }
    
    res.json({ 
      success: true, 
      message: "Pose analysis stored",
      analysis,
      exerciseCreated: repCount > 0
    });
  } catch (err) {
    console.error("Error storing pose analysis:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pose/data - Get current pose data
router.get("/data", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    
    const client = await getRedisClient();
    const poseDataJson = await client.get(POSE_DATA_KEY(userId));
    
    if (!poseDataJson) {
      return res.json({
        detected: false,
        data: null
      });
    }
    
    const poseData = JSON.parse(poseDataJson);
    res.json({
      detected: true,
      data: poseData
    });
  } catch (err) {
    console.error("Error fetching pose data:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pose/history - Get pose detection history
router.get("/history", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    
    const limit = parseInt(req.query.limit) || 50;
    
    const client = await getRedisClient();
    const historyJson = await client.get(POSE_HISTORY_KEY(userId));
    
    if (!historyJson) {
      return res.json([]);
    }
    
    const history = JSON.parse(historyJson);
    res.json(history.slice(0, limit));
  } catch (err) {
    console.error("Error fetching pose history:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pose/analysis - Get pose analysis results
router.get("/analysis", async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated() && req.user?.id) 
      ? req.user.id.toString() 
      : req.query.userId || "default";
    
    const limit = parseInt(req.query.limit) || 20;
    
    const client = await getRedisClient();
    const analysisJson = await client.get(POSE_ANALYSIS_KEY(userId));
    
    if (!analysisJson) {
      return res.json([]);
    }
    
    const analyses = JSON.parse(analysisJson);
    res.json(analyses.slice(0, limit));
  } catch (err) {
    console.error("Error fetching pose analysis:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to get muscles worked for exercise type
function getMusclesForExercise(exerciseType) {
  const muscleMap = {
    pushup: ["chest", "triceps", "shoulders"],
    squat: ["quads", "hamstrings", "glutes"],
    "overhead-raise": ["shoulders", "triceps"],
    plank: ["core", "shoulders"],
    standing: [],
  };
  
  return muscleMap[exerciseType] || [];
}

module.exports = router;

