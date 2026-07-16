import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { useClickable } from './useClickable'
import DisasterTargetCue from './DisasterTargetCue'
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
  roof: '#c94f3d',
  roofDented: '#7a3a30',
  roofScuffed: '#b04a3a',
  door: '#7a4a2b',
  window: '#9fd8ef',
  floor: '#caa472',
  rug: '#6b8f9c',
}
const WALL_BASE_COLOR = new THREE.Color(COLORS.wall)
const WALL_CHAR_COLOR = new THREE.Color('#171513')
const ROOF_BASE_COLOR = new THREE.Color(COLORS.roof)
const ROOF_DENTED_COLOR = new THREE.Color(COLORS.roofDented)
const ROOF_SCUFFED_COLOR = new THREE.Color(COLORS.roofScuffed)

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
const roofSurfaceY = (x) =>
  H + 0.13 + ROOF_RISE * (1 - Math.min(ROOF_RUN, Math.abs(x)) / ROOF_RUN)
const HAIL_DENTS = Array.from({ length: 11 }, (_, i) => {
  const x = -2.58 + ((i * 43) % 51) * 0.101
  const z = -1.82 + ((i * 29) % 36) * 0.103
  return {
    position: [x, roofSurfaceY(x), z],
    rotation: [0, 0, x < 0 ? ROOF_SLOPE : -ROOF_SLOPE],
    radius: 0.18 + (i % 4) * 0.035,
  }
})

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

function Wall({ id, normal, position, size, fireActive, fireReduced }) {
  const meshRef = useRef()
  const matRef = useRef()
  const burnProgress = useRef(0)

  useFrame(({ camera }, delta) => {
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

    // The north and west kitchen walls char most heavily. The remaining walls
    // pick up only a faint smoke stain so the burn stays localized and legible.
    const proximity = id === 'north' ? 1 : id === 'west' ? 0.92 : 0.18
    const severity = fireReduced ? 0.24 : 1
    const burnTarget = fireActive ? proximity * severity : 0
    burnProgress.current = THREE.MathUtils.damp(
      burnProgress.current,
      burnTarget,
      fireActive ? 0.82 : 4,
      delta
    )
    mat.color.lerpColors(WALL_BASE_COLOR, WALL_CHAR_COLOR, burnProgress.current)
  })

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial ref={matRef} color={COLORS.wall} flatShading transparent opacity={1} />
    </mesh>
  )
}

/**
 * Persistent, overlapping burn patches that make the unprotected fire's route
 * read as one broad floor-level aftermath instead of a few isolated spots.
 */
