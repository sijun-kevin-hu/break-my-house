import { useEffect, useMemo, useRef, useState } from 'react'
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
 *  - electrical: the overloaded bedroom strip and connected devices char or trip
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
const WING_X_MIN = W / 2
const WING_X_MAX = 9.6
const WING_WIDTH = WING_X_MAX - WING_X_MIN
const WING_CENTER_X = (WING_X_MIN + WING_X_MAX) / 2
const WING_DEPTH = 6.8
const WING_ROOF_BASE = 2.42
const WING_ROOF_EAVE = 0.32
// Carry the lower gable across the complete shared-wall run, then tuck its
// inner edge just beneath the main eave. Starting at the old eave line left a
// visible uncovered strip where the addition met the original house.
// The tiny inset prevents coplanar roof faces and their transparent-material
// sorting artifacts while keeping the two roofs visually continuous.
const WING_ROOF_X_MIN = WING_X_MIN - 0.02
const WING_ROOF_X_MAX = WING_X_MAX + WING_ROOF_EAVE
const WING_ROOF_WIDTH = WING_ROOF_X_MAX - WING_ROOF_X_MIN
const WING_ROOF_CENTER_X = (WING_ROOF_X_MIN + WING_ROOF_X_MAX) / 2
const WING_ROOF_RISE = 1.12
const WING_ROOF_RUN = WING_DEPTH / 2 + WING_ROOF_EAVE
const WING_ROOF_SLOPE = Math.atan(WING_ROOF_RISE / WING_ROOF_RUN)
const WING_ROOF_PANEL_LENGTH = Math.hypot(WING_ROOF_RUN, WING_ROOF_RISE)
const CAM_TARGET = [3.1, 2.1, 0] // must match OrbitControls target in Scene.jsx

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
// The attached gable needs its own damage map: its ridge runs east-west while
// the original roof's ridge runs north-south, so the dent orientation cannot be
// shared. These positions deliberately span the bedrooms and bathroom wing.
const wingRoofSurfaceY = (z) =>
  WING_ROOF_BASE +
  WING_ROOF_RISE * (1 - Math.min(WING_ROOF_RUN, Math.abs(z)) / WING_ROOF_RUN) +
  0.13
const WING_HAIL_DENTS = Array.from({ length: 13 }, (_, i) => {
  const x = 3.18 + ((i * 41) % 62) * 0.101
  const z = -3.02 + ((i * 37) % 58) * 0.104
  return {
    position: [x, wingRoofSurfaceY(z), z],
    rotation: [z < 0 ? -WING_ROOF_SLOPE : WING_ROOF_SLOPE, 0, 0],
    radius: 0.17 + (i % 4) * 0.033,
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
  // The east wall is segmented around a real opening into the bedroom wing.
  { id: 'east-north', normal: [1, 0, 0], position: [W / 2, H / 2, -1.375], size: [T, H, 1.45] },
  { id: 'east-south', normal: [1, 0, 0], position: [W / 2, H / 2, 1.375], size: [T, H, 1.45] },
  { id: 'east-lintel', normal: [1, 0, 0], position: [W / 2, 2.5, 0], size: [T, 1.2, 1.3] },
  { id: 'west', normal: [-1, 0, 0], position: [-W / 2, H / 2, 0], size: [T, H, D] },
]

/**
 * One continuous cutaway model for the complete house. Using the shared orbit
 * target avoids the core and wing disagreeing about which side is near, while
 * soft thresholds prevent walls from popping as the camera crosses an axis.
 */
const wallOpacityForCamera = (camera, normal, twoSided = false) => {
  const dx = camera.position.x - CAM_TARGET[0]
  const dy = camera.position.y - CAM_TARGET[1]
  const dz = camera.position.z - CAM_TARGET[2]
  const horizontalDistance = Math.hypot(dx, dz) || 1
  const distance = Math.hypot(dx, dy, dz) || 1
  const facing = (normal[0] * dx + normal[2] * dz) / horizontalDistance
  const nearSideReveal = twoSided
    ? THREE.MathUtils.smoothstep(Math.abs(facing), 0.28, 0.92) * 0.88
    : THREE.MathUtils.smoothstep(facing, -0.12, 0.38)
  const elevation = Math.atan2(dy, horizontalDistance)
  const overheadReveal = THREE.MathUtils.smoothstep(elevation, 0.56, 0.92)
  const closeReveal = 1 - THREE.MathUtils.smoothstep(distance, 8, 13)
  return 1 - Math.max(nearSideReveal, overheadReveal * 0.94, closeReveal * 0.9)
}

/** One pitch/zoom cutaway rule shared by both roof sections. */
const roofOpacityForCamera = (camera) => {
  const dx = camera.position.x - CAM_TARGET[0]
  const dy = camera.position.y - CAM_TARGET[1]
  const dz = camera.position.z - CAM_TARGET[2]
  const distance = Math.hypot(dx, dy, dz) || 1
  // Polar angle from straight-up (+Y): ~0 = overhead, ~PI/2 = level horizon.
  const polar = Math.acos(dy / distance)
  const pitchReveal = clamp01((1.3 - polar) / (1.3 - 0.85))
  const zoomReveal = clamp01((13 - distance) / (13 - 8))
  return 1 - Math.max(pitchReveal, zoomReveal)
}

function Wall({ id, normal, position, size, fireActive, fireReduced }) {
  const meshRef = useRef()
  const matRef = useRef()
  const burnProgress = useRef(0)

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current
    const mat = matRef.current
    if (!mesh || !mat) return

    const target = wallOpacityForCamera(camera, normal)
    mat.opacity = THREE.MathUtils.damp(mat.opacity, target, 7, delta)
    // Keep the mesh mounted at zero opacity; toggling visible caused angle-edge popping.
    mesh.visible = true
    mesh.castShadow = mat.opacity > 0.62
    mesh.raycast = mat.opacity < 0.42 ? NOOP_RAYCAST : THREE.Mesh.prototype.raycast

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
  // Keep the complete scorch volume above the core's 0.10 finished-floor
  // surface. The extra clearance prevents the floor depth buffer from hiding
  // the char at shallow camera pitches.
  const scorchCenterY = 0.17
  const scorchHeight = 0.028

  const marks = [
    // Stove and counter: a large, dense ignition zone.
    { position: [-1.76, 0.121, -1.37], radius: 1.28, scale: [1.18, 0.78, 1], delay: 0, opacity: 0.98 },
    { position: [-1.43, 0.122, -1.18], radius: 1.06, scale: [1.4, 0.52, 1], delay: 0.18, opacity: 0.9 },
    { position: [-1.3, 0.123, -0.78], radius: 1.12, scale: [1.28, 0.62, 1], delay: 0.62, opacity: 0.94 },
    { position: [-0.88, 0.124, -0.92], radius: 0.82, scale: [1.35, 0.48, 1], delay: 0.82, opacity: 0.76 },
    // The relocated west-wall TV and fridge burn a continuous path across the room.
    { position: [-1.72, 0.124, -0.22], radius: 1.02, scale: [1.45, 0.58, 1], delay: 1.3, opacity: 0.92 },
    { position: [-2.1, 0.123, 0.3], radius: 0.78, scale: [1.28, 0.48, 1], delay: 1.55, opacity: 0.7 },
    { position: [0.18, 0.123, -0.82], radius: 0.9, scale: [1.48, 0.5, 1], delay: 1.78, opacity: 0.78 },
    { position: [0.9, 0.123, -1.14], radius: 0.9, scale: [1.34, 0.62, 1], delay: 2.0, opacity: 0.86 },
    { position: [1.54, 0.122, -1.3], radius: 0.72, scale: [1.14, 0.54, 1], delay: 2.22, opacity: 0.68 },
    // Living, dining, and the east edge get broad but irregular trailing patches.
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
          // Use shallow raised geometry instead of coplanar decals. Its bottom
          // stays above both the 0.10 slab and 0.11 rug at every camera angle.
          position={[
            mark.position[0],
            scorchCenterY + (index % 4) * 0.001,
            mark.position[2],
          ]}
          rotation={[0, index * 0.38, 0]}
          scale={[mark.scale[0], 1, mark.scale[1]]}
          renderOrder={20 + index}
        >
          <cylinderGeometry args={[mark.radius, mark.radius * 0.96, scorchHeight, 9]} />
          <meshBasicMaterial
            ref={(material) => (mats.current[index] = material)}
            color={index % 3 === 0 ? '#0b0705' : index % 2 ? '#24110a' : '#140906'}
            transparent
            opacity={0}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ))}
    </group>
  )
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const NOOP_RAYCAST = () => {}

