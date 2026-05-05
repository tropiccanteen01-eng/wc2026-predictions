'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [tab,      setTab]      = useState<'login' | 'signup'>('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSignup() {
    if (!name.trim())  { setError('Please enter your name'); return }
    if (!email.trim()) { setError('Please enter your email'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: name.trim() }
      }
    })

    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/predict')
    router.refresh()
  }

  async function handleLogin() {
    if (!email.trim()) { setError('Please enter your email'); return }
    if (!password)     { setError('Please enter your password'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/predict')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-4xl font-bold text-yellow-400 tracking-widest mb-1">
            WC 2026
          </h1>
          <p className="text-gray-500 text-sm">Office Prediction League</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">

          {/* Tabs */}
          <div className="flex mb-5 bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => { setTab('login'); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                tab === 'login'
                  ? 'bg-yellow-600 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setTab('signup'); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                tab === 'signup'
                  ? 'bg-yellow-600 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Name field (signup only) */}
          {tab === 'signup' && (
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                Your name
              </label>
              <input
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:border-yellow-600"
                type="text"
                placeholder="e.g. Sarah A."
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={30}
              />
            </div>
          )}

          {/* Email */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:border-yellow-600"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleSignup())}
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm outline-none focus:border-yellow-600"
              type="password"
              placeholder={tab === 'signup' ? 'At least 6 characters' : 'Your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleSignup())}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-950 border border-red-900 rounded-lg text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={tab === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg transition-all disabled:opacity-50 text-sm"
          >
            {loading
              ? 'Please wait…'
              : tab === 'login' ? 'Sign in →' : 'Create account →'
            }
          </button>

          {tab === 'login' && (
            <p className="text-center text-xs text-gray-600 mt-4">
              No account?{' '}
              <button
                onClick={() => { setTab('signup'); setError('') }}
                className="text-yellow-500 underline underline-offset-2"
              >
                Sign up here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}