import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ─── System Prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a compassionate social communication expert helping autistic individuals understand the hidden meaning behind everyday phrases.

When given a phrase or sentence someone said, you MUST respond with ONLY a valid JSON object — no extra text, no markdown, no explanation outside the JSON.

The JSON must follow this exact structure:
{
  "literal": "string — what the words technically mean at face value",
  "social": "string — what the speaker actually means or intends socially",
  "tone": {
    "label": "string — one of: Friendly, Neutral, Sarcastic, Dismissive, Sincere, Polite but Cold, Enthusiastic, Concerned, Uncomfortable, Joking",
    "explanation": "string — why this tone was identified, in simple language"
  },
  "suggestedResponses": [
    {
      "text": "string — an example response the user could say",
      "context": "string — when or why to use this response (e.g. 'if you want to be friendly', 'if you want to end the conversation')"
    }
  ],
  "confidence": "high | medium | low",
  "tip": "string — one short, practical social tip about this type of phrase (max 20 words)"
}

Rules:
- Always provide exactly 2-3 suggestedResponses
- Use simple, clear language — avoid jargon
- Be warm and non-judgmental
- If the phrase is ambiguous, lean toward the most common social interpretation
- confidence = "high" if the meaning is very clear, "medium" if it depends on context, "low" if genuinely ambiguous
- Never invent context the user didn't provide`

// ─── Controller ───────────────────────────────────────────────
export const decodePhrase = async (req, res) => {
  const { phrase, context } = req.body

  // ── Validation ──────────────────────────────────────────────
  if (!phrase || typeof phrase !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Please provide a phrase to decode.',
    })
  }

  const trimmed = phrase.trim()

  if (trimmed.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Phrase is too short. Please enter something someone said to you.',
    })
  }

  if (trimmed.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Phrase is too long. Please keep it under 500 characters.',
    })
  }

  // ── Build user message ──────────────────────────────────────
  const userMessage = context?.trim()
    ? `Phrase: "${trimmed}"\n\nAdditional context: ${context.trim()}`
    : `Phrase: "${trimmed}"`

  // ── Call Claude API ─────────────────────────────────────────
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage },
      ],
    })

    const rawText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    // ── Parse JSON response ─────────────────────────────────
    let decoded
    try {
      // Strip any accidental markdown fences
      const clean = rawText.replace(/```json|```/g, '').trim()
      decoded = JSON.parse(clean)
    } catch (parseErr) {
      console.error('❌ JSON parse error:', parseErr.message)
      console.error('Raw response:', rawText)
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response. Please try again.',
      })
    }

    // ── Validate required fields ────────────────────────────
    const required = ['literal', 'social', 'tone', 'suggestedResponses']
    const missing = required.filter(field => !decoded[field])
    if (missing.length > 0) {
      return res.status(500).json({
        success: false,
        error: 'Incomplete response from AI. Please try again.',
      })
    }

    return res.status(200).json({
      success: true,
      phrase: trimmed,
      decoded,
      usage: {
        inputTokens:  response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    })

  } catch (err) {
    // ── Claude API errors ───────────────────────────────────
    if (err.status === 401) {
      return res.status(500).json({
        success: false,
        error: 'API authentication failed. Please check your API key.',
      })
    }
    if (err.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'AI service is busy. Please try again in a moment.',
      })
    }
    if (err.status === 529) {
      return res.status(503).json({
        success: false,
        error: 'AI service is temporarily overloaded. Please try again soon.',
      })
    }

    // console.error('❌ Claude API error:', err.message)
    return res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again.',
    })
  }
}
