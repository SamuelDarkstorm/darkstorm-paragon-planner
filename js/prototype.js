// Darkstorm Prototype 0.1
// Complete-player-loop controller.
// This is intentionally simple and readable so the prototype can be rebuilt deliberately later.

const STORAGE_KEY = "darkstorm-prototype-v0.1";

const prototypeState = {
    feedbackResult: null,
    lastGearComparison: null,
    candidateEquipped: false
};

const ids = [
    "characterName", "className", "realm", "level", "difficulty", "goal",
    "archetype", "problem", "skills", "buildNotes",
    "equippedName", "equippedArmor", "equippedLife", "equippedDefense", "equippedDamage",
    "candidateName", "candidateArmor", "candidateLife", "candidateDefense", "candidateDamage",
    "paragonBoardName", "glyphName", "glyphLevel", "feedbackNotes"
];

const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

function numberValue(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : 0;
}

function getGear(prefix) {
    return {
        name: el[prefix + "Name"].value.trim() || "Unnamed item",
        armor: numberValue(el[prefix + "Armor"]),
        life: numberValue(el[prefix + "Life"]),
        defense: numberValue(el[prefix + "Defense"]),
        damage: numberValue(el[prefix + "Damage"])
    };
}

function getCharacterFromForm() {
    return {
        profile: {
            name: el.characterName.value.trim(),
            className: el.className.value,
            realm: el.realm.value,
            level: numberValue(el.level),
            difficulty: el.difficulty.value.trim(),
            goal: el.goal.value
        },
        build: {
            archetype: el.archetype.value.trim(),
            problem: el.problem.value,
            skills: el.skills.value
                .split(",")
                .map(skill => skill.trim())
                .filter(Boolean),
            notes: el.buildNotes.value.trim()
        },
        gear: {
            equipped: getGear("equipped"),
            candidate: getGear("candidate")
        },
        paragon: {
            board: el.paragonBoardName.value.trim(),
            glyph: el.glyphName.value.trim(),
            glyphLevel: numberValue(el.glyphLevel)
        },
        feedback: {
            result: prototypeState.feedbackResult,
            notes: el.feedbackNotes.value.trim()
        }
    };
}

function setGear(prefix, gear) {
    el[prefix + "Name"].value = gear?.name ?? "";
    el[prefix + "Armor"].value = gear?.armor ?? 0;
    el[prefix + "Life"].value = gear?.life ?? 0;
    el[prefix + "Defense"].value = gear?.defense ?? 0;
    el[prefix + "Damage"].value = gear?.damage ?? 0;
}

function populateForm(character) {
    el.characterName.value = character.profile?.name ?? "";
    el.className.value = character.profile?.className ?? "Necromancer";
    el.realm.value = character.profile?.realm ?? "Seasonal";
    el.level.value = character.profile?.level ?? 60;
    el.difficulty.value = character.profile?.difficulty ?? "";
    el.goal.value = character.profile?.goal ?? "balanced";

    el.archetype.value = character.build?.archetype ?? "";
    el.problem.value = character.build?.problem ?? "unsure";
    el.skills.value = (character.build?.skills ?? []).join(", ");
    el.buildNotes.value = character.build?.notes ?? "";

    setGear("equipped", character.gear?.equipped ?? {});
    setGear("candidate", character.gear?.candidate ?? {});

    el.paragonBoardName.value = character.paragon?.board ?? "Necromancer Starting Board";
    el.glyphName.value = character.paragon?.glyph ?? "";
    el.glyphLevel.value = character.paragon?.glyphLevel ?? 1;

    prototypeState.feedbackResult = character.feedback?.result ?? null;
    el.feedbackNotes.value = character.feedback?.notes ?? "";
    prototypeState.lastGearComparison = null;
    prototypeState.candidateEquipped = false;

    updateFeedbackUI();
    resetGearVerdict();
    markUnsaved();
    updateClassAwareness();
}

