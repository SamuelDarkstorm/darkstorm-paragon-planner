// Darkstorm Prototype 0.2
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
        loadout: {
            helm: {
                name: "Demo Summoner Helm",
                itemType: "Helm",
                itemPower: 750,
                armor: 520,
                life: 320,
                defense: 4,
                damage: 0,
                power: "Prototype minion utility power",
                affixes: "Maximum Life\nCooldown Reduction",
                tempers: "Minion utility",
                masterwork: 4,
                sockets: 1
            },
            chest: {
                name: "Current Chest",
                itemType: "Chest Armor",
                itemPower: 780,
                armor: 820,
                life: 540,
                defense: 8,
                damage: 0,
                power: "Prototype defensive power",
                affixes: "Maximum Life\nDamage Reduction",
                tempers: "Defensive temper",
                masterwork: 4,
                sockets: 2
            },
            gloves: {
                name: "Demo Summoner Gloves",
                itemType: "Gloves",
                itemPower: 760,
                armor: 410,
                life: 0,
                defense: 0,
                damage: 14,
                power: "Prototype offensive power",
                affixes: "Attack Speed\nCritical Strike Chance",
                tempers: "Minion offense",
                masterwork: 4,
                sockets: 0
            },
            pants: {
                name: "Demo Summoner Pants",
                itemType: "Pants",
                itemPower: 770,
                armor: 690,
                life: 460,
                defense: 7,
                damage: 0,
                power: "Prototype defensive power",
                affixes: "Maximum Life\nArmor",
                tempers: "Defensive temper",
                masterwork: 4,
                sockets: 2
            },
            boots: {
                name: "Demo Summoner Boots",
                itemType: "Boots",
                itemPower: 755,
                armor: 360,
                life: 180,
                defense: 3,
                damage: 0,
                power: "Prototype mobility power",
                affixes: "Movement Speed\nResistance",
                tempers: "Mobility",
                masterwork: 4,
                sockets: 0
            },
            amulet: {
                name: "Demo Summoner Amulet",
                itemType: "Amulet",
                itemPower: 775,
                armor: 0,
                life: 210,
                defense: 3,
                damage: 12,
                power: "Prototype build-defining power",
                affixes: "Skill Ranks\nCooldown Reduction",
                tempers: "Minion offense",
                masterwork: 4,
                sockets: 1
            },
            ring1: {
                name: "Demo Summoner Ring I",
                itemType: "Ring",
                itemPower: 765,
                armor: 0,
                life: 160,
                defense: 2,
                damage: 11,
                power: "Prototype resource power",
                affixes: "Critical Strike Chance\nMaximum Life",
                tempers: "Resource utility",
                masterwork: 4,
                sockets: 1
            },
            ring2: {
                name: "Demo Summoner Ring II",
                itemType: "Ring",
                itemPower: 768,
                armor: 0,
                life: 150,
                defense: 2,
                damage: 13,
                power: "Prototype minion power",
                affixes: "Attack Speed\nMaximum Life",
                tempers: "Minion offense",
                masterwork: 4,
                sockets: 1
            },
            mainHand: {
                name: "Demo Summoner Wand",
                itemType: "Wand",
                itemPower: 790,
                armor: 0,
                life: 0,
                defense: 0,
                damage: 95,
                power: "Prototype offensive power",
                affixes: "Intelligence\nCritical Strike Damage",
                tempers: "Minion damage",
                masterwork: 4,
                sockets: 1
            },
            offHand: {
                name: "Demo Summoner Focus",
                itemType: "Focus",
                itemPower: 785,
                armor: 0,
                life: 120,
                defense: 2,
                damage: 42,
                power: "Prototype utility power",
                affixes: "Cooldown Reduction\nMaximum Life",
                tempers: "Utility",
                masterwork: 4,
                sockets: 1
            }
        },
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
