# Break My House — Agent Guide

## Product intent

Build a short, deterministic, low-poly 3D insurance-risk education demo. A
player clicks a real object in the house scene to cause a disaster, sees the
visible damage and insurance explanation, then compares the result with a
prevention enabled. This is a choreographed demo, not a physics simulation.

## Commands

```bash
npm install
npm run dev
npm run build
```

Run `npm run build` after any meaningful code change. There is no automated
test suite; use the manual smoke test in `PROJECT.md` as well.

## Source of truth

- **Start every task by reading this file and `PROJECT.md`.** Use them to
  recover project context before inspecting or changing implementation files.
- `src/data/disasters.js`: all disaster copy, costs, the fixed demo-deductible
  assumption, timings, prevention relationships, and risk weights. Do not put
  customer-facing copy in scene or UI components.
- `src/store/useGameStore.js`: all game state and transitions. Components
  select state and render it; they do not coordinate gameplay independently.
- `PROJECT.md`: product scope, feature status, known gaps, and demo checklist.
  **Update it in the same task** when changing a user-visible feature, its
  status, known gaps, acceptance behavior, or verification status. Do not mark
  a feature Done without verifying it; record incomplete work as Partial or
  Pending instead.

## Documentation discipline

- Keep `AGENTS.md` concise and durable: architecture, invariants, commands,
  and conventions that future agents must follow.
- Keep `PROJECT.md` current and product-facing: shipped behavior, feature
  status, priorities, blockers, and manual verification.
- When a change introduces a new convention or changes an existing invariant,
  update `AGENTS.md` in the same task.
- Before handing work back, check whether either file is now stale. If neither
  needs an update, state that they were reviewed and remain accurate.

## Architecture

```text
src/
├── App.jsx                  # Canvas plus HTML overlay
├── data/disasters.js        # Content and prevention configuration
├── store/useGameStore.js    # Single game-state store
├── scene/                   # House, tree, ground, camera, click affordances
├── disasters/               # Hail and fire visual effects
├── hooks/                   # Audio integration
├── ui/                      # HTML overlay only
└── styles/ui.css
```

`BackyardTree` is a scene object rather than a `disasters/` effect because it
must be present and clickable before the tree disaster is triggered.

## Gameplay invariants

- The only state transition for a disaster is `triggerDisaster(id)`.
- Trigger objects are: roof → `hail`, stove → `fire`, backyard tree/stump →
  `tree`. Do not add disaster buttons to the toolbar.
- Starting a disaster locks every scene trigger until its result panel is
  acknowledged with “Got it”; camera controls must remain available during this lock.
- Snapshot prevention when a disaster starts. A player cannot turn on
  protection retroactively; related controls lock after its disaster fires.
- Triggered effects and damage remain until `resetHouse()`. Reset clears damage
  but deliberately retains prevention choices for comparison demos.
- A prevention must change both the spectacle and the information panel, not
  only the displayed price. `removeTree` is a fully prevented outcome.
- Keep effects deterministic and authored. Do not add a physics engine.

## Scene and interaction rules

- Keep HTML UI outside the `<Canvas>`; 3D objects live inside it.
- Result panels must remain viewport-bounded and scroll internally on narrow or
  short windows; keep their acknowledgement action reachable while scrolling.
- The Sims cutaway is a rendering concern. Near walls and roof pieces fade or
  hide without preventing an interior target from being clicked.
- Use `useClickable` for a new scene trigger so hover, pointer cursor, event
  propagation, and disabled behavior stay consistent.
- Make damage legible through localized geometry/material changes: dents,
  scorch, missing roof sections, debris, or silhouette changes.
- Camera shake should be impact-timed. Avoid stacking generic shake with an
  effect that owns a stronger event-specific shake.

## Assets and audio

- Interior GLB assets live in `public/models/house-interior/`; retain their
  attribution file and preload new GLBs in `InteriorModel.jsx`.
- Audio is loaded from `public/audio/`. If audio filenames change, update
  `useGameAudio.js` in the same change. The current expected names are
  `hail.mp3`, `fire.mp3`, `tree-crash.mp3`, and `success.mp3`.

## Adding a disaster

1. Add its content/configuration in `src/data/disasters.js`.
2. Add visual-only animation under `src/disasters/`, if appropriate, and
   register it in `DisasterEffects.jsx`.
3. Add a discoverable scene-object trigger using `useClickable`.
4. Add persistent damage to the house/scene and a visibly reduced or prevented
   variation.
5. Verify reset, prevention locking, panel timing, risk score, and `npm run build`.
6. Update `PROJECT.md` with the feature status and any new known gap.
