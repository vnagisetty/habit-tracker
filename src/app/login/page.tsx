"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    console.log("button clicked")
    setError(null)
    setLoading(true)
    try {
      const result = await signIn("google", { callbackUrl, redirect: false })
      console.log("signIn result:", result)
      if (result?.error) {
        setError(result.error)
      } else if (result?.url) {
        window.location.href = result.url
      }
    } catch (err) {
      console.log("signIn error:", err)
      setError(err instanceof Error ? err.message : "Unknown error during sign in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={handleSignIn} disabled={loading}>
        {loading ? "Redirecting…" : "Sign in with Google"}
      </Button>
      {error && (
        <p className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold">Habit Tracker</h1>
        <p className="text-muted-foreground">Sign in to continue</p>
      </div>
      <Suspense fallback={<Button disabled>Sign in with Google</Button>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
