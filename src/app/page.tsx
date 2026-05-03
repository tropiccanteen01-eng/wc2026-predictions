// src/app/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged in → go straight to predictions
  if (user) redirect('/predict')

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      {/* Logo */}
      <div className="mb-8">
        <div className="text-7xl mb-4">⚽</div>
        <h1 className="text-5xl font-bold tracking-widest text-brand-gold-l mb-2" style={{ fontFamily: 'var(--font-bebas, sans-serif)' }}>
          WC 2026
        </h1>
        <p className="text-xl text-gray-400 font-semibold">Office Prediction League</p>
      </div>

      {/* Tagline */}
      <p className="text-gray-400 text-base max-w-sm mb-10 leading-relaxed">
        Predict every match score across all 104 games. Compete with your colleagues. Glory to the winner.
      </p>

      {/* CTA */}
      <Link href="/login" className="btn-gold text-base px-8 py-3 rounded-xl text-lg font-bold">
        Sign in to predict →
      </Link>

      {/* Quick rules */}
      <div className="mt-14 grid grid-cols-3 gap-4 max-w-sm w-full">
        {[
          { pts: '5', label: 'Exact score' },
          { pts: '2', label: 'Correct outcome' },
          { pts: '×3', label: 'Final bonus' },
        ].map(r => (
          <div key={r.label} className="card p-3 text-center">
            <div className="text-2xl font-bold text-brand-gold-l" style={{ fontFamily: 'var(--font-bebas, sans-serif)' }}>{r.pts}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 font-semibold uppercase tracking-wide">{r.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
