# Break My House 🏠🌪️

Interactive low-poly 3D insurance-risk education game. Players trigger a
disaster on the house, compare uninsured out-of-pocket exposure with an
illustrative covered outcome using a $1,000 demo deductible, then compare the
outcome with prevention enabled.

**Hackday pitch:** insurance education that people actually want to play with —
for customer education, new-agent training, and community outreach.

See `AGENTS.md` for implementation conventions and durable engineering context.

## Project maintenance

Every agent starts by reading `AGENTS.md` and this file. Update this document
in the same task whenever user-visible behavior, feature status, priorities,
known gaps, or verification results change; update `AGENTS.md` when a durable
technical convention or invariant changes.

## Scope and feature status

| Feature | Status | Acceptance / current behavior |
|---|---|---|
| Low-poly 3D house and orbit camera | Done | Mouse orbit and zoom; pan disabled. Keyboard orbit uses WASD/arrow keys and zoom uses Q/E, -/+, or numpad -/+. |
| Sims-style cutaway | Partial | Exterior walls, full-height interior partitions, and doors use smooth angle/pitch/zoom opacity. Bedroom walls now extend to the wing wall height with matching infill above every doorway, removing the permanently open upper section. Both roof sections use the same pitch/zoom opacity function; the wing roof spans the full shared-wall run and tucks beneath the original eave, while its materials disable depth writes and omit a thresholded shadow. Production build passes; manual orbit verification remains. |
| Roomy 3BR/1BA furnished interior | Partial | The wing is now deeper, giving every bedroom more floor area. The primary bed now rests against the bathroom-side wall and faces a dresser plus wall-mounted TV centered together on the opposite wall; its portable heater now sits in the open bedside strip instead of intersecting the bed silhouette. In both secondary bedrooms, the beds sit against the north wall and the dressers sit flush to their side walls, aligned beside the beds. The bathroom vanity is placed on the south wall with a compact countertop handle, a rectangular basin, and a small rectangular shutoff tab below it; no pipe or U-shaped control passes through the sink. The room also includes a mirror, storage, towels, bath mat, and hamper, while the bathtub has no exposed fixture. In the original core, the TV now sits on the west wall opposite a rotated sofa, a taller floor lamp and plant add vertical balance, and the sink sits close to the stove. Production build passes; room scale, furniture clearance, circulation, wall joins, roof alignment, and default framing need manual visual verification. |
| Hailstorm | Partial | Dense deterministic hail now strikes both roof sections, with the wing using the same staged dent, color-damage, prevention, and persistence logic as the core roof. Airborne hail is clipped at both roof surfaces, impact chips stay above their roof planes, and settled hail excludes the combined core-and-wing roof footprint. A brief, gentle camera rattle begins with the roof strikes; it remains deliberately lighter than the tree impact and is halved with impact-resistant roofing. Low-poly drifts remain outside the complete house. Production build passes; the corrected animation and pileup still need manual visual verification. |
| Kitchen fire | Partial | Stove-origin fire advances through counter, TV, fridge, living, dining, and the east wall; it leaves a dense, staged trail of overlapping floor char plus persistent stovetop soot and a warped burner. The shallow char geometry now has explicit clearance and depth offset above the finished kitchen floor so the slab cannot occlude it. Fire audio starts in the pre-paint phase and skips each clip's measured low-energy lead-in so its first cue lands with the first visible stove burst. With smoke detectors + extinguisher enabled, a procedural smoke alarm sounds while a red extinguisher enters, sweeps foam across the stovetop flame, and fades after the flame is out; only the localized reduced scorch remains. Production build passes; the full/protected sequence and revised audio synchronization still need manual visual and audio verification. |
| Bathroom water loss | Partial | Clicking the vanity shutoff immediately starts a deterministic under-sink burst aimed into the bathroom, with no trigger-time geometry mount. Three anchored core jets ease rapidly to full reach while 64 arcing droplets launch in a tight stagger. A dark, opaque pool starts growing in the open aisle on the first frame, followed by three overlapping pools with authored ease-out timing and a subtle settling ripple. The pools are shallow, floor-flush, irregular water surfaces that remain legible against the teal floor without transparent-surface sorting or artificial outline rings. The result panel opens after 2 seconds, once the initial burst and puddles establish, while spray and matching seeded water audio persist until reset. A visible leak sensor + automatic shutoff limits the spray and sound to 1.35 seconds, reduces their density, and keeps one clearly exposed puddle contained. Production build passes; the revised result timing and effect need manual visual/audio verification. |
| Electrical arc fire | Partial | The primary-bedroom power strip visibly carries five occupied sockets feeding the TV, console, phone charger, floor lamp, and portable heater. Clicking only the strip starts deterministic blue-white arcs, then sequentially pops the connected devices, races into the wall circuit, and ignites a bounded cord-path bedroom fire with sparks, multi-source smoke, device shutdown, melted debris, and a broad persistent scorch trail. When smoke detectors are selected but AFCI protection is not, the smoke alarm starts with the first flame, not the initial arc, and continues without reducing the outcome. AFCI breakers + an electrical inspection add a visible protected breaker, trip the circuit at 0.48 seconds, shorten the procedural audio, and stop the event at a small singe before it spreads. Production build passes; strip discoverability, cord routing, effect placement, audio, and full/protected timing need manual browser verification. |
| Fallen tree | Done | Clickable oak topples onto the roof with an explosive mixed shingle-and-leaf debris burst, dust plume, warm impact flash, a pronounced contact-timed camera shake, and a roof opening; removing the hazardous tree swaps it for a stump and prevents the strike. |
| Object-triggered disasters | Partial | Roof → hail, stove → fire, bathroom supply line → water loss, overloaded bedroom power strip → electrical arc fire, tree/stump → tree risk. A high-contrast sandbox mission card invites players to “Pick a home risk to test,” asks them to click any listed object, and lists every target as a compact icon chip; tested targets are struck through and reset restores them. After an event, the card directs players to test another risk or reset for a prevention comparison. Toolbar contains prevention controls and reset only; once one starts, all disaster targets stay locked until the result panel’s “Got it” is pressed, while camera movement remains available. Production build passes; the new card and the power-strip path still need manual interaction verification. |
| Discoverable interactions | Done | Live triggers use hover highlights, idle affordance, a pointer cursor, and a non-intercepting 3D pulse-ring halo; fired triggers stop reading as interactive. |
| Insurance information panel | Partial | Appears shortly after the event's key beat; shows a financial snapshot: uninsured out-of-pocket exposure, potential insurer payment, and the $1,000 demo deductible. Reduced and eliminated outcomes also quantify estimated damage avoided against the unprotected baseline. It notes that policy terms, limits, and wind/hail deductibles may differ. The outdated full-loss savings nudge has been removed, and a tip above “Got it” explains that acknowledging the result unlocks another disaster. The panel becomes a viewport-bounded scroller with a sticky acknowledgement action on narrow or short windows. Production build passes; the revised comparison layout and acknowledgement tip need manual visual verification. |
| Prevention controls | Partial | Prevention is snapped when an event begins, locks afterward, and affects visuals/panel/cost. Cross-disaster relationships lock too: the smoke alarm + extinguisher card becomes disabled when either the stove or power strip is triggered and stays locked until Reset house. The simulator presents each choice as a compact, high-contrast protection card with a visible checkbox, readable short label, and Active/Off/Locked state. The cards remain in one horizontally scrollable toolbar row so the house scene keeps its vertical space; the introductory setup provides the full risk-and-benefit explanation. Production build passes; the revised control clarity and lock states need manual browser verification. |
| Savings-pot game | Partial | Replaces the former Home Risk Score. The player starts with a $50,000 savings pot shown in a top-right meter (green → amber → red as it drains). Each resolved disaster subtracts its uninsured repair estimate. Selecting a protection subtracts its cost (roof $4,000, alarm $200, leak $800, tree $1,500, AFCI $1,200); unselecting it refunds that full cost. A protection the pot can't cover shows “Can't afford” and is disabled. Reset house clears the wallet, protection selections, outcomes, and tallies for a fresh $50,000 run. The $50k pot is smaller than the $84k total unprotected damage, so a reckless run cannot finish solvent. Testing all five risks while still solvent opens a one-time “Your savings survived!” win panel (savings left + damage avoided); damage avoided is the $84k unprotected baseline minus resolved repair damage and excludes protection purchase prices. Dropping to $0 or below opens a one-time “Wiped out!” panel (total damage taken + negative balance). Both wait for the open result panel to be acknowledged. Production build and direct store math checks pass, including $72,500 avoided with all protections; manual browser verification remains. |
| Reset for repeat demos | Done | Clears triggered disasters, damage, prevention selections, savings purchases/progress, and stale disaster-hover indicators, then restores the full $50,000 savings pot. |
| Sound effects | Partial | Hail, fire, fire-loop, and tree assets are connected; the tree-fall cue is suppressed when the hazardous tree has already been removed, and clicking that stump as the first tested risk leaves the calm bird ambience playing. Water loss and the electrical arc use seeded procedural effects with prevention-specific durations. Smoke-alarm demand is tracked independently for the kitchen and electrical fires, so one event ending cannot silence another fire that still requires the shared detector. The referenced success cue is still absent. |
| First-load introduction | Partial | The opening risk-lab briefing now has two deliberate steps: an overview of the learning goal and house navigation, followed by a prevention setup that names every upgrade, the risk it protects, and its practical benefit. The overview includes a prominent note that the demo is best experienced on desktop with sound on. A persistent “How to play” control reopens the briefing without changing the simulation. Production build passes; manual visual smoke testing remains. |
| Title/intro polish | Partial | The two-step first-load experience, desktop-and-sound note, and protection-card language are in place; a final at-screen-size visual pass remains. |

