export default function Footer() {
  return (
    <footer className="border-t border-gold/10 bg-fairway-950/80 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-fairway-500 text-sm">
          <span className="text-base">⛳</span>
          <span className="font-serif text-fairway-400">Katcher H2H Golf</span>
        </div>
        <div className="text-fairway-600 text-xs text-center">
          Family Rivalry · Every Round Counts · Play Well
        </div>
        <div className="text-fairway-600 text-xs">
          © {new Date().getFullYear()} Katcher Family
        </div>
      </div>
    </footer>
  )
}
