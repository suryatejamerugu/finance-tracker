import { useEffect, useState } from 'react'
import { seedIfEmpty } from './lib/seed'
import { useSync } from './hooks/useSync'
import { SyncBadge } from './components/SyncBadge'
import { Dashboard } from './pages/Dashboard'

/** One page. No tabs, no routes — same as the Notion dashboard. */
export default function App() {
  const [ready, setReady] = useState(false)
  const sync = useSync()

  useEffect(() => {
    void seedIfEmpty().finally(() => setReady(true))
  }, [])

  if (!ready) return <div className="p-6 text-muted">Loading…</div>

  return (
    <div className="mx-auto min-h-dvh max-w-[1400px]">
      <header className="flex items-center justify-between border-b border-rule px-4 py-2.5 safe-top sm:px-6">
        <h1 className="text-[15px] font-medium">Finance Tracker</h1>
        <SyncBadge sync={sync} />
      </header>

      {sync.state === 'error' && sync.error && (
        <p role="alert" className="border-b border-rule bg-over-soft px-4 py-2 text-[13px] text-over sm:px-6">
          {sync.error}
        </p>
      )}

      <Dashboard onChanged={sync.scheduleSync} />
    </div>
  )
}
