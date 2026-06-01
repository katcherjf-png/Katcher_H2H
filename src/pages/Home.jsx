import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/LoadingSpinner'

function getDisplayName(p) {
  if (!p) return 'Player'
  if (p.display_preference === 'nickname' && p.nickname) return p.nickname
  if (p.display_preference === 'both' && p.nickname) return `${p.full_name} "${p.nickname}"`
  return p.full_name || 'Player'
}

function computeStreak(rounds) {
  if (!rounds.length) return { count: 0, isPlayer1: null }
  const sorted = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date))
  const first = sorted[0]
  if (first.result === 'draw') return { count: 0, isPlayer1: null }
  const target = first.result
  let count = 0
  for (const r of sorted) {
    if (r.result === target) count++
    else break
  }
  return { count, isPlayer1: target === 'player1_win' }
}

function ResultBadge({ result, isP1Perspective = true }) {
  if (result === 'draw') return <span className="badge-draw">DRAW</span>
  const won = isP1Perspective ? result === 'player1_win' : result === 'player2_win'
  return won
    ? <span className="badge-win">WIN</span>
    : <span className="badge-loss">LOSS</span>
}

function SideBetBadge({ bet, isP1Perspective = true }) {
  if (!bet || bet === 'none') return null
  if (bet === 'draw') return <span className="badge-draw text-[10px] py-0 px-1.5">TIE</span>
  const won = isP1Perspective ? bet === 'player1_win' : bet === 'player2_win'
  return won
    ? <span className="badge-win text-[10px] py-0 px-1.5">💰</span>
    : <span className="badge-loss text-[10px] py-0 px-1.5">💸</span>
}

