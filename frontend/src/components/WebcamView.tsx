import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, CameraOff, Video, VideoOff, Zap, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Webcam from 'react-webcam'
import { createPoseDetector, SquatDetector } from '@/lib/pose-detection'
import { userApi } from '@/lib/api'
import type { UserStats } from '@/lib/exercise-data'

interface WebcamViewProps {
  onExerciseDetected?: () => void
}

export function WebcamView({ onExerciseDetected }: WebcamViewProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [repCount, setRepCount] = useState(0)
  const [angle, setAngle] = useState<number | null>(null)
  const [formScore, setFormScore] = useState(0)
  const [isDown, setIsDown] = useState(false)
  const [showSquatPopup, setShowSquatPopup] = useState(false)

  const webcamRef = useRef<Webcam>(null)
  const animationFrameRef = useRef<number | null>(null)
  const poseDetectorRef = useRef<any>(null)
  const squatDetectorRef = useRef(new SquatDetector())
  const poseBusyRef = useRef(false)

  // Initialize Pose once when camera starts (in handleUserMedia)
  const initPose = useCallback(() => {
    if (poseDetectorRef.current) return
    createPoseDetector((results) => {
      if (!results.detected || !results.landmarks?.length) return
      const squat = squatDetectorRef.current.detect(results.landmarks)
      setAngle(squat.angle)
      setFormScore(squat.formScore)
      setIsDown(squat.isDown)
      if (squat.repIncrement > 0) {
        setRepCount((c) => c + squat.repIncrement)
        // Show popup and award XP
        setShowSquatPopup(true)
        setTimeout(() => setShowSquatPopup(false), 2000)
        
        // Award +10 XP
        userApi.getStats().then((statsResult) => {
          if (statsResult.data) {
            const stats = statsResult.data as UserStats
            const currentXP = stats.currentXP || 0
            const totalPoints = stats.totalPoints || 0
            userApi.updateStats({
              ...stats,
              currentXP: currentXP + 10,
              totalPoints: totalPoints + 10,
            }).catch(err => {
              console.warn('Failed to update XP:', err)
            })
          }
        }).catch(err => {
          console.warn('Failed to get stats for XP update:', err)
        })
        
        onExerciseDetected?.()
      }
    })
      .then((pose) => {
        poseDetectorRef.current = pose
      })
      .catch((err) => {
        console.warn('Pose detector init failed:', err)
      })
  }, [onExerciseDetected])

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
              <span className="text-sm font-medium text-white">Reps: {repCount}</span>
              <span className="text-sm text-white/80">
                Angle: {angle != null ? `${Math.round(angle)}°` : '--'}
              </span>
              <span className="text-sm text-white/80">Form: {formScore}</span>
              <span className={cn('text-xs font-medium', isDown ? 'text-amber-400' : 'text-white/80')}>
                {isDown ? 'Down' : 'Up'}
              </span>
            </div>
          </div>
        )}

        {/* Squat Completion Popup */}
        {showSquatPopup && (
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
                  <h3 className="text-3xl font-bold text-white">Squat Complete!</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Zap className="h-5 w-5 text-yellow-300" />
                    <span className="text-xl font-semibold text-yellow-300">+10 XP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isStreaming && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Squats are counted automatically. Go below ~90° then stand up to ~160° to count a rep.
        </p>
      )}
    </div>
  )
}
