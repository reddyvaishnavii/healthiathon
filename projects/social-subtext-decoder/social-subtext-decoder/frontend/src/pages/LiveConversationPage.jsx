import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Mic, Square, AlertCircle, Zap } from 'lucide-react'
import { useMediaCapture } from '@hooks/useMediaCapture'
import { useWebSocket } from '@hooks/useWebSocket'
import ErrorBanner from '@components/ErrorBanner'
import clsx from 'clsx'

/**
 * Live conversation mode: real-time video + audio analysis
 * Captures facial expressions, transcribes speech, detects tone
 */
export default function LiveConversationPage() {
  const { videoRef, canvasRef, isCapturing, error: captureError, startCapture, stopCapture } = useMediaCapture()
  const { status, error: wsError, lastResult, stats, connect, start, sendFrame, end, isConnected } = useWebSocket()
  
  const [isStarted, setIsStarted] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const frameBufferRef = useRef({ video: null, audio: [] })
  
  // Connect WebSocket on mount
  useEffect(() => {
    connect()
  }, [connect])
  
  /**
   * Start live conversation
   */
  const handleStartConversation = async () => {
    try {
      // Start media capture with frame callback
      await startCapture(handleFrameCapture)
      
      // Start WebSocket conversation
      const success = await start({ mode: 'live' })
      if (success) {
        setIsStarted(true)
        setCurrentTranscript('')
        setInterimTranscript('')
      }
    } catch (err) {
      console.error('Failed to start:', err)
    }
  }
  
  /**
   * Handle frame/audio data from media capture
   */
  const handleFrameCapture = (data) => {
    if (data.type === 'video') {
      // Accumulate video frame
      frameBufferRef.current.video = data.frame
      
      // Check if we have both video and audio accumulated, then send
      if (frameBufferRef.current.audio.length > 0) {
        sendFrame({
          frame: frameBufferRef.current.video,
          chunks: frameBufferRef.current.audio,
          timestamp: data.timestamp
        })
        frameBufferRef.current.audio = []
      }
    } else if (data.type === 'audio') {
      // Accumulate audio chunks
      frameBufferRef.current.audio.push(...data.chunks)
    }
  }
  
  /**
   * Stop conversation
   */
  const handleStopConversation = async () => {
    await stopCapture()
    await end()
    setIsStarted(false)
    setCurrentTranscript('')
    setInterimTranscript('')
  }
  
  const error = captureError || wsError
  const canStart = isConnected && !isCapturing && !isStarted
  const canStop = isCapturing && isStarted
  
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">
          🎥 Live Conversation
        </h1>
        <p className="text-soft-muted text-sm mt-1">
          Analyze facial expressions, voice tone, and detected emotions in real-time
        </p>
      </div>
      
      {/* Error */}
      <AnimatePresence>
        {error && (
          <ErrorBanner message={error} onDismiss={() => {}} />
        )}
      </AnimatePresence>
      
      {/* Status indicator */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
          isStarted
            ? 'bg-green-50 text-green-700'
            : isConnected
            ? 'bg-blue-50 text-blue-700'
            : 'bg-gray-50 text-gray-600'
        )}
      >
        <span className={clsx(
          'w-2 h-2 rounded-full',
          isStarted ? 'bg-green-500 animate-pulse' : isConnected ? 'bg-blue-500' : 'bg-gray-400'
        )} />
        {isStarted
          ? '🎙️ Listening... (Frames: ' + stats.frameCount + ')'
          : isConnected
          ? '✅ Connected to server'
          : '⏳ Connecting to server...'
        }
      </motion.div>
      
      {/* Main content card */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          
          {/* Video panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video container */}
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Hidden canvas for frame capture */}
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Overlay */}
              {isStarted && (
                <div className="absolute inset-0 flex flex-col justify-between p-4">
                  {/* Top: Status badges */}
                  <div className="flex gap-2 justify-between">
                    <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-white text-xs font-medium">
                      📊 Emotion: {lastResult?.emotion?.label || '—'}
                    </div>
                    <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-white text-xs font-medium">
                      ⏱️ {stats.latency}ms
                    </div>
                  </div>
                  
                  {/* Bottom: Tone badge */}
                  {lastResult?.tone && (
                    <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-white text-xs font-medium">
                      🎵 Tone: {lastResult.tone.label}
                    </div>
                  )}
                </div>
              )}
              
              {/* Centered "waiting" message when not started */}
              {!isStarted && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300 text-sm">
                      {isConnected ? 'Ready to start' : 'Connecting...'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Controls */}
            <div className="flex gap-3">
              {!isStarted ? (
                <button
                  onClick={handleStartConversation}
                  disabled={!canStart}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Start Live Analysis
                </button>
              ) : (
                <button
                  onClick={handleStopConversation}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600"
                >
                  <Square className="w-4 h-4" />
                  Stop Recording
                </button>
              )}
            </div>
            
            {/* Transcript panel */}
            <div className="bg-soft-bg rounded-xl p-4 space-y-2 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-soft-muted uppercase tracking-wider">Transcript</p>
              <div className="flex flex-col gap-1.5">
                {currentTranscript && (
                  <div className="text-sm text-gray-900 font-medium">
                    {currentTranscript}
                  </div>
                )}
                {interimTranscript && (
                  <div className="text-sm text-soft-muted italic">
                    {interimTranscript}
                  </div>
                )}
                {!currentTranscript && !interimTranscript && (
                  <p className="text-sm text-soft-muted">
                    [Transcript will appear here]
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Sidebar: Real-time results */}
          <div className="space-y-4">
            
            {/* Emotion meter */}
            <div className="bg-soft-bg rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-soft-muted uppercase tracking-wider">Emotion</p>
              {lastResult?.emotion ? (
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    {lastResult.emotion.label}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all"
                      style={{ width: `${lastResult.emotion.confidence * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-soft-muted">
                    Confidence: {Math.round(lastResult.emotion.confidence * 100)}%
                  </p>
                </div>
              ) : (
                <p className="text-sm text-soft-muted">[Awaiting analysis]</p>
              )}
            </div>
            
            {/* Tone explanation */}
            {lastResult?.interpretation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-primary-50 rounded-xl p-4 space-y-2 border border-primary-100"
              >
                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                  💡 Interpretation
                </p>
                <p className="text-sm text-gray-900">
                  {lastResult.interpretation}
                </p>
              </motion.div>
            )}
            
            {/* Stats */}
            <div className="bg-soft-bg rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-soft-muted uppercase tracking-wider">Stats</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-soft-muted">Frames:</span>
                  <span className="font-mono font-medium text-gray-900">{stats.frameCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-soft-muted">Latency:</span>
                  <span className="font-mono font-medium text-gray-900">{stats.latency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-soft-muted">Connection:</span>
                  <span className={clsx(
                    'font-medium',
                    isConnected ? 'text-green-600' : 'text-red-600'
                  )}>
                    {isConnected ? 'Active' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Tip */}
            <div className="flex gap-2 items-start bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Zap className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Make sure your camera and microphone permissions are enabled. Your video feeds will not be stored.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Suggested responses */}
      {lastResult?.suggestedResponses && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 space-y-3"
        >
          <p className="text-xs font-semibold text-soft-muted uppercase tracking-wider">
            Suggested Responses
          </p>
          <div className="space-y-2">
            {lastResult.suggestedResponses.map((response, i) => (
              <div key={i} className="bg-soft-bg rounded-lg p-3 border border-soft-border">
                <p className="text-sm font-medium text-gray-900">
                  "{response.text}"
                </p>
                <p className="text-xs text-soft-muted mt-1">
                  {response.context}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
