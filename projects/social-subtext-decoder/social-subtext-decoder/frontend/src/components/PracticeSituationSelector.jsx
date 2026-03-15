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

     
      </div>
    
  )
}
