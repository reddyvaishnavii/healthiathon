import { useState, useEffect, useRef } from 'react'
import { useSpeechRecognition, useSpeechSynthesis } from '../hooks/useSpeechRecognition'
import AvatarComponent from '../components/AvatarComponent'
import PracticeChat from '../components/PracticeChat'

// ─────────────────────────────────────────────
// Suggestion direction config (label + color)
// ─────────────────────────────────────────────

const SUGGESTION_STYLES = [
  {
    label: '→ Continue',
    bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800',
    dot: 'bg-blue-400'
  },
  {
    label: '? Ask',
    bg: 'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-800',
    dot: 'bg-violet-400'
  },
  {
    label: '↩ Change topic',
    bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800',
    dot: 'bg-amber-400'
  },
  {
    label: '♥ React',
    bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800',
    dot: 'bg-rose-400'
  }
]


export default function SpeechPracticePage() {

  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [outputMode, setOutputMode] = useState('both')
  const [avatarEnabled, setAvatarEnabled] = useState(true)
  const [aiEmotion, setAiEmotion] = useState('neutral')

  // Track which suggestion was just used (for brief highlight)
  const [usedSuggestion, setUsedSuggestion] = useState(null)

  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    useFallback
  } = useSpeechRecognition()

  const { speak, isSpeaking } = useSpeechSynthesis()

  const sessionIdRef = useRef(
    localStorage.getItem('sessionId') || `session-${Date.now()}`
  )

  useEffect(() => {
    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', sessionIdRef.current)
    }
  }, [])


  // ─────────────────────────────────────────────
  // Send Message
  // ─────────────────────────────────────────────

  const handleSendMessage = async (userMessage) => {

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

      const response = await fetch(
        'http://localhost:3001/api/practice/message',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage,
            practiceSessionId: sessionIdRef.current,
            // Send conversation history so backend can pass it to Gemini
            conversationHistory: updatedMessages.slice(-6)
          })
        }
      )

      const data = await response.json()

      const aiMsg = data?.data?.response || 'I understand.'
      const newSuggestions = data?.data?.suggestions || []

      // Update suggestions immediately when response arrives
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
        {
          sender: 'system',
          text: `Something went wrong. Try again.`,
          id: messages.length + 1
        }
      ])

    } finally {

      setIsLoading(false)

    }

  }


  // ─────────────────────────────────────────────
  // Suggestion chip clicked
  // ─────────────────────────────────────────────

  const handleSuggestionClick = (suggestion, index) => {
    if (isLoading) return
    setUsedSuggestion(index)

    // Strip the direction prefix if Gemini included it (e.g. "Continue: ...")
    const cleanText = suggestion
      .replace(/^(Continue|Ask|Change topic|React)\s*:\s*/i, '')
      .trim()

    handleSendMessage(cleanText)
  }


  // ─────────────────────────────────────────────
  // Voice input → send
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (transcript && transcript.trim() && !isLoading) {
      handleSendMessage(transcript)
      resetTranscript()
    }
  }, [transcript, isLoading])


  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (

    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">

      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Conversation Practice
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {isListening
                ? '🎤 Listening… speak now'
                : isSpeaking
                ? '🔊 AI is speaking…'
                : isLoading
                ? '⏳ Thinking…'
                : '✅ Ready'}
            </p>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className="font-semibold text-gray-700 mb-2 block">
                Output Mode
              </label>
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
              <label className="font-semibold text-gray-700 mb-2 block">
                Avatar
              </label>
              <button
                onClick={() => setAvatarEnabled(!avatarEnabled)}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  avatarEnabled
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-700'
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

            {/* ── Real-time Suggestion Chips ── */}
            {suggestions.length > 0 && (
              <div className="mt-4 bg-white rounded-xl shadow-sm p-4">

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  You could say…
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestions.slice(0, 4).map((suggestion, index) => {

                    const style = SUGGESTION_STYLES[index] || SUGGESTION_STYLES[0]

                    // Strip direction prefix for display
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
                        {/* Color dot */}
                        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />

                        <span className="leading-snug">{displayText}</span>
                      </button>
                    )
                  })}
                </div>

              </div>
            )}

            {/* Loading skeleton for suggestions */}
            {isLoading && suggestions.length === 0 && (
              <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  You could say…
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="h-10 rounded-lg bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>

  )

}