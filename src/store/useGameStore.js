import { create } from 'zustand'
import { DISASTERS } from '../data/disasters'

/**
 * Single source of truth for game state.
 *
 * Disasters are triggered by clicking their object in the scene (roof, stove,
 * backyard tree) and then PERSIST — the effect keeps running and the damage
 * stays — until the player hits "Reset house". Several can pile up at once.
 *
 *  - triggered:  { [id]: true } disasters that have fired and are still going
 *  - damage:     { [id]: 'full' | 'reduced' } damage applied to the house
 *  - preventions:{ [id]: boolean } prevention toggled per disaster
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
    set((s) => ({
      triggered: { ...s.triggered, [id]: true },
      impacts: s.impacts + 1,
      panelDisaster: null,
    }))

    // After the initial impact plays out, lock in the damage state, surface the
    // info panel, and let the camera settle. The effect itself keeps running.
    const duration = DISASTERS[id].effectDuration
    setTimeout(() => {
      if (!get().triggered[id]) return // reset happened mid-impact
      const prevented = !!get().preventions[id]
      set((s) => ({
        panelDisaster: id,
        damage: { ...s.damage, [id]: prevented ? 'reduced' : 'full' },
        impacts: Math.max(0, s.impacts - 1),
      }))
    }, duration)
  },

  togglePrevention: (id) =>
    set((s) => ({
      preventions: { ...s.preventions, [id]: !s.preventions[id] },
    })),

  closePanel: () => set({ panelDisaster: null }),

  resetHouse: () =>
    set({ triggered: {}, damage: {}, impacts: 0, panelDisaster: null }),

  // Derived: 100 base, minus per-disaster risk unless prevented
  riskScore: () => {
    const { preventions } = get()
    return Object.values(DISASTERS).reduce(
      (score, d) => score - (preventions[d.id] ? 0 : d.riskWeight),
      100
    )
  },
}))

if (typeof window !== 'undefined') window.__store = useGameStore // debug
