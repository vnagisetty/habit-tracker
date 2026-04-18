"use client"

import { Check, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Habit, HabitLog } from "@/lib/sheets"

// ─── helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA") // YYYY-MM-DD in local timezone
}

export function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return toLocalDateStr(d)
  })
}

export function calcStreak(habitId: string, logs: HabitLog[]): number {
  const done = new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date))
  const today = toLocalDateStr()
  let streak = 0
  // If today isn't done yet, start counting from yesterday so an unbroken
  // streak doesn't reset at midnight before the user logs.
  const startOffset = done.has(today) ? 0 : 1
  for (let i = startOffset; ; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (done.has(toLocalDateStr(d))) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// ─── sub-components ───────────────────────────────────────────────────────────

function CircularCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={checked ? "Mark incomplete" : "Mark complete"}
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked
          ? "border-green-500 bg-green-500 shadow-md shadow-green-200"
          : "border-gray-300 bg-white hover:border-green-400"
      )}
    >
      <Check
        strokeWidth={3}
        className={cn(
          "h-4 w-4 text-white transition-all duration-200",
          checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )}
      />
    </button>
  )
}

const DAY_LABELS = ["6d", "5d", "4d", "3d", "2d", "1d", "T"]

function WeeklyHeatmap({
  habitId,
  completionKeys,
  last7Days,
}: {
  habitId: string
  completionKeys: Set<string>
  last7Days: string[]
}) {
  return (
    <div className="flex items-end gap-1">
      {last7Days.map((date, i) => {
        const done = completionKeys.has(`${habitId}|${date}`)
        const isToday = i === 6
        return (
          <div key={date} className="flex flex-col items-center gap-0.5">
            <div
              title={date}
              className={cn(
                "h-5 w-5 rounded-sm transition-colors duration-300",
                done
                  ? "bg-green-500"
                  : isToday
                    ? "bg-gray-200 ring-1 ring-gray-400 ring-offset-1"
                    : "bg-gray-200"
              )}
            />
            <span className="text-[9px] text-muted-foreground">{DAY_LABELS[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── HabitCard ────────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit
  completionKeys: Set<string>
  logs: HabitLog[]
  last7Days: string[]
  onComplete: (habitId: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  Health: "bg-emerald-100 text-emerald-700",
  Learning: "bg-blue-100 text-blue-700",
  Fitness: "bg-purple-100 text-purple-700",
  Mindfulness: "bg-amber-100 text-amber-700",
  Other: "bg-gray-100 text-gray-700",
}

export function HabitCard({ habit, completionKeys, logs, last7Days, onComplete }: HabitCardProps) {
  const today = toLocalDateStr()
  const isCompletedToday = completionKeys.has(`${habit.id}|${today}`)
  const streak = calcStreak(habit.id, logs)
  const categoryColor = CATEGORY_COLORS[habit.category] ?? CATEGORY_COLORS.Other

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-all duration-300",
        isCompletedToday && "border-green-200 bg-green-50/50"
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <CircularCheckbox checked={isCompletedToday} onToggle={() => onComplete(habit.id)} />

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-semibold transition-colors",
              isCompletedToday && "text-muted-foreground line-through"
            )}
          >
            {habit.name}
          </p>
          <span
            className={cn(
              "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
              categoryColor
            )}
          >
            {habit.category}
          </span>
        </div>

        {streak > 0 && (
          <Badge variant="streak" className="shrink-0">
            <Flame className="h-3 w-3" />
            {streak}
          </Badge>
        )}
      </div>

      {/* Weekly heatmap */}
      <div className="mt-4">
        <WeeklyHeatmap
          habitId={habit.id}
          completionKeys={completionKeys}
          last7Days={last7Days}
        />
      </div>
    </div>
  )
}
