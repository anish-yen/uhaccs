const express = require("express");
const router = express.Router();

// In-memory detection state (no Redis needed for a simple flag)
let detectionState = {
  detected: false,
  exerciseType: null,
  detectedAt: null,
};

// POST /api/detection - Mark exercise as detected
router.post("/", (req, res) => {
  const { detected, exerciseType } = req.body;

  detectionState = {
    detected: detected || false,
    exerciseType: exerciseType || null,
    detectedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    detected: detectionState.detected,
    message: detected ? "Exercise detected!" : "Detection status updated",
  });
});

// GET /api/detection - Get detection status
router.get("/", (_req, res) => {
  res.json(detectionState);
});

module.exports = router;

