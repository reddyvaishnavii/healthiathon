// ═══════════════════════════════════════════════════════════════════════
// Avatar Routes: Voice, Responses, and Lip Sync
// ═══════════════════════════════════════════════════════════════════════

import express from "express"
import {
  textToSpeech,
  speechToText,
  getAvailableVoices,
} from "../services/voiceService.js"
import {
  generateAvatarPracticeResponse,
  generateAvatarLiveResponse,
  generateAvatarResponse,
} from "../services/openAIService.js"
import { generateLipSync } from "../services/lipSyncService.js"

const router = express.Router()

// ─────────────────────────────────────────────────────────────
// GET /api/avatar/voices
// Get available ElevenLabs voices
// ─────────────────────────────────────────────────────────────

router.get("/voices", async (req, res) => {
  try {
    const voices = await getAvailableVoices()
    res.json({
      success: true,
      voices: voices || [],
    })
  } catch (error) {
    console.error("❌ Error fetching voices:", error.message)
    res.status(500).json({
      success: false,
      error: "Could not fetch voices",
    })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/avatar/tts
// Text-to-Speech with lip sync (for practice mode)
// ─────────────────────────────────────────────────────────────

router.post("/tts", async (req, res) => {
  try {
    const { message, includeAudio = true } = req.body

    // Accept either string or full message object
    let messageObj = typeof message === "string" 
      ? { text: message }
      : message
    
    if (!messageObj || !messageObj.text) {
      return res.status(400).json({
        success: false,
        error: "Invalid message: must have text field",
      })
    }

    console.log('🎤 TTS Request:', messageObj.text?.substring(0, 50));

    // Prepare message object for lip-sync generation - preserve all existing fields
    let messages = [{
      text: messageObj.text,
      audio: null,
      lipsync: null,
      facialExpression: messageObj.facialExpression || "default",
      animation: messageObj.animation || "TalkingOne",
    }]

    // Generate lip sync with text-to-speech
    if (includeAudio) {
      try {
        console.log('📝 Generating TTS + lip sync for:', messages[0].text);
        messages = await generateLipSync({ messages })
        console.log('✅ TTS + lip sync generated successfully');
        console.log('📊 Message structure:', {
          text: messages[0].text?.substring(0, 30) + "...",
          hasAudio: !!messages[0].audio,
          audioSize: messages[0].audio?.length || 0,
          hasLipsync: !!messages[0].lipsync,
          mouthCuesCount: messages[0].lipsync?.mouthCues?.length || 0,
          expression: messages[0].facialExpression,
          animation: messages[0].animation
        })
      } catch (error) {
        console.error("❌ Lip sync generation failed:", error.message)
        console.error("Error stack:", error.stack)
        console.warn("⚠️ Lip sync failed - checking if we at least have audio...")
        
        // Check if we still have audio even though lipsync failed
        if (messages[0].audio) {
          console.warn("✅ Audio exists, returning with message but no lipsync")
        } else {
          console.error("❌ No audio either - the generation completely failed")
        }
      }
    }

    console.log('📤 Sending TTS response with:', {
      messageCount: messages.length,
      hasAudio: !!messages[0]?.audio,
      hasLipsync: !!messages[0]?.lipsync,
      expression: messages[0]?.facialExpression,
      animation: messages[0]?.animation
    })

    res.json({
      success: true,
      messages: messages,
    })
  } catch (error) {
    console.error("❌ TTS Error:", error.message)
    res.status(500).json({
      success: false,
      error: "Error generating speech",
    })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/avatar/practice
// Practice mode: AI responds as roleplay character
// ─────────────────────────────────────────────────────────────

router.post("/practice", async (req, res) => {
  try {
    const { userMessage, conversationHistory = [], situationType = "restaurant" } = req.body

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid user message",
      })
    }

    // Generate practice response
    const response = await generateAvatarPracticeResponse({
      userMessage,
      conversationHistory,
      situationType,
    })

    let messages = response.messages || []

    // Generate lip sync
    try {
      messages = await generateLipSync({ messages })
    } catch (error) {
      console.warn("⚠️ Lip sync skipped:", error.message)
    }

    res.json({
      success: true,
      messages: messages,
    })
  } catch (error) {
    console.error("❌ Practice Response Error:", error.message)
    res.status(500).json({
      success: false,
      error: "Error generating practice response",
    })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/avatar/live
// Live interaction mode: Real-time feedback with emotion detection
// ─────────────────────────────────────────────────────────────

router.post("/live", async (req, res) => {
  try {
    const {
      userMessage,
      conversationContext = "",
      detectedEmotion = "neutral",
      suggestedTone = "supportive",
    } = req.body

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid user message",
      })
    }

    // Generate live response with emotion awareness
    const response = await generateAvatarLiveResponse({
      userMessage,
      conversationContext,
      detectedEmotion,
      suggestedTone,
    })

    let messages = response.messages || []

    // Generate lip sync
    try {
      messages = await generateLipSync({ messages })
    } catch (error) {
      console.warn("⚠️ Lip sync skipped:", error.message)
    }

    res.json({
      success: true,
      messages: messages,
    })
  } catch (error) {
    console.error("❌ Live Response Error:", error.message)
    res.status(500).json({
      success: false,
      error: "Error generating live feedback",
    })
  }
})

// ─────────────────────────────────────────────────────────────
// POST /api/avatar/stt
// Speech-to-Text
// ─────────────────────────────────────────────────────────────

router.post("/stt", async (req, res) => {
  try {
    const { audio } = req.body

    if (!audio) {
      return res.status(400).json({
        success: false,
        error: "Missing audio data",
      })
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, "base64")

    // Transcribe
    const transcribedText = await speechToText({ audioData: audioBuffer })

    res.json({
      success: true,
      transcription: transcribedText,
    })
  } catch (error) {
    console.error("❌ STT Error:", error.message)
    res.status(500).json({
      success: false,
      error: "Error transcribing audio",
    })
  }
})

export default router
