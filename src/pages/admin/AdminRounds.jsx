import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { format, parseISO } from 'date-fns'
import { supabase } from '../../lib/supabase'

function computeResult(p1Score, p2Score, useHandicap, p1Hcp, p2Hcp) {
  const s1 = useHandicap ? p1Score - (p1Hcp || 0) : p1Score
  const s2 = useHandicap ? p2Score - (p2Hcp || 0) : p2Score
  if (s1 < s2) return 'player1_win'
  if (s2 < s1) return 'player2_win'
  return 'draw'
}

function getDisplayName(p) {
  if (!p) return 'Player'
  if (p.display_preference === 'nickname' && p.nickname) return p.nickname
  return p.full_name || 'Player'
}

function ResultBadge({ result }) {
  if (result === 'player1_win') return <span className="badge-win">P1 Wins</span>
  if (result === 'player2_win') return <span className="badge-loss">P2 Wins</span>
  return <span className="badge-draw">Draw</span>
}

export default function AdminRounds() {
  const [courses, setCourses]   = useState([])
  const [players, setPlayers]   = useState([null, null])
  const [rounds, setRounds]     = useState([])
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [msg, setMsg] = useState('')

  const currentYear = new Date().getFullYear()

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      date:      format(new Date(), 'yyyy-MM-dd'),
      year_only: false,
      year:      String(currentYear),
      holes:     '18',
      handicaps_used: false,
      side_bet:  'none',
    }
  })

  const p1Score     = watch('player1_score')
  const p2Score     = watch('player2_score')
  const useHandicap = watch('handicaps_used')
  const p1Hcp       = watch('player1_handicap')
  const p2Hcp       = watch('player2_handicap')
  const yearOnly    = watch('year_only')

  const liveResult = p1Score && p2Score
    ? computeResult(Number(p1Score), Number(p2Score), useHandicap, Number(p1Hcp), Number(p2Hcp))
    : null

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [cRes, pRes, rRes] = await Promise.all([
      supabase.from('courses').select('*').order('name'),
      supabase.from('profiles').select('*').eq('is_player', true).order('player_number'),
      supabase.from('rounds').select('*, courses(name)').order('date', { ascending: false }),
    ])
    if (cRes.error) flash(`Courses load error: ${cRes.error.message}`)
    else if (cRes.data) setCourses(cRes.data)
    if (pRes.error) flash(`Players load error: ${pRes.error.message}`)
    else if (pRes.data) {
      const arr = [null, null]
      pRes.data.forEach(p => { if (p.player_number === 1) arr[0] = p; if (p.player_number === 2) arr[1] = p })
      setPlayers(arr)
    }
    if (rRes.error) flash(`Rounds load error: ${rRes.error.message}`)
    else if (rRes.data) setRounds(rRes.data)
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function onSubmit(data) {
    setSaving(true)
    const result = computeResult(
      Number(data.player1_score), Number(data.player2_score),
      data.handicaps_used, Number(data.player1_handicap), Number(data.player2_handicap)
    )
    const payload = {
      date:      data.year_only ? `${data.year}-01-01` : data.date,
      year_only: Boolean(data.year_only),
      course_id:        data.course_id || null,
      holes:            Number(data.holes),
      player1_id:       players[0]?.id,
      player2_id:       players[1]?.id,
      player1_score:    Number(data.player1_score),
      player2_score:    Number(data.player2_score),
      handicaps_used:   Boolean(data.handicaps_used),
      player1_handicap: data.handicaps_used ? Number(data.player1_handicap) : 0,
      player2_handicap: data.handicaps_used ? Number(data.player2_handicap) : 0,
      player1_net_score: data.handicaps_used ? Number(data.player1_score) - Number(data.player1_handicap) : null,
      player2_net_score: data.handicaps_used ? Number(data.player2_score) - Number(data.player2_handicap) : null,
      result,
      side_bet:         data.side_bet || 'none',
      notes:            data.notes || '',
    }

    let err
    if (editId) {
      ({ error: err } = await supabase.from('rounds').update(payload).eq('id', editId))
    } else {
      ({ error: err } = await supabase.from('rounds').insert(payload))
    }

    if (err) { flash(`Error: ${err.message}`); setSaving(false); return }
    flash(editId ? 'Round updated!' : 'Round saved!')
    setEditId(null)
    reset({
      date:             format(new Date(), 'yyyy-MM-dd'),
      year_only:        false,
      year:             String(currentYear),
      course_id:        '',
      holes:            '18',
      player1_score:    '',
      player2_score:    '',
      handicaps_used:   false,
      player1_handicap: '',
      player2_handicap: '',
      side_bet:         'none',
      notes:            '',
    })
    await loadAll()
    setSaving(false)
  }

  function startEdit(r) {
    setEditId(r.id)
    reset({
      date:      r.date || format(new Date(), 'yyyy-MM-dd'),
      year_only: Boolean(r.year_only),
      year:      r.year_only && r.date ? String(new Date(r.date).getFullYear()) : String(currentYear),
      course_id: r.course_id || '',
      holes: String(r.holes),
      player1_score: r.player1_score,
      player2_score: r.player2_score,
      handicaps_used: r.handicaps_used,
      player1_handicap: r.player1_handicap || 0,
      player2_handicap: r.player2_handicap || 0,
      side_bet: r.side_bet || 'none',
      notes: r.notes || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteRound(id) {
    const { error } = await supabase.from('rounds').delete().eq('id', id)
    if (error) { flash(`Error: ${error.message}`); return }
    flash('Round deleted.')
    setConfirmDelete(null)
    await loadAll()
  }

  const [p1, p2] = players

  return (
    <div className="page-wrapper">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-gold text-[10px] uppercase tracking-[0.3em] border border-gold/25 rounded-full px-3 py-1 bg-gold/5 mb-3">Admin Panel</div>
        <h1 className="font-serif text-3xl sm:text-4xl text-white font-bold">
          {editId ? '✏️ Edit Round' : '⛳ Enter Round'}
        </h1>
      </div>

      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${msg.startsWith('Error') ? 'bg-red-900/40 border border-red-700/50 text-red-300' : 'bg-green-900/40 border border-green-700/50 text-green-300'}`}>
          {msg}
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 mb-10 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Date</label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" className="accent-gold w-3.5 h-3.5" {...register('year_only')} />
                <span className="text-fairway-400 text-xs">Year only</span>
              </label>
            </div>
            {yearOnly ? (
              <input
                type="number"
                min="1900"
                max={currentYear}
                className="form-input"
                placeholder={String(currentYear)}
                {...register('year', { required: 'Required', min: { value: 1900, message: 'Min 1900' }, max: { value: currentYear, message: `Max ${currentYear}` } })}
              />
            ) : (
              <input
                type="date"
                className="form-input"
                {...register('date', { required: 'Required' })}
              />
            )}
            {(errors.date || errors.year) && <p className="text-red-400 text-xs mt-1">{errors.date?.message || errors.year?.message}</p>}
          </div>

          {/* Course */}
          <div>
            <label className="form-label">Golf Course</label>
            <select className="form-select" {...register('course_id')}>
              <option value="">— Select course —</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {courses.length === 0 && <p className="text-fairway-500 text-xs mt-1">No courses yet. <a href="/admin/courses" className="text-gold">Add one first →</a></p>}
          </div>

          {/* Holes */}
          <div>
            <label className="form-label">Holes Played *</label>
            <div className="flex gap-4 mt-2">
              {['9', '18'].map(h => (
                <label key={h} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={h} className="accent-gold" {...register('holes')} />
                  <span className="text-white font-medium">{h} Holes</span>
                </label>
              ))}
            </div>
          </div>

          {/* Side bet */}
          <div>
            <label className="form-label">Side Bet Result</label>
            <select className="form-select" {...register('side_bet')}>
              <option value="none">No side bet</option>
              <option value="player1_win">{p1 ? getDisplayName(p1) : 'Player 1'} won</option>
              <option value="player2_win">{p2 ? getDisplayName(p2) : 'Player 2'} won</option>
              <option value="draw">Draw / Push</option>
            </select>
          </div>
        </div>

        {/* Scores */}
        <div className="border-t border-fairway-800 pt-5">
          <h3 className="text-gold font-serif text-lg mb-4">Scores</h3>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="form-label">{p1 ? getDisplayName(p1) : 'Player 1'} Score *</label>
              <input
                type="number" min="18" max="200"
                className="form-input text-2xl font-bold text-center text-gold"
                placeholder="—"
                {...register('player1_score', { required: 'Required', min: { value: 18, message: 'Min 18' } })}
              />
              {errors.player1_score && <p className="text-red-400 text-xs mt-1">{errors.player1_score.message}</p>}
            </div>
            <div>
              <label className="form-label">{p2 ? getDisplayName(p2) : 'Player 2'} Score *</label>
              <input
                type="number" min="18" max="200"
                className="form-input text-2xl font-bold text-center text-fairway-200"
                placeholder="—"
                {...register('player2_score', { required: 'Required', min: { value: 18, message: 'Min 18' } })}
              />
              {errors.player2_score && <p className="text-red-400 text-xs mt-1">{errors.player2_score.message}</p>}
            </div>
          </div>

          {/* Live result preview */}
          {liveResult && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-fairway-800/50 rounded-lg">
              <span className="text-fairway-400 text-sm">Computed result:</span>
              <ResultBadge result={liveResult} />
              {liveResult === 'player1_win' && p1 && <span className="text-gold text-sm font-medium">{getDisplayName(p1)} wins by {Math.abs(Number(p1Score) - Number(p2Score))}</span>}
              {liveResult === 'player2_win' && p2 && <span className="text-fairway-300 text-sm font-medium">{getDisplayName(p2)} wins by {Math.abs(Number(p1Score) - Number(p2Score))}</span>}
              {liveResult === 'draw' && <span className="text-fairway-400 text-sm">Tied at {p1Score}</span>}
            </div>
          )}
        </div>

        {/* Handicaps */}
        <div className="border-t border-fairway-800 pt-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="accent-gold w-4 h-4" {...register('handicaps_used')} />
            <span className="text-white font-medium">Handicaps used this round?</span>
          </label>

          {useHandicap && (
            <div className="grid grid-cols-2 gap-5 mt-4">
              <div>
                <label className="form-label">{p1 ? getDisplayName(p1) : 'Player 1'} Handicap</label>
                <input type="number" min="0" max="54" className="form-input" placeholder="0" {...register('player1_handicap')} />
              </div>
              <div>
                <label className="form-label">{p2 ? getDisplayName(p2) : 'Player 2'} Handicap</label>
                <input type="number" min="0" max="54" className="form-input" placeholder="0" {...register('player2_handicap')} />
              </div>
              {p1Score && p2Score && (
                <div className="col-span-2 text-fairway-400 text-sm">
                  Net scores → {p1 ? getDisplayName(p1) : 'P1'}: <span className="text-gold font-semibold">{Number(p1Score) - Number(p1Hcp || 0)}</span>
                  &nbsp;|&nbsp;
                  {p2 ? getDisplayName(p2) : 'P2'}: <span className="text-fairway-200 font-semibold">{Number(p2Score) - Number(p2Hcp || 0)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="border-t border-fairway-800 pt-5">
          <label className="form-label">Round Notes / Highlights</label>
          <textarea
            rows={3}
            className="form-input resize-none"
            placeholder="Any highlights, trash talk, memorable moments…"
            {...register('notes')}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-gold">
            {saving ? 'Saving…' : editId ? 'Update Round' : 'Save Round'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); reset({ date: format(new Date(), 'yyyy-MM-dd'), holes: '18', handicaps_used: false, side_bet: 'none' }) }} className="btn-outline">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ── Rounds List ── */}
      <h2 className="section-title"><span>📋</span> All Rounds <span className="text-fairway-500 text-sm font-sans font-normal">({rounds.length})</span></h2>

      {rounds.length === 0 ? (
        <div className="card p-10 text-center text-fairway-500">No rounds recorded yet.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fairway-800 bg-fairway-900/50">
                  <th className="text-left px-4 py-3 text-fairway-400 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">Course</th>
                  <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">H</th>
                  <th className="text-center px-3 py-3 text-gold text-xs uppercase tracking-wider">{p1 ? getDisplayName(p1) : 'P1'}</th>
                  <th className="text-center px-3 py-3 text-fairway-300 text-xs uppercase tracking-wider">{p2 ? getDisplayName(p2) : 'P2'}</th>
                  <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">Result</th>
                  <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">Bet</th>
                  <th className="text-right px-4 py-3 text-fairway-400 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, i) => (
                  <tr key={r.id} className={`border-b border-fairway-800/40 hover:bg-fairway-800/20 ${editId === r.id ? 'bg-gold/5 border-gold/20' : i % 2 === 1 ? 'bg-fairway-900/20' : ''}`}>
                    <td className="px-4 py-3 text-fairway-300 whitespace-nowrap">
                      {r.year_only
                        ? <span className="text-fairway-400">{new Date(r.date).getFullYear()}</span>
                        : r.date ? format(parseISO(r.date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-3 py-3 text-white max-w-[140px] truncate">{r.courses?.name || '—'}</td>
                    <td className="px-3 py-3 text-center text-fairway-400">{r.holes}</td>
                    <td className="px-3 py-3 text-center text-gold font-bold">{r.player1_score}</td>
                    <td className="px-3 py-3 text-center text-fairway-200 font-bold">{r.player2_score}</td>
                    <td className="px-3 py-3 text-center"><ResultBadge result={r.result} /></td>
                    <td className="px-3 py-3 text-center text-fairway-500 text-xs">
                      {r.side_bet === 'none' || !r.side_bet ? '—' : r.side_bet === 'player1_win' ? '💰P1' : r.side_bet === 'player2_win' ? '💰P2' : '🤝'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {confirmDelete === r.id ? (
                        <span className="flex items-center justify-end gap-2">
                          <span className="text-fairway-400 text-xs">Delete?</span>
                          <button onClick={() => deleteRound(r.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold">Yes</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-fairway-400 hover:text-white text-xs">No</button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-3">
                          <button onClick={() => startEdit(r)} className="text-gold hover:text-gold-light text-xs font-medium transition-colors">Edit</button>
                          <button onClick={() => setConfirmDelete(r.id)} className="text-fairway-600 hover:text-red-400 text-xs transition-colors">Delete</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
