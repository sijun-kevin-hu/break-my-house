import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

const STRIP_ORIGIN = new THREE.Vector3(3.8, 0.36, 2.7)
const NOOP_RAYCAST = () => {}

const ARC_PATHS = [
  { delay: 0, duration: 0.34, points: [[3.8, 0.37, 2.7], [3.68, 0.58, 2.62], [3.86, 0.78, 2.73]] },
  { delay: 0.12, duration: 0.38, points: [[3.77, 0.36, 2.55], [3.95, 0.52, 2.48], [3.73, 0.72, 2.4]] },
  { delay: 0.24, duration: 0.42, points: [[3.83, 0.36, 2.86], [3.62, 0.55, 3.02], [3.93, 0.7, 3.08]] },
  { delay: 0.46, duration: 0.64, fullOnly: true, points: [[3.78, 0.4, 2.62], [3.48, 0.68, 2.56], [3.12, 0.92, 2.55]] },
  { delay: 0.68, duration: 0.7, fullOnly: true, points: [[3.1, 0.9, 2.55], [2.98, 1.2, 2.43], [2.94, 1.5, 2.28]] },
  { delay: 0.92, duration: 0.72, fullOnly: true, points: [[3.8, 0.42, 2.76], [4.18, 0.58, 2.86], [4.44, 0.42, 3.08]] },
  { delay: 1.16, duration: 0.74, fullOnly: true, points: [[3.77, 0.4, 2.68], [4.16, 0.34, 2.92], [4.68, 0.48, 3.02]] },
  { delay: 1.42, duration: 0.72, fullOnly: true, points: [[3.75, 0.4, 2.62], [3.4, 0.72, 2.46], [2.97, 1.05, 2.33]] },
  { delay: 1.04, duration: 0.82, fullOnly: true, points: [[3.84, 0.4, 2.84], [4.18, 0.94, 2.98], [4.18, 1.5, 3.02]] },
  { delay: 1.26, duration: 0.78, fullOnly: true, points: [[3.84, 0.4, 2.9], [4.36, 0.52, 3.12], [4.85, 0.62, 3.02]] },
  { delay: 1.5, duration: 0.68, fullOnly: true, points: [[3.76, 0.4, 2.54], [3.42, 0.65, 2.06], [3.2, 0.94, 1.78]] },
]

const SPREAD_BURSTS = [
  { position: [2.98, 1.54, 2.24], delay: 0.84, size: 0.58 },
  { position: [4.18, 1.52, 3.02], delay: 1.05, size: 0.52 },
  { position: [4.85, 0.62, 3.02], delay: 1.26, size: 0.62 },
  { position: [3.2, 0.96, 1.78], delay: 1.5, size: 0.48 },
  { position: [2.96, 1.96, 1.98], delay: 1.72, size: 0.72 },
]

const ELECTRICAL_FLAMES = [
  { position: [3.8, 0.42, 2.7], delay: 0.72, size: 0.48 },
  { position: [4.1, 0.38, 2.88], delay: 1.05, size: 0.38 },
  { position: [4.48, 0.39, 3.02], delay: 1.26, size: 0.42 },
  { position: [4.72, 0.48, 3.02], delay: 1.48, size: 0.52 },
  { position: [3.25, 0.58, 2.25], delay: 1.32, size: 0.36 },
  { position: [3.02, 1.12, 2.38], delay: 1.58, size: 0.46 },
  { position: [2.98, 1.62, 2.12], delay: 1.82, size: 0.54 },
  { position: [3.2, 0.98, 1.78], delay: 1.96, size: 0.34 },
]

const SPREAD_SCORCHES = [
  { position: [4.15, 0.167, 2.9], delay: 1.02, radius: 0.42, scale: [1.2, 0.54] },
  { position: [4.58, 0.168, 3.0], delay: 1.24, radius: 0.48, scale: [1.35, 0.5] },
  { position: [5.02, 0.169, 3.0], delay: 1.46, radius: 0.52, scale: [1.18, 0.62] },
  { position: [3.46, 0.17, 2.34], delay: 1.3, radius: 0.4, scale: [1.28, 0.48] },
  { position: [3.22, 0.171, 1.98], delay: 1.72, radius: 0.46, scale: [0.72, 1.2] },
]

