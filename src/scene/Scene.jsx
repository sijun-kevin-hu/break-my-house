import { OrbitControls, Sky } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import House from './House'
import Ground from './Ground'
import BackyardTree from './BackyardTree'
import DisasterEffects from '../disasters/DisasterEffects'
import { useGameStore } from '../store/useGameStore'

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

const KEYBOARD_ORBIT_SPEED = Math.PI * 3
const KEYBOARD_ZOOM_STEPS_PER_SECOND = 12

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
    const zoomIn = keys.has('KeyE') || keys.has('Equal') || keys.has('NumpadAdd')
    const zoomOut = keys.has('KeyQ') || keys.has('Minus') || keys.has('NumpadSubtract')

    if (horizontal) {
      controls.setAzimuthalAngle(
        controls.getAzimuthalAngle() - horizontal * KEYBOARD_ORBIT_SPEED * delta
      )
    }
    if (vertical) {
      controls.setPolarAngle(
        controls.getPolarAngle() - vertical * KEYBOARD_ORBIT_SPEED * delta
      )
    }
    // Zoom at a consistent rate regardless of frame rate. OrbitControls keeps
    // the result within the configured minimum and maximum camera distances.
    const zoomFactor = Math.pow(0.95, delta * KEYBOARD_ZOOM_STEPS_PER_SECOND)
    if (zoomIn) controls.dollyIn(zoomFactor)
    if (zoomOut) controls.dollyOut(zoomFactor)
    controls.update()
  })

  return null
}

// Restore the previous frame's visual-only offset before OrbitControls reads
// the camera. This lets orbit and keyboard controls remain responsive during a
// shake instead of treating the shake as player input.
function RestoreCameraShake({ shakeRef }) {
  useFrame(({ camera }) => {
    camera.position.sub(shakeRef.current.offset)
    shakeRef.current.offset.set(0, 0, 0)
  })

  return null
}

/**
 * Author a few event-specific camera impulses rather than applying one generic
 * shake to every disaster. The timings align with the visual contact beats:
 * the oak hits at 0.85s, while the hail roof strikes start at 0.65s.
 */
function ApplyCameraShake({ shakeRef }) {
  const hailTriggered = useGameStore((s) => !!s.triggered.hail)
  const hailProtected = useGameStore((s) => !!s.preventions.hail)
  const treeTriggered = useGameStore((s) => !!s.triggered.tree)
  const treeRemoved = useGameStore((s) => !!s.preventions.removeTree)
  const previous = useRef({ hail: false, tree: false })

  useFrame(({ camera, clock }) => {
    const now = clock.elapsedTime
    const shake = shakeRef.current

    if (hailTriggered && !previous.current.hail) {
      shake.hailStart = now + 0.65
    }
    if (treeTriggered && !previous.current.tree && !treeRemoved) {
      shake.treeStart = now + 0.85
    }
    previous.current.hail = hailTriggered
    previous.current.tree = treeTriggered

    let x = 0
    let y = 0
    let z = 0

    const treeAge = now - shake.treeStart
    if (treeAge >= 0 && treeAge < 0.72) {
      const falloff = Math.pow(1 - treeAge / 0.72, 1.7)
      const magnitude = 0.34 * falloff
      x += Math.sin(treeAge * 46) * magnitude
      y += Math.cos(treeAge * 59) * magnitude * 0.62
      z += Math.sin(treeAge * 38 + 0.7) * magnitude * 0.72
    }

    const hailAge = now - shake.hailStart
    if (hailAge >= 0 && hailAge < 2.15) {
      const falloff = Math.pow(1 - hailAge / 2.15, 1.25)
      // Hail should feel forceful but remain much gentler than the falling oak.
      const magnitude = (hailProtected ? 0.045 : 0.09) * falloff
      x += Math.sin(hailAge * 31) * magnitude
      y += Math.cos(hailAge * 43) * magnitude * 0.55
      z += Math.sin(hailAge * 27 + 1.1) * magnitude * 0.62
    }

    shake.offset.set(x, y, z)
    camera.position.add(shake.offset)
  })

  return null
}

/**
 * Scene composition only — no game logic here.
 * Swap <House /> placeholder geometry for a GLB when assets land (see PROJECT.md).
 */
export default function Scene() {
  const controlsRef = useRef()
  const shakeRef = useRef({
    offset: new THREE.Vector3(),
    hailStart: -Infinity,
    treeStart: -Infinity,
  })

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
      <RestoreCameraShake shakeRef={shakeRef} />
      <KeyboardOrbitControls controlsRef={controlsRef} />
      <Ground />
      <House />
      <BackyardTree />
      <DisasterEffects />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={1.25}
        zoomSpeed={1.4}
        minDistance={7}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
        target={[3.1, 2.1, 0]}
      />
      <ApplyCameraShake shakeRef={shakeRef} />
    </>
  )
}
