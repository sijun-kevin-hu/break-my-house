import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'

/**
 * Static Quaternius interior props. Each rendered object is cloned from the
 * useGLTF cache so it can have its own transform while keeping shared geometry
 * and materials lightweight.
 *
 * Source: https://poly.pizza/bundle/Ultimate-House-Interior-Pack-2SXnFbwFzm
 * Author: Quaternius — CC0 1.0.
 */
export default function InteriorModel({ asset, ...props }) {
  const { scene } = useGLTF(asset)
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
    })
    return clone
  }, [scene])

  return <primitive object={model} dispose={null} {...props} />
}

const MODEL_ROOT = '/models/house-interior/'

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
