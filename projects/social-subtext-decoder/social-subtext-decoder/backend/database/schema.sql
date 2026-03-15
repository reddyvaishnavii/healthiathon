-- ═══════════════════════════════════════════════════════════════════════
-- Social Subtext Decoder - PostgreSQL Schema
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Users ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  preferences JSONB DEFAULT '{}'
);

-- ─── Practice Sessions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  situation_type VARCHAR(50) NOT NULL, -- 'restaurant', 'job_interview', 'custom', etc.
  situation_description TEXT,
  output_mode VARCHAR(20) DEFAULT 'voice', -- 'voice', 'text', 'both'
  avatar_enabled BOOLEAN DEFAULT true,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' -- 'active', 'completed', 'paused'
);

-- ─── Practice Messages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_messages (
  id SERIAL PRIMARY KEY,
  practice_session_id INTEGER REFERENCES practice_sessions(id) ON DELETE CASCADE,
  sender VARCHAR(20) NOT NULL, -- 'user', 'ai'
  message_text TEXT,
  audio_url TEXT,
  emotion_detected VARCHAR(50),
  confidence_score FLOAT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Live Conversations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  participants_info JSONB, -- {names, context, etc.}
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active'
);

-- ─── Live Conversation Messages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_conv_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES live_conversations(id) ON DELETE CASCADE,
  speaker VARCHAR(100),
  message_text TEXT,
  emotion_inferred VARCHAR(50),
  sarcasm_detected BOOLEAN DEFAULT false,
  ai_suggestion TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Conversation Reviews ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_reviews (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES live_conversations(id) ON DELETE CASCADE,
  summary TEXT,
  analysis JSONB, -- {tone, sentiment, key_moments, etc.}
  suggested_responses JSONB, -- [{message: '', timestamp: '', context: ''}]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── User Feedback/History ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50), -- 'practice', 'live_conv', 'review'
  activity_id INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Indexes ─────────────────────────────────────────────────────────
CREATE INDEX idx_users_session_id ON users(session_id);
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_practice_messages_session_id ON practice_messages(practice_session_id);
CREATE INDEX idx_live_conversations_user_id ON live_conversations(user_id);
CREATE INDEX idx_live_conv_messages_conversation_id ON live_conv_messages(conversation_id);
CREATE INDEX idx_conversation_reviews_conversation_id ON conversation_reviews(conversation_id);
CREATE INDEX idx_activity_log_user_id ON user_activity_log(user_id);
