import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@components/Layout'
import DecoderPage from '@pages/DecoderPage'
import HistoryPage from '@pages/HistoryPage'
import PracticePage from '@/pages/SpeechPracticePage'
import LiveConversationPage from '@pages/LiveConversationPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DecoderPage />} />
          <Route path="live" element={<LiveConversationPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
