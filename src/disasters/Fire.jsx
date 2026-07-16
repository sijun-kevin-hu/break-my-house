import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'

// Anchored at the kitchen stove (back-left corner) so the fire reads as coming
// straight off the burners the player clicked.
const STOVE = [-1.78, -1.45] // [x, z]
const TV = [-2.35, 0.45]
const FLAMES = [
  { position: [STOVE[0], 1.35, STOVE[1]], delay: 0, size: 1.2 },
  { position: [STOVE[0] - 0.22, 1.45, STOVE[1] + 0.12], delay: 0, size: 1 },
  { position: [STOVE[0] + 0.22, 1.32, STOVE[1] - 0.1], delay: 0, size: 1.08 },
  { position: [-0.58, 1.15, -1.42], delay: 0.72, size: 0.7 },
  { position: [-0.28, 1.08, -1.42], delay: 0.92, size: 0.62 },
  { position: [TV[0] + 0.18, 0.76, TV[1] - 0.42], delay: 1.25, size: 0.82 },
  { position: [TV[0] + 0.2, 0.9, TV[1]], delay: 1.42, size: 0.72 },
  { position: [TV[0] + 0.18, 0.7, TV[1] + 0.4], delay: 1.6, size: 0.62 },
  { position: [1.72, 1.05, -1.42], delay: 2.05, size: 0.72 },
  { position: [1.93, 1.55, -1.42], delay: 2.22, size: 0.58 },
  { position: [-0.58, 0.84, 0.42], delay: 2.55, size: 0.8 },
  { position: [-0.52, 0.74, 0.92], delay: 2.78, size: 0.62 },
  { position: [1.18, 0.92, 0.55], delay: 3.05, size: 0.75 },
  { position: [1.48, 0.78, 0.55], delay: 3.22, size: 0.58 },
  { position: [2.48, 1.05, -0.12], delay: 3.5, size: 0.66 },
]

const SPREAD_LIGHTS = [
  { position: [-0.45, 1.55, -1.4], delay: 0.72, distance: 4.2 },
  { position: [TV[0], 1.35, TV[1]], delay: 1.25, distance: 4.4 },
  { position: [1.72, 1.65, -1.42], delay: 2.05, distance: 4.1 },
  { position: [-0.55, 1.5, 0.68], delay: 2.55, distance: 4.4 },
  { position: [1.2, 1.5, 0.55], delay: 3.05, distance: 4.2 },
  { position: [2.45, 1.6, -0.12], delay: 3.5, distance: 3.8 },
]

/**
 * Choreographed interior fire: the stove bursts first, then the counter, TV,
 * fridge, living area, and east wall ignite in a readable sequence. Prevention
 * stops that sequence at the stove and leaves only a small contained event.
 */
export default function Fire() {
  const reduced = useGameStore((s) => !!s.preventions.fire)
  const flamesRef = useRef([])
  const lightRef = useRef()
  const burstRef = useRef()
  const sparkRefs = useRef([])
  const spreadLightRefs = useRef([])
  const ageRef = useRef(0)
  const smoke = useMemo(
    () =>
      Array.from({ length: reduced ? 7 : 26 }, (_, i) => {
        const source = FLAMES[reduced ? i % 3 : (i * 5) % FLAMES.length]
        return {
          offset: i * 0.43,
          x: source.position[0] + (((i * 31) % 7) - 3) * 0.09,
          z: source.position[2] + (((i * 53) % 9) - 4) * 0.08,
          y: source.position[1],
          delay: source.delay,
        }
      }),
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
    spreadLightRefs.current.forEach((light, index) => {
      if (!light) return
      const localAge = age - SPREAD_LIGHTS[index].delay
      const progress = Math.min(1, Math.max(0, localAge / 0.45))
      light.intensity = reduced
        ? 0
        : progress * (1.45 + Math.sin(t * 11 + index) * 0.38)
    })
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
      const localAge = age - smoke[i].delay
      m.visible = localAge >= 0
      if (!m.visible) return
      const cycle = ((localAge + smoke[i].offset) % 2.5) / 2.5
      m.position.y = smoke[i].y + 0.16 + cycle * 2.4
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
      {SPREAD_LIGHTS.map((light, index) => (
        <pointLight
          key={`spread-light-${index}`}
          ref={(el) => (spreadLightRefs.current[index] = el)}
          position={light.position}
          color="#ff6200"
          distance={light.distance}
          intensity={0}
        />
      ))}
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
