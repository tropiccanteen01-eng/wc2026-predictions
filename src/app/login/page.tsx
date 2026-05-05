'use client'
// src/app/login/page.tsx
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#f0b429]/[0.06] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🌍</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            WC <span className="text-[#f0b429]">2026</span>
          </h1>
          <p className="text-white/50 mt-2 text-sm">Prediction Game</p>
        </div>

        {sent ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-white font-semibold text-lg mb-2">Check your email</h2>
            <p className="text-white/50 text-sm">
              We sent a magic link to <span className="text-white/80">{email}</span>.
              Click it to sign in — no password needed.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 btn-ghost text-sm"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-8 space-y-5">
            <div>
              <label className="block text-xs text-white/50 font-medium mb-2 uppercase tracking-wider">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Marco Rossi"
                required
                className="w-full bg-[#1a2234] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#f0b429] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 font-medium mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#1a2234] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#f0b429] transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !email.trim()}
              className="btn-gold w-full"
            >
              {loading ? 'Sending…' : 'Send Magic Link ✨'}
            </button>

            <p className="text-center text-white/30 text-xs">
              No account needed · No password · One click to enter
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
