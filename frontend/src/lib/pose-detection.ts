// MediaPipe Pose Detection utilities
// Using dynamic imports to load MediaPipe from CDN
let Pose: any;
let drawConnectors: any;
let drawLandmarks: any;
let POSE_CONNECTIONS: any;
let POSE_LANDMARKS: any;

// Initialize MediaPipe modules (will be loaded from CDN)
async function initMediaPipe() {
  if (Pose) return; // Already loaded
  
  try {
    // Try to load from npm packages first
    const poseModule = await import('@mediapipe/pose');
    const drawingModule = await import('@mediapipe/drawing_utils');
    Pose = poseModule.Pose;
    drawConnectors = drawingModule.drawConnectors;
    drawLandmarks = drawingModule.drawLandmarks;
    POSE_CONNECTIONS = poseModule.POSE_CONNECTIONS;
    POSE_LANDMARKS = poseModule.POSE_LANDMARKS;
  } catch (error) {
    console.warn('MediaPipe npm packages not found, using CDN fallback');
    // Fallback: Load from CDN via script tags (will be handled in index.html)
    throw new Error('MediaPipe packages need to be installed. Run: npm install @mediapipe/pose @mediapipe/drawing_utils');
  }
}

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseResult {
  landmarks: PoseLandmark[];
  worldLandmarks?: PoseLandmark[];
  detected: boolean;
  exerciseType?: string;
  confidence?: number;
}

/** Result from exercise detection for a single frame */
export interface ExerciseDetectorResult {
  angle: number | null;
  isDown: boolean;
  formScore: number;
  repIncrement: number;
  status?: string; // For jumping jacks: 'arms-up', 'arms-down', etc.
}

const LEFT_HIP = 23;
const LEFT_KNEE = 25;
const LEFT_ANKLE = 27;

const DOWN_ANGLE_THRESHOLD = 90;
const UP_ANGLE_THRESHOLD = 160;

function angleAtKnee(hip: PoseLandmark, knee: PoseLandmark, ankle: PoseLandmark): number | null {
  const ax = hip.x - knee.x;
  const ay = hip.y - knee.y;
  const bx = ankle.x - knee.x;
  const by = ankle.y - knee.y;
  const dot = ax * bx + ay * by;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);
  if (magA < 1e-6 || magB < 1e-6) return null;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * Stateful squat detector using left hip, knee, ankle.
 * Counts a rep when angle goes below DOWN_ANGLE_THRESHOLD then above UP_ANGLE_THRESHOLD.
 */
export class SquatDetector {
  private wasDown = false;

  detect(landmarks: PoseLandmark[]): ExerciseDetectorResult {
    const result: ExerciseDetectorResult = {
      angle: null,
      isDown: false,
      formScore: 0,
      repIncrement: 0,
    };

    if (!landmarks || landmarks.length < 29) return result;

    const leftHip = landmarks[LEFT_HIP];
    const leftKnee = landmarks[LEFT_KNEE];
    const leftAnkle = landmarks[LEFT_ANKLE];
    if (!leftHip || !leftKnee || !leftAnkle) return result;

    const visibility = (leftHip.visibility ?? 1) * (leftKnee.visibility ?? 1) * (leftAnkle.visibility ?? 1);
    if (visibility < 0.1) return result;

    const angle = angleAtKnee(leftHip, leftKnee, leftAnkle);
    result.angle = angle;
    if (angle == null) return result;

    result.isDown = angle < DOWN_ANGLE_THRESHOLD;
    result.formScore = Math.round(Math.min(100, Math.max(0, (angle / 180) * 100)));

    if (result.isDown) {
      this.wasDown = true;
    } else if (angle >= UP_ANGLE_THRESHOLD && this.wasDown) {
      result.repIncrement = 1;
      this.wasDown = false;
    }

    return result;
  }
}

/**
 * Stateful pushup detector using wrist, elbow, and shoulder positions.
 * Counts a rep when body goes from up to down and back up.
 */
export class PushupDetector {
  private wasDown = false;
  private wasUp = true; // Start with body up

