import { useEffect, useState } from 'react'
import { seedIfEmpty } from './lib/seed'
import { useSync } from './hooks/useSync'
import { useTheme } from './hooks/useTheme'
import { SyncBadge } from './components/SyncBadge'
import { ThemeToggle } from './components/ThemeToggle'
import { Footer } from './components/Footer'
import { Dashboard } from './pages/Dashboard'

/** One page. No tabs, no routes — same as the Notion dashboard. */
export default function App() {
  const [ready, setReady] = useState(false)
  const sync = useSync()
  const { theme, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    void seedIfEmpty().finally(() => setReady(true))
  }, [])

  if (!ready) return <div className="p-6 text-muted">Loading…</div>

  return (
    <div className="theme-transition flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-[1400px] flex-1">
        <header className="flex items-center justify-between border-b border-rule px-4 py-2.5 safe-top sm:px-6">
          <h1 className="text-[15px] font-semibold tracking-tight">
            <span className="text-brand-gradient">Finance</span> Tracker
          </h1>
          <div className="flex items-center gap-3">
            <SyncBadge sync={sync} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {sync.state === 'error' && sync.error && (
          <p role="alert" className="border-b border-rule bg-over-soft px-4 py-2 text-[13px] text-over sm:px-6">
            {sync.error}
          </p>
        )}

        <Dashboard onChanged={sync.scheduleSync} />
      </div>

      <Footer />
    </div>
  )
}