/** Roof dents land in a staggered sequence instead of popping in with the panel. */
function HailDamage({
  state,
  active,
  reduced,
  opacitySource,
  dents = HAIL_DENTS,
  delayOffset = 0,
  renderOrder = 0,
}) {
  const materialRefs = useRef([])
  const groupRefs = useRef([])
  const ageRef = useRef(0)
  const visualState = active ? (reduced ? 'reduced' : 'full') : state
  const full = visualState === 'full'
  const count = full ? dents.length : visualState === 'reduced' ? 3 : 0

  useFrame((_, delta) => {
    ageRef.current = active ? ageRef.current + delta : 0
    const opacity = opacitySource.current[0]?.opacity ?? 1
    groupRefs.current.forEach((group, index) => {
      if (!group) return
      const reveal = THREE.MathUtils.smootherstep(
        Math.max(0, ageRef.current - delayOffset - index * 0.11) / 0.58,
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
        Math.max(0, ageRef.current - delayOffset - dentIndex * 0.11) / 0.58,
        0,
        1
      )
      material.opacity = opacity * reveal
    })
  })

  if (!count) return null

  return (
    <group>
      {dents.slice(0, count).map((dent, index) => (
        <group
          key={index}
          ref={(group) => (groupRefs.current[index] = group)}
          position={dent.position}
          rotation={dent.rotation}
          renderOrder={renderOrder}
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

    const target = roofOpacityForCamera(camera)
    const roofColor = triggered
      ? (protectedByRoof ? ROOF_SCUFFED_COLOR : ROOF_DENTED_COLOR)
      : ROOF_BASE_COLOR
    roofMats.forEach((mat) => {
      mat.opacity = THREE.MathUtils.damp(mat.opacity, target, 7, delta)
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

const WING_COLORS = {
  primary: '#9bbdc4',
  bedroomTwo: '#d9ad86',
  bedroomThree: '#b9a9cf',
  bathroom: '#8bc4bd',
  hallway: '#d8c7a2',
  wall: '#eadfc8',
  trim: '#f8f0df',
}

function WingWall({ position, size }) {
  const meshRef = useRef()
  const materialRef = useRef()
  const normal = size[0] < size[2] ? [1, 0, 0] : [0, 0, 1]

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current
    const material = materialRef.current
    if (!mesh || !material) return
    const target = wallOpacityForCamera(camera, normal, true)
    material.opacity = THREE.MathUtils.damp(material.opacity, target, 7, delta)
    mesh.visible = true
    mesh.castShadow = material.opacity > 0.62
    mesh.raycast = NOOP_RAYCAST
  })

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        ref={materialRef}
        color={WING_COLORS.wall}
        flatShading
        transparent
        opacity={1}
      />
    </mesh>
  )
}

function WingOuterWall({ normal, position, size }) {
  const meshRef = useRef()
  const materialRef = useRef()

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current
    const material = materialRef.current
    if (!mesh || !material) return
    const target = wallOpacityForCamera(camera, normal)
    material.opacity = THREE.MathUtils.damp(material.opacity, target, 7, delta)
    mesh.visible = true
    mesh.castShadow = material.opacity > 0.62
    mesh.raycast = material.opacity < 0.42 ? NOOP_RAYCAST : THREE.Mesh.prototype.raycast
  })

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        ref={materialRef}
        color={WING_COLORS.wall}
        flatShading
        transparent
        opacity={1}
      />
    </mesh>
  )
}

function RoomFloor({ position, size, color }) {
  return (
    <mesh position={[position[0], 0.12, position[1]]} receiveShadow>
      <boxGeometry args={[size[0] - 0.05, 0.035, size[1] - 0.05]} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
  )
}

/** Open room door whose frame and leaf follow the partition cutaway. */
function InteriorDoor({
  position,
  rotation = 0,
  swing = 1,
  width = 0.7,
  color = '#8f6449',
}) {
  const groupRef = useRef()
  const normal = rotation === 0 ? [0, 0, 1] : [1, 0, 0]

  useFrame(({ camera }, delta) => {
    const group = groupRef.current
    if (!group) return
    const target = wallOpacityForCamera(camera, normal, true)
    group.traverse((object) => {
      if (!object.isMesh) return
      object.castShadow = target > 0.62
      object.raycast = NOOP_RAYCAST
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        material.opacity = THREE.MathUtils.damp(material.opacity, target, 7, delta)
      })
    })
  })

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* Frame aligns with the partition opening. */}
      {[-width / 2, width / 2].map((x) => (
        <mesh key={x} position={[x, 0.76, 0]} castShadow>
          <boxGeometry args={[0.08, 1.52, 0.12]} />
          <meshStandardMaterial
            color={WING_COLORS.trim}
            flatShading
            transparent
            opacity={1}
          />
        </mesh>
      ))}
      <mesh position={[0, 1.52, 0]} castShadow>
        <boxGeometry args={[width + 0.08, 0.08, 0.12]} />
        <meshStandardMaterial
          color={WING_COLORS.trim}
          flatShading
          transparent
          opacity={1}
        />
      </mesh>
      {/* Full-height partition infill above the framed doorway. */}
      <mesh position={[0, 1.86, 0]} castShadow>
        <boxGeometry args={[width + 0.08, 0.66, 0.12]} />
        <meshStandardMaterial
          color={WING_COLORS.wall}
          flatShading
          transparent
          opacity={1}
        />
      </mesh>

      {/* Hinge at the left jamb; the leaf swings into the room, clear of the hall. */}
      <group position={[-width / 2 + 0.04, 0, 0]} rotation={[0, swing * 0.84, 0]}>
        <mesh position={[width / 2 - 0.06, 0.75, 0]} castShadow>
          <boxGeometry args={[width - 0.12, 1.42, 0.07]} />
          <meshStandardMaterial color={color} flatShading transparent opacity={1} />
        </mesh>
        <mesh position={[width - 0.2, 0.77, 0.055]} castShadow>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial
            color="#d9b65c"
            metalness={0.35}
            roughness={0.35}
            transparent
            opacity={1}
          />
        </mesh>
      </group>
    </group>
  )
}

