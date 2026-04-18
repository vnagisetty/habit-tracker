import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { SessionProvider } from "@/app/components/session-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Habit Tracker",
  description: "Track your daily habits",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
