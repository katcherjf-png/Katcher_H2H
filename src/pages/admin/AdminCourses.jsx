import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'

export default function AdminCourses() {
  const [courses, setCourses] = useState([])
  const [editId, setEditId]   = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [msg, setMsg] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    const { data, error } = await supabase.from('courses').select('*').order('name')
    if (error) { flash(`Load error: ${error.message}`); return }
    if (data) setCourses(data)
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function onSubmit(data) {
    setSaving(true)
    const payload = {
      name:        data.name.trim(),
      location:    data.location?.trim() || '',
      par_18:      data.par_18 ? Number(data.par_18) : null,
      par_9:       data.par_9  ? Number(data.par_9)  : null,
      yardage_18:  data.yardage_18 ? Number(data.yardage_18) : null,
      yardage_9:   data.yardage_9  ? Number(data.yardage_9)  : null,
    }
    let err
    if (editId) {
      ({ error: err } = await supabase.from('courses').update(payload).eq('id', editId))
    } else {
      ({ error: err } = await supabase.from('courses').insert(payload))
    }
    if (err) { flash(`Error: ${err.message}`); setSaving(false); return }
    flash(editId ? 'Course updated!' : 'Course added!')
    setEditId(null)
    setShowForm(false)
    reset()
    await loadCourses()
    setSaving(false)
  }

  function startEdit(c) {
    setEditId(c.id)
    setShowForm(true)
    reset({ name: c.name, location: c.location, par_18: c.par_18, par_9: c.par_9, yardage_18: c.yardage_18, yardage_9: c.yardage_9 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteCourse(id) {
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) { flash(`Error: ${error.message}`); return }
    flash('Course deleted.')
    setConfirmDelete(null)
    await loadCourses()
  }

  return (
    <div className="page-wrapper">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-gold text-[10px] uppercase tracking-[0.3em] border border-gold/25 rounded-full px-3 py-1 bg-gold/5 mb-3">Admin Panel</div>
          <h1 className="font-serif text-3xl sm:text-4xl text-white font-bold">
            {editId ? '✏️ Edit Course' : '🏌️ Manage Courses'}
          </h1>
        </div>
        {!editId && (
          <button
            onClick={() => { setShowForm(f => !f); if (showForm) reset() }}
            className={showForm ? 'btn-outline mt-2' : 'btn-gold mt-2'}
          >
            {showForm ? 'Cancel' : '+ Add Course'}
          </button>
        )}
      </div>

      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${msg.startsWith('Error') ? 'bg-red-900/40 border border-red-700/50 text-red-300' : 'bg-green-900/40 border border-green-700/50 text-green-300'}`}>
          {msg}
        </div>
      )}

      {/* Form */}
      {(showForm || editId) && <form onSubmit={handleSubmit(onSubmit)} className="card p-6 mb-10 space-y-5">
        <h2 className="font-serif text-xl text-gold">{editId ? 'Update Course' : 'Add New Course'}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="form-label">Course Name *</label>
            <input className="form-input" placeholder="e.g. Pebble Beach Golf Links" {...register('name', { required: 'Required' })} />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Location</label>
            <input className="form-input" placeholder="e.g. Pebble Beach, CA" {...register('location')} />
          </div>
          <div>
            <label className="form-label">18-Hole Par</label>
            <input type="number" min="60" max="80" className="form-input" placeholder="72" {...register('par_18')} />
          </div>
          <div>
            <label className="form-label">9-Hole Par</label>
            <input type="number" min="30" max="40" className="form-input" placeholder="36" {...register('par_9')} />
          </div>
          <div>
            <label className="form-label">18-Hole Yardage</label>
            <input type="number" min="3000" max="8000" className="form-input" placeholder="6800" {...register('yardage_18')} />
          </div>
          <div>
            <label className="form-label">9-Hole Yardage</label>
            <input type="number" min="1500" max="4000" className="form-input" placeholder="3400" {...register('yardage_9')} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving…' : editId ? 'Update Course' : 'Add Course'}</button>
          <button type="button" onClick={() => { setEditId(null); setShowForm(false); reset() }} className="btn-outline">Cancel</button>
        </div>
      </form>}

      {/* List */}
      <h2 className="section-title"><span>🏌️</span> Courses <span className="text-fairway-500 text-sm font-sans font-normal">({courses.length})</span></h2>

      {courses.length === 0 ? (
        <div className="card p-10 text-center text-fairway-500">No courses added yet.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fairway-800 bg-fairway-900/50">
                <th className="text-left px-4 py-3 text-fairway-400 text-xs uppercase tracking-wider">Course</th>
                <th className="text-left px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider hidden sm:table-cell">Location</th>
                <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">18-Par</th>
                <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider">9-Par</th>
                <th className="text-center px-3 py-3 text-fairway-400 text-xs uppercase tracking-wider hidden md:table-cell">Yards</th>
                <th className="text-right px-4 py-3 text-fairway-400 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={c.id} className={`border-b border-fairway-800/40 hover:bg-fairway-800/20 ${editId === c.id ? 'bg-gold/5' : i % 2 === 1 ? 'bg-fairway-900/20' : ''}`}>
                  <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-3 py-3 text-fairway-400 hidden sm:table-cell">{c.location || '—'}</td>
                  <td className="px-3 py-3 text-center text-fairway-300">{c.par_18 || '—'}</td>
                  <td className="px-3 py-3 text-center text-fairway-300">{c.par_9 || '—'}</td>
                  <td className="px-3 py-3 text-center text-fairway-400 text-xs hidden md:table-cell">
                    {c.yardage_18 ? `${c.yardage_18.toLocaleString()} / ${c.yardage_9?.toLocaleString() || '—'}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDelete === c.id ? (
                      <span className="flex items-center justify-end gap-2">
                        <span className="text-fairway-400 text-xs">Delete?</span>
                        <button onClick={() => deleteCourse(c.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-fairway-400 hover:text-white text-xs">No</button>
                      </span>
                    ) : (
                      <span className="flex items-center justify-end gap-3">
                        <button onClick={() => startEdit(c)} className="text-gold hover:text-gold-light text-xs font-medium">Edit</button>
                        <button onClick={() => setConfirmDelete(c.id)} className="text-fairway-600 hover:text-red-400 text-xs">Delete</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
