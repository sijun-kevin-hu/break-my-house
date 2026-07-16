import { create } from 'zustand'
import { DISASTERS, PREVENTIONS } from '../data/disasters'

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
 * backyard tree) and then PERSIST — the effect keeps running and the damage
 * stays — until the player hits "Reset house". Several can pile up at once.
 *
 *  - triggered:  { [id]: true } disasters that have fired and are still going
 *  - damage:     { [id]: 'full' | 'reduced' | 'prevented' } outcome applied
 *  - preventions:{ [id]: boolean } active prevention controls; a control can
 *                mitigate more than one damage path when explicitly mapped
 *  - impacts:    count of disasters still inside their initial "impact" window,
 *                used only to drive the camera shake (so it settles down)
 *  - panelDisaster: which disaster the InfoPanel currently shows
 */
export const useGameStore = create((set, get) => ({
  triggered: {},
  damage: {},
  preventions: {},
  impacts: 0,
  panelDisaster: null,

  triggerDisaster: (id) => {
    if (get().triggered[id]) return // already going — ignore repeat clicks
    // Snapshot the outcome before the event starts. Related controls lock as
    // soon as the event is triggered, preventing retroactive protection.
    const outcome = getDisasterOutcome(get().preventions, id)
    set((s) => ({
      triggered: { ...s.triggered, [id]: true },
      impacts: s.impacts + 1,
      panelDisaster: null,
    }))

    // Surface the result shortly after the event's key beat. This is separate
    // from effectDuration so hail/fire ambience can continue behind the panel.
    const duration =
      outcome === 'prevented'
        ? (DISASTERS[id].preventedDuration ?? 450)
        : (DISASTERS[id].resultDelay ?? DISASTERS[id].effectDuration)
    setTimeout(() => {
      if (!get().triggered[id]) return // reset happened mid-impact
      set((s) => ({
        panelDisaster: id,
        damage: { ...s.damage, [id]: outcome },
        impacts: Math.max(0, s.impacts - 1),
      }))
    }, duration)
  },

  togglePrevention: (id) => {
    const prevention = PREVENTIONS.find((option) => option.id === id)
    if (prevention && get().triggered[prevention.disasterId]) return
    set((s) => ({
      preventions: { ...s.preventions, [id]: !s.preventions[id] },
    }))
  },

  closePanel: () => set({ panelDisaster: null }),

  resetHouse: () =>
    set({ triggered: {}, damage: {}, impacts: 0, panelDisaster: null }),

  // Derived: 100 base, minus per-disaster risk unless prevented
  riskScore: () => {
    const { preventions } = get()
    return Object.values(DISASTERS).reduce(
      (score, d) => score - (getDisasterOutcome(preventions, d.id) === 'full' ? d.riskWeight : 0),
      100
    )
  },
}))

if (typeof window !== 'undefined') window.__store = useGameStore // debug
