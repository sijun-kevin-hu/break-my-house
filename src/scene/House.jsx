import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { useClickable } from './useClickable'
import InteriorModel from './InteriorModel'

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
 *  - tree: roof section removed, bright broken shingles, dangling ceiling panel
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

// The north-west roof panel is built from five flush pieces. The center piece
// can be hidden after the tree strike, creating an actual opening without
// changing the silhouette or cutaway behavior of the rest of the roof.
const ROOF_HALF_X = ROOF_PANEL_LENGTH / 2
const ROOF_HALF_Z = ROOF_LENGTH / 2
const TREE_HOLE = { xMin: -0.15, xMax: 1.15, zMin: -1.92, zMax: -0.42 }
const roofSegment = (id, xMin, xMax, zMin, zMax, impact = false) => ({
  id,
  impact,
  position: [(xMin + xMax) / 2, 0, (zMin + zMax) / 2],
  size: [xMax - xMin, 0.18, zMax - zMin],
})
const LEFT_ROOF_SEGMENTS = [
  roofSegment('outer', -ROOF_HALF_X, TREE_HOLE.xMin, -ROOF_HALF_Z, ROOF_HALF_Z),
  roofSegment('ridge', TREE_HOLE.xMax, ROOF_HALF_X, -ROOF_HALF_Z, ROOF_HALF_Z),
  roofSegment('north', TREE_HOLE.xMin, TREE_HOLE.xMax, -ROOF_HALF_Z, TREE_HOLE.zMin),
  roofSegment('south', TREE_HOLE.xMin, TREE_HOLE.xMax, TREE_HOLE.zMax, ROOF_HALF_Z),
  roofSegment(
    'impact',
    TREE_HOLE.xMin,
    TREE_HOLE.xMax,
    TREE_HOLE.zMin,
    TREE_HOLE.zMax,
    true
  ),
]

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
  const treeDamageMeshRefs = useRef([])
  const treeDamageMatRefs = useRef([])

  const triggered = useGameStore((s) => !!s.triggered.hail)
  const treeTriggered = useGameStore((s) => !!s.triggered.tree)
  const treeRemoved = useGameStore((s) => !!s.preventions.removeTree)
  const trigger = useGameStore((s) => s.triggerDisaster)
  const { hovered, bind } = useClickable(() => trigger('hail'), triggered)
  const [treeImpactVisible, setTreeImpactVisible] = useState(false)

  useEffect(() => {
    if (!treeTriggered || treeRemoved) {
      setTreeImpactVisible(false)
      return undefined
    }
    const timer = setTimeout(() => setTreeImpactVisible(true), 850)
    return () => clearTimeout(timer)
  }, [treeTriggered, treeRemoved])

  useFrame(({ camera }) => {
    const roofMats = roofMatRefs.current
    const gableMats = gableMatRefs.current
    const chimneyMat = chimneyMatRef.current
    if (
      roofMats.length !== LEFT_ROOF_SEGMENTS.length + 1 ||
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
    treeDamageMatRefs.current.forEach((mat) => {
      if (mat) mat.opacity = roofMats[0].opacity
    })
    // Shadows ignore material opacity, so kill the cast shadow once faded or the
    // interior stays darkened by a phantom roof.
    const solid = roofMats[0].opacity > 0.5
    const roofPieces = [
      ...roofRefs.current,
      ...gableRefs.current,
      chimneyRef.current,
      ...treeDamageMeshRefs.current,
    ]
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
      {/* The left pitch is segmented around the tree's impact zone. Before the
          strike the pieces read as one continuous roof; after impact the center
          piece disappears and exposes a real opening. */}
      <group
        position={[-ROOF_RUN / 2, H + ROOF_RISE / 2 + 0.03, 0]}
        rotation={[0, 0, ROOF_SLOPE]}
      >
        {LEFT_ROOF_SEGMENTS.map((segment, index) => (
          <mesh
            key={segment.id}
            ref={(el) => (roofRefs.current[index] = el)}
            position={segment.position}
            visible={!segment.impact || !treeImpactVisible || treeRemoved}
            castShadow
            {...bind}
          >
            <boxGeometry args={segment.size} />
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
      </group>

      {/* The opposite pitch remains a single uninterrupted panel. */}
      <mesh
        ref={(el) => (roofRefs.current[LEFT_ROOF_SEGMENTS.length] = el)}
        position={[ROOF_RUN / 2, H + ROOF_RISE / 2 + 0.03, 0]}
        rotation={[0, 0, -ROOF_SLOPE]}
        castShadow
        {...bind}
      >
        <boxGeometry args={[ROOF_PANEL_LENGTH, 0.18, ROOF_LENGTH]} />
        <meshStandardMaterial
          ref={(el) => (roofMatRefs.current[LEFT_ROOF_SEGMENTS.length] = el)}
          color={color}
          emissive="#ffcaa0"
          emissiveIntensity={0}
          flatShading
          transparent
          opacity={1}
        />
      </mesh>

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

      {treeImpactVisible && (
        <group>
          {/* Dark cavity beneath the missing roof segment. Tree removal keeps
              treeImpactVisible false, so this entire aftermath is skipped. */}
          <mesh
            ref={(el) => (treeDamageMeshRefs.current[0] = el)}
            position={[-1.12, 3.84, -1.18]}
            rotation={[0.04, -0.08, ROOF_SLOPE]}
            castShadow
          >
            <boxGeometry args={[1.18, 0.05, 1.34]} />
            <meshStandardMaterial
              ref={(el) => (treeDamageMatRefs.current[0] = el)}
              color="#17191b"
              flatShading
              transparent
              opacity={1}
            />
          </mesh>

          <>
              <mesh
                ref={(el) => (treeDamageMeshRefs.current[1] = el)}
                position={[-0.92, 4.18, -1.18]}
                rotation={[0.1, 0.18, ROOF_SLOPE - 0.32]}
                castShadow
              >
                <boxGeometry args={[0.18, 0.16, 1.6]} />
                <meshStandardMaterial
                  ref={(el) => (treeDamageMatRefs.current[1] = el)}
                  color="#b47b4d"
                  flatShading
                  transparent
                  opacity={1}
                />
              </mesh>
              <mesh
                ref={(el) => (treeDamageMeshRefs.current[2] = el)}
                position={[-1.42, 3.98, -0.94]}
                rotation={[-0.05, -0.35, ROOF_SLOPE + 0.45]}
                castShadow
              >
                <boxGeometry args={[0.5, 0.11, 0.42]} />
                <meshStandardMaterial
                  ref={(el) => (treeDamageMatRefs.current[2] = el)}
                  color="#f06a45"
                  emissive="#7d1d12"
                  emissiveIntensity={0.22}
                  flatShading
                  transparent
                  opacity={1}
                />
              </mesh>
              <mesh
                ref={(el) => (treeDamageMeshRefs.current[3] = el)}
                position={[-0.6, 4.33, -1.45]}
                rotation={[0.12, 0.3, ROOF_SLOPE - 0.18]}
                castShadow
              >
                <boxGeometry args={[0.42, 0.1, 0.58]} />
                <meshStandardMaterial
                  ref={(el) => (treeDamageMatRefs.current[3] = el)}
                  color="#df5138"
                  emissive="#71180f"
                  emissiveIntensity={0.22}
                  flatShading
                  transparent
                  opacity={1}
                />
              </mesh>
              <mesh
                ref={(el) => (treeDamageMeshRefs.current[4] = el)}
                position={[-1.72, 3.84, -1.38]}
                rotation={[-0.1, 0.42, ROOF_SLOPE + 0.58]}
                castShadow
              >
                <boxGeometry args={[0.46, 0.11, 0.66]} />
                <meshStandardMaterial
                  ref={(el) => (treeDamageMatRefs.current[4] = el)}
                  color="#f47a4f"
                  emissive="#7d1d12"
                  emissiveIntensity={0.2}
                  flatShading
                  transparent
                  opacity={1}
                />
              </mesh>
              <mesh
                ref={(el) => (treeDamageMeshRefs.current[5] = el)}
                position={[-0.48, 4.34, -0.82]}
                rotation={[0.16, -0.28, ROOF_SLOPE - 0.4]}
                castShadow
              >
                <boxGeometry args={[0.38, 0.1, 0.54]} />
                <meshStandardMaterial
                  ref={(el) => (treeDamageMatRefs.current[5] = el)}
                  color="#e95b3f"
                  emissive="#761a11"
                  emissiveIntensity={0.2}
                  flatShading
                  transparent
                  opacity={1}
                />
              </mesh>

              {/* This interior damage intentionally does not fade with the roof:
                  it becomes the focal point when the cutaway opens. */}
              <group>
                <mesh
                  position={[-0.76, 3.48, -1.12]}
                  rotation={[0.08, 0, 0.18]}
                  castShadow
                  raycast={NOOP_RAYCAST}
                >
                  <boxGeometry args={[0.07, 0.94, 0.07]} />
                  <meshStandardMaterial color="#9a6b43" flatShading />
                </mesh>
                <mesh
                  position={[-1.35, 3.43, -1.02]}
                  rotation={[-0.1, 0, -0.25]}
                  castShadow
                  raycast={NOOP_RAYCAST}
                >
                  <boxGeometry args={[0.06, 0.82, 0.06]} />
                  <meshStandardMaterial color="#8a5a39" flatShading />
                </mesh>
                <group position={[-1.05, 2.98, -1.08]} rotation={[0.3, 0.08, -0.24]}>
                  <mesh castShadow raycast={NOOP_RAYCAST}>
                    <boxGeometry args={[1.18, 0.09, 0.86]} />
                    <meshStandardMaterial color="#e9dcc6" flatShading />
                  </mesh>
                  <mesh
                    position={[0.38, -0.07, 0.22]}
                    rotation={[0.08, 0.25, -0.12]}
                    castShadow
                    raycast={NOOP_RAYCAST}
                  >
                    <boxGeometry args={[0.48, 0.07, 0.42]} />
                    <meshStandardMaterial color="#c8b69d" flatShading />
                  </mesh>
                </group>
              </group>
          </>
        </group>
      )}
    </group>
  )
}

export default function House() {
  const damage = useGameStore((s) => s.damage)

  const roofColor =
    damage.hail === 'full'
      ? COLORS.roofDented
      : damage.hail === 'reduced'
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
    <group position={[-1.78, 0, -1.45]} {...bind}>
      {/* Quaternius oven; the glowing burner discs preserve the fire affordance. */}
      <InteriorModel asset="/models/house-interior/Oven.glb" scale={0.75} />
      {burners.map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 1.22, dz]}>
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

/** A compact TV console faces the sofa, making the living zone read instantly. */
function Television() {
  return (
    <group position={[-1.15, 0, -0.78]}>
      {/* Low media console */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.4, 0.48, 0.38]} />
        <meshStandardMaterial color="#6b4a2f" flatShading />
      </mesh>
      <mesh position={[0, 0.28, 0.21]} castShadow>
        <boxGeometry args={[0.82, 0.22, 0.03]} />
        <meshStandardMaterial color="#4b3221" flatShading />
      </mesh>

      {/* Warm wood frame, charcoal bezel, and a faintly lit blue screen. */}
      <mesh position={[0, 0.95, -0.04]} castShadow>
        <boxGeometry args={[1.28, 0.82, 0.1]} />
        <meshStandardMaterial color="#493328" flatShading />
      </mesh>
      <mesh position={[0, 0.95, 0.02]}>
        <boxGeometry args={[1.12, 0.66, 0.035]} />
        <meshStandardMaterial
          color="#172a3a"
          emissive="#22465c"
          emissiveIntensity={0.28}
          roughness={0.35}
        />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.08, 0]} castShadow>
          <boxGeometry args={[0.08, 0.26, 0.25]} />
          <meshStandardMaterial color="#4b3221" flatShading />
        </mesh>
      ))}
    </group>
  )
}

