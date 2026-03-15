// ═══════════════════════════════════════════════════════════════════════
// OpenAI Service: Avatar responses with structured output
// ═══════════════════════════════════════════════════════════════════════

//import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { StructuredOutputParser } from "langchain/output_parsers"
import { z } from "zod"
import dotenv from "dotenv"

dotenv.config()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"

if (!OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY not found. Avatar responses may fail.")
}

// ─────────────────────────────────────────────────────────────
// Response Schema
// ─────────────────────────────────────────────────────────────

const messageSchema = z.array(
  z.object({
    text: z.string().describe("Text to be spoken by the AI"),
    facialExpression: z
      .string()
      .describe(
        "Facial expression: smile, sad, angry, surprised, funnyFace, default"
      ),
    animation: z
      .string()
      .describe(
        "Animation: Idle, TalkingOne, TalkingThree, SadIdle, Defeated, Angry, Surprised, DismissingGesture, ThoughtfulHeadShake"
      ),
    suggestedReplies: z
      .array(z.string())
      .optional()
      .describe("2-3 suggested replies for the user"),
  })
)

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    messages: messageSchema,
  })
)

// ─────────────────────────────────────────────────────────────
// Initialize LLM
// ─────────────────────────────────────────────────────────────

// const model = new ChatOpenAI({
//   openAIApiKey: OPENAI_API_KEY,
//   modelName: OPENAI_MODEL,
//   temperature: 0.7,
//   maxTokens: 500,
// })

// ─────────────────────────────────────────────────────────────
// Helper: Analyze sentiment and select appropriate expressions
// ─────────────────────────────────────────────────────────────

function analyzeMessageSentiment(text) {
  const lowerText = text.toLowerCase()
  
  // Positive indicators
  if (lowerText.match(/\b(great|good|excellent|perfect|love|wonderful|amazing|fantastic)\b/)) {
    return "smile"
  }
  
  // Negative/sad indicators
  if (lowerText.match(/\b(sad|unhappy|upset|frustrated|angry|terrible|awful|hate)\b/)) {
    return "sad"
  }
  
  // Surprised indicators
  if (lowerText.match(/\b(wow|surprise|shocked|really|seriously|what|why)\b/) || text.includes("?")) {
    return "surprised"
  }
  
  // Confused/questioning indicators
  if (lowerText.match(/\b(confused|unclear|not sure|unsure|question|what do you mean)\b/)) {
    return "funnyFace"
  }
  
  // Default to smile for friendliness
  return "smile"
}

function selectAnimation(facialExpression) {
  const animationMap = {
    smile: "TalkingOne",
    sad: "Defeated",
    angry: "Angry",
    surprised: "Surprised",
    funnyFace: "ThoughtfulHeadShake",
    default: "Idle",
  }
  return animationMap[facialExpression] || "TalkingOne"
}

// ─────────────────────────────────────────────────────────────
// Generate Practice Response (for practice mode)
// ─────────────────────────────────────────────────────────────

