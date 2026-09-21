# Darkstorm Prototype 0.1 — Scope

## Purpose

Prototype 0.1 is a functional vertical slice of Darkstorm. It is not intended to be production-ready or visually polished.

The prototype exists to test one core question:

> Can Darkstorm help a Diablo IV player decide what to do next, explain why, let the player make a change, and then react to the result?

## Complete Player Loop

Prototype 0.1 supports this flow:

1. Create or load a character.
2. Record the player's build, goal, and current problem.
3. Ask Mission Control for a recommendation.
4. Compare an equipped item with a candidate item.
5. Make a gear change.
6. Inspect Paragon context using the existing interactive board prototype.
7. Record whether the change felt better, the same, or worse.
8. Recalculate the recommendation using that feedback.
9. Save locally or export/import the character as JSON.

## Reference Implementation

The deepest supported reference path is:

- Diablo IV
- Seasonal
- Necromancer
- Minion/Summoner archetype

Other classes can be entered so the application structure can be tested, but class-specific intelligence is intentionally limited in this prototype.

## Recommendation Contract

A Darkstorm recommendation should include:

- Recommendation
- Why
- Why now
- Why not
- Confidence
- What changes this recommendation

## Prototype Rules

- Functional before beautiful.
- One controlled change at a time.
- Player feedback is evidence.
- Confidence should fall when Darkstorm has less specific knowledge.
- The prototype must not pretend simplified heuristics are authoritative Diablo IV calculations.
- Existing Paragon work should be reused rather than discarded.
- The player makes the final decision.

## Intentionally Simplified

The following are placeholders or simplified models in 0.1:

- Gear scoring
- Build-specific knowledge
- Skill evaluation
- Paragon intelligence
- Aspect compatibility
- Tempering/masterworking logic
- Live game data
- Seasonal rules
- Damage calculations

These systems are expected to change substantially during later prototypes and the eventual rebuild.

## Success Criteria

Prototype 0.1 succeeds when someone unfamiliar with Darkstorm can open the app and understand the full decision loop without needing an explanation of the codebase.

The user should be able to:

- load the demo character,
- analyze the build,
- compare gear,
- equip a candidate,
- use the Paragon board,
- report the test result,
- see Mission Control change its recommendation,
- save/export the state.

## Long-Term Direction

This prototype is a reference implementation.

The eventual production version should be deliberately rebuilt with stronger architecture, better testing, authoritative data sources, and code that the project owner understands well enough to maintain and repair independently.
