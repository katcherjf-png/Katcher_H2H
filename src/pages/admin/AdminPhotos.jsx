import { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { format, parseISO } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function AdminPhotos() {
  const { user } = useAuth()
  const [photos, setPhotos]       = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState([])
  const [caption, setCaption]     = useState('')
  const [editCaption, setEditCaption] = useState({}) // { [id]: value }
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadPhotos() }, [])

  async function loadPhotos() {
    const { data } = await supabase.from('photos').select('*').order('created_at', { ascending: false })
    if (data) setPhotos(data)
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return
    setUploading(true)
    setProgress(accepted.map(f => ({ name: f.name, status: 'uploading' })))

    for (let i = 0; i < accepted.length; i++) {
      const file = accepted[i]
      const ext  = file.name.split('.').pop()
      const path = `photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await supabase.storage.from('photos').upload(path, file)
      if (upErr) {
        setProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p))
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      await supabase.from('photos').insert({
        storage_path: path,
        url: publicUrl,
        caption: caption.trim() || '',
        uploaded_by: user?.id,
        is_featured: false,
      })
      setProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'done' } : p))
    }

    flash(`${accepted.length} photo${accepted.length > 1 ? 's' : ''} uploaded!`)
    setCaption('')
    setUploading(false)
    setTimeout(() => setProgress([]), 2000)
    await loadPhotos()
  }, [caption, user])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    disabled: uploading,
    maxSize: 10 * 1024 * 1024,
  })

  async function setFeatured(photoId) {
    await supabase.from('photos').update({ is_featured: false }).neq('id', photoId)
    await supabase.from('photos').update({ is_featured: true }).eq('id', photoId)
    flash('Featured photo updated!')
    await loadPhotos()
  }

  async function removeFeatured(photoId) {
    await supabase.from('photos').update({ is_featured: false }).eq('id', photoId)
    flash('Featured removed.')
    await loadPhotos()
  }

  async function saveCaption(id) {
    const val = editCaption[id] ?? ''
    const { error } = await supabase.from('photos').update({ caption: val }).eq('id', id)
    if (error) { flash(`Error: ${error.message}`); return }
    flash('Caption saved!')
    setEditCaption(prev => { const n = { ...prev }; delete n[id]; return n })
    await loadPhotos()
  }

  async function deletePhoto(photo) {
    await supabase.storage.from('photos').remove([photo.storage_path])
    const { error } = await supabase.from('photos').delete().eq('id', photo.id)
    if (error) { flash(`Error: ${error.message}`); return }
    flash('Photo deleted.')
    setConfirmDelete(null)
    await loadPhotos()
  }

  return (
    <div className="page-wrapper">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-gold text-[10px] uppercase tracking-[0.3em] border border-gold/25 rounded-full px-3 py-1 bg-gold/5 mb-3">Admin Panel</div>
        <h1 className="font-serif text-3xl sm:text-4xl text-white font-bold">📷 Manage Photos</h1>
      </div>

      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${msg.startsWith('Error') ? 'bg-red-900/40 border border-red-700/50 text-red-300' : 'bg-green-900/40 border border-green-700/50 text-green-300'}`}>
          {msg}
        </div>
      )}

      {/* Upload zone */}
      <div className="card p-6 mb-10">
        <h2 className="font-serif text-xl text-gold mb-5">Upload Photos</h2>

        <div className="mb-4">
          <label className="form-label">Caption (applies to all photos in this upload)</label>
          <input
            className="form-input"
            placeholder="e.g. Sunday round at Augusta, April 2024"
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-gold bg-gold/10 scale-[1.01]'
              : uploading
              ? 'border-fairway-600 bg-fairway-900/20 cursor-not-allowed'
              : 'border-fairway-600 hover:border-gold/50 hover:bg-fairway-800/30'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-5xl mb-3">{uploading ? '⏳' : isDragActive ? '📸' : '📷'}</div>
          <p className="text-white font-medium">
            {uploading ? 'Uploading…' : isDragActive ? 'Drop photos here!' : 'Drag & drop photos, or click to browse'}
          </p>
          <p className="text-fairway-500 text-sm mt-1">JPG, PNG, GIF, WebP · Max 10MB each · Multiple files OK</p>
        </div>

        {progress.length > 0 && (
          <div className="mt-4 space-y-1">
            {progress.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={p.status === 'done' ? 'text-green-400' : p.status === 'error' ? 'text-red-400' : 'text-fairway-400'}>
                  {p.status === 'done' ? '✓' : p.status === 'error' ? '✗' : '○'}
                </span>
                <span className="text-fairway-300 truncate">{p.name}</span>
                <span className="text-fairway-500 text-xs ml-auto">{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo grid */}
      <h2 className="section-title"><span>🖼️</span> All Photos <span className="text-fairway-500 text-sm font-sans font-normal">({photos.length})</span></h2>

      {photos.length === 0 ? (
        <div className="card p-12 text-center text-fairway-500">No photos yet. Upload some above!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map(photo => (
            <div key={photo.id} className={`card overflow-hidden ${photo.is_featured ? 'border-gold/50' : ''}`}>
              {/* Image */}
              <div className="relative aspect-video bg-fairway-800">
                <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                {photo.is_featured && (
                  <div className="absolute top-2 left-2 bg-gold text-fairway-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ⭐ Login Photo
                  </div>
                )}
              </div>

              {/* Caption */}
              <div className="p-4 space-y-3">
                <div className="text-fairway-500 text-xs">{format(parseISO(photo.created_at), 'MMMM d, yyyy')}</div>

                {editCaption.hasOwnProperty(photo.id) ? (
                  <div className="flex gap-2">
                    <input
                      className="form-input text-sm flex-1"
                      value={editCaption[photo.id]}
                      onChange={e => setEditCaption(prev => ({ ...prev, [photo.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveCaption(photo.id) }}
                      placeholder="Add a caption…"
                      autoFocus
                    />
                    <button onClick={() => saveCaption(photo.id)} className="btn-gold text-xs py-1.5 px-3">Save</button>
                    <button onClick={() => setEditCaption(prev => { const n = { ...prev }; delete n[photo.id]; return n })} className="text-fairway-500 hover:text-white text-sm px-1">✕</button>
                  </div>
                ) : (
                  <div
                    className="text-sm text-fairway-300 cursor-pointer hover:text-white transition-colors min-h-[20px]"
                    onClick={() => setEditCaption(prev => ({ ...prev, [photo.id]: photo.caption || '' }))}
                    title="Click to edit caption"
                  >
                    {photo.caption || <span className="text-fairway-600 italic">Click to add caption…</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {photo.is_featured ? (
                    <button onClick={() => removeFeatured(photo.id)} className="btn-ghost text-xs py-1.5 flex-1 text-gold border border-gold/20">
                      ⭐ Remove as Featured
                    </button>
                  ) : (
                    <button onClick={() => setFeatured(photo.id)} className="btn-ghost text-xs py-1.5 flex-1">
                      Set as Login Photo
                    </button>
                  )}

                  {confirmDelete === photo.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deletePhoto(photo)} className="btn-danger text-xs py-1.5 px-2">Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-fairway-500 hover:text-white text-xs px-1">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(photo.id)} className="text-fairway-600 hover:text-red-400 transition-colors text-xs px-2">🗑</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
