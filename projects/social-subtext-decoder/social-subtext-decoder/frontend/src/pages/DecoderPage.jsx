// DecoderPage.jsx — with gamification added
// Changes: streak counter in header, XPToast on decode, tone unlock flash

import { useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSession }    from '@hooks/useSession'
import { useDecode }     from '@hooks/useDecode'
import { useGameState }  from '@hooks/useGameState'
import DecoderInput      from '@components/DecoderInput'
import ResultCard        from '@components/ResultCard'
import LoadingSkeleton   from '@components/LoadingSkeleton'
import ErrorBanner       from '@components/ErrorBanner'
import XPToast           from '@components/gamification/XPToast'

export default function DecoderPage() {
  const sessionId = useSession()
  const { result, loading, error, decode, reset } = useDecode(sessionId)
  const {
    state,
    pendingToast,
    clearToast,
    onPhraseDecoded,
    ALL_TONES,
  } = useGameState()

  const prevResultRef = useRef(null)

  // Fire XP when result appears
  useEffect(() => {
    if (result && result !== prevResultRef.current) {
      prevResultRef.current = result
      const tone = result?.tone?.label
      onPhraseDecoded(tone)
    }
  }, [result])

  const tonesDiscovered = state.toneCollection.length
  const tonesTotal      = ALL_TONES.length

  return (
    <div className="space-y-5">

      {/* ── Streak + collection bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Streak */}
          {state.streak > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              className="flex items-center gap-1.5 bg-orange-50 border border-orange-200
                         text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full"
            >
              🔥 {state.streak} day streak
            </motion.div>
          )}

          {/* Tones discovered */}
          <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200
                          text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            🎨 {tonesDiscovered}/{tonesTotal} tones discovered
          </div>
        </div>

        {/* Total decoded */}
        <div className="text-xs text-gray-400">
          {state.totalDecoded} phrase{state.totalDecoded !== 1 ? 's' : ''} decoded
        </div>
      </div>

      {/* Input — hide once we have a result */}
      {!result && !loading && (
        <DecoderInput onDecode={decode} loading={loading} />
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <ErrorBanner message={error} onDismiss={reset} />
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {loading && <LoadingSkeleton />}

      {/* Result */}
      {result && !loading && (
        <ResultCard result={result} onReset={reset} />
      )}

      {/* XP Toast */}
      <XPToast toast={pendingToast} onDone={clearToast} />
    </div>
  )
}