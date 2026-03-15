// ═══════════════════════════════════════════════════════════════════════
// Audio Service: Audio conversion and file operations
// ═══════════════════════════════════════════════════════════════════════

import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { promises as fsPromises } from "fs"

// ─────────────────────────────────────────────────────────────
// Helper: Execute Commands
// ─────────────────────────────────────────────────────────────

function execCommand({ command }) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command error: ${command}`)
        reject(error)
      }
      resolve(stdout)
    })
  })
}

// ─────────────────────────────────────────────────────────────
// Convert Audio to MP3
// ─────────────────────────────────────────────────────────────

export async function convertAudioToMp3({ audioData }) {
  try {
    const dir = "tmp"
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    const inputPath = path.join(dir, "input.webm")
    const outputPath = path.join(dir, "output.mp3")

    fs.writeFileSync(inputPath, audioData)

    // Convert using ffmpeg
    await execCommand({
      command: `ffmpeg -y -i "${inputPath}" "${outputPath}"`,
    })

    const mp3AudioData = fs.readFileSync(outputPath)

    // Cleanup
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)

    return mp3AudioData
  } catch (error) {
    console.error("❌ Audio conversion error:", error.message)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// Read JSON Transcript (Lip Sync Data)
// ─────────────────────────────────────────────────────────────

export async function readJsonTranscript({ fileName }) {
  try {
    const data = await fsPromises.readFile(fileName, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error(`❌ Error reading transcript ${fileName}:`, error.message)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// Convert Audio File to Base64
// ─────────────────────────────────────────────────────────────

export async function audioFileToBase64({ fileName }) {
  try {
    const data = await fsPromises.readFile(fileName)
    return data.toString("base64")
  } catch (error) {
    console.error(`❌ Error reading audio file ${fileName}:`, error.message)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// Convert audio to WAV
// ─────────────────────────────────────────────────────────────

export async function convertAudioToWav({ inputPath, outputPath }) {
  try {
    await execCommand({
      command: `ffmpeg -y -i "${inputPath}" "${outputPath}"`,
    })
    console.log(`✅ Converted to WAV: ${outputPath}`)
  } catch (error) {
    console.error("❌ WAV conversion error:", error.message)
    throw error
  }
}

export { execCommand }
