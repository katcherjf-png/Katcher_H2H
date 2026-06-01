import { useEffect, useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend, Cell,
} from 'recharts'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/LoadingSpinner'
import StatCard from '../components/StatCard'

function getDisplayName(p) {
  if (!p) return 'Player'
  if (p.display_preference === 'nickname' && p.nickname) return p.nickname
  if (p.display_preference === 'both' && p.nickname) return `${p.full_name} "${p.nickname}"`
  return p.full_name || 'Player'
}

function pct(num, total) {
  if (!total) return '0.0'
  return ((num / total) * 100).toFixed(1)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-fairway-900 border border-gold/30 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-gold font-semibold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name}: {p.value}{typeof p.value === 'number' && p.name.includes('%') ? '%' : ''}
        </p>
      ))}
    </div>
  )
}

export default function Stats() {
  const [rounds, setRounds] = useState([])
  const [courses, setCourses] = useState([])
  const [players, setPlayers] = useState([null, null])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const [r, c, p] = await Promise.all([
        supabase.from('rounds').select('*').order('date', { ascending: true }),
        supabase.from('courses').select('*'),
        supabase.from('profiles').select('*').eq('is_player', true).order('player_number'),
      ])
      if (r.data) setRounds(r.data)
      if (c.data) setCourses(c.data)
      if (p.data) {
        const arr = [null, null]
        p.data.forEach(pl => { if (pl.player_number === 1) arr[0] = pl; if (pl.player_number === 2) arr[1] = pl })
        setPlayers(arr)
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  const [player1, player2] = players
  const p1Name = getDisplayName(player1)
  const p2Name = getDisplayName(player2)

  const stats = useMemo(() => {
    if (!rounds.length) return null
    // Record rounds = rounds that count toward the H2H record
    const recordRounds = rounds.filter(r => !r.exclude_from_record)
    const total  = recordRounds.length
    const p1Wins = recordRounds.filter(r => r.result === 'player1_win').length
    const p2Wins = recordRounds.filter(r => r.result === 'player2_win').length
    const draws  = recordRounds.filter(r => r.result === 'draw').length

    // Side bets (record rounds only)
    const bets      = recordRounds.filter(r => r.side_bet && r.side_bet !== 'none')
    const betP1W    = bets.filter(r => r.side_bet === 'player1_win').length
    const betP2W    = bets.filter(r => r.side_bet === 'player2_win').length
    const betDraws  = bets.filter(r => r.side_bet === 'draw').length

    // 9 vs 18 — record rounds for win counts, all rounds for averages
    const nine   = recordRounds.filter(r => r.holes === 9)
    const eight  = recordRounds.filter(r => r.holes === 18)
    const allNine  = rounds.filter(r => r.holes === 9)
    const allEight = rounds.filter(r => r.holes === 18)

    // Streak (record rounds only)
    const sorted = [...recordRounds].sort((a, b) => new Date(b.date) - new Date(a.date))
    let curStreak = 0, curIsP1 = null, longestP1 = 0, longestP2 = 0
    let tmpP1 = 0, tmpP2 = 0
    if (sorted[0]?.result !== 'draw') {
      const target = sorted[0].result
      curIsP1 = target === 'player1_win'
      for (const r of sorted) { if (r.result === target) curStreak++; else break }
    }
    let tmpStreak = 0, tmpStreakIsP1 = null
    for (const r of sorted) {
      if (r.result === 'draw') { tmpStreak = 0; tmpStreakIsP1 = null; continue }
      const isP1 = r.result === 'player1_win'
      if (tmpStreakIsP1 === null || tmpStreakIsP1 !== isP1) { tmpStreak = 1; tmpStreakIsP1 = isP1 }
      else tmpStreak++
      if (isP1 && tmpStreak > longestP1) longestP1 = tmpStreak
      if (!isP1 && tmpStreak > longestP2) longestP2 = tmpStreak
    }

    // Score averages — all rounds (including excluded), split by 9/18
    const p1Avg   = rounds.length ? (rounds.reduce((s, r) => s + r.player1_score, 0) / rounds.length).toFixed(1) : '0.0'
    const p2Avg   = rounds.length ? (rounds.reduce((s, r) => s + r.player2_score, 0) / rounds.length).toFixed(1) : '0.0'
    const p1Avg18 = allEight.length ? (allEight.reduce((s, r) => s + r.player1_score, 0) / allEight.length).toFixed(1) : null
    const p2Avg18 = allEight.length ? (allEight.reduce((s, r) => s + r.player2_score, 0) / allEight.length).toFixed(1) : null
    const p1Avg9  = allNine.length  ? (allNine.reduce((s, r)  => s + r.player1_score, 0) / allNine.length).toFixed(1)  : null
    const p2Avg9  = allNine.length  ? (allNine.reduce((s, r)  => s + r.player2_score, 0) / allNine.length).toFixed(1)  : null

    // Milestones — all rounds (best score is best score regardless of record status)
    const diffs = rounds.map(r => ({ diff: Math.abs(r.player1_score - r.player2_score), round: r }))
    const closest = diffs.reduce((a, b) => (a.diff <= b.diff ? a : b), diffs[0])
    const blowout = diffs.reduce((a, b) => (a.diff >= b.diff ? a : b), diffs[0])
    const p1Best   = rounds.reduce((a, b) => (a.player1_score <= b.player1_score ? a : b))
    const p2Best   = rounds.reduce((a, b) => (a.player2_score <= b.player2_score ? a : b))
    const p1Best18 = allEight.length ? allEight.reduce((a, b) => (a.player1_score <= b.player1_score ? a : b)) : null
    const p2Best18 = allEight.length ? allEight.reduce((a, b) => (a.player2_score <= b.player2_score ? a : b)) : null
    const p1Best9  = allNine.length  ? allNine.reduce((a, b)  => (a.player1_score <= b.player1_score ? a : b)) : null
    const p2Best9  = allNine.length  ? allNine.reduce((a, b)  => (a.player2_score <= b.player2_score ? a : b)) : null

    // Course breakdown
    const courseMap = {}
    courses.forEach(c => { courseMap[c.id] = c.name })
    const courseData = {}
    recordRounds.forEach(r => {
      const name = courseMap[r.course_id] || 'Unknown'
      if (!courseData[name]) courseData[name] = { name, p1W: 0, p2W: 0, d: 0, total: 0 }
      courseData[name].total++
      if (r.result === 'player1_win') courseData[name].p1W++
      else if (r.result === 'player2_win') courseData[name].p2W++
      else courseData[name].d++
    })
    const courseStats = Object.values(courseData).sort((a, b) => b.total - a.total)

    // Season breakdown
    const seasonMap = {}
    recordRounds.forEach(r => {
      const y = r.date ? new Date(r.date).getFullYear() : 'Unknown'
      if (!seasonMap[y]) seasonMap[y] = { year: y, p1W: 0, p2W: 0, d: 0, total: 0 }
      seasonMap[y].total++
      if (r.result === 'player1_win') seasonMap[y].p1W++
      else if (r.result === 'player2_win') seasonMap[y].p2W++
      else seasonMap[y].d++
    })
    const seasons = Object.values(seasonMap).sort((a, b) => b.year - a.year)

    // Score trend — split by 9-hole and 18-hole, last 20 fully-dated rounds each
    const trendData9 = rounds
      .filter(r => r.date && !r.year_only && r.holes === 9)
      .slice(-20)
      .map(r => ({ date: format(parseISO(r.date), 'M/d/yy'), [p1Name]: r.player1_score, [p2Name]: r.player2_score }))
    const trendData18 = rounds
      .filter(r => r.date && !r.year_only && r.holes === 18)
      .slice(-20)
      .map(r => ({ date: format(parseISO(r.date), 'M/d/yy'), [p1Name]: r.player1_score, [p2Name]: r.player2_score }))

    // Course chart data
    const courseChartData = courseStats.slice(0, 8).map(s => ({
      name: s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name,
      [`${p1Name} W%`]: parseFloat(pct(s.p1W, s.total)),
      [`${p2Name} W%`]: parseFloat(pct(s.p2W, s.total)),
    }))

    return {
      total, p1Wins, p2Wins, draws,
      bets, betP1W, betP2W, betDraws,
      nine, eight,
      curStreak, curIsP1, longestP1, longestP2,
      p1Avg, p2Avg, p1Avg9, p2Avg9, p1Avg18, p2Avg18,
      closest, blowout, p1Best, p2Best, p1Best9, p2Best9, p1Best18, p2Best18,
      courseStats, courseChartData, seasons, trendData9, trendData18,
    }
  }, [rounds, courses, p1Name, p2Name])

  if (loading) return <LoadingSpinner fullPage />

  const courseMap = {}
  courses.forEach(c => { courseMap[c.id] = c.name })

  return (
    <div className="bg-fairway-950 min-h-screen">
      <div className="bg-gradient-to-b from-[#0a1f10] to-fairway-950 py-10 px-4 text-center">
        <div className="inline-flex items-center gap-2 text-gold text-[10px] uppercase tracking-[0.35em] mb-3 border border-gold/25 rounded-full px-4 py-1.5 bg-gold/5">
          <span>📊</span> Statistics Dashboard
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl text-white font-bold">The Numbers</h1>
        <p className="text-fairway-400 mt-2 text-sm">Every stroke, every course, every season</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12 space-y-10">

        {!stats ? (
          <div className="card p-12 text-center text-fairway-400">
            No rounds recorded yet. <a href="/admin/rounds" className="text-gold hover:underline">Add the first round →</a>
          </div>
        ) : (
          <>
            {/* ── Overall Record ── */}
            <section>
              <h2 className="section-title"><span>🏆</span> Overall Record</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label={`${p1Name} Wins`} value={stats.p1Wins} subValue={`${pct(stats.p1Wins, stats.total)}% win rate`} icon="🥇" highlight />
                <StatCard label={`${p2Name} Wins`} value={stats.p2Wins} subValue={`${pct(stats.p2Wins, stats.total)}% win rate`} icon="🥈" />
                <StatCard label="Draws" value={stats.draws} subValue={`${pct(stats.draws, stats.total)}% of rounds`} icon="🤝" />
                <StatCard label="Total Rounds" value={stats.total} subValue={`${stats.nine.length} × 9-hole  ·  ${stats.eight.length} × 18-hole`} icon="⛳" />
              </div>
            </section>

            {/* ── Score Averages & Milestones ── */}
            <section>
              <h2 className="section-title"><span>📈</span> Scoring</h2>

              {/* Averages table split by format */}
              <div className="card overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-fairway-800 bg-fairway-900/50">
                      <th className="text-left px-4 py-3 text-fairway-400 text-xs uppercase tracking-wider">Format</th>
                      <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">Rounds</th>
                      <th className="text-center px-3 py-3 text-gold text-xs uppercase tracking-wider">{p1Name} Avg</th>
                      <th className="text-center px-3 py-3 text-fairway-300 text-xs uppercase tracking-wider">{p2Name} Avg</th>
                      <th className="text-center px-3 py-3 text-gold text-xs uppercase tracking-wider hidden sm:table-cell">{p1Name} Best</th>
                      <th className="text-center px-3 py-3 text-fairway-300 text-xs uppercase tracking-wider hidden sm:table-cell">{p2Name} Best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.nine.length > 0 && (
                      <tr className="border-b border-fairway-800/50 hover:bg-fairway-800/20">
                        <td className="px-4 py-3 text-white font-medium">9 Holes</td>
                        <td className="px-3 py-3 text-center text-fairway-400">{stats.nine.length}</td>
                        <td className="px-3 py-3 text-center text-gold font-bold text-lg">{stats.p1Avg9}</td>
                        <td className="px-3 py-3 text-center text-fairway-200 font-bold text-lg">{stats.p2Avg9}</td>
                        <td className="px-3 py-3 text-center text-gold hidden sm:table-cell">
                          {stats.p1Best9 ? <span className="font-semibold">{stats.p1Best9.player1_score} <span className="text-fairway-500 text-xs font-normal">· {courseMap[stats.p1Best9.course_id] || '?'}</span></span> : '—'}
                        </td>
                        <td className="px-3 py-3 text-center text-fairway-300 hidden sm:table-cell">
                          {stats.p2Best9 ? <span className="font-semibold">{stats.p2Best9.player2_score} <span className="text-fairway-500 text-xs font-normal">· {courseMap[stats.p2Best9.course_id] || '?'}</span></span> : '—'}
                        </td>
                      </tr>
                    )}
                    {stats.eight.length > 0 && (
                      <tr className="border-b border-fairway-800/50 hover:bg-fairway-800/20">
                        <td className="px-4 py-3 text-white font-medium">18 Holes</td>
                        <td className="px-3 py-3 text-center text-fairway-400">{stats.eight.length}</td>
                        <td className="px-3 py-3 text-center text-gold font-bold text-lg">{stats.p1Avg18}</td>
                        <td className="px-3 py-3 text-center text-fairway-200 font-bold text-lg">{stats.p2Avg18}</td>
                        <td className="px-3 py-3 text-center text-gold hidden sm:table-cell">
                          {stats.p1Best18 ? <span className="font-semibold">{stats.p1Best18.player1_score} <span className="text-fairway-500 text-xs font-normal">· {courseMap[stats.p1Best18.course_id] || '?'}</span></span> : '—'}
                        </td>
                        <td className="px-3 py-3 text-center text-fairway-300 hidden sm:table-cell">
                          {stats.p2Best18 ? <span className="font-semibold">{stats.p2Best18.player2_score} <span className="text-fairway-500 text-xs font-normal">· {courseMap[stats.p2Best18.course_id] || '?'}</span></span> : '—'}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-fairway-900/30">
                      <td className="px-4 py-3 text-fairway-500 text-xs uppercase tracking-wider">All Rounds</td>
                      <td className="px-3 py-3 text-center text-fairway-500 text-xs">{stats.total}</td>
                      <td className="px-3 py-3 text-center text-gold/60 text-xs">{stats.p1Avg}</td>
                      <td className="px-3 py-3 text-center text-fairway-400 text-xs">{stats.p2Avg}</td>
                      <td className="px-3 py-3 text-center text-gold/60 text-xs hidden sm:table-cell">{stats.p1Best.player1_score}</td>
                      <td className="px-3 py-3 text-center text-fairway-400 text-xs hidden sm:table-cell">{stats.p2Best.player2_score}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="card p-5">
                  <div className="text-fairway-400 text-xs uppercase tracking-widest mb-2">🎯 Closest Match Ever</div>
                  <div className="text-gold font-bold text-2xl font-serif">{stats.closest.round.player1_score} – {stats.closest.round.player2_score}</div>
                  <div className="text-fairway-300 text-sm mt-1">
                    {stats.closest.diff === 0 ? 'Tied' : `${stats.closest.diff}-stroke margin`} · {courseMap[stats.closest.round.course_id] || '?'} · {stats.closest.round.year_only ? new Date(stats.closest.round.date).getFullYear() : stats.closest.round.date ? format(parseISO(stats.closest.round.date), 'MMM d, yyyy') : '—'}
                  </div>
                </div>
                <div className="card p-5">
                  <div className="text-fairway-400 text-xs uppercase tracking-widest mb-2">💥 Biggest Blowout</div>
                  <div className="text-gold font-bold text-2xl font-serif">{stats.blowout.round.player1_score} – {stats.blowout.round.player2_score}</div>
                  <div className="text-fairway-300 text-sm mt-1">
                    {stats.blowout.diff}-stroke margin · {courseMap[stats.blowout.round.course_id] || '?'} · {stats.blowout.round.year_only ? new Date(stats.blowout.round.date).getFullYear() : stats.blowout.round.date ? format(parseISO(stats.blowout.round.date), 'MMM d, yyyy') : '—'}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Score Trend Charts ── */}
            {(stats.trendData9.length > 1 || stats.trendData18.length > 1) && (
              <section>
                <h2 className="section-title"><span>📉</span> Score Trend</h2>
                <p className="text-fairway-500 text-xs mb-4 -mt-2">Lower score is better · Last 20 rounds per format</p>
                <div className={`grid gap-4 ${stats.trendData9.length > 1 && stats.trendData18.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                  {[
                    { label: '9-Hole Rounds', data: stats.trendData9 },
                    { label: '18-Hole Rounds', data: stats.trendData18 },
                  ].map(({ label, data }) => data.length > 1 && (
                    <div key={label} className="card p-4 sm:p-5">
                      <h3 className="font-serif text-base text-gold mb-3">{label} <span className="text-fairway-500 text-xs font-sans">({data.length} rounds)</span></h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a3d1e" />
                          <XAxis dataKey="date" tick={{ fill: '#5fa363', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: '#5fa363', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ color: '#8ec490', fontSize: 11 }} />
                          <Line type="monotone" dataKey={p1Name} stroke="#c9a84c" strokeWidth={2.5} dot={{ fill: '#c9a84c', r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey={p2Name} stroke="#5fa363" strokeWidth={2.5} dot={{ fill: '#5fa363', r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Win % by Course ── */}
            {stats.courseChartData.length > 0 && (
              <section>
                <h2 className="section-title"><span>🏌️</span> Win % by Course</h2>
                <div className="card p-4 sm:p-6 mb-4">
                  <ResponsiveContainer width="100%" height={Math.max(200, stats.courseChartData.length * 50)}>
                    <BarChart data={stats.courseChartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a3d1e" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: '#5fa363', fontSize: 11 }} tickLine={false} unit="%" />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#8ec490', fontSize: 11 }} tickLine={false} width={90} />
                      <Tooltip content={<CustomTooltip />} formatter={(v) => `${v}%`} />
                      <Legend wrapperStyle={{ color: '#8ec490', fontSize: 12 }} />
                      <Bar dataKey={`${p1Name} W%`} fill="#c9a84c" radius={[0, 4, 4, 0]} />
                      <Bar dataKey={`${p2Name} W%`} fill="#3d8341" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Course table */}
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-fairway-800 bg-fairway-900/50">
                        <th className="text-left px-4 py-3 text-fairway-400 text-xs uppercase tracking-wider">Course</th>
                        <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">Rounds</th>
                        <th className="text-center px-3 py-3 text-gold text-xs uppercase tracking-wider">{p1Name}</th>
                        <th className="text-center px-3 py-3 text-fairway-300 text-xs uppercase tracking-wider">{p2Name}</th>
                        <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">Draws</th>
                        <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.courseStats.map((c, i) => (
                        <tr key={c.name} className={`border-b border-fairway-800/50 hover:bg-fairway-800/20 ${i % 2 === 1 ? 'bg-fairway-900/20' : ''}`}>
                          <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                          <td className="px-3 py-3 text-center text-fairway-400">{c.total}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-gold font-semibold">{c.p1W}</span>
                            <span className="text-fairway-600 text-xs ml-1">({pct(c.p1W, c.total)}%)</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-fairway-300 font-semibold">{c.p2W}</span>
                            <span className="text-fairway-600 text-xs ml-1">({pct(c.p2W, c.total)}%)</span>
                          </td>
                          <td className="px-3 py-3 text-center text-fairway-400">{c.d}</td>
                          <td className="px-3 py-3 text-center">
                            {c.p1W > c.p2W
                              ? <span className="text-gold text-xs font-semibold">{p1Name} 🏅</span>
                              : c.p2W > c.p1W
                              ? <span className="text-fairway-300 text-xs font-semibold">{p2Name} 🏅</span>
                              : <span className="text-fairway-500 text-xs">Tied</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── 9 vs 18 Holes ── */}
            <section>
              <h2 className="section-title"><span>🔢</span> 9-Hole vs 18-Hole</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: '9-Hole Rounds',  data: stats.nine,  p1Avg: stats.p1Avg9,  p2Avg: stats.p2Avg9  },
                  { label: '18-Hole Rounds', data: stats.eight, p1Avg: stats.p1Avg18, p2Avg: stats.p2Avg18 },
                ].map(({ label, data, p1Avg, p2Avg }) => {
                  const n = data.length
                  const w1 = data.filter(r => r.result === 'player1_win').length
                  const w2 = data.filter(r => r.result === 'player2_win').length
                  const d  = data.filter(r => r.result === 'draw').length
                  return (
                    <div key={label} className="card p-5">
                      <h3 className="font-serif text-lg text-gold mb-4">{label} <span className="text-fairway-500 text-sm font-sans">({n} played)</span></h3>
                      {n === 0 ? <p className="text-fairway-500 text-sm">None yet</p> : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-fairway-300 text-sm">{p1Name}</span>
                            <div className="text-right">
                              <span className="text-gold font-bold">{w1} wins <span className="text-fairway-500 text-xs">({pct(w1, n)}%)</span></span>
                              {p1Avg && <span className="text-fairway-500 text-xs ml-3">avg <span className="text-gold/70 font-semibold">{p1Avg}</span></span>}
                            </div>
                          </div>
                          <div className="h-2 bg-fairway-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gold rounded-full" style={{ width: `${pct(w1, n)}%` }} />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-fairway-300 text-sm">{p2Name}</span>
                            <div className="text-right">
                              <span className="text-fairway-300 font-bold">{w2} wins <span className="text-fairway-500 text-xs">({pct(w2, n)}%)</span></span>
                              {p2Avg && <span className="text-fairway-500 text-xs ml-3">avg <span className="text-fairway-300/80 font-semibold">{p2Avg}</span></span>}
                            </div>
                          </div>
                          <div className="h-2 bg-fairway-800 rounded-full overflow-hidden">
                            <div className="h-full bg-fairway-400 rounded-full" style={{ width: `${pct(w2, n)}%` }} />
                          </div>
                          {d > 0 && <p className="text-fairway-500 text-xs">{d} draw{d > 1 ? 's' : ''}</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── Streaks ── */}
            <section>
              <h2 className="section-title"><span>🔥</span> Streaks</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Current Streak" value={stats.curStreak > 0 ? stats.curStreak : '—'} subValue={stats.curStreak > 0 ? (stats.curIsP1 ? p1Name : p2Name) : 'No active streak'} icon="🔥" highlight={stats.curStreak >= 3} />
                <StatCard label={`${p1Name} Longest`} value={stats.longestP1 || '—'} subValue="consecutive wins" icon="📈" />
                <StatCard label={`${p2Name} Longest`} value={stats.longestP2 || '—'} subValue="consecutive wins" icon="📈" />
                <StatCard label="Side Bet Record" value={`${stats.betP1W}–${stats.betP2W}–${stats.betDraws}`} subValue={`${p1Name}–${p2Name}–Tie  (${stats.bets.length} bets)`} icon="💰" />
              </div>
            </section>

            {/* ── Season Records ── */}
            {stats.seasons.length > 0 && (
              <section>
                <h2 className="section-title"><span>📅</span> Season Records</h2>
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-fairway-800 bg-fairway-900/50">
                        <th className="text-left px-4 py-3 text-fairway-400 text-xs uppercase tracking-wider">Season</th>
                        <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">Rounds</th>
                        <th className="text-center px-3 py-3 text-gold text-xs uppercase tracking-wider">{p1Name}</th>
                        <th className="text-center px-3 py-3 text-fairway-300 text-xs uppercase tracking-wider">{p2Name}</th>
                        <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">Draws</th>
                        <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">Winner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.seasons.map((s, i) => (
                        <tr key={s.year} className={`border-b border-fairway-800/50 hover:bg-fairway-800/20 ${i % 2 === 1 ? 'bg-fairway-900/20' : ''}`}>
                          <td className="px-4 py-3 font-serif text-white font-semibold text-base">{s.year}</td>
                          <td className="px-3 py-3 text-center text-fairway-400">{s.total}</td>
                          <td className="px-3 py-3 text-center text-gold font-semibold">{s.p1W}</td>
                          <td className="px-3 py-3 text-center text-fairway-300 font-semibold">{s.p2W}</td>
                          <td className="px-3 py-3 text-center text-fairway-400">{s.d}</td>
                          <td className="px-3 py-3 text-center text-xs font-semibold">
                            {s.p1W > s.p2W ? <span className="text-gold">{p1Name} 🏆</span>
                              : s.p2W > s.p1W ? <span className="text-fairway-300">{p2Name} 🏆</span>
                              : <span className="text-fairway-500">Tied</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
