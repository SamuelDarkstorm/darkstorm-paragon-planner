// Darkstorm Prototype 0.2
// Complete-player-loop controller.
// This is intentionally simple and readable so the prototype can be rebuilt deliberately later.

const STORAGE_KEY = "darkstorm-prototype-v0.2";

const prototypeState = {
    feedbackResult: null,
    lastGearComparison: null,
    candidateEquipped: false,
    screenshots: {
        equipped: null,
        candidate: null
    }
};

const EQUIPMENT_SLOTS = [
    { key: "helm", label: "Helm" },
    { key: "chest", label: "Chest Armor" },
    { key: "gloves", label: "Gloves" },
    { key: "pants", label: "Pants" },
    { key: "boots", label: "Boots" },
    { key: "amulet", label: "Amulet" },
    { key: "ring1", label: "Ring 1" },
    { key: "ring2", label: "Ring 2" },
    { key: "mainHand", label: "Main Hand" },
    { key: "offHand", label: "Off Hand" }
];

const LOADOUT_FIELDS = [
    { key: "name", label: "Item Name", type: "text", wide: true },
    { key: "itemType", label: "Item Type", type: "text" },
    { key: "itemPower", label: "Item Power", type: "number", min: 0 },
    { key: "armor", label: "Armor", type: "number", min: 0 },
    { key: "life", label: "Maximum Life", type: "number", min: 0 },
    { key: "defense", label: "Resistance / DR", type: "number", min: 0 },
    { key: "damage", label: "Damage Value", type: "number", min: 0 },
    { key: "power", label: "Aspect / Unique Power", type: "text", wide: true },
    { key: "affixes", label: "Affixes", type: "textarea", wide: true },
    { key: "tempers", label: "Tempers", type: "textarea", wide: true },
    { key: "masterwork", label: "Masterwork", type: "number", min: 0, max: 12 },
    { key: "sockets", label: "Sockets", type: "number", min: 0, max: 2 }
];

function emptyLoadoutItem() {
    return {
        name: "",
        itemType: "",
        itemPower: 0,
        armor: 0,
        life: 0,
        defense: 0,
        damage: 0,
        power: "",
        affixes: "",
        tempers: "",
        masterwork: 0,
        sockets: 0
    };
}

function loadoutFieldId(slotKey, fieldKey) {
    return `loadout-${slotKey}-${fieldKey}`;
}

function renderEquipmentLoadout() {
    const container = document.getElementById("equipmentLoadout");
    if (!container) return;

    container.innerHTML = "";

    EQUIPMENT_SLOTS.forEach(slot => {
        const card = document.createElement("details");
        card.className = "equipment-slot-card";
        card.dataset.loadoutSlot = slot.key;
        card.open = slot.key === "chest" || slot.key === "mainHand";

        const summary = document.createElement("summary");

        const slotLabel = document.createElement("span");
        slotLabel.textContent = slot.label;

        const itemLabel = document.createElement("span");
        itemLabel.className = "slot-summary-item";
        itemLabel.id = `loadout-${slot.key}-summary`;
        itemLabel.textContent = "Empty";

        summary.append(slotLabel, itemLabel);

        const fields = document.createElement("div");
        fields.className = "equipment-slot-fields";

        LOADOUT_FIELDS.forEach(field => {
            const label = document.createElement("label");
            if (field.wide) label.classList.add("wide");
            label.append(document.createTextNode(field.label));

            const input = field.type === "textarea"
                ? document.createElement("textarea")
                : document.createElement("input");

            input.id = loadoutFieldId(slot.key, field.key);
            input.dataset.slot = slot.key;
            input.dataset.field = field.key;

            if (field.type === "textarea") {
                input.rows = 2;
            } else {
                input.type = field.type;
            }

            if (field.min !== undefined) input.min = field.min;
            if (field.max !== undefined) input.max = field.max;

            input.addEventListener("input", () => {
                updateLoadoutSummary(slot.key);
                updateLoadoutStatus();
            });

            label.append(input);
            fields.append(label);
        });

        card.append(summary, fields);
        container.append(card);
    });

    updateLoadoutStatus();
}

function getLoadoutItem(slotKey) {
    const item = emptyLoadoutItem();

    LOADOUT_FIELDS.forEach(field => {
        const input = document.getElementById(loadoutFieldId(slotKey, field.key));
        if (!input) return;

        item[field.key] = field.type === "number"
            ? numberValue(input)
            : input.value.trim();
    });

    return item;
}

function getLoadoutFromForm() {
    return Object.fromEntries(
        EQUIPMENT_SLOTS.map(slot => [slot.key, getLoadoutItem(slot.key)])
    );
}

function setLoadoutItem(slotKey, item = {}) {
    const normalized = { ...emptyLoadoutItem(), ...item };

    LOADOUT_FIELDS.forEach(field => {
        const input = document.getElementById(loadoutFieldId(slotKey, field.key));
        if (!input) return;
        input.value = normalized[field.key] ?? (field.type === "number" ? 0 : "");
    });

    updateLoadoutSummary(slotKey);
    updateLoadoutStatus();
}

function setLoadout(loadout = {}) {
    EQUIPMENT_SLOTS.forEach(slot => {
        setLoadoutItem(slot.key, loadout[slot.key] ?? {});
    });
}

function updateLoadoutSummary(slotKey) {
    const summary = document.getElementById(`loadout-${slotKey}-summary`);
    const nameInput = document.getElementById(loadoutFieldId(slotKey, "name"));
    if (!summary || !nameInput) return;

    summary.textContent = nameInput.value.trim() || "Empty";
}

function updateLoadoutStatus() {
    const status = document.getElementById("loadoutStatus");
    if (!status) return;

    const filled = EQUIPMENT_SLOTS.filter(slot => {
        const input = document.getElementById(loadoutFieldId(slot.key, "name"));
        return input?.value.trim();
    }).length;

    status.textContent = `${filled} / ${EQUIPMENT_SLOTS.length} slots filled`;
}

function comparisonSlotLabel(slotKey = el.comparisonSlot?.value) {
    return EQUIPMENT_SLOTS.find(slot => slot.key === slotKey)?.label ?? "Item";
}

