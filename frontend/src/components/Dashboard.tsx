import { useMemo, useState, useEffect } from "react"
import { Trophy, Zap, Flame, Target, Award, Camera, Loader2, LogOut, User as UserIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { BodyHeatmap } from "@/components/BodyHeatmap"
import { ExerciseList } from "@/components/ExerciseList"
import { WebcamView } from "@/components/WebcamView"
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
  const [checkingDetection, setCheckingDetection] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

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
            const authCheck = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/google`, {
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

  // Check detection status and load data
  useEffect(() => {
    if (checkingAuth) return

    const loadData = async () => {
      try {
        // Check if exercise has been detected
        const detectionResult = await detectionApi.getStatus()
        if (detectionResult.data) {
          setExerciseDetected(detectionResult.data.detected)
        }
        setCheckingDetection(false)

        // Only load data if exercise has been detected
        if (detectionResult.data?.detected) {
          // Load exercises
          const exercisesResult = await exerciseApi.getAll()
          if (exercisesResult.data) {
            setExercises(exercisesResult.data)
          }

          // Load user stats
          const statsResult = await userApi.getStats()
          if (statsResult.data) {
            setUserStats(statsResult.data)
          }
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Poll for detection status changes
    const interval = setInterval(async () => {
      const detectionResult = await detectionApi.getStatus()
      if (detectionResult.data?.detected && !exerciseDetected) {
        setExerciseDetected(true)
        // Reload data when exercise is detected
        const exercisesResult = await exerciseApi.getAll()
        if (exercisesResult.data) {
          setExercises(exercisesResult.data)
        }
        const statsResult = await userApi.getStats()
        if (statsResult.data) {
          setUserStats(statsResult.data)
        }
      }
    }, 2000) // Check every 2 seconds

    return () => clearInterval(interval)
  }, [exerciseDetected, checkingAuth])

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

            {/* XP Progress */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-card border border-border/50 px-4 py-2">
              <Zap className="h-4 w-4 text-accent" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{userStats.currentXP.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">/ {userStats.nextLevelXP.toLocaleString()} XP</span>
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
            <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 px-3 py-2">
              <Flame className="h-4 w-4 text-accent animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Streak</span>
                <span className="text-sm font-bold text-accent">{userStats.streak} days</span>
              </div>
            </div>

            {/* Total Points */}
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border/50 px-3 py-2">
              <Award className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-sm font-bold text-foreground">{userStats.totalPoints.toLocaleString()}</span>
              </div>
            </div>

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
        {checkingDetection || loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : !exerciseDetected ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Camera className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Exercise Detected</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Please go to the Webcam tab and start your camera to detect exercises. 
              Once an exercise is detected, your dashboard data will appear here.
            </p>
            <button
              onClick={() => setActiveTab("webcam")}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <Camera className="h-4 w-4" />
              Go to Webcam
            </button>
          </div>
        ) : activeTab === "dashboard" ? (
          <>
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
        ) : (
          <div className="max-w-4xl mx-auto">
            <WebcamView onExerciseDetected={() => setExerciseDetected(true)} />
          </div>
        )}
      </main>
    </div>
  )
}


