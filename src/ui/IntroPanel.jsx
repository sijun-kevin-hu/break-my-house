import { useGameStore } from '../store/useGameStore'
import { COVERAGE_DEMO } from '../data/disasters'

const controls = [
  { keys: 'Click', label: 'the roof, stove, pipe, power strip, or tree', detail: 'Trigger a risk event' },
  { keys: 'Drag / WASD', label: 'around the house', detail: 'Orbit the camera' },
  { keys: 'Scroll', label: 'or use Q / E', detail: 'Zoom the view' },
  { keys: 'Toggle', label: 'a protection, then reset', detail: 'Compare the outcome' },
]

/** First-load orientation overlay. Gameplay state and dismissal live in the store. */
export default function IntroPanel() {
  const hasStarted = useGameStore((s) => s.hasStarted)
  const startExperience = useGameStore((s) => s.startExperience)

  if (hasStarted) return null

  return (
    <section className="intro-screen" aria-labelledby="intro-title">
      <div className="intro-panel">
        <p className="intro-kicker">Insurance risk lab</p>
        <div className="intro-heading">
          <span aria-hidden="true">⌂</span>
          <h2 id="intro-title">How much can one home risk cost?</h2>
        </div>
        <p className="intro-summary">{COVERAGE_DEMO.introSummary}</p>

        <div className="intro-lesson" aria-label="What you will learn">
          <span aria-hidden="true">✦</span>
          <p>
            <strong>The lesson:</strong> Prevention helps avoid damage, disruption, and avoidable costs.
          </p>
        </div>

        <div className="intro-controls">
          <p className="intro-controls-title">Controls</p>
          <ul>
            {controls.map((control) => (
              <li key={control.keys}>
                <kbd>{control.keys}</kbd>
                <span>
                  <strong>{control.label}</strong>
                  <small>{control.detail}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <button className="intro-start" onClick={startExperience} autoFocus>
          Start the risk test <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  )
}
