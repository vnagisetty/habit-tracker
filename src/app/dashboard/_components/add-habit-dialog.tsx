"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CATEGORIES = ["Health", "Learning", "Fitness", "Mindfulness", "Other"] as const

interface AddHabitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string, category: string) => Promise<void>
}

export function AddHabitDialog({ open, onOpenChange, onAdd }: AddHabitDialogProps) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName("")
      setCategory("")
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !category) return
    setSubmitting(true)
    setError(null)
    try {
      await onAdd(name.trim(), category)
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add habit")
    } finally {
      setSubmitting(false)
    }
  }

  const valid = name.trim().length > 0 && category.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Habit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="habit-name">Name</Label>
            <Input
              id="habit-name"
              placeholder="e.g. Read for 20 minutes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="habit-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="habit-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || submitting}>
              {submitting ? "Adding…" : "Add Habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
