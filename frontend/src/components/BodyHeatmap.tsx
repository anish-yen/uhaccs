import { useState, useMemo } from "react"
import type { MuscleGroup } from "@/lib/exercise-data"
import { muscleLabels } from "@/lib/exercise-data"
import { cn } from "@/lib/utils"

interface BodyHeatmapProps {
  activation: Record<MuscleGroup, number>
}

type Gender = "male" | "female"
type View = "front" | "back"

interface MusclePoint {
  id: MuscleGroup
  label: string
  x: number
  y: number
  radius: number
}

// Heatmap color functions
function getHeatColor(intensity: number): string {
  if (intensity === 0) return "transparent"
  if (intensity < 20) return "hsla(142, 70%, 45%, 0.3)"
  if (intensity < 40) return "hsla(142, 70%, 45%, 0.5)"
  if (intensity < 60) return "hsla(80, 60%, 50%, 0.6)"
  if (intensity < 80) return "hsla(38, 92%, 50%, 0.7)"
  return "hsla(0, 72%, 50%, 0.8)"
}

function getGlowColor(intensity: number): string {
  if (intensity === 0) return "transparent"
  if (intensity < 20) return "hsla(142, 70%, 45%, 0.4)"
  if (intensity < 40) return "hsla(142, 70%, 45%, 0.5)"
  if (intensity < 60) return "hsla(80, 60%, 50%, 0.6)"
  if (intensity < 80) return "hsla(38, 92%, 50%, 0.7)"
  return "hsla(0, 72%, 50%, 0.8)"
}

// Muscle point positions for front view (percentage-based for responsive scaling)
const frontMusclePoints: MusclePoint[] = [
  { id: "shoulders", label: "Shoulders", x: 30, y: 18, radius: 8 },
  { id: "shoulders", label: "Shoulders", x: 70, y: 18, radius: 8 },
  { id: "chest", label: "Chest", x: 50, y: 28, radius: 12 },
  { id: "biceps", label: "Biceps", x: 28, y: 35, radius: 7 },
  { id: "biceps", label: "Biceps", x: 72, y: 35, radius: 7 },
  { id: "triceps", label: "Triceps", x: 32, y: 38, radius: 6 },
  { id: "triceps", label: "Triceps", x: 68, y: 38, radius: 6 },
  { id: "forearms", label: "Forearms", x: 26, y: 48, radius: 6 },
  { id: "forearms", label: "Forearms", x: 74, y: 48, radius: 6 },
  { id: "abs", label: "Abs", x: 50, y: 42, radius: 8 },
  { id: "obliques", label: "Obliques", x: 40, y: 45, radius: 6 },
  { id: "obliques", label: "Obliques", x: 60, y: 45, radius: 6 },
  { id: "quads", label: "Quadriceps", x: 42, y: 65, radius: 10 },
  { id: "quads", label: "Quadriceps", x: 58, y: 65, radius: 10 },
  { id: "calves", label: "Calves", x: 40, y: 85, radius: 8 },
  { id: "calves", label: "Calves", x: 60, y: 85, radius: 8 },
]

// Muscle point positions for back view
const backMusclePoints: MusclePoint[] = [
  { id: "traps", label: "Traps", x: 50, y: 15, radius: 10 },
  { id: "shoulders", label: "Shoulders", x: 30, y: 18, radius: 8 },
  { id: "shoulders", label: "Shoulders", x: 70, y: 18, radius: 8 },
  { id: "upper-back", label: "Upper Back", x: 50, y: 28, radius: 12 },
  { id: "lats", label: "Lats", x: 35, y: 35, radius: 8 },
  { id: "lats", label: "Lats", x: 65, y: 35, radius: 8 },
  { id: "lower-back", label: "Lower Back", x: 50, y: 45, radius: 10 },
  { id: "triceps", label: "Triceps", x: 28, y: 38, radius: 6 },
  { id: "triceps", label: "Triceps", x: 72, y: 38, radius: 6 },
  { id: "forearms", label: "Forearms", x: 26, y: 48, radius: 6 },
  { id: "forearms", label: "Forearms", x: 74, y: 48, radius: 6 },
  { id: "glutes", label: "Glutes", x: 45, y: 55, radius: 8 },
  { id: "glutes", label: "Glutes", x: 55, y: 55, radius: 8 },
  { id: "hamstrings", label: "Hamstrings", x: 42, y: 70, radius: 9 },
  { id: "hamstrings", label: "Hamstrings", x: 58, y: 70, radius: 9 },
  { id: "calves", label: "Calves", x: 40, y: 85, radius: 8 },
  { id: "calves", label: "Calves", x: 60, y: 85, radius: 8 },
]

