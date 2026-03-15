// ═══════════════════════════════════════════════════════════════════════
// useGameState — Central Gamification Hook
// Persists to localStorage. Import this in any page.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react'

// ── Level thresholds ──────────────────────────────────────────────────
export const LEVELS = [
  { level: 1, title: 'Beginner',      emoji: '🌱', minXP: 0   },
  { level: 2, title: 'Communicator',  emoji: '💬', minXP: 100 },
  { level: 3, title: 'Social Pro',    emoji: '⚡', minXP: 300 },
  { level: 4, title: 'Expert',        emoji: '🏆', minXP: 600 },
  { level: 5, title: 'Master',        emoji: '👑', minXP: 1000 },
]

// ── XP rewards ───────────────────────────────────────────────────────
export const XP_REWARDS = {
  DECODE_PHRASE:       10,
  NEW_TONE_UNLOCKED:   25,
  PRACTICE_MESSAGE:    8,
  COMBO_MULTIPLIER:    15,
  LIVE_SESSION:        20,
  STREAK_BONUS:        30,
  MILESTONE_5_MSGS:    20,
  MILESTONE_TOPIC_CHANGE: 15,
}

// ── All possible tones ────────────────────────────────────────────────
export const ALL_TONES = [
  'Friendly', 'Neutral', 'Sarcastic', 'Dismissive',
  'Sincere', 'Polite but Cold', 'Enthusiastic',
  'Concerned', 'Uncomfortable', 'Joking'
]

const STORAGE_KEY = 'convoai_gamestate'

const DEFAULT_STATE = {
  xp: 0,
  level: 1,
  streak: 0,         // days in a row
  lastActiveDate: null,
  toneCollection: [], // tones the user has unlocked
  totalDecoded: 0,
  totalPracticeMessages: 0,
  totalLiveSessions: 0,
  comboCount: 0,      // current practice combo
  maxCombo: 0,
  practiceDirectionsUsed: [], // which suggestion directions used this session
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_STATE
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function getLevelInfo(xp) {
  let current = LEVELS[0]
  let next = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      current = LEVELS[i]
      next = LEVELS[i + 1] || null
      break
    }
  }
  const progressXP = next ? xp - current.minXP : current.minXP
  const rangeXP    = next ? next.minXP - current.minXP : 1
  const progress   = Math.min(100, Math.round((progressXP / rangeXP) * 100))
  return { current, next, progress, xp }
}

// ─────────────────────────────────────────────────────────────────────
export function useGameState() {
  const [state, setState] = useState(loadState)
  const [pendingToast, setPendingToast] = useState(null) // { xp, reason }
  const [levelUpInfo, setLevelUpInfo]   = useState(null) // level they just reached

  // Persist whenever state changes
  useEffect(() => {
    saveState(state)
  }, [state])

  // ── Update streak on mount ─────────────────────────────────────────
  useEffect(() => {
    const today = new Date().toDateString()
    setState(prev => {
      if (prev.lastActiveDate === today) return prev
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      const newStreak = prev.lastActiveDate === yesterday ? prev.streak + 1 : 1
      return { ...prev, streak: newStreak, lastActiveDate: today }
    })
  }, [])

  // ── Core: add XP ──────────────────────────────────────────────────
  const addXP = useCallback((amount, reason = '') => {
    setState(prev => {
      const oldLevel = getLevelInfo(prev.xp).current.level
      const newXP    = prev.xp + amount
      const newLevel = getLevelInfo(newXP).current.level

      if (newLevel > oldLevel) {
        setLevelUpInfo(LEVELS.find(l => l.level === newLevel))
      }

      setPendingToast({ xp: amount, reason })
      return { ...prev, xp: newXP }
    })
  }, [])

  // ── Decoder actions ───────────────────────────────────────────────
  const onPhraseDecoded = useCallback((tone) => {
    setState(prev => {
      const isNewTone = tone && !prev.toneCollection.includes(tone)
      const newCollection = isNewTone
        ? [...prev.toneCollection, tone]
        : prev.toneCollection

      const xpGain = XP_REWARDS.DECODE_PHRASE + (isNewTone ? XP_REWARDS.NEW_TONE_UNLOCKED : 0)

      const oldLevel = getLevelInfo(prev.xp).current.level
      const newXP    = prev.xp + xpGain
      const newLevel = getLevelInfo(newXP).current.level
      if (newLevel > oldLevel) setLevelUpInfo(LEVELS.find(l => l.level === newLevel))

      setPendingToast({
        xp: xpGain,
        reason: isNewTone ? `New tone unlocked: ${tone}!` : 'Phrase decoded'
      })

      return {
        ...prev,
        xp: newXP,
        toneCollection: newCollection,
        totalDecoded: prev.totalDecoded + 1,
      }
    })
  }, [])

  // ── Practice actions ──────────────────────────────────────────────
  const onPracticeMessage = useCallback((directionIndex) => {
    setState(prev => {
      const directionLabels = ['continue', 'ask', 'change', 'react']
      const dir = directionLabels[directionIndex] || 'continue'

      const alreadyUsed = prev.practiceDirectionsUsed.includes(dir)
      const newDirections = alreadyUsed
        ? prev.practiceDirectionsUsed
        : [...prev.practiceDirectionsUsed, dir]

      const isCombo = !alreadyUsed && newDirections.length > 1
      const newCombo = isCombo ? prev.comboCount + 1 : prev.comboCount

      const xpGain = XP_REWARDS.PRACTICE_MESSAGE + (isCombo ? XP_REWARDS.COMBO_MULTIPLIER : 0)

      const oldLevel = getLevelInfo(prev.xp).current.level
      const newXP    = prev.xp + xpGain
      const newLevel = getLevelInfo(newXP).current.level
      if (newLevel > oldLevel) setLevelUpInfo(LEVELS.find(l => l.level === newLevel))

      setPendingToast({
        xp: xpGain,
        reason: isCombo ? `Combo x${newCombo}! 🔥` : 'Message sent'
      })

      return {
        ...prev,
        xp: newXP,
        totalPracticeMessages: prev.totalPracticeMessages + 1,
        comboCount: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
        practiceDirectionsUsed: newDirections,
      }
    })
  }, [])

  const resetSessionCombo = useCallback(() => {
    setState(prev => ({ ...prev, comboCount: 0, practiceDirectionsUsed: [] }))
  }, [])

  // ── Live session actions ──────────────────────────────────────────
  const onLiveSessionEnd = useCallback(() => {
    addXP(XP_REWARDS.LIVE_SESSION, 'Live session completed!')
    setState(prev => ({ ...prev, totalLiveSessions: prev.totalLiveSessions + 1 }))
  }, [addXP])

  // ── Clear toast after consumed ────────────────────────────────────
  const clearToast    = useCallback(() => setPendingToast(null), [])
  const clearLevelUp  = useCallback(() => setLevelUpInfo(null), [])

  return {
    state,
    levelInfo: getLevelInfo(state.xp),
    pendingToast,
    levelUpInfo,
    clearToast,
    clearLevelUp,
    // actions
    onPhraseDecoded,
    onPracticeMessage,
    resetSessionCombo,
    onLiveSessionEnd,
    addXP,
    // helpers
    ALL_TONES,
    LEVELS,
  }
}