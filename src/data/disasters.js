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
    emoji: '🌳',
    effectDuration: 4000,
    riskWeight: 20,
    whatHappened: 'A storm dropped the backyard oak straight onto the roofline.',
    coverage: 'Homeowners policy — dwelling coverage (falling object peril).',
    avgCost: '$9,000 average fallen-tree claim',
    avgCostReduced: '$1,000 with trimming or reinforced roof framing',
    prevention: 'Trim overhanging branches',
    preventionIds: ['tree', 'roofStructure'],
    preventionTip:
      'Trees within falling distance should be inspected yearly. Trimming lowers the strike risk; reinforced framing limits roof damage if one still falls.',
  },
}

export const DISASTER_LIST = Object.values(DISASTERS)

/**
 * Prevention controls are intentionally separate from disasters: a structural
 * roof upgrade can mitigate a falling tree without suggesting hail-resistant
 * shingles protect against a heavy trunk.
 */
export const PREVENTIONS = [
  { id: 'hail', emoji: '🌨️', label: 'Impact-resistant roofing' },
  { id: 'fire', emoji: '🔥', label: 'Smoke detectors + extinguisher' },
  { id: 'tree', emoji: '🌳', label: 'Trim overhanging branches' },
  { id: 'roofStructure', emoji: '🏗️', label: 'Reinforced roof framing' },
]