**Explicitly out of scope:** real-world physics, LLM NPCs, walking character,
additional room-specific disasters beyond the water and electrical losses, and mobile layout.

## Current experience

- The house reads as a roomy three-bedroom, one-bath dollhouse: the existing
  open kitchen/living core is joined by a wider color-zoned bedroom and bathroom
  wing through a real framed opening and broad central hall, under its own lower
  gable. Every bedroom and the shared full bath has an open door off the hall.
  Deeper room shells keep those door swings clear of the beds.
  The living room now extends across a larger rug toward a west-wall TV, with
  the sofa and coffee table turned away from the kitchen work zone.
  Exterior walls use a smooth whole-house cutaway; interior partitions and doors
  add two-sided angle fading across pitch and zoom. Both roof sections fade separately,
  with soft lighting, shadows, sky/fog, and a constrained camera.
- Roof, stove, bathroom supply line, overloaded bedroom power strip, and backyard tree are the disaster triggers. Controls are
  discoverable and stop responding once their event has fired.
- Hail resolves roof dents and darkening in a smooth staggered sequence with a
  brief, restrained impact rattle, then
  leaves damaged shingle edges, a growing ring of settled ice, and visible
  low-poly drifts around the house;
  impact-resistant roofing leaves a much smaller visual aftermath.
