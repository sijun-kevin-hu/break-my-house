import { CameraShake } from '@react-three/drei'
import { useGameStore } from '../store/useGameStore'
import Hail from './Hail'
import Fire from './Fire'

/**
 * Mounts a visual effect for every triggered disaster. Effects stay mounted —
 * and keep animating — until the player resets the house, so damage lingers on
 * screen. The camera shakes only while a fresh disaster is still impacting.
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
  const impacts = useGameStore((s) => s.impacts)

  return (
    <>
      {Object.keys(triggered).map((id) => {
        const Effect = EFFECTS[id]
        return Effect ? <Effect key={id} /> : null
      })}
      {impacts > 0 && <CameraShake intensity={0.4} />}
    </>
  )
}
