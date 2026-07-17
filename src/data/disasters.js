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
  acknowledgementTip: 'Press “Got it” to unlock the house and trigger another disaster.',
  introSummary:
    'Explore a roomy three-bedroom, one-bath home, trigger a disaster, and compare the full uninsured cost with an illustrative covered outcome using a $1,000 demo deductible.',
  disclaimer:
    'Illustrative only. Assumes a covered loss, a $1,000 demo deductible, and sufficient policy limits. Your policy and deductible may differ.',
}

/** Copy and labels for the first-load, two-step risk-lab briefing. */
export const INTRODUCTION = {
  overview: {
    kicker: 'Insurance risk lab · 1 of 2',
    title: 'How much can one home risk cost?',
    lessonLabel: 'The goal',
    lesson: 'See how a small home upgrade can limit damage, disruption, and avoidable costs before a claim begins.',
    controlsTitle: 'Explore the house',
    controls: [
      { keys: 'Click', label: 'the roof, stove, pipe, power strip, or tree', detail: 'Trigger a risk event' },
      { keys: 'Drag / WASD', label: 'around the house', detail: 'Orbit the camera' },
      { keys: 'Scroll', label: 'or use Q / E', detail: 'Zoom the view' },
    ],
    nextAction: 'Next: choose protections',
  },
  protection: {
    kicker: 'Insurance risk lab · 2 of 2',
    title: 'Protect the house before you test it.',
    summary:
      'These are prevention choices — practical upgrades and maintenance that can reduce or eliminate a specific loss. Turn one on before you trigger its matching risk.',
    startAction: 'Start the risk test',
    backAction: 'Back to overview',
  },
}

export const PREVENTION_UI = {
  toolbarTitle: 'Home protection',
  activeState: 'Active',
  inactiveState: 'Off',
  lockedState: 'Locked',
  cantAffordState: 'Can’t afford',
  ownedNote: 'Paid',
}

/**
 * Savings-pot game economy. The player starts with a fixed pot of savings;
 * every resolved disaster drains its uninsured repair estimate, and every
 * protection charges its cost while switched on and refunds that cost when
 * switched off.
 * Testing all five risks while staying above $0 wins the year; hitting $0 is
 * a wipeout. The pot is deliberately smaller than the $84,000 total
 * unprotected damage, so a reckless run cannot finish solvent — the player
 * has to buy protection to survive. Each protection costs less than the
 * damage it avoids, so buying is always rational but never free.
 */
export const WALLET = {
  startingFunds: 50000,
  hudLabel: 'Your savings',
  hudNote: 'Test all 5 risks · don’t go broke',
  missionLabel: 'The challenge',
  mission:
    'Test all five risks and finish with savings left. Protections cost money up front — but the losses they prevent cost far more.',
  brokeKicker: 'Out of money',
  brokeTitle: 'Wiped out!',
  brokeSummary:
    'Repair bills drained your savings — this is what one bad year looks like without enough protection.',
  brokeDamageLabel: 'Total damage taken',
  brokeFundsLabel: 'Savings left',
  brokeButton: 'Start over',
  brokeSecondary: 'Keep exploring',
  winKicker: 'Challenge complete',
  winTitle: 'You survived the year!',
  winSummary:
    'You tested all five risks and still have money in the bank — protection paid for itself.',
  winFundsLabel: 'Savings left',
  winAvoidedLabel: 'Damage avoided by protection',
  winButton: 'Keep playing',
  winSecondary: 'Start over',
  endLesson: 'Insurance covers the catastrophe. Prevention keeps it small.',
}

