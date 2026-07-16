import { OrbitControls, Sky } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
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

const KEYBOARD_ORBIT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
])

const KEYBOARD_ZOOM_KEYS = new Set([
  'KeyE',
  'Equal',
  'NumpadAdd',
  'KeyQ',
  'Minus',
  'NumpadSubtract',
])

const KEYBOARD_CAMERA_KEYS = new Set([
  ...KEYBOARD_ORBIT_KEYS,
  ...KEYBOARD_ZOOM_KEYS,
])

const isTextInput = (element) =>
  element instanceof HTMLElement &&
  !!element.closest('input, textarea, select, [contenteditable="true"]')

/**
 * Adds game-style keyboard movement to the mouse-driven OrbitControls. The
 * controls themselves keep enforcing their configured orbit limits, so keyboard
 * and pointer input can never put the camera in different invalid states.
 */
function KeyboardOrbitControls({ controlsRef }) {
  const pressedKeys = useRef(new Set())

  useEffect(() => {
    const clearPressedKeys = () => pressedKeys.current.clear()

    const onKeyDown = (event) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isTextInput(event.target) ||
        !KEYBOARD_CAMERA_KEYS.has(event.code)
      ) return

      pressedKeys.current.add(event.code)
      // Arrow keys normally scroll the page; these keys control the camera here.
      event.preventDefault()
    }

    const onKeyUp = (event) => {
      if (!KEYBOARD_CAMERA_KEYS.has(event.code)) return
      pressedKeys.current.delete(event.code)
      event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearPressedKeys)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearPressedKeys)
    }
  }, [])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls || pressedKeys.current.size === 0) return

    const keys = pressedKeys.current
    const horizontal = Number(keys.has('KeyD') || keys.has('ArrowRight')) -
      Number(keys.has('KeyA') || keys.has('ArrowLeft'))
    const vertical = Number(keys.has('KeyW') || keys.has('ArrowUp')) -
      Number(keys.has('KeyS') || keys.has('ArrowDown'))
    const speed = Math.PI * 2.7
    const zoomIn = keys.has('KeyE') || keys.has('Equal') || keys.has('NumpadAdd')
    const zoomOut = keys.has('KeyQ') || keys.has('Minus') || keys.has('NumpadSubtract')

    if (horizontal) {
      controls.setAzimuthalAngle(controls.getAzimuthalAngle() - horizontal * speed * delta)
    }
    if (vertical) controls.setPolarAngle(controls.getPolarAngle() - vertical * speed * delta)
    // Zoom at a consistent rate regardless of frame rate. OrbitControls keeps
    // the result within the configured minimum and maximum camera distances.
    if (zoomIn) controls.dollyIn(Math.pow(0.95, delta * 5))
    if (zoomOut) controls.dollyOut(Math.pow(0.95, delta * 5))
    controls.update()
  })

  return null
}

/**
 * Scene composition only — no game logic here.
 * Swap <House /> placeholder geometry for a GLB when assets land (see PROJECT.md).
 */
export default function Scene() {
  const controlsRef = useRef()

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
      <KeyboardOrbitControls controlsRef={controlsRef} />
      <Ground />
      <House />
      <BackyardTree />
      <DisasterEffects />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={7}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 2.1, 0]}
      />
    </>
  )
}
