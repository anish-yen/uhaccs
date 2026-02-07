import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { Trophy, Zap, Flame, Target, Award, Camera, Loader2, LogOut, User as UserIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { BodyHeatmap } from "@/components/BodyHeatmap"
import { ExerciseList } from "@/components/ExerciseList"
import { WebcamView, type ExerciseType } from "@/components/WebcamView"
import { WaterDetection } from "@/components/WaterDetection"
import { getMuscleActivation, type Exercise, type UserStats } from "@/lib/exercise-data"
import { exerciseApi, userApi, detectionApi } from "@/lib/api"
import { getCurrentUser, logout, type User } from "@/lib/auth"

export function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"dashboard" | "webcam">("dashboard")
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [userStats, setUserStats] = useState<UserStats>({
    level: 1,
    currentXP: 0,
    nextLevelXP: 1000,
    totalPoints: 0,
    streak: 0,
    totalWorkouts: 0,
    rank: "Bronze",
  })
  const [loading, setLoading] = useState(true)
  const [exerciseDetected, setExerciseDetected] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [sessionReps, setSessionReps] = useState(0)
  const [exerciseType, setExerciseType] = useState<ExerciseType>('squat')
  const wsRef = useRef<WebSocket | null>(null)
  const [statsFlash, setStatsFlash] = useState(false)
  const [lastPointsEarned, setLastPointsEarned] = useState(0)
  const prevTotalPointsRef = useRef(0)

  // Flash the header stats when totalPoints changes
  useEffect(() => {
    if (prevTotalPointsRef.current > 0 && userStats.totalPoints > prevTotalPointsRef.current) {
      const diff = userStats.totalPoints - prevTotalPointsRef.current
      setLastPointsEarned(diff)
      setStatsFlash(true)
      const timer = setTimeout(() => {
        setStatsFlash(false)
        setLastPointsEarned(0)
      }, 2000)
      prevTotalPointsRef.current = userStats.totalPoints
      return () => clearTimeout(timer)
    }
    prevTotalPointsRef.current = userStats.totalPoints
  }, [userStats.totalPoints])

  // Helper to refresh stats from backend
  const refreshStats = useCallback(async () => {
    try {
      const statsResult = await userApi.getStats()
      console.log('📊 Stats fetched:', statsResult)
      if (statsResult.data) {
        setUserStats(statsResult.data as UserStats)
      }
    } catch (_e) { console.error('Stats fetch error:', _e) }
  }, [])
  
  // Refresh stats periodically — always, not just when exercise detected
  useEffect(() => {
    // Initial fetch right away
    refreshStats()
    // Then poll every 3 seconds
    const interval = setInterval(refreshStats, 3000)
    return () => clearInterval(interval)
  }, [refreshStats])

  // ── WebSocket: real-time score updates from backend ──
  useEffect(() => {
    // WebSocket connects directly to the backend (not through Vite proxy)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const WS_URL = import.meta.env.VITE_WS_URL || `${wsProtocol}//localhost:3001`

    let ws: WebSocket
    let reconnectTimer: ReturnType<typeof setTimeout>

    const connect = () => {
      ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('🔌 WebSocket connected')
        ws.send(JSON.stringify({ type: 'register', userId: 1 }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'score_update') {
            const tp = data.totalPoints ?? 0
            const newLevel = Math.floor(tp / 1000) + 1
            const xpInLevel = tp % 1000
            const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']
            const rankIdx = Math.min(Math.floor((newLevel - 1) / 5), ranks.length - 1)

            setUserStats(prev => ({
              ...prev,
              totalPoints: tp,
              streak: data.streakCount ?? prev.streak,
              level: newLevel,
              currentXP: xpInLevel,
              nextLevelXP: 1000,
              rank: ranks[rankIdx],
            }))
          }

          if (data.type === 'user_stats') {
            setUserStats(prev => ({ ...prev, ...data.stats }))
          }
        } catch (e) {
          console.error('WebSocket parse error:', e)
        }
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected, reconnecting in 3s...')
        reconnectTimer = setTimeout(connect, 3000)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer)
      wsRef.current = null
      if (ws && ws.readyState === WebSocket.OPEN) ws.close()
    }
  }, [])

  const activation = useMemo(() => getMuscleActivation(exercises), [exercises])

  const todayPoints = exercises
    .filter(e => e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + e.points, 0)

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
        } else {
          // Check if OAuth is configured by trying the auth endpoint
          try {
            const authCheck = await fetch(`/api/auth/google`, {
              method: 'HEAD',
              credentials: 'include',
            })
            // If endpoint exists and OAuth is configured, redirect to login
            if (authCheck.status === 200 || authCheck.status === 302) {
              navigate('/login')
              return
            }
          } catch {
            // Backend not running or OAuth not configured - continue without auth
          }
        }
      } catch (error) {
        // Network error - backend might not be running
        console.warn('Auth check failed:', error)
      } finally {
        setCheckingAuth(false)
      }
    }
    checkAuth()
  }, [navigate])

  // Load initial data
  useEffect(() => {
    if (checkingAuth) return

    const loadData = async () => {
      try {
        // Always load user stats from backend
        const statsResult = await userApi.getStats()
        if (statsResult.data) {
          setUserStats(statsResult.data as UserStats)
        }

        // Check if exercise has been detected (for history)
        const detectionResult = await detectionApi.getStatus()
        if (detectionResult.data) {
          setExerciseDetected((detectionResult.data as { detected: boolean }).detected)
        }

        // Load exercises if available
        const exercisesResult = await exerciseApi.getAll()
        if (exercisesResult.data) {
          setExercises(exercisesResult.data as Exercise[])
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [checkingAuth])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Gamified Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                FitQuest
              </h1>
              <p className="text-xs text-muted-foreground">Level {userStats.level} • {userStats.rank}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* User Info */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl bg-card border border-border/50 px-3 py-2">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.displayName || user.email}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <UserIcon className="h-3 w-3 text-primary" />
                  </div>
                )}
                <span className="text-xs text-muted-foreground hidden md:inline">
                  {user.displayName || user.email}
                </span>
              </div>
            )}

            {/* XP Progress — always visible */}
            <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 transition-all duration-500 ${
              statsFlash 
                ? 'bg-accent/30 border-accent shadow-lg shadow-accent/20 scale-105' 
                : 'bg-card border-border/50'
            }`}>
              <Zap className={`h-4 w-4 ${statsFlash ? 'text-yellow-400 animate-bounce' : 'text-accent'}`} />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{userStats.currentXP.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">/ {userStats.nextLevelXP.toLocaleString()} XP</span>
                  {statsFlash && lastPointsEarned > 0 && (
                    <span className="text-xs font-bold text-green-400 animate-bounce">+{lastPointsEarned}</span>
                  )}
                </div>
                <div className="h-1.5 w-32 rounded-full bg-secondary overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{ width: `${(userStats.currentXP / userStats.nextLevelXP) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Streak */}
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-500 ${
              statsFlash
                ? 'bg-accent/30 border-accent shadow-lg shadow-accent/20 scale-105'
                : 'bg-gradient-to-r from-accent/20 to-accent/10 border-accent/30'
            }`}>
              <Flame className={`h-4 w-4 text-accent ${statsFlash ? 'animate-bounce' : 'animate-pulse'}`} />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Streak</span>
                <span className="text-sm font-bold text-accent">{userStats.streak}</span>
              </div>
            </div>

            {/* Total Points */}
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-500 ${
              statsFlash
                ? 'bg-primary/30 border-primary shadow-lg shadow-primary/20 scale-105'
                : 'bg-card border-border/50'
            }`}>
              <Award className={`h-4 w-4 text-primary ${statsFlash ? 'animate-bounce' : ''}`} />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-sm font-bold text-foreground">{userStats.totalPoints.toLocaleString()}</span>
              </div>
            </div>

            {/* Session Reps */}
            {sessionReps > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/20 border border-primary/30 px-3 py-2">
                <Target className="h-4 w-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Session Reps</span>
                  <span className="text-sm font-bold text-primary">{sessionReps}</span>
                </div>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-card border border-border/50 px-3 py-2 hover:bg-card/80 transition-all"
              title="Logout"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <div className="flex items-center gap-2 rounded-lg bg-card/50 border border-border/50 p-1 w-fit">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "dashboard"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Target className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("webcam")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "webcam"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="h-4 w-4" />
            Webcam
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeTab === "webcam" ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <WebcamView 
              onExerciseDetected={async () => {
                setExerciseDetected(true)
                // Mark detection on backend so it persists
                detectionApi.setDetected(true, exerciseType)
                // Refresh user stats from backend (small delay for DB write)
                setTimeout(refreshStats, 300)
              }}
              onRepComplete={async (_type, repCount) => {
                setSessionReps(repCount)
                // Refresh stats from backend (small delay for DB write)
                setTimeout(refreshStats, 300)
              }}
              exerciseType={exerciseType}
              onExerciseTypeChange={(type) => {
                setExerciseType(type)
                setSessionReps(0) // Reset reps when changing exercise type
              }}
            />
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : activeTab === "dashboard" ? (
          <>
            {/* Water Detection Card */}
            <div className="mb-6">
              <WaterDetection 
                onWaterDetected={async () => {
                  // Small delay to ensure DB write completes, then refresh
                  setTimeout(refreshStats, 300)
                }}
              />
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Workouts</p>
                    <p className="text-2xl font-bold text-foreground">{userStats.totalWorkouts}</p>
                  </div>
                  <div className="rounded-lg bg-primary/20 p-2">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Level</p>
                    <p className="text-2xl font-bold text-foreground">{userStats.level}</p>
                  </div>
                  <div className="rounded-lg bg-accent/20 p-2">
                    <Trophy className="h-5 w-5 text-accent" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rank</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{userStats.rank}</p>
                  </div>
                  <div className="rounded-lg bg-primary/20 p-2">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Today's Points</p>
                    <p className="text-2xl font-bold text-foreground">{todayPoints}</p>
                  </div>
                  <div className="rounded-lg bg-accent/20 p-2">
                    <Zap className="h-5 w-5 text-accent" />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column - Exercise List */}
              <div className="lg:col-span-5">
                <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-xl">
                  <div className="mb-6 flex items-center gap-2">
                    <div className="rounded-lg bg-primary/20 p-2">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Exercise History</h2>
                  </div>
                  <div className="max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                    <ExerciseList exercises={exercises} />
                  </div>
                </div>
              </div>

              {/* Right Column - Body Heatmap */}
              <div className="lg:col-span-7">
                <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-xl">
                  <div className="mb-6 flex items-center gap-2">
                    <div className="rounded-lg bg-accent/20 p-2">
                      <Flame className="h-5 w-5 text-accent" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Muscle Activation Heatmap</h2>
                  </div>
                  <BodyHeatmap activation={activation} />
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}


