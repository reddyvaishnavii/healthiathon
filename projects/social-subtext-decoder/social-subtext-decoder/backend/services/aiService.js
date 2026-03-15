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
// Practice Mode Context Templates
// ─────────────────────────────────────────────────────────────

const SITUATION_TEMPLATES = {

  restaurant: {
    title: "Ordering at a Restaurant",
    systemPrompt: `
You are a friendly restaurant waiter helping a customer order food.

Rules:
- Keep responses VERY SHORT.
- Maximum 1–2 sentences.
- Ask only ONE question at a time.
- Do NOT explain too much.
- Avoid long descriptions.
- Respond naturally like a real waiter.
- Ask follow-up questions based on what the user says.
- Do NOT repeat questions already asked.
- Offer suggestions when helpful.
- Keep responses conversational but informative.
`,
    initialMessage: "Welcome! What can I help you order today?",
    scenarios: [
      "Casual dining experience",
      "Fine dining restaurant",
      "Fast casual cafe"
    ]
  },

  job_interview: {
    title: "Practice Job Interview",
    systemPrompt: `
You are a professional interviewer conducting a realistic job interview.

Rules:
- Keep responses VERY SHORT.
- Maximum 1–2 sentences.
- Ask only ONE question at a time.
- Do NOT explain too much.
- Avoid long descriptions.
- Ask follow-up questions based on the candidate's response.
- Encourage them to elaborate on experience and skills.
- Keep responses professional but supportive.
`,
    initialMessage: "Thank you for coming in today. Could you introduce yourself?",
    scenarios: [
      "Software Engineer position",
      "Customer Service role",
      "Sales position"
    ]
  },

  small_talk: {
    title: "Small Talk Practice",
    systemPrompt: `
You are having casual small talk with someone new.

Rules:
- Keep responses VERY SHORT.
- Maximum 1–2 sentences.
- Ask only ONE question at a time.
- Do NOT explain too much.
- Avoid long descriptions.
- Respond naturally and conversationally.
- Ask follow-up questions about what the user says.
- Keep the conversation flowing.
`,
    initialMessage: "Hi! How’s your day going?",
    scenarios: [
      "At a social event",
      "Meeting new colleague",
      "Coffee shop encounter"
    ]
  },

  difficult_conversation: {
    title: "Handle Difficult Conversation",
    systemPrompt: `
You are role-playing a difficult conversation.

Rules:
- Keep responses VERY SHORT.
- Maximum 1–2 sentences.
- Ask only ONE question at a time.
- Do NOT explain too much.
- Avoid long descriptions.
- Respond empathetically.
- Acknowledge feelings.
- Ask thoughtful follow-up questions.
- Encourage constructive communication.
`,
    initialMessage: "I wanted to talk about something that's been bothering me...",
    scenarios: [
      "Disagreement with friend",
      "Feedback from colleague",
      "Setting a boundary"
    ]
  },

  custom: {
    title: "Custom Situation",
    systemPrompt: `
You are role-playing in a custom social situation.

Rules:
- Keep responses VERY SHORT.
- Maximum 1–2 sentences.
- Ask only ONE question at a time.
- Do NOT explain too much.
- Avoid long descriptions.
- Respond naturally.
- Build on what the user says.
- Ask thoughtful follow-up questions.
`,
    initialMessage: "I'm ready. Let's begin the practice!",
    scenarios: []
  }

}


// ─────────────────────────────────────────────────────────────
// Generate AI Response
// ─────────────────────────────────────────────────────────────

export async function generateAIResponse(
  userMessage,
  conversationHistory,
  situationType = "custom",
  customContext = ""
) {

  try {

    const template =
      SITUATION_TEMPLATES[situationType] || SITUATION_TEMPLATES.custom


    let systemPrompt = template.systemPrompt

    if (customContext) {
      systemPrompt += `\nAdditional context: ${customContext}`
    }


    // Build conversation history
    const historyText = conversationHistory
      .slice(-10)
      .map(msg =>
        `${msg.sender === "user" ? "User" : "AI"}: ${msg.text}`
      )
      .join("\n")


    const prompt = `
SYSTEM:
${systemPrompt}

Conversation so far:
${historyText}

User: ${userMessage}

AI:
`


    console.log("🤖 Generating Gemini response...")
    console.log("🧠 Prompt sent to Gemini:", prompt)


    const result = await model.generateContent(prompt)

    const response = await result.response
    let aiResponse = response.text()

    console.log("🤖 Gemini raw response:", aiResponse)


    // Clean formatting
    aiResponse = aiResponse
      .replace(/^AI:\s*/i, "")
      .replace(/\n+/g, " ")
      .trim()


    console.log("✅ Gemini Response:", aiResponse)


    return {
      response: aiResponse,
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

function getFallbackResponse() {

  const responses = [
    "Tell me more about that.",
    "That’s interesting. Can you elaborate?",
    "I see. What happened next?",
    "That makes sense. What else?",
    "Go on, I’m listening.",
    "Why do you think that?",
    "Interesting perspective. Tell me more."
  ]

  const response =
    responses[Math.floor(Math.random() * responses.length)]

  return {
    response,
    isFallback: true
  }

}


// ─────────────────────────────────────────────────────────────
// Sarcasm Detection (lightweight heuristic)
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

export function getSituationTemplate(situationType) {
  return SITUATION_TEMPLATES[situationType] || SITUATION_TEMPLATES.custom
}

export function getAvailableSituations() {

  return Object.entries(SITUATION_TEMPLATES).map(
    ([key, template]) => ({
      id: key,
      title: template.title,
      scenarios: template.scenarios
    })
  )

}