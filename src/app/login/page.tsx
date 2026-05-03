// src/app/login/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const supabase     = createClient()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirectTo') ?? '/predict'

  const [email,   setEmail]   = useState('')
  const [name,    setName]    = useState('')
  const [step,    setStep]    = useState<'form' | 'sent'>('form')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required'); return }
    if (!name.trim())  { setError('Your name is required'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
        data: { display_name: name.trim() },
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setStep('sent')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-3xl font-bold tracking-widest text-brand-gold-l"
              style={{ fontFamily: 'var(--font-bebas, sans-serif)' }}>
            WC 2026
          </h1>
          <p className="text-gray-500 text-sm mt-1">Office Prediction League</p>
        </div>

        {step === 'form' ? (
          <div className="card p-6">
            <h2 className="text-base font-semibold mb-1">Sign in</h2>
            <p className="text-xs text-gray-500 mb-5">
              Enter your work email and name. We'll send you a magic link — no password needed.
            </p>

            <form onSubmit={signIn} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                  Your name
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Sarah A."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={30}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                  Work email
                </label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full py-2.5 mt-1"
              >
                {loading ? 'Sending…' : 'Send magic link →'}
              </button>
            </form>

            <p className="text-[11px] text-gray-600 text-center mt-4">
              By signing in you agree to keep it friendly. 🤝
            </p>
          </div>
        ) : (
          <div className="card p-6 text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-lg font-semibold mb-2">Check your email</h2>
            <p className="text-sm text-gray-400 mb-4">
              We sent a magic link to <strong className="text-white">{email}</strong>.
              Click the link to sign in — it expires in 1 hour.
            </p>
            <p className="text-xs text-gray-600">
              Didn't get it?{' '}
              <button
                onClick={() => setStep('form')}
                className="text-brand-gold-l underline underline-offset-2"
              >
                Try again
              </button>
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-5">
          <Link href="/rules" className="hover:text-gray-400 transition-colors">
            View scoring rules →
          </Link>
        </p>
      </div>
    </div>
  )
}
