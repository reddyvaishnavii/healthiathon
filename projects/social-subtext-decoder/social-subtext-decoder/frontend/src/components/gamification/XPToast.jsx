// ═══════════════════════════════════════════════════════════════════════
// XPToast — floating "+10 XP" animation
// Usage: <XPToast toast={pendingToast} onDone={clearToast} />
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function XPToast({ toast, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!toast) return
    setVisible(true)
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, 1800)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <AnimatePresence>
      {visible && toast && (
        <motion.div
          key={toast.reason + toast.xp}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{    opacity: 0, y: -30, scale: 0.9  }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2
                     bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl
                     border border-white/10 pointer-events-none"
        >
          <span className="text-yellow-400 font-bold text-base">+{toast.xp} XP</span>
          {toast.reason && (
            <span className="text-white/70 text-sm">{toast.reason}</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}