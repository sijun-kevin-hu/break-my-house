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
| Sims-style cutaway | Partial | Exterior walls, interior partitions, and doors use smooth angle/pitch/zoom opacity. Both roof sections use the same pitch/zoom opacity function; the wing roof now spans the full shared-wall run and tucks beneath the original eave, while its materials disable depth writes and omit a thresholded shadow. Production build passes; manual orbit verification remains. |
| Roomy 3BR/1BA furnished interior | Partial | The wing is now deeper, giving every bedroom more floor area. Beds and wardrobes sit farther from the hall, while shorter inward door swings preserve visible leaves without entering bed footprints. In the original core, the TV now sits on the west wall opposite a rotated sofa, creating a larger living zone with clear separation from the stove. The shared full bathroom remains in the east bay. Production build passes; room scale, furniture clearance, circulation, wall joins, roof alignment, and default framing need manual visual verification. |
| Hailstorm | Partial | Dense deterministic hail, roof strike flashes/chips, smoothly staggered roof dents/color damage, growing ground accumulation that becomes visible drifts, impact light/shake, and persistent full vs. reduced damage. Production build passes; the expanded animation and pileup still need manual visual verification. |
| Kitchen fire | Partial | Stove-origin fire advances through counter, TV, fridge, living, dining, and the east wall; it leaves a dense, staged trail of overlapping floor char. The aftermath now uses shallow raised burn geometry whose lower edge clears both the slab and rug, while prevention keeps the spectacle and damage contained. Production build passes; the expanded char path still needs manual visual verification. |
| Bathroom water loss | Partial | Clicking the exposed bathroom supply line starts a deterministic spray with a seeded water-burst sound, expanding puddles, and persistent damp-wall aftermath. A visible leak sensor + automatic shutoff sharply limits the spray, sound, and standing water. Production build and store-flow checks pass; the effect needs manual visual/audio verification. |
| Fallen tree | Done | Clickable oak topples onto the roof with impact debris and a roof opening; removing the hazardous tree swaps it for a stump and prevents the strike. |
| Object-triggered disasters | Done | Roof → hail, stove → fire, bathroom supply line → water loss, tree/stump → tree risk. Toolbar contains prevention controls and reset only; once one starts, all disaster targets stay locked until the result panel’s “Got it” is pressed, while camera movement remains available. |
| Discoverable interactions | Done | Live triggers use hover highlights, idle affordance, a pointer cursor, and a non-intercepting 3D pulse-ring halo; fired triggers stop reading as interactive. |
| Insurance information panel | Partial | Appears shortly after the event's key beat; shows a financial snapshot: uninsured out-of-pocket exposure, potential insurer payment, and the $1,000 demo deductible. Reduced and eliminated outcomes also quantify estimated damage avoided against the unprotected baseline. It notes that policy terms, limits, and wind/hail deductibles may differ. The panel becomes a viewport-bounded scroller with a sticky acknowledgement action on narrow or short windows. Production build passes; the revised comparison layout needs manual visual verification. |
| Prevention and risk score | Done | Prevention is snapped when an event begins, locks afterward, affects visuals/panel/cost, and feeds the risk score. |
| Reset for repeat demos | Done | Clears triggered disasters, damage, and stale disaster-hover indicators while keeping prevention selections for easy comparison. |
| Sound effects | Partial | Hail, fire, fire-loop, and tree assets are connected, and water loss uses a seeded procedural burst. The referenced success cue is still absent. |
| First-load introduction | Partial | An opening risk-lab panel explains the learning goal and identifies the roof, stove, bathroom pipe, tree, camera, prevention, and reset interactions before the player begins. A persistent “How to play” control reopens it without changing the simulation. Production build passes; manual visual smoke testing remains. |
| Title/intro polish | Partial | The first-load experience is now purposeful; a final at-screen-size visual pass remains. |

**Explicitly out of scope:** real-world physics, LLM NPCs, walking character,
further room-specific disasters beyond the bathroom water loss, and mobile layout.

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
- Roof, stove, bathroom supply line, and backyard tree are the disaster triggers. Controls are
  discoverable and stop responding once their event has fired.
- Hail resolves roof dents and darkening in a smooth staggered sequence, then
  leaves damaged shingle edges, a growing ring of settled ice, and visible
  low-poly drifts around the house;
  impact-resistant roofing leaves a much smaller visual aftermath.
- Fire has a staged burst that moves from the stove through the counter, TV,
  fridge, living area, dining nook, and east wall, with flickering flames, smoke,
  sparks, light, a dense overlapping trail of floor char, wall scorch, and timed object
  charring. Smoke detectors plus an extinguisher keep it at the stove and stop
  its wider spread.
- The bathroom supply-line loss sprays into the hall bath, grows into connected
  floor puddles, and leaves damp drywall. A visible sensor and automatic shutoff
  contain it to a short spray and a small puddle.
- The fallen tree has an anticipatory windup, a contact-timed shake/debris
  burst, persistent roof hole, broken edges, and hanging interior ceiling
  aftermath. Removing the identified hazardous tree creates a stump instead.
