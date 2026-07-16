import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'

// Anchored at the kitchen stove (back-left corner) so the fire reads as coming
// straight off the burners the player clicked.
const STOVE = [-1.78, -1.45] // [x, z]
const TV_BACK = [-1.15, -0.9]
const FLAMES = [
  { position: [STOVE[0], 1.35, STOVE[1]], delay: 0, size: 1.2 },
  { position: [STOVE[0] - 0.22, 1.45, STOVE[1] + 0.12], delay: 0, size: 1 },
  { position: [STOVE[0] + 0.22, 1.32, STOVE[1] - 0.1], delay: 0, size: 1.08 },
  { position: [TV_BACK[0] - 0.32, 0.76, TV_BACK[1]], delay: 1.05, size: 0.82 },
  { position: [TV_BACK[0] + 0.12, 0.9, TV_BACK[1] - 0.04], delay: 1.2, size: 0.72 },
  { position: [TV_BACK[0] + 0.4, 0.7, TV_BACK[1]], delay: 1.35, size: 0.62 },
]

/**
 * Cartoon fire at the kitchen corner: emissive cones that flicker in scale,
 * an orange point light, and grey smoke puffs drifting up.
 */
export default function Fire() {
  const reduced = useGameStore((s) => !!s.preventions.fire)
  const flamesRef = useRef([])
  const lightRef = useRef()
  const burstRef = useRef()
  const sparkRefs = useRef([])
  const ageRef = useRef(0)
  const smoke = useMemo(
    () =>
      Array.from({ length: reduced ? 7 : 14 }, (_, i) => ({
        offset: i * 0.5,
        x:
          !reduced && i % 3 === 0
            ? TV_BACK[0] + (((i * 31) % 7) - 3) * 0.08
            : STOVE[0] + (((i * 37) % 11) - 5) * 0.07,
        z:
          !reduced && i % 3 === 0
            ? TV_BACK[1]
            : STOVE[1] + (((i * 53) % 9) - 4) * 0.075,
      })),
    [reduced]
  )
  const sparks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2
        const speed = 0.8 + (i % 4) * 0.22
        return {
          velocity: [Math.cos(angle) * speed, 1.65 + (i % 3) * 0.34, Math.sin(angle) * speed],
        }
      }),
    []
  )
  const smokeRefs = useRef([])

  useFrame(({ clock }, delta) => {
    ageRef.current += delta
    const age = ageRef.current
    const t = clock.elapsedTime
    const burst = age < 0.9 ? Math.sin((age / 0.9) * Math.PI) : 0

    flamesRef.current.forEach((f, i) => {
      if (!f) return
      const flame = FLAMES[i]
      const spreadFlame = flame.delay > 0
      const localAge = age - flame.delay
      const enabled = !spreadFlame || !reduced
      f.visible = enabled && localAge >= 0
      if (!f.visible) return
      const grow = spreadFlame ? Math.min(1, localAge / 0.48) : 1
      const spreadBurst = spreadFlame && localAge < 0.7
        ? Math.sin((localAge / 0.7) * Math.PI) * 0.55
        : 0
      const s = 1 + Math.sin(t * 12 + i * 2) * 0.25
      const base = flame.size * grow * (reduced ? 0.72 : 1)
      f.scale.set(
        base * s * (1 + burst * 0.9 + spreadBurst),
        base * (1 + Math.sin(t * 9 + i) * 0.35) * (1 + burst * 1.55 + spreadBurst),
        base * s * (1 + burst * 0.9 + spreadBurst)
      )
    })
    if (lightRef.current) {
      const severity = reduced ? 0.58 : 1
      lightRef.current.intensity = (8 + Math.sin(t * 15) * 2.5 + burst * 14) * severity
    }
    if (burstRef.current) {
      const progress = Math.min(1, age / 0.72)
      burstRef.current.visible = progress < 1
      burstRef.current.scale.setScalar(0.2 + progress * (reduced ? 1.65 : 2.8))
      burstRef.current.material.opacity = (reduced ? 0.32 : 0.56) * (1 - progress)
    }

    sparkRefs.current.forEach((spark, i) => {
      if (!spark) return
      const [vx, vy, vz] = sparks[i].velocity
      spark.visible = age < 1.05
      spark.position.set(vx * age, vy * age - 2.2 * age * age, vz * age)
      spark.rotation.set(age * (4 + (i % 3)), age * (6 + (i % 4)), age * 5)
      spark.scale.setScalar(Math.max(0.15, 1 - age * 0.75))
      spark.material.opacity = Math.max(0, 1 - age / 1.05)
    })

    smokeRefs.current.forEach((m, i) => {
      if (!m) return
      const cycle = ((age + smoke[i].offset) % 2.5) / 2.5
      m.position.y = 1.5 + cycle * 2.4
      m.material.opacity = (reduced ? 0.38 : 0.64) * (1 - cycle)
      m.scale.setScalar((reduced ? 0.18 : 0.28) + cycle * (reduced ? 0.48 : 0.72))
    })
  })

  return (
    <group>
      {FLAMES.map((flame, i) => (
        <mesh key={i} position={flame.position} ref={(el) => (flamesRef.current[i] = el)}>
          <coneGeometry args={[0.28, 0.9, 8]} />
          <meshStandardMaterial
            color="#ff7a1a"
            emissive="#ff5500"
            emissiveIntensity={2}
          />
        </mesh>
      ))}
      <pointLight ref={lightRef} position={[STOVE[0], 1.7, STOVE[1]]} color="#ff6a00" distance={8} />
      <mesh ref={burstRef} position={[STOVE[0], 1.38, STOVE[1]]}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial
          color="#ffb21c"
          emissive="#ff4d00"
          emissiveIntensity={3}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
      <group position={[STOVE[0], 1.28, STOVE[1]]}>
        {sparks.map((_, i) => (
          <mesh key={i} ref={(element) => (sparkRefs.current[i] = element)}>
            <boxGeometry args={[0.045, 0.12, 0.045]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? '#ffd45a' : '#ff7a1a'}
              emissive="#ff4d00"
              emissiveIntensity={2.5}
              transparent
              opacity={1}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      {smoke.map((s, i) => (
        <mesh key={i} position={[s.x, 1.5, s.z]} ref={(el) => (smokeRefs.current[i] = el)}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color="#666" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  )
}
