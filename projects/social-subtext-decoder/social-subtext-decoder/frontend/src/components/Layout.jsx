import { Outlet, NavLink } from 'react-router-dom'
import { Brain, History, Sparkles, Camera, Mic2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-soft-bg">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-soft-border">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center shadow-md">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-gray-900 text-base leading-tight">
              Subtext<span className="text-primary-500">Decoder</span>
            </span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-soft-muted hover:text-gray-700 hover:bg-soft-border'
                }`
              }
            >
              <Sparkles className="w-3.5 h-3.5" />
              Decode
            </NavLink>

            <NavLink
              to="/practice"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-soft-muted hover:text-gray-700 hover:bg-soft-border'
                }`
              }
            >
              <Mic2 className="w-3.5 h-3.5" />
              Practice
            </NavLink>

            <NavLink
              to="/live"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-soft-muted hover:text-gray-700 hover:bg-soft-border'
                }`
              }
            >
              <Camera className="w-3.5 h-3.5" />
              Live
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-soft-muted hover:text-gray-700 hover:bg-soft-border'
                }`
              }
            >
              <History className="w-3.5 h-3.5" />
              History
            </NavLink>
          </div>
        </nav>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-6 text-xs text-soft-muted">
        Made with care for clearer communication 💙
      </footer>
    </div>
  )
}