function Bed({ position, color, size = [1.05, 1.42], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[size[0], 0.28, size[1]]} />
        <meshStandardMaterial color="#76523b" flatShading />
      </mesh>
      <mesh position={[0, 0.41, 0.04]} castShadow>
        <boxGeometry args={[size[0] * 0.92, 0.18, size[1] * 0.86]} />
        <meshStandardMaterial color="#f4ead7" flatShading />
      </mesh>
      <mesh position={[0, 0.52, 0.2]} castShadow>
        <boxGeometry args={[size[0] * 0.94, 0.12, size[1] * 0.46]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 0.55, -size[1] * 0.3]} castShadow>
        <boxGeometry args={[size[0] * 0.56, 0.12, size[1] * 0.18]} />
        <meshStandardMaterial color="#fff8e9" flatShading />
      </mesh>
      <mesh position={[0, 0.62, -size[1] / 2 + 0.04]} castShadow>
        <boxGeometry args={[size[0] + 0.08, 0.9, 0.1]} />
        <meshStandardMaterial color="#6b4936" flatShading />
      </mesh>
    </group>
  )
}

function Toilet({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.27, 0.04]} castShadow>
        <cylinderGeometry args={[0.26, 0.2, 0.36, 10]} />
        <meshStandardMaterial color="#f4f1e8" flatShading />
      </mesh>
      <mesh position={[0, 0.48, -0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.2, 0.055, 6, 12]} />
        <meshStandardMaterial color="#ffffff" flatShading />
      </mesh>
      <mesh position={[0, 0.67, -0.23]} castShadow>
        <boxGeometry args={[0.46, 0.5, 0.18]} />
        <meshStandardMaterial color="#efeadf" flatShading />
      </mesh>
    </group>
  )
}

function Vanity({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[0.66, 0.72, 0.38]} />
        <meshStandardMaterial color="#6e8f8a" flatShading />
      </mesh>
      <mesh position={[0, 0.77, 0]} castShadow>
        <boxGeometry args={[0.72, 0.08, 0.44]} />
        <meshStandardMaterial color="#f6f3e9" flatShading />
      </mesh>
      <mesh position={[0, 0.81, 0.02]} castShadow>
        <boxGeometry args={[0.38, 0.055, 0.24]} />
        <meshStandardMaterial color="#9fdbe4" flatShading />
      </mesh>
      {/* The handle sits directly on the sink top without a tall faucet cylinder. */}
      <mesh position={[-0.12, 0.93, -0.08]} rotation={[0, 0, -0.36]} castShadow>
        <boxGeometry args={[0.22, 0.055, 0.06]} />
        <meshStandardMaterial color="#d4dcdd" metalness={0.45} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Bathtub({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[1.08, 0.46, 1.42]} />
        <meshStandardMaterial color="#f4f1e8" flatShading />
      </mesh>
      <mesh position={[0, 0.57, 0]}>
        <boxGeometry args={[0.84, 0.08, 1.16]} />
        <meshStandardMaterial
          color="#86d4df"
          emissive="#4f9fb1"
          emissiveIntensity={0.08}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}

/** Small fixed details keep the shared bath from reading as an empty utility room. */
function BathroomDetails() {
  return (
    <group>
      {/* The vanity now sits on the south wall, with a mirror directly above it. */}
      <mesh position={[8.22, 1.54, -3.31]} castShadow>
        <boxGeometry args={[0.92, 0.72, 0.06]} />
        <meshStandardMaterial color="#d9f2f1" metalness={0.25} roughness={0.22} />
      </mesh>
      <mesh position={[8.22, 1.54, -3.345]}>
        <boxGeometry args={[0.74, 0.54, 0.018]} />
        <meshStandardMaterial
          color="#9ed9e3"
          emissive="#4d91a1"
          emissiveIntensity={0.08}
          roughness={0.18}
        />
      </mesh>

      {/* Storage, a towel bar, and a bath mat give the long room useful rhythm. */}
      <mesh position={[9.47, 1.25, 0.1]} castShadow>
        <boxGeometry args={[0.12, 1.3, 0.72]} />
        <meshStandardMaterial color="#63928c" flatShading />
      </mesh>
      <mesh position={[9.39, 1.55, 1.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.54, 8]} />
        <meshStandardMaterial color="#bcc8c7" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[9.32, 1.36, 1.1]} castShadow>
        <boxGeometry args={[0.07, 0.35, 0.46]} />
        <meshStandardMaterial color="#e8b98d" flatShading />
      </mesh>
      <mesh position={[8.62, 0.145, 0.7]} receiveShadow>
        <boxGeometry args={[0.72, 0.025, 0.95]} />
        <meshStandardMaterial color="#f1e6c8" flatShading roughness={0.95} />
      </mesh>
      <mesh position={[7.98, 0.34, 1.03]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.42, 9]} />
        <meshStandardMaterial color="#c99162" flatShading />
      </mesh>
    </group>
  )
}

