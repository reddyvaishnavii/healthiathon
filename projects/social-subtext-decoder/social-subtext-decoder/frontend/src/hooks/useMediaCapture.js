import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Hook for capturing video frames and audio chunks from camera/microphone
 * Returns stream objects and extraction utilities for real-time processing
 */
export function useMediaCapture() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState(null)
  
  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const audioContextRef = useRef(null)
  const scriptProcessorRef = useRef(null)
  const streamRef = useRef(null)
  
  // Frame extraction callback
  const frameCallbackRef = useRef(null)
  
  /**
   * Extract a video frame as base64-encoded JPEG
   */
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null
    
    const canvas = canvasRef.current
    const video = videoRef.current
    
    // Set canvas to match video dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    // Convert to base64 JPEG
    return canvas.toDataURL('image/jpeg', 0.7) // 0.7 quality for smaller payload
  }, [])
  
  /**
   * Start media capture (camera + microphone)
   */
  const startCapture = useCallback(async (onFrame) => {
    try {
      setError(null)
      frameCallbackRef.current = onFrame
      
      // Request camera + microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      streamRef.current = stream
      
      // Setup video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Ensure video plays
        videoRef.current.play().catch(err => {
          console.warn('Video autoplay blocked:', err)
        })
      }
      
      // Setup audio processing
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext
      
      const source = audioContext.createMediaStreamSource(stream)
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1)
      scriptProcessorRef.current = scriptProcessor
      
      // Collect audio chunks
      const audioChunks = []
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        audioChunks.push(new Float32Array(inputData))
        
        // Send audio batch every ~1 second
        if (audioChunks.length >= audioContext.sampleRate / 4096) {
          if (frameCallbackRef.current) {
            frameCallbackRef.current({
              type: 'audio',
              chunks: audioChunks.splice(0) // Copy and clear
            })
          }
        }
      }
      
      source.connect(scriptProcessor)
      scriptProcessor.connect(audioContext.destination)
      
      setIsCapturing(true)
      
      // Start frame extraction loop (2 FPS)
      const frameInterval = setInterval(() => {
        if (!videoRef.current?.paused) {
          const frame = captureFrame()
          if (frame && frameCallbackRef.current) {
            frameCallbackRef.current({
              type: 'video',
              frame,
              timestamp: new Date().toISOString()
            })
          }
        }
      }, 500) // 500ms = 2 FPS
      
      // Store interval ID for cleanup
      if (videoRef.current) {
        videoRef.current.frameInterval = frameInterval
      }
      
    } catch (err) {
      console.error('❌ Media capture error:', err)
      setError(err.message || 'Failed to access camera/microphone')
      setIsCapturing(false)
    }
  }, [captureFrame])
  
  /**
   * Stop media capture
   */
  const stopCapture = useCallback(() => {
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // Stop video element
    if (videoRef.current) {
      clearInterval(videoRef.current.frameInterval)
      videoRef.current.srcObject = null
    }
    
    // Stop audio processing
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    
    setIsCapturing(false)
    frameCallbackRef.current = null
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCapturing) {
        stopCapture()
      }
    }
  }, [isCapturing, stopCapture])
  
  return {
    isCapturing,
    error,
    videoRef,
    canvasRef,
    startCapture,
    stopCapture,
    captureFrame
  }
}
