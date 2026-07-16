import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { COVERAGE_DEMO, INTRODUCTION, PREVENTIONS } from '../data/disasters'

/** First-load orientation overlay. Gameplay state and dismissal live in the store. */
export default function IntroPanel() {
  const hasStarted = useGameStore((s) => s.hasStarted)
  const startExperience = useGameStore((s) => s.startExperience)
  const [step, setStep] = useState('overview')

  // Reopening “How to play” should always begin at the overview, not the last viewed step.
  useEffect(() => {
    if (hasStarted) setStep('overview')
  }, [hasStarted])

  if (hasStarted) return null

  const isOverview = step === 'overview'
  const content = isOverview ? INTRODUCTION.overview : INTRODUCTION.protection

  return (
    <section className="intro-screen" aria-labelledby="intro-title">
      <div className="intro-panel">
        <p className="intro-kicker">{content.kicker}</p>
        <div className="intro-heading">
          <span aria-hidden="true">{isOverview ? '⌂' : '✓'}</span>
          <h2 id="intro-title">{content.title}</h2>
        </div>
        {isOverview ? (
          <>
            <p className="intro-summary">{COVERAGE_DEMO.introSummary}</p>
            <div className="intro-lesson" aria-label={content.lessonLabel}>
              <span aria-hidden="true">✦</span>
              <p><strong>{content.lessonLabel}:</strong> {content.lesson}</p>
            </div>
            <div className="intro-controls">
              <p className="intro-controls-title">{content.controlsTitle}</p>
              <ul>
                {content.controls.map((control) => (
                  <li key={control.keys}>
                    <kbd>{control.keys}</kbd>
                    <span>
                      <strong>{control.label}</strong>
                      <small>{control.detail}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <button className="intro-start" onClick={() => setStep('protection')} autoFocus>
              {content.nextAction} <span aria-hidden="true">→</span>
            </button>
          </>
        ) : (
          <>
            <p className="intro-summary">{content.summary}</p>
            <ul className="intro-protection-list" aria-label="Available prevention choices">
              {PREVENTIONS.map((prevention) => (
                <li key={prevention.id}>
                  <span aria-hidden="true">{prevention.emoji}</span>
                  <p>
                    <strong>{prevention.label}</strong>
                    <small><b>Protects:</b> {prevention.protects} · {prevention.benefit}</small>
                  </p>
                </li>
              ))}
            </ul>
            <div className="intro-lesson intro-lesson-protection" aria-label={content.calloutLabel}>
              <span aria-hidden="true">✓</span>
              <p><strong>{content.calloutLabel}:</strong> {content.callout}</p>
            </div>
            <div className="intro-actions">
              <button className="intro-back" onClick={() => setStep('overview')}>
                <span aria-hidden="true">←</span> {content.backAction}
              </button>
              <button className="intro-start" onClick={startExperience} autoFocus>
                {content.startAction} <span aria-hidden="true">→</span>
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
