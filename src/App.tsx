import { lazy, Suspense, useEffect, useState } from 'react'
import { seedIfEmpty } from './lib/seed'
import { useSync } from './hooks/useSync'
import { useTheme } from './hooks/useTheme'
import { useHideBalances } from './hooks/useHideBalances'
import { SyncBadge } from './components/SyncBadge'
import { ThemeToggle } from './components/ThemeToggle'
import { HideBalancesToggle } from './components/HideBalancesToggle'
import { DataMenuModal } from './components/DataMenuModal'
import { UndoToast } from './components/UndoToast'
import { Footer } from './components/Footer'

// Each page is its own chunk: every navigation between them (Dashboard,
// Reports, Guide) is already a hard <a> reload, not client-side routing (see
// below), so a visit to one never needs to fetch the JS the other two pull
// in — Reports' chart code or About's static text don't weigh down the
// dashboard most people land on, and vice versa.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })))
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })))

/**
 * Three pages (dashboard, reports, guide), picked by plain pathname — not
 * worth a router dependency. Links are real <a> tags (a full navigation, not
 * client-side), which netlify.toml's SPA redirect makes work correctly
 * either way.
 */
export default function App() {
  const [ready, setReady] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const sync = useSync()
  const { theme, toggle: toggleTheme } = useTheme()
  const { hidden: hideBalances, toggle: toggleHideBalances } = useHideBalances()
  const path = window.location.pathname.replace(/\/+$/, '')
  const isAbout = path === '/about'
  const isReports = path === '/reports'

  useEffect(() => {
    void seedIfEmpty().finally(() => setReady(true))
  }, [])

  if (!ready) return <div className="p-6 text-muted">Loading…</div>

  return (
    <div className="theme-transition flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-[1400px] flex-1">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-rule px-4 py-2.5 safe-top sm:px-6">
          <a
            href="/"
            className="pixel-notch pixel-notch-frame inline-flex shrink-0 items-center gap-2 bg-brand-soft px-2.5 py-1.5 no-underline"
          >
            <span className="font-display text-[9px] leading-none text-brand" aria-hidden="true">FT</span>
            <span className="text-[15px] font-semibold tracking-tight">
              <span className="text-brand-gradient">Finance</span> Tracker
            </span>
          </a>
          <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
            <SyncBadge sync={sync} />
            <a
              href="/reports"
              aria-label="Reports: spending and income charts"
              title="Reports: spending and income charts"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20V10M12 20V4M20 20v-7" />
              </svg>
            </a>
            <a
              href="/about"
              aria-label="Guide: how to use this app"
              title="Guide: how to use this app"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9.2a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.2 1-1.2 1.9" />
                <circle cx="12" cy="16.7" r="0.15" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <button
              type="button"
              onClick={() => setDataOpen(true)}
              aria-label="Your data: backup and restore"
              title="Your data: backup and restore"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
                <path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
                <path d="M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
              </svg>
            </button>
            <HideBalancesToggle hidden={hideBalances} onToggle={toggleHideBalances} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        <main>
          {sync.state === 'error' && sync.error && (
            <p role="alert" className="border-b border-rule bg-over-soft px-4 py-2 text-[13px] text-over sm:px-6">
              {sync.error}
            </p>
          )}

          <Suspense fallback={<div className="p-6 text-muted">Loading…</div>}>
            {isAbout ? (
              <About />
            ) : isReports ? (
              <Reports onChanged={sync.scheduleSync} />
            ) : (
              <Dashboard onChanged={sync.scheduleSync} userLabel={sync.email ?? null} hideBalances={hideBalances} />
            )}
          </Suspense>
        </main>
      </div>

      {dataOpen && <DataMenuModal onChanged={sync.scheduleSync} onClose={() => setDataOpen(false)} />}

      <UndoToast onChanged={sync.scheduleSync} />

      <Footer />
    </div>
  )
}
