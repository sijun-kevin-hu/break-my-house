import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { useClickable } from './useClickable'

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

// Generous footprint for a more legible, roomier dollhouse. The roof dimensions
// below deliberately exceed this footprint, giving every wall a real eave.
const W = 5.6
const D = 4.2
const H = 3.1
const T = 0.1 // wall thickness
const ROOM_CENTER = [0, H / 2, 0]
const CAM_TARGET = [0, 2.1, 0] // must match OrbitControls target in Scene.jsx

const ROOF_EAVE = 0.38
const ROOF_RISE = 1.45
const ROOF_RUN = W / 2 + ROOF_EAVE
const ROOF_LENGTH = D + ROOF_EAVE * 2
const ROOF_SLOPE = Math.atan(ROOF_RISE / ROOF_RUN)
const ROOF_PANEL_LENGTH = Math.hypot(ROOF_RUN, ROOF_RISE)

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
      <meshStandardMaterial ref={matRef} color={color} flatShading transparent opacity={1} />
    </mesh>
  )
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const NOOP_RAYCAST = () => {}

/**
 * Gable roof (with its chimney) reveals the interior on either trigger — tilting the
 * camera toward top-down OR zooming in close — so you're never left with the
 * roof blocking the rooms (Sims-style doll's house). Both fade together, fully
 * to zero, and stop casting their shadow onto the floor once hidden. Kept
 * raycastable (never visible=false) so the roof can still be a click target for
 * the hail disaster later.
 */
function Roof({ color, wallColor }) {
  const roofRefs = useRef([])
  const roofMatRefs = useRef([])
  const gableRefs = useRef([])
  const gableMatRefs = useRef([])
  const chimneyRef = useRef()
  const chimneyMatRef = useRef()

  const triggered = useGameStore((s) => !!s.triggered.hail)
  const trigger = useGameStore((s) => s.triggerDisaster)
  const { hovered, bind } = useClickable(() => trigger('hail'), triggered)

  useFrame(({ camera }) => {
    const roofMats = roofMatRefs.current
    const gableMats = gableMatRefs.current
    const chimneyMat = chimneyMatRef.current
    if (
      roofMats.length !== 2 ||
      roofMats.some((mat) => !mat) ||
      gableMats.length !== 2 ||
      gableMats.some((mat) => !mat) ||
      !chimneyMat
    ) return

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
    roofMats.forEach((mat) => {
      mat.opacity += (target - mat.opacity) * 0.15
    })
    gableMats.forEach((mat) => {
      mat.opacity = roofMats[0].opacity
    })
    chimneyMat.opacity = roofMats[0].opacity // chimney tracks the roof exactly
    // Shadows ignore material opacity, so kill the cast shadow once faded or the
    // interior stays darkened by a phantom roof.
    const solid = roofMats[0].opacity > 0.5
    const roofPieces = [...roofRefs.current, ...gableRefs.current, chimneyRef.current]
    roofPieces.forEach((piece) => {
      if (!piece) return
      piece.castShadow = solid
      // While faded (interior revealed) the roof must NOT eat clicks meant for
      // the stove/furniture underneath — drop it out of raycasting. While solid
      // it's the hail trigger.
      piece.raycast = solid ? THREE.Mesh.prototype.raycast : NOOP_RAYCAST
    })

    // Warm hover glow so the roof reads as the hail trigger.
    const glow = hovered ? 0.5 : 0
    roofMats.forEach((mat) => {
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, glow, 0.2)
    })
  })

  return (
    <group>
      {/* Two pitched panels make a proper gable: their outer edges extend past
          all four walls, so no wall can protrude through the roofline. */}
      {[-1, 1].map((side, index) => (
        <mesh
          key={side}
          ref={(el) => (roofRefs.current[index] = el)}
          position={[side * ROOF_RUN / 2, H + ROOF_RISE / 2 + 0.03, 0]}
          rotation={[0, 0, -side * ROOF_SLOPE]}
          castShadow
          {...bind}
        >
          <boxGeometry args={[ROOF_PANEL_LENGTH, 0.18, ROOF_LENGTH]} />
          <meshStandardMaterial
            ref={(el) => (roofMatRefs.current[index] = el)}
            color={color}
            emissive="#ffcaa0"
            emissiveIntensity={0}
            flatShading
            transparent
            opacity={1}
          />
        </mesh>
      ))}

      {/* Filled gable ends visually join the roof to the rectangular walls.
          They fade with the roof so the cutaway behavior stays intact. */}
      {[-1, 1].map((side, index) => (
        <mesh
          key={side}
          ref={(el) => (gableRefs.current[index] = el)}
          position={[0, H - 0.03, side * D / 2]}
          rotation={[0, side < 0 ? Math.PI : 0, 0]}
          castShadow
          {...bind}
        >
          <shapeGeometry
            args={[
              new THREE.Shape()
                .moveTo(-W / 2, 0)
                .lineTo(W / 2, 0)
                .lineTo(0, ROOF_RISE + 0.08)
                .closePath(),
            ]}
          />
          <meshStandardMaterial
            ref={(el) => (gableMatRefs.current[index] = el)}
            color={wallColor}
            flatShading
            side={THREE.DoubleSide}
            transparent
            opacity={1}
          />
        </mesh>
      ))}

      <mesh ref={chimneyRef} position={[1.25, 4.55, -0.75]} castShadow {...bind}>
        <boxGeometry args={[0.5, 1.2, 0.5]} />
        <meshStandardMaterial ref={chimneyMatRef} color="#8f5b4a" flatShading transparent opacity={1} />
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
      {/* Foundation plinth — grounds the house on the terrain */}
      <mesh position={[0, -0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.45, 0.3, D + 0.45]} />
        <meshStandardMaterial color="#b9a988" flatShading />
      </mesh>

      {/* Floor slab */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[W, 0.1, D]} />
        <meshStandardMaterial color={COLORS.floor} flatShading />
      </mesh>

      {/* Rug in the living area */}
      <mesh position={[-0.55, 0.11, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 1.8]} />
        <meshStandardMaterial color={COLORS.rug} />
      </mesh>

      {/* Cutaway walls */}
      {WALLS.map((w) => (
        <Wall key={w.id} {...w} color={wallColor} />
      ))}

      {/* Proper gable roof — fades as camera tilts top-down */}
      <Roof color={roofColor} wallColor={wallColor} />

      {/* Door (in south wall) with frame + knob */}
      <group position={[0, 0.7, D / 2 + 0.01]}>
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[0.96, 1.56, 0.05]} />
          <meshStandardMaterial color="#8a6a45" flatShading />
        </mesh>
        <mesh>
          <boxGeometry args={[0.8, 1.4, 0.06]} />
          <meshStandardMaterial color={COLORS.door} flatShading />
        </mesh>
        <mesh position={[0.28, 0, 0.05]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#e8c15a" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>

      {/* Windows (in south wall) with frames */}
      {[-1.65, 1.65].map((x) => (
        <group key={x} position={[x, 1.5, D / 2 + 0.01]}>
          <mesh position={[0, 0, -0.02]}>
            <boxGeometry args={[0.86, 0.86, 0.05]} />
            <meshStandardMaterial color="#f3ede0" flatShading />
          </mesh>
          <mesh>
            <boxGeometry args={[0.7, 0.7, 0.06]} />
            <meshStandardMaterial
              color={COLORS.window}
              emissive={COLORS.window}
              emissiveIntensity={0.25}
              flatShading
            />
          </mesh>
          {/* Muntin bars (cross) */}
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.72, 0.05, 0.02]} />
            <meshStandardMaterial color="#f3ede0" />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.05, 0.72, 0.02]} />
            <meshStandardMaterial color="#f3ede0" />
          </mesh>
        </group>
      ))}

      <Furniture />
    </group>
  )
}

