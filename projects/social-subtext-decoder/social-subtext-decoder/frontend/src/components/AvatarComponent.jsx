// ═══════════════════════════════════════════════════════════════════════
// AI Avatar Component - 3D Style with Expressions
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'

const emotionConfig = {
  neutral: { eyes: '●●', mouth: '─', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  happy: { eyes: '◕◕', mouth: '⌣', color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  sad: { eyes: '◡◡', mouth: '⌢', color: 'text-blue-500', bgColor: 'bg-blue-50' },
  concerned: { eyes: '◠◠', mouth: '︵', color: 'text-orange-500', bgColor: 'bg-orange-50' },
  excited: { eyes: '◉◉', mouth: '︶', color: 'text-green-500', bgColor: 'bg-green-50' },
  listening: { eyes: '⊙⊙', mouth: 'ჱ', color: 'text-purple-500', bgColor: 'bg-purple-50' },
}

export default function AvatarComponent({ emotion = 'neutral', isSpeaking = false, isListening = false }) {
  const [animationFrame, setAnimationFrame] = useState(0)
  const config = emotionConfig[emotion] || emotionConfig.neutral

  // Animation for speaking
  useEffect(() => {
    if (!isSpeaking) return

    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 3)
    }, 200)

    return () => clearInterval(interval)
  }, [isSpeaking])

  // Animation for listening
  useEffect(() => {
    if (!isListening) return

    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 4)
    }, 300)

    return () => clearInterval(interval)
  }, [isListening])

  const getMouthAnimation = () => {
    if (isSpeaking) {
      const mouths = ['︶', '︹', '︶']
      return mouths[animationFrame]
    }
    if (isListening) {
      const ears = ['◐', '◑', '◒', '◓']
      return ears[animationFrame]
    }
    return config.mouth
  }

  return (
    <div className={`${config.bgColor} rounded-2xl p-8 text-center shadow-lg`}>
      <div className="mb-6">
        {/* Avatar Head */}
        <div className="flex justify-center mb-4">
          <div className={`w-32 h-40 ${config.bgColor} border-4 ${config.color.replace('text', 'border')} rounded-3xl relative flex items-center justify-center shadow-md`}>
            {/* 3D Effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/30 to-transparent"></div>

            {/* Face Container */}
            <div className="relative z-10 text-center">
              {/* Eyes */}
              <div className={`text-6xl mb-3 ${config.color} font-bold tracking-widest`}>
                {config.eyes}
              </div>

              {/* Mouth */}
              <div className={`text-5xl ${config.color} font-bold transition-all duration-100`}>
                {getMouthAnimation()}
              </div>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex justify-center gap-2 mb-4">
          {isListening && (
            <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="animate-pulse">🎤</span> Listening
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="animate-pulse">🔊</span> Speaking
            </div>
          )}
          {!isListening && !isSpeaking && (
            <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
              ✓ Ready
            </div>
          )}
        </div>

        {/* Emotion Label */}
        <p className="text-lg font-semibold text-gray-700 capitalize">{emotion}</p>
      </div>

      {/* Confidence Meter */}
      <div className="mb-4">
        <p className="text-xs text-gray-600 mb-2">Confidence</p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              emotion === 'neutral' ? 'bg-gray-400 w-1/2' :
              emotion === 'happy' || emotion === 'excited' ? 'bg-green-500 w-4/5' :
              'bg-blue-500 w-3/5'
            }`}
          ></div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-white/50 rounded-lg p-3 text-left text-xs text-gray-700 space-y-1">
        <p>💡 <strong>Tip:</strong></p>
        {emotion === 'happy' && <p>Keep the conversational flow going!</p>}
        {emotion === 'sad' && <p>Try a different approach. Maybe ask a clarifying question?</p>}
        {emotion === 'concerned' && <p>The AI seems uncertain. Provide more context!</p>}
        {isSpeaking && <p>Listen carefully to the AI response.</p>}
        {isListening && <p>Speak clearly and naturally!</p>}
        {!isListening && !isSpeaking && emotion === 'neutral' && <p>Ready when you are!</p>}
      </div>
    </div>
  )
}
