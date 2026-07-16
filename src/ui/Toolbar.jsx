import { useGameStore } from '../store/useGameStore'
import { DISASTER_LIST } from '../data/disasters'

/**
 * Bottom toolbar. Disasters are triggered by clicking objects in the scene
 * (roof, stove, backyard tree) — NOT from here. This panel only holds the
 * prevention toggles and the reset button.
 */
export default function Toolbar() {
  const preventions = useGameStore((s) => s.preventions)
  const togglePrevention = useGameStore((s) => s.togglePrevention)
  const resetHouse = useGameStore((s) => s.resetHouse)

  return (
    <div className="toolbar">
      <p className="toolbar-hint">
        🖱️ Click the <strong>roof</strong>, <strong>stove</strong>, or{' '}
        <strong>tree</strong> to unleash a disaster.
      </p>

      <div className="prevention-list">
        {DISASTER_LIST.map((d) => (
          <label key={d.id} className="prevention-toggle">
            <input
              type="checkbox"
              checked={!!preventions[d.id]}
              onChange={() => togglePrevention(d.id)}
            />
            <span className="prevention-emoji">{d.emoji}</span>
            {d.prevention}
          </label>
        ))}
      </div>

      <button className="reset-btn" onClick={resetHouse}>
        🏠 Reset house
      </button>
    </div>
  )
}
