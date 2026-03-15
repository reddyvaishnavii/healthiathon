import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Square, Zap } from 'lucide-react'
import { useMediaCapture } from '@hooks/useMediaCapture'
import { useWebSocket } from '@hooks/useWebSocket'
import ErrorBanner from '@components/ErrorBanner'
import clsx from 'clsx'
import * as faceapi from 'face-api.js'

export default function LiveConversationPage() {

  const { videoRef, canvasRef, isCapturing, error: captureError, startCapture, stopCapture } = useMediaCapture()
  const { error: wsError, lastResult, stats, connect, start, sendFrame, end, isConnected } = useWebSocket()

  const [isStarted, setIsStarted] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [detectedEmotion, setDetectedEmotion] = useState(null)

  const frameBufferRef = useRef({ video: null, audio: [] })

  /* Connect WebSocket */
  useEffect(() => {
    connect()
  }, [connect])

  /* Load face-api models */
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'

      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)

      setModelsLoaded(true)
      console.log("✅ Face models loaded")
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
      }

    }, 1200)

    return () => clearInterval(interval)

  }, [isStarted, modelsLoaded])

  /* Start conversation */
  const handleStartConversation = async () => {
    try {

      await startCapture(handleFrameCapture)

      const success = await start({ mode: 'live' })

      if (success) setIsStarted(true)

    } catch (err) {
      console.error(err)
    }
  }

  /* Frame streaming */
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

  /* Stop conversation */
  const handleStopConversation = async () => {

    await stopCapture()
    await end()

    setIsStarted(false)
    setDetectedEmotion(null)

  }

  const error = captureError || wsError

  const canStart = isConnected && !isCapturing && !isStarted

  return (

    <div className="space-y-5">

      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900">
          🎥 Live Conversation
        </h1>
        <p className="text-soft-muted text-sm mt-1">
          Analyze facial expressions and tone in real time
        </p>
      </div>

      <AnimatePresence>
        {error && <ErrorBanner message={error} />}
      </AnimatePresence>

      {/* Status */}
      <div className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
        isStarted
          ? 'bg-green-50 text-green-700'
          : isConnected
          ? 'bg-blue-50 text-blue-700'
          : 'bg-gray-50 text-gray-600'
      )}>

        <span className={clsx(
          'w-2 h-2 rounded-full',
          isStarted ? 'bg-green-500 animate-pulse' : isConnected ? 'bg-blue-500' : 'bg-gray-400'
        )} />

        {isStarted
          ? `🎙️ Listening... (Frames: ${stats.frameCount})`
          : isConnected
          ? '✅ Connected'
          : '⏳ Connecting...'}

      </div>

      {/* Main */}
      <div className="card overflow-hidden">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">

          {/* Video */}
          <div className="lg:col-span-2 space-y-4">

            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">

              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />

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

            {/* Controls */}
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

              <p className="text-xs font-semibold text-soft-muted uppercase">
                Emotion
              </p>

              <p className="font-semibold text-gray-900">
                {detectedEmotion || 'Detecting...'}
              </p>

            </div>

            {lastResult?.interpretation && (

              <motion.div
                initial={{opacity:0}}
                animate={{opacity:1}}
                className="bg-primary-50 rounded-xl p-4 border border-primary-100"
              >

                <p className="text-xs font-semibold text-primary-600 uppercase">
                  💡 Interpretation
                </p>

                <p className="text-sm text-gray-900">
                  {lastResult.interpretation}
                </p>

              </motion.div>

            )}

            <div className="bg-soft-bg rounded-xl p-4 text-sm">

              <div className="flex justify-between">
                <span>Frames</span>
                <span>{stats.frameCount}</span>
              </div>

              <div className="flex justify-between">
                <span>Latency</span>
                <span>{stats.latency}ms</span>
              </div>

            </div>

            <div className="flex gap-2 items-start bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Zap className="w-4 h-4 text-blue-500"/>
              <p className="text-xs text-blue-700">
                Ensure camera permissions are enabled.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}