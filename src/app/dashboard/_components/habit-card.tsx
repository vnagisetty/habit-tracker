"use client"

import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Habit, HabitLog } from "@/lib/sheets"

// ─── helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA") // YYYY-MM-DD in local timezone
}

function buildMonthDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function calcStreak(habitId: string, logs: HabitLog[]): number {
  const done = new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date))
  const today = toLocalDateStr()
  const startOffset = done.has(today) ? 0 : 1
  let streak = 0
  for (let i = startOffset; ; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (done.has(toLocalDateStr(d))) streak++
    else break
  }
  return streak
}

// ─── MonthCalendar ────────────────────────────────────────────────────────────

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

function MonthCalendar({
  habitId,
  completionKeys,
  onComplete,
  onUncomplete,
}: {
  habitId: string
  completionKeys: Set<string>
  onComplete: (habitId: string, date: string) => void
  onUncomplete: (habitId: string, date: string) => void
}) {
  const today = new Date()
  const todayStr = toLocalDateStr(today)
  const year = today.getFullYear()
  const month = today.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay() // 0 = Sunday

  // Flat list: null = empty padding cell, number = day of month
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      {/* Month label */}
      <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
        {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </p>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DOW_LABELS.map((d, i) => (
          <div
            key={i}
            className="flex h-5 items-center justify-center text-[10px] font-medium text-zinc-600"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />

          const dateStr = buildMonthDateStr(year, month, day)
          const isToday = dateStr === todayStr
          const isFuture = dateStr > todayStr
          const isCompleted = completionKeys.has(`${habitId}|${dateStr}`)

          return (
            <button
              key={i}
              disabled={isFuture}
              onClick={
                isFuture
                  ? undefined
                  : isCompleted
                  ? () => onUncomplete(habitId, dateStr)
                  : () => onComplete(habitId, dateStr)
              }
              title={dateStr}
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-md text-[11px] font-semibold transition-all duration-150",
                // Completed days — green fill
                isCompleted && !isToday && "bg-[#4ade80] text-black",
                // Today + completed — green fill with white ring
                isCompleted && isToday &&
                  "bg-[#4ade80] text-black ring-2 ring-white ring-offset-1 ring-offset-[#1a1a1a]",
                // Today, not yet done — green outline only
                !isCompleted && isToday &&
                  "ring-2 ring-[#4ade80] text-white hover:bg-zinc-700",
                // Past missed days
                !isCompleted && !isToday && !isFuture &&
                  "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300",
                // Future days
                isFuture && "bg-zinc-900 text-zinc-700 cursor-default",
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── HabitCard ────────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit
  completionKeys: Set<string>
  logs: HabitLog[]
  onComplete: (habitId: string, date: string) => void
  onUncomplete: (habitId: string, date: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  Health: "bg-emerald-900/50 text-emerald-400",
  Learning: "bg-blue-900/50 text-blue-400",
  Fitness: "bg-purple-900/50 text-purple-400",
  Mindfulness: "bg-amber-900/50 text-amber-400",
  Other: "bg-zinc-700 text-zinc-300",
}

export function HabitCard({ habit, completionKeys, logs, onComplete, onUncomplete }: HabitCardProps) {
  const today = toLocalDateStr()
  const isCompletedToday = completionKeys.has(`${habit.id}|${today}`)
  const streak = calcStreak(habit.id, logs)
  const categoryColor = CATEGORY_COLORS[habit.category] ?? CATEGORY_COLORS.Other

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#1a1a1a] p-4 shadow-md transition-all duration-300">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            className={cn(
              "truncate text-sm font-semibold text-white transition-colors",
              isCompletedToday && "text-zinc-400 line-through"
            )}
          >
            {habit.name}
          </h3>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
              categoryColor
            )}
          >
            {habit.category}
          </span>
        </div>

        {streak > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-900/40 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
            <Flame className="h-3 w-3" />
            {streak}
          </span>
        )}
      </div>

      {/* Monthly calendar grid */}
      <MonthCalendar
        habitId={habit.id}
        completionKeys={completionKeys}
        onComplete={onComplete}
        onUncomplete={onUncomplete}
      />
    </div>
  )
}
