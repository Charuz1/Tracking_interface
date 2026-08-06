import { useRef, useEffect } from 'react'
import { usePhysicsEngine } from '../hooks/usePhysicsEngine'

/**
 * PhysicsCanvas — renders the Matter.js antigravity simulation
 */
export default function PhysicsCanvas({ gestureState, enabled, onLetterPopped }) {
  const canvasRef = useRef(null)
  usePhysicsEngine(canvasRef, gestureState, enabled, onLetterPopped)

  // Resize canvas when window resizes
  useEffect(() => {
    const handle = () => {
      if (canvasRef.current) {
        canvasRef.current.width  = window.innerWidth
        canvasRef.current.height = window.innerHeight
      }
    }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="canvas-container"
      style={{ position: 'fixed', inset: 0, zIndex: 1 }}
      aria-hidden="true"
    />
  )
}
