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

  return (
    <aside className="info-panel">
      <h2>
        {d.emoji} {d.label}
      </h2>
      {reduced && <div className="badge-prevented">Prevention paid off!</div>}

      <h3>What happened</h3>
      <p>{d.whatHappened}</p>

      <h3>What coverage applies</h3>
      <p>{d.coverage}</p>

      <h3>Typical cost</h3>
      <p className={reduced ? 'cost-reduced' : 'cost-full'}>
        {reduced ? d.avgCostReduced : d.avgCost}
      </p>

      <h3>Prevention tip</h3>
      <p>{d.preventionTip}</p>

      <button className="close-btn" onClick={closePanel}>
        Got it
      </button>
    </aside>
  )
}