const KNOWN_CLASSES = [
    "Necromancer",
    "Barbarian",
    "Sorcerer",
    "Rogue",
    "Druid",
    "Spiritborn",
    "Warlock"
];

const NECROMANCER_MARKERS = [
    "minion necromancer",
    "raise skeleton",
    "corpse tendrils",
    "decrepify",
    "sacrificial",
    "necromancer starting board"
];

function classKnowledgeFor(character) {
    const className = character.profile.className;
    const archetype = character.build.archetype.toLowerCase();

    if (className === "Necromancer" && /minion|summon/.test(archetype)) {
        return {
            label: "Reference implementation",
            confidenceCap: 100
        };
    }

    if (className === "Necromancer") {
        return {
            label: "Partial",
            confidenceCap: 75
        };
    }

    return {
        label: "Generic / early",
        confidenceCap: 60
    };
}

function detectClassMismatch(character) {
    const selectedClass = character.profile.className;
    const snapshotText = [
        character.build.archetype,
        ...character.build.skills,
        character.paragon.board,
        character.paragon.glyph
    ].join(" ").toLowerCase();

    const namedOtherClass = KNOWN_CLASSES.find(className =>
        className !== selectedClass &&
        snapshotText.includes(className.toLowerCase())
    );

    if (namedOtherClass) {
        return `Selected class is ${selectedClass}, but the build snapshot still references ${namedOtherClass}.`;
    }

    if (
        selectedClass !== "Necromancer" &&
        NECROMANCER_MARKERS.some(marker => snapshotText.includes(marker))
    ) {
        return `Selected class is ${selectedClass}, but the snapshot still contains Necromancer-specific build data.`;
    }

    return null;
}

function updateClassAwareness() {
    const character = getCharacterFromForm();
    const knowledge = classKnowledgeFor(character);
    const mismatch = detectClassMismatch(character);

    document.getElementById("classKnowledgeBadge").textContent =
        `Class knowledge: ${knowledge.label}`;

    const warning = document.getElementById("classMismatchWarning");
    const warningText = document.getElementById("classMismatchText");

    if (mismatch) {
        warning.hidden = false;
        warningText.textContent = mismatch;
    } else {
        warning.hidden = true;
        warningText.textContent = "";
    }
}

function resetBuildSnapshotForClass() {
    const selectedClass = el.className.value;

    el.archetype.value = "";
    el.problem.value = "unsure";
    el.skills.value = "";
    el.buildNotes.value = "";
    el.paragonBoardName.value =
        selectedClass === "Necromancer" ? "Necromancer Starting Board" : "";
    el.glyphName.value = "";
    el.glyphLevel.value = 1;

    prototypeState.feedbackResult = null;
    prototypeState.lastGearComparison = null;
    prototypeState.candidateEquipped = false;

    updateFeedbackUI();
    resetGearVerdict();
    updateClassAwareness();
    markUnsaved();
}

function defensiveScore(item) {
    return (item.armor * 0.35) + (item.life * 0.55) + (item.defense * 35);
}

function offensiveScore(item) {
    return (item.damage * 1.2) + (item.armor * 0.05) + (item.life * 0.05);
}

function scoreGear(item, goal) {
    if (goal === "damage" || goal === "clear-speed") {
        return offensiveScore(item);
    }

    if (goal === "survivability") {
        return defensiveScore(item);
    }

    return (defensiveScore(item) * 0.65) + (offensiveScore(item) * 0.35);
}

