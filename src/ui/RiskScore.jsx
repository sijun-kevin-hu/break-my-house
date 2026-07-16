import { useGameStore } from '../store/useGameStore'

/** Live risk score badge. Recomputes when preventions change. */
export default function RiskScore() {
  // Subscribe to preventions so the derived score re-renders
  useGameStore((s) => s.preventions)
  const score = useGameStore((s) => s.riskScore)()

  const tier = score >= 90 ? 'good' : score >= 60 ? 'ok' : 'bad'

  return (
    <div className={`risk-score risk-${tier}`}>
      <span className="risk-label">Home Risk Score</span>
      <span className="risk-value">{score}</span>
    </div>
  )
}
