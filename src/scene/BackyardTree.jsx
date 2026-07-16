import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { useClickable } from './useClickable'
import DisasterTargetCue from './DisasterTargetCue'

// Positive X rotation sends the canopy from the north yard toward the house.
// Stop before horizontal so the crown settles on the pitched roof instead of
// visually passing through the rooms.
const FALL_ANGLE = 0.72
const IMPACT_ANGLE = FALL_ANGLE * 0.72
const FALL_DURATION = 1.25
const CANOPY_EMISSIVE = '#8fe08f'
// Deliberately taller than the roof ridge. The base sits farther back so the
// upper trunk and crown meet the roofline during the fall, not the north wall.
const TRUNK_HEIGHT = 6.1

function ImpactBurst({ reduced }) {
  const shardRefs = useRef([])
  const dustRefs = useRef([])
  const elapsed = useRef(0)

  const shards = useMemo(
    () =>
      Array.from({ length: reduced ? 4 : 11 }, (_, i) => ({
        velocity: new THREE.Vector3(
          ((i * 47) % 9 - 4) * 0.34,
          1.5 + ((i * 29) % 5) * 0.25,
          0.7 + ((i * 31) % 7) * 0.18
        ),
        spin: new THREE.Vector3(2 + (i % 3), 3 + (i % 4), 1.5 + (i % 5)),
      })),
    [reduced]
  )

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current

    shardRefs.current.forEach((shard, i) => {
      if (!shard) return
      const data = shards[i]
      shard.position.set(
        data.velocity.x * t,
        data.velocity.y * t - 3.8 * t * t,
        data.velocity.z * t
      )
      shard.rotation.set(data.spin.x * t, data.spin.y * t, data.spin.z * t)
      shard.visible = t < 1.2
    })

    dustRefs.current.forEach((puff, i) => {
      if (!puff) return
      const age = Math.max(0, t - i * 0.06)
      const scale = 0.18 + age * 1.15
      puff.scale.setScalar(scale)
      puff.position.y = age * 0.45
      puff.position.x = (i - 1.5) * (0.18 + age * 0.12)
      puff.material.opacity = Math.max(0, 0.48 - age * 0.42)
      puff.visible = age < 1.2
    })
  })

  return (
    <group position={[-1.05, 4.08, -1.55]}>
      {shards.map((_, i) => (
        <mesh key={`shard-${i}`} ref={(el) => (shardRefs.current[i] = el)} castShadow>
          <boxGeometry args={[0.08 + (i % 2) * 0.05, 0.06, 0.24 + (i % 3) * 0.06]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? '#d9a56f' : i % 2 === 0 ? '#f06a45' : '#d94832'}
            emissive={i % 3 === 0 ? '#3f2415' : '#71180f'}
            emissiveIntensity={0.16}
            flatShading
          />
        </mesh>
      ))}
      {Array.from({ length: reduced ? 2 : 4 }, (_, i) => (
        <mesh
          key={`dust-${i}`}
          ref={(el) => (dustRefs.current[i] = el)}
          position={[(i - 1.5) * 0.15, 0, 0]}
        >
          <icosahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#c9b49a" transparent opacity={0.48} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Backyard oak, standing in the yard behind the house. It's the click target
 * for the "fallen tree" disaster: hover to see it's interactive, click to make
 * it topple onto the roofline. Once fallen it stays down until the house is
 * reset (the disaster persists).
 *
 * Pivot is the trunk base (group origin at ground) so rotation reads as a real
 * topple. Replaces the old FallenTree effect, which only existed post-trigger.
 */
export default function BackyardTree() {
  const triggered = useGameStore((s) => !!s.triggered.tree)
  const removed = useGameStore((s) => !!s.preventions.removeTree)
  const acknowledgementRequired = useGameStore((s) => s.acknowledgementRequired)
  const trigger = useGameStore((s) => s.triggerDisaster)
  const { hovered, bind } = useClickable(
    () => trigger('tree'),
    triggered || acknowledgementRequired
  )

  const pivotRef = useRef()
  const canopyMats = useRef([])
  const fallTime = useRef(0)
  const [impacted, setImpacted] = useState(false)

  useEffect(() => {
    if (!triggered) {
      fallTime.current = 0
      setImpacted(false)
    }
  }, [triggered])

  useFrame((state, delta) => {
    const pivot = pivotRef.current
    if (pivot) {
      if (triggered) {
        fallTime.current = Math.min(FALL_DURATION, fallTime.current + delta)
        const t = fallTime.current / FALL_DURATION

        if (t < 0.18) {
          // A short lean away from the house telegraphs the direction of the hit.
          const windUp = Math.sin((t / 0.18) * Math.PI * 0.5)
          pivot.rotation.x = -0.055 * windUp
        } else if (t < 0.8) {
          // Accelerate hard through the fall and overshoot on contact.
          const fall = (t - 0.18) / 0.62
          pivot.rotation.x = -0.055 + (FALL_ANGLE + 0.145) * Math.pow(fall, 2.3)
        } else {
          // Two quick settling bounces make the crown feel heavy on the roof.
          const settle = (t - 0.8) / 0.2
          pivot.rotation.x =
            FALL_ANGLE + Math.cos(settle * Math.PI * 3) * 0.09 * (1 - settle)
        }

        if (!impacted && pivot.rotation.x >= IMPACT_ANGLE) {
          setImpacted(true)
        }
      } else {
        pivot.rotation.x = THREE.MathUtils.damp(pivot.rotation.x, 0, 5, delta)
      }
      // Gentle "notice me" sway while standing and un-triggered.
      const sway = triggered ? 0 : Math.sin(state.clock.elapsedTime * 1.5) * 0.02
      pivot.rotation.z = THREE.MathUtils.lerp(pivot.rotation.z, sway, delta * 3)
    }

    // Subtle emissive breathing that brightens on hover, so it reads as
    // clickable without washing the canopy out.
    const idle = triggered ? 0 : 0.05 + Math.sin(state.clock.elapsedTime * 2) * 0.03
    const target = hovered ? 0.35 : idle
    canopyMats.current.forEach((m) => {
      if (m) m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, target, delta * 8)
    })
  })

  const canopy = (i, position, radius, color) => (
    <mesh position={position} castShadow>
      <icosahedronGeometry args={[radius, 0]} />
      <meshStandardMaterial
        ref={(el) => (canopyMats.current[i] = el)}
        color={color}
        emissive={CANOPY_EMISSIVE}
        emissiveIntensity={0}
        flatShading
      />
    </mesh>
  )

  return (
    <>
      {removed ? (
        <>
          <group position={[-1.05, 0, -6.55]} {...bind}>
            {/* The stump remains clickable so players can test the eliminated risk. */}
            <mesh position={[0, 0.34, 0]} castShadow>
              <cylinderGeometry args={[0.31, 0.4, 0.68, 8]} />
              <meshStandardMaterial
                color="#7a5334"
                emissive="#d8a66c"
                emissiveIntensity={hovered ? 0.32 : 0.04}
                flatShading
              />
            </mesh>
            <mesh position={[0, 0.69, 0]} castShadow>
              <cylinderGeometry args={[0.3, 0.3, 0.035, 16]} />
              <meshStandardMaterial color="#d8a66c" flatShading />
            </mesh>
            {[-0.42, 0.44].map((x) => (
              <mesh key={x} position={[x, 0.08, 0.12]} rotation={[0.12, 0, x]} castShadow>
                <boxGeometry args={[0.28, 0.12, 0.14]} />
                <meshStandardMaterial color="#9a6a42" flatShading />
              </mesh>
            ))}
          </group>
          {hovered && (
            <DisasterTargetCue
              position={[-1.05, 1.2, -6.55]}
              color="#d8a66c"
              radius={0.48}
            />
          )}
        </>
      ) : (
        <>
          <group ref={pivotRef} position={[-1.05, 0, -6.55]} {...bind}>
            {/* Trunk */}
            <mesh position={[0, TRUNK_HEIGHT / 2, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.38, TRUNK_HEIGHT, 6]} />
              <meshStandardMaterial color="#7a5334" flatShading />
            </mesh>
            {/* Canopy — clustered faceted icosahedrons to match the yard trees */}
            {canopy(0, [0, 6.65, 0], 1.55, '#3f8f45')}
            {canopy(1, [0.9, 6.05, 0.48], 1.0, '#4a9b4e')}
            {canopy(2, [-0.8, 6.15, -0.38], 0.9, '#37833e')}
          </group>
          {hovered && (
            <DisasterTargetCue
              position={[-1.05, 8.35, -6.55]}
              color="#b9ed79"
              radius={1.15}
            />
          )}
        </>
      )}
      {!removed && impacted && <ImpactBurst reduced={false} />}
    </>
  )
}