function compareGear() {
    const character = getCharacterFromForm();
    const equipped = character.gear.equipped;
    const candidate = character.gear.candidate;
    const equippedScore = scoreGear(equipped, character.profile.goal);
    const candidateScore = scoreGear(candidate, character.profile.goal);
    const delta = candidateScore - equippedScore;

    let verdict = "HOLD";
    if (delta > 25) verdict = "SWAP";
    if (delta < -25) verdict = "KEEP";

    const comparison = {
        verdict,
        delta,
        equippedScore,
        candidateScore,
        goal: character.profile.goal
    };

    prototypeState.lastGearComparison = comparison;

    const verdictEl = document.getElementById("gearVerdict");
    const reasonEl = document.getElementById("gearReason");
    const equipButton = document.getElementById("equipCandidateButton");

    verdictEl.textContent = verdict;

    const direction = delta >= 0 ? "higher" : "lower";
    const absoluteDelta = Math.abs(Math.round(delta));

    reasonEl.textContent =
        `${candidate.name} scores ${absoluteDelta} prototype points ${direction} than ${equipped.name} for the current "${character.profile.goal}" goal. This is a test heuristic, not a live Diablo IV damage calculator.`;

    equipButton.disabled = verdict === "KEEP";

    return comparison;
}

function resetGearVerdict() {
    document.getElementById("gearVerdict").textContent = "No comparison yet";
    document.getElementById("gearReason").textContent = "Enter two items or load the demo character.";
    document.getElementById("equipCandidateButton").disabled = true;
}

function equipCandidate() {
    const candidate = getGear("candidate");
    setGear("equipped", candidate);
    prototypeState.candidateEquipped = true;
    document.getElementById("gearVerdict").textContent = "EQUIPPED";
    document.getElementById("gearReason").textContent =
        `${candidate.name} is now treated as equipped for the next Darkstorm analysis.`;
    markUnsaved();
    analyzeBuild();
}

function recommendationFor(character) {
    const problem = character.build.problem;
    const goal = character.profile.goal;
    const feedback = prototypeState.feedbackResult;
    const gearComparison = prototypeState.lastGearComparison;

    if (feedback === "worse") {
        return {
            title: "Revert the last change and reassess.",
            summary: "The player's test result outweighs the prototype's earlier assumption.",
            why: "The most recent change made the character feel worse in actual play.",
            whyNow: "Darkstorm should not continue optimizing on top of a change that failed the play test.",
            whyNot: "Do not stack another major change yet; that would make it harder to identify the cause.",
            changes: "If a repeat test shows the problem was unrelated to the change, this recommendation can be revised.",
            confidence: 90
        };
    }

    if (feedback === "better" && prototypeState.candidateEquipped) {
        return {
            title: "Keep the gear change and inspect Paragon next.",
            summary: "The gear test produced a positive result, so Darkstorm moves to the next major decision surface.",
            why: "The candidate item improved the player's reported experience.",
            whyNow: "The gear question has enough evidence to stop consuming attention for the moment.",
            whyNot: "Another immediate gear swap would add noise before the current improvement is established.",
            changes: "If survivability or clear speed falls off again, gear returns to the priority list.",
            confidence: 86
        };
    }

    if (gearComparison?.verdict === "SWAP" && !prototypeState.candidateEquipped) {
        return {
            title: "Test the candidate chest piece.",
            summary: "Darkstorm found a candidate that better matches the current goal using the prototype heuristic.",
            why: "The candidate scores meaningfully better for the selected priority.",
            whyNow: "It is a reversible change with a clear before-and-after test.",
            whyNot: "Changing skills or Paragon at the same time would make the result harder to interpret.",
            changes: "If the candidate feels worse in play, revert it regardless of the prototype score.",
            confidence: 82
        };
    }

    if (problem === "survivability" || goal === "survivability") {
        return {
            title: "Stabilize survivability before chasing more damage.",
            summary: "Darkstorm is prioritizing the problem the player says is currently limiting progression.",
            why: "The current problem and/or primary goal points to defensive consistency.",
            whyNow: "A build that cannot stay alive long enough to execute its loop cannot fully benefit from added damage.",
            whyNot: "Pure damage optimization is lower priority until the player can test consistently.",
            changes: "If survivability feels stable in repeated runs, shift priority toward clear speed or damage.",
            confidence: 76
        };
    }

    if (problem === "damage") {
        return {
            title: "Compare the biggest offensive upgrade available.",
            summary: "The player identified damage as the current bottleneck.",
            why: "The build problem is explicitly offensive rather than defensive.",
            whyNow: "A controlled gear comparison is faster to validate than changing several systems at once.",
            whyNot: "Paragon and skill changes should wait until a simpler reversible test is exhausted.",
            changes: "If damage improves but survivability collapses, the priority becomes balanced rather than pure damage.",
            confidence: 73
        };
    }

    if (problem === "clear-speed") {
        return {
            title: "Run a clear-speed test with one controlled change.",
            summary: "Darkstorm needs a measurable before-and-after result before making a larger recommendation.",
            why: "Clear speed can be affected by damage, movement, resource flow, targeting, and survivability.",
            whyNow: "The current input does not isolate which of those is actually limiting the run.",
            whyNot: "A broad rebuild would hide the cause.",
            changes: "The next recommendation will depend on what the controlled test improves or worsens.",
            confidence: 67
        };
    }

    if (problem === "resource") {
        return {
            title: "Test resource stability before changing the wider build.",
            summary: "Darkstorm is isolating the reported resource problem first.",
            why: "Resource failure can make otherwise-good damage or skill choices feel broken.",
            whyNow: "It directly interrupts the build's gameplay loop.",
            whyNot: "Adding damage does not solve an action loop that cannot be sustained.",
            changes: "If resource remains stable across several fights, move attention back to damage or survivability.",
            confidence: 74
        };
    }

    return {
        title: "Create one controlled test.",
        summary: "Darkstorm does not yet have enough evidence to justify a larger change.",
        why: "The player has not identified a single dominant bottleneck.",
        whyNow: "A small test gives the recommendation engine new evidence without wasting resources.",
        whyNot: "Multiple simultaneous changes would make the result ambiguous.",
        changes: "Any strong positive or negative play-test result can immediately change the priority.",
        confidence: 58
    };
}

