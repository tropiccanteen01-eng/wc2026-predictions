'use client'
// src/app/login/page.tsx
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (mode === 'signup') {
      // Sign up
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name.trim() },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Auto sign in after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setSuccess('Account created! Please sign in.')
        setMode('signin')
        setLoading(false)
        return
      }

      router.push('/predict')
      router.refresh()

    } else {
      // Sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError('Wrong email or password. Please try again.')
        setLoading(false)
        return
      }

      router.push('/predict')
      router.refresh()
    }

    setLoading(false)
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

        {/* Tab switcher */}
        <div className="flex bg-white/[0.06] rounded-xl p-1 mb-6">
          <button
            onClick={() => { setMode('signin'); setError(null) }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150 ${
              mode === 'signin'
                ? 'bg-[#f0b429] text-black'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null) }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-150 ${
              mode === 'signup'
                ? 'bg-[#f0b429] text-black'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-8 space-y-5">

          {/* Name field — only on signup */}
          {mode === 'signup' && (
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
          )}

          {/* Email */}
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

          {/* Password */}
          <div>
            <label className="block text-xs text-white/50 font-medium mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
              required
              minLength={6}
              className="w-full bg-[#1a2234] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#f0b429] transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              {success}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full"
          >
            {loading
              ? 'Please wait…'
              : mode === 'signup'
                ? 'Create Account'
                : 'Sign In'
            }
          </button>

          {/* Switch mode link */}
          <p className="text-center text-white/30 text-xs">
            {mode === 'signin' ? (
              <>Don't have an account?{' '}
                <button type="button" onClick={() => setMode('signup')} className="text-[#f0b429] hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button type="button" onClick={() => setMode('signin')} className="text-[#f0b429] hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
