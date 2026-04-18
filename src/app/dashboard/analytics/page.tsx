"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Flame,
  TrendingUp,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Habit, HabitLog } from "@/lib/sheets"

// ─── date helpers ─────────────────────────────────────────────────────────────

function toLocalDateStr(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA") // YYYY-MM-DD in local timezone
}

function shiftDays(date: Date, delta: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + delta)
  return d
}

// ─── analytics computations ──────────────────────────────────────────────────

function calcCurrentStreak(habitId: string, logs: HabitLog[]): number {
  const done = new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date))
  const today = toLocalDateStr()
  // Don't reset streak at midnight if today isn't logged yet
  const startOffset = done.has(today) ? 0 : 1
  let streak = 0
  for (let i = startOffset; ; i++) {
    if (done.has(toLocalDateStr(shiftDays(new Date(), -i)))) streak++
    else break
  }
  return streak
}

function calcBestStreak(habitId: string, logs: HabitLog[]): number {
  const dates = Array.from(
    new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date))
  ).sort()

  if (dates.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < dates.length; i++) {
    const diffMs = new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()
    const diffDays = Math.round(diffMs / 86_400_000)
    if (diffDays === 1) {
      run++
      if (run > best) best = run
    } else {
      run = 1
    }
  }
  return best
}

function calcOverallRate(habits: Habit[], logs: HabitLog[], days: number): number {
  if (habits.length === 0) return 0
  const cutoff = toLocalDateStr(shiftDays(new Date(), -(days - 1)))
  const completed = new Set(
    logs.filter((l) => l.date >= cutoff).map((l) => `${l.habitId}|${l.date}`)
  ).size
  return Math.round((completed / (habits.length * days)) * 100)
}

// ─── heatmap data ─────────────────────────────────────────────────────────────

interface HeatDay {
  date: string
  count: number
}

function buildHeatmapDays(logs: HabitLog[]): (HeatDay | null)[] {
  const countByDate = new Map<string, number>()
  logs.forEach((l) =>
    countByDate.set(l.date, (countByDate.get(l.date) ?? 0) + 1)
  )

  const today = new Date()
  const days: HeatDay[] = Array.from({ length: 90 }, (_, i) => {
    const d = shiftDays(today, -(89 - i))
    const date = toLocalDateStr(d)
    return { date, count: countByDate.get(date) ?? 0 }
  })

  // Pad the front to align column start to Sunday (getDay() === 0)
  const startDow = shiftDays(today, -89).getDay()
  return [...Array<null>(startDow).fill(null), ...days]
}

// Color scale: 5 levels, safe static classes for Tailwind's JIT scanner
const HEAT_CLASSES = [
  "bg-gray-100",   // 0 — no activity
  "bg-green-200",  // 1 — low
  "bg-green-400",  // 2 — medium
  "bg-green-600",  // 3 — high
  "bg-green-800",  // 4 — max
] as const

function heatClass(count: number, maxPerDay: number): string {
  if (count === 0 || maxPerDay === 0) return HEAT_CLASSES[0]
  const level = Math.ceil((count / maxPerDay) * (HEAT_CLASSES.length - 1))
  return HEAT_CLASSES[Math.min(level, HEAT_CLASSES.length - 1)]
}

// ─── bar chart data ───────────────────────────────────────────────────────────

