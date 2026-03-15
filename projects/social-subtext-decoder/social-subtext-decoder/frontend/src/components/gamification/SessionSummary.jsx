// ═══════════════════════════════════════════════════════════════════════
// SessionSummary — end-of-practice modal
// Usage: <SessionSummary stats={...} onClose={fn} />
// ═══════════════════════════════════════════════════════════════════════

import { motion, AnimatePresence } from 'framer-motion'

const DIRECTION_LABELS = {
  continue: { label: 'Kept going',    emoji: '→', color: 'text-blue-600 bg-blue-50'   },
  ask:      { label: 'Asked back',    emoji: '?', color: 'text-violet-600 bg-violet-50'},
  change:   { label: 'Changed topic', emoji: '↩', color: 'text-amber-600 bg-amber-50' },
  react:    { label: 'Expressed feeling', emoji: '♥', color: 'text-rose-600 bg-rose-50' },
}

export default function SessionSummary({ stats, onClose, show }) {
  if (!stats) return null

  const {
    totalMessages = 0,
    directionsUsed = [],
    comboCount = 0,
    xpEarned = 0,
    leveledUp = false,
  } = stats

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/40 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 20, scale: 0.97  }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7
                       border border-gray-100"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">
                {totalMessages >= 10 ? '🏆' : totalMessages >= 5 ? '⚡' : '💬'}
              </div>
              <h2 className="text-xl font-bold text-gray-900">Session Complete!</h2>
              <p className="text-gray-500 text-sm mt-1">Here's how you did</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{totalMessages}</p>
                <p className="text-xs text-gray-500 mt-0.5">Messages</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{directionsUsed.length}/4</p>
                <p className="text-xs text-gray-500 mt-0.5">Directions</p>
              </div>
              <div className="bg-yellow-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">+{xpEarned}</p>
                <p className="text-xs text-yellow-600/70 mt-0.5">XP earned</p>
              </div>
            </div>

            {/* Directions used */}
            {directionsUsed.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Directions explored
                </p>
                <div className="flex flex-wrap gap-2">
                  {directionsUsed.map(dir => {
                    const d = DIRECTION_LABELS[dir] || { label: dir, emoji: '•', color: 'text-gray-600 bg-gray-50' }
                    return (
                      <span key={dir}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${d.color}`}>
                        {d.emoji} {d.label}
                      </span>
                    )
                  })}
                  {/* Locked directions */}
                  {Object.keys(DIRECTION_LABELS)
                    .filter(k => !directionsUsed.includes(k))
                    .map(dir => (
                      <span key={dir}
                        className="text-xs font-medium px-2.5 py-1 rounded-full
                                   text-gray-300 bg-gray-50 border border-dashed border-gray-200">
                        {DIRECTION_LABELS[dir].emoji} {DIRECTION_LABELS[dir].label}
                      </span>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Combo */}
            {comboCount > 0 && (
              <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50
                              border border-violet-100 rounded-2xl p-3 mb-5 flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-sm font-semibold text-violet-700">
                    Best combo: x{comboCount}
                  </p>
                  <p className="text-xs text-violet-500">You mixed up conversation directions!</p>
                </div>
              </div>
            )}

            {/* Level up notice */}
            {leveledUp && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 mb-5
                              flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <p className="text-sm font-semibold text-yellow-700">You leveled up this session!</p>
              </div>
            )}

            {/* Tip based on performance */}
            <div className="bg-blue-50 rounded-2xl p-3 mb-6">
              <p className="text-xs text-blue-700">
                💡 {directionsUsed.length < 3
                  ? 'Try using more conversation directions next time for a combo bonus!'
                  : totalMessages < 5
                  ? 'Keep chatting longer to unlock milestone rewards!'
                  : 'Great session! You\'re building real conversation skills.'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-3 rounded-xl
                         font-semibold text-sm hover:bg-gray-700 transition-colors"
            >
              Start new session →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}