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
  repairEstimatePrefix: 'Estimated',
  potentialPaymentPrefix: 'Up to',
  deductibleLabel: '$1,000 demo deductible',
  noClaimLabel: '$0 — no claim needed',
  preventionImpactTitle: 'Prevention impact',
  avoidedDamageLead: 'You avoided',
  avoidedDamageSuffix: 'in estimated damage',
  avoidedDamageDetail: 'Compared with the unprotected scenario.',
  acknowledgementTip: 'Press “Got it” to unlock the house and trigger another disaster.',
  introSummary:
    'See what five common home disasters could cost if you had to pay for repairs yourself. After each one, compare that bill with an illustrative homeowners insurance outcome.',
  disclaimer:
    'Illustrative only. Repair amounts are authored demo scenarios, not quotes. Assumes a covered loss, replacement-cost settlement, a $1,000 demo deductible, and sufficient policy limits. Roof coverage and wind/hail deductibles vary by policy.',
}

/** Copy and labels for the first-load, two-step Break My House briefing. */
export const INTRODUCTION = {
  overview: {
    kicker: 'How to play · 1 of 2',
    title: 'Break My House',
    tagline: 'Could your savings survive a bad year at home?',
    lessonLabel: 'What you’ll learn',
    lesson: 'Why homeowners insurance matters when a repair bill is too big for savings alone — and how prevention can make the damage smaller.',
    controlsTitle: 'Move around the house',
    controls: [
      { keys: 'Click', label: 'a highlighted object', detail: 'Trigger one of five home disasters' },
      { keys: 'Drag / WASD', label: 'to look around', detail: 'Orbit the camera' },
      { keys: 'Scroll / Q / E', label: 'to get closer', detail: 'Zoom the view' },
    ],
    nextAction: 'Choose prevention',
  },
  protection: {
    kicker: 'How to play · 2 of 2',
    title: 'Prevent damage before it starts.',
    summary:
      'Choose any upgrades you want to buy. Each costs some savings now, but can reduce or eliminate a much larger repair bill later. You cannot add one after its disaster starts.',
    startAction: 'Start breaking things',
    backAction: 'Back',
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
  missionLabel: 'Keep your savings above $0',
  mission:
    'Test all five risks and finish with money left. Buying prevention costs a little now, but can protect you from much larger losses.',
  introBalanceLabel: 'Your starting savings',
  introBalanceNote:
    'This is your rainy-day fund. In this game, prevention purchases and repair bills without insurance both come out of it.',
  introInsuranceNote:
    'Each result also shows how homeowners insurance could help with that repair bill.',
  introSteps: [
    { title: 'Choose prevention', detail: 'Spend a little now to reduce a bigger loss.' },
    { title: 'Test all 5 risks', detail: 'Click objects around the house to cause disasters.' },
    { title: 'Stay above $0', detail: 'Finish with savings left to survive the year.' },
  ],
  brokeKicker: 'Out of money',
  brokeTitle: 'Wiped out!',
  brokeSummary:
    'Repair bills drained your savings — this is what one bad year looks like without enough protection.',
  brokeDamageLabel: 'Total damage taken',
  brokeFundsLabel: 'Savings left',
  brokeButton: 'Start over',
  brokeSecondary: 'Keep exploring',
  winKicker: 'Challenge complete',
  winTitle: 'Your savings survived!',
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
    whatHappened: 'Golf-ball-sized hail damaged the roof.',
    whatHappenedReduced:
      'Impact-resistant roofing limited the golf-ball-sized hail damage to a smaller area of the roof.',
    // Authored national demo scenario. Actual roof work varies with roof size,
    // material, labor market, damage scope, policy valuation, and deductible.
    repairEstimate: 12000,
    repairEstimateReduced: 3500,
    prevention: 'Impact-resistant roofing',
    preventionIds: ['hail'],
    preventionTip:
      'Choose impact-resistant shingles with strong IBHS hail ratings. Product performance varies, and some insurers offer premium discounts.',
  },
  fire: {
    id: 'fire',
    label: 'Kitchen Fire',
    shortLabel: 'Fire',
    emoji: '🔥',
    effectDuration: 4000,
    resultDelay: 1700,
    reducedResultDelay: 3100,
    // Seconds: skip the measured near-silent lead-in without re-encoding.
    audioStartAt: 0.95,
    loopAudioStartAt: 1.17,
    protectedSequence: {
      extinguisherArrival: 0.55,
      foamStart: 0.95,
      fireOut: 2.65,
      extinguisherFadeEnd: 3.1,
    },
    whatHappened:
      'An unattended stovetop fire spread to the furniture and charred the walls.',
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

/** Resolve the authored repair estimate for a disaster outcome. */
export const getOutcomeRepairEstimate = (disaster, outcome) =>
  outcome === 'prevented'
    ? (disaster.repairEstimatePrevented ?? 0)
    : outcome === 'reduced'
      ? disaster.repairEstimateReduced
      : disaster.repairEstimate

/**
 * Damage avoided compares the resolved repair estimate with that disaster's
 * unprotected baseline. Protection purchase prices affect the savings balance,
 * but are not damage and therefore do not reduce this figure.
 */
export const getDamageAvoided = (disaster, outcome) =>
  Math.max(0, disaster.repairEstimate - getOutcomeRepairEstimate(disaster, outcome))

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
