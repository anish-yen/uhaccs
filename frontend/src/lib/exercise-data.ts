export type MuscleGroup =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "lats"
  | "traps"
  | "lower-back"
  | "upper-back"

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  weight: number
  points: number
  musclesWorked: MuscleGroup[]
  date: string
  category: "strength" | "cardio" | "flexibility"
}

export interface UserStats {
  level: number
  currentXP: number
  nextLevelXP: number
  totalPoints: number
  streak: number
  totalWorkouts: number
  rank: string
}

export const userStats: UserStats = {
  level: 24,
  currentXP: 2750,
  nextLevelXP: 4000,
  totalPoints: 47250,
  streak: 12,
  totalWorkouts: 187,
  rank: "Diamond",
}

export const exercises: Exercise[] = [
  {
    id: "1",
    name: "Bench Press",
    sets: 4,
    reps: 8,
    weight: 185,
    points: 320,
    musclesWorked: ["chest", "triceps", "shoulders"],
    date: "2026-02-06",
    category: "strength",
  },
  {
    id: "2",
    name: "Barbell Squat",
    sets: 5,
    reps: 5,
    weight: 275,
    points: 500,
    musclesWorked: ["quads", "hamstrings", "glutes", "lower-back"],
    date: "2026-02-06",
    category: "strength",
  },
  {
    id: "3",
    name: "Pull-ups",
    sets: 4,
    reps: 10,
    weight: 0,
    points: 280,
    musclesWorked: ["lats", "biceps", "upper-back", "forearms"],
    date: "2026-02-06",
    category: "strength",
  },
  {
    id: "4",
    name: "Overhead Press",
    sets: 3,
    reps: 8,
    weight: 115,
    points: 210,
    musclesWorked: ["shoulders", "triceps", "traps"],
    date: "2026-02-05",
    category: "strength",
  },
  {
    id: "5",
    name: "Deadlift",
    sets: 3,
    reps: 5,
    weight: 315,
    points: 450,
    musclesWorked: ["hamstrings", "glutes", "lower-back", "traps", "forearms"],
    date: "2026-02-05",
    category: "strength",
  },
  {
    id: "6",
    name: "Bicep Curls",
    sets: 3,
    reps: 12,
    weight: 35,
    points: 130,
    musclesWorked: ["biceps", "forearms"],
    date: "2026-02-05",
    category: "strength",
  },
  {
    id: "7",
    name: "Leg Press",
    sets: 4,
    reps: 10,
    weight: 360,
    points: 340,
    musclesWorked: ["quads", "hamstrings", "glutes"],
    date: "2026-02-04",
    category: "strength",
  },
  {
    id: "8",
    name: "Cable Rows",
    sets: 3,
    reps: 12,
    weight: 140,
    points: 200,
    musclesWorked: ["lats", "upper-back", "biceps"],
    date: "2026-02-04",
    category: "strength",
  },
  {
    id: "9",
    name: "Plank Hold",
    sets: 3,
    reps: 1,
    weight: 0,
    points: 150,
    musclesWorked: ["abs", "obliques", "lower-back"],
    date: "2026-02-04",
    category: "strength",
  },
  {
    id: "10",
    name: "Calf Raises",
    sets: 4,
    reps: 15,
    weight: 200,
    points: 180,
    musclesWorked: ["calves"],
    date: "2026-02-03",
    category: "strength",
  },
]

// Calculate muscle activation intensity from exercises
export function getMuscleActivation(
  exerciseList: Exercise[]
): Record<MuscleGroup, number> {
  const activation: Record<MuscleGroup, number> = {
    chest: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    forearms: 0,
    abs: 0,
    obliques: 0,
    quads: 0,
    hamstrings: 0,
    glutes: 0,
    calves: 0,
    lats: 0,
    traps: 0,
    "lower-back": 0,
    "upper-back": 0,
  }

  for (const exercise of exerciseList) {
    for (const muscle of exercise.musclesWorked) {
      activation[muscle] += exercise.points / exercise.musclesWorked.length
    }
  }

  // Normalize to 0-100
  const maxActivation = Math.max(...Object.values(activation), 1)
  for (const key of Object.keys(activation) as MuscleGroup[]) {
    activation[key] = Math.round((activation[key] / maxActivation) * 100)
  }

  return activation
}

export const muscleLabels: Record<MuscleGroup, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  quads: "Quadriceps",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  lats: "Lats",
  traps: "Traps",
  "lower-back": "Lower Back",
  "upper-back": "Upper Back",
}



