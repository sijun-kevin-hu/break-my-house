import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

// Match the 34 × 34 terrain so the storm fills the whole playable yard, not
// just the house footprint. Instancing keeps the larger field inexpensive.
const COUNT = 1100
const AREA = 34
const TOP = 14
const ROOF_RUN = 3.18
const ROOF_BASE = 3.13
const ROOF_RISE = 1.45
const ROOF_SLOPE = Math.atan(ROOF_RISE / ROOF_RUN)
const WING_X_MIN = 2.8
const WING_X_MAX = 9.6
const WING_DEPTH = 6.8
const WING_ROOF_BASE = 2.42
const WING_ROOF_RISE = 1.12
const WING_ROOF_RUN = WING_DEPTH / 2 + 0.32
const WING_ROOF_SLOPE = Math.atan(WING_ROOF_RISE / WING_ROOF_RUN)
const IMPACT_CYCLE = 1.55
const ACCUMULATION_TIME = 5.6

const roofHeight = (x) =>
  ROOF_BASE + ROOF_RISE * (1 - Math.min(ROOF_RUN, Math.abs(x)) / ROOF_RUN) + 0.16

const CORE_IMPACTS = Array.from({ length: 14 }, (_, i) => {
  const x = -2.55 + ((i * 47) % 50) * 0.102
  const z = -1.82 + ((i * 31) % 35) * 0.105
  return {
    position: [x, roofHeight(x), z],
    rotation: [0, 0, x < 0 ? ROOF_SLOPE : -ROOF_SLOPE],
    delay: (i * 0.19) % IMPACT_CYCLE,
    radius: 0.18 + (i % 4) * 0.035,
  }
})

const wingRoofHeight = (z) =>
  WING_ROOF_BASE +
  WING_ROOF_RISE * (1 - Math.min(WING_ROOF_RUN, Math.abs(z)) / WING_ROOF_RUN) +
  0.16
const WING_IMPACTS = Array.from({ length: 12 }, (_, i) => {
  const x = 3.25 + ((i * 41) % 61) * 0.1
  const z = -3.05 + ((i * 37) % 57) * 0.105
  return {
    position: [x, wingRoofHeight(z), z],
    rotation: [z < 0 ? -WING_ROOF_SLOPE : WING_ROOF_SLOPE, 0, 0],
    delay: 0.22 + (i * 0.17) % IMPACT_CYCLE,
    radius: 0.17 + (i % 4) * 0.032,
  }
})
const IMPACTS = [...CORE_IMPACTS, ...WING_IMPACTS]

// Settled hail sits in the clear bands around the foundation. Keeping it on the
// flat part of the terrain makes the layer feel attached to the yard instead of
// floating over the decorative hills farther out.
const CORE_GROUND_HAIL = Array.from({ length: 360 }, (_, i) => {
  const band = i % 4
  const offset = ((i * 47) % 100) / 100 - 0.5
  const depth = ((i * 29) % 100) / 100
  let x
  let z
  if (band === 0) {
    x = offset * 6.6
    z = 2.5 + depth * 2.4
  } else if (band === 1) {
    x = offset * 6.6
    z = -2.5 - depth * 1.65
  } else {
    x = (band === 2 ? -1 : 1) * (3.05 + depth * 1.6)
    z = offset * 5.25
  }
  return {
    x,
    z,
    y: 0.09 + (i % 3) * 0.018,
    scale: 0.07 + (i % 8) * 0.019,
    rotation: (i * 0.73) % Math.PI,
    reveal: ((i * 37) % 100) / 100,
  }
})

// The addition is much longer and deeper than the original footprint. Give it
// its own deterministic perimeter field so settled hail visibly surrounds the
// bedrooms and bathroom rather than stopping at the old exterior wall.
const WING_GROUND_HAIL = Array.from({ length: 280 }, (_, i) => {
  const band = i % 3
  const offset = ((i * 43) % 100) / 100 - 0.5
  const depth = ((i * 31) % 100) / 100
  let x
  let z
  if (band === 0) {
    x = WING_X_MIN + 0.35 + depth * (WING_X_MAX - WING_X_MIN + 0.5)
    z = -3.65 - (i % 4) * 0.17
  } else if (band === 1) {
    x = WING_X_MIN + 0.35 + depth * (WING_X_MAX - WING_X_MIN + 0.5)
    z = 3.65 + (i % 4) * 0.17
  } else {
    x = WING_X_MAX + 0.4 + (i % 4) * 0.16
    z = offset * 7.25
  }
  return {
    x,
    z,
    y: 0.09 + (i % 3) * 0.018,
    scale: 0.07 + (i % 8) * 0.019,
    rotation: (i * 0.69) % Math.PI,
    reveal: ((i * 41) % 100) / 100,
  }
})
const GROUND_HAIL = [...CORE_GROUND_HAIL, ...WING_GROUND_HAIL]

