import { useGameStore } from '../store/useGameStore'
import { PREVENTIONS, PREVENTION_UI } from '../data/disasters'

/**
 * Bottom toolbar. Disasters are triggered by clicking objects in the scene
 * (roof, stove, bathroom supply line, overloaded power strip, backyard tree) —
 * NOT from here. This panel only holds prevention toggles and reset.
 */
export default function Toolbar() {
  const preventions = useGameStore((s) => s.preventions)
  const triggered = useGameStore((s) => s.triggered)
  const acknowledgementRequired = useGameStore((s) => s.acknowledgementRequired)
  const togglePrevention = useGameStore((s) => s.togglePrevention)
  const resetHouse = useGameStore((s) => s.resetHouse)
  const triggerHints = [
    { id: 'hail', emoji: '🏠', label: 'Roof' },
    { id: 'fire', emoji: '🔥', label: 'Stove' },
    { id: 'water', emoji: '💧', label: 'Pipe' },
    { id: 'electrical', emoji: '⚡', label: 'Power strip' },
    { id: 'tree', emoji: '🌳', label: preventions.removeTree ? 'Stump' : 'Tree' },
  ]
  const hasTriggered = triggerHints.some((hint) => triggered[hint.id])
  const missionCopy = acknowledgementRequired
    ? 'Review the result, then test another risk—or reset to compare prevention.'
    : hasTriggered
      ? 'Test another risk—or reset to compare prevention.'
      : 'Click any of the listed objects to see the damage, coverage, and prevention option.'

  return (
    <div className="toolbar">
      <section className="toolbar-mission" aria-label="Risk testing instructions">
        <p className="toolbar-mission-title">Pick a home risk to test</p>
        <p className="toolbar-mission-copy" aria-live="polite">{missionCopy}</p>
        <ul className="toolbar-targets" aria-label="Clickable risks in the house">
          {triggerHints.map((hint) => (
            <li
              key={hint.id}
              className={triggered[hint.id] ? 'toolbar-target toolbar-target-complete' : 'toolbar-target'}
            >
              <span aria-hidden="true">{hint.emoji}</span> {hint.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="prevention-list" aria-label="Prevention choices">
        <div className="prevention-list-heading">
          <p>{PREVENTION_UI.toolbarTitle}</p>
        </div>
        <div className="prevention-grid">
          {PREVENTIONS.map((prevention) => {
            const active = !!preventions[prevention.id]
            const locked = !!triggered[prevention.disasterId]
            const state = locked
              ? PREVENTION_UI.lockedState
              : active
                ? PREVENTION_UI.activeState
                : PREVENTION_UI.inactiveState
            return (
              <label
                key={prevention.id}
                className={`prevention-toggle${active ? ' prevention-toggle-active' : ''}${locked ? ' prevention-toggle-locked' : ''}`}
              >
                <input
                  className="prevention-input"
                  type="checkbox"
                  checked={active}
                  disabled={locked}
                  aria-label={`${prevention.label}. ${state}. Protects ${prevention.protects}.`}
                  onChange={() => togglePrevention(prevention.id)}
                />
                <span className="prevention-check" aria-hidden="true">{active ? '✓' : ''}</span>
                <span className="prevention-emoji" aria-hidden="true">{prevention.emoji}</span>
                <span className="prevention-copy">
                  <strong>{prevention.toolbarLabel}</strong>
                </span>
                <span className="prevention-state">{state}</span>
              </label>
            )
          })}
        </div>
      </section>

      <button className="reset-btn" onClick={resetHouse}>
        🏠 Reset house
      </button>
    </div>
  )
}
