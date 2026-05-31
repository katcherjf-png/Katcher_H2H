import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [bgUrl, setBgUrl] = useState(null)
  const [authError, setAuthError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    supabase
      .from('photos')
      .select('url')
      .eq('is_featured', true)
      .limit(1)
      .single()
      .then(({ data }) => { if (data?.url) setBgUrl(data.url) })
  }, [])

  async function onSubmit({ email, password }) {
    setAuthError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setAuthError(err.message || 'Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {/* Background fallback gradient */}
      {!bgUrl && (
        <div className="absolute inset-0 bg-gradient-to-br from-fairway-950 via-fairway-900 to-[#1a472a]">
          {/* Decorative circles */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fairway-600/10 rounded-full blur-3xl" />
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-fairway-950/80 via-fairway-950/70 to-fairway-950/90" />

      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #c9a84c 0, #c9a84c 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />

      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-fairway-900/80 border-2 border-gold/40 mb-4 text-4xl shadow-2xl">
            ⛳
          </div>
          <h1 className="font-serif text-4xl font-bold text-white tracking-wide mb-1">
            KATCHER H2H
          </h1>
          <div className="inline-flex items-center gap-2 text-gold text-xs uppercase tracking-[0.3em]">
            <span className="h-px w-8 bg-gold/50" />
            Golf Rivalry
            <span className="h-px w-8 bg-gold/50" />
          </div>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-2xl">
          <h2 className="font-serif text-2xl text-white mb-1 text-center">Welcome Back</h2>
          <p className="text-fairway-400 text-sm text-center mb-6">Sign in to manage rounds & photos</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@email.com"
                autoComplete="email"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {authError && (
              <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm">
                {authError}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-gold w-full py-3 text-base">
              {submitting ? 'Signing In…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-fairway-800 text-center">
            <Link to="/" className="text-fairway-400 hover:text-gold text-sm transition-colors">
              ← Continue as guest (view only)
            </Link>
          </div>
        </div>

        <p className="text-center text-fairway-600 text-xs mt-6">
          Katcher Family · Private Golf Rivalry Tracker
        </p>
      </div>
    </div>
  )
}
