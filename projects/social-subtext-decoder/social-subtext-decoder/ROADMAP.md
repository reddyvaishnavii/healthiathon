# 🗺️ Implementation Roadmap

## Overview

This is the step-by-step breakdown of how to build the AI Social Interpreter from your existing text-based decoder app to a full real-time multimodal system.

---

## Sprint Structure

- **Sprint Duration**: 2 weeks
- **Phases**: 8 phases = ~4 months to MVP
- **Team Size**: Assumes 1-2 developers
- **Deployment**: Continuous to Railway + Vercel

---

## Phase 1: WebSocket & Real-Time Foundation (Sprint 1-2)

**Objective**: Establish real-time communication between frontend and backend

### Tasks

#### Backend (Sprint 1)
- [ ] **Day 1-2**: Install Socket.io and create WebSocket server
  ```bash
  npm install socket.io
  ```
  - [ ] Add Socket.io to Express server
  - [ ] Handle connection/disconnection events
  - [ ] Create namespaces: `/conversation`, `/practice`
  
- [ ] **Day 3-4**: Implement frame receiving endpoint
  - [ ] Create route `/api/conversation/start` → init session
  - [ ] Create WebSocket handler for `frame:send` events
  - [ ] Validate frame structure (base64 + audio + timestamp)
  - [ ] Add rate limiting (max 2 FPS = 30 frames/min)
  
- [ ] **Day 5-6**: Implement dummy processors
  - [ ] Create emotionService with mock response `{ emotion: 'Happy', confidence: 0.8 }`
  - [ ] Create speechService with mock response `{ transcript: 'test' }`
  - [ ] Create nlpService with mock tone detection
  
- [ ] **Day 7**:
  - [ ] Add logging / monitoring
  - [ ] Error handling for malformed frames
  - [ ] Test with Postman / WebSocket client

#### Frontend (Sprint 1-2)
- [ ] **Day 1-2**: Create media capture hook (`useMediaCapture.js`)
  ```javascript
  // hooks/useMediaCapture.js
  export function useMediaCapture() {
    const [videoStream, setVideoStream] = useState(null)
    const [audioContext, setAudioContext] = useState(null)
    
    const startCapture = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: true
      })
      // Extract video + audio tracks
      // Start frame/audio chunk extraction
    }
    
    return { videoStream, audioContext, startCapture, stopCapture }
  }
  ```
  
- [ ] **Day 3-4**: Set up Socket.io client
  - [ ] `npm install socket.io-client`
  - [ ] Create `services/webSocketClient.js`
  - [ ] Connect to backend on app load
  - [ ] Handle authentication (send session ID)
  
- [ ] **Day 5**: Implement frame extraction
  - [ ] Canvas: capture video frames every 500ms
  - [ ] Audio: create ScriptProcessorNode to capture PCM chunks
  - [ ] Convert to base64 / blob
  
- [ ] **Day 6-7**: Create initial UI
  - [ ] New page: `pages/LiveConversationPage.jsx`
  - [ ] `components/VideoPanel.jsx` (show camera rectangle)
  - [ ] `components/TranscriptPanel.jsx` (display transcript)
  - [ ] Simple "Start / Stop" buttons
  
- [ ] **Day 8**: Integration test
  - [ ] Start backend locally
  - [ ] Open app, click "Start Live Conversation"
  - [ ] Verify frames being sent in browser console
  - [ ] Verify backend receiving frames
  - [ ] Verify mock responses coming back

#### Deliverables
- ✅ WebSocket connection working
- ✅ Live counter showing frames processed
- ✅ Console logs for debugging
- ✅ Simple UI for starting capture
- ✅ No AI models yet (just mocks)

#### Testing
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Browser: Open http://localhost:5173
# Click "Start Live Conversation" → should see frame counter incrementing
# Check Console → should see WebSocket messages
```

---

## Phase 2: Facial Emotion Detection (Sprint 3-5)

**Objective**: Real-time emotion recognition from video

### Tasks

#### Research (Day 1)
- [ ] Compare options:
  - **face-api.js**: Simpler, but older
  - **TensorFlow.js + FaceDetector**: More control, GPU-accelerated
  - **MediaPipe Face Detection**: Google, very fast & accurate
  
- [ ] Decision: Use **MediaPipe + emotion classifier** (recommended)

#### Frontend Implementation (Sprint 3)
- [ ] **Day 1-2**: Install MediaPipe
  ```bash
  npm install @mediapipe/tasks-vision
  ```
  - [ ] Load face detection tasks
  - [ ] Test on sample video frames
  - [ ] Verify latency (<150ms per frame)
  
- [ ] **Day 3-4**: Download emotion model
  - [ ] TensorFlow.js pre-trained emotion model (or FER+ fine-tuned)
  - [ ] Example: `https://storage.googleapis.com/tfjs-models/saved_model/...`
  - [ ] Load model in browser (cache locally)
  
