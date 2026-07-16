import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

// The bathroom fixture lives in the attached bedroom wing. Keeping this event
// outside House.jsx makes the spray visual-only; the fixture remains the object
// that owns the click interaction.
const LEAK_ORIGIN = [8.68, 0.72, -1.55]

/** Deterministic supply-line burst: a short spray resolves into persistent water damage. */
export default function WaterLeak() {
  const reduced = useGameStore((s) => !!s.preventions.water)
  const ageRef = useRef(0)
  const dropletRefs = useRef([])
  const puddleRefs = useRef([])
  const stainRef = useRef()
  const stainMatRef = useRef()
  const lightRef = useRef()

  const droplets = useMemo(
    () =>
      Array.from({ length: reduced ? 10 : 30 }, (_, index) => ({
        phase: (index * 0.173) % 1,
        reach: 0.55 + (index % 7) * 0.1,
        height: 0.72 + (index % 5) * 0.11,
        lateral: ((index * 29) % 9 - 4) * 0.055,
        size: 0.025 + (index % 4) * 0.009,
      })),
    [reduced]
  )

  useFrame((state, delta) => {
    ageRef.current += delta
    const age = ageRef.current
    const sprayDuration = reduced ? 0.85 : 2.65

    dropletRefs.current.forEach((drop, index) => {
      if (!drop) return
      const data = droplets[index]
      const active = age < sprayDuration
      drop.visible = active
      if (!active) return

      const cycle = ((age * 1.9 + data.phase) % 1)
      drop.position.set(
        -cycle * data.reach,
        cycle * data.height - cycle * cycle * 0.92,
        data.lateral * (0.4 + cycle)
      )
      const stretch = 1 + cycle * 2.2
      drop.scale.set(data.size, data.size * stretch, data.size)
      drop.material.opacity = 0.92 - cycle * 0.36
    })

    const grow = THREE.MathUtils.smootherstep(age / (reduced ? 0.9 : 2.15), 0, 1)
    const targetScales = reduced
      ? [[0.52, 0.3], [0.26, 0.17], [0, 0]]
      : [[1.52, 0.88], [0.92, 0.58], [0.68, 0.42]]
    puddleRefs.current.forEach((puddle, index) => {
      if (!puddle) return
      const [x, z] = targetScales[index]
      puddle.visible = x > 0
      puddle.scale.set(Math.max(0.02, x * grow), Math.max(0.02, z * grow), 1)
      puddle.material.opacity = (index === 0 ? 0.66 : 0.42) * grow
    })

    const stainTarget = reduced ? 0.12 : THREE.MathUtils.smootherstep((age - 0.7) / 2.1, 0, 1)
    if (stainRef.current) {
      stainRef.current.scale.set(0.05 + stainTarget * 0.72, 0.05 + stainTarget * 1.02, 1)
    }
    if (stainMatRef.current) stainMatRef.current.opacity = stainTarget * (reduced ? 0.28 : 0.62)
    if (lightRef.current) {
      const pulse = age < sprayDuration ? 1 + Math.sin(state.clock.elapsedTime * 13) * 0.18 : 0
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, pulse, 7, delta)
    }
  })

  return (
    <group>
      <group position={LEAK_ORIGIN}>
        {droplets.map((drop, index) => (
          <mesh key={index} ref={(element) => (dropletRefs.current[index] = element)}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshStandardMaterial
              color="#79d8ef"
              emissive="#2f91bd"
              emissiveIntensity={0.38}
              transparent
              opacity={0.9}
              depthWrite={false}
            />
          </mesh>
        ))}
        <pointLight ref={lightRef} color="#8fe7ff" distance={3.2} intensity={0} />
      </group>

      {[
        [8.18, 0.151, -1.5, 0],
        [8.72, 0.152, -1.03, 0.45],
        [7.75, 0.15, -0.62, -0.36],
      ].map(([x, y, z, rotation], index) => (
        <mesh
          key={`puddle-${index}`}
          ref={(element) => (puddleRefs.current[index] = element)}
          position={[x, y, z]}
          rotation={[-Math.PI / 2, 0, rotation]}
          renderOrder={5}
        >
          <circleGeometry args={[1, 12]} />
          <meshStandardMaterial
            color={index === 0 ? '#2e9fc3' : '#68cbe2'}
            emissive="#1c6f8e"
            emissiveIntensity={0.12}
            transparent
            opacity={0}
            depthWrite={false}
            roughness={0.25}
          />
        </mesh>
      ))}

      {/* Damp drywall aftermath on the wing's east wall. */}
      <mesh
        ref={stainRef}
        position={[9.555, 0.82, -1.55]}
        rotation={[0, -Math.PI / 2, 0]}
        renderOrder={4}
      >
        <circleGeometry args={[1, 12]} />
        <meshStandardMaterial
          ref={stainMatRef}
          color="#477f86"
          transparent
          opacity={0}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
    </group>
  )
}
