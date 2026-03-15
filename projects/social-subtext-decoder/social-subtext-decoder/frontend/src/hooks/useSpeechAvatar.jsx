import { createContext, useContext, useEffect, useState, useRef } from "react"

// Use the same backend as the main project
const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3001"

const SpeechContext = createContext()

export const SpeechProvider = ({ children }) => {
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState()
  const [loading, setLoading] = useState(false)
  const contextRef = useRef()

  let chunks = []

  const initiateRecording = () => {
    chunks = []
  }

  const onDataAvailable = (e) => {
    chunks.push(e.data)
  }

  const sendAudioData = async (audioBlob) => {
    const reader = new FileReader()
    reader.readAsDataURL(audioBlob)
    reader.onloadend = async function () {
      const base64Audio = reader.result.split(",")[1]
      setLoading(true)
      try {
        const response = await fetch(`${backendUrl}/api/avatar/stt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ audio: base64Audio }),
        })
        if (!response.ok) {
          const errText = await response.text()
          let errMessage = errText || response.statusText
          try {
            const errJson = JSON.parse(errText)
            if (errJson.error) errMessage = errJson.error
          } catch (_) {}
          throw new Error(errMessage)
        }
        const json = await response.json()
        const responseData = json.messages
        if (responseData && Array.isArray(responseData)) {
          setMessages((messages) => [...messages, ...responseData])
        } else {
          throw new Error("Invalid response: expected { messages: [...] }")
        }
      } catch (error) {
        console.error("Speech-to-text error:", error)
        const msg =
          error.message || "Failed to process voice. Is the backend running on port 3001?"
        alert(msg)
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const newMediaRecorder = new MediaRecorder(stream)
          newMediaRecorder.onstart = initiateRecording
          newMediaRecorder.ondataavailable = onDataAvailable
          newMediaRecorder.onstop = async () => {
            const audioBlob = new Blob(chunks, { type: "audio/webm" })
            try {
              await sendAudioData(audioBlob)
            } catch (error) {
              console.error(error)
              alert(error.message)
            }
          }
          setMediaRecorder(newMediaRecorder)
        })
        .catch((err) => console.error("Error accessing microphone:", err))
    }
  }, [])

  const startRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.start()
      setRecording(true)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setRecording(false)
    }
  }

  const tts = async (message) => {
    console.log('🎤 TTS function called with:', message)
    setLoading(true)
    try {
      const response = await fetch(`${backendUrl}/api/avatar/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      })
      console.log('📬 TTS Response status:', response.status)
      
      if (!response.ok) {
        const errText = await response.text()
        let errMessage = errText || response.statusText
        try {
          const errJson = JSON.parse(errText)
          if (errJson.error) errMessage = errJson.error
        } catch (_) {}
        throw new Error(errMessage)
      }
      const json = await response.json()
      console.log('📦 TTS Response data:', json)
      
      const responseData = json.messages
      if (responseData && Array.isArray(responseData)) {
        console.log('✅ TTS messages received:', responseData.length, 'items')
        responseData.forEach((msg, idx) => {
          console.log(`  Message ${idx}:`, {
            text: msg.text?.substring(0, 40),
            hasAudio: !!msg.audio,
            audioLength: msg.audio?.length || 0,
            hasLipsync: !!msg.lipsync,
            mouthCuesCount: msg.lipsync?.mouthCues?.length || 0,
            firstMouthCue: msg.lipsync?.mouthCues?.[0],
          })
        })
        setMessages((messages) => [...messages, ...responseData])
      } else {
        throw new Error("Invalid response: expected { messages: [...] }")
      }
    } catch (error) {
      console.error("❌ TTS error:", error)
      const msg =
        error.message || "Failed to get reply. Is the backend running on port 3001?"
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1))
  }

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0])
    } else {
      setMessage(null)
    }
  }, [messages])

  const contextValue = {
    startRecording,
    stopRecording,
    recording,
    tts,
    message,
    onMessagePlayed,
    loading,
    messages,
  }

  contextRef.current = contextValue

  return (
    <SpeechContext.Provider value={contextValue}>
      {children}
    </SpeechContext.Provider>
  )
}

export const useSpeech = () => {
  const context = useContext(SpeechContext)
  if (!context) {
    throw new Error("useSpeech must be used within a SpeechProvider")
  }
  return context
}
