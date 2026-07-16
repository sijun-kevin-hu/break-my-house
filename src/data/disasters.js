/**
 * All disaster content lives here — panel copy, costs, prevention info.
 * Adding a disaster = add an entry here + an effect component in src/disasters/.
 */
export const DISASTERS = {
  hail: {
    id: 'hail',
    label: 'Hailstorm',
    emoji: '🌨️',
    effectDuration: 4000,
    riskWeight: 20,
    whatHappened: 'Golf-ball hail battered the roof and dented the gutters.',
    coverage: 'Homeowners policy — dwelling coverage (wind/hail peril).',
    avgCost: '$12,000 average hail claim',
    avgCostReduced: '$3,500 with impact-resistant roofing',
    prevention: 'Impact-resistant roofing',
    preventionIds: ['hail'],
    preventionTip:
      'Class 4 impact-resistant shingles can cut hail damage dramatically — and often earn a premium discount.',
  },
  fire: {
    id: 'fire',
    label: 'Kitchen Fire',
    emoji: '🔥',
    effectDuration: 4000,
    riskWeight: 30,
    whatHappened: 'An unattended stovetop fire spread to the cabinets before it was put out.',
    coverage: 'Homeowners policy — dwelling + personal property (fire peril).',
    avgCost: '$25,000 average kitchen fire claim',
    avgCostReduced: '$4,000 with early smoke detection',
    prevention: 'Smoke detectors + extinguisher',
    preventionIds: ['fire'],
    preventionTip:
      'Working smoke detectors cut fire deaths in half and catch fires while they are still small.',
  },
  tree: {
    id: 'tree',
    label: 'Fallen Tree',
    preventedLabel: 'Tree Risk Removed',
    emoji: '🌳',
    effectDuration: 4000,
    preventedDuration: 650,
    riskWeight: 20,
    whatHappened: 'A storm dropped the backyard oak straight onto the roofline.',
    whatPrevented:
      'The hazardous oak was removed before the storm, leaving nothing close enough to strike the house.',
    coverage: 'Homeowners policy — dwelling coverage (falling object peril).',
    coveragePrevented: 'No property damage occurred, so no insurance claim was needed.',
    avgCost: '$9,000 average fallen-tree claim',
    avgCostPrevented: '$0 in tree-impact damage',
    prevention: 'Remove hazardous tree',
    preventionIds: ['removeTree'],
    preventionOutcomes: { removeTree: 'prevented' },
    preventionTip:
      'A qualified arborist can identify trees that are dead, unstable, or too close to the home. Removing a confirmed hazard eliminates that specific strike risk.',
  },
}

export const DISASTER_LIST = Object.values(DISASTERS)

/**
 * Prevention controls are intentionally separate from disasters so each one
 * can declare which event it locks and mitigates.
 */
export const PREVENTIONS = [
  { id: 'hail', disasterId: 'hail', emoji: '🌨️', label: 'Impact-resistant roofing' },
  { id: 'fire', disasterId: 'fire', emoji: '🔥', label: 'Smoke detectors + extinguisher' },
  { id: 'removeTree', disasterId: 'tree', emoji: '🪵', label: 'Remove hazardous tree' },
]
