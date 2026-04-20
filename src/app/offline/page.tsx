export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#111111] text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4ade80]/20">
        <svg
          className="h-8 w-8 text-[#4ade80]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01"
          />
        </svg>
      </div>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="text-sm text-zinc-400">Check your connection and try again.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-[#4ade80] px-4 py-2 text-sm font-semibold text-black"
      >
        Retry
      </button>
    </div>
  )
}
