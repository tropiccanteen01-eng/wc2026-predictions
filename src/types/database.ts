// src/types/database.ts
// Full type definitions for every Supabase table and relationship.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RoundKey = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
export type MatchStatus = 'scheduled' | 'live' | 'ft' | 'postponed'
export type PointsDetail = 'exact' | 'correct_outcome' | 'wrong'
export type TriggerType = 'auto' | 'manual'

// ── TABLE ROWS ────────────────────────────────────────────────────

export interface Profile {
  id: string
  display_name: string
  email: string
  is_admin: boolean
  created_at: string
}

export interface RoundDeadline {
  id: string
  round_key: RoundKey
  round_label: string
  deadline_utc: string       // ISO timestamp — 1hr before first match
  first_match_utc: string
  is_open: boolean
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  external_id: string | null
  round_key: RoundKey
  stage_label: string
  group_name: string | null
  match_number: number
  home_team: string
  away_team: string
  home_code: string
  away_code: string
  kickoff_utc: string
  venue: string | null
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  minute: number | null
  points_mult: number        // 1 = group, 2 = KO rounds, 3 = final
  scoring_done: boolean
  scoring_at: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  round_key: RoundKey
  pred_home: number
  pred_away: number
  submitted_at: string
  points: number | null
  points_detail: PointsDetail | null
  locked: boolean
  scored: boolean
  version: number
}

export interface PredictionWithMatch extends Prediction {
  match: Match
}

export interface PredictionHistory {
  id: string
  prediction_id: string
  user_id: string
  match_id: string
  round_key: RoundKey
  pred_home: number
  pred_away: number
  version: number
  saved_at: string
  ip_address: string | null
  user_agent: string | null
}

export interface LeaderboardRow {
  user_id: string
  display_name: string
  total_pts: number
  exact_scores: number
  correct_outcomes: number
  wrong: number
  predictions_made: number
  predictions_scored: number
  pts_group: number
  pts_r32: number
  pts_r16: number
  pts_qf: number
  pts_sf: number
  pts_final: number
  rank: number
  prev_rank: number | null
  updated_at: string
}

export interface ScoringRun {
  id: string
  match_id: string | null
  triggered_at: string
  trigger_type: TriggerType
  predictions_scored: number
  exact_count: number
  correct_count: number
  wrong_count: number
  notes: string | null
}

export interface SyncLog {
  id: string
  synced_at: string
  matches_checked: number
  results_updated: number
  api_calls_used: number
  notes: string | null
}

// ── SUPABASE DATABASE TYPE (for createClient generic) ─────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      round_deadlines: {
        Row: RoundDeadline
        Insert: Omit<RoundDeadline, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RoundDeadline, 'id' | 'created_at'>>
      }
      matches: {
        Row: Match
        Insert: Omit<Match, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Match, 'id' | 'created_at'>>
      }
      predictions: {
        Row: Prediction
        Insert: Omit<Prediction, 'id' | 'submitted_at' | 'version'>
        Update: Partial<Pick<Prediction, 'pred_home' | 'pred_away' | 'points' | 'points_detail' | 'locked' | 'scored'>>
      }
      prediction_history: {
        Row: PredictionHistory
        Insert: Omit<PredictionHistory, 'id' | 'saved_at'>
        Update: never
      }
      leaderboard: {
        Row: LeaderboardRow
        Insert: Omit<LeaderboardRow, 'updated_at'>
        Update: Partial<Omit<LeaderboardRow, 'user_id'>>
      }
      scoring_runs: {
        Row: ScoringRun
        Insert: Omit<ScoringRun, 'id' | 'triggered_at'>
        Update: never
      }
      sync_log: {
        Row: SyncLog
        Insert: Omit<SyncLog, 'id' | 'synced_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      round_key: RoundKey
      match_status: MatchStatus
      points_detail: PointsDetail
    }
  }
}
