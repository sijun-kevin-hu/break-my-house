import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraShake } from '@react-three/drei'
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
const IMPACT_CYCLE = 1.55

const roofHeight = (x) =>
  ROOF_BASE + ROOF_RISE * (1 - Math.min(ROOF_RUN, Math.abs(x)) / ROOF_RUN) + 0.16

const IMPACTS = Array.from({ length: 14 }, (_, i) => {
  const x = -2.55 + ((i * 47) % 50) * 0.102
  const z = -1.82 + ((i * 31) % 35) * 0.105
  return {
    position: [x, roofHeight(x), z],
    rotation: [0, 0, x < 0 ? ROOF_SLOPE : -ROOF_SLOPE],
    delay: (i * 0.19) % IMPACT_CYCLE,
    radius: 0.18 + (i % 4) * 0.035,
  }
})

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
  const [impacting, setImpacting] = useState(true)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    const timer = setTimeout(() => setImpacting(false), 2300)
    return () => clearTimeout(timer)
  }, [])

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

      {impacting && (
        <CameraShake
          intensity={protectedByRoof ? 0.12 : 0.32}
          maxYaw={protectedByRoof ? 0.006 : 0.016}
          maxPitch={protectedByRoof ? 0.008 : 0.022}
          maxRoll={protectedByRoof ? 0.004 : 0.012}
          yawFrequency={14}
          pitchFrequency={18}
          rollFrequency={15}
        />
      )}
    </group>
  )
}
