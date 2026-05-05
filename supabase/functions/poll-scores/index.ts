// supabase/functions/poll-scores/index.ts
// Runs every 2 minutes via cron during tournament
// Fetches match results and updates the matches table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Flag emojis by country code
const FLAGS: Record<string, string> = {
  MEX: '🇲🇽', POL: '🇵🇱', KSA: '🇸🇦', ARG: '🇦🇷',
  USA: '🇺🇸', WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', IRN: '🇮🇷',
  FRA: '🇫🇷', AUS: '🇦🇺', DEN: '🇩🇰', TUN: '🇹🇳',
  ESP: '🇪🇸', CRC: '🇨🇷', GER: '🇩🇪', JPN: '🇯🇵',
  BEL: '🇧🇪', CAN: '🇨🇦', MAR: '🇲🇦', CRO: '🇭🇷',
  BRA: '🇧🇷', SRB: '🇷🇸', POR: '🇵🇹', GHA: '🇬🇭',
  URU: '🇺🇾', KOR: '🇰🇷', NED: '🇳🇱', SEN: '🇸🇳',
  ECU: '🇪🇨', QAT: '🇶🇦', NGA: '🇳🇬', TBD: '🏳️',
}

Deno.serve(async (req) => {
  try {
    const now = new Date()

    // Get all matches that are scheduled/live and kickoff has passed
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, external_id, home_team, away_team, home_code, away_code, kickoff_utc, status, scoring_done, round_key')
      .in('status', ['scheduled', 'live'])
      .lt('kickoff_utc', now.toISOString())
      .neq('home_team', 'TBD')

    if (error) throw error
    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ message: 'No matches to poll', checked: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get('BALLDONTLIE_API_KEY')
    let resultsUpdated = 0
    let apiCalls = 0

    for (const match of matches) {
      try {
        // Calculate how long ago kickoff was
        const kickoff = new Date(match.kickoff_utc)
        const minutesSinceKickoff = (now.getTime() - kickoff.getTime()) / 60_000

        // Skip if kickoff was less than 85 minutes ago (match likely still live)
        // Only start checking after 85 mins (earliest a match could finish)
        if (minutesSinceKickoff < 85) {
          // Mark as live
          await supabase
            .from('matches')
            .update({ status: 'live' })
            .eq('id', match.id)
          continue
        }

        // Try to fetch result from BallDontLie or fall back to manual
        // BallDontLie WC2026 endpoint (adjust when API is live)
        if (apiKey && apiKey !== 'your_balldontlie_key_here') {
          const res = await fetch(
            `https://api.balldontlie.io/v1/soccer/matches?external_id=${match.external_id}`,
            { headers: { Authorization: apiKey } }
          )
          apiCalls++

          if (res.ok) {
            const json = await res.json()
            const result = json.data?.[0]

            if (result && result.status === 'finished') {
              await supabase.from('matches').update({
                status: 'finished',
                home_score: result.home_score,
                away_score: result.away_score,
                last_synced_at: now.toISOString(),
              }).eq('id', match.id)

              resultsUpdated++

              // Trigger auto-scoring for this match
              await supabase.functions.invoke('auto-score', {
                body: { match_id: match.id }
              })
            }
          }
        } else {
          // No API key — if 110+ minutes since kickoff, mark as likely finished
          // Admin will enter score manually via admin panel
          if (minutesSinceKickoff > 110) {
            await supabase.from('matches').update({
              status: 'live',
              last_synced_at: now.toISOString(),
            }).eq('id', match.id)
          }
        }
      } catch (matchErr) {
        console.error(`Error processing match ${match.id}:`, matchErr)
      }
    }

    // Log the sync run
    await supabase.from('sync_log').insert({
      matches_checked: matches.length,
      results_updated: resultsUpdated,
      api_calls_used: apiCalls,
      notes: apiKey && apiKey !== 'your_balldontlie_key_here'
        ? 'API polling active'
        : 'No API key — manual mode',
    })

    return new Response(JSON.stringify({
      message: 'Poll complete',
      checked: matches.length,
      updated: resultsUpdated,
      api_calls: apiCalls,
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('poll-scores error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