export function BodyHeatmap({ activation }: BodyHeatmapProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null)
  const [view, setView] = useState<View>("front")
  const [gender, setGender] = useState<Gender>("male")

  const musclePoints = useMemo(
    () => (view === "front" ? frontMusclePoints : backMusclePoints),
    [view]
  )

  return (
    <div className="flex flex-col items-center gap-4">
      {/* View and Gender Toggles */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
          <button
            type="button"
            onClick={() => setView("front")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
              view === "front"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setView("back")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
              view === "back"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Back
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
          <button
            type="button"
            onClick={() => setGender("male")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
              gender === "male"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Male
          </button>
          <button
            type="button"
            onClick={() => setGender("female")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
              gender === "female"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Female
          </button>
        </div>
      </div>

      {/* Body Image with Heatmap Overlay */}
      <div className="relative h-[420px] w-[300px]">
        {/* Fallback SVG body outline */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border border-border bg-secondary/10">
          <svg viewBox="0 0 100 100" className="h-full w-full opacity-30">
            <ellipse cx="50" cy="15" rx="8" ry="10" fill="currentColor" />
            <path
              d="M 50 25 Q 40 25 38 35 Q 35 45 38 55 Q 35 65 35 75 Q 33 85 35 95 L 45 95 Q 47 85 47 75 Q 47 65 50 55 Q 53 65 53 75 Q 53 85 55 95 L 65 95 Q 67 85 65 75 Q 65 65 62 55 Q 65 45 62 35 Q 60 25 50 25 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <p className="mt-2 px-2 text-xs text-muted-foreground text-center">
            {`${gender.charAt(0).toUpperCase() + gender.slice(1)} ${view.charAt(0).toUpperCase() + view.slice(1)} View`}
          </p>
        </div>

        {/* Heatmap Circles Overlay */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {musclePoints.map((point, index) => {
            const intensity = activation[point.id]
            const isHovered = hoveredMuscle === point.id
            const radius = point.radius * (1 + intensity / 100)
            const color = getHeatColor(intensity)
            const glowColor = getGlowColor(intensity)

            return (
              <circle
                key={`${point.id}-${index}`}
                cx={point.x}
                cy={point.y}
                r={radius}
                fill={color}
                stroke={isHovered ? "hsl(0, 0%, 90%)" : "transparent"}
                strokeWidth={isHovered ? 2 : 0}
                opacity={intensity > 0 ? 0.9 : 0}
                className="cursor-pointer transition-all duration-200"
                style={{
                  filter: intensity > 0 ? `drop-shadow(0 0 ${radius * 0.3}px ${glowColor})` : "none",
                }}
                onMouseEnter={() => setHoveredMuscle(point.id)}
                onMouseLeave={() => setHoveredMuscle(null)}
              />
            )
          })}
        </svg>

        {/* Tooltip */}
        {hoveredMuscle && (
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-2 rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
            <p className="text-sm font-semibold text-foreground">
              {muscleLabels[hoveredMuscle]}
            </p>
            <p className="text-xs text-muted-foreground">
              Activation: {activation[hoveredMuscle]}%
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {[
          { label: "Low", color: "hsl(142, 70%, 45%)" },
          { label: "Medium", color: "hsl(80, 60%, 50%)" },
          { label: "High", color: "hsl(38, 92%, 50%)" },
          { label: "Max", color: "hsl(0, 72%, 50%)" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}



