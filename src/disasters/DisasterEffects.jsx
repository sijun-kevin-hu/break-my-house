import { useGameStore } from '../store/useGameStore'
import Hail from './Hail'
import Fire from './Fire'

/**
 * Mounts a visual effect for every triggered disaster. Effects stay mounted —
 * and keep animating — until the player resets the house, so damage lingers on
 * screen. Effects never take control of the camera, leaving orbit input
 * responsive throughout the impact.
 *
 * The fallen tree is a scene object (BackyardTree) rather than an effect here,
 * because it needs to exist standing (and be clickable) before it's triggered.
 *
 * Adding a disaster: add its component here + content in src/data/disasters.js.
 */
const EFFECTS = {
  hail: Hail,
  fire: Fire,
}

export default function DisasterEffects() {
  const triggered = useGameStore((s) => s.triggered)
  return (
    <>
      {Object.keys(triggered).map((id) => {
        const Effect = EFFECTS[id]
        return Effect ? <Effect key={id} /> : null
      })}
    </>
  )
}