export const DISASTERS = {
  hail: {
    id: 'hail',
    label: 'Hailstorm',
    shortLabel: 'Hail',
    emoji: '🌨️',
    effectDuration: 4000,
    resultDelay: 2200,
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
    shortLabel: 'Fire',
    emoji: '🔥',
    effectDuration: 4000,
    resultDelay: 1700,
    reducedResultDelay: 3100,
    protectedSequence: {
      extinguisherArrival: 0.55,
      foamStart: 0.95,
      fireOut: 2.65,
      extinguisherFadeEnd: 3.1,
    },
    whatHappened: 'An unattended stovetop fire spread to the cabinets before it was put out.',
    whatHappenedReduced:
      'The smoke alarm alerted the household while the fire was still on the stove, and an extinguisher put it out before it spread.',
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
    shortLabel: 'Water',
    emoji: '💧',
    effectDuration: 9000,
    // Let the initial jets and all four puddles establish, then surface the
    // financial explanation promptly instead of holding the interaction lock.
    resultDelay: 2000,
    reducedResultDelay: 1900,
    sprayPersistsUntilReset: true,
    sprayDurationReduced: 1.35,
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
    shortLabel: 'Tree',
    preventedLabel: 'Tree Risk Removed',
    emoji: '🌳',
    effectDuration: 4000,
    resultDelay: 1500,
    preventedDuration: 450,
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
    shortLabel: 'Electrical',
    emoji: '⚡',
    effectDuration: 3500,
    resultDelay: 2200,
    reducedResultDelay: 850,
    whatHappened:
      'An overloaded bedroom power strip developed an arc fault, damaging wiring, drywall, and connected electronics.',
    repairEstimate: 20000,
    repairEstimateReduced: 1500,
    prevention: 'AFCI breakers + electrical inspection',
    preventionIds: ['electrical'],
    smokeAlarmPreventionIds: ['fire'],
    smokeAlarmDelay: 0.72,
    preventionTip:
      'Arc-fault circuit interrupters can shut down dangerous arcing before it spreads. Have a qualified electrician inspect damaged wiring and overloaded circuits.',
  },
}

export const DISASTER_LIST = Object.values(DISASTERS)

export const getPreventionLockDisasterIds = (prevention) =>
  prevention.lockDisasterIds ?? [prevention.disasterId]

/**
 * Prevention controls are intentionally separate from disasters so each one
 * can declare which event it locks and mitigates. Each `cost` is charged while
 * that protection is selected and refunded when it is unselected; every cost is
 * deliberately lower than the damage its protection avoids.
 */
export const PREVENTIONS = [
  {
    id: 'hail',
    disasterId: 'hail',
    emoji: '🌨️',
    label: 'Impact-resistant roofing',
    toolbarLabel: 'Impact-resistant roof',
    protects: 'Hailstorm',
    benefit: 'Reduces roof impacts and repair costs.',
    cost: 4000,
  },
  {
    id: 'fire',
    disasterId: 'fire',
    lockDisasterIds: ['fire', 'electrical'],
    emoji: '🔥',
    label: 'Smoke detectors + extinguisher',
    toolbarLabel: 'Smoke alarm + extinguisher',
    protects: 'Kitchen fire; alerts on electrical fire',
    benefit: 'Helps stop a small stove fire and warns of electrical fire spread.',
    cost: 200,
  },
  {
    id: 'water',
    disasterId: 'water',
    emoji: '💧',
    label: 'Leak sensor + automatic shutoff',
    toolbarLabel: 'Leak sensor + shutoff',
    protects: 'Bathroom water loss',
    benefit: 'Stops the flow before water reaches more of the home.',
    cost: 800,
  },
  {
    id: 'removeTree',
    disasterId: 'tree',
    emoji: '🪵',
    label: 'Remove hazardous tree',
    toolbarLabel: 'Remove hazardous tree',
    protects: 'Fallen tree',
    benefit: 'Eliminates this tree strike risk entirely.',
    cost: 1500,
  },
  {
    id: 'electrical',
    disasterId: 'electrical',
    emoji: '⚡',
    label: 'AFCI breakers + electrical inspection',
    toolbarLabel: 'AFCI + electrical check',
    protects: 'Electrical arc fire',
    benefit: 'Trips dangerous arcing before it can spread.',
    cost: 1200,
  },
]