function loadSelectedSlotFromLoadout() {
    const slotKey = el.comparisonSlot.value;
    const equippedItem = getLoadoutItem(slotKey);
    setGear("equipped", equippedItem);
    prototypeState.lastGearComparison = null;
    prototypeState.candidateEquipped = false;
    resetGearVerdict();
    markUnsaved();
}


const SKILL_SLOT_IDS = ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6"];

const ids = [
    "characterName", "className", "realm", "level", "difficulty", "goal",
    "archetype", "problem", ...SKILL_SLOT_IDS, "buildNotes", "comparisonSlot",
    "equippedName", "equippedItemType", "equippedItemPower", "equippedArmor", "equippedLife",
    "equippedDefense", "equippedDamage", "equippedPower", "equippedAffixes", "equippedTempers",
    "equippedMasterwork", "equippedSockets",
    "candidateName", "candidateItemType", "candidateItemPower", "candidateArmor", "candidateLife",
    "candidateDefense", "candidateDamage", "candidatePower", "candidateAffixes", "candidateTempers",
    "candidateMasterwork", "candidateSockets",
    "feedbackNotes"
];

const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

function getSkillSlotsFromForm() {
    return SKILL_SLOT_IDS.map(id => el[id].value.trim());
}

function activeSkillsFor(character) {
    const structuredSlots = character.build?.skillSlots;

    if (Array.isArray(structuredSlots)) {
        return structuredSlots
            .map(skill => String(skill ?? "").trim())
            .filter(Boolean);
    }

    // Backward compatibility for Prototype 0.1/early 0.2 exports.
    return (character.build?.skills ?? [])
        .map(skill => String(skill ?? "").trim())
        .filter(Boolean);
}

function setSkillSlots(character) {
    const source = Array.isArray(character.build?.skillSlots)
        ? character.build.skillSlots
        : (character.build?.skills ?? []);

    SKILL_SLOT_IDS.forEach((id, index) => {
        el[id].value = source[index] ?? "";
    });

    updateSkillSlotStatus();
}

function updateSkillSlotStatus() {
    const status = document.getElementById("skillSlotStatus");
    if (!status) return;

    const filled = getSkillSlotsFromForm().filter(Boolean).length;
    status.textContent = `${filled} / ${SKILL_SLOT_IDS.length} filled`;
}

function numberValue(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : 0;
}

const SCREENSHOT_PREFIXES = ["equipped", "candidate"];

function screenshotElements(prefix) {
    return {
        input: document.getElementById(`${prefix}ScreenshotInput`),
        preview: document.getElementById(`${prefix}ScreenshotPreview`),
        empty: document.getElementById(`${prefix}ScreenshotEmpty`),
        remove: document.getElementById(`${prefix}ScreenshotRemove`),
        read: document.getElementById(`${prefix}ScreenshotRead`),
        status: document.getElementById(`${prefix}ScreenshotStatus`),
        dropZone: document.getElementById(`${prefix}ScreenshotDropZone`),
        readout: document.getElementById(`${prefix}ScreenshotReadout`),
        readoutText: document.getElementById(`${prefix}ScreenshotReadoutText`),
        ocrText: document.getElementById(`${prefix}ScreenshotOcrText`)
    };
}

function formatScreenshotSize(bytes = 0) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resetScreenshotReadout(prefix) {
    const ui = screenshotElements(prefix);
    if (!ui.readout) return;

    ui.readout.hidden = true;
    ui.readoutText.textContent = "";
    ui.ocrText.textContent = "";
}

function resetScreenshotControls(prefix) {
    const ui = screenshotElements(prefix);
    if (!ui.input) return;

    ui.input.value = "";
    ui.preview.removeAttribute("src");
    ui.preview.hidden = true;
    ui.empty.hidden = false;
    ui.remove.hidden = true;
    ui.read.disabled = true;
    ui.read.textContent = "Read Screenshot";
    ui.status.textContent = "Temporary";
    ui.dropZone.classList.remove("has-image", "drag-over", "reading");
    resetScreenshotReadout(prefix);
}

function renderItemScreenshot(prefix) {
    const screenshot = prototypeState.screenshots[prefix];
    const ui = screenshotElements(prefix);
    if (!ui.input) return;

    if (!screenshot) {
        resetScreenshotControls(prefix);
        return;
    }

    ui.preview.src = screenshot.url;
    ui.preview.hidden = false;
    ui.empty.hidden = true;
    ui.remove.hidden = false;
    ui.read.disabled = false;
    ui.read.textContent = "Read Screenshot";
    ui.status.textContent =
        `${screenshot.fileName} · ${formatScreenshotSize(screenshot.size)}`;
    ui.dropZone.classList.add("has-image");
}

function clearItemScreenshot(prefix, { revoke = true } = {}) {
    const screenshot = prototypeState.screenshots[prefix];

    if (revoke && screenshot?.url) {
        URL.revokeObjectURL(screenshot.url);
    }

    prototypeState.screenshots[prefix] = null;
    resetScreenshotControls(prefix);
}

function clearAllItemScreenshots() {
    SCREENSHOT_PREFIXES.forEach(prefix => clearItemScreenshot(prefix));
}

function setItemScreenshot(prefix, file) {
    if (!file) return;

    if (file.type && !file.type.startsWith("image/")) {
        window.alert("Please choose an image file for the item screenshot.");
        return;
    }

    clearItemScreenshot(prefix);

    prototypeState.screenshots[prefix] = {
        file,
        url: URL.createObjectURL(file),
        fileName: file.name || "Screenshot",
        size: file.size || 0,
        type: file.type || "image"
    };

    renderItemScreenshot(prefix);
}

function promoteCandidateScreenshotToEquipped() {
    const candidateScreenshot = prototypeState.screenshots.candidate;

    clearItemScreenshot("equipped");

    if (!candidateScreenshot) {
        return;
    }

    prototypeState.screenshots.equipped = candidateScreenshot;
    prototypeState.screenshots.candidate = null;
    renderItemScreenshot("equipped");
    resetScreenshotControls("candidate");
}

