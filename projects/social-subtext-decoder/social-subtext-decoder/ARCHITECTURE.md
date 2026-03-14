# 🧠 AI Social Interpreter — System Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Component Diagram](#component-diagram)
3. [Data Flow](#data-flow)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [AI Processing Pipeline](#ai-processing-pipeline)
7. [Database Schema](#database-schema)
8. [API Specifications](#api-specifications)
9. [Implementation Phases](#implementation-phases)

---

## System Overview

The AI Social Interpreter is a **multimodal real-time conversation analyzer** that processes video, audio, and text simultaneously to interpret social cues.

### Key Features

| Feature | Input | Output | Tech Stack |
|---------|-------|--------|-----------|
| **Facial Emotion Detection** | Video (camera) | 😊😐😠😰 + confidence | TensorFlow.js or Face-api.js |
| **Speech Transcription** | Audio (microphone) | Text | OpenAI Whisper API or Web Speech API |
| **Tone/Sarcasm Detection** | Transcribed text | Tone label + explanation | Claude API (NLP) |
| **Multimodal Fusion** | Emotion + Tone + Text | Combined interpretation | Custom logic |
| **Response Suggestions** | Context + conversation history | 2-3 suggested replies | Claude API |
| **Accessibility** | All outputs | Text + Voice + Visual | TTS + UI components |

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Media Capture   │  │  Real-time UI    │  │ Accessibility│  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────┤  │
│  │ • Video (camera) │  │ • Emotion bars   │  │ • Text export│  │
│  │ • Audio (mic)    │  │ • Waveform       │  │ • TTS audio  │  │
│  │ • Screen capture │  │ • Transcript     │  │ • High con.  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│          ↓                      ↑                       ↑         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WebSocket Client (Real-time bidirectional)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway / WebSocket                       │
│                    (Express + Socket.io)                         │
└─────────────────────────────────────────────────────────────────┘
                               ↓
    ┌──────────────┬──────────────┬──────────────┬──────────────┐
    ↓              ↓              ↓              ↓              ↓
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Emotion    │ │ Speech     │ │ NLP/Tone   │ │ Fusion     │ │ Memory     │
│ Service    │ │ Service    │ │ Service    │ │ Service    │ │ Service    │
├────────────┤ ├────────────┤ ├────────────┤ ├────────────┤ ├────────────┤
│ TensorFlow │ │ Whisper    │ │ Claude API │ │ Logic +    │ │ Supabase   │
│ Face-api   │ │ Web Speech │ │ HuggingFace│ │ Inference  │ │ PostgreSQL │
└────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
    (Edge)         (Server)        (API)      (Custom ML)      (DB)
```

---

## Data Flow

### Live Conversation Mode (Real-Time)

```
User opens camera/mic
    ↓
[Frontend] Captures frame + audio chunk every 500-1000ms
    ↓
[WebSocket] Sends to backend:
    {
      frame: base64 image,
      audioChunk: PCM data,
      timestamp: ISO string
    }
    ↓
[Emotion Service] Analyzes face → { emotion, confidence, landmarks }
[Speech Service] Transcribes audio → { transcript, confidence }
[Parallel processing, ~200-500ms each]
    ↓
[NLP Service] Analyzes transcript + tone → { tone, sarcasm_score, intent }
    ↓
[Fusion Service] Combines emotion + tone + text → multimodal interpretation
    ↓
[Generate Response]
    • Look up context (previous sentences)
    • Generate 2-3 suggested responses
    • Package accessibility outputs (text + voice)
    ↓
[WebSocket emit] Back to frontend:
    {
      emotion: { label, confidence, visuals },
      tone: { label, explanation },
      interpretation: string,
      suggestedResponses: [ ... ],
      accessibility: { voice, textSize }
    }
    ↓
[Frontend] Renders in real-time UI
    • Emotion indicator updates
    • Tone badge changes
    • Transcript scrolls
    • Response suggestions appear
```

### Practice Mode (Simulated Conversation)

```
User selects scenario: "Meet someone new at coffee shop"
    ↓
[Backend] Loads AI avatar profile + scenario data
    ↓
[AI Avatar] Generates opening statement via Claude:
    "Hi! I don't think we've met before. I'm Alex."
    ↓
[Backend] Pre-generates emotion + tone for each avatar response:
    • Emotion: happy (0.85)
    • Tone: friendly
    ↓
[Frontend] Streams response:
    • Text appears with animation
    • Emotion bar shows expected emotion
    • User is prompted to respond
    ↓
User types response → send to backend
    ↓
[Evaluation Module] Analyzes user response:
    • Appropriateness score
    • Tone match (did they catch the friendly tone?)
    • Suggestions for improvement
    ↓
[Feedback] Shows results + next avatar message in conversation loop
```

---

## Frontend Architecture

### Current Structure (to Refactor)

```
frontend/src/
├── components/
│   ├── DecoderInput.jsx (→ refactor)
│   ├── ResultCard.jsx (→ expand)
│   ├── Layout.jsx
│   └── [NEW] MediaCapture.jsx
│       ├── VideoPanel.jsx
│       ├── AudioVisualizer.jsx
│       └── TranscriptViewer.jsx
│       
├── pages/
│   ├── DecoderPage.jsx (→ keep, rename to TextDecoderPage)
│   ├── HistoryPage.jsx (→ keep)
│   ├── [NEW] LiveConversationPage.jsx
│   ├── [NEW] PracticePage.jsx
│   └── [NEW] ReviewPage.jsx
│
├── hooks/
│   ├── useDecode.js (→ keep)
│   ├── useHistory.js (→ keep)
│   ├── useSession.js (→ keep)
│   ├── [NEW] useMediaCapture.js (video + audio streams)
│   ├── [NEW] useWebSocket.js (real-time connection)
│   ├── [NEW] useConversationContext.js (state management)
│   └── [NEW] useAccessibility.js (TTS + visual prefs)
│
├── utils/
│   ├── api.js (→ expand for new endpoints)
│   ├── [NEW] mediaUtils.js (canvas, audio processing)
│   ├── [NEW] emotionUtils.js (emotion visualization)
│   └── [NEW] a11y.js (accessibility helpers)
│
└── [NEW] services/
    ├── webSocketClient.js
    ├── emotionDetector.js (local TensorFlow.js)
    └── speechRecognizer.js (Whisper or Web Speech API)
```

### Real-Time UI Components

```jsx
// LiveConversationMode.jsx
<div>
  <VideoPanel>
    <EmotionOverlay emotion={currentEmotion} />
    <LandmarkVisualization landmarks={faceLandmarks} />
  </VideoPanel>
  
  <AudioVisualizer audioContext={audioContext} />
  
  <TranscriptPanel>
    <SpeakerTranscript speaker="other" text={transcript} />
    <ConfidenceBar value={0.92} />
  </TranscriptPanel>
  
  <InterpretationCard>
    <LiteralMeaning text="..." />
    <SocialMeaning text="..." />
    <ToneExplanation tone={tone} />
    <SuggestedResponses options={responses} />
  </InterpretationCard>
  
  <AccessibilityPanel>
    <TextSizeControl />
    <TextToSpeechButton />
    <HighContrastToggle />
  </AccessibilityPanel>
</div>
```

---

## Backend Architecture

### Current Structure (to Extend)

```
backend/
├── routes/
│   ├── decode.js (→ keep)
│   ├── history.js (→ keep)
│   ├── [NEW] conversation.js
│   ├── [NEW] websocket.js
│   ├── [NEW] practice.js
│   └── [NEW] review.js
│
├── controllers/
│   ├── decodeController.js (→ keep)
│   ├── historyController.js (→ keep)
│   ├── [NEW] conversationController.js
│   └── [NEW] reviewController.js
│
├── services/
│   ├── [NEW] emotionService.js (calls TensorFlow model)
│   ├── [NEW] speechService.js (transcription)
│   ├── [NEW] nplService.js (tone analysis)
│   ├── [NEW] fusionService.js (multimodal)
│   ├── [NEW] responsesService.js (generate suggestions)
│   └── [NEW] avatarService.js (practice mode)
│
├── models/
│   ├── [NEW] Conversation.js (schema)
│   ├── [NEW] ConversationTurn.js
│   └── [NEW] PracticeSession.js
│
├── middleware/
│   ├── validate.js (→ keep)
│   ├── [NEW] authentication.js (optional)
│   └── [NEW] wsMiddleware.js (WebSocket auth)
│
└── server.js (→ upgrade with Socket.io)
```

### Service Architecture

```javascript
// emotionService.js
import tf from '@tensorflow/tfjs'

export async function detectEmotion(imageFrame) {
  // 1. Load pre-trained model (facemesh + emotion classifier)
  // 2. Extract face landmarks
  // 3. Classify emotion (happy, sad, angry, neutral, etc.)
  // 4. Return { emotion, confidence, landmarks }
  return {
    emotion: 'Happy',
    confidence: 0.87,
    landmarks: [...],
    timestamp: Date.now()
  }
}

// speechService.js
export async function transcribeAudio(audioBuffer) {
  // Option A: Use Whisper API (fast, accurate)
  // Option B: Use Web Speech API (real-time on browser)
  // Option C: Use Google Cloud Speech-to-Text
  return {
    transcript: "That's an interesting idea",
    confidence: 0.94,
    language: 'en'
  }
}

// nplService.js
export async function analyzeTone(transcript) {
  // Use Claude API to:
  // 1. Identify tone/emotion in speech
  // 2. Detect sarcasm
  // 3. Identify intent
  return {
    tone: 'Sarcastic',
    sarcasmScore: 0.78,
    intent: 'politely dismissive',
    explanation: "The person is..."
  }
}

// fusionService.js
export async function fuse(emotion, tone, transcript, context) {
  // Combine signals:
  // - Does facial emotion match vocal tone?
  // - Is there contradiction (eg. happy face but sarcastic words)?
  // - Generate comprehensive interpretation
  return {
    interpretation: "...",
    confidence: 0.82,
    signals: { emotion, tone, text },
    suggestedResponses: [...]
  }
}
```

---

## AI Processing Pipeline

### Model Choices

| Task | Model | Provider | Latency | Cost | Notes |
|------|-------|----------|---------|------|-------|
| Facial Emotion | FER (Facial Expression Recognition) | TensorFlow.js + trained model | 50-150ms | Free (local) | Run on browser for privacy |
| Face Detection | MediaPipe Face Detection | Google (JS lib) | 100-200ms | Free | Better than face-api.js |
| Speech-to-Text | Whisper API | OpenAI | 500-2000ms | $0.02/min | Most accurate |
| Tone Detection | Claude API | Anthropic | 1-3s | $0.01 per 1K input tokens | Already using |
| Response Gen | Claude API | Anthropic | 1-3s | $0.01 per 1K tokens | Existing prompt fine-tuning |

### Processing Pipeline Code

```javascript
// conversationService.js
export async function processConversationFrame({
  videoFrame,
  audioChunk,
  transcript,
  context,
  sessionId
}) {
  const startTime = Date.now()

  // 1. Parallel: Emotion detection + Transcription
  const [emotionResult, transcriptionResult] = await Promise.all([
    emotionService.detectEmotion(videoFrame),
    transcriptionResult ? Promise.resolve(transcriptionResult) : 
      speechService.transcribeAudio(audioChunk)
  ])

  // 2. Tone analysis on accumulated transcript
  const toneResult = await nplService.analyzeTone(
    transcript || transcriptionResult.transcript
  )

  // 3. Multimodal fusion
  const interpretation = await fusionService.fuse(
    emotionResult,
    toneResult,
    transcript || transcriptionResult.transcript,
    context
  )

  // 4. Generate response suggestions
  const responses = await responsesService.generate(
    interpretation,
    context
  )

  // 5. Save to database (async in background)
  saveConversationTurn({
    sessionId,
    timestamp: Date.now(),
    input: { emotion: emotionResult, tone: toneResult },
    output: { interpretation, responses }
  }).catch(err => console.error('DB save failed:', err))

  const processingTime = Date.now() - startTime
  
  return {
    emotion: emotionResult,
    tone: toneResult,
    interpretation,
    responses,
    processingTime,
    confidence: Math.min(emotionResult.confidence, toneResult.confidence)
  }
}
```

---

## Database Schema

### Current (to Expand)

```sql
-- Keep existing
CREATE TABLE history (...)

-- NEW: Conversations (session level)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  mode TEXT NOT NULL, -- 'live', 'practice', 'text'
  title TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB, -- { participants, scenario, duration }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- NEW: Conversation turns (each frame/message)
CREATE TABLE conversation_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sequence INT,
  speaker TEXT, -- 'user' or 'other'
  
  -- Input signals
  transcript TEXT,
  emotion_label TEXT,
  emotion_confidence FLOAT,
  tone_label TEXT,
  sarcasm_score FLOAT,
  
  -- Output interpretation
  interpretation TEXT,
  
  -- Accessibility
  tts_audio_url TEXT,
  
  timestamp TIMESTAMPTZ DEFAULT now(),
  
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- NEW: Response suggestions
CREATE TABLE suggested_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id UUID REFERENCES conversation_turns(id),
  text TEXT NOT NULL,
  context TEXT,
  confidence FLOAT,
  user_selected BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- NEW: Practice sessions
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  scenario TEXT NOT NULL, -- e.g., "meeting_new_person"
  ai_avatar TEXT, -- avatar personality/name
  user_responses TEXT[], -- array of responses
  performance_score FLOAT, -- 0-100
  feedback TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_turns_conversation_id ON conversation_turns(conversation_id);
CREATE INDEX idx_responses_turn_id ON suggested_responses(turn_id);
CREATE INDEX idx_practice_session_id ON practice_sessions(session_id);
```

---

## API Specifications

### WebSocket Events (Real-Time)

```javascript
// Client → Server
socket.emit('conversation:start', { mode: 'live' })
socket.emit('frame:send', { 
  videoFrame: base64,
  audioChunk: PCMdata,
  timestamp: ISO
})
socket.emit('transcript:update', { text, partial: false })
socket.emit('conversation:end', {})

// Server → Client
socket.on('frame:processed', {
  emotion: { label, confidence },
  tone: { label },
  interpretation: string,
  suggestedResponses: array,
  latency: ms
})
socket.on('error', { message })
socket.on('conversation:summary', { stats })
```

### REST Endpoints

```
POST   /api/conversation/start       → init session
POST   /api/conversation/:id/frame   → process single frame
POST   /api/conversation/:id/end     → finalize
GET    /api/conversation/:id         → retrieve full transcript
GET    /api/conversation/:id/review  → replay with timeline

POST   /api/practice/start           → init practice mode
POST   /api/practice/:id/response    → submit user response
GET    /api/practice/:id/feedback    → get evaluation

DELETE /api/conversation/:id         → cleanup
GET    /api/accessibility/prefs      → get user preferences
POST   /api/accessibility/prefs      → update TTS settings
```

---

## Implementation Phases

### Phase 1: Real-Time Video + Audio Capture (2 weeks)
**Goal**: Get camera/mic streaming to backend with WebSocket

- [x] WebSocket setup with Socket.io
- [ ] Frontend media capture hooks (`useMediaCapture`)
- [ ] Video frame extraction (every 500ms)
- [ ] Audio buffer capture (PCM chunks)
- [ ] Frame transmission validation
- [ ] Dummy emotion/speech endpoints

### Phase 2: On-Device Facial Emotion Detection (3 weeks)
**Goal**: Real-time emotion from video in browser

- [ ] TensorFlow.js setup
- [ ] MediaPipe Face Detection integration
- [ ] Load pre-trained emotion model (or fine-tune on FER+ dataset)
- [ ] Benchmark latency (<150ms per frame)
- [ ] Draw landmarks + emotion overlays
- [ ] Accessibility: emotion text descriptions

### Phase 3: Speech Recognition (2 weeks)
**Goal**: Convert audio to transcript in real-time

- [ ] Integrate Whisper API (OpenAI) backend endpoint
- [ ] OR: Web Speech API (browser, free but less accurate)
- [ ] Audio chunking strategy (accumulate 1-2 seconds)
- [ ] Confidence scoring
- [ ] Partial vs. final transcript handling
- [ ] Cost optimization (batch small sequences)

### Phase 4: Tone + Sarcasm Detection (2 weeks)
**Goal**: Claude-driven tone analysis on transcripts

- [ ] Fine-tune system prompt for tone detection
- [ ] Add sarcasm scoring
- [ ] Cache repeated phrases
- [ ] Low-latency optimization
- [ ] Cost tracking per request

### Phase 5: Multimodal Fusion (3 weeks)
**Goal**: Combine all signals into unified interpretation

- [ ] Design fusion logic (weighted scoring)
- [ ] Handle emotion-tone conflicts
- [ ] Generate combined explanations
- [ ] A/B test interpretation quality
- [ ] Add confidence scores

### Phase 6: Practice Mode (3 weeks)
**Goal**: Simulated conversations with AI avatars

- [ ] Create avatar profiles + scenarios
- [ ] Implement conversation state machine
- [ ] Response evaluation logic
- [ ] Feedback generation
- [ ] Persistence to database

### Phase 7: Review + Accessibility (2 weeks)
**Goal**: Playback and accessibility features

- [ ] Conversation replay with timeline
- [ ] Export to transcript (PDF/TXT)
- [ ] Text-to-speech for all outputs
- [ ] High contrast mode
- [ ] Font size controls
- [ ] Screen reader optimization

### Phase 8: Database + Persistence (1 week)
**Goal**: Full history and analytics

- [ ] Supabase schema creation
- [ ] Conversation storage
- [ ] Turn-level logging
- [ ] Practice session tracking
- [ ] Cleanup old data (30-day archival)

---

## Technology Checklist

### Frontend
- [x] React 18 (existing)
- [x] Vite (existing)
- [x] Tailwind CSS (existing)
- [x] Framer Motion (existing)
- [ ] Socket.io client (`npm install socket.io-client`)
- [ ] TensorFlow.js (`npm install @tensorflow/tfjs`)
- [ ] MediaPipe (`npm install @mediapipe/tasks-vision`)
- [ ] Web Audio API (native)
- [ ] Web Speech API (native, fallback)

### Backend
- [x] Express (existing)
- [ ] Socket.io (`npm install socket.io`)
- [ ] Anthropic SDK (existing)
- [ ] Whisper API integration (API key)
- [ ] TensorFlow Serving OR TF.js Node (for GPU models)
- [ ] Bull (job queue for heavy processing)

### Infrastructure
- [x] Railway (backend hosting) (existing)
- [x] Vercel (frontend) (existing)
- [x] Supabase (database) (existing)
- [ ] Redis (session cache)
- [ ] OpenAI API key (Whisper)
- [ ] Potentially: GPU instances for model inference

---

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Frame processing latency | <500ms | User perceives real-time (~2 FPS) |
| Speech transcription | <2s | Acceptable delay while user talks |
| Emotion detection | <150ms | Desktop GPU, light model |
| Total round-trip | <3s | Balance accuracy vs. responsiveness |
| WebSocket latency | <50ms | Network only |
| UI render time | <16ms | 60 FPS smooth animations |

---

## Privacy & Security Considerations

1. **Video/Audio**: 
   - Option A: Process locally in browser (TensorFlow.js)
   - Option B: Send encrypted to backend, delete after processing
   - Never store raw video/audio permanently

2. **Transcripts**: 
   - Store only text (not audio source)
   - Implement 30-day auto-deletion
   - User can manually delete

3. **PII Detection**: 
   - Scan transcripts for names, emails, phone numbers
   - Redact before storage

4. **Model Weights**: 
   - Use open-source models (no proprietary models sent to cloud)
   - Cache models locally when possible

---

## Next Steps

1. ✅ **Approve this architecture**
2. **Phase 1 kickoff**: WebSocket + media capture setup
3. **Create task board**: Break into sprint-sized chunks
4. **Set up monitoring**: Track performance metrics
5. **Plan cost analysis**: Estimate Whisper + Claude API spend
