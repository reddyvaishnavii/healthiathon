// ═══════════════════════════════════════════════════════════════════════
// Lip Sync Service: Generate phoneme data for avatar lip-syncing
// ═══════════════════════════════════════════════════════════════════════

import { textToSpeech } from "./voiceService.js"
import {
  convertAudioToWav,
  readJsonTranscript,
  audioFileToBase64,
  execCommand,
} from "./audioService.js"

const MAX_RETRIES = 10
const RETRY_DELAY = 0

// ─────────────────────────────────────────────────────────────
// Helper: Delay
// ─────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ─────────────────────────────────────────────────────────────
// Generate Phonemes using Rhubarb
// ─────────────────────────────────────────────────────────────

export async function generatePhonemes({ message, messageIndex }) {
  try {
    const fileName = `audios/message_${messageIndex}.mp3`
    const wavFile = `audios/message_${messageIndex}.wav`
    const jsonFile = `audios/message_${messageIndex}.json`

    console.log(`🎵 Converting to WAV for message ${messageIndex}`)
    await convertAudioToWav({ inputPath: fileName, outputPath: wavFile })

    console.log(`📞 Generating phonemes for message ${messageIndex}`)
    await execCommand({
      command: `./bin/rhubarb -f json -o "${jsonFile}" "${wavFile}" -r phonetic`,
    })

    console.log(`✅ Lip sync generated: ${jsonFile}`)
    return jsonFile
  } catch (error) {
    console.error(
      `❌ Error generating phonemes for message ${messageIndex}:`,
      error.message
    )
    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// Generate fallback lip sync when FFmpeg unavailable
// ─────────────────────────────────────────────────────────────

function generateFallbackLipsync(text) {
  // Simple fallback: distribute mouth cues evenly across text duration
  // Assume ~150ms per phoneme
  const words = text.split(/\s+/)
  const mouthCues = []
  let currentTime = 0
  const visemeSequence = ['A', 'O', 'E', 'U', 'O', 'A'] // Basic mouth shapes
  let visemeIndex = 0

  words.forEach((word) => {
    const wordDuration = Math.max(word.length * 0.15, 0.2) // 150ms per char, min 200ms
    const phonemesPerWord = Math.max(Math.ceil(word.length / 2), 1)
    
    for (let i = 0; i < phonemesPerWord; i++) {
      const phonemeStart = currentTime + (i * wordDuration / phonemesPerWord)
      const phonemeEnd = currentTime + ((i + 1) * wordDuration / phonemesPerWord)
      
      mouthCues.push({
        start: phonemeStart,
        end: phonemeEnd,
        value: visemeSequence[visemeIndex % visemeSequence.length]
      })
      visemeIndex++
    }
    currentTime += wordDuration + 0.1 // Add small gap between words
  })

  return { mouthCues }
}

// ─────────────────────────────────────────────────────────────
// Full Lip Sync Pipeline
// ─────────────────────────────────────────────────────────────

export async function generateLipSync({ messages }) {
  try {
    if (!messages || messages.length === 0) {
      return messages
    }

    // Step 1: Generate TTS for all messages
    console.log(`🎤 Generating TTS for ${messages.length} messages...`)
    await Promise.all(
      messages.map(async (message, index) => {
        const fileName = `audios/message_${index}.mp3`

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            await textToSpeech({ text: message.text, fileName })
            await delay(RETRY_DELAY)
            break
          } catch (error) {
            if (error.response?.status === 429 && attempt < MAX_RETRIES - 1) {
              console.log(`Rate limited, retrying after ${RETRY_DELAY}ms...`)
              await delay(RETRY_DELAY)
            } else {
              throw error
            }
          }
        }
        console.log(`✅ Message ${index} converted to speech`)
      })
    )

    // Step 2: Generate phonemes and collect audio/lipsync data
    console.log(`🔄 Generating lip sync data...`)
    await Promise.all(
      messages.map(async (message, index) => {
        const fileName = `audios/message_${index}.mp3`
        const jsonFile = `audios/message_${index}.json`

        try {
          // Always get audio base64
          message.audio = await audioFileToBase64({ fileName })
          console.log(`🎵 Audio base64 attached for message ${index}`)

          // Try to get lip sync, but generate fallback if FFmpeg unavailable
          try {
            await generatePhonemes({ message, messageIndex: index })
            message.lipsync = await readJsonTranscript({ fileName: jsonFile })
            console.log(`✅ Lip sync attachment complete for message ${index}`)
          } catch (ffmpegError) {
            console.warn(
              `⚠️ FFmpeg/Rhubarb unavailable for message ${index} - generating fallback lip-sync:`,
              ffmpegError.message
            )
            // Generate fallback lipsync so avatar can still animate
            message.lipsync = generateFallbackLipsync(message.text)
            console.log(`✅ Fallback lip sync generated with ${message.lipsync.mouthCues.length} cues`)
          }
        } catch (error) {
          console.error(
            `⚠️ Could not process message ${index}:`,
            error.message
          )
          // Continue without this message's data
        }
      })
    )

    return messages
  } catch (error) {
    console.error("❌ Lip sync pipeline error:", error.message)
    throw error
  }
}
