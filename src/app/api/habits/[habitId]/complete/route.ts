import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { logHabitCompletion, removeCompletion, getHabits } from "@/lib/sheets"

export async function POST(
  req: Request,
  { params }: { params: { habitId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const date: string = body.date ?? new Date().toLocaleDateString("en-CA")

  // Verify the habit belongs to this user before logging
  const habits = await getHabits(session.user.email)
  const owned = habits.some((h) => h.id === params.habitId)
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await logHabitCompletion(session.user.email, params.habitId, date)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: Request,
  { params }: { params: { habitId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const date: string = body.date ?? new Date().toLocaleDateString("en-CA")

  const habits = await getHabits(session.user.email)
  const owned = habits.some((h) => h.id === params.habitId)
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await removeCompletion(session.user.email, params.habitId, date)
  return NextResponse.json({ ok: true })
}
