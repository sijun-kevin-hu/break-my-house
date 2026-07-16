import { useGameStore } from '../store/useGameStore'
import { COVERAGE_DEMO, DISASTERS } from '../data/disasters'

const formatDollars = (amount) => `$${amount.toLocaleString('en-US')}`

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
  const repairEstimate = prevented
    ? (d.repairEstimatePrevented ?? 0)
    : reduced
      ? d.repairEstimateReduced
      : d.repairEstimate
  const insurerPayment = Math.max(0, repairEstimate - COVERAGE_DEMO.deductible)
  const policyholderShare = repairEstimate - insurerPayment
  const avoidedDamage = d.repairEstimate - repairEstimate

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
      <p>
        {prevented
          ? (d.whatPrevented ?? d.whatHappened)
          : reduced
            ? (d.whatHappenedReduced ?? d.whatHappened)
            : d.whatHappened}
      </p>

      <section className="cost-comparison" aria-label={COVERAGE_DEMO.snapshotTitle}>
        <h3>{COVERAGE_DEMO.snapshotTitle}</h3>
        <div className="cost-row cost-uninsured">
          <span>{COVERAGE_DEMO.uninsuredLabel}</span>
          <strong className="cost-full">
            {repairEstimate === 0
              ? COVERAGE_DEMO.noClaimLabel
              : `${COVERAGE_DEMO.potentialPaymentPrefix} ${formatDollars(repairEstimate)} ${COVERAGE_DEMO.outOfPocketSuffix}`}
          </strong>
        </div>
        <div className="cost-row">
          <span>{COVERAGE_DEMO.insurerPaymentLabel}</span>
          <strong className={mitigated ? 'cost-reduced' : 'cost-covered'}>
            {repairEstimate === 0
              ? COVERAGE_DEMO.noClaimLabel
              : `${COVERAGE_DEMO.potentialPaymentPrefix} ${formatDollars(insurerPayment)}`}
          </strong>
        </div>
        <div className="cost-row cost-policyholder-share">
          <span>{COVERAGE_DEMO.policyholderShareLabel}</span>
          <strong className={mitigated ? 'cost-reduced' : ''}>
            {policyholderShare === 0
              ? COVERAGE_DEMO.noClaimLabel
              : COVERAGE_DEMO.deductibleLabel}
          </strong>
        </div>
        <p className="cost-disclaimer">{COVERAGE_DEMO.disclaimer}</p>
      </section>

      {mitigated && (
        <section className="prevention-savings" aria-label={COVERAGE_DEMO.preventionImpactTitle}>
          <span>{COVERAGE_DEMO.preventionImpactTitle}</span>
          <strong>
            {COVERAGE_DEMO.avoidedDamageLead} {formatDollars(avoidedDamage)} {COVERAGE_DEMO.avoidedDamageSuffix}
          </strong>
          <small>{COVERAGE_DEMO.avoidedDamageDetail}</small>
        </section>
      )}

      <h3>Prevention tip</h3>
      <p>{d.preventionTip}</p>

      <button className="close-btn" onClick={closePanel}>
        Got it
      </button>
    </aside>
  )
}
