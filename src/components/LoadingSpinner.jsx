export default function LoadingSpinner({ fullPage = false }) {
  const inner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-fairway-700 border-t-gold animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-xl">⛳</div>
      </div>
      <span className="text-fairway-400 text-sm font-medium">Loading…</span>
    </div>
  )
  if (fullPage) {
    return <div className="min-h-screen flex items-center justify-center">{inner}</div>
  }
  return <div className="py-16 flex items-center justify-center">{inner}</div>
}
