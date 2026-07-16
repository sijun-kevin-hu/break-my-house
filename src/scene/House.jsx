import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'

/**
 * Placeholder cartoon house from primitives so the loop works day one.
 * Replace with a GLB (useGLTF) later — keep the same damage-state props pattern.
 *
 * Sims-style cutaway: the 4 walls are separate meshes. Every frame we fade out
 * whichever walls sit between the camera and the room's center, so the furnished
 * interior stays visible from any orbit angle. Faded walls also go non-clickable
 * (visible=false) so they never block clicks on interior objects.
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
  floor: '#caa472',
  rug: '#6b8f9c',
}

// Footprint: 4 (x) by 3 (z), walls 2.5 tall. Center of the room is [0, 1.25, 0].
const W = 4
const D = 3
const H = 2.5
const T = 0.1 // wall thickness
const ROOM_CENTER = [0, H / 2, 0]
const CAM_TARGET = [0, 1.5, 0] // must match OrbitControls target in Scene.jsx

// Each wall: outward-facing normal + placement. We fade a wall when its outward
// normal points toward the camera (i.e. it's on the near side of the room).
const WALLS = [
  { id: 'north', normal: [0, 0, -1], position: [0, H / 2, -D / 2], size: [W, H, T] },
  { id: 'south', normal: [0, 0, 1], position: [0, H / 2, D / 2], size: [W, H, T] },
  { id: 'east', normal: [1, 0, 0], position: [W / 2, H / 2, 0], size: [T, H, D] },
  { id: 'west', normal: [-1, 0, 0], position: [-W / 2, H / 2, 0], size: [T, H, D] },
]

function Wall({ id, normal, position, size, color }) {
  const meshRef = useRef()
  const matRef = useRef()

  useFrame(({ camera }) => {
    const mesh = meshRef.current
    const mat = matRef.current
    if (!mesh || !mat) return

    // Is this wall between the camera and the room? Compare its outward normal
    // to the direction from the room center out to the camera.
    const toCamX = camera.position.x - ROOM_CENTER[0]
    const toCamZ = camera.position.z - ROOM_CENTER[2]
    const facing = normal[0] * toCamX + normal[2] * toCamZ // >0 => near wall

    const target = facing > 0 ? 0 : 1
    mat.opacity += (target - mat.opacity) * 0.15 // smooth fade
    mesh.visible = mat.opacity > 0.04
  })

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial ref={matRef} color={color} transparent opacity={1} />
    </mesh>
  )
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))

/**
 * Roof (with its chimney) reveals the interior on either trigger — tilting the
 * camera toward top-down OR zooming in close — so you're never left with the
 * roof blocking the rooms (Sims-style doll's house). Both fade together, fully
 * to zero, and stop casting their shadow onto the floor once hidden. Kept
 * raycastable (never visible=false) so the roof can still be a click target for
 * the hail disaster later.
 */
