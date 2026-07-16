import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const FLAME_POS = [
  [1.4, 2.6, 0.8],
  [1.0, 2.7, 1.0],
  [1.6, 2.5, 1.2],
]

/**
 * Cartoon fire at the kitchen corner: emissive cones that flicker in scale,
 * an orange point light, and grey smoke puffs drifting up.
 */
export default function Fire() {
  const flamesRef = useRef([])
  const lightRef = useRef()
  const smoke = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        offset: i * 0.5,
        x: 1.3 + (Math.random() - 0.5) * 0.6,
        z: 1.0 + (Math.random() - 0.5) * 0.6,
      })),
    []
  )
  const smokeRefs = useRef([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    flamesRef.current.forEach((f, i) => {
      if (!f) return
      const s = 1 + Math.sin(t * 12 + i * 2) * 0.25
      f.scale.set(s, 1 + Math.sin(t * 9 + i) * 0.35, s)
    })
    if (lightRef.current) {
      lightRef.current.intensity = 6 + Math.sin(t * 15) * 2
    }
    smokeRefs.current.forEach((m, i) => {
      if (!m) return
      const cycle = ((t + smoke[i].offset) % 2.5) / 2.5
      m.position.y = 2.9 + cycle * 2.5
      m.material.opacity = 0.5 * (1 - cycle)
      m.scale.setScalar(0.2 + cycle * 0.5)
    })
  })

  return (
    <group>
      {FLAME_POS.map((p, i) => (
        <mesh key={i} position={p} ref={(el) => (flamesRef.current[i] = el)}>
          <coneGeometry args={[0.25, 0.8, 8]} />
          <meshStandardMaterial
            color="#ff7a1a"
            emissive="#ff5500"
            emissiveIntensity={2}
          />
        </mesh>
      ))}
      <pointLight ref={lightRef} position={[1.3, 3, 1]} color="#ff6a00" distance={8} />
      {smoke.map((s, i) => (
        <mesh key={i} position={[s.x, 3, s.z]} ref={(el) => (smokeRefs.current[i] = el)}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#666" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  )
}
