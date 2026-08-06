import { useEffect, useRef, useCallback } from 'react'
import Matter from 'matter-js'
import { applyRepulsion, applyAttraction, applyImpulse, clampBodies } from '../utils/physics'

const { Engine, Render, Runner, Bodies, Composite, Body, Events, Mouse, MouseConstraint } = Matter

// Orb color themes
const ORB_THEMES = [
  { fill: 'rgba(0,245,255,0.18)',   stroke: '#00f5ff',  glow: '#00f5ff',  label: 'cyan'   },
  { fill: 'rgba(168,85,247,0.18)',  stroke: '#a855f7',  glow: '#a855f7',  label: 'violet' },
  { fill: 'rgba(244,63,94,0.18)',   stroke: '#f43f5e',  glow: '#f43f5e',  label: 'pink'   },
  { fill: 'rgba(251,191,36,0.15)',  stroke: '#fbbf24',  glow: '#fbbf24',  label: 'gold'   },
  { fill: 'rgba(52,211,153,0.15)',  stroke: '#34d399',  glow: '#34d399',  label: 'green'  },
]

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const BODY_COUNT = 15

/**
 * usePhysicsEngine — Matter.js engine lifecycle & gesture interaction
 *
 * @param {HTMLCanvasElement} canvasRef - canvas for Matter.js render
 * @param {{ gesture, palmCenter, indexTip, swipeDir }} gestureState
 * @param {boolean} enabled
 * @param {Function} onLetterPopped - callback when user pinches/pops a letter
 * @param {string} targetWord - current word to spell
 */
