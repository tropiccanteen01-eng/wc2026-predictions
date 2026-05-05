'use client'
// src/app/admin/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match, RoundDeadline } from '@/types'
import { formatKickoff, formatDeadline } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [deadlines, setDeadlines] = useState<RoundDeadline[]>([])
  const [results, setResults] = useState<Record<string, { home: number | '', away: number | '' }>>({})
  const [savingResult, setSavingResult] = useState<Record<string, boolean>>({})
  const [savingDeadline, setSavingDeadline] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState<'results' | 'deadlines'>('results')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { router.push('/predict'); return }
      setAuthorized(true)
      loadData()
    })
  }, [])

  const loadData = async () => {
    const [matchRes, dlRes] = await Promise.all([
      supabase.from('matches').select('*').order('kickoff_utc'),
      supabase.from('round_deadlines').select('*').order('deadline_utc'),
    ])
    setMatches(matchRes.data ?? [])
    setDeadlines(dlRes.data ?? [])

    // Pre-fill result inputs from existing data
    const init: Record<string, { home: number | '', away: number | '' }> = {}
    ;(matchRes.data ?? []).forEach((m: Match) => {
      if (m.actual_home != null) init[m.id] = { home: m.actual_home, away: m.actual_away ?? 0 }
    })
    setResults(init)
  }

  const saveResult = async (match: Match) => {
    const r = results[match.id]
    if (r?.home === '' || r?.away === '' || r?.home == null || r?.away == null) return
    setSavingResult(prev => ({ ...prev, [match.id]: true }))

    await supabase.from('matches').update({
      actual_home: Number(r.home),
      actual_away: Number(r.away),
      status: 'finished',
      scored_at: new Date().toISOString(),
    }).eq('id', match.id)

    // Trigger scoring via Edge Function (if configured)
    await fetch('/api/admin/score-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: match.id }),
    }).catch(() => {})

    setSavingResult(prev => ({ ...prev, [match.id]: false }))
    loadData()
  }

  const saveDeadline = async (round: string, datetimeLocal: string) => {
    if (!datetimeLocal) return
    setSavingDeadline(prev => ({ ...prev, [round]: true }))
    const utc = new Date(datetimeLocal).toISOString()

    await supabase.from('round_deadlines').upsert({
      round,
      deadline_utc: utc,
      is_active: true,
    }, { onConflict: 'round' })

    setSavingDeadline(prev => ({ ...prev, [round]: false }))
    loadData()
  }

  const rounds = [...new Set(matches.map(m => m.round))]

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center text-white/30 text-sm">Checking access…</div>
  )

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-3xl mx-auto pt-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">🛠 Admin Panel</h1>
          <p className="text-white/40 text-sm mt-1">Enter results · manage deadlines</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['results', 'deadlines'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? 'bg-[#f0b429] text-black' : 'bg-white/[0.06] text-white/60 hover:text-white'
              }`}
            >
              {t === 'results' ? '⚽ Match Results' : '⏰ Deadlines'}
            </button>
          ))}
        </div>

        {/* Results Tab */}
        {tab === 'results' && (
          <div className="space-y-3">
            {matches.map(match => {
              const r = results[match.id] ?? { home: '', away: '' }
              const isSaving = savingResult[match.id]
              const isFinished = match.status === 'finished'

              return (
                <div key={match.id} className={`card p-4 ${isFinished ? 'border-green-500/20' : ''}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm">
                        {match.home_flag} {match.home_team} vs {match.away_team} {match.away_flag}
                      </p>
                      <p className="text-white/30 text-xs mt-0.5">{match.round} · {formatKickoff(match.kickoff_utc)}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="number" min={0} max={99}
                        value={r.home}
                        onChange={e => setResults(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value === '' ? '' : Number(e.target.value) } }))}
                        className="score-input !w-12 !h-10 !text-lg"
                        placeholder="—"
                      />
                      <span className="text-white/30">–</span>
                      <input
                        type="number" min={0} max={99}
                        value={r.away}
                        onChange={e => setResults(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value === '' ? '' : Number(e.target.value) } }))}
                        className="score-input !w-12 !h-10 !text-lg"
                        placeholder="—"
                      />
                      <button
                        onClick={() => saveResult(match)}
                        disabled={isSaving || r.home === '' || r.away === ''}
                        className="btn-gold !py-2 !px-4 !text-xs ml-1"
                      >
                        {isSaving ? '…' : isFinished ? 'Update' : 'Save & Score'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Deadlines Tab */}
        {tab === 'deadlines' && (
          <div className="space-y-3">
            {rounds.map(round => {
              const dl = deadlines.find(d => d.round === round)
              const isSaving = savingDeadline[round]

              // Convert UTC to local datetime-local string
              const localValue = dl
                ? new Date(dl.deadline_utc).toISOString().slice(0, 16)
                : ''

              return (
                <div key={round} className="card p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-white font-semibold text-sm">{round}</p>
                      {dl ? (
                        <p className="text-white/40 text-xs mt-0.5">{formatDeadline(dl)}</p>
                      ) : (
                        <p className="text-red-400/70 text-xs mt-0.5">No deadline set</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <input
                        type="datetime-local"
                        defaultValue={localValue}
                        id={`dl-${round}`}
                        className="bg-[#1a2234] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#f0b429] transition-colors"
                      />
                      <button
                        onClick={() => {
                          const el = document.getElementById(`dl-${round}`) as HTMLInputElement
                          saveDeadline(round, el.value)
                        }}
                        disabled={isSaving}
                        className="btn-gold !py-2 !px-4 !text-xs"
                      >
                        {isSaving ? '…' : dl ? 'Update' : 'Set'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
