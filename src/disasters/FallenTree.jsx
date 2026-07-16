import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const FALL_ANGLE = -Math.PI / 2.6 // rotation that lands the canopy on the roof

/**
 * Backyard oak that topples onto the house.
 * `settled` renders it already fallen (persistent aftermath state).
 * Pivot is at the trunk base so rotation reads as a real topple.
 */
export default function FallenTree({ settled = false }) {
  const pivotRef = useRef()

  useFrame((_, delta) => {
    if (settled || !pivotRef.current) return
    // Ease toward fallen angle with slight acceleration
    pivotRef.current.rotation.x = THREE.MathUtils.lerp(
      pivotRef.current.rotation.x,
      FALL_ANGLE,
      delta * 1.5
    )
  })

  return (
    <group
      ref={pivotRef}
      position={[0, 0, -4.5]}
      rotation={[settled ? FALL_ANGLE : 0, 0, 0]}
    >
      {/* Trunk */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 3.2, 6]} />
        <meshStandardMaterial color="#7a5334" flatShading />
      </mesh>
      {/* Canopy — clustered faceted icosahedrons to match the yard trees */}
      <mesh position={[0, 3.6, 0]} castShadow>
        <icosahedronGeometry args={[1.3, 0]} />
        <meshStandardMaterial color="#3f8f45" flatShading />
      </mesh>
      <mesh position={[0.7, 3.2, 0.4]} castShadow>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#4a9b4e" flatShading />
      </mesh>
      <mesh position={[-0.6, 3.3, -0.3]} castShadow>
        <icosahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color="#37833e" flatShading />
      </mesh>
    </group>
  )
}