  detect(landmarks: PoseLandmark[]): ExerciseDetectorResult {
    const result: ExerciseDetectorResult = {
      angle: null,
      isDown: false,
      formScore: 0,
      repIncrement: 0,
      status: 'up',
    };

    if (!landmarks || landmarks.length < 33) return result;

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) return result;

    const visibility = (leftShoulder.visibility ?? 1) * (rightShoulder.visibility ?? 1) * 
                       (leftWrist.visibility ?? 1) * (rightWrist.visibility ?? 1);
    if (visibility < 0.1) return result;

    // Calculate average positions
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgWristY = (leftWrist.y + rightWrist.y) / 2;
    
    // For pushups: body is "down" when wrists are significantly below shoulders
    // (indicating the body is lowered)
    const isDown = avgWristY > avgShoulderY + 0.1;
    const isUp = avgWristY < avgShoulderY + 0.05;

    // Calculate form score based on body alignment and symmetry
    const wristSymmetry = 1 - Math.abs(leftWrist.y - rightWrist.y);
    const shoulderSymmetry = 1 - Math.abs(leftShoulder.y - rightShoulder.y);
    const alignment = isDown ? 0.8 : (isUp ? 1.0 : 0.9); // Better form when fully up or down
    result.formScore = Math.round(Math.min(100, Math.max(0, (wristSymmetry * shoulderSymmetry * alignment) * 100)));

    result.status = isDown ? 'down' : (isUp ? 'up' : 'transitioning');
    result.isDown = isDown;

    // State machine: up -> down -> up = 1 rep
    if (isDown && this.wasUp) {
      this.wasDown = true;
      this.wasUp = false;
    } else if (isUp && this.wasDown) {
      result.repIncrement = 1;
      this.wasDown = false;
      this.wasUp = true;
    }

    return result;
  }
}

// Initialize MediaPipe Pose
export async function createPoseDetector(
  onResults: (results: PoseResult) => void
): Promise<any> {
  await initMediaPipe();
  
  const pose = new Pose({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    },
  });

  pose.setOptions({
    modelComplexity: 1, // 0, 1, or 2 (higher = more accurate but slower)
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  pose.onResults((results) => {
    const poseResult: PoseResult = {
      landmarks: results.poseLandmarks || [],
      worldLandmarks: results.poseWorldLandmarks,
      detected: !!results.poseLandmarks && results.poseLandmarks.length > 0,
      confidence: results.poseLandmarks
        ? results.poseLandmarks.reduce((acc, lm) => acc + (lm.visibility || 0), 0) /
          results.poseLandmarks.length
        : 0,
    };

    // Simple exercise type detection based on pose
    if (poseResult.detected) {
      poseResult.exerciseType = detectExerciseType(poseResult.landmarks);
    }

    onResults(poseResult);
  });

  return pose;
}

// Draw pose landmarks on canvas
export function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  width: number,
  height: number
): void {
  if (!landmarks || landmarks.length === 0) return;
  if (!drawConnectors || !drawLandmarks || !POSE_CONNECTIONS) {
    console.warn('MediaPipe drawing utilities not loaded');
    return;
  }

  // Scale landmarks to canvas size
  const scaledLandmarks = landmarks.map((lm) => ({
    x: lm.x * width,
    y: lm.y * height,
    z: lm.z,
    visibility: lm.visibility || 1,
  }));

  // Draw connections
  drawConnectors(ctx, scaledLandmarks, POSE_CONNECTIONS, {
    color: '#00FF00',
    lineWidth: 2,
  });

  // Draw landmarks
  drawLandmarks(ctx, scaledLandmarks, {
    color: '#FF0000',
    lineWidth: 1,
    radius: 3,
  });
}

