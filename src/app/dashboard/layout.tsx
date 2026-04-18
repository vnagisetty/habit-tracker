import { Navbar } from "@/components/navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-6 md:py-8">{children}</main>
    </div>
  )
}
