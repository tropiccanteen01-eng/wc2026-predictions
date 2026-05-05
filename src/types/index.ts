// ─── Database Types ───────────────────────────────────────────────────────────

export interface Profile {
  id: string
  display_name: string
  email: string
  is_admin: boolean
  created_at: string
}

export interface Match {
  id: string
  round: string          // 'Group Stage', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'
  group?: string         // 'A' | 'B' | ... for group stage
  home_team: string
  away_team: string
  home_flag: string      // emoji or URL
  away_flag: string
  kickoff_utc: string    // ISO timestamp
  venue: string
  actual_home?: number | null
  actual_away?: number | null
  status: 'scheduled' | 'live' | 'finished'
  scored_at?: string | null
}

export interface RoundDeadline {
  id: string
  round: string
  deadline_utc: string   // 1 hour before first match of round
  is_active: boolean
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  pred_home: number
  pred_away: number
  points?: number | null
  created_at: string
  updated_at: string
  // Joined
  match?: Match
  profile?: Profile
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  total_points: number
  exact_scores: number    // 5-point hits
  correct_outcomes: number // 2-point hits
  predictions_made: number
  rank: number
}

// ─── UI / State Types ─────────────────────────────────────────────────────────

export type PredictionInput = {
  match_id: string
  pred_home: number | ''
  pred_away: number | ''
}

export type DeadlineStatus = 'open' | 'locked' | 'unknown'

export interface RoundGroup {
  round: string
  deadline: RoundDeadline | null
  deadlineStatus: DeadlineStatus
  matches: Match[]
}
