import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Low-poly stylized yard. Everything here is decorative (no game state):
 *  - a faceted, gently rolling grass terrain (flat-shaded so each triangle reads
 *    as a crisp facet — the signature low-poly look)
 *  - a stepping-stone path to the door
 *  - scattered low-poly trees, rocks, and flower tufts around the edges
 *
 * The center of the yard is kept flat so the house always sits level.
 */

const GRASS = '#83c05a'
const GRASS_DARK = '#5ea24a'
const STONE = '#c9c2b0'
const TRUNK = '#7a5334'

/** Cheap smooth pseudo-noise from summed sines — deterministic, no deps. */
function hills(x, z) {
  return (
    Math.sin(x * 0.55) * Math.cos(z * 0.5) * 0.5 +
    Math.sin(x * 0.9 + z * 0.7) * 0.25 +
    Math.cos(z * 1.1) * 0.2
  )
}

/** Faceted terrain: a disc-ish grid, displaced by hills(), flat-shaded. */
function Terrain() {
  const geometry = useMemo(() => {
    const size = 34
    const seg = 34
    const geo = new THREE.PlaneGeometry(size, size, seg, seg)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const r = Math.hypot(x, z)
      // Flatten the center (under the house) and ramp hills up toward the edges.
      const centerFlat = THREE.MathUtils.smoothstep(r, 5, 12)
      const y = hills(x, z) * centerFlat
      pos.setY(i, y)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={GRASS} flatShading />
    </mesh>
  )
}

/** A single stylized low-poly tree (faceted trunk + 1–2 icosahedron canopies). */
function Tree({ position, scale = 1, tint = '#3f8f45' }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 1.4, 6]} />
        <meshStandardMaterial color={TRUNK} flatShading />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <icosahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial color={tint} flatShading />
      </mesh>
      <mesh position={[0.35, 2.35, 0.15]} castShadow>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={tint} flatShading />
      </mesh>
    </group>
  )
}

/** Faceted rock. */
function Rock({ position, scale = 1 }) {
  return (
    <mesh position={position} scale={scale} rotation={[0.4, 0.8, 0.2]} castShadow>
      <dodecahedronGeometry args={[0.4, 0]} />
      <meshStandardMaterial color="#9aa0a6" flatShading />
    </mesh>
  )
}

/** A little tuft of colored flowers to break up the green. */
function Flowers({ position, color }) {
  return (
    <group position={position}>
      {[
        [0, 0, 0],
        [0.18, 0, 0.12],
        [-0.14, 0, 0.16],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], 0.12, p[2]]} castShadow>
          <icosahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export default function Ground() {
  return (
    <group>
      <Terrain />

      {/* Darker under-shadow patch so the house reads as grounded */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[4.6, 6]} />
        <meshStandardMaterial color={GRASS_DARK} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.2, 0.021, 0]} receiveShadow>
        <circleGeometry args={[4.65, 6]} />
        <meshStandardMaterial color={GRASS_DARK} flatShading />
      </mesh>

      {/* Stepping-stone path to the front door */}
      {[3.2, 4.1, 5.0, 5.9, 6.8].map((z, i) => (
        <mesh
          key={z}
          rotation={[0, i % 2 ? 0.25 : -0.2, 0]}
          position={[i % 2 ? 0.12 : -0.1, 0.06, z]}
          receiveShadow
        >
          <cylinderGeometry args={[0.42, 0.42, 0.12, 6]} />
          <meshStandardMaterial color={STONE} flatShading />
        </mesh>
      ))}

      {/* Scattered low-poly trees around the perimeter (clear of the house) */}
      <Tree position={[-6.5, 0, 3.5]} scale={1.15} tint="#3f8f45" />
      <Tree position={[12, 0, 4]} scale={0.95} tint="#4a9b4e" />
      <Tree position={[6, 0, -6]} scale={1.25} tint="#37833e" />
      <Tree position={[-7, 0, -4]} scale={1.05} tint="#4a9b4e" />
      <Tree position={[-4.5, 0, 7] } scale={0.85} tint="#3f8f45" />

      {/* Rocks */}
      <Rock position={[4.5, 0.25, 4.8]} scale={1.1} />
      <Rock position={[-3.8, 0.18, 5.6]} scale={0.7} />
      <Rock position={[10.8, 0.2, -3.8]} scale={0.85} />

      {/* Flower tufts */}
      <Flowers position={[-3.2, 0, 3.4]} color="#f2c14e" />
      <Flowers position={[3.4, 0, 3.6]} color="#e8657f" />
      <Flowers position={[-2.4, 0, -3.6]} color="#c98be0" />
      <Flowers position={[10.5, 0, -4.4]} color="#f2c14e" />
    </group>
  )
}
