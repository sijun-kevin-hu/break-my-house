import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { DISASTERS } from '../data/disasters'

// The bathroom fixture lives in the attached bedroom wing. Keeping this event
// outside House.jsx makes the spray visual-only; the fixture remains the object
// that owns the click interaction.
const LEAK_ORIGIN = [8.27, 0.38, -2.48]
const WATER_CONFIG = DISASTERS.water
const FULL_PUDDLE_TIMINGS = [
  [0, 0.65],
  [0.18, 0.82],
  [0.42, 1],
  [0.72, 1.15],
]
const REDUCED_PUDDLE_TIMINGS = [[0, 0.72]]

/** Deterministic supply-line burst: an extended spray resolves into persistent water damage. */
export default function WaterLeak({ active = false }) {
  const reduced = useGameStore((s) => !!s.preventions.water)
  const ageRef = useRef(0)
  const wasActiveRef = useRef(false)
  const dropletRefs = useRef([])
  const jetRefs = useRef([])
  const puddleRefs = useRef([])
  const puddleRimMatRefs = useRef([])
  const stainRef = useRef()
  const stainMatRef = useRef()
  const lightRef = useRef()

  const droplets = useMemo(
    () =>
      Array.from({ length: reduced ? 12 : 64 }, (_, index) => ({
        phase: (index * 0.173) % 1,
        reach: 0.72 + (index % 9) * 0.13,
        height: 0.9 + (index % 6) * 0.13,
        lateral: ((index * 29) % 13 - 6) * 0.06,
        size: 0.03 + (index % 5) * 0.008,
      })),
    [reduced]
  )

  useFrame((state, delta) => {
    if (!active) {
      ageRef.current = 0
      wasActiveRef.current = false
      if (lightRef.current) lightRef.current.intensity = 0
      return
    }

    if (!wasActiveRef.current) {
      ageRef.current = 0
      wasActiveRef.current = true
    }

    // Cap a single long frame so a transient browser hitch cannot skip the
    // opening beat. The effect still starts on the first frame after click.
    ageRef.current += Math.min(delta, 0.05)
    const age = ageRef.current
    const sprayActive = reduced
      ? age < WATER_CONFIG.sprayDurationReduced
      : WATER_CONFIG.sprayPersistsUntilReset
    const jetAttack = THREE.MathUtils.smootherstep(age / 0.14, 0, 1)

    jetRefs.current.forEach((jet, index) => {
      if (!jet) return
      jet.visible = sprayActive
      if (!sprayActive) return
      const pulse = 0.97 + Math.sin(state.clock.elapsedTime * 14 + index * 1.7) * 0.05
      jet.scale.set(1, (0.06 + jetAttack * 0.94) * pulse, 1)
      const material = jet.children[0]?.material
      if (material) {
        material.opacity = jetAttack * ((reduced ? 0.56 : 0.78) + Math.sin(age * 11 + index) * 0.04)
      }
    })

    dropletRefs.current.forEach((drop, index) => {
      if (!drop) return
      const data = droplets[index]
      const launchDelay = Math.min(index, 18) * 0.008
      const launched = age >= launchDelay
      drop.visible = sprayActive && launched
      if (!sprayActive || !launched) return

      const dropAge = age - launchDelay
      const cycle = ((dropAge * 2.45 + data.phase) % 1)
      drop.position.set(
        data.lateral * (0.42 + cycle),
        cycle * data.height - cycle * cycle * (data.height + 0.2),
        cycle * data.reach
      )
      const stretch = 1.2 + cycle * 3.2
      const dropAttack = THREE.MathUtils.smootherstep(dropAge / 0.1, 0, 1)
      drop.scale.set(data.size * dropAttack, data.size * stretch * dropAttack, data.size * dropAttack)
      drop.material.opacity = (0.92 - cycle * 0.36) * dropAttack
    })

    const targetScales = reduced
      ? [[0.48, 0.42], [0, 0], [0, 0], [0, 0]]
      : [[0.62, 0.5], [0.68, 0.75], [0.66, 0.7], [0.58, 0.6]]
    const puddleTimings = reduced ? REDUCED_PUDDLE_TIMINGS : FULL_PUDDLE_TIMINGS
    puddleRefs.current.forEach((puddle, index) => {
      if (!puddle) return
      const [x, z] = targetScales[index]
      puddle.visible = x > 0
      if (x <= 0) return

      const [delay, duration] = puddleTimings[index]
      const linearProgress = THREE.MathUtils.clamp((age - delay) / duration, 0, 1)
      const spread = 1 - Math.pow(1 - linearProgress, 3)
      const settleRipple =
        Math.sin(linearProgress * Math.PI * 2.5) * 0.045 * (1 - linearProgress)
      const easedScale = Math.max(0.045, spread + settleRipple)
      puddle.scale.set(x * easedScale, 1, z * easedScale)
      if (puddleRimMatRefs.current[index]) {
        const rimReveal = THREE.MathUtils.smootherstep(linearProgress / 0.45, 0, 1)
        puddleRimMatRefs.current[index].opacity = (index === 0 ? 0.98 : 0.82) * rimReveal
      }
    })

    const stainTarget = reduced
      ? 0.12
      : THREE.MathUtils.smootherstep((age - 1.1) / 4.6, 0, 1)
    if (stainRef.current) {
      stainRef.current.scale.set(0.05 + stainTarget * 0.72, 0.05 + stainTarget * 1.02, 1)
    }
    if (stainMatRef.current) stainMatRef.current.opacity = stainTarget * (reduced ? 0.28 : 0.62)
    if (lightRef.current) {
      const pulse = sprayActive
        ? (reduced ? 0.75 : 2.2) + Math.sin(state.clock.elapsedTime * 13) * 0.3
        : 0
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, pulse, 7, delta)
    }
  })

  const jetCount = reduced ? 1 : 3

  return (
    // A zero-scale idle state still lets Three compile these materials before
    // the valve is clicked, avoiding the mount-time hitch of the old effect.
    <group scale={active ? 1 : 0}>
      <group position={LEAK_ORIGIN}>
        {Array.from({ length: jetCount }, (_, index) => (
          <group
            key={`jet-${index}`}
            ref={(element) => (jetRefs.current[index] = element)}
            position={[(index - (jetCount - 1) / 2) * 0.07, index * 0.025, 0]}
            rotation={[1.32, 0, (index - (jetCount - 1) / 2) * 0.045]}
            scale={[1, 0.06, 1]}
          >
            {/* Scaling the parent keeps the near end pinned to the valve. */}
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.025 + index * 0.006, 0.052, 1, 7]} />
              <meshStandardMaterial
                color="#92e6f7"
                emissive="#318fb8"
                emissiveIntensity={0.5}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
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
        <pointLight ref={lightRef} color="#8fe7ff" distance={4.5} intensity={0} />
      </group>

      {[
        // All four bodies sit in the open bathroom aisle. The old first body
        // overlapped the vanity, hiding most of the protected outcome.
        [8.3, 0.22, -1.95, 0],
        [8.34, 0.222, -1.35, 0.12],
        [8.33, 0.224, -0.55, 0.28],
        [8.18, 0.226, 0.08, -0.18],
      ].map(([x, y, z, rotation], index) => (
        <group
          key={`puddle-${index}`}
          ref={(element) => (puddleRefs.current[index] = element)}
          position={[x, y, z]}
          rotation={[0, rotation, 0]}
          scale={[0.045, 1, 0.045]}
        >
          <mesh renderOrder={5}>
            <cylinderGeometry args={[1, 1, 0.08, 18]} />
            <meshBasicMaterial
              color={index === 0 ? '#052f45' : '#0a526d'}
            />
          </mesh>
          <mesh position={[0, 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
            <ringGeometry args={[0.82, 1.04, 24]} />
            <meshBasicMaterial
              ref={(material) => (puddleRimMatRefs.current[index] = material)}
              color="#c9f5ff"
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={[-0.18, 0.044, -0.16]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={7}
          >
            <circleGeometry args={[0.16, 12]} />
            <meshBasicMaterial
              color="#effdff"
              transparent
              opacity={index === 0 ? 0.52 : 0.36}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Damp drywall aftermath directly behind the vanity on the south wall. */}
      <mesh
        ref={stainRef}
        position={[8.22, 0.82, -3.345]}
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
