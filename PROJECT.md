# Break My House 🏠🌪️

Interactive 3D cartoon risk-education game/simulation. Summon disasters on a house, see what insurance coverage applies, and learn how prevention changes the outcome.

**Hackday pitch:** insurance education that people actually want to play with — works for customer education, new-agent training, and community outreach.

---

## Requirements (12-hour scope — LOCKED)

- [x] 3D cartoon house scene with orbit camera
- [ ] **Sims-style cutaway** — see inside the house: walls/roof between the camera and the interior fade or hide so rooms, furniture, and interior objects are always visible as the camera orbits
- [ ] **Furnished interior** — enough props (roof, kitchen stove, backyard tree, etc.) to host the disasters and read as a real home
- [x] 3 disasters: hailstorm, kitchen fire, fallen tree
- [ ] **Object-triggered disasters** — disasters fire by clicking the relevant object in the scene, not UI buttons (click the roof → hail, click the stove → fire, click the tree → it falls)
- [ ] Clickable objects are discoverable — hover highlight / cursor change / subtle idle affordance so the player knows what's interactive
- [x] Disaster → animation → damage state → info panel loop
- [x] Info panel: what happened / coverage / typical cost / prevention tip
- [x] Prevention controls visibly reduce the relevant damage + cost shown
- [x] Home Risk Score (improves as preventions applied)
- [x] Reset house button (critical for repeat demos)
- [ ] Sound effects (hail patter, fire crackle, tree crash) — freesound.org
- [x] Add selected low-poly GLB interior props (Quaternius) while retaining the custom interactive house shell
- [ ] Title/intro screen polish

**Explicitly out of scope:** physics, LLM NPC, walking character, more than 3 disasters, mobile.
**Note:** the toolbar no longer triggers disasters. Triggering is object-click only; the toolbar keeps only prevention toggles + Reset house.

## Progress

| Milestone | Target | Status |
|---|---|---|
| H0–2: Scene + house + orbit controls | Hour 2 | ✅ Done (scaffold) |
| H2–5: Hail end-to-end loop | Hour 5 | ✅ Done (scaffold) |
| H5–7: Info panel + risk score + preventions | Hour 7 | ✅ Done (scaffold) |
| H7–10: Fire + fallen tree | Hour 10 | ✅ Done (scaffold) |
| H10–12: Sound, GLB assets, polish, demo runs | Hour 12 | 🔲 Not started |

## Current functionality

- **Idle scene:** custom low-poly house with Quaternius GLB interior props, yard, bushes, sky, shadows, orbit camera (pan disabled, angle clamped)
- **Sims-style cutaway** *(to build):* geometry between the camera and the interior fades/hides so the furnished inside stays visible from any orbit angle
- **Object-click triggering** *(to build):* clicking a scene object fires its disaster — roof → hail, stove → fire, backyard tree → fall; hover highlight tells the player what's clickable
- **Hail:** 250 instanced hailstones fall over the yard for 4s; roof darkens/dents after
- **Fire:** flickering flame cones + orange light + rising smoke at kitchen corner; walls char after
- **Fallen tree:** backyard oak winds up, crashes into the roof, removes a roof section, throws bright shingles/debris, and leaves a ceiling panel dangling inside; stays fallen until reset
- **Camera shake:** subtle during general disaster activity, strong and contact-timed for major impacts
- **Prevention toggles** (toolbar): the selected prevention reduces the relevant damage, and the panel shows the reduced cost + "Prevention paid off!" badge
- **Risk score** (top right): 100 minus per-disaster weight for each un-prevented risk; color-coded green/amber/red
- **Info panel** (right side): slides in after each disaster with education content
- **Reset house:** clears all damage, keeps prevention toggles

## Preventive logic

This is an educational game/simulation, not just a destruction sandbox: each
control teaches a specific mitigation and visibly changes the outcome.

| Prevention control | Mitigates | Result |
|---|---|---|
| Impact-resistant roofing | Hailstorm | Reduced roof dents/scuffs and lower hail claim cost. |
| Smoke detectors + extinguisher | Kitchen fire | Reduced fire damage and lower fire claim cost. |
| Trim overhanging branches | Fallen tree | Reduced tree-impact damage and lower tree claim cost. |
| Reinforced roof framing | Fallen tree | Reduced tree-impact damage and lower tree claim cost. |

