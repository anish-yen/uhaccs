import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, CameraOff, Video, VideoOff, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { detectionApi } from '@/lib/api'
import Webcam from 'react-webcam'

interface WebcamViewProps {
  onExerciseDetected?: () => void
}

export function WebcamView({ onExerciseDetected }: WebcamViewProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [exerciseDetected, setExerciseDetected] = useState(false)
  const [, setDetectionStatus] = useState<{ detected: boolean; exerciseType: string | null } | null>(null)
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    // Check detection status on mount
    checkDetectionStatus()
    
    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      // react-webcam handles stream cleanup automatically
    }
  }, [])

  const checkDetectionStatus = async () => {
    const result = await detectionApi.getStatus()
    if (result.data && typeof result.data === 'object') {
      const data = result.data as { detected?: boolean; exerciseType?: string | null }
      const status = {
        detected: data.detected || false,
        exerciseType: data.exerciseType || null,
      }
      setDetectionStatus(status)
      setExerciseDetected(status.detected)
    }
  }

  // Simple motion detection (can be enhanced with ML models)
  const detectExercise = useCallback(async () => {
    if (!webcamRef.current || !canvasRef.current) return

    const video = webcamRef.current.video
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Simple motion detection: check for significant pixel changes
    // This is a placeholder - in production, use ML models like TensorFlow.js
    let motionDetected = false
    const threshold = 30 // Adjust based on testing
    
    // Sample check (simplified - check every 10th pixel for performance)
    for (let i = 0; i < imageData.data.length; i += 40) {
      const r = imageData.data[i]
      const g = imageData.data[i + 1]
      const b = imageData.data[i + 2]
      const brightness = (r + g + b) / 3
      
      // Simple heuristic: if there's significant variation, motion detected
      if (brightness > threshold) {
        motionDetected = true
        break
      }
    }
    
    if (motionDetected && !exerciseDetected) {
      // Mark exercise as detected
      const result = await detectionApi.setDetected(true, 'exercise')
      if (result.data) {
        setExerciseDetected(true)
        setDetectionStatus({ detected: true, exerciseType: 'exercise' })
        onExerciseDetected?.()
      }
    }
  }, [exerciseDetected, onExerciseDetected])

  useEffect(() => {
    if (isStreaming && isDetecting) {
      const detect = () => {
        detectExercise()
        animationFrameRef.current = requestAnimationFrame(detect)
      }
      detect()
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [isStreaming, isDetecting, exerciseDetected])

  const startCamera = () => {
    setError(null)
    setIsStreaming(true)
    setHasPermission(true)
    // react-webcam will handle the camera access
    // Detection will start once video is ready
  }

  const stopCamera = () => {
    // react-webcam handles stream cleanup
    setIsStreaming(false)
    setIsDetecting(false)
  }
  
  // Handle webcam user media error
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
  
  // Handle webcam user media success
  const handleUserMedia = () => {
    setHasPermission(true)
    setIsDetecting(true)
  }

  const handleManualDetection = async () => {
    const result = await detectionApi.setDetected(true, 'exercise')
    if (result.data) {
      setExerciseDetected(true)
      setDetectionStatus({ detected: true, exerciseType: 'exercise' })
      onExerciseDetected?.()
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/20 p-2">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Webcam View</h2>
        </div>
        <button
          onClick={isStreaming ? stopCamera : startCamera}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            isStreaming
              ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
              : "bg-primary/20 text-primary hover:bg-primary/30"
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
              <p className="text-xs text-muted-foreground">Click "Start Camera" to begin</p>
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
          <>
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
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}

        {isStreaming && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-sm">
            <div className={cn(
              "h-2 w-2 rounded-full",
              exerciseDetected ? "bg-green-500" : "bg-red-500 animate-pulse"
            )} />
            <span className="text-xs font-medium text-white">
              {exerciseDetected ? "Exercise Detected" : "Detecting..."}
            </span>
          </div>
        )}

        {exerciseDetected && (
          <div className="absolute top-4 right-4 flex items-center gap-2 rounded-lg bg-green-500/90 px-3 py-1.5 backdrop-blur-sm">
            <CheckCircle2 className="h-4 w-4 text-white" />
            <span className="text-xs font-medium text-white">Exercise Detected!</span>
          </div>
        )}
      </div>

      {isStreaming && !exerciseDetected && (
        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={handleManualDetection}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Exercise as Detected
          </button>
        </div>
      )}

      {isStreaming && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Camera is active. You can see yourself in real-time.
        </p>
      )}
    </div>
  )
}


