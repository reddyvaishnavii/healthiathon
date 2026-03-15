// ═══════════════════════════════════════════════════════════════════════
// Mock In-Memory Database for Testing
// ═══════════════════════════════════════════════════════════════════════

// In-memory data storage
const mockData = {
  users: new Map(),
  practiceSessions: new Map(),
  practiceMessages: new Map(),
}

let sessionCounter = 1
let messageCounter = 1

export async function query(text, params) {
  try {
    // SELECT users by session_id
    if (text.includes('SELECT id FROM users WHERE session_id')) {
      const sessionId = params[0]
      const user = Array.from(mockData.users.values()).find(u => u.session_id === sessionId)
      console.log('🔐 Mock DB: SELECT user by session_id:', { sessionId, found: !!user })
      return { rows: user ? [{ id: user.id }] : [] }
    }

    // INSERT new user
    if (text.includes('INSERT INTO users') && text.includes('RETURNING id')) {
      const sessionId = params[0]
      const userId = sessionCounter++
      mockData.users.set(userId, {
        id: userId,
        session_id: sessionId,
        created_at: new Date(),
        updated_at: new Date(),
      })
      console.log('🆕 Mock DB: INSERT user:', { userId, sessionId })
      return { rows: [{ id: userId }], rowCount: 1 }
    }

    // INSERT practice session
    if (text.includes('INSERT INTO practice_sessions')) {
      const sessionId = sessionCounter++
      const session = {
        id: sessionId,
        user_id: params[0],
        situation_type: params[1],
        situation_description: params[2],
        output_mode: params[3],
        avatar_enabled: params[4],
        started_at: new Date(),
        ended_at: null,
        status: 'active',
      }
      mockData.practiceSessions.set(sessionId, session)
      console.log('🆕 Mock DB: INSERT practice session:', { sessionId, userId: params[0], type: params[1], stored: mockData.practiceSessions.has(sessionId) })
      return { rows: [session], rowCount: 1 }
    }

    // INSERT practice message
    if (text.includes('INSERT INTO practice_messages')) {
      const messageId = messageCounter++
      const msg = {
        id: messageId,
        practice_session_id: params[0],
        sender: params[1],
        message_text: params[2],
        timestamp: new Date(),
      }
      if (!mockData.practiceMessages.has(params[0])) {
        mockData.practiceMessages.set(params[0], [])
      }
      mockData.practiceMessages.get(params[0]).push(msg)
      console.log('💬 Mock DB: INSERT message:', { messageId, sessionId: params[0], sender: params[1] })
      return { rows: [msg], rowCount: 1 }
    }

    // SELECT messages for session
    if (text.includes('SELECT sender, message_text') && text.includes('FROM practice_messages')) {
      const sessionId = params[0]
      const messages = mockData.practiceMessages.get(sessionId) || []
      console.log('📖 Mock DB: SELECT messages:', { sessionId, count: messages.length })
      return { rows: messages.map(m => ({ sender: m.sender, text: m.message_text })), rowCount: messages.length }
    }

    // SELECT practice session with user (JOIN query)
    if (text.includes('SELECT ps.*, u.id as user_id FROM practice_sessions ps')) {
      const sessionId = params[0]
      const session = mockData.practiceSessions.get(sessionId)
      console.log('🔍 Mock DB: SELECT session (with JOIN):', { sessionId, found: !!session, allSessions: Array.from(mockData.practiceSessions.keys()) })
      if (session) {
        return { rows: [{ ...session, user_id: session.user_id }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    }

    // SELECT practice session (fallback)
    if (text.includes('SELECT ps.* FROM practice_sessions WHERE ps.id')) {
      const sessionId = params[0]
      const session = mockData.practiceSessions.get(sessionId)
      console.log('🔍 Mock DB: SELECT session (fallback):', { sessionId, found: !!session, allSessions: Array.from(mockData.practiceSessions.keys()) })
      if (session) {
        return { rows: [session], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    }

    // UPDATE practice session (end session)
    if (text.includes('UPDATE practice_sessions')) {
      const sessionId = params[1]
      const session = mockData.practiceSessions.get(sessionId)
      if (session) {
        session.status = 'completed'
        session.ended_at = new Date()
        return { rows: [session], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    }

    // COUNT messages
    if (text.includes('COUNT(*)')) {
      const sessionId = params[0]
      const messages = mockData.practiceMessages.get(sessionId) || []
      const userMsgs = messages.filter(m => m.sender === 'user').length
      const aiMsgs = messages.filter(m => m.sender === 'ai').length
      return {
        rows: [{
          total_messages: messages.length,
          user_messages: userMsgs,
          ai_messages: aiMsgs,
        }],
        rowCount: 1,
      }
    }

    // SELECT practice sessions
    if (text.includes('SELECT id, situation_type') && text.includes('FROM practice_sessions')) {
      const userId = params[0]
      const sessions = Array.from(mockData.practiceSessions.values()).filter(s => s.user_id === userId)
      return { rows: sessions, rowCount: sessions.length }
    }

    // SELECT session details
    if (text.includes('SELECT * FROM practice_sessions WHERE id')) {
      const sessionId = params[0]
      const session = mockData.practiceSessions.get(sessionId)
      return { rows: session ? [session] : [], rowCount: session ? 1 : 0 }
    }

    // Default fallback
    console.log('📊 Mock query executed:', text.substring(0, 50))
    return { rows: [], rowCount: 0 }

  } catch (error) {
    console.error('❌ Mock database error:', error.message)
    throw error
  }
}

export async function getClient() {
  return { release: () => {} }
}

export default { query, getClient }
