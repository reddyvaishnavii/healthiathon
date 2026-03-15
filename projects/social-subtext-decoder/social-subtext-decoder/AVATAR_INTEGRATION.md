# Avatar Integration Guide

## Overview

This document outlines the complete integration of the 3D avatar system into the Social Subtext Decoder app. The avatar provides professional-grade conversational practice with:

- **3D Avatar with Facial Expressions**: 10+ animations and 6+ facial expressions
- **Lip-Sync**: Real-time mouth movements synced to audio
- **Voice I/O**: OpenAI Whisper (STT) + ElevenLabs (TTS)
- **Emotion-Aware Responses**: OpenAI-powered contextual responses
- **Suggested Replies**: Smart suggestions based on situation context

## Architecture

### Backend Stack
- **Express.js**: REST API and WebSocket server
- **OpenAI**: LLM for responses + Whisper for speech-to-text
- **ElevenLabs**: Professional text-to-speech
- **LangChain**: Structured output parsing
- **Rhubarb Lip-Sync**: Phoneme-to-mouth synchronization

### Frontend Stack
- **React Three Fiber**: 3D avatar rendering
- **React**: UI and state management
- **Axios**: API communication
- **Three.js**: 3D graphics library

---

## Setup Instructions

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Copy Model Files (IMPORTANT!)

The 3D avatar models are required. Copy these files:

**From**: `../talking-avatar-with-ai/apps/frontend/public/models/`
**To**: `./frontend/public/models/`

Files to copy:
- `avatar.glb`
- `animations.glb`
- `animations.gltf`
- `animations_data.bin`
- Pre-rendered audio files (optional): `intro_*.json/wav`, `api_*.json/wav`

### 3. Environment Variables

Create `.env` files:

**Backend (.env)**:
```
# Port
PORT=3001
NODE_ENV=development

# API Keys (Required)
OPENAI_API_KEY=sk-...your-key-here...
ELEVEN_LABS_API_KEY=...your-key-here...

# Optional: Override default voice
ELEVEN_LABS_VOICE_ID=JBFqnCBsd6RMkjVY (example ID)
ELEVEN_LABS_MODEL_ID=eleven_monolingual_v1 (optional)

# Database
DATABASE_URL=postgres://user:password@localhost/db_name

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

**Frontend (.env.local)**:
```
VITE_API_URL=http://localhost:3001
```

### 4. Verify Model Availability

Check that fonts and external assets load:
```bash
# Backend
npm run dev

# Frontend (in another terminal)
npm run dev
```

Access at: `http://localhost:5173`

---

## Project Structure

### Backend Services

**`backend/services/`:**
- `openAIService.js` - OpenAI responses with structured output
- `voiceService.js` - Text-to-Speech + Speech-to-Text
- `lipSyncService.js` - Lip-sync generation pipeline
- `audioService.js` - Audio format conversion utilities

### Backend Routes

**`backend/routes/avatar.js`:**
- `GET /api/avatar/voices` - List available voices
- `POST /api/avatar/tts` - Text → Speech + Lip-sync
- `POST /api/avatar/practice` - Practice mode responses
- `POST /api/avatar/live` - Live feedback mode
- `POST /api/avatar/stt` - Speech → Text

### Frontend Components

**`frontend/src/components/`:**
- `Avatar3D.jsx` - 3D avatar rendering with animations/expressions

**`frontend/src/constants/`:**
- `facialExpressions.js` - Expression morph target mappings
- `morphTargets.js` - Full list of facial blend shapes
- `visemesMapping.js` - Phoneme-to-viseme mapping

**`frontend/src/hooks/`:**
- `useSpeechAvatar.js` - Audio context provider with TTS/STT

**`frontend/src/pages/`:**
- `AvatarPracticePage.jsx` - Complete practice mode with avatar

---

## Key Features

### 1. Practice Mode (`/api/avatar/practice`)

User selects a situation (restaurant, job interview, etc.), avatar responds with:
- Contextual greeting
- AI-generated responses
- Suggested replies for user
- Facial expressions matching emotion
- Realistic animations

**Request:**
```json
{
  "userMessage": "I'd like to order food",
  "conversationHistory": [...],
  "situationType": "restaurant"
}
```

