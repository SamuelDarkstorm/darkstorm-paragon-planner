// Darkstorm Prototype 0.1
// Reference character used to demonstrate the full player decision loop.
// Values are intentionally simplified prototype data, not authoritative Diablo IV tuning targets.

const DARKSTORM_DEMO_CHARACTER = {
    profile: {
        name: "Demo Summoner",
        className: "Necromancer",
        realm: "Seasonal",
        level: 60,
        difficulty: "Torment II",
        goal: "survivability"
    },
    build: {
        archetype: "Minion Necromancer",
        problem: "survivability",
        skills: [
            "Raise Skeleton",
            "Golem",
            "Corpse Tendrils",
            "Decrepify",
            "Soulrift",
            "Blight"
        ],
        notes: "Reference build for testing Darkstorm's complete decision loop. The player reports that minions feel stable but personal survivability is inconsistent."
    },
    gear: {
        equipped: {
            name: "Current Chest",
            armor: 820,
            life: 540,
            defense: 8,
            damage: 0
        },
        candidate: {
            name: "Candidate Chest",
            armor: 790,
            life: 880,
            defense: 14,
            damage: 0
        }
    },
    paragon: {
        board: "Necromancer Starting Board",
        glyph: "Sacrificial",
        glyphLevel: 1
    },
    feedback: {
        result: null,
        notes: ""
    }
};
