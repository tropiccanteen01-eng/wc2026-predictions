'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Match {
  id: string
  round_key: string
  stage_label: string
  group_name: string | null
  match_number: number
  home_team: string
  away_team: string
  home_code: string
  away_code: string
  kickoff_utc: string
  venue: string
  status: string
  home_score: number | null
  away_score: number | null
}

interface RoundDeadline {
  round_key: string
  round_label: string
  deadline_utc: string
  is_open: boolean
}

interface Prediction {
  id: string
  match_id: string
  pred_home: number
  pred_away: number
  points: number | null
  scored: boolean
}

interface RoundGroup {
  round_key: string
  round_label: string
  deadline: RoundDeadline | null
  isLocked: boolean
  matches: Match[]
}

const ROUND_ORDER: Record<string, number> = {
  gw1: 1, gw2: 2, gw3: 3, r32: 4, r16: 5, qf: 6, sf: 7, final: 8
}

function formatKickoff(utc: string) {
  return new Date(utc).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeLeft(deadline_utc: string) {
  const diff = new Date(deadline_utc).getTime() - Date.now()
  if (diff <= 0) return 'Locked'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function pointsLabel(pts: number | null) {
  if (pts === 5) return '⭐ 5 pts — Exact score!'
  if (pts === 2) return '✓ 2 pts — Correct outcome'
  if (pts === 0) return '✗ 0 pts'
  return null
}

export default function PredictPage() {
  const supabase = createClient()
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [roundGroups, setRoundGroups] = useState<RoundGroup[]>([])
  const [predictions, setPredictions] = useState<Record<string, { home: number | '', away: number | '' }>>({})
  const [savedPredictions, setSavedPredictions] = useState<Record<string, Prediction>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [activeRound, setActiveRound] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
    })
  }, [])

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const [matchesRes, deadlinesRes, predsRes] = await Promise.all([
      supabase.from('matches').select('*').order('kickoff_utc'),
      supabase.from('round_deadlines').select('*'),
      supabase.from('predictions').select('*').eq('user_id', userId),
    ])

    const matches: Match[] = matchesRes.data ?? []
    const deadlines: RoundDeadline[] = deadlinesRes.data ?? []
    const preds: Prediction[] = predsRes.data ?? []

    // Index predictions by match_id
    const predMap: Record<string, Prediction> = {}
    preds.forEach(p => { predMap[p.match_id] = p })
    setSavedPredictions(predMap)

    // Pre-fill inputs
    const inputMap: Record<string, { home: number | '', away: number | '' }> = {}
    preds.forEach(p => { inputMap[p.match_id] = { home: p.pred_home, away: p.pred_away } })
    setPredictions(inputMap)

    // Build round groups
    const deadlineMap: Record<string, RoundDeadline> = {}
    deadlines.forEach(d => { deadlineMap[d.round_key] = d })

    const roundKeys = [...new Set(matches.map(m => m.round_key))]
      .sort((a, b) => (ROUND_ORDER[a] ?? 99) - (ROUND_ORDER[b] ?? 99))

    const groups: RoundGroup[] = roundKeys.map(rk => {
      const deadline = deadlineMap[rk] ?? null
      const isLocked = deadline
        ? new Date(deadline.deadline_utc) <= new Date()
        : false
      return {
        round_key: rk,
        round_label: deadline?.round_label ?? rk.toUpperCase(),
        deadline,
        isLocked,
        matches: matches.filter(m => m.round_key === rk),
      }
    })

    setRoundGroups(groups)

    if (!activeRound) {
      const firstOpen = groups.find(g => !g.isLocked)
      setActiveRound(firstOpen?.round_key ?? groups[0]?.round_key ?? null)
    }

    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const handleInput = (matchId: string, side: 'home' | 'away', val: string) => {
    const num = val === '' ? '' : Math.max(0, Math.min(99, parseInt(val) || 0))
    setPredictions(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: num },
    }))
    setSavedFlash(prev => ({ ...prev, [matchId]: false }))
  }

  const savePrediction = async (match: Match, roundKey: string) => {
    if (!userId) return
    const input = predictions[match.id]
    if (input?.home === '' || input?.away === '' || input?.home == null || input?.away == null) return

    setSaving(prev => ({ ...prev, [match.id]: true }))

    const payload = {
      user_id: userId,
      match_id: match.id,
      round_key: roundKey,
      pred_home: Number(input.home),
      pred_away: Number(input.away),
    }

    const existing = savedPredictions[match.id]
    if (existing) {
      await supabase.from('predictions').update({
        pred_home: payload.pred_home,
        pred_away: payload.pred_away,
      }).eq('id', existing.id)
    } else {
      await supabase.from('predictions').insert(payload)
    }

    setSaving(prev => ({ ...prev, [match.id]: false }))
    setSavedFlash(prev => ({ ...prev, [match.id]: true }))
    setTimeout(() => setSavedFlash(prev => ({ ...prev, [match.id]: false })), 2000)

    // Refresh this prediction
    const { data } = await supabase
      .from('predictions').select('*')
      .eq('user_id', userId).eq('match_id', match.id).single()
    if (data) setSavedPredictions(prev => ({ ...prev, [match.id]: data }))
  }

  const activeGroup = roundGroups.find(g => g.round_key === activeRound)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-white/40 text-sm">Loading matches…</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-2xl mx-auto pt-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Your Predictions</h1>
          <p className="text-white/40 text-sm mt-1">Submit before the deadline to score points</p>
        </div>

        {/* Round Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {roundGroups.map(g => (
            <button
              key={g.round_key}
              onClick={() => setActiveRound(g.round_key)}
              className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-150 ${
                activeRound === g.round_key
                  ? 'bg-[#f0b429] text-black border-[#f0b429]'
                  : g.isLocked
                    ? 'border-white/10 text-white/30 bg-white/[0.03]'
                    : 'border-white/20 text-white/70 hover:border-white/40'
              }`}
            >
              {g.round_label}
              {g.isLocked && <span className="ml-1">🔒</span>}
            </button>
          ))}
        </div>

        {/* Active Round */}
        {activeGroup && (
          <div>
            {/* Deadline Banner */}
            {activeGroup.deadline && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                activeGroup.isLocked
                  ? 'bg-red-500/10 border border-red-500/25'
                  : 'bg-green-500/10 border border-green-500/25'
              }`}>
                <span className="text-xl">{activeGroup.isLocked ? '🔴' : '🟢'}</span>
                <div>
                  {activeGroup.isLocked ? (
                    <>
                      <p className="text-red-400 font-semibold text-sm">Deadline passed — predictions locked</p>
                      <p className="text-red-400/60 text-xs mt-0.5">
                        Was {new Date(activeGroup.deadline.deadline_utc).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-green-400 font-semibold text-sm">Predictions open</p>
                      <p className="text-green-400/60 text-xs mt-0.5">
                        Closes {new Date(activeGroup.deadline.deadline_utc).toLocaleString()} · {timeLeft(activeGroup.deadline.deadline_utc)} left
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Match Cards */}
            <div className="space-y-4">
              {activeGroup.matches.map(match => {
                const isFinished = match.status === 'finished'
                const input = predictions[match.id] ?? { home: '', away: '' }
                const existing = savedPredictions[match.id]
                const isSaving = saving[match.id]
                const isFlash = savedFlash[match.id]
                const hasInput = input.home !== '' && input.away !== ''
                const hasChanged = existing
                  ? Number(input.home) !== existing.pred_home || Number(input.away) !== existing.pred_away
                  : hasInput

                return (
                  <div key={match.id} className={`card p-5 ${activeGroup.isLocked ? 'opacity-75' : ''}`}>
                    {/* Meta */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-white/40 font-mono">{formatKickoff(match.kickoff_utc)}</span>
                      <span className="text-xs text-white/25">{match.venue}</span>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 text-right">
                        <div className="text-xs text-white/40 mb-1">{match.home_code}</div>
                        <div className="text-sm font-semibold text-white">{match.home_team}</div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          type="number" min={0} max={99}
                          value={input.home}
                          onChange={e => handleInput(match.id, 'home', e.target.value)}
                          disabled={activeGroup.isLocked || isFinished}
                          className="score-input"
                          placeholder="—"
                        />
                        <span className="text-white/30 font-bold">:</span>
                        <input
                          type="number" min={0} max={99}
                          value={input.away}
                          onChange={e => handleInput(match.id, 'away', e.target.value)}
                          disabled={activeGroup.isLocked || isFinished}
                          className="score-input"
                          placeholder="—"
                        />
                      </div>

                      <div className="flex-1 text-left">
                        <div className="text-xs text-white/40 mb-1">{match.away_code}</div>
                        <div className="text-sm font-semibold text-white">{match.away_team}</div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        {isFinished && existing?.points != null ? (
                          <span className={`text-xs font-bold ${
                            existing.points === 5 ? 'text-yellow-400' :
                            existing.points === 2 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {pointsLabel(existing.points)}
                            {match.home_score != null && (
                              <span className="text-white/30 font-normal ml-2">
                                (Result: {match.home_score}–{match.away_score})
                              </span>
                            )}
                          </span>
                        ) : existing && !hasChanged ? (
                          <span className="text-white/30 text-xs">✓ Saved</span>
                        ) : null}
                      </div>

                      {!activeGroup.isLocked && !isFinished && (
                        <button
                          onClick={() => savePrediction(match, activeGroup.round_key)}
                          disabled={!hasInput || isSaving}
                          className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-150 ${
                            isFlash
                              ? 'bg-green-500/20 text-green-400'
                              : hasChanged && hasInput
                                ? 'bg-[#f0b429] text-black hover:bg-[#f5c84a] active:scale-95'
                                : 'bg-white/[0.06] text-white/30 cursor-not-allowed'
                          }`}
                        >
                          {isSaving ? '…' : isFlash ? '✓ Saved' : existing ? 'Update' : 'Save'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
