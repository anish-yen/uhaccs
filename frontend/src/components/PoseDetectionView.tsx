import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, CameraOff, Video, VideoOff, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPoseDetector, drawPose, PoseResult } from '@/lib/pose-detection'
import { poseApi } from '@/lib/api'

interface PoseDetectionViewProps {
  onPoseDetected?: (pose: PoseResult) => void
}

export function PoseDetectionView({ onPoseDetected }: PoseDetectionViewProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [poseResult, setPoseResult] = useState<PoseResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const lastExerciseTypeRef = useRef<string | null>(null)
  const repTrackingRef = useRef<{ count: number; lastType: string | null; lastState: string }>({
    count: 0,
    lastType: null,
    lastState: 'up'
  })
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseDetectorRef = useRef<ReturnType<typeof createPoseDetector> | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (poseDetectorRef.current) {
        poseDetectorRef.current.close()
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      setHasPermission(null)
      setIsLoading(true)
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera API not supported in this browser.')
        setHasPermission(false)
        setIsLoading(false)
        return
      }

      // Mac-compatible video constraints
      // Use more flexible constraints that work better on macOS
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30, min: 15 },
      }
      
      // On Mac, prefer 'user' facing camera (FaceTime camera)
      // But fallback to any available camera if that fails
      try {
        videoConstraints.facingMode = 'user'
      } catch {
        // facingMode might not be supported, continue without it
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      })

      if (videoRef.current) {
        // Mac-specific: Set video element properties before assigning stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('webkit-playsinline', 'true')
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        
        // Assign stream
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsStreaming(true)
        setHasPermission(true)
        
        // Mac/Safari: Force video to load and play
        videoRef.current.load()
        
        // Initialize pose detector (will be done in loadedmetadata handler)
        // Don't await here - let it initialize asynchronously
        
        // Initialize pose detector (async, but don't block video)
        if (!poseDetectorRef.current) {
          createPoseDetector((results) => {
            setPoseResult(results)
            onPoseDetected?.(results)
          }).then((pose) => {
            poseDetectorRef.current = pose
          }).catch((err) => {
            console.warn('Pose detector initialization failed (video will still work):', err)
            // Video will still work without pose detection
          })
        }
        
        // Ensure video plays (Mac/Safari compatible)
        const playVideo = async () => {
          if (videoRef.current) {
            try {
              // Mac/Safari: Ensure video is ready before playing
              if (videoRef.current.readyState < 2) {
                await new Promise((resolve) => {
                  const handler = () => {
                    videoRef.current?.removeEventListener('loadedmetadata', handler)
                    resolve(undefined)
                  }
                  videoRef.current?.addEventListener('loadedmetadata', handler)
                })
              }
              
              const playPromise = videoRef.current.play()
              
              // Mac/Safari: Handle play promise properly
              if (playPromise !== undefined) {
                await playPromise
              }
            } catch (err) {
              console.warn('Video play error:', err)
              // Try again after a short delay (Mac sometimes needs this)
              setTimeout(async () => {
                if (videoRef.current && !videoRef.current.paused) return
                try {
                  await videoRef.current?.play()
                } catch (retryErr) {
                  console.warn('Video play retry error:', retryErr)
                }
              }, 200)
            }
          }
        }
        
        // Wait for video to be ready
        const handleLoadedMetadata = () => {
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            playVideo()
            startPoseDetection()
            setIsLoading(false)
            videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata)
            videoRef.current.removeEventListener('loadeddata', handleLoadedMetadata)
            videoRef.current.removeEventListener('canplay', handleCanPlay)
          }
        }
        
        const handleCanPlay = () => {
          if (videoRef.current) {
            playVideo()
            if (!isLoading) {
              startPoseDetection()
            }
          }
        }
        
        videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
        videoRef.current.addEventListener('loadeddata', handleLoadedMetadata)
        videoRef.current.addEventListener('canplay', handleCanPlay)
        
        // Also check if already loaded
        if (videoRef.current.readyState >= 2) {
          playVideo()
          startPoseDetection()
          setIsLoading(false)
        } else {
          // Start rendering immediately even if video isn't fully loaded
          setTimeout(() => {
            if (videoRef.current && isStreaming) {
              playVideo()
              startPoseDetection()
              setIsLoading(false)
            }
          }, 100)
        }
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setHasPermission(false)
      setIsLoading(false)
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission denied. Please allow camera access in your browser settings.')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found. Please connect a camera device.')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is being used by another application. Please close it and try again.')
        } else {
          setError(`Failed to access camera: ${err.message}`)
        }
      } else {
        setError('Failed to access camera.')
      }
    }
  }

  // Store pose result in a ref so we can access it in the animation loop
  const poseResultRef = useRef<PoseResult | null>(null)
  const lastBackendUpdateRef = useRef<number>(0)
  
  useEffect(() => {
    poseResultRef.current = poseResult
    
    // Send pose data to backend when detected (throttled to every 2 seconds)
    if (poseResult?.detected && poseResult.landmarks.length > 0) {
      const now = Date.now()
      if (now - lastBackendUpdateRef.current > 2000) {
        lastBackendUpdateRef.current = now
        
        poseApi.storePoseData({
          landmarks: poseResult.landmarks,
          exerciseType: poseResult.exerciseType,
          confidence: poseResult.confidence,
          timestamp: new Date().toISOString(),
        }).catch(err => {
          console.warn('Failed to store pose data:', err)
        })
      }
    }
  }, [poseResult])

  const startPoseDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.warn('Video or canvas ref not available')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    
    if (!ctx) {
      console.error('Could not get canvas context')
      return
    }

    // Set initial canvas size (will be updated when video loads)
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 640
      canvas.height = 480
    }

    // Function to update canvas size based on video dimensions
    const updateCanvasSize = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        return true
      }
      return false
    }

    // Initial size update attempt
    updateCanvasSize()

    const detect = async () => {
      // Ensure video is playing
      if (video.paused && video.readyState >= video.HAVE_METADATA) {
        video.play().catch(err => {
          console.warn('Video play error in loop:', err)
        })
      }

      // Try to update canvas size
      const hasValidSize = updateCanvasSize()

      // Draw video frame if we have valid dimensions or if video is loading
      if (hasValidSize && video.readyState >= video.HAVE_CURRENT_DATA) {
        // Draw video frame
        ctx.save()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Send frame to pose detector if available
        if (poseDetectorRef.current && video.readyState >= video.HAVE_CURRENT_DATA) {
          try {
            await poseDetectorRef.current.send({ image: video })
          } catch (err) {
            // Silently fail - pose detection is optional
          }
        }
        
        // Draw pose landmarks if available (using ref to get latest value)
        const currentPose = poseResultRef.current
        if (currentPose?.landmarks && currentPose.landmarks.length > 0) {
          try {
            drawPose(ctx, currentPose.landmarks, canvas.width, canvas.height)
          } catch (err) {
            // Silently fail - pose drawing is optional
          }
        }
        
        ctx.restore()
      } else {
        // Video not ready yet, show loading message
        ctx.save()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#fff'
        ctx.font = '16px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('Loading video...', canvas.width / 2, canvas.height / 2)
        ctx.restore()
      }
      
      animationFrameRef.current = requestAnimationFrame(detect)
    }
    
    // Start the detection loop
    detect()
  }, [])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (poseDetectorRef.current) {
      poseDetectorRef.current.close()
      poseDetectorRef.current = null
    }
    setIsStreaming(false)
    setPoseResult(null)
    setSessionStartTime(null)
    
    // Send final analysis if we have data
    if (repCount > 0 && sessionStartTime) {
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000)
      const lastPose = poseResultRef.current
      
      if (lastPose?.exerciseType) {
        poseApi.storeAnalysis({
          exerciseType: lastPose.exerciseType,
          formScore: lastPose.confidence ? Math.floor(lastPose.confidence * 100) : 75,
          repCount: repCount,
          duration: duration,
          quality: lastPose.confidence && lastPose.confidence > 0.8 ? 'excellent' : 'good',
          feedback: [],
          landmarks: lastPose.landmarks || [],
        }).catch(err => {
          console.warn('Failed to store final pose analysis:', err)
        })
      }
    }
  }

  useEffect(() => {
    if (isStreaming && videoRef.current && canvasRef.current) {
      // Small delay to ensure video element is fully set up
      const timer = setTimeout(() => {
        if (videoRef.current && canvasRef.current && isStreaming) {
          startPoseDetection()
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isStreaming, startPoseDetection])

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/20 p-2">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Pose Detection</h2>
        </div>
        <button
          onClick={isStreaming ? stopCamera : startCamera}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            isStreaming
              ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
              : "bg-primary/20 text-primary hover:bg-primary/30",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading...
            </>
          ) : isStreaming ? (
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
              <p className="text-xs text-muted-foreground">Click "Start Camera" to begin pose detection</p>
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
          <div className="relative h-full w-full bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="hidden"
              style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
              onLoadedMetadata={() => {
                // Mac: Ensure video starts playing
                if (videoRef.current) {
                  videoRef.current.play().catch(err => {
                    console.warn('Video play error on loadedmetadata:', err)
                  })
                }
              }}
              onCanPlay={() => {
                // Mac: Play when video can play
                if (videoRef.current && videoRef.current.paused) {
                  videoRef.current.play().catch(err => {
                    console.warn('Video play error on canplay:', err)
                  })
                }
              }}
              onPlay={() => {
                // Mac: Video started playing successfully
                console.log('Video started playing')
              }}
              onError={(e) => {
                console.error('Video element error:', e)
                setError('Video playback error. Please try refreshing the page.')
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ 
                width: '100%', 
                height: '100%',
                display: 'block',
                backgroundColor: '#000',
                objectFit: 'cover'
              }}
            />
          </div>
        )}

        {isStreaming && poseResult && (
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 rounded-lg bg-black/70 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                poseResult.detected ? "bg-green-500" : "bg-red-500 animate-pulse"
              )} />
              <span className="text-xs font-medium text-white">
                {poseResult.detected ? "Pose Detected" : "No Pose Detected"}
              </span>
            </div>
            {poseResult.detected && (
              <>
                {poseResult.exerciseType && (
                  <div className="text-xs text-white">
                    <span className="text-muted-foreground">Exercise: </span>
                    <span className="font-semibold capitalize">{poseResult.exerciseType.replace('-', ' ')}</span>
                  </div>
                )}
                {poseResult.confidence !== undefined && (
                  <div className="text-xs text-white">
                    <span className="text-muted-foreground">Confidence: </span>
                    <span className="font-semibold">{(poseResult.confidence * 100).toFixed(1)}%</span>
                  </div>
                )}
                <div className="text-xs text-white">
                  <span className="text-muted-foreground">Landmarks: </span>
                  <span className="font-semibold">{poseResult.landmarks.length}</span>
                </div>
                {repCount > 0 && (
                  <div className="text-xs text-white">
                    <span className="text-muted-foreground">Reps: </span>
                    <span className="font-semibold">{repCount}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {isStreaming && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Real-time pose detection active. Your pose landmarks are displayed on the video.
        </p>
      )}
    </div>
  )
}

