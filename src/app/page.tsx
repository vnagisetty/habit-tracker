"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold">Habit Tracker</h1>
        <p className="text-muted-foreground">Sign in to track your habits</p>
        <Button onClick={() => signIn("google")}>Sign in with Google</Button>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Habit Tracker</h1>
      <div className="flex flex-col items-center gap-3">
        {session.user?.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "User avatar"}
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <p className="text-lg font-medium">{session.user?.name}</p>
        <p className="text-sm text-muted-foreground">{session.user?.email}</p>
      </div>
      <Button variant="outline" onClick={() => signOut()}>
        Sign out
      </Button>
    </main>
  )
}
