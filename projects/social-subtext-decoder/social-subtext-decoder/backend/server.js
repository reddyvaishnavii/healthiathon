import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import practiceRoutes from './routes/practice.js'

import decodeRoutes from './routes/decode.js'
import historyRoutes from './routes/history.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// ─── Security Middleware ───────────────────────────────────────
app.use(helmet())

// ─── CORS ─────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173']

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: Origin ${origin} not allowed`))
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// ─── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,                   // max 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait a few minutes and try again.',
  },
})

const decodeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // max 10 decode calls per minute
  message: {
    success: false,
    error: 'Decode limit reached. Please wait a moment before trying again.',
  },
})

app.use(limiter)

// ─── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// ─── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  })
})

// ─── API Routes ────────────────────────────────────────────────
app.use('/api/decode',  decodeLimiter, decodeRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/practice', practiceRoutes)

// ─── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  })
})

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message)

  // CORS error
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ success: false, error: err.message })
  }

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  })
})

// ─── HTTP Server + Socket.io ────────────────────────────────────
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

function getSuggestions(emotion) {

  const e = emotion?.toLowerCase()

  switch (e) {

    case 'sad':
      return [
        "I had a rough day",
        "Something stressful happened",
        "I'm feeling a bit down"
      ]

    case 'happy':
      return [
        "Something good happened today",
        "I'm feeling great today",
        "I'm excited about something"
      ]

    case 'angry':
      return [
        "Something really annoyed me",
        "I'm frustrated about something",
        "I need to calm down"
      ]

    case 'surprised':
      return [
        "That was unexpected",
        "Something surprising happened",
        "I didn't see that coming"
      ]

    default:
      return [
        "Can you tell me more?",
        "I understand",
        "That makes sense"
      ]

  }
}
function interpretEmotion(emotion) {

  const e = emotion?.toLowerCase()

  switch (e) {

    case 'happy':
    case 'joy':
      return 'You look happy and relaxed.'

    case 'sad':
      return 'You seem a little sad. Try relaxing your face.'

    case 'angry':
      return 'Your expression looks tense.'

    case 'surprised':
      return 'You look surprised.'

    case 'fear':
      return 'You seem nervous or uncomfortable.'

    case 'disgust':
      return 'Your expression suggests discomfort.'

    case 'neutral':
      return 'Your face looks calm and neutral.'

    default:
      return `Emotion detected: ${emotion}`
  }
}
// ─── WebSocket Event Handlers ──────────────────────────────────
io.on('connection', (socket) => {
  const sessionId = socket.handshake.headers['x-session-id'] || socket.id
  
  console.log(`✅ Client connected: ${socket.id} (session: ${sessionId})`)
  socket.emit("conversation:ready", {
    success: true,
    message: "Conversation session ready"
  })
  
  // ── Conversation mode events ──
  socket.on('conversation:start', (data, callback) => {
    console.log(`🎥 Conversation started for session: ${sessionId}`, data)
    socket.emit('conversation:ready', { status: 'ok', sessionId })
    if (callback) callback({ success: true })
  })
  
  socket.on('frame:send', (data, callback) => {
    console.log("📥 Frame data received:", data)
    // data = { videoFrame: base64, audioChunk: PCMdata, timestamp }
    console.log(`📥 Frame received:`, {
      sessionId,
      hasVideo: !!data.videoFrame,
      videoSize: data.videoFrame?.length || 0,
      hasAudio: !!data.audioChunk,
      timestamp: data.timestamp
    })
    
    // TODO: Process frame through emotion + speech services
    // For now, send dummy response
    const detectedEmotion = (data.emotion || 'neutral').toLowerCase()
    console.log("Detected emotion from client:", detectedEmotion)


socket.emit('frame:processed', {
  emotion: { label: detectedEmotion },
  tone: { label: 'neutral' },
  // interpretation: interpretEmotion(detectedEmotion),
  suggestedResponses: getSuggestions(detectedEmotion),
  latency: Math.random() * 500 + 100
})
    
    if (callback) callback({ success: true })
  })
  
  socket.on('conversation:end', (data, callback) => {
    console.log(`🏁 Conversation ended for session: ${sessionId}`)
    socket.emit('conversation:summary', { 
      status: 'ok', 
      framesProcessed: 0,
      duration: 0
    })
    if (callback) callback({ success: true })
  })
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`)
  })
  
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error)
  })
})

// ─── Start ─────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket: ws://localhost:${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(
    "🔑 Gemini API:",
    process.env.GEMINI_API_KEY ? "✅ Loaded" : "❌ MISSING"
  );
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}\n`)
})

export default app