- [ ] **Day 5**: Create emotion detection service
  ```javascript
  // services/emotionDetector.js
  export class EmotionDetector {
    async initialize() {
      this.faceDetector = await FaceDetector.createFromOptions(
        vision, { delegate: 'gpu' }
      )
      this.emotionModel = await tf.loadLayersModel('model_url')
    }
    
    async detect(videoFrame) {
      const faces = await this.faceDetector.detectForVideo(videoFrame, timestamp)
      const emotions = faces.map(face => {
        // Extract face region
        // Classify emotion
        return { emotion, confidence, landmarks }
      })
      return emotions
    }
  }
  ```
  
- [ ] **Day 6-7**: Integrate into video capture
  - [ ] Modify `useMediaCapture` to run detector every frame
  - [ ] Send emotion data along with frame to backend
  - [ ] Handle GPU initialization (warm up on first frame)
  
- [ ] **Day 8**: UI visualization
  - [ ] Create `components/EmotionOverlay.jsx`
  - [ ] Draw emotion label + confidence on video
  - [ ] Draw face landmarks (optional)
  - [ ] Update emotion bar chart in ResultCard

#### Backend Support (Sprint 3)
- [ ] **Day 1-2**: Create emotion service endpoint
  - [ ] `/api/emotion/detect` (for optional backend fallback)
  - [ ] Receives frame, returns emotion
  - [ ] Can use TensorFlow Serving if needed (optional)
  
- [ ] **Day 3**: Store emotion per turn in DB
  - [ ] Save `emotion_label` + `confidence` to `conversation_turns` table

#### Testing (Sprint 3)
- [ ] Video capture → emotion detection → UI update
- [ ] Benchmark: 2-5 FPS sustained processing
- [ ] Test with different face angles + lighting
- [ ] Test with no face detected → graceful fallback

#### Deliverables
- ✅ Real-time emotion labels (Happy, Sad, Angry, Neutral, etc.)
- ✅ Confidence scores displayed
- ✅ Face landmarks visualized on video
- ✅ <200ms latency per frame
- ✅ Mobile-friendly sizing

---

## Phase 3: Speech-to-Text Transcription (Sprint 6-7)

**Objective**: Convert microphone audio to text in real-time

### Decision

**Option A: Web Speech API (Browser)**
- Pros: Free, no API calls, works offline
- Cons: Less accurate, less reliable, only works in Chrome
- Use for: Fallback, MVP

**Option B: Whisper API (OpenAI)**
- Pros: Highly accurate, supports many languages
- Cons: API cost (~$0.02 per minute), ~2-3s latency per batch
- Use for: Production MVP

**Recommendation**: Use **Web Speech API** for real-time draft, **Whisper API** for final transcripts

### Tasks

#### Frontend (Sprint 6)
- [ ] **Day 1-2**: Set up Web Speech API recognizer
  ```javascript
  // services/speechRecognizer.js
  export class SpeechRecognizer {
    constructor() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = true
      this.recognition.interimResults = true
    }
    
    start(onResult, onError) {
      this.recognition.onresult = (event) => {
        let final = ''
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript
          } else {
            interim += event.results[i][0].transcript
          }
        }
        onResult({ final, interim })
      }
      this.recognition.start()
    }
  }
  ```
  
- [ ] **Day 3**: Integrate into media capture
  - [ ] Modify `useMediaCapture` to add speech recognizer
  - [ ] Send transcript chunks via WebSocket
  - [ ] Mark as `final: true` when utterance complete
  
- [ ] **Day 4**: Display transcript UI
  - [ ] `components/TranscriptPanel.jsx`
  - [ ] Show current speaker transcript
  - [ ] Show interim (grayed out) + final (bold)
  - [ ] Scrolling history

#### Backend (Sprint 6-7)
- [ ] **Day 1-2**: Create Whisper API integration
  ```bash
  # Get OpenAI API key from https://platform.openai.com
  # Add to .env: OPENAI_API_KEY=sk-...
  npm install openai
  ```
  
  ```javascript
  // services/speechService.js
  import OpenAI from 'openai'
  
  export async function transcribeAudio(audioBuffer) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioBuffer,
      language: 'en'
    })
    return { transcript: response.text, confidence: 0.95 }
  }
  ```
  
