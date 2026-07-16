import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 250
const AREA = 14 // spawn square width
const TOP = 12 // spawn height

/**
 * Instanced hailstones falling over the yard. No physics — stones respawn at
 * the top when they pass ground level. Cheap and reads great at cartoon scale.
 */
export default function Hail() {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const stones = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        x: (Math.random() - 0.5) * AREA,
        y: Math.random() * TOP,
        z: (Math.random() - 0.5) * AREA,
        speed: 9 + Math.random() * 6,
        scale: 0.06 + Math.random() * 0.08,
      })),
    []
  )

  useFrame((_, delta) => {
    stones.forEach((s, i) => {
      s.y -= s.speed * delta
      if (s.y < 0) s.y = TOP
      dummy.position.set(s.x, s.y, s.z)
      dummy.scale.setScalar(s.scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, COUNT]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#e8f4ff" flatShading />
    </instancedMesh>
  )
}
