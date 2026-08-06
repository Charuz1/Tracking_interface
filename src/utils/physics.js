import Matter from 'matter-js'

const { Body, Vector } = Matter

/**
 * Apply radial repulsion from a point to all nearby bodies
 * @param {Matter.Body[]} bodies
 * @param {{ x: number, y: number }} origin  — canvas pixel coords
 * @param {number} radius  — effect radius in px
 * @param {number} strength — force magnitude
 */
export function applyRepulsion(bodies, origin, radius = 160, strength = 0.025) {
  bodies.forEach((body) => {
    const dx = body.position.x - origin.x
    const dy = body.position.y - origin.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < radius && dist > 1) {
      const forceMag = strength * (1 - dist / radius)
      const force = Vector.create(
        (dx / dist) * forceMag,
        (dy / dist) * forceMag,
      )
      Body.applyForce(body, body.position, force)
    }
  })
}

/**
 * Attract (soft grab) the nearest body toward a point
 */
export function applyAttraction(bodies, target, radius = 120, strength = 0.04) {
  let nearest = null
  let nearestDist = Infinity

  bodies.forEach((body) => {
    const dx = body.position.x - target.x
    const dy = body.position.y - target.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < nearestDist) { nearestDist = dist; nearest = body }
  })

  if (nearest && nearestDist < radius) {
    const dx = target.x - nearest.position.x
    const dy = target.y - nearest.position.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const force = Vector.create(
      (dx / dist) * strength,
      (dy / dist) * strength,
    )
    Body.applyForce(nearest, nearest.position, force)
  }
  return nearest
}

/**
 * Apply a velocity impulse to all bodies in range (swipe)
 */
export function applyImpulse(bodies, origin, impulse, radius = 200) {
  bodies.forEach((body) => {
    const dx = body.position.x - origin.x
    const dy = body.position.y - origin.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < radius) {
      const scale = 1 - dist / radius
      Body.setVelocity(body, {
        x: body.velocity.x + impulse.dx * scale,
        y: body.velocity.y + impulse.dy * scale,
      })
    }
  })
}

/**
 * Clamp bodies that escape the viewport back into bounds
 */
export function clampBodies(bodies, width, height, padding = 60) {
  bodies.forEach((body) => {
    let { x, y } = body.position
    let vx = body.velocity.x
    let vy = body.velocity.y
    let clamped = false

    if (x < padding)         { x = padding;         vx = Math.abs(vx) * 0.5; clamped = true }
    if (x > width - padding) { x = width - padding; vx = -Math.abs(vx) * 0.5; clamped = true }
    if (y < padding)         { y = padding;         vy = Math.abs(vy) * 0.5; clamped = true }
    if (y > height - padding){ y = height - padding;vy = -Math.abs(vy) * 0.5; clamped = true }

    if (clamped) {
      Body.setPosition(body, { x, y })
      Body.setVelocity(body, { x: vx, y: vy })
    }
  })
}
