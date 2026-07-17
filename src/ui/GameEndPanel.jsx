import { useGameStore } from '../store/useGameStore'
import { WALLET } from '../data/disasters'

const formatDollars = (amount) =>
  `${amount < 0 ? '−' : ''}$${Math.abs(amount).toLocaleString('en-US')}`

/**
 * One-time end states for the savings game. Going broke (funds ≤ $0) shows a
 * wipeout; testing all five risks while solvent shows the survival win. Both
 * wait until the current result panel is acknowledged so they never cover the
 * financial snapshot, and each shows once until Start over resets the game.
 * Broke wins the tie: if the last event both completes the set and drains the
 * pot, the wipeout is the honest outcome.
 */
export default function GameEndPanel() {
  // Subscribe to the inputs of the derived checks so they re-render
  useGameStore((s) => s.funds)
  useGameStore((s) => s.outcomesSeen)
  const isBroke = useGameStore((s) => s.isBroke)()
  const survivedYear = useGameStore((s) => s.survivedYear)()
  const brokeDismissed = useGameStore((s) => s.brokeDismissed)
  const winDismissed = useGameStore((s) => s.winDismissed)
  const panelDisaster = useGameStore((s) => s.panelDisaster)
  const dismissBroke = useGameStore((s) => s.dismissBroke)
  const dismissWin = useGameStore((s) => s.dismissWin)
  const startOver = useGameStore((s) => s.startOver)
  const funds = useGameStore((s) => s.funds)
  const totalDamage = useGameStore((s) => s.totalDamage)
  const totalAvoided = useGameStore((s) => s.totalAvoided)

  if (panelDisaster) return null
  const showBroke = isBroke && !brokeDismissed
  const showWin = !showBroke && !isBroke && survivedYear && !winDismissed
  if (!showBroke && !showWin) return null

  return showBroke ? (
    <section className="victory-screen victory-screen-broke" aria-labelledby="end-title">
      <div className="victory-panel">
        <p className="victory-kicker victory-kicker-broke">{WALLET.brokeKicker}</p>
        <h2 id="end-title">💸 {WALLET.brokeTitle}</h2>
        <p className="victory-summary">{WALLET.brokeSummary}</p>

        <div className="victory-totals">
          <div className="victory-total victory-total-damage">
            <span>{WALLET.brokeDamageLabel}</span>
            <strong>{formatDollars(totalDamage)}</strong>
          </div>
          <div className="victory-total victory-total-damage">
            <span>{WALLET.brokeFundsLabel}</span>
            <strong>{formatDollars(funds)}</strong>
          </div>
        </div>

        <p className="victory-lesson">✦ {WALLET.endLesson}</p>

        <div className="victory-actions">
          <button className="victory-secondary" onClick={dismissBroke}>
            {WALLET.brokeSecondary}
          </button>
          <button className="victory-close" onClick={startOver} autoFocus>
            {WALLET.brokeButton}
          </button>
        </div>
      </div>
    </section>
  ) : (
    <section className="victory-screen" aria-labelledby="end-title">
      <div className="victory-panel">
        <p className="victory-kicker">{WALLET.winKicker}</p>
        <h2 id="end-title">🏆 {WALLET.winTitle}</h2>
        <p className="victory-summary">{WALLET.winSummary}</p>

        <div className="victory-totals">
          <div className="victory-total victory-total-avoided">
            <span>{WALLET.winFundsLabel}</span>
            <strong>{formatDollars(funds)}</strong>
          </div>
          <div className="victory-total victory-total-avoided">
            <span>{WALLET.winAvoidedLabel}</span>
            <strong>{formatDollars(totalAvoided)}</strong>
          </div>
        </div>

        <p className="victory-lesson">✦ {WALLET.endLesson}</p>

        <div className="victory-actions">
          <button className="victory-secondary" onClick={startOver}>
            {WALLET.winSecondary}
          </button>
          <button className="victory-close" onClick={dismissWin} autoFocus>
            {WALLET.winButton}
          </button>
        </div>
      </div>
    </section>
  )
}
