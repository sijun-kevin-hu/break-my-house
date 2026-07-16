import { create } from 'zustand'
import { DISASTERS } from '../data/disasters'

/**
 * Single source of truth for game state.
 *
 * Flow: idle -> (trigger) -> active -> (EFFECT_DURATION elapses) -> aftermath -> (reset/close)
 *  - activeDisaster: id of disaster currently animating, or null
 *  - damage: { [disasterId]: 'full' | 'reduced' } damage applied to the house
 *  - preventions: { [disasterId]: boolean } prevention toggled per disaster
 */
export const useGameStore = create((set, get) => ({
  phase: 'idle', // 'idle' | 'active' | 'aftermath'
  activeDisaster: null,
  damage: {},
  preventions: {},
  panelDisaster: null, // which disaster the InfoPanel shows

  triggerDisaster: (id) => {
    if (get().phase === 'active') return // one at a time
    set({ phase: 'active', activeDisaster: id, panelDisaster: null })

    const duration = DISASTERS[id].effectDuration
    setTimeout(() => {
      const prevented = !!get().preventions[id]
      set((s) => ({
        phase: 'aftermath',
        activeDisaster: null,
        panelDisaster: id,
        damage: { ...s.damage, [id]: prevented ? 'reduced' : 'full' },
      }))
    }, duration)
  },

  togglePrevention: (id) =>
    set((s) => ({
      preventions: { ...s.preventions, [id]: !s.preventions[id] },
    })),

  closePanel: () => set({ panelDisaster: null, phase: 'idle' }),

  resetHouse: () =>
    set({ phase: 'idle', activeDisaster: null, damage: {}, panelDisaster: null }),

  // Derived: 100 base, minus per-disaster risk unless prevented
  riskScore: () => {
    const { preventions } = get()
    return Object.values(DISASTERS).reduce(
      (score, d) => score - (preventions[d.id] ? 0 : d.riskWeight),
      100
    )
  },
}))