// Simple exercise type detection based on pose landmarks
function detectExerciseType(landmarks: PoseLandmark[]): string {
  if (landmarks.length < 33) return 'unknown';

  // Get key landmarks
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  // Calculate angles and positions
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const wristY = (leftWrist.y + rightWrist.y) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const kneeY = (leftKnee.y + rightKnee.y) / 2;

  // Push-up detection: wrists below shoulders, body horizontal
  if (wristY > shoulderY && Math.abs(shoulderY - hipY) < 0.1) {
    return 'pushup';
  }

  // Squat detection: hips below knees, knees bent
  if (hipY > kneeY && kneeY > 0.5) {
    return 'squat';
  }

  // Overhead raise: wrists above shoulders
  if (wristY < shoulderY && Math.abs(leftWrist.y - rightWrist.y) < 0.1) {
    return 'overhead-raise';
  }

  // Plank: body horizontal, wrists near shoulders
  if (Math.abs(shoulderY - hipY) < 0.05 && Math.abs(wristY - shoulderY) < 0.1) {
    return 'plank';
  }

  return 'standing';
}

// Get pose landmark names
export function getLandmarkName(index: number): string {
  const names: { [key: number]: string } = {
    0: 'nose',
    1: 'left_eye_inner',
    2: 'left_eye',
    3: 'left_eye_outer',
    4: 'right_eye_inner',
    5: 'right_eye',
    6: 'right_eye_outer',
    7: 'left_ear',
    8: 'right_ear',
    9: 'mouth_left',
    10: 'mouth_right',
    11: 'left_shoulder',
    12: 'right_shoulder',
    13: 'left_elbow',
    14: 'right_elbow',
    15: 'left_wrist',
    16: 'right_wrist',
    17: 'left_pinky',
    18: 'right_pinky',
    19: 'left_index',
    20: 'right_index',
    21: 'left_thumb',
    22: 'right_thumb',
    23: 'left_hip',
    24: 'right_hip',
    25: 'left_knee',
    26: 'right_knee',
    27: 'left_ankle',
    28: 'right_ankle',
    29: 'left_heel',
    30: 'right_heel',
    31: 'left_foot_index',
    32: 'right_foot_index',
  };
  return names[index] || `landmark_${index}`;
}

/**
 * Detect water drinking based on pose landmarks.
 * Looks for hand/wrist position near the mouth/face area.
 */
export function detectWaterDrinking(landmarks: PoseLandmark[]): boolean {
  if (!landmarks || landmarks.length < 33) return false;

  // Key landmarks for water detection
  // 0 = nose, 9 = mouth_left, 10 = mouth_right
  // 15 = left_wrist, 16 = right_wrist
  // 11 = left_shoulder, 12 = right_shoulder
  
  const nose = landmarks[0];
  const mouthLeft = landmarks[9];
  const mouthRight = landmarks[10];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  if (!nose || !leftWrist || !rightWrist) return false;

  // Calculate mouth center
  const mouthCenterX = mouthLeft && mouthRight 
    ? (mouthLeft.x + mouthRight.x) / 2 
    : nose.x;
  const mouthCenterY = mouthLeft && mouthRight 
    ? (mouthLeft.y + mouthRight.y) / 2 
    : nose.y;

  // Check if either wrist is near the mouth area
  const checkWristNearMouth = (wrist: PoseLandmark) => {
    if (!wrist || wrist.visibility === undefined || wrist.visibility < 0.5) return false;
    
    const distanceX = Math.abs(wrist.x - mouthCenterX);
    const distanceY = Math.abs(wrist.y - mouthCenterY);
    
    // Wrist should be close to mouth (within reasonable distance)
    // And wrist should be above the shoulder (hand raised to mouth)
    const isNearMouth = distanceX < 0.15 && distanceY < 0.2;
    
    // Check if wrist is above shoulder (indicating hand raised)
    const avgShoulderY = leftShoulder && rightShoulder
      ? (leftShoulder.y + rightShoulder.y) / 2
      : 0.5;
    const isHandRaised = wrist.y < avgShoulderY + 0.1;
    
    return isNearMouth && isHandRaised;
  };

  // Check both wrists
  const leftHandDrinking = checkWristNearMouth(leftWrist);
  const rightHandDrinking = checkWristNearMouth(rightWrist);

  return leftHandDrinking || rightHandDrinking;
}

export { POSE_CONNECTIONS, POSE_LANDMARKS };

