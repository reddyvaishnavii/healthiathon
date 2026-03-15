import { useState, useEffect, useRef } from 'react'

export default function PracticeChat({
  messages,
  isLoading,
  onSendMessage,
  isListening,
  onStartListening,
  onStopListening,
  outputMode,
  useFallbackInput = false,
}) {
  const [inputValue, setInputValue] = useState('')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    console.log('Send click:', { value: inputValue.trim(), loading: isLoading })
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue)
      setInputValue('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      console.log('Enter pressed, sending:', inputValue)
      handleSendMessage()
    }
  }

  const toggleListening = () => {
    setError('')
    try {
      if (isListening) {
        onStopListening()
      } else {
        console.log('🎤 Requesting microphone access...')
        onStartListening()
      }
    } catch (err) {
      console.error('Voice input error:', err)
      setError('Microphone access denied. Please enable it in browser settings.')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-[600px]">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg font-semibold mb-2">Chat will appear here</p>
              <p className="text-sm">Waiting for your first message...</p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-primary-500 text-white'
                    : msg.sender === 'system'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg">
              <div className="flex gap-2">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        {/* Fallback Mode Notice */}
        {useFallbackInput && (
          <div className="mb-3 p-3 bg-orange-100 text-orange-800 rounded-lg text-sm border border-orange-300">
            <p className="font-semibold">📝 Using Text Input Mode</p>
            <p className="text-xs mt-1">Speech recognition unavailable. Please type your message instead.</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-3 p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-300">
            {error}
          </div>
        )}

        {/* Transcript Display */}
        {transcript && (
          <div className="mb-3 p-3 bg-purple-100 text-purple-900 rounded-lg text-sm">
            <span className="font-semibold">Transcript:</span> {transcript}
          </div>
        )}

        {/* Input Options */}
        <div className="flex gap-2 mb-3">

  {/* Voice button */}
  {!useFallbackInput && (
    <button
      onClick={toggleListening}
      disabled={isLoading}
      className={`py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
        isListening
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span>{isListening ? '🛑' : '🎤'}</span>
      {isListening ? 'Stop Listening' : 'Speak'}
    </button>
  )}

  {/* Text input always available */}
  <input
    type="text"
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    onKeyDown={handleKeyPress}
    placeholder="Type your message..."
    disabled={isLoading}
    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
  />

</div>

        {/* Send Button */}
        {(outputMode !== 'voice' || useFallbackInput) && (
          <button
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          className="w-full bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Waiting...' : 'Send Message'}
        </button>
        )}

        {/* Voice Mode Info */}
        {outputMode === 'voice' && !useFallbackInput && (
          <div className="text-center text-sm text-gray-600">
            <p>Listening for your voice input...</p>
            {isListening && (
              <p className="text-red-600 font-semibold animate-pulse mt-1">
                🎤 Recording...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
