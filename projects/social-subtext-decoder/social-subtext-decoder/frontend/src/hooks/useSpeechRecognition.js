import { useState, useCallback, useRef, useEffect } from 'react'

// Hybrid speech-to-text: Web Speech API with automatic fallback to backend
export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(null)
  const [useFallback, setUseFallback] = useState(false) // Try voice first, fallback to text after retries
  const recognitionRef = useRef(null)
  const interimTranscriptRef = useRef('')
  const retryCountRef = useRef(0)
  const isInitialStartRef = useRef(true) // Track if this is initial start vs retry

  useEffect(() => {
    // Check browser support and initialize recognition ONCE
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('📢 Web Speech API not supported - using text input fallback')
      setBrowserSupportsSpeechRecognition(false)
      setUseFallback(true)
      return
    }

    setBrowserSupportsSpeechRecognition(true)

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started')
      setIsListening(true)
      // ONLY reset retry count on initial start, not on retries
      if (isInitialStartRef.current) {
        retryCountRef.current = 0
        isInitialStartRef.current = false
      }
      interimTranscriptRef.current = ''
    }

    recognition.onresult = (event) => {
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          setTranscript(transcriptSegment)
          console.log('✅ Final transcript:', transcriptSegment)
        } else {
          interim += transcriptSegment
        }
      }

      interimTranscriptRef.current = interim
    }

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error)
      
      if (event.error === 'no-speech') {
        console.warn('⚠️ No speech detected. Please speak clearly.')
        setIsListening(false)
      } else if (event.error === 'network') {
        console.warn('⚠️ Network error with Web Speech API')
        
        // Retry ONCE, then fallback to text
        if (retryCountRef.current < 1) {
          retryCountRef.current++
          console.log(`🔄 Retrying speech recognition (${retryCountRef.current}/1)...`)
          
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                // STOP the recognition first, then restart
                recognitionRef.current.abort()
                setTimeout(() => {
                  try {
                    recognitionRef.current.start()
                  } catch (err) {
                    console.warn('Could not restart recognition:', err.message)
                    setUseFallback(true)
                    setIsListening(false)
                  }
                }, 200)
              } catch (err) {
                console.warn('Could not abort recognition:', err.message)
                setUseFallback(true)
                setIsListening(false)
              }
            }
          }, 300)
        } else {
          console.warn('📝 Falling back to text input mode (Web Speech API unavailable)')
          setUseFallback(true)
          setIsListening(false)
        }
      } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        console.error('❌ Microphone permission denied. Enable it in browser settings.')
        setBrowserSupportsSpeechRecognition(false)
        setUseFallback(true)
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended')
      setIsListening(false)
    }

    recognitionRef.current = recognition
    
    // Cleanup: No need to close/abort here, just remove on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (err) {
          // Silently fail if already stopped
        }
      }
    }
  }, []) // ONLY run once on mount

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !browserSupportsSpeechRecognition) return

    setTranscript('')
    retryCountRef.current = 0
    isInitialStartRef.current = true // Mark as initial start
    setUseFallback(false) // Reset fallback when user tries again
    
    try {
      recognitionRef.current.start()
    } catch (err) {
      console.warn('Could not start recognition:', err.message)
      setUseFallback(true)
    }
  }, [browserSupportsSpeechRecognition])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch (err) {
      console.warn('Could not stop recognition:', err.message)
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    interimTranscriptRef.current = ''
  }, [])

  return {
    transcript,
    interimTranscript: interimTranscriptRef.current,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    useFallback,
  }
}

// Web Speech Synthesis hook for text-to-speech
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [browserSupportsSpeechSynthesis, setBrowserSupportsSpeechSynthesis] = useState(null)
  const [voices, setVoices] = useState([])
  const utteranceRef = useRef(null)

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setBrowserSupportsSpeechSynthesis(false)
      return
    }

    setBrowserSupportsSpeechSynthesis(true)

    // Get available voices
    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      setVoices(availableVoices)
    }

    window.speechSynthesis.onvoiceschanged = updateVoices
    updateVoices()
  }, [])

  const speak = async (text, options = {}) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !browserSupportsSpeechSynthesis) {
        console.warn('Speech synthesis not supported')
        resolve()
        return
      }

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = options.rate || 0.95
      utterance.pitch = options.pitch || 1
      utterance.volume = options.volume || 1

      // Select voice
      if (voices.length > 0) {
        // Prefer female voice if available
        const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female')) || voices[0]
        utterance.voice = femaleVoice
      }

      utterance.onstart = () => {
        console.log('🔊 Speech started')
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        console.log('🔊 Speech ended')
        setIsSpeaking(false)
        resolve()
      }

      utterance.onerror = (event) => {
        console.error('❌ Speech synthesis error:', event.error)
        setIsSpeaking(false)
        resolve()
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    })
  }

  const stop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  return {
    speak,
    isSpeaking,
    stop,
    voices,
    browserSupportsSpeechSynthesis,
  }
}