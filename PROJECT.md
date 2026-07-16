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
| Sims-style cutaway | Done | Near walls fade out; the roof also fades when the view opens the dollhouse, keeping the furnished interior legible. |
| Furnished interior | Done | Quaternius GLB props supply kitchen, living, dining, storage, lamps, and plants while the custom shell owns cutaway and damage behavior. |
| Hailstorm | Partial | Dense deterministic hail, roof strike flashes/chips, smoothly staggered roof dents/color damage, growing ground accumulation that becomes visible drifts, impact light/shake, and persistent full vs. reduced damage. Production build passes; the expanded animation and pileup still need manual visual verification. |
| Kitchen fire | Partial | Stove-origin fire advances through counter, TV, fridge, living, dining, and storage targets; it leaves a dense, staged trail of overlapping floor char, while prevention keeps the spectacle and damage contained. Production build passes; the expanded char path still needs manual visual verification. |
| Fallen tree | Done | Clickable oak topples onto the roof with impact debris and a roof opening; removing the hazardous tree swaps it for a stump and prevents the strike. |
| Object-triggered disasters | Done | Roof → hail, stove → fire, tree/stump → tree risk. Toolbar contains prevention controls and reset only; once one starts, all disaster targets stay locked until the result panel’s “Got it” is pressed, while camera movement remains available. |
| Discoverable interactions | Done | Live triggers use hover highlights/idle affordance and a pointer cursor; fired triggers stop reading as interactive. |
| Insurance information panel | Partial | Appears shortly after the event's key beat; shows a financial snapshot: uninsured out-of-pocket exposure, potential insurer payment, and the $1,000 demo deductible. Reduced and eliminated outcomes also quantify estimated damage avoided against the unprotected baseline. It notes that policy terms, limits, and wind/hail deductibles may differ. Production build passes; the revised comparison layout needs manual visual verification. |
| Prevention and risk score | Done | Prevention is snapped when an event begins, locks afterward, affects visuals/panel/cost, and feeds the risk score. |
| Reset for repeat demos | Done | Clears triggered disasters and damage while keeping prevention selections for easy comparison. |
| Sound effects | Partial | Audio hook is connected, but the shipped audio directory currently contains only `fire.mp3` and `tree.mp3`; it still needs `hail.mp3`, `success.mp3`, and a filename match for `tree-crash.mp3`. |
| First-load introduction | Partial | An opening risk-lab panel explains the learning goal and shows a left-aligned object, camera, zoom, prevention, and reset checklist before the player begins. A persistent “How to play” control reopens it without changing the simulation. Production build passes; manual visual smoke testing remains. |
| Title/intro polish | Partial | The first-load experience is now purposeful; a final at-screen-size visual pass remains. |

**Explicitly out of scope:** real-world physics, LLM NPCs, walking character,
additional disasters, and mobile layout.

## Current experience

- The house is a furnished dollhouse with soft lighting, shadows, sky/fog, and
  a camera constrained for reliable demos.
- Roof, stove, and backyard tree are the only disaster triggers. Controls are
  discoverable and stop responding once their event has fired.
- Hail resolves roof dents and darkening in a smooth staggered sequence, then
  leaves damaged shingle edges, a growing ring of settled ice, and visible
  low-poly drifts around the house;
  impact-resistant roofing leaves a much smaller visual aftermath.
- Fire has a staged burst that moves from the stove through the counter, TV,
  fridge, living area, dining nook, and storage, with flickering flames, smoke,
  sparks, light, a dense overlapping trail of floor char, wall scorch, and timed object
  charring. Smoke detectors plus an extinguisher keep it at the stove and stop
  its wider spread.
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
| Remove hazardous tree | Fallen tree | Replaces the tree with a stump and eliminates that specific strike and claim. |

Prevention choices persist across reset so a presenter can show an unprotected
result, reset, enable one prevention, and repeat the same event. A prevention
locks as soon as its associated disaster starts, so it cannot be applied after
the fact.

## Current priorities / known gaps

1. Supply and test the missing audio assets. Either rename `public/audio/tree.mp3`
   to `tree-crash.mp3` or change the hook to the actual filename; add hail and
   success files.
2. Do a final visual pass on the title and UI at the intended demo screen size.
3. Run the manual demo flow below on the target browser before presenting.

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
├── disasters/                  # Hail and fire animation components
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
  roof, stove, tree, camera, prevention, and reset controls match the guidance;
  then reopen it with “How to play” without changing the simulation.
- [ ] With sound enabled, click roof, stove, and tree and confirm one correct
  sound each; enable a prevention and confirm the success cue. Blocked by the
  missing/mismatched audio files listed above.
- [ ] Click roof, observe hail and damage, then reset and repeat with
  impact-resistant roofing; verify both visual damage and panel cost shrink.
- [ ] For each disaster outcome, verify the result panel clearly distinguishes
  uninsured out-of-pocket exposure, potential insurer payment, and the $1,000
  demo deductible; confirm prevention and eliminated-risk variants show the
  corresponding lower or $0 values and the correct avoided-damage amount.
- [ ] Trigger any disaster and, before pressing “Got it,” verify the other
  disaster objects cannot be selected but mouse and keyboard camera movement still work; then acknowledge the panel and verify another unfired object can trigger.
- [ ] Click stove, repeat with smoke detectors + extinguisher; verify fire
  spread and panel cost shrink.
- [ ] Click tree, repeat after removing the hazardous tree; verify stump,
  “Risk eliminated!”, and $0 cost.
- [ ] Orbit above and around the house; verify the cutaway keeps the rooms
  visible and the stove remains clickable.
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

1. Orbit the idle house once and call out the furnished cutaway interior.
2. Click the roof, watch hail strike, then explain the coverage and cost panel.
3. Enable impact-resistant roofing, reset, and click the roof again; compare
   the reduced spectacle and lower cost.
4. Enable Remove hazardous tree, reset, and click the stump; point out that the
   strike and claim are eliminated.
5. Reset and click the stove and tree for the two most dramatic damage beats.
6. Point to the risk score and close with customers, new agents, and community
   events as the intended audiences.
7. End on Reset house for the next walk-up demo.