function FireScorch({ active, reduced }) {
  const mats = useRef([])
  const age = useRef(0)

  const marks = [
    // Stove and counter: a large, dense ignition zone.
    { position: [-1.76, 0.121, -1.37], radius: 1.28, scale: [1.18, 0.78, 1], delay: 0, opacity: 0.98 },
    { position: [-1.43, 0.122, -1.18], radius: 1.06, scale: [1.4, 0.52, 1], delay: 0.18, opacity: 0.9 },
    { position: [-1.3, 0.123, -0.78], radius: 1.12, scale: [1.28, 0.62, 1], delay: 0.62, opacity: 0.94 },
    { position: [-0.88, 0.124, -0.92], radius: 0.82, scale: [1.35, 0.48, 1], delay: 0.82, opacity: 0.76 },
    // The TV and fridge burn a continuous path across the front of the room.
    { position: [-1.06, 0.124, -0.34], radius: 1.02, scale: [1.45, 0.58, 1], delay: 1.3, opacity: 0.92 },
    { position: [-0.48, 0.123, -0.48], radius: 0.78, scale: [1.28, 0.48, 1], delay: 1.55, opacity: 0.7 },
    { position: [0.18, 0.123, -0.82], radius: 0.9, scale: [1.48, 0.5, 1], delay: 1.78, opacity: 0.78 },
    { position: [0.9, 0.123, -1.14], radius: 0.9, scale: [1.34, 0.62, 1], delay: 2.0, opacity: 0.86 },
    { position: [1.54, 0.122, -1.3], radius: 0.72, scale: [1.14, 0.54, 1], delay: 2.22, opacity: 0.68 },
    // Living, dining, and storage get broad but irregular trailing patches.
    { position: [-1.18, 0.124, 0.42], radius: 1.1, scale: [1.28, 0.76, 1], delay: 2.45, opacity: 0.94 },
    { position: [-0.74, 0.123, 0.86], radius: 0.9, scale: [1.36, 0.52, 1], delay: 2.72, opacity: 0.78 },
    { position: [0.1, 0.123, 0.68], radius: 0.82, scale: [1.4, 0.54, 1], delay: 2.92, opacity: 0.72 },
    { position: [0.88, 0.123, 0.46], radius: 1.02, scale: [1.35, 0.66, 1], delay: 3.0, opacity: 0.88 },
    { position: [1.52, 0.122, 0.54], radius: 0.76, scale: [1.2, 0.5, 1], delay: 3.22, opacity: 0.7 },
    { position: [2.18, 0.122, -0.08], radius: 0.7, scale: [1.1, 0.52, 1], delay: 3.5, opacity: 0.7 },
  ]

  useFrame((_, delta) => {
    age.current = active ? age.current + delta : 0
    mats.current.forEach((material, index) => {
      if (!material) return
      const mark = marks[index]
      const hasReachedMark = active && age.current >= mark.delay
      const target = hasReachedMark
        ? (reduced ? (index === 0 ? 0.42 : index === 1 ? 0.16 : 0) : mark.opacity)
        : 0
      material.opacity = THREE.MathUtils.damp(material.opacity, target, active ? 1.25 : 4, delta)
    })
  })

  return (
    <group>
      {marks.map((mark, index) => (
        <mesh
          key={index}
          position={mark.position}
          rotation={[-Math.PI / 2, 0, index * 0.38]}
          scale={mark.scale}
          renderOrder={2}
        >
          <circleGeometry args={[mark.radius, 9]} />
          <meshBasicMaterial
            ref={(material) => (mats.current[index] = material)}
            color={index % 3 === 0 ? '#0b0705' : index % 2 ? '#24110a' : '#140906'}
            transparent
            opacity={0}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ))}
    </group>
  )
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const NOOP_RAYCAST = () => {}

/** Roof dents land in a staggered sequence instead of popping in with the panel. */
function HailDamage({ state, active, reduced, opacitySource }) {
  const materialRefs = useRef([])
  const groupRefs = useRef([])
  const ageRef = useRef(0)
  const visualState = active ? (reduced ? 'reduced' : 'full') : state
  const full = visualState === 'full'
  const count = full ? HAIL_DENTS.length : visualState === 'reduced' ? 3 : 0

  useFrame((_, delta) => {
    ageRef.current = active ? ageRef.current + delta : 0
    const opacity = opacitySource.current[0]?.opacity ?? 1
    groupRefs.current.forEach((group, index) => {
      if (!group) return
      const reveal = THREE.MathUtils.smootherstep(
        Math.max(0, ageRef.current - index * 0.11) / 0.58,
        0,
        1
      )
      group.visible = opacity > 0.04 && reveal > 0.001
      group.scale.setScalar(0.015 + reveal * 0.985)
    })
    materialRefs.current.forEach((material, index) => {
      if (!material) return
      const dentIndex = Math.floor(index / 2)
      const reveal = THREE.MathUtils.smootherstep(
        Math.max(0, ageRef.current - dentIndex * 0.11) / 0.58,
        0,
        1
      )
      material.opacity = opacity * reveal
    })
  })

  if (!count) return null

  return (
    <group>
      {HAIL_DENTS.slice(0, count).map((dent, index) => (
        <group
          key={index}
          ref={(group) => (groupRefs.current[index] = group)}
          position={dent.position}
          rotation={dent.rotation}
        >
          <mesh scale={[dent.radius, full ? 0.075 : 0.035, dent.radius]} raycast={NOOP_RAYCAST}>
            <sphereGeometry args={[1, 12, 7]} />
            <meshStandardMaterial
              ref={(material) => (materialRefs.current[index * 2] = material)}
              color={full ? '#2a201f' : '#7d3934'}
              emissive={full ? '#120d0c' : '#3e1614'}
              emissiveIntensity={0.18}
              roughness={1}
              transparent
              opacity={1}
              flatShading
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, index * 0.35]} raycast={NOOP_RAYCAST}>
            <torusGeometry args={[dent.radius * 0.82, full ? 0.035 : 0.018, 5, 12]} />
            <meshStandardMaterial
              ref={(material) => (materialRefs.current[index * 2 + 1] = material)}
              color={full ? '#e98262' : '#b75445'}
              emissive="#6a211a"
              emissiveIntensity={full ? 0.24 : 0.1}
              transparent
              opacity={1}
              flatShading
            />
          </mesh>
          {full && index < 7 && (
            <>
              <mesh position={[dent.radius * 0.8, 0.05, 0.04]} rotation={[0.2, 0.4, 0.35]} raycast={NOOP_RAYCAST} castShadow>
                <boxGeometry args={[0.08, 0.055, 0.24]} />
                <meshStandardMaterial color="#d65a45" flatShading />
              </mesh>
              <mesh position={[-dent.radius * 0.7, 0.04, -0.06]} rotation={[-0.1, -0.35, -0.28]} raycast={NOOP_RAYCAST} castShadow>
                <boxGeometry args={[0.07, 0.05, 0.18]} />
                <meshStandardMaterial color="#a83f35" flatShading />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  )
}

/**
 * Gable roof (with its chimney) reveals the interior on either trigger — tilting the
 * camera toward top-down OR zooming in close — so you're never left with the
 * roof blocking the rooms (Sims-style doll's house). Both fade together, fully
 * to zero, and stop casting their shadow onto the floor once hidden. Kept
 * raycastable (never visible=false) so the roof can still be a click target for
 * the hail disaster later.
 */
function Roof({ wallColor }) {
  const roofRefs = useRef([])
  const roofMatRefs = useRef([])
  const gableRefs = useRef([])
  const gableMatRefs = useRef([])
  const chimneyRef = useRef()
  const chimneyMatRef = useRef()
  const treeDamageMeshRefs = useRef([])
  const treeDamageMatRefs = useRef([])

  const triggered = useGameStore((s) => !!s.triggered.hail)
  const acknowledgementRequired = useGameStore((s) => s.acknowledgementRequired)
  const hailDamage = useGameStore((s) => s.damage.hail)
  const protectedByRoof = useGameStore((s) => !!s.preventions.hail)
  const treeTriggered = useGameStore((s) => !!s.triggered.tree)
  const treeRemoved = useGameStore((s) => !!s.preventions.removeTree)
  const trigger = useGameStore((s) => s.triggerDisaster)
  const { hovered, bind } = useClickable(
    () => trigger('hail'),
    triggered || acknowledgementRequired
  )
  const [treeImpactVisible, setTreeImpactVisible] = useState(false)

  useEffect(() => {
    if (!treeTriggered || treeRemoved) {
      setTreeImpactVisible(false)
      return undefined
    }
    const timer = setTimeout(() => setTreeImpactVisible(true), 850)
    return () => clearTimeout(timer)
  }, [treeTriggered, treeRemoved])

  useFrame(({ camera }, delta) => {
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
    const roofColor = triggered
      ? (protectedByRoof ? ROOF_SCUFFED_COLOR : ROOF_DENTED_COLOR)
      : ROOF_BASE_COLOR
    roofMats.forEach((mat) => {
      mat.opacity += (target - mat.opacity) * 0.15
      mat.color.lerp(roofColor, Math.min(1, delta * 1.25))
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
              color={COLORS.roof}
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
          color={COLORS.roof}
          emissive="#ffcaa0"
          emissiveIntensity={0}
          flatShading
          transparent
          opacity={1}
        />
      </mesh>

      <HailDamage
        state={hailDamage}
        active={triggered}
        reduced={protectedByRoof}
        opacitySource={roofMatRefs}
      />
      {hovered && (
        <DisasterTargetCue
          position={[0, H + ROOF_RISE + 0.5, 0]}
          radius={1.35}
        />
      )}

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
  const fireActive = useGameStore((s) => !!s.triggered.fire)
  const fireReduced = useGameStore((s) => !!s.preventions.fire)

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
        <Wall
          key={w.id}
          {...w}
          fireActive={fireActive}
          fireReduced={fireReduced}
        />
      ))}

      <FireScorch active={fireActive} reduced={fireReduced} />

      {/* Proper gable roof — fades as camera tilts top-down */}
      <Roof wallColor={COLORS.wall} />

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
  const acknowledgementRequired = useGameStore((s) => s.acknowledgementRequired)
  const protectedByPrevention = useGameStore((s) => !!s.preventions.fire)
  const trigger = useGameStore((s) => s.triggerDisaster)
  const { hovered, bind } = useClickable(
    () => trigger('fire'),
    triggered || acknowledgementRequired
  )

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
      <InteriorModel
        asset="/models/house-interior/Oven.glb"
        scale={0.75}
        burnActive={triggered}
        burnStrength={protectedByPrevention ? 0.35 : 1}
      />
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
      {hovered && (
        <DisasterTargetCue
          position={[0, 1.65, 0]}
          color="#ff8a43"
          radius={0.48}
        />
      )}
    </group>
  )
}

const TV_CHAR_COLOR = new THREE.Color('#090807')
const TV_SCREEN_BASE_COLOR = new THREE.Color('#172a3a')
const TV_BASE_COLORS = [
  new THREE.Color('#6b4a2f'),
  new THREE.Color('#4b3221'),
  new THREE.Color('#493328'),
]

/** A compact TV console faces the sofa and visibly chars when fire reaches it. */
function Television() {
  const fireActive = useGameStore((s) => !!s.triggered.fire)
  const fireReduced = useGameStore((s) => !!s.preventions.fire)
  const burnMats = useRef([])
  const scorchMats = useRef([])
  const scorchMeshes = useRef([])
  const screenMat = useRef()
  const fireAge = useRef(0)
  const burnProgress = useRef(0)

  useFrame((state, delta) => {
    fireAge.current = fireActive ? fireAge.current + delta : 0
    const spreadReachedTv = fireActive && !fireReduced && fireAge.current > 1.25
    const target = spreadReachedTv ? 1 : fireActive && fireReduced ? 0.12 : 0
    burnProgress.current = THREE.MathUtils.damp(
      burnProgress.current,
      target,
      spreadReachedTv ? 0.95 : 4,
      delta
    )

    burnMats.current.forEach((material, index) => {
      if (!material) return
      material.color.lerpColors(TV_BASE_COLORS[index], TV_CHAR_COLOR, burnProgress.current)
      material.roughness = THREE.MathUtils.lerp(0.7, 1, burnProgress.current)
    })

    scorchMats.current.forEach((material, index) => {
      if (!material) return
      material.opacity = burnProgress.current * (index === 0 ? 0.96 : 0.78)
    })
    scorchMeshes.current.forEach((mesh, index) => {
      if (!mesh) return
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3 + index) * 0.025
      mesh.scale.setScalar((0.35 + burnProgress.current * 0.9) * pulse)
    })

    if (screenMat.current) {
      screenMat.current.emissiveIntensity = THREE.MathUtils.lerp(
        0.28,
        0.015,
        burnProgress.current
      )
      screenMat.current.color.lerpColors(
        TV_SCREEN_BASE_COLOR,
        TV_CHAR_COLOR,
        burnProgress.current * 0.82
      )
    }
  })

  return (
    <group position={[-1.15, 0, -0.78]}>
      {/* Low media console */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.4, 0.48, 0.38]} />
        <meshStandardMaterial ref={(material) => (burnMats.current[0] = material)} color="#6b4a2f" flatShading />
      </mesh>
      <mesh position={[0, 0.28, 0.21]} castShadow>
        <boxGeometry args={[0.82, 0.22, 0.03]} />
        <meshStandardMaterial ref={(material) => (burnMats.current[1] = material)} color="#4b3221" flatShading />
      </mesh>

      {/* Warm wood frame, charcoal bezel, and a faintly lit blue screen. */}
      <mesh position={[0, 0.95, -0.04]} castShadow>
        <boxGeometry args={[1.28, 0.82, 0.1]} />
        <meshStandardMaterial ref={(material) => (burnMats.current[2] = material)} color="#493328" flatShading />
      </mesh>
      <mesh position={[0, 0.95, 0.02]}>
        <boxGeometry args={[1.12, 0.66, 0.035]} />
        <meshStandardMaterial
          ref={screenMat}
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

      {/* Rear-panel scorch decals face the stove and grow as the fire spreads. */}
      {[
        { position: [-0.28, 1.02, -0.096], radius: 0.42, scale: [1.15, 0.92, 1] },
        { position: [0.32, 0.84, -0.097], radius: 0.34, scale: [0.9, 1.18, 1] },
        { position: [-0.18, 0.3, -0.196], radius: 0.42, scale: [1.45, 0.66, 1] },
      ].map((mark, index) => (
        <mesh
          key={`tv-scorch-${index}`}
          ref={(mesh) => (scorchMeshes.current[index] = mesh)}
          position={mark.position}
          rotation={[0, Math.PI, index * 0.4]}
          scale={mark.scale}
          renderOrder={3}
        >
          <circleGeometry args={[mark.radius, 12]} />
          <meshStandardMaterial
            ref={(material) => (scorchMats.current[index] = material)}
            color={index === 0 ? '#050403' : '#1a0e09'}
            transparent
            opacity={0}
            depthWrite={false}
            roughness={1}
          />
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
  const fireActive = useGameStore((s) => !!s.triggered.fire)
  const fireReduced = useGameStore((s) => !!s.preventions.fire)

  return (
    <group>
      {/* Kitchen run: stove, sink, and fridge line the back wall at a shared height. */}
      <Stove />
      <InteriorModel
        asset="/models/house-interior/Kitchen Sink.glb"
        position={[-0.45, 0, -1.45]}
        scale={0.62}
        burnActive={fireActive}
        burnStrength={fireReduced ? 0.16 : 0.82}
        burnDelay={fireReduced ? 0 : 0.72}
      />
      <InteriorModel
        asset="/models/house-interior/Kitchen Fridge.glb"
        position={[1.75, 0, -1.45]}
        scale={0.55}
        burnActive={fireActive}
        burnStrength={fireReduced ? 0.06 : 0.4}
        burnDelay={fireReduced ? 0 : 2.05}
      />

      {/* Living area: turn the sofa toward the TV across the coffee table. */}
      <InteriorModel
        asset="/models/house-interior/Couch Small-X9msj0gtb5.glb"
        position={[-1.15, 0, 1.1]}
        rotation={[0, Math.PI, 0]}
        scale={0.55}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.88}
        burnDelay={2.55}
      />
      <InteriorModel
        asset="/models/house-interior/Table Round Small.glb"
        position={[-1.15, 0.02, 0.05]}
        scale={0.43}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.58}
        burnDelay={2.9}
      />
      <InteriorModel
        asset="/models/house-interior/Lamp.glb"
        position={[-2.3, 0, 0.7]}
        scale={1.3}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.68}
        burnDelay={3.2}
      />
      <Television />

      {/* Dining nook: two chairs make the round table read as intentional. */}
      <InteriorModel
        asset="/models/house-interior/Table Round Small.glb"
        position={[1.25, 0.02, 0.55]}
        scale={0.48}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.82}
        burnDelay={3.05}
      />
      <InteriorModel
        asset="/models/house-interior/Chair.glb"
        position={[1.25, 0, 1.45]}
        rotation={[0, Math.PI, 0]}
        scale={0.45}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.72}
        burnDelay={3.28}
      />
      <InteriorModel
        asset="/models/house-interior/Chair.glb"
        position={[1.25, 0, -0.35]}
        scale={0.45}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.64}
        burnDelay={3.42}
      />
      <InteriorModel
        asset="/models/house-interior/Houseplant.glb"
        position={[1.25, 0.58, 0.55]}
        scale={0.75}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.78}
        burnDelay={3.42}
      />

      {/* Tall storage and plant life give the exposed side of the house depth. */}
      <InteriorModel
        asset="/models/house-interior/Shelf Large.glb"
        position={[2.55, 0, -0.15]}
        rotation={[0, Math.PI / 2, 0]}
        scale={0.36}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.78}
        burnDelay={3.5}
      />
      <InteriorModel
        asset="/models/house-interior/Houseplant-VtJh4Irl4w.glb"
        position={[2.1, 0, 1.25]}
        scale={1.15}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.74}
        burnDelay={3.65}
      />
    </group>
  )
}
