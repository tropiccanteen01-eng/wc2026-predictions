// src/components/layout/Navbar.tsx
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

const NAV = [
  { href: '/predict',      label: 'Predict'      },
  { href: '/leaderboard',  label: 'Leaderboard'  },
  { href: '/dashboard',    label: 'My Stats'      },
  { href: '/rules',        label: 'Rules'         },
]

interface NavbarProps {
  user: User | null
  profile: Pick<Profile, 'display_name' | 'is_admin'> | null
}

export function Navbar({ user, profile }: NavbarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 bg-surface-1 border-b border-white/8">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-2xl">⚽</span>
          <span className="text-xl font-bold tracking-widest text-brand-gold-l hidden sm:block"
                style={{ fontFamily: 'var(--font-bebas, sans-serif)' }}>
            WC 2026
          </span>
        </Link>

        {/* Nav links — only when logged in */}
        {user && (
          <div className="flex items-center gap-0.5 ml-3 overflow-x-auto scrollbar-none">
            {NAV.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className={[
                  'px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors',
                  pathname.startsWith(n.href)
                    ? 'bg-brand-gold/15 text-brand-gold-l'
                    : 'text-gray-500 hover:text-gray-300'
                ].join(' ')}
              >
                {n.label}
              </Link>
            ))}
            {profile?.is_admin && (
              <Link
                href="/admin"
                className={[
                  'px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-red-500/60 hover:text-red-400'
                ].join(' ')}
              >
                ⚑ Admin
              </Link>
            )}
          </div>
        )}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {user ? (
            <>
              <span className="text-xs text-gray-500 hidden sm:block max-w-[120px] truncate">
                {profile?.display_name ?? user.email}
              </span>
              {profile?.is_admin && (
                <span className="badge-red text-[9px] px-1.5 hidden sm:block">ADMIN</span>
              )}
              <button onClick={signOut} className="btn-ghost text-xs px-3 py-1.5">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-gold text-xs px-4 py-1.5">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
