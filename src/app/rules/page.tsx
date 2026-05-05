// src/app/rules/page.tsx
// Static server component - no auth needed
export default function RulesPage() {
  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-2xl mx-auto pt-8">
        <h1 className="text-2xl font-bold text-white mb-8">📋 Rules</h1>

        <div className="space-y-4">

          {/* Points */}
          <div className="card p-6">
            <h2 className="text-[#f0b429] font-semibold mb-4">Points System</h2>
            <div className="space-y-3">
              {[
                { pts: '⭐ 5 points', desc: 'Exact score — you predict the exact final score (e.g. 2–1 and the result is 2–1)' },
                { pts: '✓ 2 points', desc: 'Correct outcome — you got the right result (win/draw/loss) but wrong scoreline' },
                { pts: '✗ 0 points', desc: 'Wrong outcome — the result was different from what you predicted' },
              ].map(({ pts, desc }) => (
                <div key={pts} className="flex gap-4">
                  <span className="text-white font-bold text-sm w-24 flex-shrink-0">{pts}</span>
                  <span className="text-white/60 text-sm">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Deadlines */}
          <div className="card p-6">
            <h2 className="text-[#f0b429] font-semibold mb-4">Deadlines</h2>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>• Each round has a single deadline — <strong className="text-white">1 hour before the first match</strong> of that round.</li>
              <li>• After the deadline, you <strong className="text-white">cannot submit or change</strong> predictions for that round.</li>
              <li>• Predictions for <strong className="text-white">all matches in a round</strong> must be submitted before the deadline.</li>
              <li>• You can update predictions any number of times before the deadline.</li>
              <li>• Missed deadline = 0 points for that round.</li>
            </ul>
          </div>

          {/* Scoring */}
          <div className="card p-6">
            <h2 className="text-[#f0b429] font-semibold mb-4">Auto-Scoring</h2>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>• Scores are updated automatically after each match ends.</li>
              <li>• The leaderboard refreshes in real-time — no page reload needed.</li>
              <li>• Your dashboard shows your predictions and points for each match.</li>
            </ul>
          </div>

          {/* Rounds */}
          <div className="card p-6">
            <h2 className="text-[#f0b429] font-semibold mb-4">Rounds</h2>
            <div className="space-y-2">
              {[
                ['Group Stage', '48 matches · predict all group games'],
                ['Round of 16', '8 matches'],
                ['Quarter-final', '4 matches'],
                ['Semi-final', '2 matches'],
                ['Third Place', '1 match'],
                ['Final', '1 match · the big one 🏆'],
              ].map(([round, note]) => (
                <div key={round} className="flex gap-3 items-start">
                  <span className="text-white text-sm font-medium w-36 flex-shrink-0">{round}</span>
                  <span className="text-white/40 text-sm">{note}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
