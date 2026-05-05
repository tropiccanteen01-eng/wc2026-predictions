'use client'
// src/components/layout/Navbar.tsx
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navLinks = [
    { href: '/predict',     label: '⚽ Predict'     },
    { href: '/leaderboard', label: '🏆 Leaderboard' },
    { href: '/dashboard',   label: '📊 Dashboard'   },
    { href: '/rules',       label: '📋 Rules'        },
  ]

  if (pathname === '/login') return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0a0f1e]/90 backdrop-blur-md border-b border-white/[0.08] flex items-center px-4 md:px-6 gap-4">
      {/* Logo */}
      <Link href="/predict" className="flex items-center gap-2 mr-4 flex-shrink-0">
        <span className="text-xl">🌍</span>
        <span className="font-bold text-white text-sm hidden sm:block tracking-tight">
          WC<span className="text-[#f0b429]">2026</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex-shrink-0 text-xs md:text-sm font-medium px-3 py-2 rounded-lg transition-all duration-150 ${
              pathname.startsWith(href)
                ? 'bg-[#f0b429]/15 text-[#f0b429]'
                : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {label}
          </Link>
        ))}
        {profile?.is_admin && (
          <Link
            href="/admin"
            className={`flex-shrink-0 text-xs md:text-sm font-medium px-3 py-2 rounded-lg transition-all duration-150 ${
              pathname.startsWith('/admin')
                ? 'bg-purple-500/20 text-purple-300'
                : 'text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10'
            }`}
          >
            🛠 Admin
          </Link>
        )}
      </div>

      {/* User */}
      {profile && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-white/50 hidden md:block max-w-[120px] truncate">
            {profile.display_name}
          </span>
          <button
            onClick={handleSignOut}
            className="text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
