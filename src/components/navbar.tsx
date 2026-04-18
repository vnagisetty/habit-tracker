"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/dashboard", label: "Habits" },
  { href: "/dashboard/analytics", label: "Analytics" },
]

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
            pathname === href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          )}
        >
          {label}
        </Link>
      ))}
    </>
  )
}

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      {/* ── Main row ──────────────────────────────────────────────────────── */}
      <div className="container flex h-14 items-center justify-between sm:h-16">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            Habit Tracker
          </span>
          {/* Desktop nav — hidden on mobile */}
          {session?.user && (
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLinks pathname={pathname} />
            </nav>
          )}
        </div>

        {session?.user && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Avatar always visible */}
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            {/* Name only on sm+ */}
            <span className="hidden max-w-[140px] truncate text-sm font-medium sm:inline">
              {session.user.name}
            </span>
            {/* Sign out: icon on mobile, text on desktop */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        )}
      </div>

      {/* ── Mobile-only nav row ────────────────────────────────────────────── */}
      {session?.user && (
        <nav className="container flex h-10 items-center gap-1 border-t sm:hidden">
          <NavLinks pathname={pathname} />
        </nav>
      )}
    </header>
  )
}
