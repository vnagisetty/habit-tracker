import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { getHabits, addHabit } from "@/lib/sheets"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const habits = await getHabits(session.user.email)
  return NextResponse.json(habits)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name, category } = body as { name?: string; category?: string }

  if (!name?.trim() || !category?.trim()) {
    return NextResponse.json({ error: "name and category are required" }, { status: 400 })
  }

  const habit = await addHabit(session.user.email, name.trim(), category.trim())
  return NextResponse.json(habit, { status: 201 })
}
