import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let resolved = false

    // If getSession hangs (stuck localStorage lock), auto-clear and continue
    const lockTimeout = setTimeout(() => {
      if (!resolved) {
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-'))
          .forEach(k => localStorage.removeItem(k))
        setLoading(false)
      }
    }, 3000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolved = true
      clearTimeout(lockTimeout)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        resolved = true
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    // When the tab regains focus, refresh the session so the JWT doesn't
    // silently expire while the tab was backgrounded / throttled by the browser
    async function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      clearTimeout(lockTimeout)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data)
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  function getDisplayName(p) {
    if (!p) return 'Unknown'
    if (p.display_preference === 'nickname' && p.nickname) return p.nickname
    if (p.display_preference === 'both') {
      return p.nickname ? `${p.full_name} "${p.nickname}"` : p.full_name
    }
    return p.full_name || p.email || 'Unknown'
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      signIn,
      signOut,
      refreshProfile,
      getDisplayName,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
