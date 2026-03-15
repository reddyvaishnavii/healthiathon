// ═══════════════════════════════════════════════════════════════════════
// Gemini AI Integration Service
// ═══════════════════════════════════════════════════════════════════════

import dotenv from "dotenv"
import { GoogleGenerativeAI } from "@google/generative-ai"

dotenv.config()

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY not found. AI responses may fail.")
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash"
})


// ─────────────────────────────────────────────────────────────
// Core System Prompt
// ─────────────────────────────────────────────────────────────

const CORE_SYSTEM_PROMPT = `
You are a conversation practice partner helping someone who is autistic practice real social conversations.

STRICT RULES FOR YOUR REPLY:
- Maximum 2 sentences. No exceptions.
- Be direct and literal. No idioms, no sarcasm, no implied meaning.
- No filler phrases like "Great question!", "Absolutely!", "Of course!" — just the actual answer.
- Use simple, clear words. Avoid ambiguous language.
- If the user is practicing a scenario (job interview, ordering food, talking to a friend), stay in that scenario.

STRICT RULES FOR SUGGESTIONS:
- Give exactly 4 suggestions the user could say next.
- Each suggestion must go in a DIFFERENT direction:
  1. Continue / go deeper on the current topic
  2. Ask a question back
  3. Change or end the topic politely
  4. Express a feeling or reaction
- Suggestions must be short (under 10 words), natural, and ready to say out loud.
- Base suggestions on the MOST RECENT part of the conversation — not generic fillers.
- Never repeat a suggestion that was already used in this conversation.

Return ONLY valid JSON. No markdown. No explanation. No code blocks.

Format:
{
  "reply": "Direct reply in max 2 sentences.",
  "suggestions": [
    "Continue: ...",
    "Ask: ...",
    "Change topic: ...",
    "React: ..."
  ]
}
`


// ─────────────────────────────────────────────────────────────
// Generate AI Response
// ─────────────────────────────────────────────────────────────

export async function generateAIResponse(
  userMessage,
  conversationHistory = [],
  situationType = "custom",
  customContext = ""
) {

  try {

    let systemPrompt = CORE_SYSTEM_PROMPT

    if (customContext) {
      systemPrompt += `\n\nScenario context: ${customContext}`
    }

    // Build recent conversation history (last 6 turns = 3 exchanges)
    const historyText = conversationHistory
      .slice(-6)
      .map(msg =>
        `${msg.sender === "user" ? "User" : "AI"}: ${msg.text}`
      )
      .join("\n")

    const prompt = `
${systemPrompt}

${historyText ? `Recent conversation:\n${historyText}\n` : ""}
User just said: ${userMessage}

Respond now.
`

    console.log("🤖 Generating Gemini response...")

    const result = await model.generateContent(prompt)
    const response = await result.response
    let text = response.text()

    console.log("🤖 Raw Gemini response:", text)

    // Strip any accidental markdown fences
    text = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()

    let parsed

    try {
      parsed = JSON.parse(text)
    } catch (err) {
      console.warn("⚠️ JSON parsing failed. Falling back.")
      return getFallbackResponse(userMessage)
    }

    const reply = parsed.reply?.trim() || "I understand."

    // Clean and validate suggestions
    const rawSuggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
      : []

    const suggestions = rawSuggestions
      .slice(0, 4)
      .map(s => String(s).trim())
      .filter(s => s.length > 0)

    // Pad to 4 if Gemini returned fewer
    while (suggestions.length < 4) {
      const defaults = getDefaultSuggestions()
      const next = defaults.find(d => !suggestions.includes(d))
      if (next) suggestions.push(next)
      else break
    }

    return {
      response: reply,
      suggestions,
      isFallback: false
    }

  } catch (error) {

    console.error("❌ Gemini error:", error.message)
    return getFallbackResponse(userMessage)

  }

}


// ─────────────────────────────────────────────────────────────
// Fallback Response
// ─────────────────────────────────────────────────────────────

function getFallbackResponse(userMessage = "") {

  const replies = [
    "I hear you.",
    "That makes sense.",
    "Thanks for telling me that.",
    "I'm following along."
  ]

  const response = replies[Math.floor(Math.random() * replies.length)]

  return {
    response,
    suggestions: getDefaultSuggestions(),
    isFallback: true
  }

}

function getDefaultSuggestions() {
  return [
    "Can you say more about that?",
    "Why do you think that is?",
    "I'd like to change the topic.",
    "That makes me feel curious."
  ]
}


// ─────────────────────────────────────────────────────────────
// Lightweight Sarcasm Detection
// ─────────────────────────────────────────────────────────────

export async function detectSarcasm(message) {

  const sarcasmIndicators = [
    /yeah[,.]?\s+right/i,
    /sure[,.]?\s+whatever/i,
    /oh[,.]?\s+great/i,
    /obviously/i,
    /clearly/i
  ]

  const detected = sarcasmIndicators.some(pattern =>
    pattern.test(message)
  )

  return {
    detected,
    confidence: detected ? 0.6 : 0.1
  }

}


// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function getAvailableSituations() {
  return [
    { id: "custom", title: "Free Conversation" },
    { id: "job_interview", title: "Job Interview" },
    { id: "ordering_food", title: "Ordering Food" },
    { id: "meeting_someone", title: "Meeting Someone New" },
    { id: "doctor_visit", title: "Doctor Visit" }
  ]
}