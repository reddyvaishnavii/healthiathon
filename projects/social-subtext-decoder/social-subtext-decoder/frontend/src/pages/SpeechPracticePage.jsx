import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader, OrbitControls } from '@react-three/drei'
import { useSpeechRecognition, useSpeechSynthesis } from '../hooks/useSpeechRecognition'
import { Avatar3D } from '../components/Avatar3D'
import { SpeechProvider, useSpeech } from '../hooks/useSpeechAvatar'
import PracticeSituationSelector from '../components/PracticeSituationSelector'
import PracticeChat from '../components/PracticeChat'

export default function SpeechPracticePage() {
  console.log('🎯 SpeechPracticePage rendered')
  
  const [mode, setMode] = useState('situations') // 'situations', 'practice', 'ended'
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

  // Initialize session ID
  useEffect(() => {
    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', sessionIdRef.current)
    }
  }, [])

  // Start practice session
  const handleStartPractice = async (situation) => {
    try {
      setIsLoading(true)
      setPracticeSituation(situation)
      setMessages([])
      console.log('🎯 Starting practice:', { situation: situation.id, sessionRef: sessionIdRef.current })

      const response = await fetch('http://localhost:3001/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          situationType: situation.id,
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
          setAiEmotion('happy')
          await speak(data.data.initialMessage)
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

  // Render situation selector
  if (mode === 'situations') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Speech Practice Mode</h1>
            <p className="text-gray-600">Practice real-world conversations with our AI avatar</p>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="font-semibold text-gray-700 mb-2 block">Output Mode</label>
                <select
                  value={outputMode}
                  onChange={(e) => setOutputMode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="voice">Voice Only</option>
                  <option value="text">Text Only</option>
                  <option value="both">Voice + Text</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 mb-2 block">Avatar</label>
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

              <div>
                <label className="font-semibold text-gray-700 mb-2 block">Status</label>
                <div className="py-2 text-center text-gray-600">Ready to Start</div>
              </div>
            </div>
          </div>

          {/* Situation Selector */}
          <PracticeSituationSelector
            onSelectSituation={handleStartPractice}
            isLoading={isLoading}
          />
        </div>
      </div>
    )
  }

  // Render practice mode
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
                <span className="text-gray-600">Situation:</span>
                <span className="font-semibold">{practiceSituation?.title}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setMode('situations')
                setPracticeSessionId(null)
                setMessages([])
              }}
              className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600"
            >
              Practice Another Situation
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
        
        // Send AI response through TTS (which will handle lip-sync and audio)
        console.log('🎤 Calling tts() with message:', aiMsg)
        await tts(aiMsg)
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
          <h1 className="text-2xl font-bold text-white">{practiceSituation?.title}</h1>
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
