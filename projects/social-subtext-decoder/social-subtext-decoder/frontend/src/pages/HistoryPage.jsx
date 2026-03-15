// HistoryPage.jsx — with gamification added
// Changes: tone collection badge shelf, stats bar, "X/10 tones discovered"
// All original code preserved — additions only

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { History, Trash2, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { useSession }    from '@hooks/useSession'
import { useHistory }    from '@hooks/useHistory'
import { useGameState }  from '@hooks/useGameState'
import ErrorBanner       from '@components/ErrorBanner'
import clsx from 'clsx'

const TONE_COLORS = {
  'Friendly':        'bg-green-50  text-green-700',
  'Neutral':         'bg-gray-100  text-gray-600',
  'Sarcastic':       'bg-orange-50 text-orange-700',
  'Dismissive':      'bg-red-50    text-red-700',
  'Sincere':         'bg-blue-50   text-blue-700',
  'Polite but Cold': 'bg-slate-100 text-slate-600',
  'Enthusiastic':    'bg-yellow-50 text-yellow-700',
  'Concerned':       'bg-purple-50 text-purple-700',
  'Uncomfortable':   'bg-pink-50   text-pink-700',
  'Joking':          'bg-teal-50   text-teal-700',
}

// ── Tone Collection Shelf ─────────────────────────────────────────────
function ToneCollectionShelf({ collected, all }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Tone Collection
        </p>
        <span className="text-xs font-bold text-violet-600">
          {collected.length}/{all.length} unlocked
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round((collected.length / all.length) * 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Badge grid */}
      <div className="flex flex-wrap gap-2">
        {all.map(tone => {
          const isUnlocked = collected.includes(tone)
          const colorClass = TONE_COLORS[tone] || 'bg-gray-100 text-gray-600'
          return (
            <motion.span
              key={tone}
              initial={false}
              animate={{ opacity: isUnlocked ? 1 : 0.35, scale: isUnlocked ? 1 : 0.95 }}
              className={clsx(
                'text-xs font-medium px-2.5 py-1 rounded-full transition-all',
                isUnlocked ? colorClass : 'bg-gray-100 text-gray-400'
              )}
            >
              {isUnlocked ? '✓ ' : '🔒 '}{tone}
            </motion.span>
          )
        })}
      </div>
    </div>
  )
}

// ── Stats Bar ─────────────────────────────────────────────────────────
function StatsBar({ totalDecoded, streak, maxCombo }) {
  const stats = [
    { label: 'Decoded',    value: totalDecoded, emoji: '🧠' },
    { label: 'Day streak', value: streak,        emoji: '🔥' },
    { label: 'Best combo', value: maxCombo,      emoji: '⚡' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(s => (
        <div key={s.label} className="card p-4 text-center">
          <p className="text-xl mb-0.5">{s.emoji}</p>
          <p className="text-xl font-bold text-gray-900">{s.value}</p>
          <p className="text-xs text-gray-400">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── HistoryItem (unchanged from original) ────────────────────────────
function HistoryItem({ entry, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const { phrase, decoded, savedAt } = entry
  const toneStyle = TONE_COLORS[decoded?.tone?.label] || TONE_COLORS['Neutral']
  const date = new Date(savedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="card overflow-hidden"
    >
      <div
        className="flex items-start justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-soft-bg transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">"{phrase}"</p>
          <p className="text-xs text-soft-muted mt-0.5">{date}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={clsx('badge text-xs', toneStyle)}>
            {decoded?.tone?.label}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(entry.id) }}
            className="p-1.5 rounded-lg text-soft-muted hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Delete entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-soft-muted" />
            : <ChevronDown className="w-4 h-4 text-soft-muted" />
          }
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-3 border-t border-soft-border pt-3">
              <div>
                <p className="text-xs font-semibold text-decode-literal uppercase tracking-wider mb-1">Literal</p>
                <p className="text-sm text-gray-700">{decoded?.literal}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-decode-social uppercase tracking-wider mb-1">Social meaning</p>
                <p className="text-sm text-gray-700">{decoded?.social}</p>
              </div>
              {decoded?.suggestedResponses?.[0] && (
                <div>
                  <p className="text-xs font-semibold text-decode-respond uppercase tracking-wider mb-1">Top response</p>
                  <p className="text-sm text-gray-700">"{decoded.suggestedResponses[0].text}"</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── HistoryPage ───────────────────────────────────────────────────────
export default function HistoryPage() {
  const sessionId = useSession()
  const { history, loading, error, remove, clear } = useHistory(sessionId)
  const { state, ALL_TONES } = useGameState()
  const navigate = useNavigate()

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900">History</h1>
          <p className="text-soft-muted text-sm mt-0.5">
            {history.length} phrase{history.length !== 1 ? 's' : ''} decoded this session
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={clear}
            className="btn-ghost text-sm flex items-center gap-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* ── GAMIFICATION: Stats bar ── */}
      <StatsBar
        totalDecoded={state.totalDecoded}
        streak={state.streak}
        maxCombo={state.maxCombo}
      />

      {/* ── GAMIFICATION: Tone collection shelf ── */}
      <ToneCollectionShelf
        collected={state.toneCollection}
        all={ALL_TONES}
      />

      {/* Error */}
      {error && <ErrorBanner message={error} />}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && history.length === 0 && (
        <div className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
            <History className="w-7 h-7 text-primary-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">No history yet</p>
            <p className="text-soft-muted text-sm mt-1">
              Decode phrases to discover all {ALL_TONES.length} tones!
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn-primary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Decode a phrase
          </button>
        </div>
      )}

      {/* History list */}
      <AnimatePresence mode="popLayout">
        {history.map(entry => (
          <HistoryItem key={entry.id} entry={entry} onDelete={remove} />
        ))}
      </AnimatePresence>
    </div>
  )
}