/**
 * All disaster content lives here — panel copy, costs, prevention info.
 * Adding a disaster = add an entry here + an effect component in src/disasters/.
 */
export const COVERAGE_DEMO = {
  deductible: 1000,
  snapshotTitle: 'Financial snapshot',
  uninsuredLabel: 'No homeowners insurance',
  insurerPaymentLabel: 'If covered: insurer may pay',
  policyholderShareLabel: 'Your share',
  outOfPocketSuffix: 'out of pocket',
  potentialPaymentPrefix: 'Up to',
  deductibleLabel: '$1,000 demo deductible',
  noClaimLabel: '$0 — no claim needed',
  preventionImpactTitle: 'Prevention impact',
  avoidedDamageLead: 'You avoided',
  avoidedDamageSuffix: 'in estimated damage',
  avoidedDamageDetail: 'Compared with the unprotected scenario.',
  introSummary:
    'Explore a roomy three-bedroom, one-bath home, trigger a disaster, and compare the full uninsured cost with an illustrative covered outcome using a $1,000 demo deductible.',
  disclaimer:
    'Illustrative only. Assumes a covered loss, a $1,000 demo deductible, and sufficient policy limits. Your policy and deductible may differ.',
}

export const DISASTERS = {
  hail: {
    id: 'hail',
    label: 'Hailstorm',
    emoji: '🌨️',
    effectDuration: 4000,
    resultDelay: 2200,
    riskWeight: 20,
    whatHappened: 'Golf-ball hail battered the roof and dented the gutters.',
    repairEstimate: 12000,
    repairEstimateReduced: 3500,
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
    resultDelay: 1700,
    riskWeight: 30,
    whatHappened: 'An unattended stovetop fire spread to the cabinets before it was put out.',
    repairEstimate: 25000,
    repairEstimateReduced: 4000,
    prevention: 'Smoke detectors + extinguisher',
    preventionIds: ['fire'],
    preventionTip:
      'Working smoke detectors cut fire deaths in half and catch fires while they are still small.',
  },
  water: {
    id: 'water',
    label: 'Bathroom Water Loss',
    emoji: '💧',
    effectDuration: 9000,
    resultDelay: 6500,
    reducedResultDelay: 1900,
    sprayPersistsUntilReset: true,
    sprayDurationReduced: 1.35,
    riskWeight: 20,
    whatHappened:
      'A bathroom supply line split and sent water across the floor and into the nearby walls.',
    repairEstimate: 18000,
    repairEstimateReduced: 2500,
    prevention: 'Leak sensor + automatic shutoff',
    preventionIds: ['water'],
    preventionTip:
      'Place leak sensors near bathroom and appliance supply lines. An automatic shutoff can stop the flow before water spreads through the home.',
  },
  tree: {
    id: 'tree',
    label: 'Fallen Tree',
    preventedLabel: 'Tree Risk Removed',
    emoji: '🌳',
    effectDuration: 4000,
    resultDelay: 1500,
    preventedDuration: 450,
    riskWeight: 20,
    whatHappened: 'A storm dropped the backyard oak straight onto the roofline.',
    whatPrevented:
      'The hazardous oak was removed before the storm, leaving nothing close enough to strike the house.',
    repairEstimate: 9000,
    repairEstimatePrevented: 0,
    prevention: 'Remove hazardous tree',
    preventionIds: ['removeTree'],
    preventionOutcomes: { removeTree: 'prevented' },
    preventionTip:
      'A qualified arborist can identify trees that are dead, unstable, or too close to the home. Removing a confirmed hazard eliminates that specific strike risk.',
  },
  electrical: {
    id: 'electrical',
    label: 'Electrical Arc Fire',
    emoji: '⚡',
    effectDuration: 3500,
    resultDelay: 2200,
    reducedResultDelay: 850,
    riskWeight: 10,
    whatHappened:
      'An overloaded bedroom power strip developed an arc fault, damaging wiring, drywall, and connected electronics.',
    repairEstimate: 20000,
    repairEstimateReduced: 1500,
    prevention: 'AFCI breakers + electrical inspection',
    preventionIds: ['electrical'],
    preventionTip:
      'Arc-fault circuit interrupters can shut down dangerous arcing before it spreads. Have a qualified electrician inspect damaged wiring and overloaded circuits.',
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
  { id: 'water', disasterId: 'water', emoji: '💧', label: 'Leak sensor + automatic shutoff' },
  { id: 'removeTree', disasterId: 'tree', emoji: '🪵', label: 'Remove hazardous tree' },
  { id: 'electrical', disasterId: 'electrical', emoji: '⚡', label: 'AFCI breakers + electrical inspection' },
]
