import { useGameStore } from '../store/useGameStore'
import { DISASTERS } from '../data/disasters'

/** Slides in after a disaster resolves. All copy lives in src/data/disasters.js. */
export default function InfoPanel() {
  const panelDisaster = useGameStore((s) => s.panelDisaster)
  const damage = useGameStore((s) => s.damage)
  const closePanel = useGameStore((s) => s.closePanel)

  if (!panelDisaster) return null
  const d = DISASTERS[panelDisaster]
  const reduced = damage[d.id] === 'reduced'
  const prevented = damage[d.id] === 'prevented'
  const mitigated = reduced || prevented

  return (
    <aside className="info-panel">
      <h2>
        {d.emoji} {prevented ? (d.preventedLabel ?? d.label) : d.label}
      </h2>
      {mitigated && (
        <div className="badge-prevented">
          {prevented ? 'Risk eliminated!' : 'Prevention paid off!'}
        </div>
      )}

      <h3>What happened</h3>
      <p>{prevented ? (d.whatPrevented ?? d.whatHappened) : d.whatHappened}</p>

      <h3>What coverage applies</h3>
      <p>{prevented ? (d.coveragePrevented ?? d.coverage) : d.coverage}</p>

      <h3>Typical cost</h3>
      <p className={mitigated ? 'cost-reduced' : 'cost-full'}>
        {prevented ? d.avgCostPrevented : reduced ? d.avgCostReduced : d.avgCost}
      </p>

      <h3>Prevention tip</h3>
      <p>{d.preventionTip}</p>

      <button className="close-btn" onClick={closePanel}>
        Got it
      </button>
    </aside>
  )
}
