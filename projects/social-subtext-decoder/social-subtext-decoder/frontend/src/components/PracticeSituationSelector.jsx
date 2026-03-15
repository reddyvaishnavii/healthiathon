import { useState, useEffect } from 'react'

export default function PracticeSituationSelector({ onSelectSituation, isLoading }) {
  const [situations, setSituations] = useState([])
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSituations()
  }, [])

  const fetchSituations = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/practice/situations')
      const data = await response.json()

      if (data.success) {
        setSituations(data.data)
      }
    } catch (error) {
      console.error('Error fetching situations:', error)
      setError('Failed to load situations. Please try again.')
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