- Fire has a staged burst that moves from the stove through the counter, TV,
  fridge, living area, dining nook, and east wall, with flickering flames, smoke,
  sparks, light, a dense overlapping trail of floor char, wall scorch, and timed object
  charring, including persistent soot and a warped burner on the stove. Smoke detectors plus an extinguisher keep it at the stove: an alarm
  sounds until the extinguisher's foam sweep puts out the flame, then both the
  extinguisher and active fire fade away.
- The bathroom supply-line loss erupts from the vanity shutoff and keeps throwing
  dense jets and arcing droplets into the room until reset. Its geometry is
  prepared before interaction, so the anchored jets and first pool begin on the
  first frame after the click. An immediate dark pool eases into the open aisle,
  then three overlapping water volumes spread with staggered, settling motion.
  Their opaque, shallow irregular surfaces sit flush with the teal flooring. Damp
  drywall remains behind the sink. A visible sensor and automatic shutoff
  contain it to a short spray and a small puddle.
- The primary-bedroom power strip is visibly overloaded by a connected TV,
  game console, phone charger, floor lamp, and portable heater. Its arc-fault
  sequence flashes and crackles through the cords, sequentially pops the
  connected devices, races into the wall circuit, and ignites a bounded bedroom
  fire with a broad strip-to-device scorch trail. Enabling AFCI breakers adds a
  protected panel that trips almost immediately, sharply reducing the
  spectacle, procedural audio, damage, and panel cost. Selecting smoke detectors
  without AFCI protection also sounds an alert from the first electrical flame onward.
  If a protected kitchen-fire sequence runs while that electrical fire is still
  active, extinguishing the stove fire does not silence the electrical-fire alarm.
