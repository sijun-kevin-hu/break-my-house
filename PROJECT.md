# Break My House 🏠🌪️

Interactive 3D cartoon risk-education game. Summon disasters on a house, see what insurance coverage applies, and learn how prevention changes the outcome.

**Hackday pitch:** insurance education that people actually want to play with — works for customer education, new-agent training, and community outreach.

---

## Requirements (12-hour scope — LOCKED)

- [x] 3D cartoon house scene with orbit camera
- [x] 3 disasters: hailstorm, kitchen fire, fallen tree
- [x] Disaster → animation → damage state → info panel loop
- [x] Info panel: what happened / coverage / typical cost / prevention tip
- [x] One prevention toggle per disaster (reduces damage + cost shown)
- [x] Home Risk Score (improves as preventions applied)
- [x] Reset house button (critical for repeat demos)
- [ ] Sound effects (hail patter, fire crackle, tree crash) — freesound.org
- [ ] Replace primitive house with low-poly GLB (Kenney.nl / Quaternius)
- [ ] Title/intro screen polish

**Explicitly out of scope:** physics, LLM NPC, walking character, more than 3 disasters, mobile.

## Progress

| Milestone | Target | Status |
|---|---|---|
| H0–2: Scene + house + orbit controls | Hour 2 | ✅ Done (scaffold) |
| H2–5: Hail end-to-end loop | Hour 5 | ✅ Done (scaffold) |
| H5–7: Info panel + risk score + preventions | Hour 7 | ✅ Done (scaffold) |
| H7–10: Fire + fallen tree | Hour 10 | ✅ Done (scaffold) |
| H10–12: Sound, GLB assets, polish, demo runs | Hour 12 | 🔲 Not started |

## Current functionality

- **Idle scene:** low-poly primitive house, yard, bushes, sky, shadows, orbit camera (pan disabled, angle clamped)
- **Hail:** 250 instanced hailstones fall over the yard for 4s; roof darkens/dents after
- **Fire:** flickering flame cones + orange light + rising smoke at kitchen corner; walls char after
- **Fallen tree:** backyard oak topples onto the roofline; stays fallen until reset
- **Camera shake** during any active disaster
- **Prevention toggles** under each disaster button; if toggled *before* triggering, damage is visually reduced and the panel shows the reduced cost + "Prevention paid off!" badge
- **Risk score** (top right): 100 minus per-disaster weight for each un-prevented risk; color-coded green/amber/red
- **Info panel** (right side): slides in after each disaster with education content
- **Reset house:** clears all damage, keeps prevention toggles

## Architecture / conventions

```
src/
├── App.jsx              # Canvas + HTML overlay split. UI never lives inside Canvas.
├── main.jsx
├── store/
│   └── useGameStore.js  # ALL game state (Zustand). phase: idle→active→aftermath
├── data/
│   └── disasters.js     # ALL content/copy. Edit text here, not in components.
├── scene/               # Static world: Scene, House, Ground
├── disasters/           # One effect component per disaster + DisasterEffects manager
├── ui/                  # HTML overlay: Toolbar, InfoPanel, RiskScore
└── styles/ui.css
```

**Adding a disaster (the pattern):**
1. Add entry to `src/data/disasters.js` (copy an existing one)
2. Create effect component in `src/disasters/` (animation only, no state logic)
3. Register it in `DisasterEffects.jsx` EFFECTS map
4. Add damage visualization to `House.jsx` if needed

**Rules:**
- Game logic lives in the store only. Components read state and render.
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

- [ ] Low-poly house GLB — Kenney.nl "Holiday Kit" or Quaternius "Buildings"
- [ ] Sounds: hail patter, fire crackle, wood crash, success chime — freesound.org (CC0)
- [ ] Optional: cartoon font (e.g., Fredoka via Google Fonts)

## Demo script (2–3 min)

1. Open on idle house — let the charm land
2. "Let's see what a bad day looks like" → trigger **hail** → panel appears → walk through coverage/cost
3. Toggle **impact-resistant roof** → reset → hail again → reduced cost + badge → "prevention is the story"
4. Rapid-fire **fire** and **tree** for spectacle
5. Point at risk score → close on audiences: customers, new agents, community events
6. Always end on **Reset house** so it's ready for judge walk-ups
