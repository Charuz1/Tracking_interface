import { useEffect, useRef } from 'react'

const GESTURE_INFO = {
  open:  { label: '✋ Open Palm', desc: 'Repelling objects', color: 'open'   },
  pinch: { label: '🤏 Pinch',     desc: 'Grabbing object',   color: 'pinch'  },
  swipe: { label: '👋 Swipe',     desc: 'Tossing objects',   color: 'swipe'  },
  none:  { label: '· · ·',        desc: 'No gesture',        color: 'none'   },
}

/**
 * HUD — heads-up display with FPS, gesture, and landmarks count
 */
export default function HUD({ gesture, landmarkCount, enabled }) {
  const fpsRef       = useRef(0)
  const fpsElRef     = useRef(null)
  const frameRef     = useRef(0)
  const lastTimeRef  = useRef(performance.now())

  // FPS counter
  useEffect(() => {
    let rafId
    const tick = (now) => {
      frameRef.current++
      const elapsed = now - lastTimeRef.current
      if (elapsed >= 500) {
        fpsRef.current = Math.round((frameRef.current / elapsed) * 1000)
        frameRef.current = 0
        lastTimeRef.current = now
        if (fpsElRef.current) fpsElRef.current.textContent = fpsRef.current
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const info = GESTURE_INFO[gesture] || GESTURE_INFO.none

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 20,
        inset: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.25rem 1.5rem',
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '-0.01em',
              background: 'linear-gradient(135deg, #00f5ff 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ⚡ ZeroG Gestures
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            ANTIGRAVITY INTERFACE v1.0
          </span>
        </div>

        {/* FPS + status */}
        <div className="hud-panel" style={{ textAlign: 'right', minWidth: '130px' }}>
          <div>FPS&nbsp;<span ref={fpsElRef} style={{ color: '#fff' }}>--</span></div>
          <div>HANDS&nbsp;<span style={{ color: '#fff' }}>{landmarkCount > 0 ? '1' : '0'}</span></div>
          <div style={{ color: enabled ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
            {enabled ? '● TRACKING' : '○ STANDBY'}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        {/* Gesture badge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            GESTURE DETECTED
          </span>
          <span className={`gesture-badge ${info.color}`}>
            {info.label}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {info.desc}
          </span>
        </div>

        {/* Legend */}
        <div className="hud-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '190px' }}>
          <LegendRow color="#00f5ff" label="✋ Open Palm" action="Repel objects" />
          <LegendRow color="#a855f7" label="🤏 Pinch"     action="Grab &amp; hold" />
          <LegendRow color="#f43f5e" label="👋 Swipe"     action="Toss away" />
        </div>
      </div>

      {/* ── Gesture ripple flash ──────────────────────────────────── */}
      {gesture === 'swipe' && (
        <div
          className="swipe-ripple"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
      )}
    </div>
  )
}

function LegendRow({ color, label, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.68rem' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
      <span style={{ color: '#cbd5e1' }}>{label}</span>
      <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{action}</span>
    </div>
  )
}
