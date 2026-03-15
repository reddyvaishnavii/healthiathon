import { useState, useEffect, useRef } from 'react'
import { useSpeechRecognition, useSpeechSynthesis } from '../hooks/useSpeechRecognition'
import AvatarComponent from '../components/AvatarComponent'
import PracticeSituationSelector from '../components/PracticeSituationSelector'
import PracticeChat from '../components/PracticeChat'

export default function SpeechPracticePage() {
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

  // Handle sending message
  const handleSendMessage = async (userMessage) => {
    console.log('handleSendMessage called:', { userMessage: userMessage.trim(), practiceSessionId })
    if (!userMessage.trim() || !practiceSessionId) {
      console.warn('⚠️ Cannot send - empty message or no session:', { hasMessage: !!userMessage.trim(), sessionId: practiceSessionId })
      return
    }

    try {
      setIsLoading(true)
      console.log('📤 Sending message:', { userMessage, practiceSessionId })

      // Add user message to chat
      const userMsgId = messages.length + 1
      setMessages(prev => [...prev, { sender: 'user', text: userMessage, id: userMsgId }])
      setUserEmotion('focused')

      // Send to backend
      console.log('🌐 POST http://localhost:3001/api/practice/message')
      const response = await fetch('http://localhost:3001/api/practice/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practiceSessionId,
          userMessage,
        }),
      })

      console.log('📬 Response status:', response.status)
      const data = await response.json()
      console.log('📦 Response data:', data)

      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status)
        throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`)
      }

      if (data.success && data.data) {
        // Add AI response
        const aiMsgId = userMsgId + 1
        const aiMsg = data.data.aiResponse || 'I understand.'
        setMessages(prev => [...prev, { sender: 'ai', text: aiMsg, id: aiMsgId }])
        console.log('✅ AI Response:', aiMsg)

        // Update emotion
        setAiEmotion(data.data.isFallback ? 'concerned' : 'happy')

        // Speak if voice mode
        if (outputMode !== 'text') {
          await speak(aiMsg)
        }
      } else {
        console.error('❌ API returned failure:', data.error)
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('❌ Error:', error.message)
      setMessages(prev => [...prev, { 
        sender: 'system', 
        text: `Error: ${error.message}`,
        id: messages.length + 1 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle voice input
  useEffect(() => {
    if (transcript && transcript.trim() && !isLoading) {
      console.log('📢 Voice transcript received:', transcript)
      handleSendMessage(transcript)
      resetTranscript()
    }
  }, [transcript, isLoading])

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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{practiceSituation?.title}</h1>
              <p className="text-gray-600 text-sm">
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

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar Section */}
            {avatarEnabled && (
              <div className="lg:col-span-1">
                <AvatarComponent
                  emotion={aiEmotion}
                  isSpeaking={isSpeaking}
                  isListening={false}
                />
              </div>
            )}

            {/* Chat Section */}
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
            </div>
          </div>
        </div>
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

  return null
}
