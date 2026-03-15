import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader, OrbitControls } from '@react-three/drei'
import { useSpeechRecognition, useSpeechSynthesis } from '../hooks/useSpeechRecognition'
import { Avatar3D } from '../components/Avatar3D'
import { SpeechProvider, useSpeech } from '../hooks/useSpeechAvatar'

export default function SpeechPracticePage() {
  console.log('🎯 SpeechPracticePage rendered')
  
  const [mode, setMode] = useState('practice') // Directly start in practice mode
  const [practiceSituation, setPracticeSituation] = useState(null)
  const [practiceSessionId, setPracticeSessionId] = useState(null)
  const [outputMode, setOutputMode] = useState('voice')
  const [avatarEnabled, setAvatarEnabled] = useState(true)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [userEmotion, setUserEmotion] = useState('neutral')
  const [aiEmotion, setAiEmotion] = useState('neutral')
  const [sessionStats, setSessionStats] = useState(null)
  const [typedMessage, setTypedMessage] = useState('')
  
  console.log('📊 Current mode:', mode)

  const { transcript, isListening, startListening, stopListening, resetTranscript, useFallback } = useSpeechRecognition()
  const { speak, isSpeaking } = useSpeechSynthesis()
  const sessionIdRef = useRef(localStorage.getItem('sessionId') || `session-${Date.now()}`)

  // Initialize session ID and start practice session on mount
  useEffect(() => {
    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', sessionIdRef.current)
    }
    // Automatically start a practice session when component mounts
    handleStartPractice()
  }, [])

  // Start practice session - no situation parameter needed
  const handleStartPractice = async () => {
    try {
      setIsLoading(true)
      console.log('🎯 Starting custom practice session:', { sessionRef: sessionIdRef.current })

      const response = await fetch('http://localhost:3001/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          // No situationType - API will handle custom conversation
          outputMode,
          avatarEnabled,
        }),
      })

      const data = await response.json()
      console.log('📥 Session created response:', data)

      if (data.success && data.data) {
        const sessionId = data.data.practiceSessionId
        console.log('✅ Practice session ID set:', sessionId)
        setPracticeSessionId(sessionId)
        setMessages([
          { sender: 'ai', text: data.data.initialMessage, id: 1 }
        ])

        // Speak initial message if voice mode
        if (outputMode !== 'text') {
          // Build message object with expression data from AI response
          const initialMsg = {
            text: data.data.initialMessage,
            facialExpression: data.data.facialExpression || 'smile',
            animation: data.data.animation || 'TalkingOne',
          }
          await speak(initialMsg)
        }

        setMode('practice')
      } else {
        console.error('❌ Session creation failed:', data.error)
        alert('Failed to create practice session: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error starting practice:', error)
      alert('Failed to start practice session')
    } finally {
      setIsLoading(false)
    }
  }

  // Note: handleSendMessage is now defined inside PracticePageContent 
  // so it can access the TTS function from the SpeechProvider context

  // End practice session
  const handleEndPractice = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/practice/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceSessionId }),
      })

      const data = await response.json()

      if (data.success) {
        setSessionStats(data.data)
        setMode('ended')
      }
    } catch (error) {
      console.error('Error ending practice:', error)
    }
  }

  // Render practice mode directly (no situations selector)
  if (mode === 'practice') {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden m-0 p-0">
        {/* Full Screen Avatar */}
        <SpeechProvider>
          <PracticePageContent 
            practiceSituation={practiceSituation}
            practiceSessionId={practiceSessionId}
            isLoading={isLoading}
            isListening={isListening}
            typedMessage={typedMessage}
            setTypedMessage={setTypedMessage}
            handleEndPractice={handleEndPractice}
            startListening={startListening}
            stopListening={stopListening}
            resetTranscript={resetTranscript}
          />
        </SpeechProvider>
      </div>
    )
  }

  // Render session ended
  if (mode === 'ended' && sessionStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Great Practice Session!</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold">{Math.floor(sessionStats.duration / 60)}m {sessionStats.duration % 60}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Exchanges:</span>
                <span className="font-semibold">{sessionStats.totalExchanges}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-semibold">Custom AI Conversation</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setMode('practice')
                setPracticeSessionId(null)
                setMessages([])
                handleStartPractice()
              }}
              className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600"
            >
              Start New Conversation
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Fallback - should not reach here
  console.warn('⚠️ SpeechPracticePage reached fallback (no mode matched)')
  return (
    <div style={{ padding: '20px', color: '#red', fontSize: '18px' }}>
      ❌ Debug: Mode = {mode}, sessionStats = {sessionStats ? 'exists' : 'null'}
    </div>
  )
}