function integerFromOcr(value) {
    const normalized = String(value ?? "")
        .replace(/[Oo]/g, "0")
        .replace(/[Il|]/g, "1")
        .replace(/S/g, "5")
        .replace(/[^0-9]/g, "");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function decimalFromOcr(value) {
    const normalized = String(value ?? "")
        .replace(/[Oo]/g, "0")
        .replace(/[Il|]/g, "1")
        .replace(/S/g, "5")
        .replace(/[^0-9.]/g, "");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function cleanedOcrLines(text) {
    return String(text ?? "")
        .split(/\r?\n/)
        .map(line => line
            .replace(/[•●▪◦]/g, "+")
            .replace(/\s+/g, " ")
            .trim())
        .filter(Boolean);
}

function itemTypeFromSlot(slotKey) {
    const map = {
        helm: "Helm",
        chest: "Chest Armor",
        gloves: "Gloves",
        pants: "Pants",
        boots: "Boots",
        amulet: "Amulet",
        ring1: "Ring",
        ring2: "Ring",
        mainHand: "Main Hand",
        offHand: "Off Hand"
    };
    return map[slotKey] ?? "Item";
}

const OCR_ITEM_TYPES = [
    ["chest armor", "Chest Armor"],
    ["helm", "Helm"],
    ["gloves", "Gloves"],
    ["pants", "Pants"],
    ["boots", "Boots"],
    ["amulet", "Amulet"],
    ["ring", "Ring"],
    ["two-handed sword", "Two-Handed Sword"],
    ["two handed sword", "Two-Handed Sword"],
    ["two-handed axe", "Two-Handed Axe"],
    ["two handed axe", "Two-Handed Axe"],
    ["two-handed mace", "Two-Handed Mace"],
    ["two handed mace", "Two-Handed Mace"],
    ["two-handed scythe", "Two-Handed Scythe"],
    ["two handed scythe", "Two-Handed Scythe"],
    ["sword", "Sword"],
    ["axe", "Axe"],
    ["mace", "Mace"],
    ["dagger", "Dagger"],
    ["wand", "Wand"],
    ["scythe", "Scythe"],
    ["focus", "Focus"],
    ["shield", "Shield"],
    ["staff", "Staff"],
    ["polearm", "Polearm"],
    ["totem", "Totem"]
];

function exactItemTypeFromText(text) {
    const normalized = String(text ?? "").toLowerCase();
    const match = OCR_ITEM_TYPES.find(([needle]) => normalized.includes(needle));
    return match?.[1] ?? "";
}

function parseItemName(lines, rarityIndex) {
    if (rarityIndex <= 0) return "";

    const blacklist = /(?:equipped|character|stats|materials|no title|weapon damage|toughness|strength|intelligence|willpower|dexterity|equipment|dungeon keys|slot transmog|hide transmog|mark as favorite)/i;
    const candidates = [];
    const windowStart = Math.max(0, rarityIndex - 8);

    for (let index = windowStart; index < rarityIndex; index += 1) {
        const line = lines[index];
        if (blacklist.test(line)) continue;
        if (/\d|%|\[|\]|:/.test(line)) continue;

        const letters = (line.match(/[A-Za-z]/g) ?? []).length;
        const usefulCharacters = line.replace(/\s/g, "").length;
        if (!usefulCharacters || letters / usefulCharacters < 0.72) continue;
        if (!/^[A-Za-z][A-Za-z'’& -]{1,42}$/.test(line)) continue;

        candidates.push(line);
    }

    return candidates.slice(-4).join(" ").trim();
}

function findLineWith(lines, pattern, startIndex = 0, maxDistance = Infinity) {
    const endIndex = Math.min(lines.length, startIndex + maxDistance + 1);

    for (let index = Math.max(0, startIndex); index < endIndex; index += 1) {
        if (pattern.test(lines[index])) {
            return { line: lines[index], index };
        }
    }

    return null;
}

function rangeFromLine(line) {
    const match = String(line ?? "").match(
        /[\[(]\s*([0-9OIlS,.]{1,8})\s*[-–]\s*([0-9OIlS,.]{1,8})\s*[\])]/i
    );

    if (!match) return null;

    const low = integerFromOcr(match[1]);
    const high = integerFromOcr(match[2]);

    if (!low || !high) return null;
    return { low: Math.min(low, high), high: Math.max(low, high) };
}

function numberBeforeLabel(line, labelPattern) {
    const source = String(line ?? "");
    const labelMatch = source.match(labelPattern);
    if (!labelMatch || labelMatch.index === undefined) return 0;

    const before = source.slice(0, labelMatch.index);
    const tokens = [...before.matchAll(/[+-]?\s*[0-9OIlS,.]+(?:\.[0-9]+)?%?/g)];
    if (!tokens.length) return 0;

    return integerFromOcr(tokens[tokens.length - 1][0]);
}

function canonicalAffixLine(line) {
    if (/\b(?:increased|deals|makes|enemies|seconds|ground|vulnerable|imprinted|aspect)\b/i.test(line)) {
        return "";
    }

    const signedValue = line.match(/[+-]\s*[0-9OIlS,.]+(?:\.[0-9]+)?%?/);
    if (!signedValue || signedValue.index === undefined || signedValue.index > 14) {
        return "";
    }

    const statMap = [
        [/maximum\s+life/i, "Maximum Life"],
        [/fortify\s+generation/i, "Fortify Generation"],
        [/healing\s+received/i, "Healing Received"],
        [/cooldown\s+reduction/i, "Cooldown Reduction"],
        [/attack\s+speed/i, "Attack Speed"],
        [/movement\s+speed/i, "Movement Speed"],
        [/critical\s+strike/i, "Critical Strike"],
        [/damage\s+reduction/i, "Damage Reduction"],
        [/lucky\s+hit/i, "Lucky Hit"],
        [/all\s+resistance/i, "All Resistance"],
        [/resistance/i, "Resistance"],
        [/intelligence/i, "Intelligence"],
        [/strength/i, "Strength"],
        [/dexterity/i, "Dexterity"],
        [/willpower/i, "Willpower"],
        [/thorns/i, "Thorns"],
        [/armor/i, "Armor"],
        [/essence/i, "Essence"],
        [/minion/i, "Minion"],
        [/golem/i, "Golem"],
        [/skeleton/i, "Skeleton"]
    ];

    const matchedStat = statMap.find(([pattern]) => pattern.test(line));
    if (!matchedStat) return "";

    const [pattern, label] = matchedStat;
    const patternMatch = line.match(pattern);
    if (!patternMatch || patternMatch.index === undefined) return "";
    if (signedValue.index > patternMatch.index) return "";

    const rawValue = signedValue[0]
        .replace(/\s+/g, "")
        .replace(/[Oo]/g, "0")
        .replace(/[Il|]/g, "1")
        .replace(/S/g, "5");

    const numericValue = decimalFromOcr(rawValue);
    const isPercent = rawValue.includes("%");

    const plausible = (() => {
        if (!numericValue) return false;
        if (isPercent) return numericValue <= 100;
        if (/^(Intelligence|Strength|Dexterity|Willpower)$/.test(label)) {
            return numericValue <= 1000;
        }
        if (label === "Maximum Life") return numericValue <= 10000;
        if (/^(Armor|Thorns)$/.test(label)) return numericValue <= 20000;
        return numericValue <= 100000;
    })();

    if (!plausible) return "";
    return `${rawValue} ${label}`;
}

function powerLooksUsable(power) {
    if (!power || power.length < 12) return false;

    const letters = (power.match(/[A-Za-z]/g) ?? []).length;
    const visible = power.replace(/\s/g, "").length;
    if (!visible || letters / visible < 0.58) return false;

    if (/\b(?:weapon damage|toughness|strength\s+\d|intelligence\s+\d|willpower\s+\d|dexterity\s+\d|stats\s*&\s*materials)\b/i.test(power)) {
        return false;
    }

    const suspiciousSymbols = (power.match(/[|{}<>]/g) ?? []).length;
    if (suspiciousSymbols >= 2) return false;

    if (/\b[A-Z]{3,}\b/.test(power)) return false;

    return true;
}

function parseDiabloItemText(rawText, slotKey) {
    const lines = cleanedOcrLines(rawText);
    const joined = lines.join("\n");
    const fields = { ...emptyLoadoutItem() };
    const detected = [];
    const inferred = [];
    const rejected = [];

    const rarityIndex = lines.findIndex(line =>
        /\b(?:legendary|unique|rare|magic)\b/i.test(line) &&
        /\b(?:helm|chest|armor|gloves|pants|boots|amulet|ring|sword|axe|mace|dagger|wand|scythe|focus|shield|staff|polearm|totem)\b/i.test(line)
    );

    if (rarityIndex >= 0) {
        const exactType = exactItemTypeFromText(lines[rarityIndex]);
        if (exactType) {
            fields.itemType = exactType;
            detected.push("Item type");
        }

        const itemName = parseItemName(lines, rarityIndex);
        if (itemName) {
            fields.name = itemName;
            detected.push("Name");
        }
    }

    if (!fields.itemType) {
        rejected.push("Item type");
    }

    const itemPowerLine = findLineWith(lines, /Item\s*Power/i);
    if (itemPowerLine) {
        const value = numberBeforeLabel(itemPowerLine.line, /Item\s*Power/i);
        if (value >= 100 && value <= 2000) {
            fields.itemPower = value;
            detected.push("Item power");
        } else {
            rejected.push("Item power");
        }
    }

    const baseSearchStart = itemPowerLine
        ? itemPowerLine.index + 1
        : Math.max(0, rarityIndex + 1);

    const baseArmorLine = findLineWith(
        lines,
        /\bArmor\b/i,
        baseSearchStart,
        5
    );

    if (baseArmorLine) {
        const value = numberBeforeLabel(baseArmorLine.line, /\bArmor\b/i);
        if (value > 0 && value < 100000) {
            fields.armor = value;
            detected.push("Armor");
        } else {
            rejected.push("Armor");
        }
    }

    const lifeLine = findLineWith(lines, /Maximum\s+Life/i, baseSearchStart, 12);
    if (lifeLine) {
        const value = numberBeforeLabel(lifeLine.line, /Maximum\s+Life/i);
        const range = rangeFromLine(lifeLine.line);
        const withinVisibleRange = !range ||
            (value >= range.low * 0.7 && value <= range.high * 1.3);

        const plausibleWithoutRange = range ? true : value <= 10000;

        if (
            value > 0 &&
            value <= 10000 &&
            withinVisibleRange &&
            plausibleWithoutRange
        ) {
            fields.life = value;
            detected.push("Maximum Life");
        } else {
            rejected.push("Maximum Life");
        }
    }

    if (slotKey === "mainHand" || slotKey === "offHand") {
        const damageLine = findLineWith(
            lines,
            /(?:Weapon\s+)?Damage/i,
            baseSearchStart,
            5
        );

        if (damageLine) {
            const value = numberBeforeLabel(
                damageLine.line,
                /(?:Weapon\s+)?Damage/i
            );

            if (value > 0 && value < 1000000) {
                fields.damage = value;
                detected.push("Damage");
            } else {
                rejected.push("Damage");
            }
        }
    }

    const baseStatIndex = Math.max(
        rarityIndex,
        itemPowerLine?.index ?? -1,
        baseArmorLine?.index ?? -1
    );
    const affixStart = baseStatIndex + 1;
    const stopPattern = /\b(?:imprinted|aspect|empty socket|requires level|sell value|durability|mark as junk|compare|drop)\b/i;
    const affixLines = [];

    for (let index = Math.max(0, affixStart); index < lines.length; index += 1) {
        const line = lines[index];
        if (stopPattern.test(line)) break;

        const canonical = canonicalAffixLine(line);
        if (canonical) {
            affixLines.push(canonical);
        }

        if (affixLines.length >= 8) break;
    }

    if (affixLines.length) {
        fields.affixes = [...new Set(affixLines)].join("\n");
        detected.push("Affixes");
    }

    const powerStart = lines.findIndex(line => /\b(?:imprinted|aspect)\s*:/i.test(line));
    if (powerStart >= 0) {
        const powerLines = [];

        for (let index = powerStart; index < lines.length && powerLines.length < 6; index += 1) {
            const line = lines[index];

            if (
                index > powerStart &&
                /\b(?:empty socket|requires level|sell value|durability|equip|compare|mark as junk|drop|scroll)\b/i.test(line)
            ) {
                break;
            }

            powerLines.push(line);
        }

        const power = powerLines
            .join(" ")
            .replace(/^.*?\b(?:imprinted|aspect)\s*:\s*/i, "")
            .trim();

        if (powerLooksUsable(power)) {
            fields.power = power;
            detected.push("Aspect / unique power");
        } else if (power) {
            rejected.push("Aspect / unique power");
        }
    }

    const masterworkMatch = joined.match(/\bMasterwork(?:ed)?[^0-9]{0,12}(\d{1,2})(?:\s*\/\s*12)?/i);
    if (masterworkMatch) {
        const value = Number(masterworkMatch[1]);
        if (value >= 0 && value <= 12) {
            fields.masterwork = value;
            detected.push("Masterwork");
        }
    }

    const socketMatches = joined.match(/\bEmpty\s+Socket\b/gi) ?? [];
    if (socketMatches.length) {
        fields.sockets = Math.min(2, socketMatches.length);
        detected.push("Sockets");
    }

    return {
        fields,
        detected: [...new Set(detected)],
        inferred,
        rejected: [...new Set(rejected)],
        rawText: String(rawText ?? "").trim()
    };
}

function applyScreenshotExtraction(prefix, extraction, ocrConfidence) {
    const ui = screenshotElements(prefix);
    const detectedCount = extraction.detected.length;

    ui.readout.hidden = false;
    ui.ocrText.textContent = extraction.rawText || "No text detected.";

    if (detectedCount < 2) {
        ui.readoutText.textContent =
            `Darkstorm could not confidently map enough item data to replace the current fields. OCR text confidence: ${Math.round(ocrConfidence)}%. Review the detected text and enter the item manually for now.`;
        return false;
    }

    setGear(prefix, extraction.fields);
    prototypeState.lastGearComparison = null;
    prototypeState.candidateEquipped = false;
    resetGearVerdict();
    markUnsaved();

    const inferredText = extraction.inferred.length
        ? ` ${extraction.inferred.join(", ")} was inferred rather than read.`
        : "";
    const rejectedText = extraction.rejected?.length
        ? ` Skipped as uncertain: ${extraction.rejected.join(", ")}.`
        : "";

    ui.readoutText.textContent =
        `Detected: ${extraction.detected.join(", ")}. OCR text confidence: ${Math.round(ocrConfidence)}%. Fields Darkstorm could not confidently map were left blank or zero.${rejectedText}${inferredText} Review the fields before Compare Gear.`;

    return true;
}

function extractionQuality(extraction) {
    const fields = extraction?.fields ?? {};
    let score = 0;

    if (fields.name) score += 2;
    if (fields.itemType) score += 1;
    if (fields.itemPower) score += 2;
    if (fields.armor) score += 2;
    if (fields.life) score += 2;
    if (fields.damage) score += 2;
    if (fields.affixes) score += 2;
    if (fields.power) score += 1;
    if (fields.sockets) score += 1;
    if (fields.masterwork) score += 1;

    return score;
}

function shouldRunEnhancedRead(extraction) {
    const fields = extraction?.fields ?? {};
    return (
        extractionQuality(extraction) < 8 ||
        !fields.itemPower ||
        (!fields.armor && !fields.damage)
    );
}

function mergeScreenshotExtractions(primary, enhanced) {
    const merged = {
        fields: { ...primary.fields },
        detected: [...new Set(primary.detected ?? [])],
        inferred: [...new Set(primary.inferred ?? [])],
        rejected: [...new Set(primary.rejected ?? [])],
        rawText: primary.rawText ?? ""
    };

    const fieldLabels = {
        name: "Name",
        itemType: "Item type",
        itemPower: "Item power",
        armor: "Armor",
        life: "Maximum Life",
        damage: "Damage",
        power: "Aspect / unique power",
        affixes: "Affixes",
        masterwork: "Masterwork",
        sockets: "Sockets"
    };

    Object.entries(enhanced.fields ?? {}).forEach(([key, value]) => {
        const current = merged.fields[key];
        const isMissing = current === "" || current === 0 || current == null;
        const hasValue = value !== "" && value !== 0 && value != null;

        if (isMissing && hasValue) {
            merged.fields[key] = value;
            const label = fieldLabels[key];
            if (label) merged.detected.push(label);
        } else if (key === "affixes" && value && current) {
            const combined = [
                ...String(current).split("\n"),
                ...String(value).split("\n")
            ].filter(Boolean);
            merged.fields.affixes = [...new Set(combined)].join("\n");
        }
    });

    merged.detected = [...new Set(merged.detected)];
    merged.inferred = [...new Set([
        ...merged.inferred,
        ...(enhanced.inferred ?? [])
    ])];
    merged.rejected = [...new Set([
        ...merged.rejected,
        ...(enhanced.rejected ?? [])
    ])];

    merged.rawText = [
        primary.rawText,
        enhanced.rawText
            ? "\n\n--- Enhanced item-card pass ---\n" + enhanced.rawText
            : ""
    ].join("");

    return merged;
}

async function createEnhancedOcrSource(file) {
    const bitmap = await createImageBitmap(file);

    try {
        const cropWidth = Math.max(1, Math.floor(bitmap.width * 0.86));
        const cropHeight = Math.max(1, Math.floor(bitmap.height * 0.92));
        const scale = Math.min(2, Math.max(1.35, 2200 / cropWidth));

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(cropWidth * scale);
        canvas.height = Math.floor(cropHeight * scale);

        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(
            bitmap,
            0, 0, cropWidth, cropHeight,
            0, 0, canvas.width, canvas.height
        );

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        for (let index = 0; index < pixels.length; index += 4) {
            const luminance =
                (pixels[index] * 0.299) +
                (pixels[index + 1] * 0.587) +
                (pixels[index + 2] * 0.114);

            const inverted = 255 - luminance;
            const contrasted = Math.max(
                0,
                Math.min(255, ((inverted - 128) * 1.55) + 128)
            );

            pixels[index] = contrasted;
            pixels[index + 1] = contrasted;
            pixels[index + 2] = contrasted;
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
    } finally {
        bitmap.close?.();
    }
}

async function readItemScreenshot(prefix) {
    const screenshot = prototypeState.screenshots[prefix];
    const ui = screenshotElements(prefix);

    if (!screenshot?.file) {
        window.alert("Choose an item screenshot first.");
        return;
    }

    if (!window.Tesseract?.recognize) {
        ui.readout.hidden = false;
        ui.readoutText.textContent =
            "The screenshot reader did not load. Check the internet connection, refresh the page, and try again.";
        return;
    }

    ui.read.disabled = true;
    ui.read.textContent = "Reading…";
    ui.remove.disabled = true;
    ui.dropZone.classList.add("reading");
    resetScreenshotReadout(prefix);

    try {
        const result = await window.Tesseract.recognize(
            screenshot.file,
            "eng",
            {
                logger: message => {
                    if (message.status === "recognizing text") {
                        const percent = Math.round((message.progress ?? 0) * 100);
                        ui.status.textContent = `Reading ${percent}%`;
                    } else if (message.status) {
                        ui.status.textContent = "Preparing reader…";
                    }
                }
            }
        );

        const rawText = result?.data?.text ?? "";
        let ocrConfidence = Number(result?.data?.confidence ?? 0);
        let extraction = parseDiabloItemText(
            rawText,
            el.comparisonSlot.value
        );
        let enhancedUsed = false;

        if (shouldRunEnhancedRead(extraction)) {
            ui.status.textContent = "Trying enhanced item-card read…";

            try {
                const enhancedSource = await createEnhancedOcrSource(
                    screenshot.file
                );
                const enhancedResult = await window.Tesseract.recognize(
                    enhancedSource,
                    "eng"
                );
                const enhancedText = enhancedResult?.data?.text ?? "";
                const enhancedConfidence = Number(
                    enhancedResult?.data?.confidence ?? 0
                );
                const enhancedExtraction = parseDiabloItemText(
                    enhancedText,
                    el.comparisonSlot.value
                );

                extraction = mergeScreenshotExtractions(
                    extraction,
                    enhancedExtraction
                );
                ocrConfidence = Math.max(
                    ocrConfidence,
                    enhancedConfidence
                );
                enhancedUsed = true;
            } catch (enhancedError) {
                console.warn(
                    "Darkstorm enhanced screenshot read failed:",
                    enhancedError
                );
            }
        }

        applyScreenshotExtraction(prefix, extraction, ocrConfidence);
        ui.status.textContent = enhancedUsed
            ? `OCR ${Math.round(ocrConfidence)}% · enhanced review`
            : `OCR ${Math.round(ocrConfidence)}% · review`;
    } catch (error) {
        console.error("Darkstorm screenshot read failed:", error);
        ui.readout.hidden = false;
        ui.readoutText.textContent =
            "Darkstorm could not read this screenshot. Try a tighter crop around the item card or enter the item manually.";
        ui.ocrText.textContent = "";
        ui.status.textContent = "Read failed";
    } finally {
        ui.read.disabled = false;
        ui.read.textContent = "Read Screenshot";
        ui.remove.disabled = false;
        ui.dropZone.classList.remove("reading");
    }
}

function wireScreenshotIntake() {
    SCREENSHOT_PREFIXES.forEach(prefix => {
        const ui = screenshotElements(prefix);
        if (!ui.input || !ui.dropZone) return;

        ui.input.addEventListener("change", event => {
            setItemScreenshot(prefix, event.target.files?.[0]);
        });

        ui.read.addEventListener("click", () => {
            readItemScreenshot(prefix);
        });

        ui.remove.addEventListener("click", () => {
            clearItemScreenshot(prefix);
        });

        ["dragenter", "dragover"].forEach(eventName => {
            ui.dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                ui.dropZone.classList.add("drag-over");
            });
        });

        ["dragleave", "drop"].forEach(eventName => {
            ui.dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                ui.dropZone.classList.remove("drag-over");
            });
        });

        ui.dropZone.addEventListener("drop", event => {
            const imageFile = Array.from(event.dataTransfer?.files ?? [])
                .find(file => !file.type || file.type.startsWith("image/"));

            if (imageFile) {
                setItemScreenshot(prefix, imageFile);
            }
        });
    });
}

function hasTemporaryScreenshots() {
    return SCREENSHOT_PREFIXES.some(prefix => prototypeState.screenshots[prefix]);
}

function getGear(prefix) {
    return {
        name: el[prefix + "Name"].value.trim() || "Unnamed item",
        itemType: el[prefix + "ItemType"].value.trim(),
        itemPower: numberValue(el[prefix + "ItemPower"]),
        armor: numberValue(el[prefix + "Armor"]),
        life: numberValue(el[prefix + "Life"]),
        defense: numberValue(el[prefix + "Defense"]),
        damage: numberValue(el[prefix + "Damage"]),
        power: el[prefix + "Power"].value.trim(),
        affixes: el[prefix + "Affixes"].value.trim(),
        tempers: el[prefix + "Tempers"].value.trim(),
        masterwork: numberValue(el[prefix + "Masterwork"]),
        sockets: numberValue(el[prefix + "Sockets"])
    };
}

function getCharacterFromForm() {
    return {
        schemaVersion: "0.2d",
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
            skillSlots: getSkillSlotsFromForm(),
            notes: el.buildNotes.value.trim()
        },
        gear: {
            loadout: getLoadoutFromForm(),
            comparisonSlot: el.comparisonSlot.value,
            equipped: getGear("equipped"),
            candidate: getGear("candidate")
        },
        feedback: {
            result: prototypeState.feedbackResult,
            notes: el.feedbackNotes.value.trim()
        }
    };
}

