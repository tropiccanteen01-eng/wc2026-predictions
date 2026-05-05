// src/app/api/admin/score-match/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculatePoints } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { match_id } = await req.json()
    if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })

    const supabase = await createAdminClient()

    // Get match result
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('actual_home, actual_away, status')
      .eq('id', match_id)
      .single()

    if (matchErr || !match || match.status !== 'finished') {
      return NextResponse.json({ error: 'Match not finished or not found' }, { status: 400 })
    }

    const { actual_home, actual_away } = match
    if (actual_home == null || actual_away == null) {
      return NextResponse.json({ error: 'Match has no result' }, { status: 400 })
    }

    // Get all predictions for this match
    const { data: preds } = await supabase
      .from('predictions')
      .select('id, pred_home, pred_away')
      .eq('match_id', match_id)

    if (!preds || preds.length === 0) {
      return NextResponse.json({ message: 'No predictions to score', scored: 0 })
    }

    // Calculate and update points for each prediction
    const updates = preds.map(p => ({
      id: p.id,
      points: calculatePoints(p.pred_home, p.pred_away, actual_home, actual_away),
    }))

    // Batch update
    await Promise.all(
      updates.map(({ id, points }) =>
        supabase.from('predictions').update({ points }).eq('id', id)
      )
    )

    return NextResponse.json({ message: 'Scored', scored: updates.length, updates })
  } catch (err) {
    console.error('Score match error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