/** Clickable bathroom supply line. The pipe itself owns the water-loss trigger. */
function WaterSupplyTarget() {
  const triggered = useGameStore((s) => !!s.triggered.water)
  const protectedByPrevention = useGameStore((s) => !!s.preventions.water)
  const acknowledgementRequired = useGameStore((s) => s.acknowledgementRequired)
  const trigger = useGameStore((s) => s.triggerDisaster)
  const valveMatRef = useRef()
  const sensorMatRef = useRef()
  const { hovered, bind } = useClickable(
    () => trigger('water'),
    triggered || acknowledgementRequired
  )

  useFrame((state, delta) => {
    const pulse = 0.16 + Math.sin(state.clock.elapsedTime * 2.8) * 0.08
    if (valveMatRef.current) {
      const target = triggered ? 0.85 : hovered ? 0.72 : pulse
      valveMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        valveMatRef.current.emissiveIntensity,
        target,
        delta * 8
      )
    }
    if (sensorMatRef.current) {
      sensorMatRef.current.emissiveIntensity = protectedByPrevention
        ? 0.55 + Math.sin(state.clock.elapsedTime * 3) * 0.12
        : 0.04
    }
  })

  return (
    <group position={[8.22, 0, -2.72]} {...bind}>
      <Vanity position={[0, 0, 0]} />
      {/* A compact shutoff tab owns the risk interaction without a U-shaped handle. */}
      <mesh position={[0.05, 0.27, 0.24]} castShadow>
        <boxGeometry args={[0.22, 0.08, 0.08]} />
        <meshStandardMaterial
          ref={valveMatRef}
          color={triggered ? '#248fbc' : '#da5a46'}
          emissive={triggered ? '#69d9ff' : '#ff765d'}
          emissiveIntensity={0.16}
          flatShading
        />
      </mesh>
      {/* Prevention becomes a visible green puck beside the shutoff tab. */}
      {protectedByPrevention && (
        <mesh position={[-0.25, 0.17, 0.28]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.09, 10]} />
          <meshStandardMaterial
            ref={sensorMatRef}
            color="#4cb96b"
            emissive="#70e58c"
            emissiveIntensity={0.55}
            flatShading
          />
        </mesh>
      )}
      {hovered && (
        <DisasterTargetCue position={[0, 1.25, 0]} color="#62d7ef" radius={0.42} />
      )}
    </group>
  )
}

const STRIP_BASE_COLOR = new THREE.Color('#eee7d6')
const STRIP_CHAR_COLOR = new THREE.Color('#171412')

/** Curved, low-poly cable with fixed control points so the overloaded setup reads clearly. */
function PowerCord({ points, color = '#26262b', radius = 0.022 }) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))),
    [points]
  )

  return (
    <mesh castShadow raycast={NOOP_RAYCAST}>
      <tubeGeometry args={[curve, 18, radius, 6, false]} />
      <meshStandardMaterial color={color} roughness={0.88} flatShading />
    </mesh>
  )
}

/**
 * The fifth physical risk target: five occupied sockets feed a TV, console,
 * charger, lamp, and space heater. Only the strip owns the click handlers.
 */
