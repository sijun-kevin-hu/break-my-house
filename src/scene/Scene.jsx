import { OrbitControls, Sky } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import House from './House'
import Ground from './Ground'
import BackyardTree from './BackyardTree'
import DisasterEffects from '../disasters/DisasterEffects'

function CameraProbe() {
  useFrame((state) => {
    if (typeof window !== 'undefined') {
      window.__cam = state.camera
      window.__glDom = state.gl.domElement
      window.__scene = state.scene
    }
  })
  return null
}

/**
 * Scene composition only — no game logic here.
 * Swap <House /> placeholder geometry for a GLB when assets land (see PROJECT.md).
 */
export default function Scene() {
  return (
    <>
      {/* Soft atmospheric depth — matches the sky so far-off props melt into it */}
      <fog attach="fog" args={['#bcdcef', 30, 66]} />

      <Sky
        sunPosition={[12, 16, 8]}
        turbidity={3}
        rayleigh={2.6}
        mieCoefficient={0.005}
        mieDirectionalG={0.9}
      />

      {/* Cool sky / warm ground bounce keeps the flat-shaded facets reading */}
      <hemisphereLight args={['#dff0ff', '#8a9a5b', 0.55]} />
      <ambientLight intensity={0.35} />

      {/* Warm key light, high and to the side, for crisp low-poly shadow facets */}
      <directionalLight
        position={[9, 14, 7]}
        intensity={2.1}
        color="#fff2df"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-16, 16, 16, -16, 0.1, 50]} />
      </directionalLight>

      {/* Cool fill from the opposite side lifts the shadow side out of black */}
      <directionalLight position={[-8, 6, -6]} intensity={0.4} color="#bcd4ff" />

      <CameraProbe />
      <Ground />
      <House />
      <BackyardTree />
      <DisasterEffects />

      <OrbitControls
        enablePan={false}
        minDistance={7}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 2.1, 0]}
      />
    </>
  )
}
