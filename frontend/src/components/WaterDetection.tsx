import { useState, useEffect } from 'react'
import { Droplet, DropletIcon, Zap, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { waterApi, type WaterDetectionData } from '@/lib/api'

interface WaterDetectionProps {
  onWaterDetected?: () => void
}

export function WaterDetection({ onWaterDetected }: WaterDetectionProps) {
  const [waterCount, setWaterCount] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const [isLogging, setIsLogging] = useState(false)
  const [todayHistory, setTodayHistory] = useState<WaterDetectionData[]>([])

  // Load water history on mount
  useEffect(() => {
    const loadHistory = async () => {
      const result = await waterApi.getHistory(100)
      if (result.data) {
        const today = new Date().toISOString().split('T')[0]
        const todayDrinks = result.data.filter(item => {
          const itemDate = new Date(item.timestamp).toISOString().split('T')[0]
          return itemDate === today
        })
        setTodayHistory(todayDrinks)
        setWaterCount(todayDrinks.length)
      }
    }
    loadHistory()
  }, [])

  const handleLogWater = async () => {
    if (isLogging) return
    
    setIsLogging(true)
    try {
      const result = await waterApi.logManual()
      if (result.data) {
        const newCount = waterCount + 1
        setWaterCount(newCount)
        
        // Show popup
        setShowPopup(true)
        setTimeout(() => setShowPopup(false), 2000)
        
        // Add to today's history
        if (result.data.data) {
          setTodayHistory(prev => [result.data.data!, ...prev])
        }
        
        // Notify parent
        onWaterDetected?.()
      }
    } catch (error) {
      console.error('Failed to log water:', error)
    } finally {
      setIsLogging(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-500/20 p-2">
            <Droplet className="h-5 w-5 text-blue-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Water Intake</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Today: <span className="font-bold text-foreground">{waterCount}</span> glasses
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Water Logging Button */}
        <button
          onClick={handleLogWater}
          disabled={isLogging}
          className={cn(
            "w-full flex items-center justify-center gap-3 rounded-lg px-6 py-4 text-sm font-medium transition-all",
            "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "shadow-lg hover:shadow-xl"
          )}
        >
          {isLogging ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Logging...</span>
            </>
          ) : (
            <>
              <DropletIcon className="h-5 w-5" />
              <span>Log Water Intake</span>
              <Zap className="h-4 w-4" />
              <span className="text-xs opacity-90">+10 XP</span>
            </>
          )}
        </button>

        {/* Water Completion Popup */}
        {showPopup && (
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
                <CheckCircle2 className="h-12 w-12 text-white animate-pulse" />
                <div className="flex flex-col">
                  <h3 className="text-3xl font-bold text-white">Water Logged!</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Zap className="h-5 w-5 text-yellow-300" />
                    <span className="text-xl font-semibold text-yellow-300">+10 XP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Water History */}
        {todayHistory.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground mb-2">Today's Intake</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {todayHistory.slice(0, 10).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs text-muted-foreground bg-secondary/30 rounded px-2 py-1"
                >
                  <div className="flex items-center gap-2">
                    <Droplet className="h-3 w-3 text-blue-500" />
                    <span>
                      {new Date(item.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  {item.manual && (
                    <span className="text-xs opacity-70">Manual</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hydration Goal Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Daily Goal</span>
            <span>{waterCount} / 8 glasses</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${Math.min((waterCount / 8) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