function analyzeBuild() {
    const character = getCharacterFromForm();
    updateClassAwareness();

    const mismatch = detectClassMismatch(character);
    const knowledge = classKnowledgeFor(character);

    let recommendation;

    if (mismatch) {
        recommendation = {
            title: "Review the build snapshot before continuing.",
            summary: mismatch,
            why: "Darkstorm found character data that appears to belong to a different class.",
            whyNow: "Using incompatible class data would make later recommendations unreliable.",
            whyNot: "Darkstorm should not guess how to translate skills, archetypes, or Paragon data between classes.",
            changes: "Reset or correct the build snapshot so it matches the selected class, then analyze again.",
            confidence: 98
        };
    } else {
        recommendation = recommendationFor(character);

        const isDirectFeedback =
            prototypeState.feedbackResult === "better" ||
            prototypeState.feedbackResult === "worse";

        if (!isDirectFeedback && recommendation.confidence > knowledge.confidenceCap) {
            recommendation = {
                ...recommendation,
                confidence: knowledge.confidenceCap,
                summary:
                    `Class-specific knowledge for ${character.profile.className} is currently ${knowledge.label.toLowerCase()}. ` +
                    recommendation.summary
            };
        }
    }

    document.getElementById("recommendationTitle").textContent = recommendation.title;
    document.getElementById("recommendationSummary").textContent = recommendation.summary;
    document.getElementById("whyText").textContent = recommendation.why;
    document.getElementById("whyNowText").textContent = recommendation.whyNow;
    document.getElementById("whyNotText").textContent = recommendation.whyNot;
    document.getElementById("changesText").textContent = recommendation.changes;
    document.getElementById("confidenceBadge").textContent =
        `Confidence: ${recommendation.confidence}%`;

    return recommendation;
}

function updateFeedbackUI() {
    const status = document.getElementById("feedbackStatus");
    if (!prototypeState.feedbackResult) {
        status.textContent = "No test result";
        return;
    }

    const labels = {
        better: "Test result: Better",
        same: "Test result: No change",
        worse: "Test result: Worse"
    };
    status.textContent = labels[prototypeState.feedbackResult];

    document.querySelectorAll("[data-feedback]").forEach(button => {
        button.setAttribute(
            "aria-pressed",
            String(button.dataset.feedback === prototypeState.feedbackResult)
        );
    });
}

