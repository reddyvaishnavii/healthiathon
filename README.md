# 🧠 Healthiathon

An AI-powered communication and mental wellness platform designed to help users understand social cues, decode hidden meanings in conversations, and practice communication skills with an interactive 3D talking avatar.

---

## 🌟 Project Overview

Healthiathon was developed as an innovative hackathon project focused on improving communication skills and emotional understanding. The platform combines natural language processing, speech recognition, conversational AI, and 3D avatar technology to create a safe and engaging environment for users to practice real-world interactions.

The project is especially valuable for:
- Social skills training
- Communication coaching
- Accessibility support
- Emotional intelligence development
- Mental wellness applications

---

## ✨ Core Features

### 💬 Social Subtext Decoder
- Analyzes text messages and conversations
- Detects emotional tone and sentiment
- Interprets hidden meanings and implied intent
- Explains social context in simple language

### 🗣️ AI Talking Avatar
- Interactive 3D avatar with realistic facial expressions
- Lip-synced speech generation
- Voice-based conversations
- Dynamic emotional expressions

### 🎙️ Speech Practice Mode
- Practice speaking in real-world scenarios
- Speech recognition and feedback
- Confidence-building exercises

### 🤝 Live Conversation Mode
- Supports conversations between two real people
- Real-time AI assistance and insights

### 🎮 Gamification
- XP-based progression
- Level badges
- Session summaries and achievements

### 📜 History Tracking
- Stores previous conversations and decoding results
- Allows users to revisit and learn over time

---

## 🏗️ System Architecture


User Interface (React + Vite + Tailwind CSS)
            │
            ▼
     3D Avatar & Speech Modules
            │
            ▼
     Backend API (Node.js + Express)
            │
 ┌──────────┼──────────┐
 ▼          ▼          ▼
OpenAI   Database   Audio Services

### 🛠️ Tech Stack

Frontend:
- React.js
- Vite
- Tailwind CSS
- Three.js / React Three Fiber
- Web Speech API
- 
Backend:
- Node.js
- Express.js
- WebSocket
- AI & Media
- OpenAI APIs
- Text-to-Speech
- Speech Recognition
- Lip Sync Processing

Database:
- SQL (schema-based storage)
- Deployment
- Vercel
- Railway
- Procfile support
  
### 📁 Project Structure
healthiathon/
├── projects/
│   └── social-subtext-decoder/
│       └── social-subtext-decoder/
│           ├── backend/
│           ├── frontend/
│           ├── ARCHITECTURE.md
│           ├── ROADMAP.md
│           ├── TESTING.md
│           └── README.md
├── talking-avatar-with-ai/
└── start-backend.ps1

### 🚀 Key Modules
Backend:
- Decode Controller
- Practice Controller
- History Controller
- AI Service
- Audio Service
- Lip Sync Service
- OpenAI Integration
  
Frontend:
- 3D Avatar Components
- Decoder Input
- Practice Chat
- Speech Recognition Hooks
- WebSocket Client
- Gamification Components
  
### ⚙️ Installation and Setup

1. Clone the Repository
git clone https://github.com/reddyvaishnavii/healthiathon.git
cd healthiathon/projects/social-subtext-decoder/social-subtext-decoder
2. Install Backend Dependencies
cd backend
npm install
3. Install Frontend Dependencies
cd ../frontend
npm install
4. Configure Environment Variables
Create a .env file in the backend folder and add your API keys.
5. Start the Backend
cd backend
npm run dev
6. Start the Frontend
cd ../frontend
npm run dev
7. Open in Browser
http://localhost:5173

### 🎯 Use Cases
Communication skills development
Social cue interpretation
Autism support and social training
Emotional intelligence coaching
Mental wellness applications

###🎓 Learning Outcomes

Through this project, I gained hands-on experience with:

Generative AI and NLP
3D web development
Speech recognition and synthesis
Real-time communication with WebSockets
Full-stack development
Gamification design
Deployment to cloud platforms

### 👩‍💻 Contributors
Vaishnavi Reddy
Hackathon Team Members

### 📄 License

This project was developed for educational and hackathon purposes.
