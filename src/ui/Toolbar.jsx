import { Fragment } from 'react'
import { useGameStore } from '../store/useGameStore'
import { PREVENTIONS } from '../data/disasters'

/**
 * Bottom toolbar. Disasters are triggered by clicking objects in the scene
 * (roof, stove, bathroom supply line, overloaded power strip, backyard tree) —
 * NOT from here. This panel only holds prevention toggles and reset.
 */
export default function Toolbar() {
  const preventions = useGameStore((s) => s.preventions)
  const triggered = useGameStore((s) => s.triggered)
  const togglePrevention = useGameStore((s) => s.togglePrevention)
  const resetHouse = useGameStore((s) => s.resetHouse)
  const triggerHints = [
    { id: 'hail', label: 'roof' },
    { id: 'fire', label: 'stove' },
    { id: 'water', label: 'bathroom pipe' },
    { id: 'electrical', label: 'power strip' },
    { id: 'tree', label: preventions.removeTree ? 'stump' : 'tree' },
  ]

  return (
    <div className="toolbar">
      <p className="toolbar-hint">
        🖱️ Click on the{' '}
        {triggerHints.map((hint, index) => (
          <Fragment key={hint.id}>
            <span className={triggered[hint.id] ? 'toolbar-hint-complete' : undefined}>
              <strong>{hint.label}</strong>
            </span>
            {index < triggerHints.length - 2 ? ', ' : index === triggerHints.length - 2 ? ', or ' : ''}
          </Fragment>
        ))}{' '}
        to test a disaster.
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
