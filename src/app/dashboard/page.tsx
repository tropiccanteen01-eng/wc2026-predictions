'use client'
// src/app/dashboard/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Prediction, Match } from '@/types'
import { pointsLabel, formatKickoff } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface PredWithMatch extends Prediction {
  match: Match
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [preds, setPreds] = useState<PredWithMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      setDisplayName(profile?.display_name ?? '')

      const { data } = await supabase
        .from('predictions')
        .select('*, match:matches(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setPreds((data as PredWithMatch[]) ?? [])
      setLoading(false)
    })
  }, [])

  const finished = preds.filter(p => p.match?.status === 'finished')
  const pending  = preds.filter(p => p.match?.status !== 'finished')
  const totalPoints = finished.reduce((s, p) => s + (p.points ?? 0), 0)
  const exactScores = finished.filter(p => p.points === 5).length
  const correctOutcomes = finished.filter(p => p.points === 2).length
  const maxPossible = finished.length * 5

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-2xl mx-auto pt-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">📊 Your Dashboard</h1>
          {displayName && <p className="text-white/40 text-sm mt-1">Welcome, {displayName}</p>}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Points', value: totalPoints, sub: `of ${maxPossible} max`, color: 'text-[#f0b429]' },
            { label: 'Exact Scores', value: exactScores, sub: '5 pts each', color: 'text-yellow-400' },
            { label: 'Correct Outcomes', value: correctOutcomes, sub: '2 pts each', color: 'text-green-400' },
            { label: 'Predictions Made', value: preds.length, sub: `${finished.length} scored`, color: 'text-blue-400' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="card p-4">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-white/60 text-xs font-medium mt-1">{label}</p>
              <p className="text-white/30 text-xs">{sub}</p>
            </div>
          ))}
        </div>

        {/* Pending predictions */}
        {pending.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
              Awaiting Result ({pending.length})
            </h2>
            <div className="space-y-2">
              {pending.map(p => (
                <div key={p.id} className="card p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-white/40 text-xs font-mono flex-shrink-0">{formatKickoff(p.match.kickoff_utc)}</span>
                    <span className="text-white text-sm font-medium truncate">
                      {p.match.home_flag} {p.match.home_team} vs {p.match.away_team} {p.match.away_flag}
                    </span>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-white font-bold text-sm">{p.pred_home}–{p.pred_away}</span>
                    <p className="text-white/30 text-xs">Your prediction</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scored predictions */}
        {finished.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
              Scored Results ({finished.length})
            </h2>
            <div className="space-y-2">
              {finished.map(p => (
                <div key={p.id} className={`card p-4 ${
                  p.points === 5 ? 'border-yellow-500/30 bg-yellow-500/5' :
                  p.points === 2 ? 'border-green-500/20 bg-green-500/5' : ''
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {p.match.home_flag} {p.match.home_team} vs {p.match.away_team} {p.match.away_flag}
                      </p>
                      <p className="text-white/30 text-xs mt-0.5">{p.match.round}</p>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-white/40 text-xs">Your: {p.pred_home}–{p.pred_away}</span>
                        <span className="text-white/40 text-xs">·</span>
                        <span className="text-white/60 text-xs">Result: {p.match.actual_home}–{p.match.actual_away}</span>
                      </div>
                      <div className={`text-xs font-bold ${
                        p.points === 5 ? 'text-yellow-400' :
                        p.points === 2 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {pointsLabel(p.points)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-16 text-white/30 text-sm">Loading your stats…</div>
        )}

        {!loading && preds.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-white/40 mb-4">You haven't made any predictions yet.</p>
            <a href="/predict" className="btn-gold inline-block text-sm">Start predicting →</a>
          </div>
        )}
      </div>
    </div>
  )
}
