import { Canvas } from '@react-three/fiber'
import Scene from './scene/Scene'
import Toolbar from './ui/Toolbar'
import InfoPanel from './ui/InfoPanel'
import SavingsMeter from './ui/SavingsMeter'
import GameEndPanel from './ui/GameEndPanel'
import IntroPanel from './ui/IntroPanel'
import useGameAudio from './hooks/useGameAudio'
import { useGameStore } from './store/useGameStore'
import './styles/ui.css'

/**
 * Layout: full-screen Canvas (3D world) + absolutely-positioned HTML overlay (all UI).
 * Rule of thumb: nothing interactive lives inside the Canvas — UI stays in HTML.
 */
export default function App() {
  useGameAudio()
  const showIntroduction = useGameStore((s) => s.showIntroduction)

  return (
    <div className="app">
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{ position: [11.5, 9.5, 13], fov: 42 }}
      >
        <Scene />
      </Canvas>

      <div className="overlay">
        <header className="title">
          <h1>Break My House</h1>
          <p>Summon a disaster. See what coverage kicks in. Learn to prevent it.</p>
        </header>
        <button
          className="intro-reopen-button"
          onClick={showIntroduction}
          aria-label="Open how to play instructions"
        >
          <span aria-hidden="true">?</span> How to play
        </button>
        <SavingsMeter />
        <Toolbar />
        <InfoPanel />
        <GameEndPanel />
        <IntroPanel />
      </div>
    </div>
  )
}
