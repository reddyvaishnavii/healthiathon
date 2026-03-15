// Voice Service: TTS (ElevenLabs) and STT (Whisper)
import { OpenAIWhisperAudio } from "langchain/document_loaders/fs/openai_whisper_audio"
import fs from "fs"
import dotenv from "dotenv"
import axios from "axios"
import { convertAudioToMp3 } from "./audioService.js"

dotenv.config()

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY
const voiceID = process.env.ELEVEN_LABS_VOICE_ID || process.env.ELVEN_LABS_VOICE_ID
const modelID = process.env.ELEVEN_LABS_MODEL_ID || "eleven_turbo_v2_5"
const openAIApiKey = process.env.OPENAI_API_KEY

// Text-to-Speech (ElevenLabs)
export async function textToSpeech({ text, fileName }) {
  try {
    if (!elevenLabsApiKey || elevenLabsApiKey.includes('placeholder')) {
      console.warn("⚠️ ELEVEN_LABS_API_KEY not configured - generating test audio")
      return generateTestAudio(fileName, text)
    }

    console.log(`🎤 Calling ElevenLabs TTS: "${text.substring(0, 50)}..."`)
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceID}`,
      { text, model_id: modelID, voice_settings: { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true } },
      { headers: { "xi-api-key": elevenLabsApiKey, "Content-Type": "application/json" }, responseType: "arraybuffer", timeout: 30000 }
    )
    fs.writeFileSync(fileName, response.data)
    console.log(`✅ TTS audio generated: ${fileName}`)
    return fileName
  } catch (error) {
    console.error("❌ ElevenLabs error:", error.response?.data?.detail?.message || error.message)
    return generateTestAudio(fileName, text)
  }
}

// Generate test audio when API fails (creates valid WAV silence)
function generateTestAudio(fileName, text) {
  try {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1
    const duration = Math.max(2, sentences * 2.5)
    
    // Create a valid WAV file with silence
    const sampleRate = 44100
    const numSamples = Math.floor(duration * sampleRate)
    const bytesPerSample = 2
    const numChannels = 1
    
    // WAV header
    const buffer = Buffer.alloc(44 + numSamples * bytesPerSample)
    
    // RIFF header
    buffer.write('RIFF', 0)
    buffer.writeUInt32LE(36 + numSamples * bytesPerSample, 4)
    buffer.write('WAVE', 8)
    
    // fmt sub-chunk
    buffer.write('fmt ', 12)
    buffer.writeUInt32LE(16, 16) // Subchunk1Size
    buffer.writeUInt16LE(1, 20) // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22)
    buffer.writeUInt32LE(sampleRate, 24)
    buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28) // ByteRate
    buffer.writeUInt16LE(numChannels * bytesPerSample, 32) // BlockAlign
    buffer.writeUInt16LE(16, 34) // BitsPerSample
    
    // data sub-chunk
    buffer.write('data', 36)
    buffer.writeUInt32LE(numSamples * bytesPerSample, 40)
    
    // Fill with silence (zeros) - already done by Buffer.alloc
    
    fs.writeFileSync(fileName, buffer)
    console.log(`📝 Test audio generated (${duration.toFixed(1)}s): ${fileName}`)
    return fileName
  } catch (e) {
    console.error("Error generating test audio:", e.message)
    throw e
  }
}

// Speech-to-Text (Whisper)
export async function speechToText({ audioData }) {
  try {
    if (!openAIApiKey) {
      console.warn("⚠️ OPENAI_API_KEY not configured")
      return ""
    }
    const mp3AudioData = await convertAudioToMp3({ audioData })
    const outputPath = "/tmp/output.mp3"
    fs.writeFileSync(outputPath, mp3AudioData)
    const loader = new OpenAIWhisperAudio(outputPath, { clientOptions: { apiKey: openAIApiKey } })
    const doc = (await loader.load()).shift()
    const transcribedText = doc.pageContent
    fs.unlinkSync(outputPath)
    console.log(`✅ STT transcribed: "${transcribedText}"`)
    return transcribedText
  } catch (error) {
    console.error("❌ STT Error:", error.message)
    throw error
  }
}

// Get Available Voices
export async function getAvailableVoices() {
  try {
    if (!elevenLabsApiKey) return []
    const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": elevenLabsApiKey }
    })
    return response.data.voices || []
  } catch (error) {
    console.error("❌ Error fetching voices:", error.message)
    return []
  }
}
