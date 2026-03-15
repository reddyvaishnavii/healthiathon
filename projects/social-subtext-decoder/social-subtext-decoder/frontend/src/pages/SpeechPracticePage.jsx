// SpeechPracticePage.jsx — with gamification added
// Changes: XP bar, combo multiplier, milestone celebrations, session summary
// All original code preserved — additions only

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSpeechRecognition, useSpeechSynthesis } from '../hooks/useSpeechRecognition'
import { useGameState } from '@hooks/useGameState'
import AvatarComponent  from '../components/AvatarComponent'
import PracticeChat     from '../components/PracticeChat'
import XPToast          from '../components/gamification/XPToast'
import SessionSummary   from '../components/gamification/SessionSummary'

// ─────────────────────────────────────────────
// Suggestion direction config
// ─────────────────────────────────────────────
const SUGGESTION_STYLES = [
  { label: '→ Continue',     bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800',     dot: 'bg-blue-400'   },
  { label: '? Ask',          bg: 'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-800', dot: 'bg-violet-400' },
  { label: '↩ Change topic', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800', dot: 'bg-amber-400'  },
  { label: '♥ React',        bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800',     dot: 'bg-rose-400'   },
]

// ── Milestone config ──────────────────────────────────────────────────
const MILESTONES = [
  { at: 5,  emoji: '⚡', text: '5 messages — you\'re on a roll!' },
  { at: 10, emoji: '🔥', text: '10 messages — conversation pro!' },
  { at: 20, emoji: '🏆', text: '20 messages — incredible flow!'  },
]

// ── XP Bar ────────────────────────────────────────────────────────────
function PracticeXPBar({ sessionXP, sessionMessages, comboCount, directionsUsed }) {
  const maxSessionXP = 200 // soft cap for visual
  const progress = Math.min(100, Math.round((sessionXP / maxSessionXP) * 100))

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">Session XP</span>
          <span className="text-sm font-bold text-violet-600">+{sessionXP}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Combo badge */}
          {comboCount > 0 && (
            <motion.div
              key={comboCount}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 bg-orange-50 border border-orange-200
                         text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full"
            >
              🔥 Combo x{comboCount}
            </motion.div>
          )}
          {/* Directions used dots */}
          <div className="flex items-center gap-1">
            {SUGGESTION_STYLES.map((style, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  directionsUsed.includes(['continue','ask','change','react'][i])
                    ? style.dot
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">{directionsUsed.length}/4 directions</span>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-500 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ── Milestone Toast ───────────────────────────────────────────────────
function MilestoneToast({ milestone, onDone }) {
  useEffect(() => {
    if (!milestone) return
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [milestone])

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0,  scale: 1   }}
          exit={{    opacity: 0, y: -20, scale: 0.95 }}
          className="fixed bottom-20 right-6 z-50 bg-gray-900 text-white
                     px-5 py-3 rounded-2xl shadow-2xl border border-white/10
                     flex items-center gap-3 pointer-events-none"
        >
          <span className="text-2xl">{milestone.emoji}</span>
          <span className="text-sm font-medium">{milestone.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function SpeechPracticePage() {

  const [messages, setMessages]       = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading]     = useState(false)
  const [outputMode, setOutputMode]   = useState('both')
  const [avatarEnabled, setAvatarEnabled] = useState(true)
  const [aiEmotion, setAiEmotion]     = useState('neutral')
  const [usedSuggestion, setUsedSuggestion] = useState(null)

  // ── Gamification ──
  const {
    state,
    pendingToast,
    clearToast,
    onPracticeMessage,
    resetSessionCombo,
    levelInfo,
  } = useGameState()

  const [sessionXP, setSessionXP]           = useState(0)
  const [sessionDirections, setSessionDirections] = useState([])
  const [currentMilestone, setCurrentMilestone]   = useState(null)
  const [showSummary, setShowSummary]             = useState(false)
  const [summaryStats, setSummaryStats]           = useState(null)
  const sessionXPRef        = useRef(0)
  const prevLevelRef        = useRef(levelInfo.current.level)
  const milestonesHitRef    = useRef(new Set())

  const {
    transcript, isListening, startListening,
    stopListening, resetTranscript, useFallback
  } = useSpeechRecognition()

  const { speak, isSpeaking } = useSpeechSynthesis()

  const sessionIdRef = useRef(
    localStorage.getItem('sessionId') || `session-${Date.now()}`
  )

  useEffect(() => {
    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', sessionIdRef.current)
    }
    // Reset session combo on mount
    resetSessionCombo()
  }, [])

  // ── Check milestones ──────────────────────────────────────────────
  useEffect(() => {
    const count = messages.filter(m => m.sender === 'user').length
    for (const ms of MILESTONES) {
      if (count === ms.at && !milestonesHitRef.current.has(ms.at)) {
        milestonesHitRef.current.add(ms.at)
        setCurrentMilestone(ms)
        break
      }
    }
  }, [messages])

  // ── Send Message ──────────────────────────────────────────────────
  const handleSendMessage = async (userMessage, suggestionIndex = null) => {
    if (!userMessage.trim() || isLoading) return

    try {
      setIsLoading(true)
      setUsedSuggestion(null)

      const userMsgId = messages.length + 1
      const updatedMessages = [
        ...messages,
        { sender: 'user', text: userMessage, id: userMsgId }
      ]
      setMessages(updatedMessages)

      // ── Fire gamification XP ──
      const dirIndex = suggestionIndex !== null ? suggestionIndex : -1
      onPracticeMessage(dirIndex)

      const dirLabels = ['continue', 'ask', 'change', 'react']
      if (dirIndex >= 0) {
        const dir = dirLabels[dirIndex]
        setSessionDirections(prev =>
          prev.includes(dir) ? prev : [...prev, dir]
        )
      }

      // Track session XP (approximate)
      const xpGain = 8 + (dirIndex >= 0 && !sessionDirections.includes(dirLabels[dirIndex]) ? 15 : 0)
      sessionXPRef.current += xpGain
      setSessionXP(sessionXPRef.current)

      const response = await fetch(
        'http://localhost:3001/api/practice/message',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage,
            practiceSessionId: sessionIdRef.current,
            conversationHistory: updatedMessages.slice(-6)
          })
        }
      )

      const data = await response.json()
      const aiMsg = data?.data?.response || 'I understand.'
      const newSuggestions = data?.data?.suggestions || []

      setSuggestions(newSuggestions)
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: aiMsg, id: userMsgId + 1 }
      ])
      setAiEmotion(data?.data?.isFallback ? 'concerned' : 'happy')

      if (outputMode !== 'text') {
        await speak(aiMsg)
      }

    } catch (error) {
      setMessages(prev => [
        ...prev,
        { sender: 'system', text: 'Something went wrong. Try again.', id: messages.length + 1 }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // ── Suggestion chip clicked ───────────────────────────────────────
  const handleSuggestionClick = (suggestion, index) => {
    if (isLoading) return
    setUsedSuggestion(index)
    const cleanText = suggestion
      .replace(/^(Continue|Ask|Change topic|React)\s*:\s*/i, '')
      .trim()
    handleSendMessage(cleanText, index)
  }

  // ── Voice input ───────────────────────────────────────────────────
  useEffect(() => {
    if (transcript && transcript.trim() && !isLoading) {
      handleSendMessage(transcript)
      resetTranscript()
    }
  }, [transcript, isLoading])

  // ── End session ───────────────────────────────────────────────────
  const handleEndSession = () => {
    const userMsgCount = messages.filter(m => m.sender === 'user').length
    if (userMsgCount === 0) return

    setSummaryStats({
      totalMessages: userMsgCount,
      directionsUsed: sessionDirections,
      comboCount: state.comboCount,
      xpEarned: sessionXPRef.current,
      leveledUp: levelInfo.current.level > prevLevelRef.current,
    })
    setShowSummary(true)
  }

  const handleSummaryClose = () => {
    setShowSummary(false)
    setMessages([])
    setSuggestions([])
    setSessionXP(0)
    sessionXPRef.current = 0
    setSessionDirections([])
    milestonesHitRef.current = new Set()
    prevLevelRef.current = levelInfo.current.level
    resetSessionCombo()
  }

  const userMsgCount = messages.filter(m => m.sender === 'user').length

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Conversation Practice</h1>
            <p className="text-gray-600 text-sm mt-1">
              {isListening ? '🎤 Listening… speak now'
                : isSpeaking ? '🔊 AI is speaking…'
                : isLoading  ? '⏳ Thinking…'
                :              '✅ Ready'}
            </p>
          </div>

          {/* End session button */}
          {userMsgCount > 0 && (
            <button
              onClick={handleEndSession}
              className="text-sm font-medium text-gray-500 hover:text-gray-800
                         border border-gray-200 hover:border-gray-400
                         px-4 py-2 rounded-xl transition-colors"
            >
              End session →
            </button>
          )}
        </div>

        {/* ── XP Bar ── */}
        {userMsgCount > 0 && (
          <PracticeXPBar
            sessionXP={sessionXP}
            sessionMessages={userMsgCount}
            comboCount={state.comboCount}
            directionsUsed={sessionDirections}
          />
        )}

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-semibold text-gray-700 mb-2 block">Output Mode</label>
              <select
                value={outputMode}
                onChange={(e) => setOutputMode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="text">Text Only</option>
                <option value="voice">Voice Only</option>
                <option value="both">Voice + Text</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-700 mb-2 block">Avatar</label>
              <button
                onClick={() => setAvatarEnabled(!avatarEnabled)}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  avatarEnabled ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {avatarEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {avatarEnabled && (
            <div className="lg:col-span-1">
              <AvatarComponent
                emotion={aiEmotion}
                isSpeaking={isSpeaking}
                isListening={false}
              />
            </div>
          )}

          <div className={avatarEnabled ? 'lg:col-span-2' : 'lg:col-span-3'}>

            <PracticeChat
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              isListening={isListening}
              onStartListening={startListening}
              onStopListening={stopListening}
              outputMode={outputMode}
              useFallbackInput={useFallback}
            />

            {/* ── Suggestion Chips ── */}
            {suggestions.length > 0 && (
              <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  You could say…
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestions.slice(0, 4).map((suggestion, index) => {
                    const style = SUGGESTION_STYLES[index] || SUGGESTION_STYLES[0]
                    const displayText = suggestion
                      .replace(/^(Continue|Ask|Change topic|React)\s*:\s*/i, '')
                      .trim()
                    const isUsed = usedSuggestion === index
                    return (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion, index)}
                        disabled={isLoading}
                        className={`
                          flex items-start gap-2 text-left px-3 py-2.5 rounded-lg
                          border text-sm font-medium transition-all duration-150
                          disabled:opacity-40 disabled:cursor-not-allowed
                          ${style.bg}
                          ${isUsed ? 'scale-95 opacity-60' : 'active:scale-95'}
                        `}
                      >
                        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                        <span className="leading-snug">{displayText}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && suggestions.length === 0 && (
              <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  You could say…
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Milestone toast */}
      <MilestoneToast
        milestone={currentMilestone}
        onDone={() => setCurrentMilestone(null)}
      />

      {/* Session summary modal */}
      <SessionSummary
        show={showSummary}
        stats={summaryStats}
        onClose={handleSummaryClose}
      />

      {/* XP Toast */}
      <XPToast toast={pendingToast} onDone={clearToast} />
    </div>
  )
}