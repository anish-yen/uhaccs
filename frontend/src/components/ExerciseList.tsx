import { Trophy, Zap } from 'lucide-react'
import type { Exercise } from '@/lib/exercise-data'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ExerciseListProps {
  exercises: Exercise[]
}

export function ExerciseList({ exercises }: ExerciseListProps) {
  const groupedExercises = exercises.reduce((acc, exercise) => {
    const date = exercise.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(exercise)
    return acc
  }, {} as Record<string, Exercise[]>)

  const sortedDates = Object.keys(groupedExercises).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="space-y-4">
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm font-medium text-foreground">No exercises yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start your fitness journey!</p>
        </div>
      ) : (
        sortedDates.map((date) => (
          <div key={date} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold text-muted-foreground">
                {format(new Date(date), 'MMMM d, yyyy')}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            {groupedExercises[date].map((exercise) => (
              <div
                key={exercise.id}
                className="group relative rounded-lg border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/50 hover:bg-card/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{exercise.name}</h3>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        exercise.category === "strength" && "bg-primary/20 text-primary",
                        exercise.category === "cardio" && "bg-accent/20 text-accent",
                        exercise.category === "flexibility" && "bg-blue-500/20 text-blue-400"
                      )}>
                        {exercise.category}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>{exercise.sets} sets</span>
                      <span>×</span>
                      <span>{exercise.reps} reps</span>
                      {exercise.weight > 0 && (
                        <>
                          <span>×</span>
                          <span>{exercise.weight} lbs</span>
                        </>
                      )}
                    </div>

                    {exercise.musclesWorked.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {exercise.musclesWorked.map((muscle) => (
                          <span
                            key={muscle}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground"
                          >
                            {muscle}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-bold text-primary">{exercise.points}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">points</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}



