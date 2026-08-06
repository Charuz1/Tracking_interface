import { useRef, useCallback } from 'react'
import { useHandTracker } from '../hooks/useHandTracker'

/**
 * GestureOverlay — hidden video feed + landmark canvas
 * Renders the hand skeleton over a mirrored, semi-transparent video
 */
export default function GestureOverlay({ onGestureUpdate, enabled }) {
  const videoRef          = useRef(null)
  const landmarkCanvasRef = useRef(null)

  const handleGestureUpdate = useCallback((data) => {
    onGestureUpdate(data)
  }, [onGestureUpdate])

  useHandTracker({
    videoRef,
    landmarkCanvasRef,
    onGestureUpdate: handleGestureUpdate,
    enabled,
  })

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 8,
        pointerEvents: 'none',
      }}
    >
      {/* Mirrored webcam video — dimmed, just for context */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',   // mirror
          opacity: 0.08,             // very dim — purely ambient
          filter: 'saturate(0) brightness(1.4)',
        }}
        aria-hidden="true"
      />

      {/* Landmark skeleton canvas */}
      <canvas
        ref={landmarkCanvasRef}
        className="landmark-canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'scaleX(-1)',   // mirror to match video
        }}
        aria-hidden="true"
      />
    </div>
  )
}
