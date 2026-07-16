import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'
import Toolbar from './ui/Toolbar'
import InfoPanel from './ui/InfoPanel'
import RiskScore from './ui/RiskScore'
import IntroPanel from './ui/IntroPanel'
import useGameAudio from './hooks/useGameAudio'
import './styles/ui.css'

/**
 * Layout: full-screen Canvas (3D world) + absolutely-positioned HTML overlay (all UI).
 * Rule of thumb: nothing interactive lives inside the Canvas — UI stays in HTML.
 */
export default function App() {
  useGameAudio()
  return (
    <div className="app">
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{ position: [8, 6.4, 10], fov: 40 }}
      >
        <Scene />
      </Canvas>

      <div className="overlay">
        <header className="title">
          <h1>Break My House</h1>
          <p>Summon a disaster. See what coverage kicks in. Learn to prevent it.</p>
        </header>
        <RiskScore />
        <Toolbar />
        <InfoPanel />
        <IntroPanel />
      </div>
    </div>
  )
}