- Each completed event opens a financial snapshot: the full uninsured exposure, potential insurer payment, and the $1,000 demo deductible. Its high-contrast, pulsing “Got it” button must be acknowledged before another disaster can be selected; camera orbit and zoom remain available in the meantime.
  A reduced outcome gets a “Prevention paid off!” badge and the estimated damage
  avoided; a prevented tree event gets “Risk eliminated!”, its full avoided-damage
  amount, and a $0 outcome.

## Prevention model

| Prevention | Mitigates | Result |
|---|---|---|
| Impact-resistant roofing | Hailstorm | Fewer hail impacts, lighter roof scuffs, and a lower claim cost. |
| Smoke detectors + extinguisher | Kitchen fire | Smaller fire, less spread/scorching, and a lower claim cost. |
| Leak sensor + automatic shutoff | Bathroom water loss | Shorter spray, a small contained puddle, and a lower claim cost. |
| Remove hazardous tree | Fallen tree | Replaces the tree with a stump and eliminates that specific strike and claim. |

Prevention choices persist across reset so a presenter can show an unprotected
result, reset, enable one prevention, and repeat the same event. A prevention
locks as soon as its associated disaster starts, so it cannot be applied after
the fact.

## Current priorities / known gaps

1. Supply and test the missing `success.mp3` prevention cue.
2. Manually verify the enlarged 3BR/1BA wing at the intended demo screen size,
   including the deeper bedroom proportions, all four room doors and their swing clearances, the unobstructed hall,
   single-bath layout, partition/perimeter joins, pop-free exterior and interior
   wall/roof fades at all angles and pitches, lower-gable seam/alignment, camera framing, and
   bathroom-pipe access.
3. Do a final visual pass on the title and UI at the intended demo screen size.
4. Run the manual demo flow below on the target browser before presenting.

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
├── disasters/                  # Hail, fire, and water-loss animation components
├── hooks/useGameAudio.js       # Trigger/prevention audio wiring
└── ui/                         # Toolbar, risk score, and information panel
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
- [ ] On a fresh load, review the risk-lab introduction; start it and confirm the
  roof, stove, bathroom pipe, tree, camera, prevention, and reset controls match the guidance;
  then reopen it with “How to play” without changing the simulation.
- [ ] With sound enabled, click roof, stove, bathroom pipe, and tree and confirm
  one correct sound each. The prevention success cue remains blocked by the
  missing audio asset listed above.
- [ ] Click roof, observe hail and damage, then reset and repeat with
  impact-resistant roofing; verify both visual damage and panel cost shrink.
- [ ] For each disaster outcome, verify the result panel clearly distinguishes
  uninsured out-of-pocket exposure, potential insurer payment, and the $1,000
  demo deductible; confirm prevention and eliminated-risk variants show the
  corresponding lower or $0 values and the correct avoided-damage amount. At a
  narrow or short viewport, confirm the panel scrolls internally and “Got it”
  remains reachable.
- [ ] Trigger any disaster and, before pressing “Got it,” verify the other
  disaster objects cannot be selected but mouse and keyboard camera movement still work; then acknowledge the panel and verify another unfired object can trigger.
- [ ] Click stove, repeat with smoke detectors + extinguisher; verify fire
  spread and panel cost shrink; confirm the raised kitchen-floor char remains
  visible above the slab and rug from low, middle, and overhead camera pitches.
- [ ] Verify the west-wall TV is clearly separated from the stove, the sofa
  faces it across the enlarged rug, and the unprotected fire still reaches the
  TV at the authored beat while prevention contains the event at the stove.
- [ ] Click the bathroom supply line, then reset and repeat with leak sensor +
  automatic shutoff; verify spray duration, puddle size, damp-wall aftermath,
  panel cost, and estimated avoided damage all shrink.
- [ ] Click tree, repeat after removing the hazardous tree; verify stump,
  “Risk eliminated!”, and $0 cost.
- [ ] Orbit above and around the house; verify the cutaway keeps all three
  bedrooms and the shared bathroom readable, the lower gable fully covers the wing when
  closed, and the stove and bathroom pipe remain clickable when the roof fades.
- [ ] Orbit slowly across every cardinal and diagonal angle at low, middle, and
  overhead pitches; verify core and wing walls fade smoothly together without
  popping, flickering, phantom shadows, or intercepting clicks while transparent.
- [ ] Verify all three bedrooms and the bathroom have visible framed doors,
  each leaf swings into its room without touching a bed or blocking the hall, and each door fades
  with its adjoining interior partition across orbit angle, pitch, and zoom.
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
- [ ] Reset after each flow; verify damage clears and prevention choices remain.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Node 18+. Stack: Vite, React 18, @react-three/fiber, @react-three/drei,
Three.js, and Zustand.

## Demo script (2–3 min)

1. Orbit the idle house once and call out the roomy 3BR/1BA cutaway interior.
2. Click the roof, watch hail strike, then explain the coverage and cost panel.
3. Enable impact-resistant roofing, reset, and click the roof again; compare
   the reduced spectacle and lower cost.
4. Enable Remove hazardous tree, reset, and click the stump; point out that the
   strike and claim are eliminated.
5. Reset and click the bathroom supply line; repeat with the shutoff to show a
   common interior loss beyond fire.
6. Reset and click the stove and tree for the two most dramatic damage beats.
7. Point to the risk score and close with customers, new agents, and community
   events as the intended audiences.
8. End on Reset house for the next walk-up demo.
