import React, { useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader, OrbitControls } from '@react-three/drei'
import axios from 'axios'
import { Avatar3D } from '../components/Avatar3D'
import { useSpeechAvatar } from '../hooks/useSpeechAvatar'
import { SpeechProvider } from '../hooks/useSpeechAvatar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─────────────────────────────────────────────────────────────
// Practice Situations
// ─────────────────────────────────────────────────────────────

const PRACTICE_SITUATIONS = {
  restaurant: {
    title: 'Ordering at a Restaurant',
    description: 'Practice ordering food at a restaurant',
    type: 'restaurant',
  },
  job_interview: {
    title: 'Job Interview',
    description: 'Practice answering interview questions',
    type: 'job_interview',
  },
  small_talk: {
    title: 'Small Talk',
    description: 'Practice casual conversation',
    type: 'small_talk',
  },
  difficult_conversation: {
    title: 'Difficult Conversation',
    description: 'Practice handling difficult topics',
    type: 'difficult_conversation',
  },
}

// ─────────────────────────────────────────────────────────────
// Avatar Canvas Component
// ─────────────────────────────────────────────────────────────

function AvatarCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 2.5], fov: 25 }}
      style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, 10, 5]} intensity={0.5} />
      <Avatar3D />
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        autoRotate={false}
      />
    </Canvas>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Practice Component
// ─────────────────────────────────────────────────────────────

function AvatarPracticeContent() {
  const {
    startRecording,
    stopRecording,
    recording,
    tts,
    loading,
  } = useSpeechAvatar()

  const [selectedSituation, setSelectedSituation] = useState(null)
  const [conversationHistory, setConversationHistory] = useState([])
  const [inputText, setInputText] = useState('')
  const [suggestedReplies, setSuggestedReplies] = useState([])
  const [isInitializing, setIsInitializing] = useState(false)
  const conversationEndRef = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationHistory])

  // Start practice session
  const handleStartPractice = async (situationType) => {
    setSelectedSituation(situationType)
    setConversationHistory([])
    setSuggestedReplies([])
    setIsInitializing(true)

    try {
      // Get initial greeting from AI
      const response = await axios.post(`${API_URL}/api/avatar/practice`, {
        userMessage: '',
        conversationHistory: [],
        situationType,
      })

      const messages = response.data.messages || []
      if (messages.length > 0) {
        const firstMessage = messages[0]
        setConversationHistory([
          {
            role: 'assistant',
            content: firstMessage.text,
          },
        ])
        setSuggestedReplies(firstMessage.suggestedReplies || [])

        // Play the message
        await tts(firstMessage.text)
      }
    } catch (error) {
      console.error('Error starting practice:', error)
      alert('Failed to start practice session')
    } finally {
      setIsInitializing(false)
    }
  }

  // Send user message
  const handleSendMessage = async (text) => {
    if (!text.trim() || !selectedSituation || loading) return

    try {
      // Add user message to history
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: text },
      ]
      setConversationHistory(newHistory)
      setInputText('')
      setSuggestedReplies([])

      // Get AI response
      const response = await axios.post(`${API_URL}/api/avatar/practice`, {
        userMessage: text,
        conversationHistory: newHistory,
        situationType: selectedSituation,
      })

      const messages = response.data.messages || []
      if (messages.length > 0) {
        const aiMessage = messages[0]
        newHistory.push({
          role: 'assistant',
          content: aiMessage.text,
        })
        setConversationHistory(newHistory)
        setSuggestedReplies(aiMessage.suggestedReplies || [])

        // Play the response
        await tts(aiMessage.text)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to get response')
    }
  }

  // Handle suggested reply click
  const handleSuggestedReply = (reply) => {
    handleSendMessage(reply)
  }

  // Handle voice input
  const handleVoiceInput = () => {
    if (recording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Avatar Canvas Section */}
      <div className="w-1/2 bg-white border-r border-gray-200">
        {!selectedSituation ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 text-lg">Select a practice situation to begin</p>
            </div>
          </div>
        ) : (
          <AvatarCanvas />
        )}
      </div>

      {/* Interface Section */}
      <div className="w-1/2 flex flex-col bg-white">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          {!selectedSituation ? (
            <h1 className="text-3xl font-bold text-gray-800">Practice Conversations</h1>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {PRACTICE_SITUATIONS[selectedSituation]?.title}
              </h1>
              <p className="text-gray-600 mt-1">
                {PRACTICE_SITUATIONS[selectedSituation]?.description}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedSituation ? (
            // Situation Selector
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(PRACTICE_SITUATIONS).map(([key, situation]) => (
                  <button
                    key={key}
                    onClick={() => handleStartPractice(key)}
                    className="p-4 text-left bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all transform hover:scale-105"
                  >
                    <h3 className="font-bold text-gray-800">{situation.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{situation.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Conversation */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {conversationHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">
                      {isInitializing ? 'Initializing...' : 'Conversation will appear here'}
                    </p>
                  </div>
                ) : (
                  conversationHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={conversationEndRef} />
              </div>

              {/* Suggested Replies */}
              {suggestedReplies.length > 0 && (
                <div className="px-6 py-3 bg-blue-50 border-t border-blue-200">
                  <p className="text-xs text-gray-600 mb-2">Suggested replies:</p>
                  <div className="flex gap-2 flex-wrap">
                    {suggestedReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedReply(reply)}
                        disabled={loading}
                        className="text-xs bg-white border border-blue-300 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-6 border-t border-gray-200 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                    placeholder="Type your response..."
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  <button
                    onClick={() => handleSendMessage(inputText)}
                    disabled={loading || !inputText.trim()}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? 'Loading...' : 'Send'}
                  </button>
                </div>

                <button
                  onClick={handleVoiceInput}
                  disabled={loading}
                  className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                    recording
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  } disabled:bg-gray-400`}
                >
                  {recording ? '🎙️ Stop Recording' : '🎤 Start Voice Input'}
                </button>

                <button
                  onClick={() => {
                    setSelectedSituation(null)
                    setConversationHistory([])
                    setSuggestedReplies([])
                  }}
                  className="w-full py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Back to Situations
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Exported Page Component
// ─────────────────────────────────────────────────────────────

export function AvatarPracticePage() {
  return (
    <SpeechProvider>
      <Loader />
      <AvatarPracticeContent />
    </SpeechProvider>
  )
}

export default AvatarPracticePage
