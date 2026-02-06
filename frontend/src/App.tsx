import { useMemo, useState } from "react"
import { Trophy, Zap, Flame, Target, Award, Camera } from "lucide-react"
import { BodyHeatmap } from "@/components/BodyHeatmap"
import { ExerciseList } from "@/components/ExerciseList"
import { WebcamView } from "@/components/WebcamView"
import { exercises, userStats, getMuscleActivation } from "@/lib/exercise-data"

function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "webcam">("dashboard")
  const activation = useMemo(() => getMuscleActivation(exercises), [])

  const todayPoints = exercises
    .filter(e => e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + e.points, 0)

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
        {activeTab === "dashboard" ? (
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
            <WebcamView />
          </div>
        )}
      </main>
    </div>
  )
}

export default App