// Practice Page Content Component - inside SpeechProvider
function PracticePageContent({
  practiceSituation,
  practiceSessionId,
  isLoading: isLoadingProp,
  isListening,
  typedMessage,
  setTypedMessage,
  handleEndPractice,
  startListening,
  stopListening,
  resetTranscript,
}) {
  const { message, tts } = useSpeech()
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (userMessage) => {
    if (!userMessage.trim() || !practiceSessionId) {
      console.warn('⚠️ Cannot send:', { msg: userMessage.trim(), sessionId: practiceSessionId })
      return
    }

    try {
      setIsLoading(true)
      console.log('📤 Sending user message:', userMessage)

      // Send to backend
      const response = await fetch('http://localhost:3001/api/practice/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practiceSessionId,
          userMessage,
        }),
      })

      const data = await response.json()
      console.log('📦 Backend response:', data)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`)
      }

      if (data.success && data.data) {
        const aiMsg = data.data.aiResponse || 'I understand.'
        console.log('✅ AI Response received:', aiMsg)
        
        // Build full message object with expression and animation data
        const fullMessage = {
          text: aiMsg,
          facialExpression: data.data.facialExpression || 'smile',
          animation: data.data.animation || 'TalkingOne',
        }
        
        console.log('🎤 Calling tts() with full message:', fullMessage)
        await tts(fullMessage)
        console.log('✅ TTS completed, message should be in queue')
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('❌ Error:', error.message)
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0.6, 1.2], fov: 50 }}
          style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-10, 10, 5]} intensity={0.8} />
          <Avatar3D />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
            autoRotate={false}
          />
        </Canvas>
      </div>

      {/* Avatar Text Subtitle - Centered below avatar */}
      {message && message.text && (
        <div className="absolute bottom-40 left-0 right-0 z-10 flex justify-center">
          <div className="bg-black bg-opacity-70 text-white px-8 py-4 rounded-xl max-w-2xl text-center text-lg font-medium">
            {message.text}
          </div>
        </div>
      )}

      {/* Top Header - Compact */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Practice Conversation</h1>
          <p className="text-gray-300 text-sm">
            {isListening ? '🎤 Listening...' : 'Ready to speak'}
          </p>
        </div>
        <button
          onClick={handleEndPractice}
          className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 font-medium"
        >
          End Session
        </button>
      </div>

      {/* Bottom Input Section */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black to-transparent pt-8 pb-6">
        <div className="max-w-2xl mx-auto px-4">
          {/* Input Controls */}
          <div className="flex gap-3">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white text-lg transition-colors ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400'
              }`}
            >
              {isListening ? '⏹ Stop & Send' : '🎤 Speak'}
            </button>
            
            <input
              type="text"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)} 
              placeholder="Or type your message..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 border border-gray-300"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && typedMessage.trim()) {
                  handleSendMessage(typedMessage)
                  setTypedMessage('')
                }
              }}
              disabled={isLoading}
            />

            <button
              onClick={() => {
                if (typedMessage.trim()) {
                  handleSendMessage(typedMessage)
                  setTypedMessage('')
                }
              }}
              disabled={isLoading || !typedMessage.trim()}
              className={`py-3 px-6 rounded-lg font-semibold text-white text-lg transition-colors ${
                isLoading || !typedMessage.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
