"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { HabitCard } from "./_components/habit-card"
import { AddHabitDialog } from "./_components/add-habit-dialog"
import type { Habit, HabitLog } from "@/lib/sheets"

// ─── skeleton card shown during initial load ──────────────────────────────────

function HabitCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#1a1a1a] p-4 shadow-md space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-3/5 bg-zinc-800" />
          <Skeleton className="h-3 w-1/4 rounded-full bg-zinc-800" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full bg-zinc-800" />
      </div>
      {/* Calendar grid skeleton */}
      <div className="space-y-1">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-md bg-zinc-800" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, row) => (
          <div key={row} className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-md bg-zinc-800" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Sparkles className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No habits yet</p>
        <p className="text-sm text-muted-foreground">
          Add your first habit to start tracking your progress.
        </p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus className="mr-1.5 h-4 w-4" />
        Add your first habit
      </Button>
    </div>
  )
}

// ─── dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Optimistic completions: Set of "habitId|date" keys added before server confirms
  const [optimistic, setOptimistic] = useState<Set<string>>(new Set())

  // Merged completion keys (server + optimistic) used by every HabitCard
  const completionKeys = useMemo(() => {
    const keys = new Set(logs.map((l) => `${l.habitId}|${l.date}`))
    optimistic.forEach((k) => keys.add(k))
    return keys
  }, [logs, optimistic])

  // Derived counts for the header summary
  const today = new Date().toLocaleDateString("en-CA")
  const completedToday = habits.filter((h) => completionKeys.has(`${h.id}|${today}`)).length

  // ── data fetching ────────────────────────────────────────────────────────────

  async function fetchData() {
    setLoading(true)
    setFetchError(null)
    try {
      const [habitsRes, historyRes] = await Promise.all([
        fetch("/api/habits"),
        fetch("/api/habits/history?days=30"),
      ])
      if (!habitsRes.ok || !historyRes.ok) throw new Error("Failed to load data")
      const [habitsData, historyData] = await Promise.all([
        habitsRes.json() as Promise<Habit[]>,
        historyRes.json() as Promise<HabitLog[]>,
      ])
      setHabits(habitsData)
      setLogs(historyData)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // ── actions ──────────────────────────────────────────────────────────────────

  async function handleComplete(habitId: string, date: string) {
    const key = `${habitId}|${date}`
    setOptimistic((prev) => { const next = new Set(prev); next.add(key); return next })
    try {
      const res = await fetch(`/api/habits/${habitId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) throw new Error("Failed to log completion")
      const historyRes = await fetch("/api/habits/history?days=30")
      if (historyRes.ok) setLogs(await historyRes.json())
    } catch {
      setOptimistic((prev) => { const next = new Set(prev); next.delete(key); return next })
    }
  }

  async function handleUncomplete(habitId: string, date: string) {
    const key = `${habitId}|${date}`
    // Optimistic removal — remove from both server logs and optimistic set
    setLogs((prev) => prev.filter((l) => !(l.habitId === habitId && l.date === date)))
    setOptimistic((prev) => { const next = new Set(prev); next.delete(key); return next })
    try {
      const res = await fetch(`/api/habits/${habitId}/complete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) throw new Error("Failed to remove completion")
      const historyRes = await fetch("/api/habits/history?days=30")
      if (historyRes.ok) setLogs(await historyRes.json())
    } catch {
      // Revert: re-fetch to restore correct state
      const historyRes = await fetch("/api/habits/history?days=30")
      if (historyRes.ok) setLogs(await historyRes.json())
    }
  }

  async function handleAddHabit(name: string, category: string) {
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? "Failed to add habit")
    }
    const newHabit: Habit = await res.json()
    setHabits((prev) => [...prev, newHabit])
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today&apos;s Habits</h1>
          {!loading && habits.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {completedToday} of {habits.length} completed
            </p>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Habit
        </Button>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {fetchError}{" "}
          <button onClick={fetchData} className="underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      {/* Habit grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <HabitCardSkeleton key={i} />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              completionKeys={completionKeys}
              logs={logs}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
            />
          ))}
        </div>
      )}

      <AddHabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAddHabit}
      />
    </div>
  )
}
