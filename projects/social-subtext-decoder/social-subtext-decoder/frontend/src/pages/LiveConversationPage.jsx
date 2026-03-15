// LiveConversationPage.jsx — with gamification added
// Changes: live score ticker, session report card on stop, XP toast
// All original code preserved — additions only

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Square, Zap } from 'lucide-react'
import { useMediaCapture } from '@hooks/useMediaCapture'
import { useWebSocket }    from '@hooks/useWebSocket'
import { useGameState }    from '@hooks/useGameState'
import ErrorBanner  from '@components/ErrorBanner'
import XPToast      from '@components/gamification/XPToast'
import clsx from 'clsx'
import * as faceapi from 'face-api.js'

// ── Live Score display ────────────────────────────────────────────────
function LiveScore({ score, isStarted }) {
  return (
    <AnimatePresence>
      {isStarted && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0  }}
          exit={{    opacity: 0, x: 20  }}
          className="flex items-center gap-2 bg-gray-900 text-white
                     px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <motion.span
            key={score}
            initial={{ scale: 1.4, color: '#fbbf24' }}
            animate={{ scale: 1,   color: '#ffffff'  }}
            transition={{ duration: 0.3 }}
          >
            {score}
          </motion.span>
          <span className="text-white/50 font-normal">pts</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Session Report Card ───────────────────────────────────────────────
function SessionReportCard({ show, stats, onClose }) {
  if (!stats) return null
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
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: 20  }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7
                       border border-gray-100"
          >
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">📊</div>
              <h2 className="text-xl font-bold text-gray-900">Session Report</h2>
              <p className="text-gray-500 text-sm mt-1">
                {Math.round(stats.duration)}s of live analysis
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.frames}</p>
                <p className="text-xs text-gray-500 mt-0.5">Frames analyzed</p>
              </div>
              <div className="bg-yellow-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">+{stats.xpEarned}</p>
                <p className="text-xs text-yellow-600/70 mt-0.5">XP earned</p>
              </div>
            </div>

            {/* Emotions detected */}
            {stats.emotionsDetected?.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Emotions detected
                </p>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(stats.emotionsDetected)].map(e => (
                    <span key={e}
                      className="text-xs bg-purple-50 text-purple-700 font-medium
                                 px-2.5 py-1 rounded-full capitalize">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tip */}
            <div className="bg-blue-50 rounded-2xl p-3 mb-5">
              <p className="text-xs text-blue-700">
                💡 {stats.frames < 10
                  ? 'Try a longer session to get richer emotion data!'
                  : stats.emotionsDetected?.length > 3
                  ? 'Great range of expressions detected — very natural!'
                  : 'Keep practicing to build your emotional vocabulary.'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-3 rounded-xl
                         font-semibold text-sm hover:bg-gray-700 transition-colors"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function LiveConversationPage() {

  const { videoRef, canvasRef, isCapturing, error: captureError, startCapture, stopCapture } = useMediaCapture()
  const { error: wsError, lastResult, stats, connect, start, sendFrame, end, isConnected } = useWebSocket()
  const { pendingToast, clearToast, onLiveSessionEnd } = useGameState()

  const [isStarted, setIsStarted]           = useState(false)
  const [modelsLoaded, setModelsLoaded]     = useState(false)
  const [detectedEmotion, setDetectedEmotion] = useState(null)

  // ── Gamification state ──
  const [liveScore, setLiveScore]               = useState(0)
  const [showReport, setShowReport]             = useState(false)
  const [reportStats, setReportStats]           = useState(null)
  const sessionStartRef                         = useRef(null)
  const emotionsLogRef                          = useRef([])

  const frameBufferRef = useRef({ video: null, audio: [] })

  useEffect(() => { connect() }, [connect])

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      setModelsLoaded(true)
    }
    loadModels()
  }, [])

  /* Emotion detection loop */
  useEffect(() => {
    if (!isStarted || !modelsLoaded) return
    const interval = setInterval(async () => {
      if (!videoRef.current) return
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions()
      if (detection?.expressions) {
        const expressions = detection.expressions
        const emotion = Object.keys(expressions).reduce((a, b) =>
          expressions[a] > expressions[b] ? a : b
        )
        setDetectedEmotion(emotion)
        emotionsLogRef.current.push(emotion)

        // ── Score tick: +1 per emotion detected ──
        setLiveScore(prev => prev + 1)
      }
    }, 1200)
    return () => clearInterval(interval)
  }, [isStarted, modelsLoaded])

  const handleStartConversation = async () => {
    try {
      await startCapture(handleFrameCapture)
      const success = await start({ mode: 'live' })
      if (success) {
        setIsStarted(true)
        setLiveScore(0)
        emotionsLogRef.current = []
        sessionStartRef.current = Date.now()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleFrameCapture = (data) => {
    if (data.type === 'video') {
      frameBufferRef.current.video = data.frame
      if (frameBufferRef.current.audio.length > 0) {
        sendFrame({
          frame: frameBufferRef.current.video,
          chunks: frameBufferRef.current.audio,
          timestamp: data.timestamp
        })
        frameBufferRef.current.audio = []
      }
    } else if (data.type === 'audio') {
      frameBufferRef.current.audio.push(...data.chunks)
    }
  }

  const handleStopConversation = async () => {
    await stopCapture()
    await end()
    setIsStarted(false)
    setDetectedEmotion(null)

    // ── Fire XP + build report ──
    onLiveSessionEnd()
    const duration = sessionStartRef.current
      ? (Date.now() - sessionStartRef.current) / 1000
      : 0

    setReportStats({
      frames: stats.frameCount,
      duration,
      emotionsDetected: [...emotionsLogRef.current],
      xpEarned: 20,
    })
    setShowReport(true)
  }

  const error   = captureError || wsError
  const canStart = isConnected && !isCapturing && !isStarted

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-900">
            🎥 Live Conversation
          </h1>
          <p className="text-soft-muted text-sm mt-1">
            Analyze facial expressions and tone in real time
          </p>
        </div>

        {/* ── Live score ── */}
        <LiveScore score={liveScore} isStarted={isStarted} />
      </div>

      <AnimatePresence>
        {error && <ErrorBanner message={error} />}
      </AnimatePresence>

      {/* Status */}
      <div className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
        isStarted    ? 'bg-green-50 text-green-700'
        : isConnected ? 'bg-blue-50 text-blue-700'
        :               'bg-gray-50 text-gray-600'
      )}>
        <span className={clsx(
          'w-2 h-2 rounded-full',
          isStarted ? 'bg-green-500 animate-pulse' : isConnected ? 'bg-blue-500' : 'bg-gray-400'
        )} />
        {isStarted
          ? `🎙️ Listening... (Frames: ${stats.frameCount})`
          : isConnected ? '✅ Connected'
          : '⏳ Connecting...'}
      </div>

      {/* Main */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">

          {/* Video */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <canvas ref={canvasRef} className="hidden" />

              {isStarted && (
                <div className="absolute inset-0 flex flex-col justify-between p-4">
                  <div className="flex justify-between">
                    <div className="bg-black/60 px-3 py-1.5 rounded-full text-white text-xs">
                      📊 Emotion: {detectedEmotion || 'Detecting...'}
                    </div>
                    <div className="bg-black/60 px-3 py-1.5 rounded-full text-white text-xs">
                      ⏱️ {stats.latency}ms
                    </div>
                  </div>
                  {lastResult?.tone && (
                    <div className="bg-black/60 px-3 py-1.5 rounded-full text-white text-xs">
                      🎵 Tone: {lastResult.tone.label}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isStarted ? (
              <button
                onClick={handleStartConversation}
                disabled={!canStart}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4"/>
                Start Live Analysis
              </button>
            ) : (
              <button
                onClick={handleStopConversation}
                className="btn-primary w-full bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4"/>
                Stop Recording
              </button>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-soft-bg rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-soft-muted uppercase">Emotion</p>
              <p className="font-semibold text-gray-900">{detectedEmotion || 'Detecting...'}</p>
            </div>

            {lastResult?.interpretation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-primary-50 rounded-xl p-4 border border-primary-100"
              >
                <p className="text-sm text-gray-900">{lastResult.interpretation}</p>
              </motion.div>
            )}

            <div className="bg-soft-bg rounded-xl p-4 text-sm">
              <div className="flex justify-between">
                <span>Frames</span><span>{stats.frameCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Latency</span><span>{stats.latency}ms</span>
              </div>
              {/* ── Score in sidebar too ── */}
              <div className="flex justify-between font-semibold text-yellow-600 mt-1">
                <span>Score</span><span>{liveScore} pts</span>
              </div>
            </div>

            <div className="flex gap-2 items-start bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Zap className="w-4 h-4 text-blue-500"/>
              <p className="text-xs text-blue-700">Ensure camera permissions are enabled.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session report card */}
      <SessionReportCard
        show={showReport}
        stats={reportStats}
        onClose={() => setShowReport(false)}
      />

      {/* XP Toast */}
      <XPToast toast={pendingToast} onDone={clearToast} />
    </div>
  )
}