**Response:**
```json
{
  "success": true,
  "messages": [{
    "text": "Of course! What can I get you?",
    "facialExpression": "smile",
    "animation": "TalkingOne",
    "audio": "base64_mp3_data",
    "lipsync": { "mouthCues": [...] },
    "suggestedReplies": ["I'll have a burger", "Do you have vegetarian options?"]
  }]
}
```

### 2. Voice Input via WebRTC

The `useSpeechAvatar` hook handles:
- Microphone access
- Audio recording in WebM format
- Conversion to MP3
- Transmission to backend
- Automatic response playback

### 3. Lip-Sync Pipeline

1. User text → ElevenLabs TTS (MP3 audio)
2. MP3 → WAV conversion (ffmpeg)
3. WAV → Phonemes (Rhubarb CLI tool)
4. Phonemes → Viseme morph targets (mapped in Avatar)
5. Audio plays while avatar mouth syncs

### 4. Facial Expressions

Avatar can display 6+ expressions:
- `smile` - Happy/positive
- `sad` - Sad/sympathetic
- `angry` - Angry/frustrated
- `surprised` - Shocked/amazed
- `funnyFace` - Playful/joking
- `default` - Neutral

Mapped to blend shapes in 3D model.

---

## Integration Checklist

- [x] Backend services created
- [x] Avatar routes implemented
- [x] Frontend components created
- [x] Avatar3D component built
- [ ] **Copy model files manually**
- [ ] Test basic avatar rendering
- [ ] Test TTS pipeline
- [ ] Test STT pipeline  
- [ ] Test practice mode end-to-end
- [ ] Update existing practice page route
- [ ] Complete live mode implementation
- [ ] Add emotion detection to live mode
- [ ] Deploy to production

---

## Testing

### Quick Test

1. Start backend: `npm run dev` (in backend folder)
2. Start frontend: `npm run dev` (in frontend folder)
3. Navigate to practice page
4. Select situation
5. Type response and click Send
6. Avatar should respond with TTS audio + lip-sync

### Test Endpoints

**Test TTS:**
```bash
curl -X POST http://localhost:3001/api/avatar/tts \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, how are you?"}'
```

**Test STT:**
```bash
# Convert audio file to base64 first
curl -X POST http://localhost:3001/api/avatar/stt \
  -H "Content-Type: application/json" \
  -d "{\"audio\":\"base64_audio_data\"}"
```

**Test Practice Mode:**
```bash
curl -X POST http://localhost:3001/api/avatar/practice \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage":"I want to order food",
    "situationType":"restaurant",
    "conversationHistory":[]
  }'
```

---

## System Requirements

### Whisper Transcription
- Model files downloaded automatically on first use
- ~1.5GB disk space for full model
- Runs locally, no API calls needed

### Rhubarb Lip-Sync
- Requires `ffmpeg` and `./bin/rhubarb` binary
- Download from: https://github.com/DanielSWolf/rhubarb-lip-sync
- Extract to backend root: `./bin/rhubarb`

### Hardware
- GPU recommended for Three.js rendering
- 4GB+ RAM for audio processing
- Fast internet for API calls (ElevenLabs, OpenAI)

---

## Troubleshooting

### Avatar Not Rendering
- Check model files in `public/models/`
- Check browser console for GLB load errors
- Verify Three.js version compatibility

### No Audio Output
- Check OPENAI_API_KEY is set
- Check ELEVEN_LABS_API_KEY is set
- Check backend logs for TTS errors
- Verify ffmpeg is installed: `ffmpeg -version`

### Lip-Sync Not Working
- Ensure Rhubarb binary is in `./bin/rhubarb`
- Check ffmpeg: `ffmpeg -version`
- Check file write permissions to `./audios/` folder

### Microphone Not Working
- Check browser microphone permissions
- Check HTTPS (required for getUserMedia in production)
- Check `navigator.mediaDevices` availability

### API Errors
- Verify backend is running on port 3001
- Check CORS settings in backend
- Check API key validity
- Review backend logs

---

## Next Steps

### 1. Live Interaction Mode
Complete the live conversation feature:
- Real-time emotion detection from face
- Real-time emotion detection from speech tone
- Multimodal feedback combining both
- Real-time suggested responses