function PrimaryBedroomElectricalSetup() {
  const triggered = useGameStore((s) => !!s.triggered.electrical)
  const protectedByPrevention = useGameStore((s) => !!s.preventions.electrical)
  const acknowledgementRequired = useGameStore((s) => s.acknowledgementRequired)
  const trigger = useGameStore((s) => s.triggerDisaster)
  const { hovered, bind } = useClickable(
    () => trigger('electrical'),
    triggered || acknowledgementRequired
  )
  const stripMatRef = useRef()
  const stripStatusRef = useRef()
  const tvScreenRef = useRef()
  const consoleLightRef = useRef()
  const chargerLightRef = useRef()
  const lampBulbRef = useRef()
  const heaterCoilRef = useRef()
  const ageRef = useRef(0)

  useFrame((state, delta) => {
    ageRef.current = triggered ? ageRef.current + Math.min(delta, 0.05) : 0
    const age = ageRef.current
    const tripTime = protectedByPrevention ? 0.48 : 1.12
    const live = !triggered || age < tripTime
    const flicker = triggered && live
      ? Math.max(0.04, 0.48 + Math.sin(age * 72) * 0.42 + Math.sin(age * 31) * 0.18)
      : 1
    const charProgress = triggered
      ? THREE.MathUtils.smootherstep((age - 0.42) / 0.95, 0, 1) * (protectedByPrevention ? 0.18 : 1)
      : 0

    if (stripMatRef.current) {
      stripMatRef.current.color.lerpColors(STRIP_BASE_COLOR, STRIP_CHAR_COLOR, charProgress)
    }
    if (stripStatusRef.current) {
      const idlePulse = hovered ? 1.25 : 0.38 + Math.sin(state.clock.elapsedTime * 3.4) * 0.12
      stripStatusRef.current.emissiveIntensity = live ? idlePulse * flicker : 0.025
      stripStatusRef.current.color.set(live ? '#e85b43' : '#2c2826')
    }
    if (tvScreenRef.current) {
      tvScreenRef.current.emissiveIntensity = live ? 0.3 * flicker : 0.01
      tvScreenRef.current.color.set(live ? '#172a3a' : '#08090a')
    }
    if (consoleLightRef.current) {
      consoleLightRef.current.emissiveIntensity = live ? 0.85 * flicker : 0.01
    }
    if (chargerLightRef.current) {
      chargerLightRef.current.emissiveIntensity = live ? 0.68 * flicker : 0.01
    }
    if (lampBulbRef.current) {
      lampBulbRef.current.emissiveIntensity = live ? 1.4 * flicker : 0.015
    }
    if (heaterCoilRef.current) {
      heaterCoilRef.current.emissiveIntensity = live ? 1.1 * flicker : 0.01
    }
  })

  const socketOffsets = [-0.42, -0.21, 0, 0.21, 0.42]
  const socketColors = ['#353139', '#353139', '#4a3f36', '#353139', '#4a3f36']

  return (
    <group>
      {/* Low dresser and the connected bedroom TV. */}
      <mesh position={[3.22, 0.48, 2.03]} castShadow>
        <boxGeometry args={[0.42, 0.78, 1.02]} />
        <meshStandardMaterial color="#55727a" flatShading />
      </mesh>
      {[-0.22, 0.22].map((z) => (
        <mesh key={z} position={[3.44, 0.53, 2.03 + z]} castShadow>
          <boxGeometry args={[0.028, 0.27, 0.34]} />
          <meshStandardMaterial color="#759ba1" flatShading />
        </mesh>
      ))}
      <mesh position={[2.88, 1.62, 2.03]} castShadow>
        <boxGeometry args={[0.07, 0.78, 1.16]} />
        <meshStandardMaterial color="#493328" flatShading />
      </mesh>
      <mesh position={[2.93, 1.62, 2.03]}>
        <boxGeometry args={[0.025, 0.61, 0.96]} />
        <meshStandardMaterial
          ref={tvScreenRef}
          color="#172a3a"
          emissive="#22465c"
          emissiveIntensity={0.3}
          roughness={0.35}
        />
      </mesh>

      {/* A console and phone charger make two of the five visible loads. */}
      <mesh position={[3.19, 0.91, 1.78]} castShadow>
        <boxGeometry args={[0.2, 0.11, 0.38]} />
        <meshStandardMaterial color="#272934" flatShading />
      </mesh>
      <mesh position={[3.31, 0.92, 1.78]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial
          ref={consoleLightRef}
          color="#70e7bc"
          emissive="#42cfa0"
          emissiveIntensity={0.85}
        />
      </mesh>
      <group position={[3.18, 0.94, 2.3]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.1, 0.22]} />
          <meshStandardMaterial color="#d7d2c9" flatShading />
        </mesh>
        <mesh position={[0.11, 0.02, 0]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial
            ref={chargerLightRef}
            color="#7bd6ff"
            emissive="#4dbdec"
            emissiveIntensity={0.68}
          />
        </mesh>
      </group>

      {/* A floor lamp and a high-draw portable heater complete the overloaded circuit. */}
      <group position={[4.18, 0.13, 3.02]}>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.28, 0.08, 10]} />
          <meshStandardMaterial color="#665246" flatShading />
        </mesh>
        <mesh position={[0, 0.82, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 1.58, 8]} />
          <meshStandardMaterial color="#594c45" metalness={0.2} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.6, 0]} castShadow>
          <coneGeometry args={[0.34, 0.48, 10, 1, true]} />
          <meshStandardMaterial color="#e8c88e" side={THREE.DoubleSide} flatShading />
        </mesh>
        <mesh position={[0, 1.52, 0]}>
          <sphereGeometry args={[0.11, 10, 8]} />
          <meshStandardMaterial
            ref={lampBulbRef}
            color="#fff1b2"
            emissive="#ffd76a"
            emissiveIntensity={1.4}
          />
        </mesh>
      </group>
      {/* Keep the heater in the open bedside strip, clear of the bed silhouette. */}
      <group position={[4.85, 0.16, 3.02]}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.62, 0.82, 0.34]} />
          <meshStandardMaterial color="#dbd7c9" flatShading />
        </mesh>
        {[-0.19, 0, 0.19].map((x) => (
          <mesh key={x} position={[x, 0.45, 0.19]}>
            <boxGeometry args={[0.08, 0.52, 0.025]} />
            <meshStandardMaterial
              ref={x === 0 ? heaterCoilRef : undefined}
              color="#8a4b36"
              emissive="#ef5f36"
              emissiveIntensity={x === 0 ? 1.1 : 0.45}
            />
          </mesh>
        ))}
        <mesh position={[-0.2, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.12, 8]} />
          <meshStandardMaterial color="#3d3c3b" />
        </mesh>
        <mesh position={[0.2, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.12, 8]} />
          <meshStandardMaterial color="#3d3c3b" />
        </mesh>
      </group>

      {/* Five visibly occupied sockets converge on the interactive strip. */}
      <group position={[3.8, 0.25, 2.7]} {...bind}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.1, 1.08]} />
          <meshStandardMaterial ref={stripMatRef} color="#eee7d6" flatShading />
        </mesh>
        {socketOffsets.map((z, index) => (
          <group key={z} position={[0, 0.09, z]}>
            <mesh>
              <cylinderGeometry args={[0.07, 0.07, 0.025, 10]} />
              <meshStandardMaterial color="#77736c" flatShading />
            </mesh>
            <mesh position={[0, 0.075, 0]} castShadow>
              <boxGeometry args={[index === 2 || index === 4 ? 0.23 : 0.17, 0.13, 0.15]} />
              <meshStandardMaterial color={socketColors[index]} flatShading />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.085, -0.53]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial
            ref={stripStatusRef}
            color="#e85b43"
            emissive="#ff5a40"
            emissiveIntensity={0.38}
          />
        </mesh>
        {hovered && (
          <DisasterTargetCue position={[0, 0.48, 0]} color="#75dcff" radius={0.55} />
        )}
      </group>

      {/* The strip itself plugs into the low wall receptacle. */}
      <group position={[2.93, 0.43, 2.84]}>
        <mesh castShadow>
          <boxGeometry args={[0.045, 0.3, 0.22]} />
          <meshStandardMaterial color="#f4eee2" flatShading />
        </mesh>
        {[-0.055, 0.055].map((z) => (
          <mesh key={z} position={[0.028, 0, z]}>
            <boxGeometry args={[0.025, 0.065, 0.025]} />
            <meshStandardMaterial color="#625f5a" />
          </mesh>
        ))}
        <mesh position={[0.07, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 0.18, 0.16]} />
          <meshStandardMaterial color="#3c3938" flatShading />
        </mesh>
      </group>

      <PowerCord points={[[3.8, 0.25, 2.12], [3.5, 0.18, 2.08], [3.0, 0.35, 2.78]]} radius={0.026} />
      <PowerCord points={[[3.8, 0.33, 2.28], [3.47, 0.25, 2.34], [3.04, 1.18, 2.04]]} />
      <PowerCord points={[[3.8, 0.33, 2.49], [3.52, 0.28, 2.35], [3.3, 0.82, 1.78]]} />
      <PowerCord points={[[3.8, 0.33, 2.7], [3.55, 0.36, 2.7], [3.29, 0.84, 2.3]]} color="#3f3a43" />
      <PowerCord points={[[3.8, 0.33, 2.91], [4.08, 0.18, 3.18], [4.18, 0.18, 3.02]]} color="#493a32" />
      <PowerCord points={[[3.8, 0.33, 3.12], [4.3, 0.18, 3.22], [4.85, 0.2, 3.02]]} radius={0.028} />
    </group>
  )
}

