import { OrbitControls, Sky } from '@react-three/drei'
import House from './House'
import Ground from './Ground'
import DisasterEffects from '../disasters/DisasterEffects'

/**
 * Scene composition only — no game logic here.
 * Swap <House /> placeholder geometry for a GLB when assets land (see PROJECT.md).
 */
export default function Scene() {
  return (
    <>
      <Sky sunPosition={[10, 20, 5]} turbidity={2} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ffffff', '#c9d4b8', 0.5]} />
      <directionalLight
        position={[10, 12, 6]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      <Ground />
      <House />
      <DisasterEffects />

      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 1.5, 0]}
      />
    </>
  )
}
