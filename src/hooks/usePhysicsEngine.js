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

const SHAPE_TYPES = ['circle', 'triangle', 'square', 'pentagon']
const BODY_COUNT = 18

/**
 * usePhysicsEngine — Matter.js engine lifecycle & gesture interaction
 *
 * @param {HTMLCanvasElement} canvasRef - canvas for Matter.js render
 * @param {{ gesture, palmCenter, indexTip, swipeDir }} gestureState
 * @param {boolean} enabled
 */
export function usePhysicsEngine(canvasRef, gestureState, enabled) {
  const engineRef  = useRef(null)
  const renderRef  = useRef(null)
  const runnerRef  = useRef(null)
  const bodiesRef  = useRef([])


  // ── Spawn bodies ───────────────────────────────────────────────────
  const spawnBodies = useCallback((width, height) => {
    const bodies = []
    for (let i = 0; i < BODY_COUNT; i++) {
      const theme = ORB_THEMES[i % ORB_THEMES.length]
      const type  = SHAPE_TYPES[i % SHAPE_TYPES.length]
      const r     = 22 + Math.random() * 28
      const x     = 80 + Math.random() * (width - 160)
      const y     = height * 0.3 + Math.random() * height * 0.5

      let body
      if (type === 'circle') {
        body = Bodies.circle(x, y, r, {
          restitution: 0.6,
          friction: 0.01,
          frictionAir: 0.008,
          render: { fillStyle: theme.fill, strokeStyle: theme.stroke, lineWidth: 1.5 },
        })
      } else if (type === 'triangle') {
        body = Bodies.polygon(x, y, 3, r, {
          restitution: 0.5, friction: 0.01, frictionAir: 0.01,
          render: { fillStyle: theme.fill, strokeStyle: theme.stroke, lineWidth: 1.5 },
        })
      } else if (type === 'square') {
        body = Bodies.rectangle(x, y, r * 1.8, r * 1.8, {
          restitution: 0.5, friction: 0.02, frictionAir: 0.01,
          render: { fillStyle: theme.fill, strokeStyle: theme.stroke, lineWidth: 1.5 },
        })
      } else {
        body = Bodies.polygon(x, y, 5, r, {
          restitution: 0.55, friction: 0.01, frictionAir: 0.009,
          render: { fillStyle: theme.fill, strokeStyle: theme.stroke, lineWidth: 1.5 },
        })
      }

      body._theme = theme
      body._type  = type
      // Give random initial velocity for floaty feel
      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 2,
        y: -1 - Math.random() * 2,
      })
      bodies.push(body)
    }
    return bodies
  }, [])

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

    // After-render: draw glow labels on top
    Events.on(render, 'afterRender', () => {
      const ctx = render.context
      bodiesRef.current.forEach((body) => {
        const { x, y } = body.position
        const theme = body._theme
        if (!theme) return
        // Glow dot at center
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = theme.glow
        ctx.shadowColor = theme.glow
        ctx.shadowBlur  = 20
        ctx.fill()
        ctx.shadowBlur = 0
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
  }, [gestureState, enabled])

  return { bodiesRef }
}
