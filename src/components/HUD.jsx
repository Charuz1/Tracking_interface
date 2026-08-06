import { useEffect, useRef } from 'react'

const GESTURE_INFO = {
  open:  { label: '✋ Open Palm', desc: 'Repelling objects', color: 'open'   },
  pinch: { label: '🤏 Pinch',     desc: 'Popping letters!',  color: 'pinch'  },
  swipe: { label: '👋 Swipe',     desc: 'Tossing objects',   color: 'swipe'  },
  none:  { label: '· · ·',        desc: 'No gesture',        color: 'none'   },
}

/**
 * HUD — heads-up display with FPS, gesture, target word, typed letters, and score
 */
export default function HUD({
  gesture,
  landmarkCount,
  enabled,
  targetWord = '',
  typedText = '',
  score = 0,
  isWrong = false,
  onReset
}) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
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
            WORD TYPING GAME v1.1
          </span>
        </div>

        {/* FPS + Score + status */}
        <div className="hud-panel" style={{ textAlign: 'right', minWidth: '130px' }}>
          <div style={{ fontWeight: 'bold', color: 'var(--accent-gold)', fontSize: '0.9rem', marginBottom: '0.2rem', textShadow: '0 0 8px rgba(251,191,36,0.4)' }}>
            SCORE&nbsp;<span>{score}</span>
          </div>
          <div>FPS&nbsp;<span ref={fpsElRef} style={{ color: '#fff' }}>--</span></div>
          <div style={{ color: enabled ? 'var(--accent-cyan)' : 'var(--text-muted)', fontSize: '0.68rem', marginTop: '0.2rem' }}>
            {enabled ? '● TRACKING' : '○ STANDBY'}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
        {/* Gesture badge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '190px' }}>
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

        {/* Word Display Panel in the bottom center */}
        <div
          className={`hud-panel glass-card ${isWrong ? 'shake' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.75rem 1.5rem',
            minWidth: '280px',
            pointerEvents: 'auto',
            background: isWrong ? 'rgba(244, 63, 94, 0.15)' : 'var(--bg-glass)',
            border: isWrong ? '1px solid var(--accent-pink)' : '1px solid var(--border-glow)',
            boxShadow: isWrong ? '0 0 20px rgba(244, 63, 94, 0.4)' : '0 0 24px rgba(0,245,255,0.08)',
            transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            SPELL THIS WORD
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', margin: '0.2rem 0' }}>
            {targetWord.split('').map((char, index) => {
              const isTyped = index < typedText.length
              return (
                <span
                  key={index}
                  className={isTyped ? 'letter-pop' : ''}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '1.5rem',
                    color: isTyped ? (isWrong ? 'var(--accent-pink)' : 'var(--accent-cyan)') : '#334155',
                    textShadow: isTyped ? (isWrong ? '0 0 10px var(--accent-pink)' : '0 0 10px var(--accent-cyan)') : 'none',
                    borderBottom: `2px solid ${isTyped ? (isWrong ? 'var(--accent-pink)' : 'var(--accent-cyan)') : '#334155'}`,
                    padding: '0 0.2rem',
                    minWidth: '1.5rem',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {char}
                </span>
              )
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', justifyContent: 'space-between', marginTop: '0.2rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#64748b' }}>
              Progress: {typedText.length}/{targetWord.length}
            </span>
            <button
              onClick={onReset}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                padding: '0.15rem 0.4rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
            >
              Reset ⟲
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="hud-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '190px' }}>
          <LegendRow color="#00f5ff" label="✋ Open Palm" action="Repel letters" />
          <LegendRow color="#a855f7" label="🤏 Pinch"     action="Pop next letter" />
          <LegendRow color="#f43f5e" label="👋 Swipe"     action="Toss letters" />
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
