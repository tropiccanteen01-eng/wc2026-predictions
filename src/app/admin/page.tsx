'use client'
// src/app/admin/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  display_name: string
  email: string
  is_admin: boolean
  created_at: string
}

interface Match {
  id: string
  round_key: string
  match_number: number
  home_team: string
  away_team: string
  home_code: string
  away_code: string
  kickoff_utc: string
  status: string
  home_score: number | null
  away_score: number | null
  scoring_done: boolean
}

interface Prediction {
  id: string
  user_id: string
  match_id: string
  round_key: string
  pred_home: number
  pred_away: number
  points: number | null
  scored: boolean
  locked: boolean
  submitted_at: string
  version: number
  // joined
  profile?: Profile
  match?: Match
}

interface LeaderboardEntry {
  user_id: string
  display_name: string
  total_pts: number
  exact_scores: number
  correct_outcomes: number
  wrong: number
  predictions_made: number
  predictions_scored: number
  rank: number | null
}

interface RoundDeadline {
  round_key: string
  round_label: string
  deadline_utc: string
  is_open: boolean
}

type Tab = 'overview' | 'users' | 'predictions' | 'leaderboard' | 'results'

const ROUND_ORDER: Record<string, number> = {
  gw1: 1, gw2: 2, gw3: 3, r32: 4, r16: 5, qf: 6, sf: 7, final: 8
}

