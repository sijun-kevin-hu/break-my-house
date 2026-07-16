import { useGameStore } from '../store/useGameStore'
import { DISASTER_LIST } from '../data/disasters'

/** Bottom toolbar: one button per disaster + prevention toggle + reset. */
export default function Toolbar() {
  const phase = useGameStore((s) => s.phase)
  const preventions = useGameStore((s) => s.preventions)
  const triggerDisaster = useGameStore((s) => s.triggerDisaster)
  const togglePrevention = useGameStore((s) => s.togglePrevention)
  const resetHouse = useGameStore((s) => s.resetHouse)

  return (
    <div className="toolbar">
      {DISASTER_LIST.map((d) => (
        <div key={d.id} className="disaster-slot">
          <button
            className="disaster-btn"
            disabled={phase === 'active'}
            onClick={() => triggerDisaster(d.id)}
          >
            <span className="disaster-emoji">{d.emoji}</span>
            {d.label}
          </button>
          <label className="prevention-toggle">
            <input
              type="checkbox"
              checked={!!preventions[d.id]}
              onChange={() => togglePrevention(d.id)}
            />
            {d.prevention}
          </label>
        </div>
      ))}
      <button className="reset-btn" onClick={resetHouse}>
        🏠 Reset house
      </button>
    </div>
  )
}
