// ═══════════════════════════════════════════════════════════════════════
// Practice Session Routes
// ═══════════════════════════════════════════════════════════════════════

import express from 'express'
import * as practiceController from '../controllers/practiceController.js'

const router = express.Router()

// ─── GET /api/practice/situations ──────────────────────────────────────
// Get available practice situations
router.get('/situations', practiceController.listPracticeSituations)

// ─── GET /api/practice/sessions ────────────────────────────────────────
// Get all practice sessions for a user
router.get('/sessions', practiceController.getPracticeSessions)

// ─── GET /api/practice/session/:practiceSessionId ───────────────────────
// Get detailed practice session with messages
router.get('/session/:practiceSessionId', practiceController.getPracticeSessionDetails)

// ─── POST /api/practice/session ────────────────────────────────────────
// Create new practice session
router.post('/session', practiceController.createPracticeSession)

// ─── POST /api/practice/message ────────────────────────────────────────
// Send message in practice session
router.post('/message', practiceController.sendPracticeMessage)

// ─── POST /api/practice/end ────────────────────────────────────────────
// End practice session
router.post('/end', practiceController.endPracticeSession)

export default router