function setGear(prefix, gear) {
    el[prefix + "Name"].value = gear?.name ?? "";
    el[prefix + "ItemType"].value = gear?.itemType ?? "";
    el[prefix + "ItemPower"].value = gear?.itemPower ?? 0;
    el[prefix + "Armor"].value = gear?.armor ?? 0;
    el[prefix + "Life"].value = gear?.life ?? 0;
    el[prefix + "Defense"].value = gear?.defense ?? 0;
    el[prefix + "Damage"].value = gear?.damage ?? 0;
    el[prefix + "Power"].value = gear?.power ?? "";
    el[prefix + "Affixes"].value = gear?.affixes ?? "";
    el[prefix + "Tempers"].value = gear?.tempers ?? "";
    el[prefix + "Masterwork"].value = gear?.masterwork ?? 0;
    el[prefix + "Sockets"].value = gear?.sockets ?? 0;
}

function populateForm(character) {
    clearAllItemScreenshots();

    el.characterName.value = character.profile?.name ?? "";
    el.className.value = character.profile?.className ?? "Necromancer";
    el.realm.value = character.profile?.realm ?? "Seasonal";
    el.level.value = character.profile?.level ?? 60;
    el.difficulty.value = character.profile?.difficulty ?? "";
    el.goal.value = character.profile?.goal ?? "balanced";

    el.archetype.value = character.build?.archetype ?? "";
    el.problem.value = character.build?.problem ?? "unsure";
    setSkillSlots(character);
    el.buildNotes.value = character.build?.notes ?? "";

    const legacyEquippedChest = character.gear?.equipped ?? {};
    const loadout = { ...(character.gear?.loadout ?? {}) };

    if (!loadout.chest?.name && legacyEquippedChest?.name) {
        loadout.chest = {
            ...emptyLoadoutItem(),
            ...legacyEquippedChest
        };
    }

    setLoadout(loadout);
    el.comparisonSlot.value = character.gear?.comparisonSlot ?? "chest";
    const selectedEquipped = loadout[el.comparisonSlot.value] ?? {};
    setGear("equipped", character.gear?.equipped ?? selectedEquipped);
    setGear("candidate", character.gear?.candidate ?? {});

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
    "decrepify"
];

