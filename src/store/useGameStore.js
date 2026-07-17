import { create } from 'zustand'
import {
  DISASTERS,
  DISASTER_LIST,
  PREVENTIONS,
  WALLET,
  getDamageAvoided,
  getOutcomeRepairEstimate,
  getPreventionLockDisasterIds,
} from '../data/disasters'

const getDisasterOutcome = (preventions, disasterId) => {
  const disaster = DISASTERS[disasterId]
  const activePrevention = (disaster.preventionIds ?? [disasterId]).find(
    (id) => !!preventions[id]
  )
  if (!activePrevention) return 'full'
  return disaster.preventionOutcomes?.[activePrevention] ?? 'reduced'
}

/**
 * Single source of truth for game state.
 *
 * Disasters are triggered by clicking their object in the scene (roof, stove,
 * bathroom supply line, overloaded power strip, backyard tree) and then
 * PERSIST — the effect keeps running and the damage stays — until the player
 * hits "Reset house". Players acknowledge each result before they can start
 * the next disaster.
 *
 *  - triggered:  { [id]: true } disasters that have fired and are still going
 *  - damage:     { [id]: 'full' | 'reduced' | 'prevented' } outcome applied
 *  - preventions:{ [id]: boolean } active prevention controls; a control can
 *                mitigate more than one damage path when explicitly mapped
 *  - panelDisaster: which disaster the InfoPanel currently shows
 *  - acknowledgementRequired: blocks new disaster selections from the instant
 *                an event begins until its result panel's "Got it" is pressed
 *  - hasStarted:  whether the one-time first-load orientation panel is dismissed
 *
 * Savings-pot game — resetHouse starts a fresh run, including the wallet:
 *  - funds:       remaining savings; disasters drain their uninsured repair
 *                 estimate, protections charge while they are selected
 *  - purchased:   { [preventionId]: true } currently paid protections;
 *                 switching one off refunds its full cost
 *  - outcomesSeen:{ [disasterId]: true } drives the survived-the-year win
 *  - totalDamage / totalAvoided: running tallies for the end panels
 *  - brokeDismissed / winDismissed: one-time end panels acknowledged
 */
export const useGameStore = create((set, get) => ({
  hasStarted: false,
  triggered: {},
  damage: {},
  preventions: {},
  panelDisaster: null,
  acknowledgementRequired: false,
  funds: WALLET.startingFunds,
  purchased: {},
  outcomesSeen: {},
  totalDamage: 0,
  totalAvoided: 0,
  brokeDismissed: false,
  winDismissed: false,
  runGeneration: 0,

  triggerDisaster: (id) => {
    if (get().triggered[id] || get().acknowledgementRequired) return
    // Snapshot the outcome before the event starts. Related controls lock as
    // soon as the event is triggered, preventing retroactive protection.
    const outcome = getDisasterOutcome(get().preventions, id)
    const runGeneration = get().runGeneration
    set((s) => ({
      triggered: { ...s.triggered, [id]: true },
      panelDisaster: null,
      acknowledgementRequired: true,
    }))

    // Surface the result shortly after the event's key beat. This is separate
    // from effectDuration so hail/fire ambience can continue behind the panel.
    const duration =
      outcome === 'prevented'
        ? (DISASTERS[id].preventedDuration ?? 450)
        : outcome === 'reduced'
          ? (DISASTERS[id].reducedResultDelay ??
            DISASTERS[id].resultDelay ??
            DISASTERS[id].effectDuration)
        : (DISASTERS[id].resultDelay ?? DISASTERS[id].effectDuration)
    setTimeout(() => {
      const current = get()
      // Reset/start-over begins a new generation. Ignore any result callback
      // left behind by the previous run, even if the same risk was retriggered.
      if (
        current.runGeneration !== runGeneration ||
        !current.triggered[id] ||
        current.damage[id]
      ) return
      const disaster = DISASTERS[id]
      const cost = getOutcomeRepairEstimate(disaster, outcome)
      const avoidedDamage = getDamageAvoided(disaster, outcome)
      // The repair bill lands on the same beat the player reads the outcome.
      set((s) => ({
        panelDisaster: id,
        damage: { ...s.damage, [id]: outcome },
        funds: s.funds - cost,
        outcomesSeen: { ...s.outcomesSeen, [id]: true },
        totalDamage: s.totalDamage + cost,
        totalAvoided: s.totalAvoided + avoidedDamage,
      }))
    }, duration)
  },

  togglePrevention: (id) => {
    const prevention = PREVENTIONS.find((option) => option.id === id)
    if (
      !prevention ||
      getPreventionLockDisasterIds(prevention).some(
        (disasterId) => get().triggered[disasterId]
      )
    ) return
    const { preventions, funds } = get()
    const enabling = !preventions[id]
    // Protection costs follow the current selection: charge on enable and
    // refund on disable. Block activation if the player cannot cover it.
    if (enabling) {
      if (funds < prevention.cost) return
      set((s) => ({
        purchased: { ...s.purchased, [id]: true },
        funds: s.funds - prevention.cost,
        preventions: { ...s.preventions, [id]: true },
      }))
      return
    }
    set((s) => ({
      purchased: { ...s.purchased, [id]: false },
      funds: s.funds + prevention.cost,
      preventions: { ...s.preventions, [id]: false },
    }))
  },

  closePanel: () => set({ panelDisaster: null, acknowledgementRequired: false }),

  startExperience: () => set({ hasStarted: true }),

  showIntroduction: () => set({ hasStarted: false }),

  dismissBroke: () => set({ brokeDismissed: true }),

  dismissWin: () => set({ winDismissed: true }),

  resetHouse: () =>
    set((s) => ({
      triggered: {},
      damage: {},
      preventions: {},
      panelDisaster: null,
      acknowledgementRequired: false,
      funds: WALLET.startingFunds,
      purchased: {},
      outcomesSeen: {},
      totalDamage: 0,
      totalAvoided: 0,
      brokeDismissed: false,
      winDismissed: false,
      runGeneration: s.runGeneration + 1,
    })),

  // Fresh game: refill the pot and clear every purchase, outcome, and tally.
  startOver: () =>
    set((s) => ({
      triggered: {},
      damage: {},
      preventions: {},
      panelDisaster: null,
      acknowledgementRequired: false,
      funds: WALLET.startingFunds,
      purchased: {},
      outcomesSeen: {},
      totalDamage: 0,
      totalAvoided: 0,
      brokeDismissed: false,
      winDismissed: false,
      runGeneration: s.runGeneration + 1,
    })),

  // Derived: broke at $0 or below; survived once all five risks are tested
  // while still solvent.
  isBroke: () => get().funds <= 0,
  survivedYear: () => {
    const { outcomesSeen, funds } = get()
    return funds > 0 && DISASTER_LIST.every((d) => outcomesSeen[d.id])
  },
}))