function formatDate(utc: string) {
  return new Date(utc).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()

  const [authorized, setAuthorized] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  // Data
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [deadlines, setDeadlines] = useState<RoundDeadline[]>([])

  // UI state
  const [selectedRound, setSelectedRound] = useState<string>('gw1')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [editingPred, setEditingPred] = useState<string | null>(null)
  const [editHome, setEditHome] = useState<number | ''>('')
  const [editAway, setEditAway] = useState<number | ''>('')
  const [resultInputs, setResultInputs] = useState<Record<string, { home: number | '', away: number | '' }>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { router.push('/predict'); return }
      setAuthorized(true)
      loadAll()
    })
  }, [])

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true)
    const [profilesRes, matchesRes, predsRes, lbRes, dlRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('matches').select('*').order('kickoff_utc'),
      supabase.from('predictions').select('*, profile:profiles(display_name,email), match:matches(home_team,away_team,home_code,away_code,round_key,kickoff_utc,home_score,away_score,status,match_number,scoring_done)').order('submitted_at', { ascending: false }),
      supabase.from('leaderboard').select('*').order('total_pts', { ascending: false }),
      supabase.from('round_deadlines').select('*').order('deadline_utc'),
    ])
    setProfiles(profilesRes.data ?? [])
    setMatches(matchesRes.data ?? [])
    setPredictions(predsRes.data ?? [])
    setLeaderboard((lbRes.data ?? []).map((e, i) => ({ ...e, rank: e.rank ?? i + 1 })))
    setDeadlines(dlRes.data ?? [])

    // Pre-fill result inputs
    const init: Record<string, { home: number | '', away: number | '' }> = {}
    ;(matchesRes.data ?? []).forEach((m: Match) => {
      if (m.home_score != null) init[m.id] = { home: m.home_score, away: m.away_score ?? 0 }
    })
    setResultInputs(init)
    setLoading(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  const toggleAdmin = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_admin: !current }).eq('id', userId)
    showToast(`Admin status ${!current ? 'granted' : 'removed'}`)
    loadAll()
  }

  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This will remove all their predictions too.`)) return
    await supabase.from('predictions').delete().eq('user_id', userId)
    await supabase.from('leaderboard').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    showToast(`${name} deleted`)
    loadAll()
  }

  const deletePrediction = async (predId: string) => {
    if (!confirm('Delete this prediction?')) return
    await supabase.from('predictions').delete().eq('id', predId)
    showToast('Prediction deleted')
    loadAll()
  }

  const savePredictionEdit = async (predId: string) => {
    if (editHome === '' || editAway === '') return
    setSaving(true)
    await supabase.from('predictions').update({
      pred_home: Number(editHome),
      pred_away: Number(editAway),
    }).eq('id', predId)
    setEditingPred(null)
    setSaving(false)
    showToast('Prediction updated')
    loadAll()
  }

  const saveResult = async (match: Match) => {
    const r = resultInputs[match.id]
    if (r?.home === '' || r?.away === '' || r?.home == null || r?.away == null) return
    setSaving(true)

    await supabase.from('matches').update({
      home_score: Number(r.home),
      away_score: Number(r.away),
      status: 'finished',
    }).eq('id', match.id)

    // Trigger auto-scoring
    await fetch('/api/admin/score-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: match.id }),
    }).catch(() => {})

    setSaving(false)
    showToast(`Result saved: ${r.home}–${r.away}`)
    loadAll()
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const rounds = [...new Set(matches.map(m => m.round_key))]
    .sort((a, b) => (ROUND_ORDER[a] ?? 99) - (ROUND_ORDER[b] ?? 99))

  const roundMatches = matches.filter(m => m.round_key === selectedRound)
  const roundLabel = deadlines.find(d => d.round_key === selectedRound)?.round_label ?? selectedRound.toUpperCase()

  // Who predicted in selected round
  const roundPreds = predictions.filter(p => p.round_key === selectedRound)
  const usersWhoPredicited = new Set(roundPreds.map(p => p.user_id))
  const usersMissing = profiles.filter(p => !p.is_admin && !usersWhoPredicited.has(p.id))

  const totalMatches = roundMatches.length
  const totalUsers = profiles.filter(p => !p.is_admin).length

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center text-white/30 text-sm">
      Checking access…
    </div>
  )

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-5xl mx-auto pt-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🛠 Admin Dashboard</h1>
            <p className="text-white/40 text-sm mt-1">{profiles.length} users · {predictions.length} predictions · {matches.length} matches</p>
          </div>
          <button onClick={loadAll} className="btn-outline text-sm !px-4 !py-2">↻ Refresh</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {([
            ['overview', '📊 Overview'],
            ['users', '👥 Users'],
            ['predictions', '⚽ Predictions'],
            ['leaderboard', '🏆 Leaderboard'],
            ['results', '📝 Enter Results'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                tab === t
                  ? 'bg-[#f0b429] text-black border-[#f0b429]'
                  : 'border-white/20 text-white/60 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/30">Loading…</div>
        ) : (
          <>
            {/* ── OVERVIEW TAB ── */}
            {tab === 'overview' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Users', value: totalUsers, color: 'text-blue-400' },
                    { label: 'Predictions Made', value: predictions.length, color: 'text-green-400' },
                    { label: 'Matches Scored', value: matches.filter(m => m.scoring_done).length, color: 'text-yellow-400' },
                    { label: 'Matches Remaining', value: matches.filter(m => m.status !== 'finished').length, color: 'text-white' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="card p-4">
                      <p className={`text-3xl font-bold ${color}`}>{value}</p>
                      <p className="text-white/40 text-xs mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Round selector */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="text-white font-semibold">Prediction Coverage by Round</h2>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {rounds.map(rk => (
                        <button
                          key={rk}
                          onClick={() => setSelectedRound(rk)}
                          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
                            selectedRound === rk
                              ? 'bg-[#f0b429] text-black border-[#f0b429]'
                              : 'border-white/20 text-white/50 hover:text-white'
                          }`}
                        >
                          {deadlines.find(d => d.round_key === rk)?.round_label ?? rk.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-white/40 text-xs mb-4">{roundLabel} · {totalMatches} matches</p>

                  {/* Coverage bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">Users predicted</span>
                      <span className="text-white">{usersWhoPredicited.size} / {totalUsers}</span>
                    </div>
                    <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#f0b429] rounded-full transition-all"
                        style={{ width: totalUsers ? `${(usersWhoPredicited.size / totalUsers) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Missing users */}
                  {usersMissing.length > 0 && (
                    <div>
                      <p className="text-red-400 text-xs font-semibold mb-2">⚠ Haven't predicted yet:</p>
                      <div className="flex flex-wrap gap-2">
                        {usersMissing.map(u => (
                          <span key={u.id} className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full">
                            {u.display_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {usersMissing.length === 0 && usersWhoPredicited.size > 0 && (
                    <p className="text-green-400 text-xs">✓ All users have predicted for this round</p>
                  )}
                </div>

                {/* Recent predictions */}
                <div className="card p-5">
                  <h2 className="text-white font-semibold mb-4">Recent Predictions</h2>
                  <div className="space-y-2">
                    {predictions.slice(0, 8).map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-4 py-2 border-b border-white/[0.05] last:border-0">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {(p.profile as any)?.display_name ?? '—'}
                          </p>
                          <p className="text-white/30 text-xs">
                            {(p.match as any)?.home_team} vs {(p.match as any)?.away_team} · {p.round_key.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-white font-bold text-sm">{p.pred_home}–{p.pred_away}</p>
                          <p className="text-white/30 text-xs">{formatDate(p.submitted_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── USERS TAB ── */}
            {tab === 'users' && (
              <div className="space-y-3">
                {profiles.map(user => (
                  <div key={user.id} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm">{user.display_name}</p>
                        {user.is_admin && (
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Admin</span>
                        )}
                      </div>
                      <p className="text-white/40 text-xs">{user.email}</p>
                      <p className="text-white/25 text-xs mt-0.5">
                        Joined {formatDate(user.created_at)} ·{' '}
                        {predictions.filter(p => p.user_id === user.id).length} predictions
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                        className="text-xs btn-outline !px-3 !py-1.5"
                      >
                        {selectedUser === user.id ? 'Hide' : 'View Predictions'}
                      </button>
                      <button
                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                        className="text-xs bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 px-3 py-1.5 rounded-lg transition-all"
                      >
                        {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.display_name)}
                        className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Expanded predictions for this user */}
                    {selectedUser === user.id && (
                      <div className="w-full mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
                          All Predictions by {user.display_name}
                        </p>
                        {predictions.filter(p => p.user_id === user.id).length === 0 ? (
                          <p className="text-white/25 text-xs">No predictions yet.</p>
                        ) : (
                          predictions.filter(p => p.user_id === user.id).map(p => (
                            <div key={p.id} className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-lg px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-white text-xs font-medium truncate">
                                  {(p.match as any)?.home_team} vs {(p.match as any)?.away_team}
                                </p>
                                <p className="text-white/30 text-xs">{p.round_key.toUpperCase()}</p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {editingPred === p.id ? (
                                  <>
                                    <input
                                      type="number" min={0} max={99}
                                      value={editHome}
                                      onChange={e => setEditHome(e.target.value === '' ? '' : Number(e.target.value))}
                                      className="w-10 h-8 text-center bg-[#1a2234] border border-[#f0b429] rounded text-white text-sm focus:outline-none"
                                    />
                                    <span className="text-white/30">–</span>
                                    <input
                                      type="number" min={0} max={99}
                                      value={editAway}
                                      onChange={e => setEditAway(e.target.value === '' ? '' : Number(e.target.value))}
                                      className="w-10 h-8 text-center bg-[#1a2234] border border-[#f0b429] rounded text-white text-sm focus:outline-none"
                                    />
                                    <button onClick={() => savePredictionEdit(p.id)} className="text-xs bg-[#f0b429] text-black px-2 py-1 rounded font-semibold">
                                      {saving ? '…' : 'Save'}
                                    </button>
                                    <button onClick={() => setEditingPred(null)} className="text-xs text-white/40 hover:text-white">Cancel</button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-white font-bold text-sm">{p.pred_home}–{p.pred_away}</span>
                                    {p.points != null && (
                                      <span className={`text-xs font-bold ${p.points === 5 ? 'text-yellow-400' : p.points === 2 ? 'text-green-400' : 'text-red-400'}`}>
                                        {p.points}pts
                                      </span>
                                    )}
                                    <button
                                      onClick={() => { setEditingPred(p.id); setEditHome(p.pred_home); setEditAway(p.pred_away) }}
                                      className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deletePrediction(p.id)}
                                      className="text-xs text-red-400 hover:text-red-300"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── PREDICTIONS TAB ── */}
            {tab === 'predictions' && (
              <div>
                {/* Round filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                  {rounds.map(rk => (
                    <button
                      key={rk}
                      onClick={() => setSelectedRound(rk)}
                      className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
                        selectedRound === rk
                          ? 'bg-[#f0b429] text-black border-[#f0b429]'
                          : 'border-white/20 text-white/50 hover:text-white'
                      }`}
                    >
                      {deadlines.find(d => d.round_key === rk)?.round_label ?? rk.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Match-by-match breakdown */}
                <div className="space-y-4">
                  {roundMatches.map(match => {
                    const matchPreds = predictions.filter(p => p.match_id === match.id)
                    const predictedUserIds = new Set(matchPreds.map(p => p.user_id))
                    const missing = profiles.filter(p => !p.is_admin && !predictedUserIds.has(p.id))

                    return (
                      <div key={match.id} className="card p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-white font-semibold text-sm">
                            {match.home_team} vs {match.away_team}
                          </p>
                          <div className="flex items-center gap-2">
                            {match.status === 'finished' && (
                              <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">
                                {match.home_score}–{match.away_score} FT
                              </span>
                            )}
                            <span className="text-white/30 text-xs">{matchPreds.length}/{totalUsers} predicted</span>
                          </div>
                        </div>

                        {/* Predictions grid */}
                        {matchPreds.length === 0 ? (
                          <p className="text-white/25 text-xs">No predictions yet.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                            {matchPreds.map(p => (
                              <div key={p.id} className="bg-white/[0.04] rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                                <p className="text-white/70 text-xs truncate">{(p.profile as any)?.display_name}</p>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="text-white font-bold text-xs">{p.pred_home}–{p.pred_away}</span>
                                  {p.points != null && (
                                    <span className={`text-xs font-bold ${p.points === 5 ? 'text-yellow-400' : p.points === 2 ? 'text-green-400' : 'text-red-400'}`}>
                                      {p.points}p
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Missing */}
                        {missing.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-red-400/60 text-xs mr-1">Missing:</span>
                            {missing.map(u => (
                              <span key={u.id} className="text-xs text-red-400/70 bg-red-500/10 px-2 py-0.5 rounded-full">
                                {u.display_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── LEADERBOARD TAB ── */}
            {tab === 'leaderboard' && (
              <div className="space-y-2">
                <div className="grid grid-cols-[40px_1fr_70px_70px_70px_80px] gap-3 px-3 mb-2">
                  {['#', 'Player', 'Exact', 'Correct', 'Scored', 'Points'].map(h => (
                    <div key={h} className="text-white/30 text-xs">{h}</div>
                  ))}
                </div>
                {leaderboard.length === 0 ? (
                  <div className="card p-12 text-center">
                    <p className="text-white/30">No scores yet — leaderboard will populate after matches finish.</p>
                  </div>
                ) : leaderboard.map((entry, i) => (
                  <div key={entry.user_id} className="card p-3 grid grid-cols-[40px_1fr_70px_70px_70px_80px] items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-xs text-white/50 font-bold">
                      {entry.rank ?? i + 1}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{entry.display_name}</p>
                      <p className="text-white/30 text-xs">{entry.predictions_made} predictions</p>
                    </div>
                    <div className="text-yellow-400 font-bold text-sm">{entry.exact_scores}</div>
                    <div className="text-green-400 text-sm">{entry.correct_outcomes}</div>
                    <div className="text-white/50 text-sm">{entry.predictions_scored}</div>
                    <div className="text-white font-bold">{entry.total_pts} <span className="text-white/30 text-xs font-normal">pts</span></div>
                  </div>
                ))}
              </div>
            )}

            {/* ── RESULTS TAB ── */}
            {tab === 'results' && (
              <div className="space-y-3">
                <p className="text-white/40 text-sm mb-4">
                  Enter final scores here. Points will be calculated automatically for all predictions on that match.
                </p>

                {/* Round filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                  {rounds.map(rk => (
                    <button
                      key={rk}
                      onClick={() => setSelectedRound(rk)}
                      className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
                        selectedRound === rk
                          ? 'bg-[#f0b429] text-black border-[#f0b429]'
                          : 'border-white/20 text-white/50 hover:text-white'
                      }`}
                    >
                      {deadlines.find(d => d.round_key === rk)?.round_label ?? rk.toUpperCase()}
                    </button>
                  ))}
                </div>

                {roundMatches.map(match => {
                  const r = resultInputs[match.id] ?? { home: '', away: '' }
                  const isFinished = match.status === 'finished'
                  const predCount = predictions.filter(p => p.match_id === match.id).length

                  return (
                    <div key={match.id} className={`card p-4 ${isFinished ? 'border-green-500/20' : ''}`}>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm">
                            {match.home_team} vs {match.away_team}
                          </p>
                          <p className="text-white/30 text-xs mt-0.5">
                            {formatDate(match.kickoff_utc)} · {predCount} predictions
                            {isFinished && match.scoring_done && <span className="text-green-400 ml-2">✓ Scored</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <input
                            type="number" min={0} max={99}
                            value={r.home}
                            onChange={e => setResultInputs(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value === '' ? '' : Number(e.target.value) } }))}
                            className="w-12 h-10 text-center bg-[#1a2234] border border-white/10 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-[#f0b429] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="—"
                          />
                          <span className="text-white/30 font-bold">–</span>
                          <input
                            type="number" min={0} max={99}
                            value={r.away}
                            onChange={e => setResultInputs(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value === '' ? '' : Number(e.target.value) } }))}
                            className="w-12 h-10 text-center bg-[#1a2234] border border-white/10 rounded-xl text-white text-lg font-bold focus:outline-none focus:border-[#f0b429] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="—"
                          />
                          <button
                            onClick={() => saveResult(match)}
                            disabled={saving || r.home === '' || r.away === ''}
                            className="btn-gold !py-2 !px-4 !text-xs"
                          >
                            {saving ? '…' : isFinished ? 'Update' : 'Save & Score'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#f0b429] text-black text-sm font-semibold px-5 py-3 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
