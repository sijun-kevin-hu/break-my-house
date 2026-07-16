import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { useClickable } from './useClickable'

const FALL_ANGLE = -Math.PI / 2.6 // rotation that lands the canopy on the roof
const CANOPY_EMISSIVE = '#8fe08f'

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
  const trigger = useGameStore((s) => s.triggerDisaster)
  const { hovered, bind } = useClickable(() => trigger('tree'), triggered)

  const pivotRef = useRef()
  const canopyMats = useRef([])

  useFrame((state, delta) => {
    const pivot = pivotRef.current
    if (pivot) {
      const targetRot = triggered ? FALL_ANGLE : 0
      pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, targetRot, delta * 2)
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
  )
}