// A handful of larger low-poly drifts make the later stage read as actual
// pileup, rather than merely a carpet of individual stones.
const HAIL_DRIFTS = [
  { position: [-2.35, 2.62], scale: [0.88, 0.22, 0.5], delay: 0.18 },
  { position: [5.1, 3.72], scale: [1.18, 0.27, 0.5], delay: 0.26 },
  { position: [-0.72, 2.72], scale: [1.06, 0.26, 0.58], delay: 0.34 },
  { position: [8.1, -3.72], scale: [1.02, 0.25, 0.52], delay: 0.42 },
  { position: [1.1, 2.62], scale: [0.92, 0.24, 0.52], delay: 0.5 },
  { position: [9.9, 0.72], scale: [0.56, 0.2, 0.94], delay: 0.58 },
  { position: [2.72, 2.76], scale: [0.68, 0.18, 0.46], delay: 0.66 },
  { position: [-3.18, -1.22], scale: [0.52, 0.19, 0.92], delay: 0.82 },
  { position: [3.2, -0.32], scale: [0.54, 0.2, 1.02], delay: 1.02 },
  { position: [-2.1, -2.58], scale: [0.84, 0.2, 0.42], delay: 1.2 },
  { position: [0.05, -2.64], scale: [1.1, 0.27, 0.48], delay: 1.4 },
  { position: [2.12, -2.56], scale: [0.8, 0.21, 0.42], delay: 1.62 },
]

