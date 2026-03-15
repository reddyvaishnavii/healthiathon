import { io } from 'socket.io-client'


/**
 * WebSocket client for real-time conversation streaming
 * Manages connection, frame transmission, and result reception
 */
class ConversationWebSocketClient {
  constructor(apiURL) {
    this.url = apiURL || (import.meta.env.VITE_API_URL || "http://localhost:3001")
    this.socket = null
    this.sessionId = null
    this.isConnected = false
    this.frameCount = 0
    this.callbacks = {}
  }

  /**
   * Initialize WebSocket connection
   */
  connect(sessionId) {
    return new Promise((resolve, reject) => {
      try {
        this.sessionId = sessionId
        
        this.socket = io(this.url, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          extraHeaders: {
            'x-session-id': sessionId
          }
        })

        // Connection events
        this.socket.on('connect', () => {
          console.log('✅ WebSocket connected:', this.socket.id)
          this.isConnected = true
          resolve({ success: true, socketId: this.socket.id })
        })

        this.socket.on('disconnect', () => {
          console.log('❌ WebSocket disconnected')
          this.isConnected = false
          if (this.callbacks.onDisconnect) {
            this.callbacks.onDisconnect()
          }
        })

        this.socket.on('connect_error', (error) => {
          console.error('❌ Connection error:', error)
          reject(error)
        })

        // Conversation events
        this.socket.on('conversation:ready', (data) => {
          console.log('🎥 Conversation ready:', data)
          if (this.callbacks.onReady) {
            this.callbacks.onReady(data)
          }
        })

        this.socket.on('frame:processed', (result) => {
          this.frameCount++
          console.log(`📊 Frame ${this.frameCount} processed:`, result)
          if (this.callbacks.onFrameProcessed) {
            this.callbacks.onFrameProcessed(result)
          }
        })

        this.socket.on('conversation:summary', (summary) => {
          console.log('📈 Conversation summary:', summary)
          if (this.callbacks.onSummary) {
            this.callbacks.onSummary(summary)
          }
        })

        this.socket.on('error', (error) => {
          console.error('❌ Socket error:', error)
          if (this.callbacks.onError) {
            this.callbacks.onError(error)
          }
        })

      } catch (err) {
        console.error('❌ Connection failed:', err)
        reject(err)
      }
    })
  }

  /**
   * Start a conversation session
   */
  startConversation(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'))
        return
      }

      this.frameCount = 0
      this.socket.emit('conversation:start', options, (response) => {
        if (response?.success) {
          console.log('🎬 Conversation started')
          resolve(response)
        } else {
          reject(new Error('Failed to start conversation'))
        }
      })
    })
  }

  /**
   * Send video frame and/or audio chunks
   */
  sendFrame(frameData) {
    if (!this.socket?.connected) {
      console.warn('⚠️ WebSocket not connected, frame not sent')
      return
    }

    // frameData = { frame: base64, audioChunks: [...] }
    this.socket.emit('frame:send', frameData, (response) => {
      if (!response?.success) {
        console.error('❌ Frame transmission failed:', response)
      }
    })
  }

  /**
   * Send transcript update
   */
  updateTranscript(transcript, isFinal = false) {
    if (!this.socket?.connected) return

    this.socket.emit('transcript:update', {
      text: transcript,
      final: isFinal,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * End the conversation
   */
  endConversation() {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'))
        return
      }

      this.socket.emit('conversation:end', {}, (response) => {
        if (response?.success) {
          console.log('🏁 Conversation ended')
          resolve(response)
        } else {
          reject(new Error('Failed to end conversation'))
        }
      })
    })
  }

  /**
   * Register callback for specific events
   */
  on(event, callback) {
    this.callbacks[event] = callback
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      console.log('🔌 WebSocket disconnected')
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      sessionId: this.sessionId,
      frameCount: this.frameCount
    }
  }
}

// Create singleton instance
let client = null

export function getWebSocketClient(apiURL) {
  if (!client) {
    client = new ConversationWebSocketClient(apiURL)
  }
  return client
}

export default ConversationWebSocketClient
