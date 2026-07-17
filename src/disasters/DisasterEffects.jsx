import { lazy, Suspense, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import WaterLeak from './WaterLeak'

const EFFECT_LOADERS = {
  hail: () => import('./Hail'),
  fire: () => import('./Fire'),
  electrical: () => import('./ElectricalFault'),
}

const EFFECTS = {
  hail: lazy(EFFECT_LOADERS.hail),
  fire: lazy(EFFECT_LOADERS.fire),
  electrical: lazy(EFFECT_LOADERS.electrical),
}

const preloadDisasterEffects = () =>
  Promise.allSettled(Object.values(EFFECT_LOADERS).map((loadEffect) => loadEffect()))

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
export default function DisasterEffects() {
  const triggered = useGameStore((s) => s.triggered)

  useEffect(() => {
    const warmEffects = () => {
      preloadDisasterEffects()
      window.removeEventListener('pointerdown', warmEffects)
      window.removeEventListener('keydown', warmEffects)
    }

    window.addEventListener('pointerdown', warmEffects)
    window.addEventListener('keydown', warmEffects)
    return () => {
      window.removeEventListener('pointerdown', warmEffects)
      window.removeEventListener('keydown', warmEffects)
    }
  }, [])

  return (
    <>
      {/* Keep the mesh-heavy water effect warm so clicking the valve only
          starts animation instead of constructing its geometry mid-action. */}
      <WaterLeak active={!!triggered.water} />
      {Object.keys(triggered).map((id) => {
        if (id === 'water') return null
        const Effect = EFFECTS[id]
        return Effect ? (
          <Suspense key={id} fallback={null}>
            <Effect />
          </Suspense>
        ) : null
      })}
    </>
  )
}