export async function generateAvatarPracticeResponse({
  userMessage,
  conversationHistory,
  situationType = "restaurant",
}) {
  try {
    const template = `
You are a friendly, patient AI assistant helping someone practice a conversation in a ${situationType} situation.

Your role:
- Respond naturally like a real person in that situation
- Keep responses SHORT (1-2 sentences)
- Ask ONE question at a time
- Provide 2-3 suggested replies for the user to choose from
- Match the mood: be cheerful and encouraging for good responses, show concern for questions or confusion, show understanding for frustration
- End the conversation naturally when appropriate

${
  conversationHistory.length > 0
    ? `Conversation so far:\n${conversationHistory
        .slice(-10)
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n")}`
    : ""
}

User said: "${userMessage}"

Respond in this JSON format:
{format_instructions}

IMPORTANT: Select facial expressions that match the emotional context of your response:
- "smile" for positive, encouraging, or friendly responses
- "sad" for sympathetic or concerned responses  
- "surprised" for reactions to unexpected statements
- "funnyFace" for confusion or thoughtful moments
- "default" for neutral statements
`

    const prompt = ChatPromptTemplate.fromMessages([["human", template]])

    const chain = prompt.pipe(model).pipe(parser)

    const result = await chain.invoke({
      format_instructions: parser.getFormatInstructions(),
    })

    // Post-process to ensure proper expressions and animations
    if (result.messages && Array.isArray(result.messages)) {
      result.messages = result.messages.map((msg) => {
        // Analyze sentiment if expression not set properly
        if (!msg.facialExpression || msg.facialExpression === "default") {
          msg.facialExpression = analyzeMessageSentiment(msg.text)
        }
        
        // Ensure animation matches expression
        if (!msg.animation) {
          msg.animation = selectAnimation(msg.facialExpression)
        }
        
        return msg
      })
    }

    console.log(`✅ Avatar practice response generated with expressions`)
    return result
  } catch (error) {
    console.error("❌ OpenAI practice error:", error.message)
    return {
      messages: [
        {
          text: "I'm sorry, could you please repeat that?",
          facialExpression: "funnyFace",
          animation: "ThoughtfulHeadShake",
          suggestedReplies: ["Can you clarify?", "One more time?"],
        },
      ],
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Generate Live Interaction Response
// ─────────────────────────────────────────────────────────────

export async function generateAvatarLiveResponse({
  userMessage,
  conversationContext,
  detectedEmotion = "neutral",
  suggestedTone = "supportive",
}) {
  try {
    const template = `
You are an AI coach observing a real conversation and providing real-time guidance to the speaker.

Context: ${conversationContext}
User's detected emotion: ${detectedEmotion}
Suggested tone: ${suggestedTone}

The user just said: "${userMessage}"

Provide constructive real-time feedback and suggested responses in this JSON format:
{format_instructions}

Keep suggestions brief, actionable, and encouraging. Match your facial expression to the feedback tone:
- "smile" for encouragement or positive feedback
- "sad" for sympathetic feedback
- "surprised" for unexpected insights
- "funnyFace" for suggestions needing thought
`

    const prompt = ChatPromptTemplate.fromMessages([["human", template]])

    const chain = prompt.pipe(model).pipe(parser)

    const result = await chain.invoke({
      format_instructions: parser.getFormatInstructions(),
    })

    // Post-process to ensure proper expressions and animations
    if (result.messages && Array.isArray(result.messages)) {
      result.messages = result.messages.map((msg) => {
        if (!msg.facialExpression || msg.facialExpression === "default") {
          msg.facialExpression = analyzeMessageSentiment(msg.text)
        }
        if (!msg.animation) {
          msg.animation = selectAnimation(msg.facialExpression)
        }
        return msg
      })
    }

    console.log(`✅ Avatar live response generated`)
    return result
  } catch (error) {
    console.error("❌ OpenAI live response error:", error.message)
    return {
      messages: [
        {
          text: "That's a great point!",
          facialExpression: "smile",
          animation: "TalkingOne",
          suggestedReplies: [
            "Tell me more",
            "How does that make you feel?",
          ],
        },
      ],
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Generate Custom Response
// ─────────────────────────────────────────────────────────────

export async function generateAvatarResponse({
  userMessage,
  systemPrompt = "You are Jack, a friendly AI assistant.",
  conversationHistory = [],
}) {
  try {
    const template = `
${systemPrompt}

${
  conversationHistory.length > 0
    ? `Conversation so far:\n${conversationHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n")}`
    : ""
}

User: "${userMessage}"

Respond with JSON format:
{format_instructions}
`

    const prompt = ChatPromptTemplate.fromMessages([["human", template]])

    const chain = prompt.pipe(model).pipe(parser)

    const result = await chain.invoke({
      format_instructions: parser.getFormatInstructions(),
    })

    return result
  } catch (error) {
    console.error("❌ OpenAI response error:", error.message)
    return {
      messages: [
        {
          text: "I'm here to help. What can I do for you?",
          facialExpression: "smile",
          animation: "Idle",
        },
      ],
    }
  }
}

export { parser, messageSchema }
