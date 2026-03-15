import { useState, useEffect } from 'react'

export default function PracticeSituationSelector({ onSelectSituation, isLoading }) {
  const [situations, setSituations] = useState([])
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [error, setError] = useState('')
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  useEffect(() => {
    fetchSituations()
    
    // Set a timeout to show a loading message if it takes too long
    const timeout = setTimeout(() => {
      setLoadingTimeout(true)
    }, 3000)
    
    return () => clearTimeout(timeout)
  }, [])

  const fetchSituations = async () => {
    try {
      console.log('📡 Fetching situations from backend...')
      const response = await fetch('http://localhost:3001/api/practice/situations')
      console.log('📬 Response status:', response.status)
      
      const data = await response.json()
      console.log('📦 Situations data:', data)

      if (data.success) {
        console.log('✅ Situations loaded:', data.data.length, 'items')
        setSituations(data.data)
        setLoadingTimeout(false)
      } else {
        throw new Error(data.error || 'Failed to load situations')
      }
    } catch (error) {
      console.error('❌ Error fetching situations:', error)
      setError('Failed to load situations. Server might be down. ' + error.message)
      setLoadingTimeout(false)
    }
  }

  const handleSelectSituation = (situation) => {
    onSelectSituation(situation)
  }

  const handleCustomSituation = () => {
    if (!customInput.trim()) {
      setError('Please describe your situation')
      return
    }

    onSelectSituation({
      id: 'custom',
      title: 'Custom Situation',
      description: customInput,
    })

    setCustomInput('')
    setShowCustom(false)
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
        <button onClick={fetchSituations} className="ml-4 underline">Retry</button>
      </div>
    )
  }

  if (loadingTimeout && situations.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <div className="text-yellow-800 mb-4">
          ⏳ Loading situations... (taking longer than expected)
        </div>
        <div className="text-yellow-700 text-sm">
          Make sure the backend server is running at http://localhost:3001
        </div>
        <button 
          onClick={fetchSituations}
          className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded"
        >
          Retry Loading
        </button>
      </div>
    )
  }

  if (situations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        ⏳ Loading practice situations...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Pre-defined Situations */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose a Situation or Create Your Own</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {situations.map(situation => (
            <button
              key={situation.id}
              onClick={() => handleSelectSituation(situation)}
              disabled={isLoading}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-4xl mb-3">
                {situation.id === 'restaurant' && '🍽️'}
                {situation.id === 'job_interview' && '💼'}
                {situation.id === 'small_talk' && '💬'}
                {situation.id === 'difficult_conversation' && '⚠️'}
                {situation.id === 'custom' && '✨'}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{situation.title}</h3>
              <div className="text-sm text-gray-600 mb-4">
                {situation.scenarios?.length > 0 && (
                  <div className="space-y-1">
                    {situation.scenarios.slice(0, 2).map((scenario, idx) => (
                      <p key={idx} className="flex items-center gap-2">
                        <span>•</span> {scenario}
                      </p>
                    ))}
                    {situation.scenarios.length > 2 && (
                      <p className="text-xs italic">+{situation.scenarios.length - 2} more...</p>
                    )}
                  </div>
                )}
              </div>
              <button className="w-full bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 font-medium transition-colors">
                {isLoading ? 'Loading...' : 'Start Practice'}
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Situation */}
      <div className="border-t-2 pt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">✨ Custom Situation</h2>
        
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Create Your Own Situation
          </button>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
            <label className="block font-semibold text-gray-900 mb-2">
              Describe Your Situation
            </label>
            <textarea
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value)
                setError('')
              }}
              placeholder="E.g., 'I need to confidently ask my boss for a raise' or 'How do I make friends at a new workplace?'"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={4}
            />
            
            <div className="flex gap-3">
              <button
                onClick={handleCustomSituation}
                disabled={isLoading || !customInput.trim()}
                className="flex-1 bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Starting...' : 'Start Custom Practice'}
              </button>
              <button
                onClick={() => {
                  setShowCustom(false)
                  setCustomInput('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📚 Pro Tips</h3>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li>• <strong>Speak naturally</strong> - Imagine talking to a real person</li>
          <li>• <strong>Pause for responses</strong> - The AI needs time to respond</li>
          <li>• <strong>Try different approaches</strong> - If something doesn't work, adjust your strategy</li>
          <li>• <strong>Repeat exercises</strong> - Practice makes perfect. Try the same situation multiple times</li>
          <li>• <strong>Create scenarios</strong> - Design custom situations based on real challenges you face</li>
        </ul>
      </div>
    </div>
  )
}
