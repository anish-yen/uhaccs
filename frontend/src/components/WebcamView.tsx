import { useState, useRef, useEffect } from 'react'
import { Camera, CameraOff, Video, VideoOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function WebcamView() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsStreaming(true)
        setHasPermission(true)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setHasPermission(false)
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission denied. Please allow camera access.')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found. Please connect a camera device.')
        } else {
          setError('Failed to access camera. Please try again.')
        }
      } else {
        setError('Failed to access camera.')
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
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
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}

        {isStreaming && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-medium text-white">Recording</span>
          </div>
        )}
      </div>

      {isStreaming && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Camera is active. You can see yourself in real-time.
        </p>
      )}
    </div>
  )
}

