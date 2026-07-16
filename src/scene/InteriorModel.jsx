import { useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Static Quaternius interior props. Each rendered object is cloned from the
 * useGLTF cache so it can have its own transform while keeping shared geometry
 * and materials lightweight.
 *
 * Source: https://poly.pizza/bundle/Ultimate-House-Interior-Pack-2SXnFbwFzm
 * Author: Quaternius — CC0 1.0.
 */
export default function InteriorModel({ asset, burnActive = false, burnStrength = 1, ...props }) {
  const { scene } = useGLTF(asset)
  const burnProgress = useRef(0)
  const { model, burnMaterials } = useMemo(() => {
    const clone = scene.clone(true)
    const materials = []
    clone.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
      const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material]
      const clonedMaterials = sourceMaterials.map((material) => {
        const cloned = material.clone()
        if (cloned.color) {
          materials.push({
            material: cloned,
            baseColor: cloned.color.clone(),
            baseRoughness: cloned.roughness,
          })
        }
        return cloned
      })
      node.material = Array.isArray(node.material) ? clonedMaterials : clonedMaterials[0]
    })
    return { model: clone, burnMaterials: materials }
  }, [scene])

  useFrame((_, delta) => {
    const target = burnActive ? burnStrength : 0
    burnProgress.current = THREE.MathUtils.damp(
      burnProgress.current,
      target,
      burnActive ? 0.88 : 4,
      delta
    )
    burnMaterials.forEach(({ material, baseColor, baseRoughness }) => {
      material.color.lerpColors(baseColor, CHAR_COLOR, burnProgress.current)
      if (typeof baseRoughness === 'number') {
        material.roughness = THREE.MathUtils.lerp(baseRoughness, 1, burnProgress.current * 0.5)
      }
    })
  })

  return <primitive object={model} dispose={null} {...props} />
}

const MODEL_ROOT = '/models/house-interior/'
const CHAR_COLOR = new THREE.Color('#211b18')

useGLTF.preload(`${MODEL_ROOT}Couch Small-X9msj0gtb5.glb`)
useGLTF.preload(`${MODEL_ROOT}Chair.glb`)
useGLTF.preload(`${MODEL_ROOT}Houseplant.glb`)
useGLTF.preload(`${MODEL_ROOT}Houseplant-VtJh4Irl4w.glb`)
useGLTF.preload(`${MODEL_ROOT}Kitchen Fridge.glb`)
useGLTF.preload(`${MODEL_ROOT}Kitchen Sink.glb`)
useGLTF.preload(`${MODEL_ROOT}Lamp.glb`)
useGLTF.preload(`${MODEL_ROOT}Oven.glb`)
useGLTF.preload(`${MODEL_ROOT}Shelf Large.glb`)
useGLTF.preload(`${MODEL_ROOT}Table Round Small.glb`)
