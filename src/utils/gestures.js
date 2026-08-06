/**
 * gestures.js — Classify hand gestures from MediaPipe Landmarks
 *
 * Landmark indices (MediaPipe Hands):
 *   0  = WRIST
 *   4  = THUMB_TIP
 *   8  = INDEX_FINGER_TIP
 *   12 = MIDDLE_FINGER_TIP
 *   16 = RING_FINGER_TIP
 *   20 = PINKY_TIP
 *   5  = INDEX_MCP (knuckle)
 *   9  = MIDDLE_MCP
 *   13 = RING_MCP
 *   17 = PINKY_MCP
 */

/**
 * Euclidean distance between two landmarks
 */
export function landmarkDist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

/**
 * Detect if a finger is extended (tip above pip joint in image coords)
 * MediaPipe: y increases downward, so tip.y < pip.y means extended
 */
function isFingerExtended(landmarks, tipIdx, pipIdx) {
  return landmarks[tipIdx].y < landmarks[pipIdx].y
}

/**
 * Classify gesture from 21 landmarks.
 * Returns: 'open' | 'pinch' | 'swipe' | 'none'
 */
export function classifyGesture(landmarks, prevLandmarks = null) {
  if (!landmarks || landmarks.length < 21) return 'none'

  const thumb = landmarks[4]
  const index = landmarks[8]
  const middle = landmarks[12]
  const ring   = landmarks[16]
  const pinky  = landmarks[20]
  const wrist  = landmarks[0]

  // ── Pinch: thumb tip close to index tip ──────────────────────────
  const pinchDist = landmarkDist(thumb, index)
  if (pinchDist < 0.06) return 'pinch'

  // ── Open palm: all 4 fingers extended ────────────────────────────
  const indexExt  = isFingerExtended(landmarks, 8,  6)
  const middleExt = isFingerExtended(landmarks, 12, 10)
  const ringExt   = isFingerExtended(landmarks, 16, 14)
  const pinkyExt  = isFingerExtended(landmarks, 20, 18)

  const extCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length

  if (extCount >= 3) {
    // ── Swipe: open hand with significant horizontal velocity ────────
    if (prevLandmarks && prevLandmarks.length === 21) {
      const dx = landmarks[0].x - prevLandmarks[0].x  // wrist movement
      if (Math.abs(dx) > 0.025) return 'swipe'
    }
    return 'open'
  }

  return 'none'
}

/**
 * Get palm center (average of palm base landmarks)
 */
export function getPalmCenter(landmarks) {
  if (!landmarks || landmarks.length < 21) return null
  const indices = [0, 5, 9, 13, 17]
  const sum = indices.reduce((acc, i) => ({
    x: acc.x + landmarks[i].x,
    y: acc.y + landmarks[i].y,
  }), { x: 0, y: 0 })
  return { x: sum.x / indices.length, y: sum.y / indices.length }
}

/**
 * Get index finger tip position (normalized 0-1)
 */
export function getIndexTip(landmarks) {
  if (!landmarks || landmarks.length < 21) return null
  return { x: landmarks[8].x, y: landmarks[8].y }
}

/**
 * Get swipe direction from landmark delta
 */
export function getSwipeDirection(landmarks, prevLandmarks) {
  if (!prevLandmarks) return null
  const dx = landmarks[0].x - prevLandmarks[0].x
  const dy = landmarks[0].y - prevLandmarks[0].y
  return { dx: dx * 40, dy: dy * 40 } // amplify for physics impulse
}