const MINION_SKILL_MARKERS = [
    "raise skeleton",
    "skeleton warrior",
    "skeleton mage",
    "golem",
    "army of the dead"
];

function buildIdentityFor(character) {
    const className = character.profile.className;
    const archetype = character.build.archetype.trim().toLowerCase();
    const activeSkills = activeSkillsFor(character);
    const normalizedSkills = activeSkills.map(skill => skill.toLowerCase());

    if (className !== "Necromancer") {
        return {
            key: "generic",
            label: `${className} · unclassified`,
            confidence: 35,
            evidence: activeSkills.length
                ? `${activeSkills.length} structured skill slot(s) recorded.`
                : "No active skill evidence yet.",
            warning: null
        };
    }

    const minionSignals = normalizedSkills.filter(skill =>
        MINION_SKILL_MARKERS.some(marker => skill.includes(marker))
    );
    const claimsMinion = /minion|summon/.test(archetype);

    if (claimsMinion && minionSignals.length === 0) {
        return {
            key: "minion-necromancer-unverified",
            label: "Minion Necromancer · unverified",
            confidence: 30,
            evidence: "The archetype says Minion/Summoner, but the six active skill slots contain no recognized minion skill signal.",
            warning: "The archetype says Minion/Summoner, but Darkstorm cannot find a recognized minion skill in the active slots. Verify the skill bar before optimization."
        };
    }

    if (minionSignals.length >= 2) {
        return {
            key: "minion-necromancer",
            label: claimsMinion
                ? "Minion Necromancer · confirmed"
                : "Minion Necromancer · inferred",
            confidence: claimsMinion ? 95 : 82,
            evidence: `Recognized ${minionSignals.length} minion skill signals: ${minionSignals.join(", ")}.`,
            warning: null
        };
    }

    if (claimsMinion && minionSignals.length === 1) {
        return {
            key: "minion-necromancer",
            label: "Minion Necromancer · partial",
            confidence: 72,
            evidence: `The archetype says Minion/Summoner and Darkstorm recognized ${minionSignals[0]}.`,
            warning: null
        };
    }

    return {
        key: "necromancer-unclassified",
        label: "Necromancer · unclassified",
        confidence: 45,
        evidence: activeSkills.length
            ? "The skill bar is structured, but it does not yet match the prototype's Minion Necromancer reference pattern."
            : "No active skill evidence yet.",
        warning: null
    };
}

