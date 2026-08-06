import { useState, useCallback, useRef } from 'react'
import PhysicsCanvas  from './components/PhysicsCanvas'
import GestureOverlay from './components/GestureOverlay'
import HUD            from './components/HUD'

const INITIAL_GESTURE = {
  gesture:     'none',
  palmCenter:  null,
  indexTip:    null,
  landmarks:   null,
  swipeDir:    null,
}

export default function App() {
  const [phase, setPhase]         = useState('splash')   // 'splash' | 'loading' | 'active'
  const [gestureState, setGestureState] = useState(INITIAL_GESTURE)
  const [landmarkCount, setLandmarkCount] = useState(0)
  const [error, setError]         = useState(null)

  const gestureRef = useRef(INITIAL_GESTURE)

  // Called each frame by GestureOverlay
  const handleGestureUpdate = useCallback((data) => {
    gestureRef.current = data
    setGestureState(data)
    setLandmarkCount(data.landmarks ? data.landmarks.length : 0)
  }, [])

  // Start tracking on button click
  const handleStart = async () => {
    setPhase('loading')
    try {
      // Check if MediaDevices API is available (requires HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. This usually happens when accessing the app via a local network IP without HTTPS. Please use localhost or HTTPS.')
      }
      // Pre-check camera permission
      await navigator.mediaDevices.getUserMedia({ video: true })
      setPhase('active')
    } catch (err) {
      console.error('Camera initialization error:', err)
      const msg = err.message || 'Camera permission denied. Please allow webcam access and refresh.'
      setError(msg.includes('Camera API') ? err.message : 'Camera permission denied. Please allow webcam access (or connect a camera) and refresh.')
      setPhase('splash')
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: 'var(--bg-deep)' }}>

      {/* ── Starfield ──────────────────────────────────────────────── */}
      <div className="starfield" aria-hidden="true" />

      {/* ── Scanlines ──────────────────────────────────────────────── */}
      <div className="scanlines" aria-hidden="true" />

      {/* ── Splash / Permission screen ─────────────────────────────── */}
      {phase !== 'active' && (
        <div className="splash-screen" role="main">
          {/* Pulse ring icon */}
          <div className="pulse-ring" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 8C13.373 8 8 13.373 8 20s5.373 12 12 12 12-5.373 12-12S26.627 8 20 8z" stroke="#00f5ff" strokeWidth="1.5" fill="none"/>
              <circle cx="20" cy="12" r="2" fill="#a855f7"/>
              <circle cx="14" cy="18" r="2" fill="#00f5ff"/>
              <circle cx="26" cy="18" r="2" fill="#00f5ff"/>
              <circle cx="16" cy="26" r="2" fill="#f43f5e"/>
              <circle cx="24" cy="26" r="2" fill="#f43f5e"/>
              <circle cx="20" cy="22" r="2.5" fill="#fbbf24"/>
            </svg>
          </div>

          {/* Title */}
          <h1 className="splash-title">ZeroG Gestures</h1>

          {/* Subtitle */}
          <p className="splash-subtitle">
            Interact with floating, gravity-defying digital objects — purely through your hands.
            No controllers. No clicks. Just pure gesture.
          </p>

          {/* Feature chips */}
          <div className="info-chips">
            <span className="info-chip">✋ 21 Hand Landmarks</span>
            <span className="info-chip">🚀 Antigravity Physics</span>
            <span className="info-chip">🌐 Browser-Native</span>
            <span className="info-chip">⚡ Real-Time AI</span>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--accent-pink)',
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.3)',
              borderRadius: 8,
              padding: '0.6rem 1.2rem',
              maxWidth: 360,
              textAlign: 'center',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* CTA Button */}
          {phase === 'loading' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <LoadingSpinner />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                LOADING MEDIAPIPE MODEL…
              </span>
            </div>
          ) : (
            <button
              id="start-tracking-btn"
              className="btn-glow"
              onClick={handleStart}
              style={{ animation: 'fadeSlideUp 0.8s 0.6s ease both' }}
            >
              🎥 Enable Camera &amp; Start
            </button>
          )}

          {/* Footer note */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            maxWidth: 340,
            lineHeight: 1.6,
            letterSpacing: '0.04em',
            animation: 'fadeSlideUp 0.8s 0.7s ease both',
          }}>
            Powered by MediaPipe Hands · Matter.js Physics · React
            <br />
            Camera data is processed locally — never uploaded.
          </p>
        </div>
      )}

      {/* ── Active scene ───────────────────────────────────────────── */}
      {phase === 'active' && (
        <>
          {/* Physics simulation canvas */}
          <PhysicsCanvas
            gestureState={gestureState}
            enabled={true}
          />

          {/* Webcam + hand skeleton overlay */}
          <GestureOverlay
            onGestureUpdate={handleGestureUpdate}
            enabled={true}
          />

          {/* HUD */}
          <HUD
            gesture={gestureState.gesture}
            landmarkCount={landmarkCount}
            enabled={true}
          />

          {/* Cursor finger dot — follows index tip */}
          {gestureState.indexTip && (
            <FingerCursor
              x={(1 - gestureState.indexTip.x) * window.innerWidth}
              y={gestureState.indexTip.y * window.innerHeight}
              gesture={gestureState.gesture}
            />
          )}
        </>
      )}
    </div>
  )
}

/* ─── Finger cursor dot ──────────────────────────────────────────── */
function FingerCursor({ x, y, gesture }) {
  const colors = {
    open:  '#00f5ff',
    pinch: '#a855f7',
    swipe: '#f43f5e',
    none:  'rgba(255,255,255,0.4)',
  }
  const color = colors[gesture] || colors.none
  const size  = gesture === 'pinch' ? 22 : 14

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        zIndex: 30,
        pointerEvents: 'none',
        left: x,
        top: y,
        width:  size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        border: `1.5px solid ${color}`,
        transform: 'translate(-50%, -50%)',
        boxShadow: `0 0 16px ${color}, 0 0 32px ${color}40`,
        transition: 'width 0.15s ease, height 0.15s ease, box-shadow 0.15s ease',
      }}
    />
  )
}

/* ─── Loading spinner ────────────────────────────────────────────── */
function LoadingSpinner() {
  return (
    <div
      style={{
        width: 40, height: 40,
        borderRadius: '50%',
        border: '2px solid rgba(0,245,255,0.15)',
        borderTopColor: '#00f5ff',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  )
}

/* Inject spin keyframe */
const spinStyle = document.createElement('style')
spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`
document.head.appendChild(spinStyle)
