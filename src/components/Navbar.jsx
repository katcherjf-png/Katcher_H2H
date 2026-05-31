import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function GolfFlag() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-gold" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2v20M6 2l10 4-10 4" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="6" cy="21" r="1.5" fill="#c9a84c"/>
    </svg>
  )
}

const navLinks = [
  { to: '/', label: 'Home', exact: true },
  { to: '/stats', label: 'Stats' },
  { to: '/photos', label: 'Photos' },
]

const adminLinks = [
  { to: '/admin/rounds', label: '⛳ Enter Round' },
  { to: '/admin/courses', label: '🏌️ Manage Courses' },
  { to: '/admin/users', label: '👤 Manage Users' },
  { to: '/admin/photos', label: '📷 Manage Photos' },
]

export default function Navbar() {
  const { user, profile, isAdmin, signOut, getDisplayName } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const adminRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (adminRef.current && !adminRef.current.contains(e.target)) setAdminOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/')
    setMobileOpen(false)
  }

  return (
    <nav className="relative z-50 bg-gradient-to-r from-fairway-950 to-fairway-900 border-b border-gold/20 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
            <GolfFlag />
            <div>
              <div className="font-serif text-gold font-bold text-lg leading-tight tracking-wide group-hover:text-gold-light transition-colors">
                KATCHER H2H
              </div>
              <div className="text-fairway-400 text-[10px] uppercase tracking-[0.2em] leading-none">
                Golf Rivalry
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'text-gold bg-gold/10'
                      : 'text-fairway-200 hover:text-white hover:bg-fairway-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            {isAdmin && (
              <div className="relative" ref={adminRef}>
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-fairway-200 hover:text-white hover:bg-fairway-800 transition-colors"
                >
                  Admin
                  <svg className={`w-3.5 h-3.5 transition-transform ${adminOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {adminOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-fairway-900 border border-gold/20 rounded-xl shadow-2xl py-1 z-50">
                    <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-fairway-500 font-semibold border-b border-fairway-800">
                      Admin Panel
                    </div>
                    {adminLinks.map(({ to, label }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setAdminOpen(false)}
                        className="block px-4 py-2.5 text-sm text-fairway-200 hover:text-white hover:bg-fairway-800 transition-colors"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {profile?.profile_image_url ? (
                    <img src={profile.profile_image_url} alt="" className="w-8 h-8 rounded-full border border-gold/30 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-fairway-700 border border-gold/30 flex items-center justify-center text-gold text-sm font-bold">
                      {getDisplayName(profile)?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-fairway-200 text-sm">{getDisplayName(profile)}</span>
                </div>
                <button onClick={handleSignOut} className="btn-outline text-sm py-1.5">
                  Sign Out
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-gold text-sm py-2">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-fairway-300 hover:text-white hover:bg-fairway-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gold/10 bg-fairway-950 py-3 px-4 space-y-1">
          {navLinks.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'text-gold bg-gold/10' : 'text-fairway-200 hover:text-white hover:bg-fairway-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-fairway-500 font-semibold">
                Admin
              </div>
              {adminLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm text-fairway-200 hover:text-white hover:bg-fairway-800 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </>
          )}

          <div className="pt-3 border-t border-fairway-800">
            {user ? (
              <div className="space-y-2">
                <div className="px-4 py-2 text-fairway-400 text-sm">
                  Signed in as <span className="text-white">{getDisplayName(profile)}</span>
                </div>
                <button onClick={handleSignOut} className="w-full text-left px-4 py-3 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors">
                  Sign Out
                </button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block btn-gold text-center text-sm">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
