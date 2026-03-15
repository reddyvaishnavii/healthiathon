import { GoogleGenerativeAI } from "@google/generative-ai"
import { saveToHistory } from "./historyController.js"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// ─── System Prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a compassionate social communication expert helping autistic individuals understand the hidden meaning behind everyday phrases.

Return ONLY a valid JSON object in this structure:

{
  "literal": "string",
  "social": "string",
  "tone": {
    "label": "Friendly | Neutral | Sarcastic | Dismissive | Sincere | Polite but Cold | Enthusiastic | Concerned | Uncomfortable | Joking",
    "explanation": "string"
  },
  "suggestedResponses": [
    {
      "text": "string",
      "context": "string"
    }
  ],
  "confidence": "high | medium | low",
  "tip": "string"
}`

// ─── Controller ───────────────────────────────────────────────
export const decodePhrase = async (req, res) => {

  console.log("📥 Incoming request:", req.body)

  const { phrase, context } = req.body

  if (!phrase || typeof phrase !== "string") {
    return res.status(400).json({
      success: false,
      error: "Please provide a phrase."
    })
  }

  const trimmed = phrase.trim()

  const userMessage = context?.trim()
    ? `Phrase: "${trimmed}"\nContext: ${context}`
    : `Phrase: "${trimmed}"`

  try {

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    })

    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\n${userMessage}`
    )

    const rawText = result.response.text()

    console.log("🤖 Gemini raw response:", rawText)

    let decoded

    try {
      const clean = rawText.replace(/```json|```/g, "").trim()
      decoded = JSON.parse(clean)
    } catch (err) {

      console.error("❌ JSON parse error:", rawText)

      return res.status(500).json({
        success: false,
        error: "AI response format error"
      })
    }

    // ─── Save to History ──────────────────────────────────────
    try {
      const sessionId = req.headers['x-session-id'] || 'default'

      const entry = saveToHistory(sessionId, trimmed, decoded)

      console.log("💾 Saved to history:", entry)
    } catch (historyError) {
      console.error("⚠️ History save failed:", historyError)
      // Don't fail the request if history fails
    }

    // ─── Send Response ────────────────────────────────────────
    return res.json({
      success: true,
      phrase: trimmed,
      decoded
    })

  } catch (err) {

    console.error("❌ Gemini API error:", err)

    return res.status(500).json({
      success: false,
      error: "AI request failed"
    })
  }
}