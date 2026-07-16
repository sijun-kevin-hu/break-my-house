import { useGameStore } from '../store/useGameStore'

/**
 * Placeholder cartoon house from primitives so the loop works day one.
 * Replace with a GLB (useGLTF) later — keep the same damage-state props pattern.
 *
 * Damage visualization = material swaps (cheap, readable at cartoon scale):
 *  - hail: roof darkens + dents (full) or light scuff (reduced)
 *  - fire: walls char near the kitchen corner
 *  - tree: roof section crushed (handled visually by FallenTree effect + roof tint)
 */
const COLORS = {
  wall: '#f5e6c8',
  wallCharred: '#3a2f28',
  roof: '#c94f3d',
  roofDented: '#7a3a30',
  roofScuffed: '#b04a3a',
  door: '#7a4a2b',
  window: '#9fd8ef',
}

export default function House() {
  const damage = useGameStore((s) => s.damage)

  const roofColor =
    damage.hail === 'full' || damage.tree === 'full'
      ? COLORS.roofDented
      : damage.hail === 'reduced' || damage.tree === 'reduced'
        ? COLORS.roofScuffed
        : COLORS.roof

  const wallColor = damage.fire === 'full' ? COLORS.wallCharred : COLORS.wall

  return (
    <group position={[0, 0, 0]}>
      {/* Walls */}
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 2.5, 3]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {/* Roof (cartoon prism via rotated cone) */}
      <mesh position={[0, 3.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.2, 1.6, 4]} />
        <meshStandardMaterial color={roofColor} flatShading />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.7, 1.51]}>
        <boxGeometry args={[0.8, 1.4, 0.05]} />
        <meshStandardMaterial color={COLORS.door} />
      </mesh>

      {/* Windows */}
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 1.5, 1.51]}>
          <boxGeometry args={[0.7, 0.7, 0.05]} />
          <meshStandardMaterial
            color={COLORS.window}
            emissive={COLORS.window}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Chimney */}
      <mesh position={[1.2, 3.4, -0.6]} castShadow>
        <boxGeometry args={[0.5, 1.2, 0.5]} />
        <meshStandardMaterial color="#8f5b4a" />
      </mesh>
    </group>
  )
}
