import { useGameStore } from '../store/useGameStore'
import { WALLET } from '../data/disasters'

const formatDollars = (amount) =>
  `${amount < 0 ? '−' : ''}$${Math.abs(amount).toLocaleString('en-US')}`

/**
 * Top-right savings badge. Disasters drain it by their uninsured repair
 * estimate; selected protections charge their cost and refund it when
 * unselected. Reset house starts a fresh wallet run.
 */
export default function SavingsMeter() {
  const funds = useGameStore((s) => s.funds)

  const tier = funds > 30000 ? 'high' : funds > 12000 ? 'mid' : 'low'

  return (
    <div className={`savings-meter savings-${tier}`} aria-label={WALLET.hudLabel}>
      <span className="savings-label">{WALLET.hudLabel}</span>
      {/* key remount restarts the pop animation whenever the balance changes */}
      <strong className="savings-value" key={funds}>{formatDollars(funds)}</strong>
      <span className="savings-note">{WALLET.hudNote}</span>
    </div>
  )
}