function Roof({ color }) {
  const roofRef = useRef()
  const roofMatRef = useRef()
  const chimneyRef = useRef()
  const chimneyMatRef = useRef()

  useFrame(({ camera }) => {
    const roofMat = roofMatRef.current
    const chimneyMat = chimneyMatRef.current
    if (!roofMat || !chimneyMat) return

    const dx = camera.position.x - CAM_TARGET[0]
    const dy = camera.position.y - CAM_TARGET[1]
    const dz = camera.position.z - CAM_TARGET[2]
    const dist = Math.hypot(dx, dy, dz) || 1

    // Polar angle from straight-up (+Y): ~0 = overhead, ~PI/2 = level horizon.
    const polar = Math.acos(dy / dist)

    // Reveal grows as the camera tilts up (smaller polar) OR zooms in (smaller
    // dist). Either one alone can clear the roof, so even at a low pitch a
    // zoom-in opens the interior up.
    const pitchReveal = clamp01((1.3 - polar) / (1.3 - 0.85)) // 1 by ~49°, 0 by ~74°
    const zoomReveal = clamp01((13 - dist) / (13 - 8)) // 1 within ~8 units, 0 past ~13
    const reveal = Math.max(pitchReveal, zoomReveal)

    const target = 1 - reveal
    roofMat.opacity += (target - roofMat.opacity) * 0.15
    chimneyMat.opacity = roofMat.opacity // chimney tracks the roof exactly
    // Shadows ignore material opacity, so kill the cast shadow once faded or the
    // interior stays darkened by a phantom roof.
    const cast = roofMat.opacity > 0.5
    if (roofRef.current) roofRef.current.castShadow = cast
    if (chimneyRef.current) chimneyRef.current.castShadow = cast
  })

  return (
    <group>
      <mesh ref={roofRef} position={[0, 3.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2.8, 1.6, 4]} />
        <meshStandardMaterial ref={roofMatRef} color={color} flatShading transparent opacity={1} />
      </mesh>
      <mesh ref={chimneyRef} position={[1.2, 3.4, -0.6]} castShadow>
        <boxGeometry args={[0.5, 1.2, 0.5]} />
        <meshStandardMaterial ref={chimneyMatRef} color="#8f5b4a" transparent opacity={1} />
      </mesh>
    </group>
  )
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
      {/* Floor slab */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[W, 0.1, D]} />
        <meshStandardMaterial color={COLORS.floor} />
      </mesh>

      {/* Rug in the living area */}
      <mesh position={[-0.6, 0.11, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 1.4]} />
        <meshStandardMaterial color={COLORS.rug} />
      </mesh>

      {/* Cutaway walls */}
      {WALLS.map((w) => (
        <Wall key={w.id} {...w} color={wallColor} />
      ))}

      {/* Roof (cartoon prism via rotated cone) — fades as camera tilts top-down */}
      <Roof color={roofColor} />

      {/* Door (in south wall) */}
      <mesh position={[0, 0.7, D / 2 + 0.01]}>
        <boxGeometry args={[0.8, 1.4, 0.05]} />
        <meshStandardMaterial color={COLORS.door} />
      </mesh>

      {/* Windows (in south wall) */}
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 1.5, D / 2 + 0.01]}>
          <boxGeometry args={[0.7, 0.7, 0.05]} />
          <meshStandardMaterial
            color={COLORS.window}
            emissive={COLORS.window}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      <Furniture />
    </group>
  )
}

/**
 * Interior props so the cutaway reveals a real home. Kept as simple primitives.
 * The stove (kitchen corner, back-left) is where the fire disaster reads from.
 */
function Furniture() {
  return (
    <group>
      {/* Kitchen counter — back-left corner */}
      <mesh position={[-1.4, 0.55, -1.0]} castShadow>
        <boxGeometry args={[1.0, 0.9, 0.7]} />
        <meshStandardMaterial color="#e8e2d5" />
      </mesh>
      {/* Stove top on the counter */}
      <mesh position={[-1.4, 1.02, -1.0]} castShadow>
        <boxGeometry args={[0.7, 0.06, 0.6]} />
        <meshStandardMaterial color="#2f2f33" />
      </mesh>
      {[-0.15, 0.15].map((dx) =>
        [-0.13, 0.13].map((dz) => (
          <mesh key={`${dx}:${dz}`} position={[-1.4 + dx, 1.06, -1.0 + dz]}>
            <cylinderGeometry args={[0.09, 0.09, 0.02, 16]} />
            <meshStandardMaterial color="#1c1c1f" />
          </mesh>
        ))
      )}

      {/* Fridge — back-right corner */}
      <mesh position={[1.4, 0.75, -1.05]} castShadow>
        <boxGeometry args={[0.8, 1.5, 0.7]} />
        <meshStandardMaterial color="#dfe3e6" />
      </mesh>

      {/* Couch — front-left, on the rug */}
      <group position={[-0.6, 0, 0.4]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[1.5, 0.4, 0.7]} />
          <meshStandardMaterial color="#4f6d5b" />
        </mesh>
        <mesh position={[0, 0.6, -0.28]} castShadow>
          <boxGeometry args={[1.5, 0.6, 0.15]} />
          <meshStandardMaterial color="#59795f" />
        </mesh>
      </group>

      {/* Coffee table */}
      <mesh position={[-0.6, 0.35, 1.0]} castShadow>
        <boxGeometry args={[0.9, 0.1, 0.5]} />
        <meshStandardMaterial color="#6b4a2f" />
      </mesh>
    </group>
  )
}
