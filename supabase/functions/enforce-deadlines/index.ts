// supabase/functions/enforce-deadlines/index.ts
// Runs every 5 minutes via cron
// Closes any rounds whose deadline has passed

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (_req) => {
  try {
    const now = new Date().toISOString()

    // Find all rounds that are still marked open but deadline has passed
    const { data: expiredRounds, error } = await supabase
      .from('round_deadlines')
      .select('round_key, round_label, deadline_utc')
      .eq('is_open', true)
      .lt('deadline_utc', now)

    if (error) throw error

    if (!expiredRounds || expiredRounds.length === 0) {
      return new Response(JSON.stringify({ message: 'No rounds to close', closed: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Close each expired round
    const roundKeys = expiredRounds.map(r => r.round_key)

    const { error: updateErr } = await supabase
      .from('round_deadlines')
      .update({ is_open: false })
      .in('round_key', roundKeys)

    if (updateErr) throw updateErr

    // Lock all predictions for these rounds
    await supabase
      .from('predictions')
      .update({ locked: true })
      .in('round_key', roundKeys)
      .eq('locked', false)

    console.log(`Closed rounds: ${roundKeys.join(', ')}`)

    return new Response(JSON.stringify({
      message: 'Rounds closed',
      closed: expiredRounds.length,
      rounds: roundKeys,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('enforce-deadlines error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})
