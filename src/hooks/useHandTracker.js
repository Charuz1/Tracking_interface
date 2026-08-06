import { useRef, useEffect, useCallback } from 'react'
import { classifyGesture, getPalmCenter, getIndexTip, getSwipeDirection } from '../utils/gestures'

/**
 * useHandTracker — MediaPipe Hands integration hook
 *
 * Loads MediaPipe via CDN script tags (most reliable in Vite),
 * sets up the camera, and calls onResults each frame.
 *
 * @param {Object} options
 * @param {HTMLVideoElement} options.videoRef
 * @param {HTMLCanvasElement} options.landmarkCanvasRef
 * @param {Function} options.onGestureUpdate — called with { gesture, palmCenter, indexTip, landmarks, swipeDir }
 * @param {boolean} options.enabled
 */
export function useHandTracker({ videoRef, landmarkCanvasRef, onGestureUpdate, enabled }) {
  const handsRef = useRef(null)
  const cameraRef = useRef(null)
  const prevLandmarksRef = useRef(null)
  const animFrameRef = useRef(null)

  const drawLandmarks = useCallback((ctx, landmarks, connections, width, height) => {
    if (!ctx || !landmarks) return
    ctx.clearRect(0, 0, width, height)

    // Draw connections
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.55)'
    ctx.lineWidth = 2
    connections.forEach(([a, b]) => {
      ctx.beginPath()
      ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height)
      ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height)
      ctx.stroke()
    })

    // Draw landmarks
    landmarks.forEach((lm, i) => {
      const px = lm.x * width
      const py = lm.y * height
      const isTip = [4, 8, 12, 16, 20].includes(i)

      ctx.beginPath()
      ctx.arc(px, py, isTip ? 7 : 4, 0, Math.PI * 2)

      if (isTip) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.9)'
        // Glow
        ctx.shadowColor = '#a855f7'
        ctx.shadowBlur = 16
      } else {
        ctx.fillStyle = 'rgba(0, 245, 255, 0.7)'
        ctx.shadowColor = '#00f5ff'
        ctx.shadowBlur = 8
      }
      ctx.fill()
      ctx.shadowBlur = 0
    })

    // Draw index tip highlight
    const index = landmarks[8]
    ctx.beginPath()
    ctx.arc(index.x * width, index.y * height, 14, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.8)'
    ctx.lineWidth = 2
    ctx.shadowColor = '#f43f5e'
    ctx.shadowBlur = 20
    ctx.stroke()
    ctx.shadowBlur = 0
  }, [])

  useEffect(() => {
    if (!enabled) return

    // MediaPipe HAND_CONNECTIONS definition (21 landmarks)
    const HAND_CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],       // thumb
      [0,5],[5,6],[6,7],[7,8],       // index
      [0,9],[9,10],[10,11],[11,12],  // middle
      [0,13],[13,14],[14,15],[15,16],// ring
      [0,17],[17,18],[18,19],[19,20],// pinky
      [5,9],[9,13],[13,17],          // palm
    ]

    let cancelled = false

    async function initMediaPipe() {
      // Load MediaPipe Hands via CDN script injection (works in Vite)
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')

      if (cancelled) return
      if (!videoRef.current) return

      const hands = new window.Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      })

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6,
      })

      hands.onResults((results) => {
        if (cancelled) return
        const canvas = landmarkCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const W = canvas.width
        const H = canvas.height

        ctx.clearRect(0, 0, W, H)

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0]
          drawLandmarks(ctx, landmarks, HAND_CONNECTIONS, W, H)

          const gesture   = classifyGesture(landmarks, prevLandmarksRef.current)
          const palmCenter = getPalmCenter(landmarks)
          const indexTip  = getIndexTip(landmarks)
          const swipeDir  = gesture === 'swipe'
            ? getSwipeDirection(landmarks, prevLandmarksRef.current)
            : null

          onGestureUpdate({ gesture, palmCenter, indexTip, landmarks, swipeDir })
          prevLandmarksRef.current = landmarks
        } else {
          onGestureUpdate({ gesture: 'none', palmCenter: null, indexTip: null, landmarks: null, swipeDir: null })
          prevLandmarksRef.current = null
        }
      })

      handsRef.current = hands

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current && !cancelled) {
            await handsRef.current.send({ image: videoRef.current })
          }
        },
        width: 1280,
        height: 720,
      })
      camera.start()
      cameraRef.current = camera
    }

    initMediaPipe().catch(console.error)

    return () => {
      cancelled = true
      if (cameraRef.current) {
        try { cameraRef.current.stop() } catch (_) {}
      }
      if (handsRef.current) {
        try { handsRef.current.close() } catch (_) {}
      }
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [enabled, videoRef, landmarkCanvasRef, onGestureUpdate, drawLandmarks])
}

/** Dynamically inject a script tag and resolve when loaded */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}