/**
 * Kitchen stove — the click target for the fire disaster. Burners glow softly
 * to advertise interactivity, brighten on hover, and go red-hot once the fire
 * is triggered. Clicking anywhere on the counter/stove starts the fire.
 */
function Stove() {
  const triggered = useGameStore((s) => !!s.triggered.fire)
  const trigger = useGameStore((s) => s.triggerDisaster)
  const { hovered, bind } = useClickable(() => trigger('fire'), triggered)

  const burnerMats = useRef([])
  const burners = []
  for (const dx of [-0.15, 0.15]) for (const dz of [-0.13, 0.13]) burners.push([dx, dz])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const target = triggered
      ? 1.4 + Math.sin(t * 12) * 0.4 // red-hot flicker
      : hovered
        ? 0.9
        : 0.15 + Math.sin(t * 2.5) * 0.08 // subtle idle "I'm interactive" glow
    burnerMats.current.forEach((m) => {
      if (m) m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, target, delta * 8)
    })
  })

  return (
    <group position={[-1.4, 0, -1.0]} {...bind}>
      {/* Counter body */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.0, 0.9, 0.7]} />
        <meshStandardMaterial color="#e8e2d5" flatShading />
      </mesh>
      {/* Stove top */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[0.7, 0.06, 0.6]} />
        <meshStandardMaterial color="#2f2f33" flatShading />
      </mesh>
      {/* Burners */}
      {burners.map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 1.06, dz]}>
          <cylinderGeometry args={[0.09, 0.09, 0.02, 16]} />
          <meshStandardMaterial
            ref={(el) => (burnerMats.current[i] = el)}
            color="#1c1c1f"
            emissive="#ff5a1a"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
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
      <Stove />

      {/* Fridge — back-right corner */}
      <mesh position={[1.4, 0.75, -1.05]} castShadow>
        <boxGeometry args={[0.8, 1.5, 0.7]} />
        <meshStandardMaterial color="#dfe3e6" flatShading />
      </mesh>

      {/* Couch — front-left, on the rug (base, back, arms) */}
      <group position={[-0.6, 0, 0.4]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[1.5, 0.4, 0.7]} />
          <meshStandardMaterial color="#4f6d5b" flatShading />
        </mesh>
        <mesh position={[0, 0.6, -0.28]} castShadow>
          <boxGeometry args={[1.5, 0.6, 0.15]} />
          <meshStandardMaterial color="#59795f" flatShading />
        </mesh>
        {[-0.72, 0.72].map((ax) => (
          <mesh key={ax} position={[ax, 0.42, 0]} castShadow>
            <boxGeometry args={[0.16, 0.5, 0.7]} />
            <meshStandardMaterial color="#59795f" flatShading />
          </mesh>
        ))}
      </group>

      {/* Coffee table with legs */}
      <group position={[-0.6, 0, 1.0]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.9, 0.1, 0.5]} />
          <meshStandardMaterial color="#6b4a2f" flatShading />
        </mesh>
        {[
          [-0.38, 0.2],
          [0.38, 0.2],
          [-0.38, -0.2],
          [0.38, -0.2],
        ].map((p, i) => (
          <mesh key={i} position={[p[0], 0.15, p[1]]} castShadow>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color="#553a24" flatShading />
          </mesh>
        ))}
      </group>

      {/* Potted plant in the corner for a bit of life */}
      <group position={[1.3, 0, 0.9]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.12, 0.4, 6]} />
          <meshStandardMaterial color="#b5623f" flatShading />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <icosahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color="#4a9b4e" flatShading />
        </mesh>
      </group>
    </group>
  )
}
