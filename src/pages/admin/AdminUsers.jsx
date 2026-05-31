import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function getDisplayName(p) {
  if (!p) return 'Unknown'
  if (p.display_preference === 'nickname' && p.nickname) return p.nickname
  if (p.display_preference === 'both' && p.nickname) return `${p.full_name} "${p.nickname}"`
  return p.full_name || p.email || 'Unknown'
}

export default function AdminUsers() {
  const { refreshProfile } = useAuth()
  const [users, setUsers]       = useState([])
  const [editUser, setEditUser] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    if (data) setUsers(data)
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  function startEdit(u) {
    setEditUser(u)
    reset({
      full_name:           u.full_name || '',
      nickname:            u.nickname  || '',
      display_preference:  u.display_preference || 'full_name',
      role:                u.role || 'viewer',
      is_player:           u.is_player || false,
      player_number:       u.player_number || '',
    })
  }

  async function onSubmit(data) {
    setSaving(true)
    const payload = {
      full_name:          data.full_name.trim(),
      nickname:           data.nickname?.trim() || '',
      display_preference: data.display_preference,
      role:               data.role,
      is_player:          Boolean(data.is_player),
      player_number:      data.is_player && data.player_number ? Number(data.player_number) : null,
    }
    const { error } = await supabase.from('profiles').update(payload).eq('id', editUser.id)
    if (error) { flash(`Error: ${error.message}`); setSaving(false); return }
    flash('Profile updated!')
    setEditUser(null)
    await loadUsers()
    await refreshProfile()
    setSaving(false)
  }

  async function handleAvatarUpload(e, userId) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `avatars/${userId}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { flash(`Upload error: ${upErr.message}`); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('profiles').update({ profile_image_url: publicUrl }).eq('id', userId)
    if (dbErr) { flash(`Save error: ${dbErr.message}`); setUploading(false); return }
    flash('Avatar updated!')
    await loadUsers()
    await refreshProfile()
    setUploading(false)
  }

  return (
    <div className="page-wrapper">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-gold text-[10px] uppercase tracking-[0.3em] border border-gold/25 rounded-full px-3 py-1 bg-gold/5 mb-3">Admin Panel</div>
        <h1 className="font-serif text-3xl sm:text-4xl text-white font-bold">👤 Manage Users</h1>
        <p className="text-fairway-400 mt-2 text-sm">New users are created via Supabase Authentication. Manage profiles and roles here.</p>
      </div>

      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${msg.startsWith('Error') ? 'bg-red-900/40 border border-red-700/50 text-red-300' : 'bg-green-900/40 border border-green-700/50 text-green-300'}`}>
          {msg}
        </div>
      )}

      {/* Edit form */}
      {editUser && (
        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 mb-8 space-y-5">
          <h2 className="font-serif text-xl text-gold">Editing: {editUser.email}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="Jason Katcher" {...register('full_name', { required: 'Required' })} />
              {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="form-label">Nickname / Callsign</label>
              <input className="form-input" placeholder="Padre" {...register('nickname')} />
            </div>
            <div>
              <label className="form-label">Display Name Preference</label>
              <select className="form-select" {...register('display_preference')}>
                <option value="full_name">Full Name only</option>
                <option value="nickname">Nickname only</option>
                <option value="both">Both (Full "Nickname")</option>
              </select>
            </div>
            <div>
              <label className="form-label">Role</label>
              <select className="form-select" {...register('role')}>
                <option value="viewer">Viewer (read only)</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-gold w-4 h-4" {...register('is_player')} />
                <span className="form-label mb-0">Is a primary player</span>
              </label>
            </div>
            <div>
              <label className="form-label">Player Position</label>
              <select className="form-select" {...register('player_number')}>
                <option value="">— Not a player —</option>
                <option value="1">Player 1 (left side)</option>
                <option value="2">Player 2 (right side)</option>
              </select>
            </div>
          </div>

          {/* Avatar upload */}
          <div>
            <label className="form-label">Profile Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-fairway-700 border border-fairway-600 flex items-center justify-center">
                {editUser.profile_image_url
                  ? <img src={editUser.profile_image_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-2xl">👤</span>}
              </div>
              <label className={`btn-outline text-sm cursor-pointer ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
                {uploading ? 'Uploading…' : 'Choose Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e, editUser.id)} disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving…' : 'Save Changes'}</button>
            <button type="button" onClick={() => { setEditUser(null); reset() }} className="btn-outline">Cancel</button>
          </div>
        </form>
      )}

      {/* Users list */}
      <h2 className="section-title"><span>👥</span> All Users <span className="text-fairway-500 text-sm font-sans font-normal">({users.length})</span></h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.id} className={`card p-5 ${editUser?.id === u.id ? 'border-gold/50' : ''}`}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-fairway-700 border-2 border-fairway-600 flex-shrink-0 flex items-center justify-center">
                {u.profile_image_url
                  ? <img src={u.profile_image_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-2xl">👤</span>}
              </div>
              <div className="min-w-0">
                <div className="font-serif text-white font-semibold truncate">{getDisplayName(u)}</div>
                {u.nickname && u.display_preference !== 'nickname' && (
                  <div className="text-gold text-xs">"{u.nickname}"</div>
                )}
                <div className="text-fairway-400 text-xs truncate mt-0.5">{u.email}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${u.role === 'admin' ? 'bg-gold/10 text-gold border-gold/30' : 'bg-fairway-800 text-fairway-400 border-fairway-700'}`}>
                {u.role === 'admin' ? '⚙️ Admin' : '👁 Viewer'}
              </span>
              {u.is_player && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-green-900/30 text-green-300 border-green-700/30">
                  🏌️ Player {u.player_number || '?'}
                </span>
              )}
            </div>

            <button onClick={() => startEdit(u)} className="w-full btn-outline text-sm py-2">
              Edit Profile
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
