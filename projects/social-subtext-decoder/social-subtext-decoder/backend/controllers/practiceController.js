// ═══════════════════════════════════════════════════════════════════════
// Practice Session Controller
// ═══════════════════════════════════════════════════════════════════════

import { query } from '../database/db.js'
import { generateAIResponse, getAvailableSituations } from '../services/aiService.js'

// ─── Get Available Practice Situations ─────────────────────────────────
export async function listPracticeSituations(req, res) {
  try {
    const situations = getAvailableSituations()
    res.json({
      success: true,
      data: situations,
    })
  } catch (error) {
    console.error('Error fetching situations:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── Create a New Practice Session ────────────────────────────────────
export async function createPracticeSession(req, res) {
  try {
    const { sessionId, situationType = 'custom', situationDescription, outputMode, avatarEnabled } = req.body

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId required' })
    }

    // Get or create user
    let userResult = await query(
      'SELECT id FROM users WHERE session_id = $1',
      [sessionId]
    )

    let userId
    if (userResult.rows.length === 0) {
      const newUser = await query(
        'INSERT INTO users (session_id) VALUES ($1) RETURNING id',
        [sessionId]
      )
      userId = newUser.rows[0].id
    } else {
      userId = userResult.rows[0].id
    }

    // Create practice session
    const sessionResult = await query(
      `INSERT INTO practice_sessions 
       (user_id, situation_type, situation_description, output_mode, avatar_enabled)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, situationType, situationDescription || null, outputMode || 'voice', avatarEnabled !== false]
    )

    const sessionData = sessionResult.rows[0]

    // Generate initial message for the practice session
    let initialMessage = "Hello! I'm your practice partner. How can I help you today?"
    let facialExpression = "smile"
    let animation = "TalkingOne"
    
    try {
      const aiResponse = await generateAIResponse('', [], situationType, situationDescription || '')
      if (aiResponse && aiResponse.response) {
        initialMessage = aiResponse.response
        facialExpression = aiResponse.facialExpression || "smile"
        animation = aiResponse.animation || "TalkingOne"
      }
    } catch (aiError) {
      console.warn('⚠️ Could not generate AI initial message, using default:', aiError.message)
    }

    res.json({
      success: true,
      data: {
        practiceSessionId: sessionData.id,
        userId,
        situationType,
        outputMode: outputMode || 'voice',
        avatarEnabled: avatarEnabled !== false,
        initialMessage,
        facialExpression,
        animation,
      },
    })

  } catch (error) {
    console.error('Error creating practice session:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── Send User Message in Practice Session ────────────────────────────
export async function sendPracticeMessage(req, res) {
  try {
    const { practiceSessionId, userMessage, conversationHistory = [] } = req.body
    console.log('📨 sendPracticeMessage called:', { practiceSessionId, userMessage })

    if (!userMessage) {
      return res.status(400).json({ success: false, error: 'userMessage is required' })
    }

    // Generate AI response directly — no DB session lookup needed for custom conversations
    const aiResult = await generateAIResponse(
      userMessage,
      conversationHistory,
      'custom',
      ''
    )

    console.log('🤖 AI Response:', {
      response: aiResult.response.substring(0, 60) + '...',
      suggestions: aiResult.suggestions,
      isFallback: aiResult.isFallback
    })

    res.json({
      success: true,
      data: {
        aiResponse: aiResult.response,
        suggestions: aiResult.suggestions || [],
        isFallback: aiResult.isFallback || false,
        facialExpression: aiResult.facialExpression || "smile",
        animation: aiResult.animation || "TalkingOne",
      },
    })

  } catch (error) {
    console.error('Error sending practice message:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── End Practice Session ──────────────────────────────────────────────
export async function endPracticeSession(req, res) {
  try {
    const { practiceSessionId } = req.body

    if (!practiceSessionId) {
      return res.status(400).json({ success: false, error: 'practiceSessionId required' })
    }

    const result = await query(
      `UPDATE practice_sessions 
       SET status = 'completed', ended_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [practiceSessionId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' })
    }

    const session = result.rows[0]

    const messagesResult = await query(
      `SELECT COUNT(*) as total_messages, 
              SUM(CASE WHEN sender = 'user' THEN 1 ELSE 0 END) as user_messages,
              SUM(CASE WHEN sender = 'ai' THEN 1 ELSE 0 END) as ai_messages
       FROM practice_messages
       WHERE practice_session_id = $1`,
      [practiceSessionId]
    )

    const stats = messagesResult.rows[0]
    const duration = Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 1000)

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        duration,
        totalExchanges: Math.floor(stats.user_messages),
        statistics: stats,
      },
    })

  } catch (error) {
    console.error('Error ending practice session:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── Get Practice Session History ─────────────────────────────────────
export async function getPracticeSessions(req, res) {
  try {
    const { sessionId } = req.query

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId required' })
    }

    const userResult = await query(
      'SELECT id FROM users WHERE session_id = $1',
      [sessionId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const userId = userResult.rows[0].id

    const sessionsResult = await query(
      `SELECT id, situation_type, situation_description, output_mode, 
              avatar_enabled, started_at, ended_at, status
       FROM practice_sessions
       WHERE user_id = $1
       ORDER BY started_at DESC`,
      [userId]
    )

    res.json({
      success: true,
      data: sessionsResult.rows,
    })

  } catch (error) {
    console.error('Error fetching practice sessions:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── Get Practice Session Details with Messages ────────────────────────
export async function getPracticeSessionDetails(req, res) {
  try {
    const { practiceSessionId } = req.params

    if (!practiceSessionId) {
      return res.status(400).json({ success: false, error: 'practiceSessionId required' })
    }

    const sessionResult = await query(
      'SELECT * FROM practice_sessions WHERE id = $1',
      [practiceSessionId]
    )

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' })
    }

    const session = sessionResult.rows[0]

    const messagesResult = await query(
      `SELECT id, sender, message_text, emotion_detected, confidence_score, timestamp
       FROM practice_messages
       WHERE practice_session_id = $1
       ORDER BY timestamp ASC`,
      [practiceSessionId]
    )

    res.json({
      success: true,
      data: {
        session,
        messages: messagesResult.rows,
      },
    })

  } catch (error) {
    console.error('Error fetching session details:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}