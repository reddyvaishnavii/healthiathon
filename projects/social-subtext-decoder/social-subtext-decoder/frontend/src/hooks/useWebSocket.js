import { useState, useEffect, useCallback, useRef } from 'react'
import { getWebSocketClient } from '@/services/webSocketClient'
import { useSession } from './useSession'

/**
 * Hook for managing real-time WebSocket conversation
 * Handles frame sending, result reception, and error handling
 */
export function useWebSocket() {
  const sessionId = useSession()
  const clientRef = useRef(null)
  
  const [status, setStatus] = useState('disconnected') // disconnected, connecting, connected, error
  const [lastResult, setLastResult] = useState(null)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ frameCount: 0, latency: 0 })
  
  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(async () => {
    try {
      setStatus('connecting')
      setError(null)
      
      const client = getWebSocketClient()
      clientRef.current = client
      
      await client.connect(sessionId)
      
      // Register callbacks
      client.on('onReady', () => {
        setStatus('connected')
      })
      
      client.on('onFrameProcessed', (result) => {
        setLastResult(result)
        setStats(prev => ({
          frameCount: prev.frameCount + 1,
          latency: result.latency || 0
        }))
      })
      
      client.on('onError', (err) => {
        setError(err.message || 'WebSocket error')
        setStatus('error')
      })
      
      client.on('onDisconnect', () => {
        setStatus('disconnected')
      })
      
      return true
    } catch (err) {
      console.error('Connection failed:', err)
      setError(err.message)
      setStatus('error')
      return false
    }
  }, [sessionId])
  
  /**
   * Start a conversation session
   */
  const start = useCallback(async (options = {}) => {
    if (!clientRef.current?.isConnected) {
      setError('WebSocket not connected')
      return false
    }
    
    try {
      setError(null)
      await clientRef.current.startConversation(options)
      setStats({ frameCount: 0, latency: 0 })
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [])
  
  /**
   * Send video frame
   */
  const sendFrame = useCallback((frameData) => {
    if (!clientRef.current?.isConnected) {
      console.warn('WebSocket not connected')
      return
    }
    clientRef.current.sendFrame(frameData)
  }, [])
  
  /**
   * Update transcript
   */
  const updateTranscript = useCallback((transcript, isFinal = false) => {
    if (!clientRef.current?.isConnected) {
      return
    }
    clientRef.current.updateTranscript(transcript, isFinal)
  }, [])
  
  /**
   * End conversation
   */
  const end = useCallback(async () => {
    if (!clientRef.current?.isConnected) {
      return true
    }
    
    try {
      await clientRef.current.endConversation()
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [])
  
  /**
   * Disconnect
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      setStatus('disconnected')
    }
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])
  
  return {
    status,
    error,
    lastResult,
    stats,
    connect,
    start,
    sendFrame,
    updateTranscript,
    end,
    disconnect,
    isConnected: status === 'connected'
  }
}
