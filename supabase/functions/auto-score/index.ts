// supabase/functions/auto-score/index.ts
// Called after a match result is confirmed
// Calculates points for every prediction and updates leaderboard

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function calculatePoints(
  predHome: number, predAway: number,
  actualHome: number, actualAway: number,
  pointsMult: number = 1
): { points: number; detail: string } {
  // Exact score
  if (predHome === actualHome && predAway === actualAway) {
    return { points: 5 * pointsMult, detail: 'exact' }
  }
  // Correct outcome
  const predOutcome = Math.sign(predHome - predAway)
  const actualOutcome = Math.sign(actualHome - actualAway)
  if (predOutcome === actualOutcome) {
    return { points: 2 * pointsMult, detail: 'outcome' }
  }
  return { points: 0, detail: 'wrong' }
}

Deno.serve(async (req) => {
  try {
    const { match_id } = await req.json()
    if (!match_id) {
      return new Response(JSON.stringify({ error: 'match_id required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get match result
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('id, home_score, away_score, status, scoring_done, points_mult, round_key')
      .eq('id', match_id)
      .single()

    if (matchErr || !match) {
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      })
    }

    if (match.status !== 'finished') {
      return new Response(JSON.stringify({ error: 'Match not finished yet' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    if (match.scoring_done) {
      return new Response(JSON.stringify({ message: 'Already scored', match_id }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (match.home_score == null || match.away_score == null) {
      return new Response(JSON.stringify({ error: 'Match has no score' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get all predictions for this match
    const { data: predictions } = await supabase
      .from('predictions')
      .select('id, user_id, pred_home, pred_away')
      .eq('match_id', match_id)
      .eq('scored', false)

    if (!predictions || predictions.length === 0) {
      await supabase.from('matches').update({ scoring_done: true, scoring_at: new Date().toISOString() }).eq('id', match_id)
      return new Response(JSON.stringify({ message: 'No predictions to score', match_id }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Score each prediction
    let exactCount = 0
    let correctCount = 0
    let wrongCount = 0

    const updates = predictions.map(p => {
      const { points, detail } = calculatePoints(
        p.pred_home, p.pred_away,
        match.home_score, match.away_score,
        match.points_mult ?? 1
      )
      if (detail === 'exact') exactCount++
      else if (detail === 'outcome') correctCount++
      else wrongCount++

      return { id: p.id, user_id: p.user_id, points, detail }
    })

    // Batch update predictions
    await Promise.all(
      updates.map(({ id, points, detail }) =>
        supabase.from('predictions').update({
          points,
          points_detail: detail,
          scored: true,
          locked: true,
        }).eq('id', id)
      )
    )

    // Mark match as scoring done
    await supabase.from('matches').update({
      scoring_done: true,
      scoring_at: new Date().toISOString(),
    }).eq('id', match_id)

    // Update leaderboard for each affected user
    const userIds = [...new Set(updates.map(u => u.user_id))]
    await Promise.all(userIds.map(uid => rebuildLeaderboardForUser(uid)))

    // Log scoring run
    await supabase.from('scoring_runs').insert({
      match_id,
      trigger_type: 'auto',
      predictions_scored: predictions.length,
      exact_count: exactCount,
      correct_count: correctCount,
      wrong_count: wrongCount,
      notes: `Score: ${match.home_score}–${match.away_score}`,
    })

    return new Response(JSON.stringify({
      message: 'Scored successfully',
      match_id,
      predictions_scored: predictions.length,
      exact: exactCount,
      correct: correctCount,
      wrong: wrongCount,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('auto-score error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function rebuildLeaderboardForUser(userId: string) {
  // Aggregate all scored predictions for this user
  const { data: preds } = await supabase
    .from('predictions')
    .select('points, points_detail, round_key')
    .eq('user_id', userId)
    .eq('scored', true)

  if (!preds) return

  const totalPts = preds.reduce((s, p) => s + (p.points ?? 0), 0)
  const exactScores = preds.filter(p => p.points_detail === 'exact').length
  const correctOutcomes = preds.filter(p => p.points_detail === 'outcome').length
  const wrong = preds.filter(p => p.points_detail === 'wrong').length

  // Points by stage
  const ptsByRound = (keys: string[]) =>
    preds.filter(p => keys.includes(p.round_key)).reduce((s, p) => s + (p.points ?? 0), 0)

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()

  const { data: allPreds } = await supabase
    .from('predictions')
    .select('id')
    .eq('user_id', userId)

  await supabase.from('leaderboard').upsert({
    user_id: userId,
    display_name: profile?.display_name ?? 'Unknown',
    total_pts: totalPts,
    exact_scores: exactScores,
    correct_outcomes: correctOutcomes,
    wrong,
    predictions_made: allPreds?.length ?? 0,
    predictions_scored: preds.length,
    pts_group: ptsByRound(['gw1', 'gw2', 'gw3']),
    pts_r32: ptsByRound(['r32']),
    pts_r16: ptsByRound(['r16']),
    pts_qf: ptsByRound(['qf']),
    pts_sf: ptsByRound(['sf']),
    pts_final: ptsByRound(['final']),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // Rebuild ranks for all users
  await supabase.rpc('rebuild_leaderboard_ranks')
}
