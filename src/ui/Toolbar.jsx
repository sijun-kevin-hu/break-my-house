import { useGameStore } from '../store/useGameStore'
import { PREVENTIONS } from '../data/disasters'

/**
 * Bottom toolbar. Disasters are triggered by clicking objects in the scene
 * (roof, stove, backyard tree) — NOT from here. This panel only holds the
 * prevention toggles and the reset button.
 */
export default function Toolbar() {
  const preventions = useGameStore((s) => s.preventions)
  const triggered = useGameStore((s) => s.triggered)
  const togglePrevention = useGameStore((s) => s.togglePrevention)
  const resetHouse = useGameStore((s) => s.resetHouse)

  return (
    <div className="toolbar">
      <p className="toolbar-hint">
        🖱️ Click the <strong>roof</strong>, <strong>stove</strong>, or{' '}
        <strong>{preventions.removeTree ? 'stump' : 'tree'}</strong> to test a disaster.
      </p>

      <div className="prevention-list">
        {PREVENTIONS.map((prevention) => (
          <label key={prevention.id} className="prevention-toggle">
            <input
              type="checkbox"
              checked={!!preventions[prevention.id]}
              disabled={!!triggered[prevention.disasterId]}
              onChange={() => togglePrevention(prevention.id)}
            />
            <span className="prevention-emoji">{prevention.emoji}</span>
            {prevention.label}
          </label>
        ))}
      </div>

      <button className="reset-btn" onClick={resetHouse}>
        🏠 Reset house
      </button>
    </div>
  )
}
