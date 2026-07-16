import { CameraShake } from '@react-three/drei'
import { useGameStore } from '../store/useGameStore'
import Hail from './Hail'
import Fire from './Fire'
import FallenTree from './FallenTree'

/**
 * Mounts the visual effect for the active disaster.
 * Adding a disaster: add its component here + content in src/data/disasters.js.
 * Effects unmount automatically when the store flips back to aftermath.
 */
const EFFECTS = {
  hail: Hail,
  fire: Fire,
  tree: FallenTree,
}

export default function DisasterEffects() {
  const activeDisaster = useGameStore((s) => s.activeDisaster)
  const damage = useGameStore((s) => s.damage)
  const Effect = activeDisaster ? EFFECTS[activeDisaster] : null

  return (
    <>
      {Effect && <Effect />}
      {activeDisaster && <CameraShake intensity={0.4} />}
      {/* Fallen tree stays down after the tree disaster resolves */}
      {damage.tree && !activeDisaster && <FallenTree settled />}
    </>
  )
}