function updateBuildIdentityUI(character = getCharacterFromForm()) {
    const identity = buildIdentityFor(character);
    const badge = document.getElementById("buildIdentityBadge");
    const warning = document.getElementById("buildIdentityWarning");
    const warningText = document.getElementById("buildIdentityWarningText");

    if (badge) {
        badge.textContent = `Build identity: ${identity.label}`;
        badge.title = identity.evidence;
    }

    if (warning && warningText) {
        if (identity.warning) {
            warning.hidden = false;
            warningText.textContent = identity.warning;
        } else {
            warning.hidden = true;
            warningText.textContent = "";
        }
    }

    return identity;
}

function classKnowledgeFor(character) {
    const className = character.profile.className;
    const identity = buildIdentityFor(character);

    if (className === "Necromancer" && identity.key === "minion-necromancer") {
        return {
            label: "Reference implementation",
            confidenceCap: Math.min(100, identity.confidence)
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
        ...activeSkillsFor(character)
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
    updateBuildIdentityUI(character);

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
    SKILL_SLOT_IDS.forEach(id => {
        el[id].value = "";
    });
    updateSkillSlotStatus();
    el.buildNotes.value = "";

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

    const slotKey = el.comparisonSlot.value;
    const slotLabel = comparisonSlotLabel(slotKey);

    const comparison = {
        verdict,
        delta,
        equippedScore,
        candidateScore,
        goal: character.profile.goal,
        slotKey,
        slotLabel
    };

    prototypeState.lastGearComparison = comparison;

    const verdictEl = document.getElementById("gearVerdict");
    const reasonEl = document.getElementById("gearReason");
    const equipButton = document.getElementById("equipCandidateButton");

    verdictEl.textContent = verdict;

    const direction = delta >= 0 ? "higher" : "lower";
    const absoluteDelta = Math.abs(Math.round(delta));

    reasonEl.textContent =
        `${candidate.name} scores ${absoluteDelta} prototype points ${direction} than ${equipped.name} in the ${slotLabel} slot for the current "${character.profile.goal}" goal. This is a test heuristic, not a live Diablo IV damage calculator.`;

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
    const slotKey = el.comparisonSlot.value;
    setGear("equipped", candidate);
    setLoadoutItem(slotKey, {
        ...emptyLoadoutItem(),
        ...candidate
    });
    promoteCandidateScreenshotToEquipped();
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
    const identity = buildIdentityFor(character);

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
            title: "Keep the gear change and reassess the build.",
            summary: "The gear test produced a positive result, so Darkstorm can reassess the character before proposing another change.",
            why: "The candidate item improved the player's reported experience.",
            whyNow: "The gear question has enough evidence to stop consuming attention for the moment.",
            whyNot: "Another immediate gear swap would add noise before the current improvement is established.",
            changes: "If survivability or clear speed falls off again, gear returns to the priority list.",
            confidence: 86
        };
    }

    if (gearComparison?.verdict === "SWAP" && !prototypeState.candidateEquipped) {
        return {
            title: `Test the candidate ${(gearComparison.slotLabel ?? "item").toLowerCase()}.`,
            summary: "Darkstorm found a candidate that better matches the current goal using the prototype heuristic.",
            why: "The candidate scores meaningfully better for the selected priority.",
            whyNow: "It is a reversible change with a clear before-and-after test.",
            whyNot: "Changing skills at the same time would make the result harder to interpret.",
            changes: "If the candidate feels worse in play, revert it regardless of the prototype score.",
            confidence: 82
        };
    }

    if (problem === "survivability" || goal === "survivability") {
        if (identity.key === "minion-necromancer") {
            return {
                title: "Stabilize player survivability without disturbing the minion core.",
                summary: `Darkstorm recognized a ${identity.label.toLowerCase()} from the structured skill bar. The current bottleneck is defensive consistency, not build identity.`,
                why: "The active skill structure already commits multiple slots to the minion package, so the safer first test is improving the player's durability while preserving that core.",
                whyNow: "Changing the skill package and defensive setup at the same time would make it harder to tell which change solved the reported survivability problem.",
                whyNot: "A broad offensive rebuild is lower priority while the player is still reporting deaths as the limiting problem.",
                changes: "If survivability becomes stable across repeated runs, Darkstorm can shift attention toward clear speed, damage, or another controlled build change.",
                confidence: 84
            };
        }

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
            whyNot: "Skill changes should wait until a simpler reversible test is exhausted.",
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
    const identity = buildIdentityFor(character);
    const knowledge = classKnowledgeFor(character);

    let recommendation;

    if (mismatch) {
        recommendation = {
            title: "Review the build snapshot before continuing.",
            summary: mismatch,
            why: "Darkstorm found character data that appears to belong to a different class.",
            whyNow: "Using incompatible class data would make later recommendations unreliable.",
            whyNot: "Darkstorm should not guess how to translate skills or archetypes between classes.",
            changes: "Reset or correct the build snapshot so it matches the selected class, then analyze again.",
            confidence: 98
        };
    } else if (identity.warning) {
        recommendation = {
            title: "Verify the build identity before optimizing.",
            summary: identity.warning,
            why: "Darkstorm now uses the structured skill slots as evidence instead of trusting the typed archetype by itself.",
            whyNow: "If the archetype and active skills disagree, gear recommendations could optimize the wrong build.",
            whyNot: "Darkstorm should not silently assume the typed build name is correct when the skill bar provides conflicting evidence.",
            changes: "Correct the archetype or active skill slots, then analyze again.",
            confidence: 94
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
    document.getElementById("saveStatus").textContent = hasTemporaryScreenshots()
        ? "Saved locally · screenshots temporary"
        : "Saved locally";
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
            skillSlots: ["", "", "", "", "", ""],
            notes: ""
        },
        gear: {
            loadout: {},
            comparisonSlot: "chest",
            equipped: {},
            candidate: {}
        },
        feedback: {
            result: null,
            notes: ""
        }
    });

    document.getElementById("recommendationTitle").textContent =
        "Load a character and analyze the build.";
    document.getElementById("recommendationSummary").textContent =
        "Darkstorm will use the character, build, gear, goal, and test feedback below.";
    document.getElementById("whyText").textContent = "Waiting for analysis.";
    document.getElementById("whyNowText").textContent = "Waiting for analysis.";
    document.getElementById("whyNotText").textContent = "Waiting for analysis.";
    document.getElementById("changesText").textContent = "Waiting for analysis.";
    document.getElementById("confidenceBadge").textContent = "Confidence: --";
}

renderEquipmentLoadout();
wireScreenshotIntake();

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
document.getElementById("loadSlotFromLoadoutButton").addEventListener("click", loadSelectedSlotFromLoadout);
el.comparisonSlot.addEventListener("change", () => {
    clearAllItemScreenshots();
    loadSelectedSlotFromLoadout();
    setGear("candidate", {});
});
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
["archetype", ...SKILL_SLOT_IDS].forEach(id => {
    el[id].addEventListener("input", updateClassAwareness);
});

SKILL_SLOT_IDS.forEach(id => {
    el[id].addEventListener("input", updateSkillSlotStatus);
});

document.querySelectorAll('input:not([type="file"]), select, textarea').forEach(input => {
    input.addEventListener("change", markUnsaved);
});

window.addEventListener("beforeunload", () => {
    SCREENSHOT_PREFIXES.forEach(prefix => {
        const screenshot = prototypeState.screenshots[prefix];
        if (screenshot?.url) {
            URL.revokeObjectURL(screenshot.url);
        }
    });
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