- The fallen tree has an anticipatory windup, hard roof-contact overshoot and
  lateral wobble, an explosive contact-timed shake with mixed shingle-and-leaf
  debris, dust, and a brief warm flash, plus a persistent roof hole, broken edges, and hanging interior ceiling
  aftermath. Removing the identified hazardous tree creates a stump instead.
- Each completed event opens a financial snapshot: the full uninsured exposure, potential insurer payment, and the $1,000 demo deductible. Its high-contrast, pulsing “Got it” button must be acknowledged before another disaster can be selected; camera orbit and zoom remain available in the meantime.
  A reduced outcome gets a “Prevention paid off!” badge and the estimated damage
  avoided; a prevented tree event gets “Risk eliminated!”, its full avoided-damage
  amount, and a $0 outcome.
- Each run is framed as a money game: keep a $50,000 savings pot alive
  while testing all five risks. The top-right savings meter drains by each
  disaster's uninsured repair cost and by each selected protection's price;
  unselecting a protection refunds it. Reset house starts a new run with the
  full pot and no protections selected. A full
  loss ends with a nudge to buy the named protection (with its price) and
  re-run. Testing all five risks while solvent opens a one-time “Your savings
  survived!” panel; going broke opens a one-time “Wiped out!” panel. Both offer
  Start over, which begins another fresh $50,000 run.

## Prevention model

| Prevention | Mitigates | Result |
|---|---|---|
| Impact-resistant roofing | Hailstorm | Fewer hail impacts, lighter roof scuffs, and a lower claim cost. |
| Smoke detectors + extinguisher | Kitchen fire; alerts on electrical fire | A smoke alarm sounds while an extinguisher sweeps foam across the stove, then the flame is out with smaller scorch and a lower claim cost. Without AFCI protection, it begins with the first electrical flame and continues without changing that loss. |
| Leak sensor + automatic shutoff | Bathroom water loss | Shorter spray, a small contained puddle, and a lower claim cost. |
| Remove hazardous tree | Fallen tree | Replaces the tree with a stump and eliminates that specific strike and claim. |
| AFCI breakers + electrical inspection | Electrical arc fire | Trips the overloaded bedroom circuit after a brief spark, limits scorch and connected-device damage, and lowers the claim cost. |

Reset clears prevention choices so every savings run starts from the same
baseline. Enabling a prevention deducts its cost from the savings pot, and
disabling it refunds the full cost. A prevention locks as soon as any associated disaster
starts, so it cannot be applied after the fact. Because smoke detectors also
alert on electrical fires, that control locks after either the stove or power
strip is triggered and unlocks on reset. Reset house and Start over both clear
the run's purchases and refill the pot.

## Current priorities / known gaps

1. Supply and test the missing `success.mp3` prevention cue.
2. Manually verify the overloaded primary-bedroom power strip at the intended
   demo screen size: all five occupied sockets and their device cords, clear
   hover/click affordance on the strip only, unobstructed room circulation,
   full device-to-device arc/flame/scorch/debris sequence, protected breaker trip, device shutdown,
   procedural audio, result timing, reset, and comparison costs.
3. Manually verify the enlarged 3BR/1BA wing at the intended demo screen size,
   including the deeper bedroom proportions, all four room doors and their swing clearances, the unobstructed hall,
   single-bath layout, partition/perimeter joins, pop-free exterior and interior
   wall/roof fades at all angles and pitches, lower-gable seam/alignment, camera framing, and
   bathroom-pipe access.
4. Do a final visual pass on the title, two-step briefing, and prevention cards at the intended demo screen size.
5. Run the manual demo flow below on the target browser before presenting.

## Architecture

```text
src/
├── App.jsx                    # Canvas and HTML overlay split
├── data/disasters.js           # All content, costs, timings, prevention links
├── store/useGameStore.js       # Zustand game state and transitions
├── scene/
│   ├── Scene.jsx               # Lighting, orbit controls, keyboard camera input
│   ├── House.jsx               # Custom shell, cutaway, interior aftermath
│   ├── BackyardTree.jsx        # Standing/clickable tree and its fall
│   ├── InteriorModel.jsx       # Reusable GLB loading and burn variants
│   └── useClickable.js         # Shared pointer/hover behavior
├── disasters/                  # Hail, fire, water-loss, and electrical animation components
├── hooks/useGameAudio.js       # Trigger/prevention audio wiring
└── ui/                         # Toolbar, savings meter, game-end panel, and information panel
```