export default function Home() {
  const [rounds, setRounds] = useState([])
  const [players, setPlayers] = useState([null, null])
  const [courses, setCourses] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [roundsRes, playersRes, coursesRes] = await Promise.all([
          supabase.from('rounds').select('*').order('date', { ascending: false }),
          supabase.from('profiles').select('*').eq('is_player', true).order('player_number'),
          supabase.from('courses').select('id, name'),
        ])

        if (roundsRes.data) setRounds(roundsRes.data)
        if (playersRes.data) {
          const p = [null, null]
          playersRes.data.forEach(pl => { if (pl.player_number === 1) p[0] = pl; if (pl.player_number === 2) p[1] = pl })
          setPlayers(p)
        }
        if (coursesRes.data) {
          const map = {}
          coursesRes.data.forEach(c => { map[c.id] = c.name })
          setCourses(map)
        }
      } catch (err) {
        console.error('Home fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner fullPage />

  const [player1, player2] = players
  const recordRounds = rounds.filter(r => !r.exclude_from_record)
  const p1Wins  = recordRounds.filter(r => r.result === 'player1_win').length
  const p2Wins  = recordRounds.filter(r => r.result === 'player2_win').length
  const draws   = recordRounds.filter(r => r.result === 'draw').length
  const total   = recordRounds.length
  const p1WinPct = total ? ((p1Wins / total) * 100).toFixed(1) : '0.0'
  const p2WinPct = total ? ((p2Wins / total) * 100).toFixed(1) : '0.0'
  const streak  = computeStreak(recordRounds)
  const last5   = rounds.slice(0, 5)
  const currentYear = new Date().getFullYear()
  const seasonRounds = recordRounds.filter(r => r.date && new Date(r.date).getFullYear() === currentYear)
  const seasonP1W = seasonRounds.filter(r => r.result === 'player1_win').length
  const seasonP2W = seasonRounds.filter(r => r.result === 'player2_win').length
  const seasonD   = seasonRounds.filter(r => r.result === 'draw').length
  const firstYear = rounds.length ? new Date(rounds[rounds.length - 1].date).getFullYear() : null

  const p1Name = getDisplayName(player1)
  const p2Name = getDisplayName(player2)
  const streakName = streak.isPlayer1 ? p1Name : p2Name

  return (
    <div className="min-h-screen bg-gradient-to-b from-fairway-950 via-fairway-900 to-fairway-950">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1f10] to-fairway-900" />
        {/* Decorative rings */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full border border-gold/5 -translate-y-1/2" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full border border-gold/5 -translate-y-1/2" />

        <div className="relative z-10 text-center pt-14 pb-8 px-4">
          <div className="inline-flex items-center gap-2 text-gold text-[10px] uppercase tracking-[0.35em] mb-4 border border-gold/25 rounded-full px-4 py-1.5 bg-gold/5">
            <span>⛳</span> Family Golf Rivalry {firstYear ? `· Est. ${firstYear}` : ''}
          </div>
          <h1 className="font-serif text-5xl sm:text-7xl text-white font-bold tracking-tight mb-2">
            KATCHER H2H
          </h1>
          <p className="text-fairway-400 text-sm uppercase tracking-[0.2em]">Head · to · Head</p>
        </div>

        {/* ── Record Display ── */}
        <div className="relative z-10 max-w-3xl mx-auto px-4 pb-14">
          <div className="grid grid-cols-3 gap-3 sm:gap-6 items-center">

            {/* Player 1 */}
            <div className="text-center">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full mx-auto mb-3 border-2 sm:border-4 border-gold/50 overflow-hidden bg-fairway-800 shadow-xl shadow-gold/10">
                {player1?.profile_image_url
                  ? <img src={player1.profile_image_url} alt={p1Name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl">🏌️</div>}
              </div>
              <div className="font-serif text-base sm:text-xl text-white font-semibold">{p1Name || 'Player 1'}</div>
              {player1?.nickname && player1.display_preference !== 'nickname' && (
                <div className="text-gold text-xs sm:text-sm">"{player1.nickname}"</div>
              )}
              <div className="text-5xl sm:text-7xl font-bold text-gold mt-4 mb-1 leading-none">{p1Wins}</div>
              <div className="text-fairway-400 text-[10px] sm:text-xs uppercase tracking-[0.2em]">Wins</div>
              <div className="mt-2 text-xs sm:text-sm text-fairway-300">{p1WinPct}%</div>
              <div className="mt-2 hidden sm:block">
                <div className="h-2 bg-fairway-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${p1WinPct}%` }} />
                </div>
              </div>
            </div>

            {/* Center */}
            <div className="text-center space-y-3">
              <div className="font-serif text-3xl sm:text-5xl text-fairway-500 italic font-light">vs</div>
              {draws > 0 && (
                <div className="card border-fairway-700/50 py-2 px-2 sm:px-4 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-white">{draws}</div>
                  <div className="text-fairway-500 text-[10px] uppercase tracking-wider">Draws</div>
                </div>
              )}
              <div className="text-fairway-500 text-xs sm:text-sm">{total} Rounds</div>
              {streak.count >= 2 && (
                <div className="card border-gold/30 py-2 px-2 sm:px-3">
                  <div className="text-gold text-[10px] uppercase tracking-widest font-semibold">🔥 Streak</div>
                  <div className="text-white font-bold text-xs sm:text-sm mt-0.5">
                    {streakName} · {streak.count}
                  </div>
                </div>
              )}
            </div>

            {/* Player 2 */}
            <div className="text-center">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full mx-auto mb-3 border-2 sm:border-4 border-fairway-500/50 overflow-hidden bg-fairway-800 shadow-xl">
                {player2?.profile_image_url
                  ? <img src={player2.profile_image_url} alt={p2Name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl">🏌️</div>}
              </div>
              <div className="font-serif text-base sm:text-xl text-white font-semibold">{p2Name || 'Player 2'}</div>
              {player2?.nickname && player2.display_preference !== 'nickname' && (
                <div className="text-fairway-300 text-xs sm:text-sm">"{player2.nickname}"</div>
              )}
              <div className="text-5xl sm:text-7xl font-bold text-fairway-300 mt-4 mb-1 leading-none">{p2Wins}</div>
              <div className="text-fairway-400 text-[10px] sm:text-xs uppercase tracking-[0.2em]">Wins</div>
              <div className="mt-2 text-xs sm:text-sm text-fairway-300">{p2WinPct}%</div>
              <div className="mt-2 hidden sm:block">
                <div className="h-2 bg-fairway-800 rounded-full overflow-hidden">
                  <div className="h-full bg-fairway-400 rounded-full transition-all" style={{ width: `${p2WinPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Season Summary ── */}
        {seasonRounds.length > 0 && (
          <div className="card p-6">
            <h2 className="section-title">
              <span className="text-xl">🏆</span>
              {currentYear} Season
              <span className="text-fairway-500 text-sm font-sans font-normal ml-auto">{seasonRounds.length} rounds</span>
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-gold">{seasonP1W}</div>
                <div className="text-fairway-400 text-xs mt-1">{p1Name || 'Player 1'} Wins</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-fairway-400">{seasonD}</div>
                <div className="text-fairway-400 text-xs mt-1">Draws</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-fairway-300">{seasonP2W}</div>
                <div className="text-fairway-400 text-xs mt-1">{p2Name || 'Player 2'} Wins</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Last 5 Rounds ── */}
        <div className="card">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="section-title mb-0">
              <span className="text-xl">📋</span>
              Recent Results
            </h2>
            <Link to="/stats" className="text-gold hover:text-gold-light text-sm transition-colors">
              View All Stats →
            </Link>
          </div>

          {last5.length === 0 ? (
            <div className="px-6 pb-8 text-center text-fairway-500 py-8">
              No rounds recorded yet.{' '}
              <Link to="/admin/rounds" className="text-gold hover:underline">Add the first round →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fairway-800">
                    <th className="text-left px-6 py-3 text-fairway-500 text-xs uppercase tracking-wider font-medium">Date</th>
                    <th className="text-left px-3 py-3 text-fairway-500 text-xs uppercase tracking-wider font-medium">Course</th>
                    <th className="text-center px-3 py-3 text-fairway-500 text-xs uppercase tracking-wider font-medium">Holes</th>
                    <th className="text-center px-3 py-3 text-gold text-xs uppercase tracking-wider font-medium">{p1Name || 'P1'}</th>
                    <th className="text-center px-3 py-3 text-fairway-300 text-xs uppercase tracking-wider font-medium">{p2Name || 'P2'}</th>
                    <th className="text-center px-3 py-3 text-fairway-500 text-xs uppercase tracking-wider font-medium">Result</th>
                    <th className="text-center px-3 py-3 text-fairway-500 text-xs uppercase tracking-wider font-medium">Bet</th>
                  </tr>
                </thead>
                <tbody>
                  {last5.map((r, i) => (
                    <tr key={r.id} className={`border-b border-fairway-800/50 hover:bg-fairway-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-fairway-900/20'}`}>
                      <td className="px-6 py-4 text-fairway-300 whitespace-nowrap">
                        {r.year_only
                          ? new Date(r.date).getFullYear()
                          : r.date ? format(parseISO(r.date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-3 py-4 text-white font-medium truncate max-w-[140px]">
                        {courses[r.course_id] || '—'}
                      </td>
                      <td className="px-3 py-4 text-fairway-400 text-center">{r.holes}</td>
                      <td className="px-3 py-4 text-center">
                        <span className={`font-bold text-base ${r.result === 'player1_win' ? 'text-gold' : 'text-fairway-300'}`}>
                          {r.player1_score}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={`font-bold text-base ${r.result === 'player2_win' ? 'text-fairway-200' : 'text-fairway-500'}`}>
                          {r.player2_score}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        {r.exclude_from_record
                          ? <span className="text-fairway-600 text-xs italic">excl.</span>
                          : <ResultBadge result={r.result} isP1Perspective />}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <SideBetBadge bet={r.side_bet} isP1Perspective />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── CTA row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Link to="/stats" className="card-hover p-5 text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-serif text-white font-semibold">Statistics</div>
            <div className="text-fairway-400 text-xs mt-1">Detailed breakdown</div>
          </Link>
          <Link to="/photos" className="card-hover p-5 text-center">
            <div className="text-3xl mb-2">📷</div>
            <div className="font-serif text-white font-semibold">Photo Library</div>
            <div className="text-fairway-400 text-xs mt-1">On-course moments</div>
          </Link>
          <Link to="/stats" className="card-hover p-5 text-center col-span-2 sm:col-span-1">
            <div className="text-3xl mb-2">🏅</div>
            <div className="font-serif text-white font-semibold">Course Records</div>
            <div className="text-fairway-400 text-xs mt-1">Win % by course</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
