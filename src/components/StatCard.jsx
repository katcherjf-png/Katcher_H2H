export default function StatCard({ label, value, subValue, icon, highlight = false, className = '' }) {
  return (
    <div className={`card p-5 ${highlight ? 'border-gold/50 bg-fairway-800/80' : ''} ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-fairway-300 text-xs font-semibold uppercase tracking-widest leading-tight">{label}</span>
        {icon && <span className="text-2xl leading-none">{icon}</span>}
      </div>
      <div className="font-serif text-3xl font-bold text-gold leading-none mb-1">{value}</div>
      {subValue && <div className="text-fairway-400 text-sm mt-1">{subValue}</div>}
    </div>
  )
}
