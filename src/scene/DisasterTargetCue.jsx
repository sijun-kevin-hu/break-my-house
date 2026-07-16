import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

const NOOP_RAYCAST = () => null

/**
 * A hover-only halo for a live disaster object. It deliberately does not
 * participate in raycasting, so it can never steal the pointer from its target.
 */
export default function DisasterTargetCue({ position, color = '#ffbf4a', radius = 0.72 }) {
  const ringRef = useRef()

  useFrame((state) => {
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 7) * 0.09
    if (ringRef.current) ringRef.current.scale.setScalar(pulse)
  })

  return (
    <group position={position}>
      <mesh
        ref={ringRef}
        position={[0, -0.18, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={NOOP_RAYCAST}
        renderOrder={20}
      >
        <torusGeometry args={[radius, 0.045, 8, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.95}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

    </group>
  )
}
