import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, CameraOff, Video, VideoOff, Zap, CheckCircle2, Droplet } from 'lucide-react'
import { cn } from '@/lib/utils'
import Webcam from 'react-webcam'
import { createPoseDetector, SquatDetector, PushupDetector, detectWaterDrinking } from '@/lib/pose-detection'
import { verificationApi } from '@/lib/api'

export type ExerciseType = 'squat' | 'pushup'

interface WebcamViewProps {
  onExerciseDetected?: () => void
  onRepComplete?: (exerciseType: ExerciseType, repCount: number) => void
  exerciseType?: ExerciseType
  onExerciseTypeChange?: (type: ExerciseType) => void
}

export function WebcamView({ 
  onExerciseDetected, 
  onRepComplete,
  exerciseType = 'squat',
  onExerciseTypeChange 
}: WebcamViewProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [repCount, setRepCount] = useState(0)
  const [angle, setAngle] = useState<number | null>(null)
  const [formScore, setFormScore] = useState(0)
  const [isDown, setIsDown] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [showCompletionPopup, setShowCompletionPopup] = useState(false)
  const [showWaterPopup, setShowWaterPopup] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const waterDetectionCooldownRef = useRef<number>(0)

  const webcamRef = useRef<Webcam>(null)
  const animationFrameRef = useRef<number | null>(null)
  const poseDetectorRef = useRef<any>(null)
  const squatDetectorRef = useRef(new SquatDetector())
  const pushupDetectorRef = useRef(new PushupDetector())
  const poseBusyRef = useRef(false)

  // Initialize Pose once when camera starts (in handleUserMedia)
  const initPose = useCallback(() => {
    if (poseDetectorRef.current) return
    createPoseDetector((results) => {
      if (!results.detected || !results.landmarks?.length) return
      
      // Check for water drinking first (independent of exercise type)
      const now = Date.now()
      if (now - waterDetectionCooldownRef.current > 3000) { // 3 second cooldown
        const waterDetected = detectWaterDrinking(results.landmarks)
        if (waterDetected) {
          waterDetectionCooldownRef.current = now
          
          // Show blue water popup
          setShowWaterPopup(true)
          setTimeout(() => setShowWaterPopup(false), 2000)
          
          // Send to backend and award points
          verificationApi.verify({
            type: 'water',
            verified: true,
          }).then(result => {
            if (result.data) {
              setPointsEarned(result.data.points_awarded)
              onExerciseDetected?.() // Refresh stats
            }
          }).catch(err => {
            console.warn('Failed to log water detection:', err)
          })
        }
      }
      
      // Use appropriate detector based on exercise type
      const detector = exerciseType === 'pushup' 
        ? pushupDetectorRef.current 
        : squatDetectorRef.current
      
      const detection = detector.detect(results.landmarks)
      
      setAngle(detection.angle)
      setFormScore(detection.formScore)
      setIsDown(detection.isDown)
      setStatus(detection.status || '')
      
      if (detection.repIncrement > 0) {
        const newRepCount = repCount + detection.repIncrement
        setRepCount(newRepCount)
        
        // Call verification endpoint to award points
        verificationApi.verify({
          type: 'exercise',
          verified: true,
        }).then(result => {
          if (result.data) {
            setPointsEarned(result.data.points_awarded)
          }
        }).catch(err => {
          console.warn('Failed to verify exercise:', err)
        })
        
        // Show popup
        setShowCompletionPopup(true)
        setTimeout(() => setShowCompletionPopup(false), 2000)
        
        // Notify parent component
        onRepComplete?.(exerciseType, newRepCount)
        onExerciseDetected?.()
      }
    })
      .then((pose) => {
        poseDetectorRef.current = pose
      })
      .catch((err) => {
        console.warn('Pose detector init failed:', err)
      })
  }, [exerciseType, repCount, onExerciseDetected, onRepComplete])

  const loop = useCallback(() => {
    const video = webcamRef.current?.video
    const pose = poseDetectorRef.current
    
    if (!video || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(loop)
      return
    }
    
    if (!pose) {
      animationFrameRef.current = requestAnimationFrame(loop)
      return
    }
    
    if (poseBusyRef.current) {
      animationFrameRef.current = requestAnimationFrame(loop)
      return
    }
    poseBusyRef.current = true
    pose
      .send({ image: video })
      .then(() => {
        poseBusyRef.current = false
      })
      .catch(() => {
        poseBusyRef.current = false
      })
    animationFrameRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    if (!isStreaming) return
    loop()
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isStreaming, loop])

  const startCamera = () => {
    setError(null)
    setIsStreaming(true)
    setHasPermission(true)
  }

  const stopCamera = () => {
    setIsStreaming(false)
    poseDetectorRef.current = null
    setRepCount(0) // Reset rep count when stopping
  }

  const handleUserMediaError = (error: string | DOMException) => {
    console.error('Webcam error:', error)
    setHasPermission(false)
    setIsStreaming(false)
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera device.')
      } else {
        setError(`Failed to access camera: ${error.message}`)
      }
    } else {
      setError('Failed to access camera.')
    }
  }

  const handleUserMedia = () => {
    setHasPermission(true)
    initPose()
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/20 p-2">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Exercise Detection</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Exercise Type Selector */}
          <div className="flex items-center gap-1 rounded-lg bg-card border border-border/50 p-1">
            <button
              onClick={() => onExerciseTypeChange?.('squat')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                exerciseType === 'squat'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Squat
            </button>
            <button
              onClick={() => onExerciseTypeChange?.('pushup')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                exerciseType === 'pushup'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Pushup
            </button>
          </div>
          <button
            onClick={isStreaming ? stopCamera : startCamera}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              isStreaming
                ? 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                : 'bg-primary/20 text-primary hover:bg-primary/30'
            )}
          >
            {isStreaming ? (
              <>
                <VideoOff className="h-4 w-4" />
                Stop Camera
              </>
            ) : (
              <>
                <Video className="h-4 w-4" />
                Start Camera
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-secondary/20">
        {!isStreaming && hasPermission === null && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
            <CameraOff className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-foreground">Camera Not Active</p>
              <p className="text-xs text-muted-foreground">Click &quot;Start Camera&quot; to begin</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center p-4">
            <CameraOff className="h-16 w-16 text-destructive/50" />
            <div>
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Make sure your camera is connected and permissions are granted
              </p>
            </div>
          </div>
        )}

        {isStreaming && (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              facingMode: 'user',
              frameRate: { ideal: 30, min: 15 },
            }}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            className="h-full w-full object-cover"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            mirrored={true}
          />
        )}

        {isStreaming && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 rounded-lg bg-black/70 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {exerciseType === 'squat' && angle != null && (
                <span className="text-sm text-white/80">
                  Angle: {Math.round(angle)}°
                </span>
              )}
              {exerciseType === 'pushup' && status && (
                <span className="text-sm text-white/80 capitalize">
                  {status}
                </span>
              )}
              <span className="text-sm text-white/80">Form: {formScore}</span>
              <span className={cn('text-xs font-medium', isDown ? 'text-amber-400' : 'text-white/80')}>
                {isDown ? 'Down' : 'Up'}
              </span>
            </div>
          </div>
        )}

        {/* Exercise Completion Popup */}
        {showCompletionPopup && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div 
              className={cn(
                "flex flex-col items-center justify-center gap-4 rounded-2xl bg-green-500/95 backdrop-blur-md px-8 py-6 shadow-2xl",
                "border-4 border-green-400"
              )}
              style={{
                animation: 'popup 0.3s ease-out',
              }}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-12 w-12 text-white animate-pulse" />
                <div className="flex flex-col">
                  <h3 className="text-3xl font-bold text-white">
                    {exerciseType === 'squat' ? 'Squat' : 'Pushup'} Complete!
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Zap className="h-5 w-5 text-yellow-300" />
                    <span className="text-xl font-semibold text-yellow-300">
                      {pointsEarned > 0 ? `+${pointsEarned} XP` : '+25 XP'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Water Detection Popup */}
        {showWaterPopup && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div 
              className={cn(
                "flex flex-col items-center justify-center gap-4 rounded-2xl bg-blue-500/95 backdrop-blur-md px-8 py-6 shadow-2xl",
                "border-4 border-blue-400"
              )}
              style={{
                animation: 'popup 0.3s ease-out',
              }}
            >
              <div className="flex items-center gap-3">
                <Droplet className="h-12 w-12 text-white animate-pulse" />
                <div className="flex flex-col">
                  <h3 className="text-3xl font-bold text-white">Water Detected!</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Zap className="h-5 w-5 text-yellow-300" />
                    <span className="text-xl font-semibold text-yellow-300">
                      {pointsEarned > 0 ? `+${pointsEarned} XP` : '+10 XP'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isStreaming && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {exerciseType === 'squat' 
            ? 'Squats are counted automatically. Go below ~90° then stand up to ~160° to count a rep.'
            : 'Pushups are counted automatically. Lower your body down and push back up to count a rep.'}
        </p>
      )}
    </div>
  )
}
