// src/lib/utils/index.ts

import type { DeadlineStatus, Match, RoundDeadline } from '@/types'

// ─── Deadline Helpers ─────────────────────────────────────────────────────────

export function getDeadlineStatus(deadline: RoundDeadline | null | undefined): DeadlineStatus {
  if (!deadline) return 'unknown'
  const now = new Date()
  const dl = new Date(deadline.deadline_utc)
  return now < dl ? 'open' : 'locked'
}

export function formatDeadline(deadline: RoundDeadline | null | undefined): string {
  if (!deadline) return 'No deadline set'
  const dl = new Date(deadline.deadline_utc)
  return dl.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function timeUntilDeadline(deadline: RoundDeadline | null | undefined): string {
  if (!deadline) return ''
  const now = new Date()
  const dl = new Date(deadline.deadline_utc)
  const diff = dl.getTime() - now.getTime()
  if (diff <= 0) return 'Locked'
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  if (hours > 48) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// ─── Match / Score Helpers ────────────────────────────────────────────────────

export function formatKickoff(utc: string): string {
  return new Date(utc).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): number {
  // Exact score → 5 pts
  if (predHome === actualHome && predAway === actualAway) return 5
  // Correct outcome → 2 pts
  const predOutcome = Math.sign(predHome - predAway)
  const actualOutcome = Math.sign(actualHome - actualAway)
  if (predOutcome === actualOutcome) return 2
  return 0
}

export function pointsLabel(points: number | null | undefined): string {
  if (points == null) return '—'
  if (points === 5) return '⭐ 5 pts'
  if (points === 2) return '✓ 2 pts'
  return '✗ 0 pts'
}

export function pointsColor(points: number | null | undefined): string {
  if (points == null) return 'text-gray-400'
  if (points === 5) return 'text-yellow-500'
  if (points === 2) return 'text-green-500'
  return 'text-red-400'
}

// ─── Round ordering ───────────────────────────────────────────────────────────

const ROUND_ORDER: Record<string, number> = {
  'Group Stage': 1,
  'Round of 16': 2,
  'Quarter-final': 3,
  'Semi-final': 4,
  'Third Place': 5,
  'Final': 6,
}

export function sortRounds(rounds: string[]): string[] {
  return [...rounds].sort((a, b) => (ROUND_ORDER[a] ?? 99) - (ROUND_ORDER[b] ?? 99))
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
