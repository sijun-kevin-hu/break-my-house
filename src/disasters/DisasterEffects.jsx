import { useGameStore } from '../store/useGameStore'
import Hail from './Hail'
import Fire from './Fire'
import WaterLeak from './WaterLeak'
import ElectricalFault from './ElectricalFault'

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
  water: WaterLeak,
  electrical: ElectricalFault,
}

export default function DisasterEffects() {
  const triggered = useGameStore((s) => s.triggered)
  return (
    <>
      {/* Keep the mesh-heavy water effect warm so clicking the valve only
          starts animation instead of constructing its geometry mid-action. */}
      <WaterLeak active={!!triggered.water} />
      {Object.keys(triggered).map((id) => {
        if (id === 'water') return null
        const Effect = EFFECTS[id]
        return Effect ? <Effect key={id} /> : null
      })}
    </>
  )
}
