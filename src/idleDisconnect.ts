import type { ConvexReactClient } from 'convex/react'

// An open Convex sync WebSocket counts as traffic, so a forgotten tab keeps a
// scale-to-zero backend awake indefinitely. Close the socket once the page is
// idle and reopen it on the next interaction; Convex resubscribes and catches
// up, so the only cost is a cold start if the backend fell asleep meanwhile.
const IDLE_MS = seconds(import.meta.env.VITE_CONVEX_IDLE_SECONDS, 5 * 60)
const HIDDEN_MS = seconds(import.meta.env.VITE_CONVEX_HIDDEN_SECONDS, 60)

const ACTIVITY_EVENTS = [
  'pointerdown',
  'pointermove',
  'keydown',
  'wheel',
  'touchstart',
  'focus',
] as const

// Convex 1.41 has no public pause API. These are the same socket controls its
// auth manager uses to stop and restart a session; a restart replays every
// active subscription and any queued mutations.
type SocketControls = { stop: () => Promise<void>; tryRestart: () => void }

function seconds(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return (Number.isFinite(parsed) && parsed > 0 ? parsed : fallback) * 1000
}

export function disconnectWhenIdle(client: ConvexReactClient) {
  if (typeof window === 'undefined') return
  const socket = (
    client as unknown as { sync?: { webSocketManager?: SocketControls } }
  ).sync?.webSocketManager
  if (
    typeof socket?.stop !== 'function' ||
    typeof socket.tryRestart !== 'function'
  ) {
    console.warn('convex: idle disconnect unavailable; keeping the socket open')
    return
  }

  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastActivity = 0

  const schedule = () => {
    clearTimeout(timer)
    const delay = document.visibilityState === 'hidden' ? HIDDEN_MS : IDLE_MS
    timer = setTimeout(() => {
      stopped = true
      void socket.stop()
    }, delay)
  }

  const onActivity = () => {
    // pointermove fires constantly; rescheduling once a second is plenty.
    const now = Date.now()
    if (!stopped && now - lastActivity < 1000) return
    lastActivity = now
    if (stopped && document.visibilityState === 'visible') {
      stopped = false
      socket.tryRestart()
    }
    schedule()
  }

  for (const event of ACTIVITY_EVENTS) {
    window.addEventListener(event, onActivity, { passive: true })
  }
  document.addEventListener('visibilitychange', () => {
    lastActivity = 0
    onActivity()
  })
  schedule()
}