## Visual direction

- Favor chunky, faceted silhouettes, warm colors, soft atmospheric depth, and
  readable shapes over realism.
- Choreograph every disaster: anticipation, fast impact, brief settling,
  particles/debris, lighting/material response, then persistent aftermath.
- Time the strongest shake, damage swap, debris, and sound to the contact beat.
- Keep cutaway behavior polished: faded exterior parts must not obscure the
  interior or intercept interior clicks.
- Make prevention visible in the scene, not merely in the panel price.
- Prioritize demo reliability: clean reset, readable default camera, and
  repeatable outcomes.

## Verification checklist

- [x] `npm run build` passes (last verified against the current working tree).
- [ ] On a fresh load, review both risk-lab briefing panels: confirm the first
  explains the goal and house navigation, includes the desktop-with-sound recommendation, and the second clearly names every prevention choice, its protected risk and benefit. Start the test, confirm each simulator protection card has a large visible checkbox, named protected risk, and correct on/off state; trigger one matching risk to verify its card locks. Reopen the briefing with “How to play” without changing the simulation.
- [ ] With sound enabled, click roof, stove, bathroom pipe, power strip, and tree
  and confirm one correct sound each. Confirm the protected electrical crackle
  ends with the breaker trip while the full burst continues through its authored
  sequence, and that smoke detectors without AFCI protection begin the smoke
  alarm with the first electrical flame, not the initial arc. The prevention success cue remains
  blocked by the missing audio asset listed above.
- [ ] With smoke detectors enabled and AFCI disabled, trigger the power strip,
  confirm the smoke alarm + extinguisher card immediately reads Locked and
  cannot be changed, then acknowledge its result and trigger the stove.
  Confirm the card remains locked and the alarm continues
  after the extinguisher puts out the stove fire because the unprotected
  electrical fire is still active; confirm Reset house silences it.
- [ ] Click roof, observe hail stopping at both roof surfaces (including while
  the cutaway reveals the rooms) and damage, then reset and repeat with
  impact-resistant roofing; verify both visual damage and panel cost shrink.
- [ ] For each disaster outcome, verify the result panel clearly distinguishes
  uninsured out-of-pocket exposure, potential insurer payment, and the $1,000
  demo deductible; confirm prevention and eliminated-risk variants show the
  corresponding lower or $0 values and the correct avoided-damage amount. Confirm
  the old full-loss savings nudge is absent and the tip above “Got it” explains
  that acknowledging the panel unlocks another disaster. At a
  narrow or short viewport, confirm the panel scrolls internally and “Got it”
  remains reachable.
- [ ] Trigger any disaster and, before pressing “Got it,” verify the other
  disaster objects cannot be selected but mouse and keyboard camera movement still work; confirm only its matching toolbar target name is struck through, then acknowledge the panel and verify another unfired object can trigger. Reset and confirm every target name is restored.
- [ ] Click stove, repeat with smoke detectors + extinguisher; verify the fire
  cue starts with the first visible stove burst and the smoke alarm plays only
  until the extinguisher's foam sweep puts out the stove flame,
  then the extinguisher fades, fire spread and panel cost shrink, and the raised
  kitchen-floor char plus the stove's soot and warped burner remain visible from
  low, middle, and overhead camera pitches.
- [ ] Verify the west-wall TV is clearly separated from the stove, the sofa
  faces it across the enlarged rug, and the unprotected fire still reaches the
  TV at the authored beat while prevention contains the event at the stove.
- [ ] Click the bathroom supply line, then reset and repeat with leak sensor +
  automatic shutoff; verify the unprotected burst clearly originates below the
  vanity with no perceptible click-to-action pause or initial full-size puddle
  flash, keeps spraying until reset, and smoothly builds four connected,
  floor-flush water pools: a dark puddle in the unobstructed aisle within the first second,
  followed by three overlapping, irregular floor-flush pools that remain visible
  against the teal floor after the panel appears, without bright circular outlines or floating. Confirm the protected spray duration,
  density, sound, puddle size, damp-wall aftermath, panel cost, and estimated
  avoided damage all shrink.