- [ ] **Day 3**: Queue Whisper requests
  - [ ] Batch audio chunks (accumulate 1-2 seconds)
  - [ ] Send to Whisper API asynchronously
  - [ ] Send results back via WebSocket
  
- [ ] **Day 4-5**: Cost optimization
  - [ ] Cache repeated phrases
  - [ ] Skip silent audio
  - [ ] Reduce sample rate to 16kHz
  - [ ] Batch requests to reduce API calls
  
- [ ] **Day 6**: Store transcripts
  - [ ] Save to `conversation_turns.transcript`
  - [ ] Record confidence + language

#### Testing
- [ ] Speak phrases → see transcript appear in UI
- [ ] Web Speech API latency: <500ms
- [ ] Whisper API batch latency: <2s
- [ ] Test with background noise
- [ ] Test with different accents

#### Deliverables
- ✅ Real-time transcript display
- ✅ Final vs. interim text distinction
- ✅ Whisper API integration working
- ✅ Cost tracking (log API calls)
- ✅ Fallback to Web Speech if no API key

---

## Phase 4: Tone & Sarcasm Detection (Sprint 8-9)

**Objective**: Analyze tone, sarcasm, and intent from transcripts using Claude

### Tasks

#### Backend (Sprint 8)
- [ ] **Day 1-2**: Create NLP service
  ```javascript
  // services/nlpService.js
  export async function analyzeTone(transcript, context = '') {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are analyzing the tone and meaning of a phrase...`,
      messages: [{
        role: 'user',
        content: `Phrase: "${transcript}"\n\nContext: ${context}`
      }]
    })
    
    // Parse response → { tone, sarcasm_score, intent }
    return parseToneResponse(response.content[0].text)
  }
  ```
  
- [ ] **Day 3-5**: Enhance Claude prompt
  - [ ] Refine system prompt for sarcasm detection
  - [ ] Add confidence scoring
  - [ ] Test with many examples
  - [ ] A/B test variations
  
- [ ] **Day 6-7**: Integrate into WebSocket
  - [ ] Analyze transcript as it arrives
  - [ ] Send tone update via WebSocket
  - [ ] Cache responses for repeated phrases
  
- [ ] **Day 8**: Save tone data
  - [ ] Store `tone_label` + `sarcasm_score` to DB

#### Frontend (Sprint 8-9)
- [ ] **Day 1-2**: Display tone badge
  - [ ] Show tone label (Sarcastic, Sincere, etc.)
  - [ ] Color coding per tone
  - [ ] Update in real-time
  
- [ ] **Day 3**: Visualize sarcasm score
  - [ ] Slider/gauge showing 0-100% sarcasm likelihood
  - [ ] Warning indicator if high sarcasm detected
  
- [ ] **Day 4-5**: Test & iterate
  - [ ] Collect examples of sarcasm/irony
  - [ ] Verify detection accuracy
  - [ ] Refine prompts based on failures

#### Testing
- [ ] Test with clearly sarcastic phrases
- [ ] Test with sincere phrases
- [ ] Compare with human evaluation
- [ ] Measure Claude API cost per request

#### Deliverables
- ✅ Tone classification (5+ categories)
- ✅ Sarcasm confidence score
- ✅ UI displays tone in real-time
- ✅ Caching working to save API calls

---

## Phase 5: Multimodal Fusion (Sprint 10-12)

**Objective**: Combine emotion + tone + text for unified interpretation

### Tasks

#### Fusion Service (Sprint 10)
- [ ] **Day 1-3**: Design fusion logic
  ```javascript
  // services/fusionService.js
  export async function fuse(emotion, tone, transcript, context) {
    // 1. Check consistency
    const emotionToneMatch = checkMatch(emotion.label, tone.label)
    
    // 2. Identify conflicts
    // e.g., happy face + sarcastic tone → likely sarcasm
    const conflicts = identifyConflicts(emotion, tone)
    
    // 3. Generate unified interpretation via Claude
    const interpretation = await generateInterpretation({
      emotion, tone, transcript, conflicts, context
    })
    
    // 4. Score confidence
    const confidence = calculateConfidence(
      emotion.confidence,
      tone.confidence,
      conflicts
    )
    
    return { interpretation, confidence, signals: { emotion, tone, text: transcript } }
  }
  ```
  
- [ ] **Day 4-5**: Enhance Claude prompt for fusion
  - [ ] Add system prompt instructions
  - [ ] Test with diverse scenarios
  - [ ] Handle contradictions gracefully
  
- [ ] **Day 6-7**: Optimize latency
  - [ ] Cache fusion results
  - [ ] Parallelize emotion + tone detection
  - [ ] Target: complete fusion in <3s
  
- [ ] **Day 8**: Store fusion data
  - [ ] Save to DB: interpretation + confidence

#### Response Generation (Sprint 10)
- [ ] **Day 1-2**: Enhance response suggestions
  - [ ] Modify existing prompt (already using Claude)
  - [ ] Add emotion + tone context to suggestions
  - [ ] Generate 2-3 varied responses
  
- [ ] **Day 3-4**: Rank by appropriateness
  - [ ] Score each response for politeness, clarity
  - [ ] Display top 2-3
  
- [ ] **Day 5-6**: Accessibility
  - [ ] Generate audio for responses (TTS)
  - [ ] Text alternatives

#### Frontend (Sprint 11-12)
- [ ] **Day 1-2**: Create comprehensive result card
  - [ ] Show all 4 signals (emotion, tone, transcript, suggestions)
  - [ ] Visual hierarchy
  - [ ] Animations for updates
  
- [ ] **Day 3-4**: Add confidence indicators
  - [ ] Show confidence for each signal
  - [ ] Overall confidence bar
  - [ ] Explanation if low confidence
  
- [ ] **Day 5-6**: Test UX flow
  - [ ] Have users record conversations
  - [ ] Get feedback on clarity
  - [ ] Iterate on UI

#### Testing (Sprint 11-12)
- [ ] End-to-end: Video + audio → emotion + tone + fusion
- [ ] Benchmark: <3s round-trip latency
- [ ] User testing: Is interpretation accurate?
- [ ] Measure API costs (Claude + Whisper)

#### Deliverables
- ✅ Full multimodal interpretation pipeline
- ✅ Emotion + tone + text displayed together
- ✅ Response suggestions contextual to all signals
- ✅ <3s latency for full processing
- ✅ Cost breakdown per request

---

## Phase 6: Practice Mode & AI Avatars (Sprint 13-16)

**Objective**: Allow users to practice conversations with simulated AI avatars

### Tasks

#### Backend (Sprint 13-14)
- [ ] **Day 1-2**: Design avatar system
  ```javascript
  // avatarProfiles.js
  const AVATARS = {
    alex: {
      name: 'Alex',
      personality: 'friendly, casual',
      scenarios: ['meeting_new_person', 'small_talk']
    },
    boss: {
      name: 'Manager',
      personality: 'professional, task-focused',
      scenarios: ['meeting_with_boss', 'job_interview']
    },
    // ... more avatars
  }
  ```
  
- [ ] **Day 3-4**: Implement conversation state machine
  - [ ] `/api/practice/start` → load avatar + scenario
  - [ ] Serve initial avatar message
  - [ ] Accept user response
  - [ ] Continue conversation loop
  
- [ ] **Day 5-6**: Generate avatar responses
  - [ ] Use Claude with avatar persona prompt
  - [ ] Pre-generate emotion + tone for each response
  - [ ] Store conversation flow
  
- [ ] **Day 7-8**: Implement evaluation logic
  - [ ] Score user's response:
    - Did they understand the tone?
    - Is their response appropriate?
    - Did they use good social cues?
  - [ ] Generate feedback suggestions

#### Frontend (Sprint 14-15)
- [ ] **Day 1-2**: Create practice page
  - [ ] `pages/PracticePage.jsx`
  - [ ] Select scenario / avatar
  - [ ] Chat-like UI
  
- [ ] **Day 3-4**: Display avatar reactions
  - [ ] Show avatar message with emotion bar
  - [ ] Allow user to type response
  - [ ] Send to backend for evaluation
  
- [ ] **Day 5-6**: Show feedback
  - [ ] Display score / feedback
  - [ ] Explain what they did well
  - [ ] Suggest improvements
  
- [ ] **Day 7-8**: Persistence
  - [ ] Save practice session results
  - [ ] Show progress over time

#### Database (Sprint 15)
- [ ] Create `practice_sessions` table
- [ ] Store user responses + scores
- [ ] Track improvement metrics

#### Testing (Sprint 16)
- [ ] Practice conversation with each avatar
- [ ] Verify feedback is helpful
- [ ] Test edge cases (off-topic responses, etc.)

#### Deliverables
- ✅ 2-3 avatar profiles
- ✅ 3-4 practice scenarios (e.g., "meet someone new", "job interview")
- ✅ Conversation evaluation scoring
- ✅ Feedback generation
- ✅ Practice history saved

---

## Phase 7: Conversation Review & Playback (Sprint 17-18)

**Objective**: Replay and analyze past conversations

### Tasks

#### Backend (Sprint 17)
- [ ] **Day 1-3**: Implement conversation replay API
  - [ ] `/api/conversation/:id/frames` → return all frames with processed data
  - [ ] Include emotion timeline
  - [ ] Include transcript + tone per sentence
  
- [ ] **Day 4-5**: Generate conversation summary
  - [ ] Identify emotional arc
  - [ ] Highlight moments of confusion / sarcasm
  - [ ] Generate key takeaways
  
- [ ] **Day 6-7**: Export functionality
  - [ ] `/api/conversation/:id/export` → PDF + transcript
  - [ ] Include timestamps + emotions

#### Frontend (Sprint 17-18)
- [ ] **Day 1-2**: Create review page
  - [ ] `pages/ReviewPage.jsx`
  - [ ] Timeline of conversation
  - [ ] Emotion chart over time
  
- [ ] **Day 3-4**: Implement playback controls
  - [ ] Play / pause / seek
  - [ ] Speed controls
  - [ ] Show transcript with timestamps
  
- [ ] **Day 5-6**: Highlight interesting moments
  - [ ] Sarcasm detected → highlight
  - [ ] Emotion spike → highlight
  - [ ] Sentence hover → show tone
  
- [ ] **Day 7-8**: Export UI
  - [ ] Download PDF button
  - [ ] Copy transcript button

#### Testing
- [ ] Replay recorded conversation
- [ ] Verify timestamps accurate
- [ ] Test PDF export
- [ ] Test on different devices

#### Deliverables
- ✅ Conversation replay with playback controls
- ✅ Emotion timeline visualization
- ✅ Transcript with tone labels
- ✅ PDF export with summary
- ✅ Timestamp navigation

---

## Phase 8: Accessibility & Polish (Sprint 19-20)

**Objective**: Ensure app is accessible for diverse users

### Tasks

#### Accessibility Features (Sprint 19)
- [ ] **Day 1-2**: Text-to-Speech for all outputs
  - [ ] Interpretation card → read aloud
  - [ ] Suggestions → read aloud
  - [ ] Playback speed controls
  - [ ] Support multiple voices
  
- [ ] **Day 3-4**: Visual customization
  - [ ] Font size controls
  - [ ] High contrast mode
  - [ ] Dyslexia-friendly fonts (option)
  - [ ] Color blind mode
  
- [ ] **Day 5-6**: Screen reader optimization
  - [ ] Proper ARIA labels
  - [ ] Semantic HTML
  - [ ] Test with NVDA / JAWS
  
- [ ] **Day 7**: Keyboard navigation
  - [ ] Tab through all controls
  - [ ] Enter to activate
  - [ ] Escape to close modals

#### Polish (Sprint 20)
- [ ] **Day 1-2**: Performance optimization
  - [ ] Lazy load models
  - [ ] Code splitting
  - [ ] Image optimization
  - [ ] Target: <3s Lighthouse score
  
- [ ] **Day 3-4**: Bug fixes & UX improvements
  - [ ] Fix edge cases found in testing
  - [ ] Smooth animations
  - [ ] Better error messages
  
- [ ] **Day 5-6**: Documentation
  - [ ] User guide / tutorial
  - [ ] Privacy policy
  - [ ] Accessibility statement
  
- [ ] **Day 7-8**: Deploy to production
  - [ ] Final testing
  - [ ] Production deployment
  - [ ] Monitor errors

#### Testing
- [ ] Manual accessibility audit
- [ ] Lighthouse scores >90
- [ ] Screen reader testing
- [ ] Keyboard-only navigation

#### Deliverables
- ✅ Full TTS support
- ✅ Customizable UI (font size, contrast, etc.)
- ✅ Keyboard navigation
- ✅ Screen reader ready
- ✅ Performance optimized
- ✅ Full documentation

---

## Cost Estimation

### API Costs (Monthly, AWS region)

| Service | Usage | Cost | Notes |
|---------|-------|------|-------|
| **Claude API** | 100 users × 10 conversations × 10 turns × 200 tokens | ~$45/month | Average 200 tokens per interpretation |
| **Whisper API** | 100 users × 10 min average per day | ~$300/month | $0.02 per minute |
| **Total API** | -- | ~$345/month | Scales linearly with users |

### Infrastructure Costs (Free tier → Production)

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Vercel** | 100 GB bandwidth | Pay-as-you-go (~$50/month if heavy) |
| **Railway** | 100 hours/month | $5-50/month as needed |
| **Supabase** | 500 MB storage, 2GB transfer | $25/month (production) |
| **Total** | Free while <100 users | ~$100-150/month |

### Total Estimated Monthly Cost (at 100 users)
- API: $345
- Infrastructure: $100
- **Total: ~$445/month (~$4.45 per user)**

### Reduce Costs
1. Cache common phrases
2. Batch Whisper requests
3. Use Web Speech API as fallback (free)
4. Archive old conversations (Supabase cleanup)
5. Optimize prompt tokens (shorter system prompts)

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|-----------|
| **Emotion model accuracy low** | Start with simple model (happy/sad/angry), expand gradually |
| **Whisper latency too high** | Fallback to Web Speech API; batch requests over 2s window |
| **Claude API cost too high** | Implement aggressive caching, reduce token usage, fallback to simpler heuristics |
| **Facial detection fails without face** | Show friendly message "Face not detected", continue with audio only |
| **Mobile browser doesn't support APIs** | Test on iOS Safari, Android Chrome; provide warning if unsupported |

### Business Risks

| Risk | Mitigation |
|------|-----------|
| **User privacy concerns** | Clearly state: no video stored, no audio stored, only text cached for 24h |
| **Biased emotions toward certain faces** | Test with diverse face images, use unbiased models, add disclaimer |
| **Overwhelming users with data** | Simple, clean UI; hide advanced options behind "Advanced" toggle |

---

## Success Metrics

### Phase 1 Completion Criteria
- [x] WebSocket connection stable
- [x] Frames transmitted consistently
- [x] <100ms round-trip latency

### Phase 2-5 Completion Criteria
- [x] Emotion detection: >85% accuracy on test set
- [x] Transcript: >90% accuracy
- [x] Tone detection: >80% accuracy on sarcasm
- [x] End-to-end latency: <3s

### Phase 6-8 Completion Criteria
- [x] Practice mode: 3+ scenarios, 2+ avatars
- [x] Review: timeline playback working
- [x] Accessibility: WCAG 2.1 AA compliant
- [x] No critical bugs for 1 week

### User Feedback Metrics
- Survey: "I understand the AI's interpretation" → target ≥80%
- Usage: Average session duration → target ≥5 min
- Retention: Week 2 active users → target ≥40%

---

## Dependencies & Blockers

### Must-Have Before Starting
- ✅ Anthropic API key (Claude)
- [ ] OpenAI API key (Whisper)
- [ ] Railway account (backend hosting)
- [ ] Vercel account (frontend hosting)
- [ ] Supabase account (database)

### Optional (Can Add Later)
- [ ] Sentry (error tracking)
- [ ] Hotjar (session replay)
- [ ] Analytics (user behavior)

### Potential Blockers
- **Browser compatibility**: Older browsers may not support WebRTC / Web Audio API
- **CORS issues with media**: Ensure proper origin headers set
- **GPU availability**: TensorFlow.js needs GPU for real-time performance
- **API rate limits**: Implement backoff for Claude / Whisper

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors
- [ ] Lighthouse score >90
- [ ] Security audit passed
- [ ] Privacy policy updated
- [ ] Feature flags for gradual rollout

### Deployment Day
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Verify health checks
- [ ] Monitor error rates (first 1 hour)
- [ ] Test critical user flows

### Post-Deployment
- [ ] Set up Sentry error tracking
- [ ] Configure log aggregation
- [ ] Alert on API costs spike
- [ ] Daily standup for 1 week

---

## Next Steps (Now)

1. ✅ **Review this architecture document** with team
2. ✅ **Approve tech stack choices** (Socket.io, MediaPipe, Whisper, Claude)
3. ⏭️ **Create GitHub issues** for Phase 1 tasks
4. ⏭️ **Set up project board** (Kanban: To Do → In Progress → Review → Done)
5. ⏭️ **Allocate developers** to phases
6. ⏭️ **Schedule sprint kickoff** (Sprint 1 starts Monday)

---

**Estimated Timeline to MVP**: 20 weeks (4.5 months) with 1-2 developers
**Target Launch Date**: [4.5 months from now]