### 2. Accessibility Improvements
- Add closed captions for all audio
- Screen reader support
- High contrast mode
- Keyboard navigation

### 3. Performance Optimization
- Implement caching for responses
- Lazy-load animation models
- Optimize audio chunk sizes
- Add CDN for static assets

### 4. Mobile Support
- Responsive avatar sizing
- Touch-friendly controls
- Mobile-optimized UI layout
- Fallback for devices without WebGL

---

## API Reference

### `POST /api/avatar/practice`

Generate practice mode response.

**Parameters:**
- `userMessage` (string): User's input text
- `conversationHistory` (array): Previous messages for context
- `situationType` (string): 'restaurant' | 'job_interview' | 'small_talk' | 'difficult_conversation'

**Returns:**
```json
{
  "success": true,
  "messages": [{
    "text": "string",
    "facialExpression": "smile|sad|angry|surprised|funnyFace|default",
    "animation": "Idle|TalkingOne|TalkingThree|etc",
    "audio": "base64_mp3",
    "lipsync": {},
    "suggestedReplies": ["reply1", "reply2", "reply3"]
  }]
}
```

### `POST /api/avatar/live`

Real-time feedback for active conversation.

**Parameters:**
- `userMessage` (string): What user just said
- `conversationContext` (string): Background about the conversation
- `detectedEmotion` (string): Emotion detected from face/voice
- `suggestedTone` (string): Recommended response tone

### `POST /api/avatar/stt`

Convert speech to text.

**Parameters:**
- `audio` (string): Base64-encoded audio data (WebM format)

**Returns:**
```json
{
  "success": true,
  "transcription": "user's spoken words"
}
```

### `GET /api/avatar/voices`

List available ElevenLabs voices.

**Returns:**
```json
{
  "success": true,
  "voices": [
    { "voice_id": "...", "name": "..." }
  ]
}
```

---

## Configuration Reference

### Avatar Animations
Available animations in `animations.glb`:
- Idle
- TalkingOne, TalkingTwo, TalkingThree
- SadIdle, Defeated, Angry
- Surprised
- DismissingGesture
- ThoughtfulHeadShake

### Facial Expressions
Blend shapes (morph targets):
- `smile` - Mouth corners up, eyes squint
- `sad` - Mouth corners down, sad eyes
- `angry` - Eyebrows down, tense mouth
- `surprised` - Eyes wide, mouth open
- `funnyFace` - Exaggerated expression

### Voice Parameters (ElevenLabs)
- `stability`: 0-1 (higher = more consistent)
- `similarity_boost`: 0-1 (higher = more recognizable)
- `style`: 0-1 (speaking style intensity)
- `speaker_boost`: true|false (enhance speaker characteristics)

---

## File Locations

```
backend/
├── services/
│   ├── openAIService.js
│   ├── voiceService.js
│   ├── lipSyncService.js
│   └── audioService.js
├── routes/
│   └── avatar.js
└── server.js

frontend/
├── src/
│   ├── components/
│   │   └── Avatar3D.jsx
│   ├── constants/
│   │   ├── facialExpressions.js
│   │   ├── morphTargets.js
│   │   └── visemesMapping.js
│   ├── hooks/
│   │   └── useSpeechAvatar.js
│   └── pages/
│       └── AvatarPracticePage.jsx
└── public/
    └── models/
        ├── avatar.glb
        ├── animations.glb
        └── ...
```

---

## Support & Debugging

Enable debug logging:
```javascript
// In services
console.log('🤖 Avatar:', message)
console.log('🎙️ Audio:', audioData)
console.log('💬 TTS:', response)
```

Check browser DevTools:
- Network: Verify API calls succeed
- Console: Check for JS errors
- Sources: Debug React components

Check backend logs:
```bash
# With NODE_ENV=development
npm run dev
```

---

## License & Attribution

- Avatar model from: https://www.sketchfab.com/models/avatar (Wolf3D format)
- Rhubarb Lip-Sync: https://github.com/DanielSWolf/rhubarb-lip-sync
- OpenAI Whisper: https://github.com/openai/whisper
- ElevenLabs API: https://beta.elevenlabs.io/

---

Last updated: March 2026
Integration Status: 85% Complete