export function usePhysicsEngine(canvasRef, gestureState, enabled, onLetterPopped, targetWord) {
  const engineRef  = useRef(null)
  const renderRef  = useRef(null)
  const runnerRef  = useRef(null)
  const bodiesRef  = useRef([])
  
  const targetWordRef = useRef(targetWord)
  const lastPopTimeRef = useRef(0)

  // Sync target word to ref
  useEffect(() => {
    targetWordRef.current = targetWord
  }, [targetWord])

  // Get random letter with a high probability of matching target word letters
  const getRandomLetter = useCallback(() => {
    const word = targetWordRef.current
    if (word && Math.random() < 0.6) {
      const letters = word.split('')
      return letters[Math.floor(Math.random() * letters.length)]
    }
    return ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }, [])

  // ── Spawn bodies ───────────────────────────────────────────────────
  const spawnBodies = useCallback((width, height) => {
    const bodies = []
    for (let i = 0; i < BODY_COUNT; i++) {
      const theme = ORB_THEMES[i % ORB_THEMES.length]
      const r     = 30 + Math.random() * 5
      const x     = 80 + Math.random() * (width - 160)
      const y     = height * 0.3 + Math.random() * height * 0.5

      const body = Bodies.circle(x, y, r, {
        restitution: 0.6,
        friction: 0.01,
        frictionAir: 0.008,
        render: { fillStyle: theme.fill, strokeStyle: theme.stroke, lineWidth: 1.5 },
      })

      body._theme = theme
      body._letter = getRandomLetter()
      
      // Give random initial velocity for floaty feel
      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 2,
        y: -1 - Math.random() * 2,
      })
      bodies.push(body)
    }
    return bodies
  }, [getRandomLetter])

  // ── Init engine ────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !canvasRef.current) return

    const canvas = canvasRef.current
    const W = canvas.width  = window.innerWidth
    const H = canvas.height = window.innerHeight

    // Engine with antigravity (upward)
    const engine = Engine.create()
    engine.gravity.y = -0.25  // objects float upward
    engine.gravity.x = 0
    engineRef.current = engine

    // Matter.js Render on our canvas
    const render = Render.create({
      canvas,
      engine,
      options: {
        width: W,
        height: H,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio || 1,
      },
    })
    renderRef.current = render

    // Spawn bodies
    const bodies = spawnBodies(W, H)
    bodiesRef.current = bodies
    Composite.add(engine.world, bodies)

    // Mouse Interaction Fallback
    const mouse = Mouse.create(render.canvas)
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    })
    Composite.add(engine.world, mouseConstraint)
    render.mouse = mouse

    // Runner
    const runner = Runner.create()
    runnerRef.current = runner
    Runner.run(runner, engine)
    Render.run(render)

    // After-render: draw letter labels on top
    Events.on(render, 'afterRender', () => {
      const ctx = render.context
      bodiesRef.current.forEach((body) => {
        const { x, y } = body.position
        const theme = body._theme
        if (!theme) return

        ctx.save()
        ctx.font = 'bold 24px "Outfit", "Inter", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = theme.glow
        ctx.shadowBlur = 15
        ctx.fillText(body._letter || '?', x, y)
        ctx.restore()
      })
    })

    // Clamp bodies loop
    const clampLoop = setInterval(() => {
      clampBodies(bodiesRef.current, W, H, 50)
    }, 100)

    // Handle resize
    const onResize = () => {
      const nW = window.innerWidth
      const nH = window.innerHeight
      canvas.width  = nW
      canvas.height = nH
      render.options.width  = nW
      render.options.height = nH
      render.canvas.width   = nW
      render.canvas.height  = nH
    }
    window.addEventListener('resize', onResize)

    return () => {
      clearInterval(clampLoop)
      window.removeEventListener('resize', onResize)
      Render.stop(render)
      Runner.stop(runner)
      Engine.clear(engine)
      if (render.canvas) render.canvas.getContext('2d')?.clearRect(0, 0, W, H)
    }
  }, [enabled, canvasRef, spawnBodies])

  // ── Gesture → physics reactions ────────────────────────────────────
  useEffect(() => {
    if (!enabled || !engineRef.current) return
    const { gesture, palmCenter, indexTip, swipeDir } = gestureState
    const bodies = bodiesRef.current
    const W = window.innerWidth
    const H = window.innerHeight

    if (!palmCenter) return

    // Convert normalized 0-1 coords → pixel coords (mirrored X)
    const px = (1 - palmCenter.x) * W
    const py = palmCenter.y * H

    // Determine hand position for bubble collision (indexTip prioritized)
    let handX = null
    let handY = null
    if (indexTip) {
      handX = (1 - indexTip.x) * W
      handY = indexTip.y * H
    } else if (palmCenter) {
      handX = px
      handY = py
    }

    // Support both 'pinch' and 'open' palm gestures to read/pop letters
    if (handX !== null && handY !== null && (gesture === 'pinch' || gesture === 'open')) {
      const now = Date.now()
      if (now - lastPopTimeRef.current > 400) {
        let nearestBody = null
        let minDistance = 55 // collision radius in pixels

        bodies.forEach((body) => {
          const dx = body.position.x - handX
          const dy = body.position.y - handY
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < minDistance) {
            nearestBody = body
            minDistance = dist
          }
        })

        if (nearestBody) {
          lastPopTimeRef.current = now
          if (onLetterPopped) {
            onLetterPopped(nearestBody._letter)
          }

          // Respawn the popped letter body at the bottom
          Body.setPosition(nearestBody, {
            x: 80 + Math.random() * (W - 160),
            y: H + 50
          })
          nearestBody._letter = getRandomLetter()
          Body.setVelocity(nearestBody, {
            x: (Math.random() - 0.5) * 2,
            y: -2 - Math.random() * 2,
          })
        }
      }
    }

    // Apply general physics forces
    if (gesture === 'open') {
      applyRepulsion(bodies, { x: px, y: py }, 180, 0.03)
    } else if (gesture === 'pinch' && indexTip) {
      const tipPx = (1 - indexTip.x) * W
      const tipPy = indexTip.y * H
      applyAttraction(bodies, { x: tipPx, y: tipPy }, 140, 0.05)
    } else if (gesture === 'swipe' && swipeDir) {
      applyImpulse(bodies, { x: px, y: py }, {
        dx: -swipeDir.dx, // mirror X
        dy: swipeDir.dy,
      }, 220)
    }
  }, [gestureState, enabled, onLetterPopped, getRandomLetter])

  return { bodiesRef }
}