function HailDrifts({ reduced, progress }) {
  const refs = useRef([])
  const count = reduced ? 5 : HAIL_DRIFTS.length

  useFrame(() => {
    refs.current.forEach((drift, index) => {
      if (!drift) return
      const data = HAIL_DRIFTS[index]
      const localProgress = THREE.MathUtils.clamp((progress.current - data.delay * 0.18) / 0.7, 0, 1)
      const [x, y, z] = data.scale
      drift.visible = index < count && localProgress > 0
      drift.position.y = y * localProgress
      drift.scale.set(
        x * localProgress,
        y * localProgress,
        z * localProgress
      )
    })
  })

  return (
    <group>
      {HAIL_DRIFTS.map((drift, index) => (
        <mesh
          key={index}
          ref={(element) => (refs.current[index] = element)}
          position={[drift.position[0], 0, drift.position[1]]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color={reduced ? '#d8e8ed' : '#f1fbff'}
            emissive="#b5ddec"
            emissiveIntensity={reduced ? 0.06 : 0.13}
            roughness={0.38}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

function GroundAccumulation({ reduced }) {
  const meshRef = useRef()
  const ageRef = useRef(0)
  const progressRef = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, delta) => {
    ageRef.current += delta
    const progress = Math.min(1, ageRef.current / ACCUMULATION_TIME)
    progressRef.current = progress
    GROUND_HAIL.forEach((hail, index) => {
      const reveal = THREE.MathUtils.clamp((progress - hail.reveal * 0.72) / 0.28, 0, 1)
      // Keep a sparse but house-wide trace when impact-resistant roofing is on.
      // Sampling by index retains accumulation around the wing in that outcome.
      const visible = !reduced || index % 4 === 0
      const scale = visible ? hail.scale * reveal * (reduced ? 0.82 : 1) : 0.001
      dummy.position.set(hail.x, hail.y, hail.z)
      dummy.rotation.set(0, hail.rotation, index * 0.31)
      dummy.scale.set(scale * 1.15, scale * 0.58, scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(index, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <HailDrifts reduced={reduced} progress={progressRef} />
      <instancedMesh ref={meshRef} args={[null, null, GROUND_HAIL.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={reduced ? '#d6e8ef' : '#edf9ff'}
          emissive="#a7d8ed"
          emissiveIntensity={reduced ? 0.08 : 0.16}
          roughness={0.3}
          flatShading
        />
      </instancedMesh>
    </group>
  )
}

/**
 * Heavy authored hailstorm: dense varied stones establish the weather while a
 * deterministic set of roof strikes supplies bright contact flashes, bouncing
 * shingle chips, impact light, and a short camera punch.
 */
export default function Hail() {
  const protectedByRoof = useGameStore((s) => !!s.preventions.hail)
  const meshRef = useRef()
  const impactRefs = useRef([])
  const impactLightRef = useRef()
  const ageRef = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const stones = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: -AREA / 2 + ((i * 73) % 200) * (AREA / 200),
        y: ((i * 97) % 211) * (TOP / 211),
        z: -AREA / 2 + ((i * 43) % 197) * (AREA / 197),
        speed: 11 + (i % 9) * 0.85,
        scale: 0.075 + (i % 7) * 0.017,
        drift: ((i % 5) - 2) * 0.12,
      })),
    []
  )

  useFrame(({ clock }, delta) => {
    ageRef.current += delta
    const age = ageRef.current

    stones.forEach((stone, i) => {
      stone.y -= stone.speed * delta
      stone.x += stone.drift * delta
      if (stone.y < 0) {
        stone.y = TOP + (i % 5) * 0.35
        stone.x = -AREA / 2 + ((i * 61) % 200) * (AREA / 200)
      }
      dummy.position.set(stone.x, stone.y, stone.z)
      dummy.rotation.set(age * stone.speed * 0.3, i, age * stone.speed * 0.18)
      dummy.scale.set(stone.scale, stone.scale * 1.25, stone.scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true

    const activeImpactCount = protectedByRoof ? 5 : IMPACTS.length
    let strongestFlash = 0
    impactRefs.current.forEach((group, impactIndex) => {
      if (!group) return
      const data = IMPACTS[impactIndex]
      const phase = (age + data.delay) % IMPACT_CYCLE
      const active = impactIndex < activeImpactCount && phase < 0.5
      group.visible = active
      if (!active) return

      const flash = Math.max(0, 1 - phase / 0.5)
      strongestFlash = Math.max(strongestFlash, flash)
      const contact = group.children[0]
      contact.scale.set(
        data.radius * (1.2 + phase * 4.5),
        0.055,
        data.radius * (1.2 + phase * 4.5)
      )
      contact.material.opacity = flash * (protectedByRoof ? 0.48 : 0.95)
      contact.material.emissiveIntensity = 2 + flash * 5

      group.children.slice(1).forEach((chip, chipIndex) => {
        const angle = (chipIndex / 5) * Math.PI * 2 + impactIndex
        const speed = 0.65 + (chipIndex % 3) * 0.24
        chip.position.set(
          Math.cos(angle) * speed * phase,
          0.08 + (1.2 + chipIndex * 0.08) * phase - 3.2 * phase * phase,
          Math.sin(angle) * speed * phase
        )
        chip.rotation.set(phase * 8, phase * (10 + chipIndex), phase * 6)
        chip.scale.setScalar(Math.max(0.15, 1 - phase * 1.4))
      })
    })

    if (impactLightRef.current) {
      impactLightRef.current.intensity = strongestFlash * (protectedByRoof ? 2.5 : 7)
      impactLightRef.current.position.x = Math.sin(clock.elapsedTime * 5) * 1.2
    }
  })

  return (
    <group>
      <GroundAccumulation reduced={protectedByRoof} />

      <instancedMesh ref={meshRef} args={[null, null, COUNT]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#dff2ff"
          emissive="#8ccfff"
          emissiveIntensity={0.22}
          roughness={0.18}
          flatShading
        />
      </instancedMesh>

      {IMPACTS.map((impact, impactIndex) => (
        <group
          key={impactIndex}
          ref={(group) => (impactRefs.current[impactIndex] = group)}
          position={impact.position}
          rotation={impact.rotation}
        >
          <mesh>
            <sphereGeometry args={[1, 10, 6]} />
            <meshStandardMaterial
              color="#eaf8ff"
              emissive="#bdeaff"
              emissiveIntensity={4}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
          {Array.from({ length: 5 }, (_, chipIndex) => (
            <mesh key={chipIndex} castShadow>
              <boxGeometry args={[0.07, 0.045, 0.2]} />
              <meshStandardMaterial
                color={chipIndex % 2 ? '#e3684f' : '#b7463a'}
                emissive="#5e1712"
                emissiveIntensity={0.16}
                flatShading
              />
            </mesh>
          ))}
        </group>
      ))}

      <pointLight
        ref={impactLightRef}
        position={[0, 5, 0]}
        color="#c9ecff"
        distance={9}
        intensity={0}
      />

    </group>
  )
}
