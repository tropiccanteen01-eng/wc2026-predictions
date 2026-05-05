'use client'
// src/app/leaderboard/page.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface LeaderboardEntry {
  user_id: string
  display_name: string
  total_pts: number
  exact_scores: number
  correct_outcomes: number
  predictions_made: number
  predictions_scored: number
  pts_group: number
  pts_r16: number
  pts_qf: number
  pts_sf: number
  pts_final: number
  rank: number | null
  prev_rank: number | null
}

export default function LeaderboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setMyId(user.id)
    })
  }, [])

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_pts', { ascending: false })
      .order('exact_scores', { ascending: false })

    if (data) {
      // Assign ranks client-side if not set
      const ranked = data.map((row, i) => ({ ...row, rank: row.rank ?? i + 1 }))
      setEntries(ranked)
      setLastUpdated(new Date())
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLeaderboard()

    // Real-time updates when leaderboard changes
    const channel = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, loadLeaderboard)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const rankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-black'
    if (rank === 2) return 'bg-gray-400 text-black'
    if (rank === 3) return 'bg-amber-600 text-white'
    return 'bg-white/[0.08] text-white/50'
  }

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  const myEntry = entries.find(e => e.user_id === myId)

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-2xl mx-auto pt-8">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🏆 Leaderboard</h1>
            {lastUpdated && (
              <p className="text-white/30 text-xs mt-1">
                Live · Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          {myEntry && (
            <div className="text-right">
              <p className="text-[#f0b429] font-bold text-2xl">{myEntry.total_pts} pts</p>
              <p className="text-white/40 text-xs">Rank #{myEntry.rank}</p>
            </div>
          )}
        </div>

        {/* My position highlight if outside top 5 */}
        {myEntry && (myEntry.rank ?? 99) > 5 && (
          <div className="card p-4 mb-4 border-[#f0b429]/30 bg-[#f0b429]/5">
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${rankStyle(myEntry.rank ?? 99)}`}>
                {myEntry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#f0b429] font-semibold text-sm truncate">
                  {myEntry.display_name} (You)
                </p>
                <p className="text-white/40 text-xs">
                  {myEntry.exact_scores} exact · {myEntry.correct_outcomes} correct
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white font-bold">{myEntry.total_pts}</p>
                <p className="text-white/30 text-xs">{myEntry.predictions_scored} scored</p>
              </div>
            </div>
          </div>
        )}

        {/* Column headers */}
        <div className="grid grid-cols-[40px_1fr_60px_70px] gap-3 px-2 mb-2">
          <div className="text-white/30 text-xs">#</div>
          <div className="text-white/30 text-xs">Player</div>
          <div className="text-white/30 text-xs text-center">⭐ Exact</div>
          <div className="text-white/30 text-xs text-right">Points</div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-white/30 text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">🏜️</div>
            <p className="text-white/40">No predictions scored yet.</p>
            <p className="text-white/25 text-sm mt-1">Leaderboard updates after matches finish.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const rank = entry.rank ?? i + 1
              const isMe = entry.user_id === myId
              const movedUp = entry.prev_rank && rank < entry.prev_rank
              const movedDown = entry.prev_rank && rank > entry.prev_rank

              return (
                <div
                  key={entry.user_id}
                  className={`card p-4 grid grid-cols-[40px_1fr_60px_70px] items-center gap-3 ${
                    isMe ? 'border-[#f0b429]/30 bg-[#f0b429]/5' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankStyle(rank)}`}>
                    {rankEmoji(rank)}
                  </div>

                  {/* Name + movement */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className={`font-semibold text-sm truncate ${isMe ? 'text-[#f0b429]' : 'text-white'}`}>
                        {entry.display_name}{isMe ? ' 👈' : ''}
                      </p>
                      {movedUp && <span className="text-green-400 text-xs">↑</span>}
                      {movedDown && <span className="text-red-400 text-xs">↓</span>}
                    </div>
                    <p className="text-white/30 text-xs">
                      {entry.predictions_scored}/{entry.predictions_made} scored
                    </p>
                  </div>

                  {/* Exact / correct */}
                  <div className="text-center">
                    <span className="text-yellow-400 font-bold text-sm">{entry.exact_scores}</span>
                    <span className="text-white/20 text-xs"> / </span>
                    <span className="text-green-400 text-xs">{entry.correct_outcomes}</span>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <span className="text-white font-bold">{entry.total_pts}</span>
                    <span className="text-white/30 text-xs"> pts</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Points legend */}
        <div className="mt-8 card p-4">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Points System</p>
          <div className="space-y-2">
            {[
              ['chip-5pts', '5 pts', 'Exact score'],
              ['chip-2pts', '2 pts', 'Correct outcome (win/draw/loss)'],
              ['chip-0pts', '0 pts', 'Wrong outcome'],
            ].map(([cls, label, desc]) => (
              <div key={label} className="flex items-center gap-3">
                <span className={cls}>{label}</span>
                <span className="text-white/60 text-sm">{desc}</span>
              </div>
            ))}
            <p className="text-white/25 text-xs mt-2">
              Knockout rounds: points multiplied × 2. Final: × 3.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