- [ ] Click the overloaded primary-bedroom power strip, then reset and repeat
  with AFCI breakers + electrical inspection. Confirm five visibly occupied
  sockets feed the TV, console, phone charger, floor lamp, and portable heater;
  the strip alone owns the pointer/halo/click; the full event produces staged
  blue-white arcs, sequential device pops, wall-circuit tracking, bounded
  cord-path flames, multi-source smoke, connected-device shutdown, melted
  debris, and a broad persistent floor/wall scorch trail; and the protected breaker
  trips at the short beat with only a small singe, shorter audio, lower panel
  cost, and the correct estimated damage avoided.
- [ ] Inspect the furnished rooms from the default and overhead angles: verify
  the bathroom vanity sits against the south wall with clear toilet access, its
  compact countertop handle, rectangular basin, and rectangular below-sink shutoff
  read clearly without a pipe intersecting the vanity; verify the added
  mirror/storage/towels/mat/hamper read clearly, the bathtub is clear of
  fixtures, each secondary-bedroom bed and dresser
  sits aligned against its respective wall, the primary bed faces its wall-centered
  dresser and TV, and the portable heater is visibly separated from the bed without the connected electrical setup blocking the door or
  circulation, the sink remains close to the
  stove, and the taller living-room lamp and plant remain within the room
  silhouette.
- [ ] Click tree and verify its hard roof-contact shake, lateral settling wobble,
  mixed shingle-and-leaf debris, dust plume, warm impact flash, and roof opening;
  then repeat after removing the hazardous tree and verify stump, silent
  eliminated-risk result, “Risk eliminated!”, and $0 cost. In a fresh run with
  no earlier disasters, confirm clicking the stump does not interrupt the bird
  ambience.
- [ ] Orbit above and around the house; verify the cutaway keeps all three
  bedrooms and the shared bathroom readable, the lower gable fully covers the wing when
  closed, and the stove, bathroom pipe, and bedroom power strip remain clickable when the roof fades.
- [ ] Orbit slowly across every cardinal and diagonal angle at low, middle, and
  overhead pitches; verify core and wing walls fade smoothly together without
  popping, flickering, phantom shadows, or intercepting clicks while transparent.
- [ ] Verify all three bedrooms and the bathroom have visible framed doors,
  each wall reaches full partition height with solid infill above its doorway,
  each leaf swings into its room without touching a bed or blocking the hall,
  and each door fades with its adjoining interior partition across orbit angle,
  pitch, and zoom.
- [ ] Orbit slowly around the lower gable and its junction with the original
  roof; verify both roofs begin and finish fading together, and neither surface
  pops, sorts through the other, changes the interior lighting abruptly, or
  disappears except through the authored cutaway fade.
- [ ] Follow the central hall from the original living space into the wing;
  verify the framed opening is oriented in the east-wall plane, every room
  opening reaches the hall, and no exterior corner
  or wall run has a visible gap.
- [ ] Confirm the tree still strikes the original north-west roof opening and
  that none of the bedroom-wing geometry changes its fall or impact debris.
- [ ] Reset after each flow; verify damage and prevention choices clear, savings
  return to $50,000, and all outcome/tally state starts fresh. Select and then
  unselect each protection and verify its cost is deducted and fully refunded.
  Complete a fully protected run and verify the victory panel reports $72,500
  in damage avoided and $30,800 in savings left.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Node 18+. Stack: Vite, React 18, @react-three/fiber, @react-three/drei,
Three.js, and Zustand.

## Demo script (3–4 min)

1. Orbit the idle house once and call out the roomy 3BR/1BA cutaway interior.
2. Click the roof, watch hail strike, then explain the coverage and cost panel.
3. Reset, enable impact-resistant roofing, and click the roof again; compare
   the reduced spectacle and lower cost.
4. Reset, enable Remove hazardous tree, and click the stump; point out that the
   strike and claim are eliminated.
5. Reset and click the bathroom supply line; repeat with the shutoff to show a
   common interior loss beyond fire.
6. Reset and click the overloaded power strip; repeat with AFCI protection to
   show the breaker trip and lower connected-device damage.
7. Reset and click the stove and tree for the two most dramatic damage beats.
8. Point to the savings meter — how much the pot drained per loss and how
   little each protection cost by comparison — and close with customers, new
   agents, and community events as the intended audiences. Let the “Your
   savings survived!” or “Wiped out!” end panel land the final message.
9. End on Reset house (or Start over for a fresh pot) for the next walk-up demo.
