# 💀 Darkstorm

Darkstorm is an experimental Diablo decision-support companion built around one question:

> **What should I do next, and why?**

## Prototype 0.1

The `prototype/v0.1` branch expands the original Paragon planner into a functional vertical slice of the complete Darkstorm player loop.

Current prototype flow:

- Character profile
- Build snapshot
- Mission Control recommendation
- Gear comparison
- Existing interactive Paragon board
- Player test feedback
- Recommendation recalculation
- Browser save
- JSON export/import

The reference implementation currently focuses most deeply on a Minion/Summoner Necromancer. Other classes can be entered to test the application framework, but their class-specific intelligence is intentionally limited.

### Important

Prototype 0.1 uses simplified heuristics. It is designed to test Darkstorm's workflow and decision model, **not** to provide authoritative Diablo IV calculations or live game data.

See `docs/PROTOTYPE_SCOPE.md` for the prototype contract and success criteria.

## Original Planner Foundation

The repository began as a touch-friendly Diablo Paragon planner and already includes:

- Interactive Paragon prototype
- Touch and mouse support
- Node path validation
- Data-driven architecture direction
- GitHub + Netlify deployment foundation

The existing Paragon engine is being reused rather than thrown away.

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- LocalStorage
- JSON import/export
- Git
- GitHub
- Netlify

## Project Structure

```text
assets/
css/
data/
docs/
js/
  boards/
index.html
README.md
ROADMAP.md
```

## Development Principle

Prototype quickly. Learn from it. Rebuild intentionally.

The prototype is allowed to be rough. The long-term production version should be rebuilt with stronger architecture, testing, authoritative game data, and maintainable code ownership.