/** Visible AFCI hardware makes the prevention choice legible before and during the trip. */
function ElectricalBreakerPanel() {
  const protectedByPrevention = useGameStore((s) => !!s.preventions.electrical)
  const triggered = useGameStore((s) => !!s.triggered.electrical)
  const switchRef = useRef()
  const indicatorRef = useRef()
  const ageRef = useRef(0)

  useFrame((_, delta) => {
    ageRef.current = triggered ? ageRef.current + Math.min(delta, 0.05) : 0
    const tripped = protectedByPrevention && triggered && ageRef.current > 0.48
    if (switchRef.current) {
      switchRef.current.rotation.z = THREE.MathUtils.damp(
        switchRef.current.rotation.z,
        tripped ? -0.58 : 0.58,
        15,
        delta
      )
    }
    if (indicatorRef.current) {
      indicatorRef.current.color.set(tripped ? '#d45243' : protectedByPrevention ? '#56c976' : '#6d6b67')
      indicatorRef.current.emissiveIntensity = tripped ? 0.78 : protectedByPrevention ? 0.62 : 0.02
    }
  })

  return (
    <group position={[6.95, 1.45, 0.57]}>
      <mesh castShadow>
        <boxGeometry args={[0.86, 1.05, 0.12]} />
        <meshStandardMaterial color="#aeb2af" metalness={0.25} roughness={0.55} flatShading />
      </mesh>
      <mesh position={[0, 0, -0.075]}>
        <boxGeometry args={[0.68, 0.86, 0.03]} />
        <meshStandardMaterial color="#d8d9d4" flatShading />
      </mesh>
      <mesh ref={switchRef} position={[0, 0.06, -0.12]} rotation={[0, 0, 0.58]} castShadow>
        <boxGeometry args={[0.13, 0.4, 0.12]} />
        <meshStandardMaterial color="#34383a" flatShading />
      </mesh>
      <mesh position={[0.26, 0.34, -0.12]}>
        <sphereGeometry args={[0.065, 10, 8]} />
        <meshStandardMaterial
          ref={indicatorRef}
          color={protectedByPrevention ? '#56c976' : '#6d6b67'}
          emissive="#58df7c"
          emissiveIntensity={protectedByPrevention ? 0.62 : 0.02}
        />
      </mesh>
      {protectedByPrevention && (
        <mesh position={[-0.25, 0.32, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.035, 6]} />
          <meshStandardMaterial color="#45a965" emissive="#63dd82" emissiveIntensity={0.28} flatShading />
        </mesh>
      )}
    </group>
  )
}