For a fallen tree, either trimming or reinforced roof framing produces the
reduced outcome; they do not stack yet. Impact-resistant shingles are
intentionally hail-only — they do not stop a heavy falling tree. Preventive
state is retained when the house is reset so players can compare outcomes.

## Visual direction

- **Playful low-poly cartoon:** chunky silhouettes, faceted geometry, warm colors, soft atmospheric depth, and readable forms take priority over realism.
- **Dramatic, choreographed disasters:** each event should have anticipation, a fast impact, a brief overshoot or settling motion, particles/debris, lighting or material response, and a persistent aftermath. Effects should feel spectacular in a short demo while remaining deterministic—use authored animation rather than physics.
- **Impact-timed feedback:** synchronize the strongest camera shake, debris burst, damage swap, and sound cue to the moment of contact. Avoid continuous maximum-intensity shake.
- **Damage readable at a glance:** prefer localized silhouette and geometry changes—missing/crushed sections, bright broken edges, char, dents, interior debris—over a subtle whole-object color tint.
- **Cutaway stays polished:** exterior roof/wall damage fades with its parent structure and stops casting shadows or intercepting clicks when hidden. Interior aftermath, such as a dangling ceiling piece, remains visible to reward opening the dollhouse view.
- **Prevention changes the spectacle:** mitigated outcomes should visibly preserve more of the house, use fewer particles, and leave smaller damage—not merely show a lower number in the panel.
- **Demo reliability first:** effects reset cleanly, remain legible from the default camera, and produce the same satisfying beat every time.

## Architecture / conventions

```
src/
├── App.jsx              # Canvas + HTML overlay split. UI never lives inside Canvas.
├── main.jsx
├── store/
│   └── useGameStore.js  # ALL game state (Zustand). phase: idle→active→aftermath
├── data/
│   └── disasters.js     # ALL content/copy. Edit text here, not in components.
├── scene/               # Static world: Scene, House (with cutaway), Ground, interior props
├── disasters/           # One effect component per disaster + DisasterEffects manager
├── ui/                  # HTML overlay: Toolbar (toggles + reset only), InfoPanel, RiskScore
└── styles/ui.css
```

**Adding a disaster (the pattern):**
1. Add entry to `src/data/disasters.js` (copy an existing one) — include which scene object is its trigger
2. Create effect component in `src/disasters/` (animation only, no state logic)
3. Register it in `DisasterEffects.jsx` EFFECTS map
4. Make the trigger object clickable in the scene: `onClick` → `triggerDisaster(id)`, plus hover highlight + `cursor: pointer`
5. Add damage visualization to `House.jsx` if needed

**Rules:**
- Game logic lives in the store only. Components read state and render.
- Disasters are triggered from clickable scene objects, not UI buttons. The store's `triggerDisaster(id)` is the single entry point; both clicks and (dev) hotkeys go through it.
- Cutaway is a rendering concern in the scene layer — camera-facing walls/roof fade or cull; it must never gate whether an object is clickable.
- Effects are visual-only and unmount when `activeDisaster` clears.
- No physics — mesh/material swaps + particles.
- Content/copy edits go in `disasters.js` so non-3D teammates can contribute.

## Dev setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # verify before committing big changes
```

Node 18+. Stack: Vite, React 18, @react-three/fiber, @react-three/drei, Zustand.

## Asset shopping list (pre-hackday)

- [x] Quaternius CC0 GLB interior props — kitchen set, living-room set, dining nook, storage, lamps, and plants
- [ ] Sounds: hail patter, fire crackle, wood crash, success chime — freesound.org (CC0)
- [ ] Optional: cartoon font (e.g., Fredoka via Google Fonts)

## Demo script (2–3 min)

1. Open on idle house — orbit once so the cutaway reveals the furnished interior; let the charm land
2. "Let's see what a bad day looks like" → **click the roof** → hail → panel appears → walk through coverage/cost
3. Toggle **impact-resistant roofing** → reset → click the roof again → reduced cost + badge → "prevention is the story"
4. Toggle **reinforced roof framing** or **trim overhanging branches** → reset → click the tree → compare the smaller aftermath
5. Rapid-fire: **click the stove** (fire) and **click the tree** (fall) for spectacle
6. Point at risk score → close on audiences: customers, new agents, community events
7. Always end on **Reset house** so it's ready for judge walk-ups
