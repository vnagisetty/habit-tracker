import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { getCompletionHistory } from "@/lib/sheets"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "7", 10), 1), 365)

  const logs = await getCompletionHistory(session.user.email, days)
  return NextResponse.json(logs)
}