function ArcTube({ path, index, arcRefs }) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(path.points.map((point) => new THREE.Vector3(...point))),
    [path]
  )

  return (
    <mesh
      ref={(element) => (arcRefs.current[index] = element)}
      visible={false}
      raycast={NOOP_RAYCAST}
      renderOrder={25}
    >
      <tubeGeometry args={[curve, 8, 0.018 + (index % 3) * 0.004, 5, false]} />
      <meshBasicMaterial
        color="#b8efff"
        transparent
        opacity={1}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/** Deterministic electrical arc, breaker-trip comparison, and persistent aftermath. */
export default function ElectricalFault() {
  const reduced = useGameStore((s) => !!s.preventions.electrical)
  const ageRef = useRef(0)
  const arcRefs = useRef([])
  const sparkRefs = useRef([])
  const smokeRefs = useRef([])
  const scorchMatRefs = useRef([])
  const spreadScorchMatRefs = useRef([])
  const debrisRefs = useRef([])
  const spreadBurstRefs = useRef([])
  const spreadLightRefs = useRef([])
  const flameRefs = useRef([])
  const burstRef = useRef()
  const lightRef = useRef()
  const emberLightRef = useRef()

  const sparks = useMemo(
    () => Array.from({ length: reduced ? 10 : 28 }, (_, index) => {
      const angle = (index / 28) * Math.PI * 2 + (index % 3) * 0.18
      const speed = 0.55 + (index % 7) * 0.11
      return {
        delay: (index % 6) * 0.025,
        velocity: [Math.cos(angle) * speed, 1.05 + (index % 5) * 0.19, Math.sin(angle) * speed],
        size: 0.018 + (index % 4) * 0.006,
      }
    }),
    [reduced]
  )
  const smoke = useMemo(
    () => Array.from({ length: reduced ? 3 : 24 }, (_, index) => {
      const sources = reduced
        ? [{ position: STRIP_ORIGIN, delay: 0.34 }]
        : [
          { position: STRIP_ORIGIN, delay: 0.62 },
          { position: new THREE.Vector3(2.98, 1.42, 2.25), delay: 0.9 },
          { position: new THREE.Vector3(4.18, 1.42, 3.02), delay: 1.12 },
          { position: new THREE.Vector3(4.85, 0.62, 3.02), delay: 1.34 },
          { position: new THREE.Vector3(3.2, 0.96, 1.78), delay: 1.58 },
        ]
      const source = sources[(index * 5) % sources.length]
      return {
        phase: (index * 0.37) % 1,
        x: source.position.x + ((index * 31) % 9 - 4) * 0.045,
        y: source.position.y,
        z: source.position.z + ((index * 47) % 11 - 5) * 0.035,
        delay: source.delay,
        size: 0.12 + (index % 4) * 0.035,
      }
    }),
    [reduced]
  )

  useFrame((state, delta) => {
    ageRef.current += Math.min(delta, 0.05)
    const age = ageRef.current
    const arcEnd = reduced ? 0.5 : 2.18

    arcRefs.current.forEach((arc, index) => {
      if (!arc) return
      const path = ARC_PATHS[index]
      const localAge = age - path.delay
      const enabled = !path.fullOnly || !reduced
      arc.visible = enabled && localAge >= 0 && localAge < path.duration && age < arcEnd
      if (!arc.visible) return
      arc.material.opacity = 0.45 + Math.abs(Math.sin(age * 68 + index * 2.7)) * 0.55
      arc.material.color.set(index % 3 === 0 ? '#dffaff' : '#72d9ff')
    })

    const burstStart = reduced ? 0.16 : 0.42
    const burstDuration = reduced ? 0.28 : 0.64
    const burstProgress = THREE.MathUtils.clamp((age - burstStart) / burstDuration, 0, 1)
    if (burstRef.current) {
      burstRef.current.visible = burstProgress > 0 && burstProgress < 1
      burstRef.current.scale.setScalar(0.08 + Math.sin(burstProgress * Math.PI) * (reduced ? 0.38 : 0.86))
      burstRef.current.material.opacity = Math.sin(burstProgress * Math.PI) * (reduced ? 0.48 : 0.82)
    }
    if (lightRef.current) {
      const active = age < arcEnd
      const flash = burstProgress > 0 && burstProgress < 1 ? Math.sin(burstProgress * Math.PI) * 13 : 0
      const crackle = active ? 2.4 + Math.max(0, Math.sin(age * 54)) * 4.2 : 0
      lightRef.current.intensity = reduced && age > 0.5 ? 0 : crackle + flash
    }
    if (emberLightRef.current) {
      const emberTarget = !reduced && age > 0.75 ? 0.65 + Math.sin(state.clock.elapsedTime * 4.5) * 0.12 : 0
      emberLightRef.current.intensity = THREE.MathUtils.damp(
        emberLightRef.current.intensity,
        emberTarget,
        6,
        delta
      )
    }

    spreadBurstRefs.current.forEach((burst, index) => {
      if (!burst) return
      const event = SPREAD_BURSTS[index]
      const progress = THREE.MathUtils.clamp((age - event.delay) / 0.46, 0, 1)
      burst.visible = !reduced && progress > 0 && progress < 1
      if (!burst.visible) return
      const pulse = Math.sin(progress * Math.PI)
      burst.scale.setScalar(0.05 + pulse * event.size)
      burst.material.opacity = pulse * 0.72
    })
    spreadLightRefs.current.forEach((light, index) => {
      if (!light) return
      const event = SPREAD_BURSTS[index]
      const progress = THREE.MathUtils.clamp((age - event.delay) / 0.46, 0, 1)
      light.intensity = reduced ? 0 : Math.sin(progress * Math.PI) * 8.5
    })
    flameRefs.current.forEach((flame, index) => {
      if (!flame) return
      const event = ELECTRICAL_FLAMES[index]
      const localAge = age - event.delay
      flame.visible = !reduced && localAge >= 0
      if (!flame.visible) return
      const growth = THREE.MathUtils.smootherstep(localAge / 0.5, 0, 1)
      const flicker = 1 + Math.sin(state.clock.elapsedTime * 13 + index * 1.8) * 0.2
      flame.scale.set(
        event.size * growth * flicker,
        event.size * growth * (1.35 + Math.sin(state.clock.elapsedTime * 10 + index) * 0.22),
        event.size * growth * flicker
      )
    })

    const sparkStart = reduced ? 0.12 : 0.38
    const sparkLife = reduced ? 0.42 : 0.9
    sparkRefs.current.forEach((spark, index) => {
      if (!spark) return
      const data = sparks[index]
      const localAge = age - sparkStart - data.delay
      spark.visible = localAge >= 0 && localAge < sparkLife
      if (!spark.visible) return
      const [vx, vy, vz] = data.velocity
      spark.position.set(
        STRIP_ORIGIN.x + vx * localAge,
        STRIP_ORIGIN.y + vy * localAge - 2.25 * localAge * localAge,
        STRIP_ORIGIN.z + vz * localAge
      )
      spark.rotation.set(localAge * 7, localAge * 9, localAge * 5)
      spark.material.opacity = 1 - localAge / sparkLife
    })

    smokeRefs.current.forEach((puff, index) => {
      if (!puff) return
      const data = smoke[index]
      const localAge = age - data.delay
      const smokeActive = localAge >= 0 && (!reduced || localAge < 1.05)
      puff.visible = smokeActive
      if (!smokeActive) return
      const cycle = ((localAge * 0.37 + data.phase) % 1)
      puff.position.set(
        data.x + Math.sin(cycle * Math.PI * 2 + index) * 0.06,
        data.y + 0.12 + cycle * 1.65,
        data.z
      )
      puff.scale.setScalar(data.size + cycle * (reduced ? 0.22 : 0.5))
      puff.material.opacity = (reduced ? 0.2 : 0.5) * (1 - cycle)
    })

    scorchMatRefs.current.forEach((material, index) => {
      if (!material) return
      const delay = index === 0 ? 0.5 : 0.78 + index * 0.12
      const target = age > delay
        ? (reduced ? (index === 0 ? 0.26 : 0.08) : index === 0 ? 0.96 : 0.78)
        : 0
      material.opacity = THREE.MathUtils.damp(material.opacity, target, 2.3, delta)
    })
    spreadScorchMatRefs.current.forEach((material, index) => {
      if (!material) return
      const target = !reduced && age > SPREAD_SCORCHES[index].delay ? 0.82 : 0
      material.opacity = THREE.MathUtils.damp(material.opacity, target, 2.1, delta)
    })
    debrisRefs.current.forEach((debris) => {
      if (debris) debris.visible = age > 0.78
    })
  })

  return (
    <group>
      {ARC_PATHS.map((path, index) => (
        <ArcTube key={`arc-${index}`} path={path} index={index} arcRefs={arcRefs} />
      ))}

      <mesh ref={burstRef} position={[3.8, 0.48, 2.7]} visible={false} renderOrder={24} raycast={NOOP_RAYCAST}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#e7fbff"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={lightRef} position={[3.8, 0.72, 2.7]} color="#a5ecff" distance={5.5} intensity={0} />
      <pointLight ref={emberLightRef} position={[3.64, 0.52, 2.62]} color="#ff6a2b" distance={2.4} intensity={0} />

      {SPREAD_BURSTS.map((event, index) => (
        <group key={`device-pop-${index}`} position={event.position}>
          <mesh
            ref={(element) => (spreadBurstRefs.current[index] = element)}
            visible={false}
            raycast={NOOP_RAYCAST}
            renderOrder={24}
          >
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial
              color={index % 2 ? '#d8f9ff' : '#83e4ff'}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            ref={(element) => (spreadLightRefs.current[index] = element)}
            color="#a9efff"
            distance={4}
            intensity={0}
          />
        </group>
      ))}

      {ELECTRICAL_FLAMES.map((event, index) => (
        <group
          key={`electrical-flame-${index}`}
          ref={(element) => (flameRefs.current[index] = element)}
          position={event.position}
          visible={false}
          raycast={NOOP_RAYCAST}
        >
          <mesh position={[0, 0.34, 0]} raycast={NOOP_RAYCAST}>
            <coneGeometry args={[0.24, 0.72, 7]} />
            <meshStandardMaterial color="#ff6b1e" emissive="#f13d00" emissiveIntensity={2.4} />
          </mesh>
          <mesh position={[0, 0.22, 0]} raycast={NOOP_RAYCAST}>
            <coneGeometry args={[0.13, 0.46, 7]} />
            <meshBasicMaterial color="#ffd45d" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {sparks.map((spark, index) => (
        <mesh key={`electrical-spark-${index}`} ref={(element) => (sparkRefs.current[index] = element)} visible={false} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[spark.size, spark.size * 3.4, spark.size]} />
          <meshBasicMaterial
            color={index % 3 === 0 ? '#f5fdff' : '#7bdfff'}
            transparent
            opacity={1}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {smoke.map((_, index) => (
        <mesh key={`electrical-smoke-${index}`} ref={(element) => (smokeRefs.current[index] = element)} visible={false} raycast={NOOP_RAYCAST}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={index % 3 === 0 ? '#27272b' : '#4b4b50'} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {/* Raised floor char centered on the strip; protected mode leaves only a small singe. */}
      <mesh position={[3.8, 0.166, 2.7]} rotation={[0, 0.35, 0]} scale={reduced ? [0.38, 1, 0.32] : [1.15, 1, 0.82]} renderOrder={22} raycast={NOOP_RAYCAST}>
        <cylinderGeometry args={[0.56, 0.52, 0.026, 10]} />
        <meshBasicMaterial
          ref={(material) => (scorchMatRefs.current[0] = material)}
          color="#100b09"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {SPREAD_SCORCHES.map((mark, index) => (
        <mesh
          key={`electrical-spread-scorch-${index}`}
          position={mark.position}
          rotation={[0, index * 0.42, 0]}
          scale={[mark.scale[0], 1, mark.scale[1]]}
          renderOrder={23 + index}
          raycast={NOOP_RAYCAST}
        >
          <cylinderGeometry args={[mark.radius, mark.radius * 0.94, 0.026, 9]} />
          <meshBasicMaterial
            ref={(material) => (spreadScorchMatRefs.current[index] = material)}
            color={index % 2 ? '#22100a' : '#100a08'}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Arc tracking climbs the wall toward the TV in the unprotected outcome. */}
      {[
        { position: [2.943, 0.82, 2.68], radius: 0.31, scale: [0.75, 1.25, 1] },
        { position: [2.945, 1.16, 2.48], radius: 0.38, scale: [0.7, 1.3, 1] },
        { position: [2.947, 1.5, 2.26], radius: 0.42, scale: [0.8, 1.2, 1] },
      ].map((mark, index) => (
        <mesh
          key={`electrical-wall-scorch-${index}`}
          position={mark.position}
          rotation={[0, Math.PI / 2, index * 0.36]}
          scale={reduced ? [0.35, 0.35, 0.35] : mark.scale}
          renderOrder={21 + index}
          raycast={NOOP_RAYCAST}
        >
          <circleGeometry args={[mark.radius, 11]} />
          <meshStandardMaterial
            ref={(material) => (scorchMatRefs.current[index + 1] = material)}
            color={index === 1 ? '#2a130d' : '#16100d'}
            transparent
            opacity={0}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ))}

      {!reduced && [
        [3.5, 0.19, 2.49, 0.24],
        [3.98, 0.18, 2.42, -0.3],
        [4.08, 0.18, 2.88, 0.52],
        [3.62, 0.19, 3.04, -0.18],
      ].map(([x, y, z, rotation], index) => (
        <mesh
          key={`melted-strip-debris-${index}`}
          ref={(element) => (debrisRefs.current[index] = element)}
          position={[x, y, z]}
          rotation={[0.3, rotation, 0.2]}
          visible={false}
          raycast={NOOP_RAYCAST}
          castShadow
        >
          <boxGeometry args={[0.08 + index * 0.01, 0.055, 0.18]} />
          <meshStandardMaterial color={index % 2 ? '#2a211d' : '#120f0e'} flatShading />
        </mesh>
      ))}
    </group>
  )
}