function savePrototype() {
    const data = getCharacterFromForm();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
    document.getElementById("saveStatus").textContent = "Saved locally";
}

function markUnsaved() {
    document.getElementById("saveStatus").textContent = "Not saved";
}

function exportPrototype() {
    const data = getCharacterFromForm();
    const fileName = (data.profile.name || "darkstorm-character")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName || "darkstorm-character"}.darkstorm.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function importPrototype(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
        try {
            const data = JSON.parse(reader.result);
            populateForm(data);
            analyzeBuild();
        } catch (error) {
            window.alert("Darkstorm could not read that JSON file.");
        }
    });
    reader.readAsText(file);
}

function resetPrototype() {
    localStorage.removeItem(STORAGE_KEY);
    populateForm({
        profile: {
            name: "",
            className: "Necromancer",
            realm: "Seasonal",
            level: 60,
            difficulty: "",
            goal: "balanced"
        },
        build: {
            archetype: "",
            problem: "unsure",
            skills: [],
            notes: ""
        },
        gear: {
            equipped: {},
            candidate: {}
        },
        paragon: {
            board: "Necromancer Starting Board",
            glyph: "",
            glyphLevel: 1
        },
        feedback: {
            result: null,
            notes: ""
        }
    });

    document.getElementById("recommendationTitle").textContent =
        "Load a character and analyze the build.";
    document.getElementById("recommendationSummary").textContent =
        "Darkstorm will use the character, gear, problem, goal, Paragon context, and test feedback below.";
    document.getElementById("whyText").textContent = "Waiting for analysis.";
    document.getElementById("whyNowText").textContent = "Waiting for analysis.";
    document.getElementById("whyNotText").textContent = "Waiting for analysis.";
    document.getElementById("changesText").textContent = "Waiting for analysis.";
    document.getElementById("confidenceBadge").textContent = "Confidence: --";
}

document.getElementById("loadDemoButton").addEventListener("click", () => {
    populateForm(DARKSTORM_DEMO_CHARACTER);
    analyzeBuild();
});

document.getElementById("saveButton").addEventListener("click", savePrototype);
document.getElementById("exportButton").addEventListener("click", exportPrototype);
document.getElementById("importInput").addEventListener("change", event => {
    importPrototype(event.target.files?.[0]);
    event.target.value = "";
});
document.getElementById("analyzeButton").addEventListener("click", analyzeBuild);
document.getElementById("compareGearButton").addEventListener("click", () => {
    compareGear();
    analyzeBuild();
});
document.getElementById("equipCandidateButton").addEventListener("click", equipCandidate);

document.querySelectorAll("[data-feedback]").forEach(button => {
    button.addEventListener("click", () => {
        prototypeState.feedbackResult = button.dataset.feedback;
        updateFeedbackUI();
        markUnsaved();
    });
});

document.getElementById("applyFeedbackButton").addEventListener("click", () => {
    analyzeBuild();
    markUnsaved();
});

document.getElementById("resetButton").addEventListener("click", resetPrototype);
document.getElementById("resetSnapshotButton").addEventListener(
    "click",
    resetBuildSnapshotForClass
);

el.className.addEventListener("change", updateClassAwareness);
["archetype", "skills", "paragonBoardName", "glyphName"].forEach(id => {
    el[id].addEventListener("input", updateClassAwareness);
});

document.querySelectorAll("input, select, textarea").forEach(input => {
    input.addEventListener("change", markUnsaved);
});

const savedPrototype = localStorage.getItem(STORAGE_KEY);
if (savedPrototype) {
    try {
        populateForm(JSON.parse(savedPrototype));
        document.getElementById("saveStatus").textContent = "Loaded local save";
        analyzeBuild();
    } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        updateClassAwareness();
    }
} else {
    updateClassAwareness();
}