function build14DayBars(logs: HabitLog[]) {
  const today = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const d = shiftDays(today, -(13 - i))
    const date = toLocalDateStr(d)
    return {
      date,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: logs.filter((l) => l.date === date).length,
    }
  })
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
    </div>
  )
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
      {sub && <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{sub}</p>}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Guard recharts from SSR — "use client" pages still hydrate server-side
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const [hRes, lRes] = await Promise.all([
          fetch("/api/habits"),
          fetch("/api/habits/history?days=90"),
        ])
        if (!hRes.ok || !lRes.ok) throw new Error("Failed to load data")
        const [habitsData, logsData]: [Habit[], HabitLog[]] = await Promise.all([
          hRes.json(),
          lRes.json(),
        ])
        setHabits(habitsData)
        setLogs(logsData)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── derived data ─────────────────────────────────────────────────────────────

  const completionRate30 = useMemo(
    () => calcOverallRate(habits, logs, 30),
    [habits, logs]
  )

  const totalCompletions90 = useMemo(
    () => new Set(logs.map((l) => `${l.habitId}|${l.date}`)).size,
    [logs]
  )

  const habitStreaks = useMemo(
    () =>
      habits
        .map((h) => ({
          habit: h,
          current: calcCurrentStreak(h.id, logs),
          best: calcBestStreak(h.id, logs),
        }))
        .sort((a, b) => b.current - a.current || b.best - a.best),
    [habits, logs]
  )

  const topBestStreak = Math.max(0, ...habitStreaks.map((s) => s.best))

  const heatmapDays = useMemo(() => buildHeatmapDays(logs), [logs])
  const barData = useMemo(() => build14DayBars(logs), [logs])
  const todayStr = toLocalDateStr()
  const maxPerDay = habits.length

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Your habit performance overview
          </p>
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : fetchError ? (
        <p className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {fetchError}
        </p>
      ) : (
        <>
          {/* ── Stat cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="30-day rate"
              value={`${completionRate30}%`}
              sub="of all possible completions"
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Total done"
              value={totalCompletions90}
              sub="completions in 90 days"
            />
            <StatCard
              icon={<Flame className="h-4 w-4" />}
              label="Best streak"
              value={topBestStreak > 0 ? `${topBestStreak}d` : "—"}
              sub="consecutive days"
            />
            <StatCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Habits"
              value={habits.length}
              sub="being tracked"
            />
          </div>

          {/* ── 90-day heatmap ───────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-sm font-semibold">
              90-Day Activity Heatmap
            </h2>
            <div className="overflow-x-auto rounded-xl border bg-card p-3 shadow-sm sm:p-4">
              <div className="flex min-w-max gap-1">
                {/* Day-of-week labels (show alternate rows like GitHub) */}
                <div className="flex flex-col gap-0.5 select-none pr-1 text-[9px] text-muted-foreground">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={i} className="flex h-3 items-center">
                      {i % 2 !== 0 ? d : ""}
                    </div>
                  ))}
                </div>

                {/* CSS grid: 7 rows, auto columns — exactly the GitHub layout */}
                <div
                  className="grid gap-0.5"
                  style={{
                    gridTemplateRows: "repeat(7, minmax(0, 1fr))",
                    gridAutoFlow: "column",
                    gridAutoColumns: "minmax(0, 12px)",
                  }}
                >
                  {heatmapDays.map((day, i) => (
                    <div
                      key={i}
                      title={
                        day
                          ? `${day.date}: ${day.count} of ${maxPerDay} completed`
                          : undefined
                      }
                      className={cn(
                        "h-3 w-3 rounded-sm transition-colors duration-150",
                        day ? heatClass(day.count, maxPerDay) : "invisible"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Less</span>
                {HEAT_CLASSES.map((cls, i) => (
                  <div key={i} className={cn("h-3 w-3 rounded-sm", cls)} />
                ))}
                <span>More</span>
              </div>
            </div>
          </section>

          {/* ── 14-day bar chart ─────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-sm font-semibold">
              Daily Completions — Last 14 Days
            </h2>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              {mounted ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={barData}
                    barSize={14}
                    margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", radius: 4 }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                        padding: "6px 10px",
                      }}
                      formatter={(v: number) => [v, "Habits completed"]}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.date === todayStr
                              ? "hsl(var(--primary))"
                              : "hsl(142 71% 45%)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-[220px] w-full" />
              )}
            </div>
          </section>

          {/* ── Per-habit streaks table ──────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-sm font-semibold">Streaks by Habit</h2>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {habitStreaks.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No habits yet — add one from the dashboard.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                        Habit
                      </th>
                      <th className="hidden px-4 py-2.5 text-center font-medium text-muted-foreground sm:table-cell">
                        Category
                      </th>
                      <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">
                        Current streak
                      </th>
                      <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">
                        Best streak
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {habitStreaks.map(({ habit, current, best }, i) => (
                      <tr
                        key={habit.id}
                        className={cn(
                          "border-b last:border-0 transition-colors",
                          i % 2 === 1 && "bg-muted/20"
                        )}
                      >
                        <td className="px-4 py-3 font-medium">{habit.name}</td>
                        <td className="hidden px-4 py-3 text-center text-xs text-muted-foreground sm:table-cell">
                          {habit.category}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {current > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-orange-600">
                              <Flame className="h-3.5 w-3.5" />
                              {current}d
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {best > 0 ? (
                            <span className="font-semibold text-green-600">
                              {best}d
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