/**
 * A mix of bespoke interaction geometry and Quaternius CC0 GLB props. The
 * house shell stays custom because it owns the cutaway and damage behavior;
 * authored props make the revealed interior feel more lived-in.
 */
function Furniture() {
  return (
    <group>
      {/* Kitchen run: stove, sink, and fridge line the back wall at a shared height. */}
      <Stove />
      <InteriorModel
        asset="/models/house-interior/Kitchen Sink.glb"
        position={[-0.45, 0, -1.45]}
        scale={0.62}
      />
      <InteriorModel
        asset="/models/house-interior/Kitchen Fridge.glb"
        position={[1.75, 0, -1.45]}
        scale={0.55}
      />

      {/* Living area: compact sofa faces the coffee table and the open room. */}
      <InteriorModel
        asset="/models/house-interior/Couch Small-X9msj0gtb5.glb"
        position={[-1.15, 0, 1.1]}
        scale={0.55}
      />
      <InteriorModel
        asset="/models/house-interior/Table Round Small.glb"
        position={[-1.15, 0.02, 0.05]}
        scale={0.43}
      />
      <InteriorModel asset="/models/house-interior/Lamp.glb" position={[-2.3, 0, 0.7]} scale={1.3} />
      <Television />

      {/* Dining nook: two chairs make the round table read as intentional. */}
      <InteriorModel
        asset="/models/house-interior/Table Round Small.glb"
        position={[1.25, 0.02, 0.55]}
        scale={0.48}
      />
      <InteriorModel
        asset="/models/house-interior/Chair.glb"
        position={[1.25, 0, 1.45]}
        rotation={[0, Math.PI, 0]}
        scale={0.45}
      />
      <InteriorModel
        asset="/models/house-interior/Chair.glb"
        position={[1.25, 0, -0.35]}
        scale={0.45}
      />
      <InteriorModel
        asset="/models/house-interior/Houseplant.glb"
        position={[1.25, 0.58, 0.55]}
        scale={0.75}
      />

      {/* Tall storage and plant life give the exposed side of the house depth. */}
      <InteriorModel
        asset="/models/house-interior/Shelf Large.glb"
        position={[2.55, 0, -0.15]}
        rotation={[0, Math.PI / 2, 0]}
        scale={0.36}
      />
      <InteriorModel
        asset="/models/house-interior/Houseplant-VtJh4Irl4w.glb"
        position={[2.1, 0, 1.25]}
        scale={1.15}
      />
    </group>
  )
}