/** Lower attached gable: visually completes the wing, then clears for cutaway play. */
function WingRoof() {
  const roofRefs = useRef([])
  const roofMatRefs = useRef([])
  const gableRefs = useRef([])
  const gableMatRefs = useRef([])
  const triggered = useGameStore((s) => !!s.triggered.hail)
  const hailDamage = useGameStore((s) => s.damage.hail)
  const protectedByRoof = useGameStore((s) => !!s.preventions.hail)
  const acknowledgementRequired = useGameStore((s) => s.acknowledgementRequired)
  const trigger = useGameStore((s) => s.triggerDisaster)
  const { hovered, bind } = useClickable(
    () => trigger('hail'),
    triggered || acknowledgementRequired
  )

  useFrame(({ camera }, delta) => {
    const roofMaterials = roofMatRefs.current.filter(Boolean)
    const gableMaterials = gableMatRefs.current.filter(Boolean)
    if (!roofMaterials.length) return

    const opacityTarget = roofOpacityForCamera(camera)
    const roofColor = triggered
      ? (protectedByRoof ? ROOF_SCUFFED_COLOR : ROOF_DENTED_COLOR)
      : ROOF_BASE_COLOR

    roofMaterials.forEach((material) => {
      material.opacity = THREE.MathUtils.damp(material.opacity, opacityTarget, 7, delta)
      material.color.lerp(roofColor, Math.min(1, delta * 1.25))
      material.emissiveIntensity = THREE.MathUtils.lerp(
        material.emissiveIntensity,
        hovered ? 0.5 : 0,
        0.2
      )
    })
    gableMaterials.forEach((material) => {
      material.opacity = THREE.MathUtils.damp(material.opacity, opacityTarget, 7, delta)
    })

    const solid = roofMaterials[0].opacity > 0.5
    ;[...roofRefs.current, ...gableRefs.current].forEach((piece) => {
      if (!piece) return
      // A thresholded roof shadow made the whole wing brighten/darken abruptly.
      // The attached roof is small enough to omit that shadow for a stable cutaway.
      piece.castShadow = false
      piece.raycast = solid ? THREE.Mesh.prototype.raycast : NOOP_RAYCAST
    })
  })

  const gableShape = new THREE.Shape()
    .moveTo(-WING_ROOF_RUN, 0)
    .lineTo(WING_ROOF_RUN, 0)
    .lineTo(0, WING_ROOF_RISE)
    .closePath()

  return (
    <group>
      {[-1, 1].map((side, index) => (
        <mesh
          key={`wing-roof-${side}`}
          ref={(element) => (roofRefs.current[index] = element)}
          position={[
            WING_ROOF_CENTER_X,
            WING_ROOF_BASE + WING_ROOF_RISE / 2,
            side * WING_ROOF_RUN / 2,
          ]}
          rotation={[side < 0 ? -WING_ROOF_SLOPE : WING_ROOF_SLOPE, 0, 0]}
          castShadow={false}
          renderOrder={10}
          {...bind}
        >
          <boxGeometry
            args={[WING_ROOF_WIDTH, 0.16, WING_ROOF_PANEL_LENGTH]}
          />
          <meshStandardMaterial
            ref={(material) => (roofMatRefs.current[index] = material)}
            color={COLORS.roof}
            emissive="#ffcaa0"
            emissiveIntensity={0}
            flatShading
            transparent
            opacity={1}
            depthWrite={false}
          />
        </mesh>
      ))}

      {[1].map((side, index) => (
        <mesh
          key={`wing-gable-${side}`}
          ref={(element) => (gableRefs.current[index] = element)}
          position={[WING_ROOF_X_MAX, WING_ROOF_BASE, 0]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow={false}
          renderOrder={9}
          {...bind}
        >
          <shapeGeometry args={[gableShape]} />
          <meshStandardMaterial
            ref={(material) => (gableMatRefs.current[index] = material)}
            color={WING_COLORS.wall}
            flatShading
            side={THREE.DoubleSide}
            transparent
            opacity={1}
            depthWrite={false}
          />
        </mesh>
      ))}

      <HailDamage
        state={hailDamage}
        active={triggered}
        reduced={protectedByRoof}
        opacitySource={roofMatRefs}
        dents={WING_HAIL_DENTS}
        // The wing roof uses the exact same staged timing as the main roof.
        // It must render after the wing panels, whose transparent material has
        // an explicit order for cutaway stability.
        renderOrder={11}
      />

      {hovered && (
        <DisasterTargetCue
          position={[WING_ROOF_CENTER_X, WING_ROOF_BASE + WING_ROOF_RISE + 0.42, 0]}
          radius={1.55}
        />
      )}
    </group>
  )
}

/**
 * Roofed cutaway wing. A generous central hall and color-blocked rooms make the
 * 3BR/1BA plan legible without changing the original core or disaster geometry.
 */
function BedroomWing() {
  return (
    <group>
      <mesh position={[WING_CENTER_X, -0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[WING_WIDTH + 0.3, 0.3, WING_DEPTH + 0.45]} />
        <meshStandardMaterial color="#a89b80" flatShading />
      </mesh>
      <mesh position={[WING_CENTER_X, 0.05, 0]} receiveShadow>
        <boxGeometry args={[WING_WIDTH, 0.1, WING_DEPTH]} />
        <meshStandardMaterial color="#c6ad86" flatShading />
      </mesh>

      {/* Floor-color zoning is the wing's visual floor-plan key. */}
      <RoomFloor position={[4.02, -1.98]} size={[2.42, 2.8]} color={WING_COLORS.bedroomTwo} />
      <RoomFloor position={[6.47, -1.98]} size={[2.42, 2.8]} color={WING_COLORS.bedroomThree} />
      <RoomFloor position={[8.65, 0]} size={[1.86, 6.7]} color={WING_COLORS.bathroom} />
      <RoomFloor position={[5.25, 0.05]} size={[4.85, 1.15]} color={WING_COLORS.hallway} />
      <RoomFloor position={[5.25, 2.03]} size={[4.85, 2.7]} color={WING_COLORS.primary} />

      {/* Connected perimeter walls use the same near-wall cutaway as the core. */}
      <WingOuterWall normal={[1, 0, 0]} position={[WING_X_MAX, 1.16, 0]} size={[0.12, 2.32, WING_DEPTH]} />
      <WingOuterWall normal={[0, 0, -1]} position={[WING_CENTER_X, 1.16, -WING_DEPTH / 2]} size={[WING_WIDTH, 2.32, 0.12]} />
      <WingOuterWall normal={[0, 0, 1]} position={[WING_CENTER_X, 1.16, WING_DEPTH / 2]} size={[WING_WIDTH, 2.32, 0.12]} />
      <WingOuterWall normal={[-1, 0, 0]} position={[WING_X_MIN, 1.16, -2.75]} size={[0.12, 2.32, 1.3]} />
      <WingOuterWall normal={[-1, 0, 0]} position={[WING_X_MIN, 1.16, 2.75]} size={[0.12, 2.32, 1.3]} />

      {/* Full-height connected partitions stop at a broad, furniture-free central hall. */}
      <WingWall position={[5.25, 1.16, -1.98]} size={[0.1, 2.32, 2.8]} />
      {/* The shared bathroom occupies the full east bay, with one hall opening. */}
      <WingWall position={[7.7, 1.16, -1.98]} size={[0.1, 2.32, 2.8]} />
      <WingWall position={[7.7, 1.16, 2.03]} size={[0.1, 2.32, 2.7]} />

      {/* North room wall, segmented into three properly aligned door openings. */}
      <WingWall position={[3.36, 1.16, -0.55]} size={[1.12, 2.32, 0.1]} />
      <WingWall position={[4.96, 1.16, -0.55]} size={[0.58, 2.32, 0.1]} />
      <WingWall position={[5.74, 1.16, -0.55]} size={[0.98, 2.32, 0.1]} />
      <WingWall position={[7.3, 1.16, -0.55]} size={[0.8, 2.32, 0.1]} />

      {/* South suite wall uses two wide openings off the same hallway. */}
      <WingWall position={[3.98, 1.16, 0.65]} size={[2.35, 2.32, 0.1]} />
      <WingWall position={[6.75, 1.16, 0.65]} size={[1.9, 2.32, 0.1]} />

      {/* Every room has a visible open door, swung away from the hallway. */}
      <InteriorDoor position={[4.295, 0.13, -0.55]} width={0.7} swing={1} color="#a9624f" />
      <InteriorDoor position={[6.565, 0.13, -0.55]} width={0.62} swing={1} color="#786398" />
      <InteriorDoor position={[5.48, 0.13, 0.65]} width={0.58} swing={-1} color="#527e89" />
      <InteriorDoor
        position={[7.7, 0.13, 0.05]}
        rotation={Math.PI / 2}
        width={1.04}
        swing={-1}
        color="#5d8f89"
      />

      {/* This frame sits in the east-wall plane around the real wall opening. */}
      <group position={[WING_X_MIN + 0.012, 0.95, 0]}>
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[0.14, 0.12, 1.42]} />
          <meshStandardMaterial color={WING_COLORS.trim} flatShading />
        </mesh>
        {[-0.68, 0.68].map((z) => (
          <mesh key={z} position={[0, 0, z]} castShadow>
            <boxGeometry args={[0.14, 1.9, 0.1]} />
            <meshStandardMaterial color={WING_COLORS.trim} flatShading />
          </mesh>
        ))}
        <mesh position={[0, -0.92, 0]} receiveShadow>
          <boxGeometry args={[0.16, 0.04, 1.42]} />
          <meshStandardMaterial color="#a8835c" flatShading />
        </mesh>
      </group>

      {/* Secondary beds sit tight to the north wall while preserving door clearance. */}
      <Bed position={[4.25, 0.12, -2.35]} color="#cf765e" size={[1.4, 1.85]} />
      <Bed position={[6.78, 0.12, -2.35]} color="#8873ac" size={[1.4, 1.85]} />
      {/* Primary suite: bed against the bathroom wall faces a dresser-and-TV wall. */}
      <Bed position={[6.48, 0.12, 2.28]} rotation={-Math.PI / 2} color="#4f8997" size={[1.85, 2.2]} />

      <WaterSupplyTarget />
      <Toilet position={[9.15, 0.12, -1.05]} rotation={-Math.PI / 2} />
      <Bathtub position={[8.68, 0.12, 2.2]} />
      <BathroomDetails />

      {/* Dressers sit flush to the side walls and align with their respective beds. */}
      {[3.1, 5.59].map((x, index) => (
        <mesh key={x} position={[x, 0.72, -2.35]} castShadow>
          <boxGeometry args={[0.58, 1.2, 0.34]} />
          <meshStandardMaterial color={index ? '#735e82' : '#8d6045'} flatShading />
        </mesh>
      ))}
      <PrimaryBedroomElectricalSetup />
      <ElectricalBreakerPanel />

      <WingRoof />
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

      <BedroomWing />

      {/* Rug in the living area */}
      <mesh position={[-1.05, 0.11, 0.68]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 2.15]} />
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
  const damageMats = useRef([])
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
    damageMats.current.forEach((material, index) => {
      if (!material) return
      const targetOpacity = triggered ? (protectedByPrevention ? 0.4 : index === 0 ? 0.78 : 0.62) : 0
      material.opacity = THREE.MathUtils.damp(material.opacity, targetOpacity, triggered ? 2.8 : 4, delta)
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
      {/* Persistent stovetop soot and a warped burner make the source damage readable. */}
      <mesh position={[-0.015, 1.247, 0.02]} rotation={[-Math.PI / 2, 0.22, 0]} scale={[0.42, 0.31, 1]} renderOrder={18}>
        <circleGeometry args={[1, 9]} />
        <meshBasicMaterial
          ref={(material) => (damageMats.current[0] = material)}
          color="#130d0b"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.17, 1.258, -0.13]} rotation={[Math.PI / 2, 0.18, 0.12]} renderOrder={19}>
        <torusGeometry args={[0.12, 0.018, 6, 9, 4.9]} />
        <meshStandardMaterial
          ref={(material) => (damageMats.current[1] = material)}
          color="#2b211e"
          transparent
          opacity={0}
          roughness={0.78}
          depthWrite={false}
        />
      </mesh>
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
function Television({ position, rotation }) {
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
    <group position={position} rotation={rotation}>
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

      {/* Room-facing scorch decals grow as the fire reaches the relocated TV. */}
      {[
        { position: [-0.28, 1.02, 0.042], radius: 0.42, scale: [1.15, 0.92, 1] },
        { position: [0.32, 0.84, 0.042], radius: 0.34, scale: [0.9, 1.18, 1] },
        { position: [-0.18, 0.3, 0.23], radius: 0.42, scale: [1.45, 0.66, 1] },
      ].map((mark, index) => (
        <mesh
          key={`tv-scorch-${index}`}
          ref={(mesh) => (scorchMeshes.current[index] = mesh)}
          position={mark.position}
          rotation={[0, 0, index * 0.4]}
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
      {/* A compact kitchen work triangle keeps the sink immediately beside the stove. */}
      <Stove />
      <InteriorModel
        asset="/models/house-interior/Kitchen Sink.glb"
        position={[-0.86, 0, -1.45]}
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
        position={[-0.45, 0, 0.68]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={0.55}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.88}
        burnDelay={2.55}
      />
      <InteriorModel
        asset="/models/house-interior/Table Round Small.glb"
        position={[-1.42, 0.02, 0.68]}
        scale={0.43}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.58}
        burnDelay={2.9}
      />
      <InteriorModel
        asset="/models/house-interior/Lamp.glb"
        position={[-2.25, 0, 1.55]}
        scale={1.75}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.68}
        burnDelay={3.2}
      />
      <Television
        position={[-2.35, 0, 0.45]}
        rotation={[0, Math.PI / 2, 0]}
      />

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

      {/* Plant life gives the exposed side of the living room depth. */}
      <InteriorModel
        asset="/models/house-interior/Houseplant-VtJh4Irl4w.glb"
        position={[2.1, 0, 1.25]}
        scale={1.55}
        burnActive={fireActive && !fireReduced}
        burnStrength={0.74}
        burnDelay={3.65}
      />
    </group>
  )
}
