import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { useClickable } from './useClickable'

// Positive X rotation sends the canopy from the north yard toward the house.
// Stop before horizontal so the crown settles on the pitched roof instead of
// visually passing through the rooms.
const FALL_ANGLE = 0.72
const IMPACT_ANGLE = FALL_ANGLE * 0.72
const CANOPY_EMISSIVE = '#8fe08f'

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
          <meshStandardMaterial color={i % 3 === 0 ? '#d9a56f' : '#823e32'} flatShading />
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
  const prevented = useGameStore((s) => !!s.preventions.tree)
  const trigger = useGameStore((s) => s.triggerDisaster)
  const { hovered, bind } = useClickable(() => trigger('tree'), triggered)

  const pivotRef = useRef()
  const canopyMats = useRef([])
  const [impacted, setImpacted] = useState(false)

  useEffect(() => {
    if (!triggered) setImpacted(false)
  }, [triggered])

  useFrame((state, delta) => {
    const pivot = pivotRef.current
    if (pivot) {
      const targetRot = triggered ? FALL_ANGLE : 0
      pivot.rotation.x = THREE.MathUtils.damp(pivot.rotation.x, targetRot, 2.8, delta)
      if (triggered && !impacted && pivot.rotation.x >= IMPACT_ANGLE) setImpacted(true)
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
      <group ref={pivotRef} position={[0, 0, -4.5]} {...bind}>
        {/* Trunk */}
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.35, 3.2, 6]} />
          <meshStandardMaterial color="#7a5334" flatShading />
        </mesh>
        {/* Canopy — clustered faceted icosahedrons to match the yard trees */}
        {canopy(0, [0, 3.6, 0], 1.3, '#3f8f45')}
        {canopy(1, [0.7, 3.2, 0.4], 0.8, '#4a9b4e')}
        {canopy(2, [-0.6, 3.3, -0.3], 0.7, '#37833e')}
      </group>
      {impacted && <ImpactBurst reduced={prevented} />}
    </>
  )
}
