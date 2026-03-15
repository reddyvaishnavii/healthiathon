// ═══════════════════════════════════════════════════════════════════════
// LevelBadge — compact XP bar + level for nav/header
// Usage: <LevelBadge levelInfo={levelInfo} />
// ═══════════════════════════════════════════════════════════════════════

import { motion, AnimatePresence } from 'framer-motion'
import { useGameState } from '@hooks/useGameState'

export default function LevelBadge() {
  const { levelInfo, levelUpInfo, clearLevelUp } = useGameState()
  const { current, next, progress, xp } = levelInfo

  return (
    <>
      {/* Compact badge */}
      <div className="flex items-center gap-2 bg-gray-900/5 border border-gray-200
                      rounded-xl px-3 py-1.5 select-none">

        <span className="text-lg leading-none">{current.emoji}</span>

        <div className="flex flex-col gap-0.5 min-w-[80px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{current.title}</span>
            <span className="text-xs text-gray-400">{xp} XP</span>
          </div>

          {/* XP progress bar */}
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden w-full">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Level-up overlay */}
      <AnimatePresence>
        {levelUpInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1   }}
            exit={{    opacity: 0, scale: 1.1  }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="fixed inset-0 z-50 flex items-center justify-center
                       bg-black/40 backdrop-blur-sm"
            onClick={clearLevelUp}
          >
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl
                            max-w-xs w-full mx-4 border border-gray-100">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-6xl mb-3"
              >
                {levelUpInfo.emoji}
              </motion.div>
              <p className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-1">
                Level Up!
              </p>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {levelUpInfo.title}
              </h2>
              <p className="text-gray-500 text-sm mb-5">You're getting better at this 🎉</p>
              <button
                onClick={clearLevelUp}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-xl
                           text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                Keep going →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}