import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

const PAGE_SIZE = 10

export default function Photos() {
  const { isAdmin } = useAuth()
  const [photos, setPhotos] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null) // { index, photo }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fetchPhotos = useCallback(async (p) => {
    setLoading(true)
    const from = p * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    const { data, count } = await supabase
      .from('photos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (data) setPhotos(data)
    if (count !== null) setTotal(count)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPhotos(page) }, [page, fetchPhotos])

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightbox) return
    function onKey(e) {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') shiftLightbox(1)
      if (e.key === 'ArrowLeft')  shiftLightbox(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, photos])

  function shiftLightbox(dir) {
    setLightbox(prev => {
      if (!prev) return null
      const next = prev.index + dir
      if (next < 0 || next >= photos.length) return prev
      return { index: next, photo: photos[next] }
    })
  }

  return (
    <div className="min-h-screen bg-fairway-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0a1f10] to-fairway-950 py-10 px-4 text-center">
        <div className="inline-flex items-center gap-2 text-gold text-[10px] uppercase tracking-[0.35em] mb-3 border border-gold/25 rounded-full px-4 py-1.5 bg-gold/5">
          <span>📷</span> Photo Library
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl text-white font-bold">The Gallery</h1>
        <p className="text-fairway-400 mt-2 text-sm">Memories from the fairway</p>
        {isAdmin && (
          <Link to="/admin/photos" className="inline-block mt-4 btn-outline text-sm">
            + Upload Photos
          </Link>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        {loading ? (
          <LoadingSpinner />
        ) : photos.length === 0 ? (
          <div className="card p-16 text-center text-fairway-400">
            <div className="text-5xl mb-4">📷</div>
            <p className="font-serif text-xl text-white mb-2">No photos yet</p>
            {isAdmin
              ? <Link to="/admin/photos" className="text-gold hover:underline">Upload the first photo →</Link>
              : <p className="text-sm">Check back soon for course photos!</p>}
          </div>
        ) : (
          <>
            {/* Count + pagination info */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-fairway-400 text-sm">{total} photo{total !== 1 ? 's' : ''} total</p>
              {totalPages > 1 && (
                <p className="text-fairway-400 text-sm">Page {page + 1} of {totalPages}</p>
              )}
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  onClick={() => setLightbox({ index: i, photo })}
                  className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-fairway-800 hover:border-gold/40 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-gold/10"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Golf photo'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {photo.is_featured && (
                    <div className="absolute top-2 left-2 bg-gold text-fairway-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ⭐ Featured
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-fairway-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute bottom-2 left-2 right-2">
                      {photo.caption && (
                        <p className="text-white text-xs font-medium truncate">{photo.caption}</p>
                      )}
                      <p className="text-fairway-300 text-[10px]">{format(parseISO(photo.created_at), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-outline py-2 px-5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        i === page
                          ? 'bg-gold text-fairway-950 font-bold'
                          : 'text-fairway-300 hover:bg-fairway-800'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn-outline py-2 px-5 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10 leading-none"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>

          {/* Prev */}
          {lightbox.index > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl z-10 p-2 rounded-full hover:bg-white/10"
              onClick={(e) => { e.stopPropagation(); shiftLightbox(-1) }}
            >
              ‹
            </button>
          )}

          {/* Image */}
          <div className="max-w-4xl max-h-[85vh] mx-8" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.photo.url}
              alt={lightbox.photo.caption || ''}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
            {(lightbox.photo.caption || lightbox.photo.created_at) && (
              <div className="mt-3 text-center">
                {lightbox.photo.caption && (
                  <p className="text-white font-medium">{lightbox.photo.caption}</p>
                )}
                <p className="text-fairway-400 text-sm mt-1">
                  {format(parseISO(lightbox.photo.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
            <p className="text-center text-fairway-600 text-xs mt-2">
              {lightbox.index + 1 + page * PAGE_SIZE} / {total} · Use ← → arrow keys to navigate
            </p>
          </div>

          {/* Next */}
          {lightbox.index < photos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl z-10 p-2 rounded-full hover:bg-white/10"
              onClick={(e) => { e.stopPropagation(); shiftLightbox(1) }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  )
}
