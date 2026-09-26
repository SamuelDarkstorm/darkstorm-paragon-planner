// Darkstorm Prototype 0.3
// Complete-player-loop controller.
// This is intentionally simple and readable so the prototype can be rebuilt deliberately later.

const STORAGE_KEY = "darkstorm-prototype-v0.3";

const prototypeState = {
    feedbackResult: null,
    lastGearComparison: null,
    candidateEquipped: false,
    screenshots: {
        equipped: null,
        candidate: null
    },
    screenshotItemTypes: {
        equipped: "",
        candidate: ""
    },
    itemConfirmed: {
        equipped: false,
        candidate: false
    },
    continuations: {
        equipped: null,
        candidate: null
    },
    screenshotIncomplete: {
        equipped: false,
        candidate: false
    },
    baseScreenshotExtractions: {
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
    { key: "rarity", label: "Rarity / Quality", type: "text" },
    { key: "itemType", label: "Item Type", type: "text" },
    { key: "itemPower", label: "Item Power", type: "number", min: 0 },
    { key: "armor", label: "Armor", type: "number", min: 0 },
    { key: "life", label: "Maximum Life", type: "number", min: 0 },
    { key: "defense", label: "Resistance / DR", type: "number", min: 0 },
    { key: "damage", label: "Damage Value", type: "number", min: 0 },
    { key: "requiredLevel", label: "Required Level", type: "number", min: 0, max: 100 },
    { key: "power", label: "Aspect / Unique Power", type: "text", wide: true },
    { key: "powerValue", label: "Power Roll", type: "text" },
    { key: "powerMin", label: "Power Roll Low", type: "text" },
    { key: "powerMax", label: "Power Roll High", type: "text" },
    { key: "affixes", label: "Affixes + Visible Ranges", type: "textarea", wide: true },
    { key: "tempers", label: "Temper Status / Notes", type: "textarea", wide: true },
    { key: "masterwork", label: "Masterwork", type: "number", min: 0, max: 12 },
    { key: "sockets", label: "Sockets", type: "number", min: 0, max: 2 },
    { key: "socketContents", label: "Socket Contents", type: "text", wide: true }
];

function emptyLoadoutItem() {
    return {
        name: "",
        rarity: "",
        itemType: "",
        itemPower: 0,
        armor: 0,
        baseArmor: 0,
        life: 0,
        defense: 0,
        damage: 0,
        requiredLevel: 0,
        power: "",
        powerValue: "",
        powerMin: "",
        powerMax: "",
        affixes: "",
        affixDetails: [],
        tempers: "",
        masterwork: 0,
        sockets: 0,
        socketContents: ""
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

    if (itemConfirmationRequired("equipped")) {
        invalidateItemConfirmation("equipped", { resetComparison: false });
    }

    prototypeState.lastGearComparison = null;
    prototypeState.candidateEquipped = false;
    resetGearVerdict();
    markUnsaved();
}


const SKILL_SLOT_IDS = ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6"];

const GEAR_FIELD_SUFFIXES = [
    "Name", "Rarity", "ItemType", "ItemPower", "Armor", "Damage",
    "RequiredLevel", "Power", "PowerValue", "PowerMin", "PowerMax",
    "Tempers", "Masterwork", "Sockets", "SocketContents"
];

const MAX_AFFIX_ROWS = 6;

const ids = [
    "characterName", "className", "realm", "level", "difficulty", "goal",
    "archetype", "problem", ...SKILL_SLOT_IDS, "buildNotes", "comparisonSlot",
    "equippedName", "equippedRarity", "equippedItemType", "equippedItemPower", "equippedArmor",
    "equippedDamage", "equippedRequiredLevel", "equippedPower", "equippedPowerValue",
    "equippedPowerMin", "equippedPowerMax", "equippedTempers", "equippedMasterwork",
    "equippedSockets", "equippedSocketContents",
    "candidateName", "candidateRarity", "candidateItemType", "candidateItemPower", "candidateArmor",
    "candidateDamage", "candidateRequiredLevel", "candidatePower", "candidatePowerValue",
    "candidatePowerMin", "candidatePowerMax", "candidateTempers", "candidateMasterwork",
    "candidateSockets", "candidateSocketContents",
    "feedbackNotes"
];

const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

function affixFieldId(prefix, index, key) {
    return prefix + "Affix" + (index + 1) + key;
}

function renderGearAffixRows() {
    SCREENSHOT_PREFIXES.forEach(prefix => {
        const container = document.getElementById(prefix + "AffixRows");
        if (!container) return;

        container.innerHTML = "";

        for (let index = 0; index < MAX_AFFIX_ROWS; index += 1) {
            const row = document.createElement("div");
            row.className = "affix-row";

            const rowNumber = document.createElement("span");
            rowNumber.className = "affix-row-number";
            rowNumber.textContent = String(index + 1);
            row.append(rowNumber);

            [
                ["Stat", "Stat name"],
                ["Value", "Value"],
                ["Min", "Roll low"],
                ["Max", "Roll high"]
            ].forEach(([key, placeholder]) => {
                const input = document.createElement("input");
                input.id = affixFieldId(prefix, index, key);
                input.type = "text";
                input.placeholder = placeholder;
                input.setAttribute("aria-label", prefix + " affix " + (index + 1) + " " + placeholder);

                input.addEventListener("input", () => {
                    if (itemConfirmationRequired(prefix)) {
                        invalidateItemConfirmation(prefix);
                        updateGearSlotMismatchUI();
                    }
                    markUnsaved();
                });

                row.append(input);
            });

            container.append(row);
        }
    });
}

function getAffixDetails(prefix) {
    const details = [];

    for (let index = 0; index < MAX_AFFIX_ROWS; index += 1) {
        const stat = document.getElementById(affixFieldId(prefix, index, "Stat"))?.value.trim() ?? "";
        const value = document.getElementById(affixFieldId(prefix, index, "Value"))?.value.trim() ?? "";
        const min = document.getElementById(affixFieldId(prefix, index, "Min"))?.value.trim() ?? "";
        const max = document.getElementById(affixFieldId(prefix, index, "Max"))?.value.trim() ?? "";

        if (stat || value || min || max) {
            details.push({ stat, value, min, max });
        }
    }

    return details;
}

function formatAffixDetails(details = []) {
    return details
        .filter(detail => detail?.stat || detail?.value)
        .map(detail => {
            const value = String(detail.value ?? "").trim();
            const stat = String(detail.stat ?? "").trim();
            const min = String(detail.min ?? "").trim();
            const max = String(detail.max ?? "").trim();
            const range = min || max
                ? " [" + (min || "?") + " - " + (max || "?") + "]"
                : "";

            return (value + " " + stat + range).trim();
        })
        .join("\n");
}

function setAffixDetails(prefix, details = []) {
    const normalized = Array.isArray(details) ? details.slice(0, MAX_AFFIX_ROWS) : [];

    for (let index = 0; index < MAX_AFFIX_ROWS; index += 1) {
        const detail = normalized[index] ?? {};
        const values = {
            Stat: detail.stat ?? "",
            Value: detail.value ?? "",
            Min: detail.min ?? "",
            Max: detail.max ?? ""
        };

        Object.entries(values).forEach(([key, value]) => {
            const input = document.getElementById(affixFieldId(prefix, index, key));
            if (input) input.value = value;
        });
    }
}

function numericAffixValue(detail) {
    return decimalFromOcr(String(detail?.value ?? ""));
}

function affixValueFor(details, pattern) {
    return details
        .filter(detail => pattern.test(String(detail?.stat ?? "")))
        .reduce((sum, detail) => sum + numericAffixValue(detail), 0);
}

function itemDisplayName(item, fallback = "Item") {
    const name = String(item?.name ?? "").trim();
    if (name) return name;

    const descriptor = [item?.rarity, item?.itemType]
        .map(value => String(value ?? "").trim())
        .filter(Boolean)
        .join(" ");

    return descriptor || fallback;
}

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
        ocrText: document.getElementById(`${prefix}ScreenshotOcrText`),
        continuationInput: document.getElementById(`${prefix}ContinuationInput`),
        continuationLabel: document.getElementById(`${prefix}ContinuationLabel`),
        continuationRead: document.getElementById(`${prefix}ContinuationRead`),
        continuationNotice: document.getElementById(`${prefix}ContinuationNotice`),
        continuationNoticeText: document.getElementById(`${prefix}ContinuationNoticeText`)
    };
}

function extractionShowsScroll(extraction) {
    return /\bScroll\s+(?:Down|Up)\b/i.test(extraction?.rawText ?? "");
}

function updateContinuationUI(prefix) {
    const ui = screenshotElements(prefix);
    const incomplete = Boolean(prototypeState.screenshotIncomplete[prefix]);
    const continuation = prototypeState.continuations[prefix];

    if (ui.continuationNotice) ui.continuationNotice.hidden = !incomplete;
    if (ui.continuationLabel) ui.continuationLabel.hidden = !incomplete;
    if (ui.continuationRead) {
        ui.continuationRead.hidden = !incomplete;
        ui.continuationRead.disabled = !continuation?.file;
        ui.continuationRead.textContent = continuation?.file
            ? "Read continuation"
            : "Read continuation";
    }
    if (ui.continuationNoticeText && incomplete) {
        ui.continuationNoticeText.textContent = continuation?.file
            ? `Continuation selected: ${continuation.fileName}. Read it to merge this item's remaining data.`
            : "Darkstorm detected a scrollable tooltip. Add the scrolled continuation before confirming this item.";
    }
}

function clearContinuation(prefix) {
    const continuation = prototypeState.continuations[prefix];
    if (continuation?.url) URL.revokeObjectURL(continuation.url);
    prototypeState.continuations[prefix] = null;
    prototypeState.screenshotIncomplete[prefix] = false;
    const ui = screenshotElements(prefix);
    if (ui.continuationInput) ui.continuationInput.value = "";
    updateContinuationUI(prefix);
}

function setContinuationScreenshot(prefix, file) {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
        window.alert("Please choose an image file for the continuation screenshot.");
        return;
    }

    const previous = prototypeState.continuations[prefix];
    if (previous?.url) URL.revokeObjectURL(previous.url);

    prototypeState.continuations[prefix] = {
        file,
        url: URL.createObjectURL(file),
        fileName: file.name || "Continuation screenshot",
        size: file.size || 0,
        type: file.type || "image"
    };
    prototypeState.itemConfirmed[prefix] = false;
    updateContinuationUI(prefix);
    updateItemConfirmationUI(prefix);
}

function sameItemContinuationCheck(prefix, baseExtraction, continuationExtraction) {
    const current = getGear(prefix);
    const next = continuationExtraction?.fields ?? {};
    const conflicts = [];

    if (current.itemPower && next.itemPower && current.itemPower !== next.itemPower) {
        conflicts.push("item power");
    }
    if (
        current.itemType && next.itemType &&
        normalizedItemName(current.itemType) !== normalizedItemName(next.itemType)
    ) {
        conflicts.push("item type");
    }

    return { ok: conflicts.length === 0, conflicts };
}

function continuationPowerFragment(rawText) {
    const lines = cleanedOcrLines(rawText);
    const stop = /\b(?:properties lost when equipped|requires level|sell value|durability|tempers?)\b/i;

    for (let start = 0; start < lines.length; start += 1) {
        const collected = [];
        for (let index = start; index < lines.length && collected.length < 8; index += 1) {
            if (index > start && stop.test(lines[index])) break;
            collected.push(lines[index]);
        }
        const text = cleanPowerText(collected.join(" "));
        if (!/\b(?:vampiric\s+curse|army\s+of\s+the\s+dead|souls?|soul\s+unleashed)\b/i.test(text)) continue;

        const range = decimalRangeFromLine(text);
        if (!range) continue;
        const percents = [...text.matchAll(/([0-9OIlS,.]+(?:\.[0-9]+)?)\s*%/gi)]
            .map(match => decimalFromOcr(match[1]))
            .filter(value => Number.isFinite(value) && value > 0);
        const roll = percents.find(value => value >= range.low && value <= range.high) ?? 0;
        if (!roll) continue;

        return {
            text,
            roll: String(roll) + "%",
            min: String(range.low) + "%",
            max: String(range.high) + "%"
        };
    }
    return null;
}

function mergeContinuationExtraction(prefix, extraction, ocrConfidence) {
    const current = getGear(prefix);
    const storedBase = prototypeState.baseScreenshotExtractions[prefix];
    const currentExtraction = storedBase
        ? {
            ...storedBase,
            fields: {
                ...storedBase.fields,
                // Form values win when the gamer has already corrected them.
                ...current,
                affixDetails: Array.isArray(current.affixDetails)
                    ? current.affixDetails.map(detail => ({ ...detail }))
                    : []
            }
        }
        : {
            fields: current,
            detected: [],
            inferred: [],
            rejected: [],
            uncertain: [],
            rawText: ""
        };
    const continuationFragment = continuationPowerFragment(extraction.rawText ?? "");
    if (continuationFragment) {
        const existingPower = currentExtraction.fields?.power ?? "";
        const parsedContinuationPower = extraction.fields?.power ?? "";
        extraction.fields.power = [existingPower, parsedContinuationPower, continuationFragment.text]
            .filter(Boolean)
            .filter((value, index, array) => array.indexOf(value) === index)
            .join(" ");
        extraction.fields.power = cleanPowerText(extraction.fields.power);
        extraction.fields.powerValue = extraction.fields.powerValue || continuationFragment.roll;
        extraction.fields.powerMin = extraction.fields.powerMin || continuationFragment.min;
        extraction.fields.powerMax = extraction.fields.powerMax || continuationFragment.max;
    }

    const check = sameItemContinuationCheck(prefix, currentExtraction, extraction);
    const ui = screenshotElements(prefix);

    if (!check.ok) {
        ui.readout.hidden = false;
        ui.readoutText.textContent =
            `Continuation mismatch: ${check.conflicts.join(", ")} conflicts with the current item. Darkstorm did not merge this screenshot.`;
        prototypeState.screenshotIncomplete[prefix] = true;
        updateContinuationUI(prefix);
        return false;
    }

    const merged = mergeScreenshotExtractions(currentExtraction, extraction);

    // Continuations are additive evidence. Never let an empty or partial
    // continuation erase decision data already recovered from the first view.
    const preserveKeys = [
        "name", "rarity", "itemType", "itemPower", "baseArmor", "armor",
        "damage", "requiredLevel", "power", "powerValue", "powerMin",
        "powerMax", "tempers", "masterwork", "sockets", "socketContents"
    ];
    preserveKeys.forEach(key => {
        const existing = current[key];
        const next = merged.fields[key];
        const existingHasValue = existing !== "" && existing !== 0 && existing != null;
        const nextIsMissing = next === "" || next === 0 || next == null;
        if (existingHasValue && nextIsMissing) {
            merged.fields[key] = existing;
        }
    });

    const currentAffixes = Array.isArray(current.affixDetails)
        ? current.affixDetails
        : [];
    const mergedAffixes = Array.isArray(merged.fields.affixDetails)
        ? merged.fields.affixDetails
        : [];
    const additiveAffixes = currentAffixes.map(detail => ({ ...detail }));
    mergedAffixes.forEach(detail => {
        if (!detail?.stat) return;
        const existing = additiveAffixes.find(item =>
            String(item.stat).toLowerCase() === String(detail.stat).toLowerCase()
        );
        if (!existing) {
            if (additiveAffixes.length < MAX_AFFIX_ROWS) additiveAffixes.push({ ...detail });
            return;
        }
        if (!existing.value && detail.value) existing.value = detail.value;
        if (!existing.min && detail.min) existing.min = detail.min;
        if (!existing.max && detail.max) existing.max = detail.max;
    });
    merged.fields.affixDetails = additiveAffixes;
    merged.fields.affixes = formatAffixDetails(additiveAffixes);

    setGear(prefix, merged.fields);
    prototypeState.baseScreenshotExtractions[prefix] = {
        ...merged,
        fields: {
            ...merged.fields,
            affixDetails: Array.isArray(merged.fields?.affixDetails)
                ? merged.fields.affixDetails.map(detail => ({ ...detail }))
                : []
        }
    };
    prototypeState.screenshotItemTypes[prefix] =
        merged.fields.itemType || prototypeState.screenshotItemTypes[prefix] || "";
    prototypeState.itemConfirmed[prefix] = false;
    prototypeState.screenshotIncomplete[prefix] = extractionShowsScroll(extraction) &&
        /\bScroll\s+Down\b/i.test(extraction.rawText ?? "");

    ui.readout.hidden = false;
    ui.ocrText.textContent = [
        ui.ocrText.textContent,
        "",
        "--- Continuation screenshot ---",
        extraction.rawText || "No text detected."
    ].join("\n");
    ui.readoutText.textContent =
        `Continuation merged. OCR text confidence: ${Math.round(ocrConfidence)}%. Review the combined item fields before confirming.`;

    updateContinuationUI(prefix);
    updateItemConfirmationUI(prefix);
    updateGearSlotMismatchUI();
    markUnsaved();
    return true;
}

async function readContinuationScreenshot(prefix) {
    const continuation = prototypeState.continuations[prefix];
    const ui = screenshotElements(prefix);
    if (!continuation?.file) return;

    ui.continuationRead.disabled = true;
    ui.continuationRead.textContent = "Reading continuation…";

    try {
        const result = await window.Tesseract.recognize(continuation.file, "eng");
        const rawText = result?.data?.text ?? "";
        let confidence = Number(result?.data?.confidence ?? 0);
        let extraction = parseDiabloItemText(rawText, el.comparisonSlot.value);

        if (shouldRunEnhancedRead(extraction)) {
            try {
                const enhancedSource = await createEnhancedOcrSource(continuation.file);
                const enhancedResult = await window.Tesseract.recognize(enhancedSource, "eng");
                const enhancedExtraction = parseDiabloItemText(
                    enhancedResult?.data?.text ?? "",
                    el.comparisonSlot.value
                );
                extraction = mergeScreenshotExtractions(extraction, enhancedExtraction);
                confidence = Math.max(confidence, Number(enhancedResult?.data?.confidence ?? 0));
            } catch (error) {
                console.warn("Darkstorm enhanced continuation read failed:", error);
            }
        }

        mergeContinuationExtraction(prefix, extraction, confidence);
    } catch (error) {
        console.error("Darkstorm continuation read failed:", error);
        ui.readout.hidden = false;
        ui.readoutText.textContent =
            "Darkstorm could not read the continuation screenshot. Try a tighter crop or enter the remaining item data manually.";
    } finally {
        ui.continuationRead.textContent = "Read continuation";
        ui.continuationRead.disabled = !prototypeState.continuations[prefix]?.file;
    }
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
    prototypeState.baseScreenshotExtractions[prefix] = null;
    clearContinuation(prefix);

    if (revoke && screenshot?.url) {
        URL.revokeObjectURL(screenshot.url);
    }

    prototypeState.screenshots[prefix] = null;
    prototypeState.screenshotItemTypes[prefix] = "";
    prototypeState.itemConfirmed[prefix] = false;
    resetScreenshotControls(prefix);
    updateItemConfirmationUI(prefix);
    updateGearSlotMismatchUI();
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
    prototypeState.itemConfirmed[prefix] = false;

    renderItemScreenshot(prefix);
    updateItemConfirmationUI(prefix);
}

function promoteCandidateScreenshotToEquipped() {
    const candidateScreenshot = prototypeState.screenshots.candidate;
    const candidateItemType = prototypeState.screenshotItemTypes.candidate;
    const candidateConfirmed = prototypeState.itemConfirmed.candidate;

    clearItemScreenshot("equipped");

    if (!candidateScreenshot) {
        return;
    }

    prototypeState.screenshots.equipped = candidateScreenshot;
    prototypeState.screenshotItemTypes.equipped = candidateItemType;
    prototypeState.itemConfirmed.equipped = candidateConfirmed;
    prototypeState.screenshots.candidate = null;
    prototypeState.screenshotItemTypes.candidate = "";
    prototypeState.itemConfirmed.candidate = false;
    renderItemScreenshot("equipped");
    resetScreenshotControls("candidate");
    updateAllItemConfirmationUI();
    updateGearSlotMismatchUI();
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

function joinNearbyOcrLines(lines, start, count = 3) {
    return lines
        .slice(start, Math.min(lines.length, start + count))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}

function findNearbyOcrValue(lines, labelPattern, startIndex = 0, maxDistance = 8) {
    const end = Math.min(lines.length, startIndex + maxDistance + 1);

    for (let index = Math.max(0, startIndex); index < end; index += 1) {
        for (let count = 1; count <= 3; count += 1) {
            const joined = joinNearbyOcrLines(lines, index, count);
            if (labelPattern.test(joined)) {
                return { line: joined, index };
            }
        }
    }
    return null;
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

function comparisonSlotsForItemType(itemType) {
    const normalized = String(itemType ?? "").trim().toLowerCase();

    if (!normalized) return [];
    if (normalized === "helm") return ["helm"];
    if (normalized === "chest armor" || normalized === "chest") return ["chest"];
    if (normalized === "gloves") return ["gloves"];
    if (normalized === "pants") return ["pants"];
    if (normalized === "boots") return ["boots"];
    if (normalized === "amulet") return ["amulet"];
    if (normalized === "ring") return ["ring1", "ring2"];

    if (/\b(?:focus|shield|totem)\b/i.test(normalized)) {
        return ["offHand"];
    }

    if (/\b(?:sword|axe|mace|dagger|wand|scythe|staff|polearm)\b/i.test(normalized)) {
        return ["mainHand"];
    }

    return [];
}

function preferredComparisonSlot(itemType, currentSlot = el.comparisonSlot?.value) {
    const slots = comparisonSlotsForItemType(itemType);
    if (!slots.length) return null;
    if (currentSlot && slots.includes(currentSlot)) return currentSlot;
    return slots[0];
}

function itemConfirmationRequired(prefix) {
    return Boolean(prototypeState.screenshots[prefix]);
}

function confirmationBlockingState() {
    const pending = SCREENSHOT_PREFIXES.filter(prefix =>
        itemConfirmationRequired(prefix) &&
        !prototypeState.itemConfirmed[prefix]
    );

    return {
        blocking: pending.length > 0,
        pending
    };
}

function syncGearActionAvailability() {
    const mismatch = gearSlotMismatchState();
    const confirmation = confirmationBlockingState();
    const compareButton = document.getElementById("compareGearButton");
    const equipButton = document.getElementById("equipCandidateButton");

    if (compareButton) {
        compareButton.disabled = mismatch.blocking || confirmation.blocking;
    }

    if ((mismatch.blocking || confirmation.blocking) && equipButton) {
        equipButton.disabled = true;
    }

    return { mismatch, confirmation };
}

function updateItemConfirmationUI(prefix) {
    const panel = document.getElementById(`${prefix}ConfirmationPanel`);
    const status = document.getElementById(`${prefix}ConfirmationStatus`);
    const button = document.getElementById(`${prefix}ConfirmButton`);

    if (!panel || !status || !button) return;

    const required = itemConfirmationRequired(prefix);
    const confirmed = prototypeState.itemConfirmed[prefix];

    panel.classList.remove("needs-confirmation", "confirmed");

    if (!required) {
        status.textContent = "No screenshot · not required";
        button.disabled = true;
        button.textContent = prefix === "equipped"
            ? "Confirm Equipped Item Data"
            : "Confirm Candidate Item Data";
    } else if (prototypeState.screenshotIncomplete[prefix]) {
        panel.classList.add("needs-confirmation");
        status.textContent = "Incomplete capture · continuation needed";
        button.disabled = true;
        button.textContent = "Add continuation before confirming";
    } else if (confirmed) {
        panel.classList.add("confirmed");
        status.textContent = "✓ Gamer confirmed";
        button.disabled = false;
        button.textContent = "Confirmed · Reconfirm";
    } else {
        panel.classList.add("needs-confirmation");
        status.textContent = "Needs gamer confirmation";
        button.disabled = false;
        button.textContent = prefix === "equipped"
            ? "Confirm Equipped Item Data"
            : "Confirm Candidate Item Data";
    }

    syncGearActionAvailability();
}

function updateAllItemConfirmationUI() {
    SCREENSHOT_PREFIXES.forEach(updateItemConfirmationUI);
}

function invalidateItemConfirmation(prefix, { resetComparison = true } = {}) {
    prototypeState.itemConfirmed[prefix] = false;

    if (resetComparison) {
        prototypeState.lastGearComparison = null;
        prototypeState.candidateEquipped = false;
        resetGearVerdict();
    }

    updateItemConfirmationUI(prefix);
}

function confirmItemData(prefix) {
    if (!itemConfirmationRequired(prefix)) return;

    const currentType = el[prefix + "ItemType"].value.trim();
    if (currentType) {
        prototypeState.screenshotItemTypes[prefix] = currentType;
    }

    prototypeState.itemConfirmed[prefix] = true;
    prototypeState.lastGearComparison = null;
    prototypeState.candidateEquipped = false;
    resetGearVerdict();
    updateItemConfirmationUI(prefix);
    updateGearSlotMismatchUI();
    markUnsaved();
}

function gearSlotMismatchState() {
    const selectedSlot = el.comparisonSlot?.value;
    const selectedLabel = comparisonSlotLabel(selectedSlot);
    const observations = SCREENSHOT_PREFIXES
        .map(prefix => ({
            prefix,
            label: prefix === "equipped" ? "Equipped" : "Candidate",
            itemType: prototypeState.screenshotItemTypes[prefix]
        }))
        .filter(observation => observation.itemType);

    const mismatches = observations.filter(observation => {
        const allowedSlots = comparisonSlotsForItemType(observation.itemType);
        return allowedSlots.length > 0 && !allowedSlots.includes(selectedSlot);
    });

    const preferredSlots = observations
        .map(observation => preferredComparisonSlot(observation.itemType, selectedSlot))
        .filter(Boolean);

    const uniquePreferred = [...new Set(preferredSlots)];
    const suggestedSlot = uniquePreferred.length === 1
        ? uniquePreferred[0]
        : null;

    return {
        blocking: mismatches.length > 0,
        selectedSlot,
        selectedLabel,
        observations,
        mismatches,
        suggestedSlot
    };
}

function updateGearSlotMismatchUI() {
    const state = gearSlotMismatchState();
    const warning = document.getElementById("gearSlotMismatchWarning");
    const warningText = document.getElementById("gearSlotMismatchText");
    const useDetectedButton = document.getElementById("useDetectedSlotButton");
    const compareButton = document.getElementById("compareGearButton");
    const equipButton = document.getElementById("equipCandidateButton");

    if (!warning || !warningText || !useDetectedButton || !compareButton) {
        return state;
    }

    if (!state.blocking) {
        warning.hidden = true;
        warningText.textContent = "";
        useDetectedButton.hidden = true;
        useDetectedButton.dataset.slot = "";
        syncGearActionAvailability();
        return state;
    }

    const mismatchText = state.mismatches
        .map(observation =>
            `${observation.label} screenshot looks like ${observation.itemType}`
        )
        .join("; ");

    const differentTypes = state.observations.length >= 2 &&
        new Set(
            state.observations.map(observation =>
                comparisonSlotsForItemType(observation.itemType).join("|")
            )
        ).size > 1;

    warning.hidden = false;
    warningText.textContent =
        `Selected comparison slot is ${state.selectedLabel}, but ${mismatchText}. ` +
        (differentTypes
            ? "The screenshots may also be different equipment types. "
            : "") +
        "Darkstorm will not compare them until the slot mismatch is resolved.";

    compareButton.disabled = true;
    if (equipButton) equipButton.disabled = true;

    if (state.suggestedSlot && !differentTypes) {
        useDetectedButton.hidden = false;
        useDetectedButton.dataset.slot = state.suggestedSlot;
        useDetectedButton.textContent =
            `Use ${comparisonSlotLabel(state.suggestedSlot)}`;
    } else {
        useDetectedButton.hidden = true;
        useDetectedButton.dataset.slot = "";
    }

    syncGearActionAvailability();
    return state;
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

function normalizedItemName(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function parseItemName(lines, rarityIndex) {
    if (rarityIndex <= 0) {
        return { value: "", confident: false };
    }

    // Item names are much noisier than numeric stats. Stay conservative:
    // only inspect the lines immediately above the rarity/type line and
    // prefer a blank field over combining unrelated UI text into a fake name.
    const blacklist = /(?:equipped|character|stats|materials|no title|weapon damage|toughness|strength|intelligence|willpower|dexterity|equipment|dungeon keys|slot transmog|hide transmog|mark as favorite|primal|ancestral|sacred|legendary|unique|rare|magic|item power|armor|damage per second)/i;
    const candidates = [];
    const windowStart = Math.max(0, rarityIndex - 3);

    for (let index = windowStart; index < rarityIndex; index += 1) {
        const line = lines[index].trim();
        if (!line || blacklist.test(line)) continue;
        if (/\d|%|\[|\]|:|[{}<>|]/.test(line)) continue;

        const letters = (line.match(/[A-Za-z]/g) ?? []).length;
        const usefulCharacters = line.replace(/\s/g, "").length;
        if (!usefulCharacters || letters / usefulCharacters < 0.82) continue;
        if (!/^[A-Za-z][A-Za-z'’& -]{1,42}$/.test(line)) continue;

        const words = line.split(/\s+/).filter(Boolean);
        if (words.length > 6) continue;

        candidates.push({ line, index });
    }

    if (!candidates.length) {
        return { value: "", confident: false };
    }

    const nearest = candidates[candidates.length - 1];
    const distanceToRarity = rarityIndex - nearest.index;

    // A trustworthy item name should sit directly above the rarity/type line.
    if (distanceToRarity > 2) {
        return { value: "", confident: false };
    }

    // If two adjacent title-like lines appear immediately above the rarity
    // line, allow a wrapped name. Never join more than two lines.
    const previous = candidates[candidates.length - 2];
    let value = nearest.line;

    if (
        previous &&
        nearest.index === rarityIndex - 1 &&
        previous.index === rarityIndex - 2
    ) {
        const combined = `${previous.line} ${nearest.line}`.trim();
        const combinedWords = combined.split(/\s+/).filter(Boolean);

        if (combined.length <= 48 && combinedWords.length <= 7) {
            value = combined;
        }
    }

    return {
        value,
        confident: Boolean(value)
    };
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

function decimalRangeFromLine(line) {
    const match = String(line ?? "").match(
        /[\[(]\s*([0-9OIlS,.]{1,12})\s*[-–]\s*([0-9OIlS,.]{1,12})\s*[\])]/i
    );

    if (!match) return null;

    const low = decimalFromOcr(match[1]);
    const high = decimalFromOcr(match[2]);

    if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= 0) {
        return null;
    }

    return { low: Math.min(low, high), high: Math.max(low, high) };
}

function rangeFromLine(line) {
    const range = decimalRangeFromLine(line);
    if (!range) return null;
    return {
        low: Math.round(range.low),
        high: Math.round(range.high)
    };
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

function nearbyUnsignedHeaderValue(lines, labelPattern, labelIndex, min, max) {
    const candidates = [];

    // Header OCR may put "850" and "Item Power" on separate adjacent lines.
    // Stay inside a tiny window and reject signed values so affixes cannot be
    // mistaken for base item stats.
    for (
        let index = Math.max(0, labelIndex - 2);
        index <= Math.min(lines.length - 1, labelIndex + 1);
        index += 1
    ) {
        const line = lines[index];
        if (/[+-]\s*[0-9]/.test(line)) continue;

        const labelMatch = line.match(labelPattern);
        const searchable = labelMatch && labelMatch.index !== undefined
            ? line.slice(0, labelMatch.index)
            : line;

        const tokens = [...searchable.matchAll(/\b[0-9OIlS][0-9OIlS,.]{1,7}\b/g)];
        tokens.forEach(token => {
            const value = integerFromOcr(token[0]);
            if (value >= min && value <= max) {
                candidates.push({
                    value,
                    distance: Math.abs(index - labelIndex),
                    sameLine: index === labelIndex
                });
            }
        });
    }

    candidates.sort((a, b) =>
        Number(b.sameLine) - Number(a.sameLine) ||
        a.distance - b.distance
    );

    return candidates[0]?.value ?? 0;
}

function findHeaderLabel(lines, pattern, startIndex, endIndex) {
    const start = Math.max(0, startIndex);
    const end = Math.min(lines.length, Math.max(start, endIndex));

    for (let index = start; index < end; index += 1) {
        if (pattern.test(lines[index])) {
            return { line: lines[index], index };
        }
    }

    return null;
}

function baseArmorFromRawText(rawText) {
    const lines = cleanedOcrLines(rawText);

    // Prefer the literal Diablo header record. This intentionally does not
    // depend on affix boundaries: OCR already gives us "1,275 Armor" / "910 Armor".
    for (const line of lines) {
        const match = line.match(/(?:^|\s)([0-9OIlS][0-9OIlS,.]{2,7})\s+Armor\b/i);
        if (!match) continue;

        const beforeArmor = line.slice(0, match.index + match[0].indexOf(match[1]));
        if (/[+-]\s*$/.test(beforeArmor)) continue;

        const value = integerFromOcr(match[1]);
        if (value >= 100 && value <= 100000) return value;
    }

    return 0;
}

function baseArmorFromHeader(lines, startIndex, endIndex) {
    const start = Math.max(0, startIndex);
    const end = Math.min(lines.length, Math.max(start, endIndex));

    for (let index = start; index < end; index += 1) {
        const line = lines[index];
        const armorMatch = line.match(/\bArmor\b/i);
        if (!armorMatch || armorMatch.index === undefined) continue;

        // Base armor is unsigned. This also prevents +577 Armor from ever
        // being treated as the item's base armor.
        const beforeArmor = line.slice(0, armorMatch.index);
        if (/[+-]\s*[0-9]/.test(beforeArmor)) continue;

        // Diablo may append its own comparison text after the base armor,
        // e.g. "910 Armor (-15.2% Toughness)". Only inspect text before Armor.
        const sameLineTokens = [...beforeArmor.matchAll(/[0-9OIlS][0-9OIlS,.]{1,7}/g)];
        if (sameLineTokens.length) {
            const value = integerFromOcr(sameLineTokens[sameLineTokens.length - 1][0]);
            if (value >= 100 && value <= 100000) return value;
        }

        // If OCR split the number from "Armor", accept only a nearby unsigned
        // line that is still inside the bounded tooltip header.
        for (let previous = index - 1; previous >= Math.max(start, index - 2); previous -= 1) {
            const candidate = lines[previous];
            if (/[+-]\s*[0-9]/.test(candidate)) break;
            if (affixStatDefinitionFromText(candidate)) break;
            const tokens = [...candidate.matchAll(/\b[0-9OIlS][0-9OIlS,.]{2,7}\b/g)];
            if (!tokens.length) continue;
            const value = integerFromOcr(tokens[tokens.length - 1][0]);
            if (value >= 100 && value <= 100000) return value;
        }
    }

    return 0;
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

    const visibleRange = decimalRangeFromLine(line);
    if (
        visibleRange &&
        (
            numericValue < visibleRange.low ||
            numericValue > visibleRange.high
        )
    ) {
        return "";
    }

    return `${rawValue} ${label}`;
}

function structuredAffixFromLine(line) {
    const canonical = canonicalAffixLine(line);
    if (!canonical) return null;

    const valueMatch = canonical.match(/^[+-]?\s*[0-9.,]+(?:\.[0-9]+)?%?/);
    if (!valueMatch) return null;

    const value = valueMatch[0].replace(/\s+/g, "");
    const stat = canonical.slice(valueMatch[0].length).trim();
    const range = decimalRangeFromLine(line);
    const isPercent = value.includes("%") || /%/.test(line);

    return {
        stat,
        value,
        min: range ? String(range.low) + (isPercent ? "%" : "") : "",
        max: range ? String(range.high) + (isPercent ? "%" : "") : ""
    };
}

function affixDetailsFromLegacyText(text) {
    return String(text ?? "")
        .split(/\r?\n/)
        .map(line => structuredAffixFromLine(line))
        .filter(Boolean)
        .slice(0, MAX_AFFIX_ROWS);
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

function affixStatDefinitionFromText(text) {
    const source = String(text ?? "");
    const statMap = [
        [/weapon\s+damage/i, "Weapon Damage", false],
        [/life\s+on\s+(?:hit|kill)/i, source => /kill/i.test(source) ? "Life on Kill" : "Life on Hit", false],
        [/all\s+damage\s+multiplier/i, "All Damage Multiplier", true],
        [/maximum\s+life/i, "Maximum Life", false],
        [/fortify\s+generation/i, "Fortify Generation", true],
        [/healing\s+received/i, "Healing Received", true],
        [/cooldown\s+reduction/i, "Cooldown Reduction", true],
        [/attack\s+speed/i, "Attack Speed", true],
        [/movement\s+speed/i, "Movement Speed", true],
        [/critical\s+strike/i, "Critical Strike", true],
        [/damage\s+reduction/i, "Damage Reduction", true],
        [/lucky\s+hit/i, "Lucky Hit", true],
        [/all\s+resistance/i, "All Resistance", true],
        [/resistance/i, "Resistance", true],
        [/intelligence/i, "Intelligence", false],
        [/strength/i, "Strength", false],
        [/dexterity/i, "Dexterity", false],
        [/willpower/i, "Willpower", false],
        [/thorns/i, "Thorns", false],
        [/armor/i, "Armor", false],
        [/essence/i, "Essence", false],
        [/minion/i, "Minion", false],
        [/golem/i, "Golem", false],
        [/skeleton/i, "Skeleton", false]
    ];

    const match = statMap.find(([pattern]) => pattern.test(source));
    if (!match) return null;
    const stat = typeof match[1] === "function" ? match[1](source) : match[1];
    return { stat, percent: match[2] };
}

function affixStatFromText(text) {
    return affixStatDefinitionFromText(text)?.stat ?? "";
}

function firstSignedValue(text) {
    const match = String(text ?? "").match(/[+-]\s*[0-9OIlS,.]+(?:\.[0-9]+)?%?/);
    if (!match) return "";
    return match[0]
        .replace(/\s+/g, "")
        .replace(/[Oo]/g, "0")
        .replace(/[Il|]/g, "1")
        .replace(/S/g, "5");
}

function lineStatDefinitions(line) {
    const source = String(line ?? "");
    const definitions = [];
    const statMap = [
        [/weapon\s+damage/ig, "Weapon Damage", false],
        [/life\s+on\s+hit/ig, "Life on Hit", false],
        [/life\s+on\s+kill/ig, "Life on Kill", false],
        [/all\s+damage\s+multiplier/ig, "All Damage Multiplier", true],
        [/maximum\s+life/ig, "Maximum Life", false],
        [/fortify\s+generation/ig, "Fortify Generation", true],
        [/healing\s+received/ig, "Healing Received", true],
        [/cooldown\s+reduction/ig, "Cooldown Reduction", true],
        [/attack\s+speed/ig, "Attack Speed", true],
        [/movement\s+speed/ig, "Movement Speed", true],
        [/critical\s+strike/ig, "Critical Strike", true],
        [/damage\s+reduction/ig, "Damage Reduction", true],
        [/lucky\s+hit/ig, "Lucky Hit", true],
        [/all\s+resistance/ig, "All Resistance", true],
        [/resistance/ig, "Resistance", true],
        [/intelligence/ig, "Intelligence", false],
        [/strength/ig, "Strength", false],
        [/dexterity/ig, "Dexterity", false],
        [/willpower/ig, "Willpower", false],
        [/thorns/ig, "Thorns", false],
        [/armor/ig, "Armor", false],
        [/essence/ig, "Essence", false],
        [/minion/ig, "Minion", false],
        [/golem/ig, "Golem", false],
        [/skeleton/ig, "Skeleton", false]
    ];

    statMap.forEach(([pattern, stat, percent]) => {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(source)) !== null) {
            // Avoid adding the generic Resistance anchor inside All Resistance.
            if (stat === "Resistance" && /all\s+$/i.test(source.slice(Math.max(0, match.index - 5), match.index))) {
                continue;
            }
            definitions.push({ stat, percent, charIndex: match.index });
        }
    });

    return definitions
        .filter(definition => {
            if (definition.stat !== "Armor") return true;

            // Unsigned "1,275 Armor" and "910 Armor" are base item stats.
            // Armor is an affix only when a signed value belongs to this row.
            const before = source.slice(0, definition.charIndex);
            const signedBefore = [...before.matchAll(/[+-]\s*[0-9OIlS,.]+(?:\.[0-9]+)?%?/g)];
            return signedBefore.length > 0;
        })
        .sort((a, b) => a.charIndex - b.charIndex);
}

function signedValuesOnLine(line) {
    const source = String(line ?? "");
    return [...source.matchAll(/[+-]\s*[0-9OIlS,.]+(?:\.[0-9]+)?%?/g)]
        .map(match => ({
            value: match[0]
                .replace(/\s+/g, "")
                .replace(/[Oo]/g, "0")
                .replace(/[Il|]/g, "1")
                .replace(/S/g, "5"),
            charIndex: match.index ?? 0
        }));
}

function rangeAfterPosition(line, start, end = Infinity) {
    const source = String(line ?? "").slice(start, end);
    return decimalRangeFromLine(source);
}

function affixAnchors(lines, startIndex, stopPattern) {
    const anchors = [];

    for (let lineIndex = Math.max(0, startIndex); lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        if (stopPattern.test(line)) break;

        const definitions = lineStatDefinitions(line);
        if (!definitions.length) continue;

        const signedValues = signedValuesOnLine(line);

        definitions.forEach((definition, definitionIndex) => {
            const nextDefinition = definitions[definitionIndex + 1];
            const segmentStart = definitionIndex === 0 ? 0 : definition.charIndex;
            const segmentEnd = nextDefinition?.charIndex ?? line.length;

            // A tooltip row's signed value should be immediately before its
            // own stat label. When OCR collapses several rows into one line,
            // never reach backward across a previous recognized stat label.
            const previousDefinition = definitions[definitionIndex - 1];
            const lowerBound = previousDefinition?.charIndex ?? -1;
            const preceding = signedValues
                .filter(value =>
                    value.charIndex > lowerBound &&
                    value.charIndex < definition.charIndex
                )
                .sort((a, b) => b.charIndex - a.charIndex)[0];

            const inside = signedValues.find(value =>
                value.charIndex >= definition.charIndex &&
                value.charIndex < segmentEnd
            );

            let chosen = preceding ?? inside ?? null;
            if (!chosen && /Multiplier/i.test(definition.stat)) {
                const segment = line.slice(Math.max(0, definition.charIndex - 20), segmentEnd);
                const match = segment.match(/[xX×]\s*([0-9OIlS,.]+(?:\.[0-9]+)?)\s*%/);
                if (match) {
                    chosen = {
                        value: "x" + match[1] + "%",
                        charIndex: Math.max(0, definition.charIndex - 20) + (match.index ?? 0)
                    };
                }
            }
            anchors.push({
                ...definition,
                lineIndex,
                value: chosen?.value ?? "",
                valueCharIndex: chosen?.charIndex ?? -1
            });
        });
    }

    return anchors;
}

function sequentialAffixes(lines, startIndex, stopPattern) {
    const details = [];
    const uncertain = [];
    const anchors = affixAnchors(lines, startIndex, stopPattern);

    anchors.forEach((anchor, anchorIndex) => {
        const nextAnchor = anchors[anchorIndex + 1];
        let range = null;

        // First try the exact same OCR line, bounded by the next stat label
        // when multiple tooltip rows were collapsed together.
        const sameLineDefinitions = lineStatDefinitions(lines[anchor.lineIndex]);
        const currentDefinitionIndex = sameLineDefinitions.findIndex(definition =>
            definition.stat === anchor.stat &&
            definition.charIndex === anchor.charIndex
        );
        const nextSameLine = currentDefinitionIndex >= 0
            ? sameLineDefinitions[currentDefinitionIndex + 1]
            : null;
        range = rangeAfterPosition(
            lines[anchor.lineIndex],
            anchor.charIndex,
            nextSameLine?.charIndex ?? Infinity
        );

        if (!range && /Multiplier/i.test(anchor.stat)) {
            const line = lines[anchor.lineIndex];
            const segmentStart = Math.max(0, anchor.valueCharIndex >= 0 ? anchor.valueCharIndex : anchor.charIndex - 20);
            const segmentEnd = nextSameLine?.charIndex ?? line.length;
            const segment = line.slice(segmentStart, segmentEnd);
            const multiplierRange = segment.match(/[\[(]\s*([0-9OIlS,.]+(?:\.[0-9]+)?)\s*[-–—]\s*([0-9OIlS,.]+(?:\.[0-9]+)?)\s*[\])]?\s*%?/);
            if (multiplierRange) {
                const low = decimalFromOcr(multiplierRange[1]);
                const high = decimalFromOcr(multiplierRange[2]);
                if (low > 0 && high >= low) range = { low, high };
            }
        }

        // If the range wrapped, only inspect following lines until the next
        // recognized stat anchor. Never borrow a later stat's range.
        if (!range) {
            const nextLineBoundary = nextAnchor?.lineIndex ?? Math.min(lines.length, anchor.lineIndex + 3);
            for (
                let lineIndex = anchor.lineIndex + 1;
                lineIndex < Math.min(lines.length, nextLineBoundary);
                lineIndex += 1
            ) {
                if (stopPattern.test(lines[lineIndex])) break;
                if (lineStatDefinitions(lines[lineIndex]).length) break;
                range = decimalRangeFromLine(lines[lineIndex]);
                if (range) break;
            }
        }

        const numeric = decimalFromOcr(anchor.value);
        const valueValid = Boolean(anchor.value) &&
            numeric > 0 &&
            (!range || (numeric >= range.low && numeric <= range.high));

        // A range without a trustworthy value is not enough to assign that
        // range to an affix. OCR can miss the value/row boundary and expose a
        // later legendary-power range; keep the whole affix uncertain instead
        // of displaying a confidently wrong roll range.
        if (!valueValid) range = null;

        const percentSuffix = anchor.percent ? "%" : "";
        details.push({
            stat: anchor.stat,
            value: valueValid ? (
                anchor.percent && !anchor.value.includes("%")
                    ? anchor.value + "%"
                    : anchor.value
            ) : "",
            min: range ? String(range.low) + percentSuffix : "",
            max: range ? String(range.high) + percentSuffix : ""
        });

        if (!valueValid) uncertain.push(anchor.stat);
    });

    const deduped = [];
    details.forEach(detail => {
        if (!detail?.stat) return;
        const existing = deduped.find(item =>
            String(item.stat).toLowerCase() === String(detail.stat).toLowerCase()
        );
        if (!existing) {
            deduped.push({ ...detail });
            return;
        }
        if (!existing.value && detail.value) existing.value = detail.value;
        if (!existing.min && detail.min) existing.min = detail.min;
        if (!existing.max && detail.max) existing.max = detail.max;
    });

    return {
        details: deduped.slice(0, MAX_AFFIX_ROWS),
        uncertain: [...new Set(uncertain)]
    };
}

function cleanPowerText(value) {
    return String(value ?? "")
        .replace(/\|?\s*\[x\]\s*/gi, " ")
        .replace(/[|¦]+/g, " ")
        .replace(/(^|\s)[{}§]+(?=\s|$)/g, " ")
        .replace(/\s+([,.;:])/g, "$1")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function powerBlockFromLines(lines, affixEndIndex = 0) {
    const metadataPattern = /\b(?:empty socket|requires level|sell value|durability|equip|compare|mark as junk|drop|scroll|tempers?|properties lost when equipped)\b|\(\s*[0-9OIlS]{1,4}\s*\/\s*[0-9OIlS,]{3,}\s*\)/i;
    const explicitStart = lines.findIndex((line, index) =>
        index >= affixEndIndex && /\b(?:imprinted|aspect)\b/i.test(line)
    );

    // Diablo does not always OCR the visual power label. When that happens,
    // start immediately after the final structured affix and look for prose
    // containing a percent roll/range before item metadata.
    let start = explicitStart;
    if (start < 0) {
        for (let index = Math.max(affixEndIndex, 0); index < lines.length; index += 1) {
            if (metadataPattern.test(lines[index])) break;
            const window = lines.slice(index, Math.min(lines.length, index + 6)).join(" ");
            const hasPowerVocabulary =
                /\b(?:damage|increased|deals|makes|enemies|vulnerable|ground|desecrated|seconds?|summons?|vampiric|curse|corpse|souls?|army)\b/i.test(window);
            const hasPercentEvidence =
                /[0-9OIlS]+(?:\.[0-9OIlS]+)?\s*%(?:\s*\|?\s*\[x\])?/.test(window);
            const hasUniqueProse =
                /\b(?:your\s+summons|vampiric\s+curse|consuming\s+a\s+corpse|only\s+army\s+of\s+the\s+dead)\b/i.test(window);
            if (hasPowerVocabulary && (hasPercentEvidence || hasUniqueProse)) {
                start = index;
                break;
            }
        }
    }

    if (start < 0) return null;

    const powerLines = [];
    for (let index = start; index < lines.length && powerLines.length < 10; index += 1) {
        const line = lines[index];
        if (index > start && metadataPattern.test(line)) break;
        powerLines.push(line);
    }

    const text = cleanPowerText(
        powerLines.join(" ")
            .replace(/^.*?\b(?:imprinted|aspect)\b\s*:?\s*/i, "")
    );

    const partialUniquePower =
        /\b(?:your\s+summons|vampiric\s+curse|consuming\s+a\s+corpse|only\s+army\s+of\s+the\s+dead)\b/i.test(text) &&
        text.length >= 35;
    if (!powerLooksUsable(text) && !partialUniquePower) return null;

    const range = decimalRangeFromLine(text);
    const percents = [...text.matchAll(/([0-9OIlS,.]+(?:\.[0-9]+)?)\s*%/gi)]
        .map(match => decimalFromOcr(match[1]))
        .filter(value => Number.isFinite(value) && value > 0);

    let roll = 0;
    if (range) {
        roll = percents.find(value => value >= range.low && value <= range.high) ?? 0;
    }

    return {
        text,
        roll: roll ? String(roll) + "%" : "",
        min: range ? String(range.low) + "%" : "",
        max: range ? String(range.high) + "%" : ""
    };
}

function parseDiabloItemText(rawText, slotKey) {
    const lines = cleanedOcrLines(rawText);
    const joined = lines.join("\n");
    const fields = { ...emptyLoadoutItem() };
    const detected = [];
    const inferred = [];
    const rejected = [];
    const uncertain = [];

    const rarityIndex = lines.findIndex(line =>
        /\b(?:legendary|unique|rare|magic)\b/i.test(line) &&
        /\b(?:helm|chest|armor|gloves|pants|boots|amulet|ring|sword|axe|mace|dagger|wand|scythe|focus|shield|staff|polearm|totem)\b/i.test(line)
    );

    if (rarityIndex >= 0) {
        const rarityMatch = lines[rarityIndex].match(/\b(Legendary|Unique|Rare|Magic)\b/i);
        if (rarityMatch) {
            const rarity = rarityMatch[1].toLowerCase();
            fields.rarity = rarity[0].toUpperCase() + rarity.slice(1);
            detected.push("Rarity");
        }

        const exactType = exactItemTypeFromText(lines[rarityIndex]);
        if (exactType) {
            fields.itemType = exactType;
            detected.push("Item type");
        }

        const itemName = parseItemName(lines, rarityIndex);
        if (itemName.confident && itemName.value) {
            fields.name = itemName.value;
            detected.push("Name");
        } else {
            uncertain.push("Name");
        }
    }

    if (!fields.itemType) rejected.push("Item type");

    // Bound header parsing before the first affix. This prevents a later
    // +Armor affix from being mistaken for the item's base Armor.
    let cursor = Math.max(0, rarityIndex + 1);
    const firstAffixIndex = lines.findIndex((line, index) =>
        index >= cursor &&
        lineStatDefinitions(line).length > 0
    );
    const headerEnd = firstAffixIndex >= 0
        ? firstAffixIndex
        : Math.min(lines.length, cursor + 14);

    const itemPowerLine = findHeaderLabel(
        lines,
        /Item\s*Power/i,
        cursor,
        headerEnd
    );
    if (itemPowerLine) {
        const value = nearbyUnsignedHeaderValue(
            lines,
            /Item\s*Power/i,
            itemPowerLine.index,
            100,
            2000
        );
        if (value) {
            fields.itemPower = value;
            detected.push("Item power");
        } else {
            uncertain.push("Item power");
        }
    } else {
        uncertain.push("Item power");
    }

    const baseArmor =
        baseArmorFromRawText(rawText) ||
        baseArmorFromHeader(lines, cursor, headerEnd);
    if (baseArmor) {
        // The comparison form renders Base Armor from baseArmor first.
        // Keep the legacy armor mirror for older saved prototype data.
        fields.baseArmor = baseArmor;
        fields.armor = baseArmor;
        detected.push("Armor");
    } else {
        uncertain.push("Armor");
    }

    // Affix parsing starts after the bounded header, regardless of whether
    // every header field was readable.
    cursor = headerEnd;

    const weaponLike = /(?:sword|axe|mace|dagger|wand|scythe|staff|polearm)/i.test(fields.itemType);
    if (weaponLike || slotKey === "mainHand" || slotKey === "offHand") {
        const dpsLine = findLineWith(lines, /Damage\s+Per\s+Second/i, Math.max(0, rarityIndex + 1), 10);
        if (dpsLine) {
            const value = numberBeforeLabel(dpsLine.line, /Damage\s+Per\s+Second/i);
            if (value > 0 && value < 1000000) {
                fields.damage = value;
                detected.push("Damage per second");
            }
        }
    }

    // Affixes own only the stat block. Legendary/unique power prose owns
    // everything after the first power boundary, even when OCR misses the
    // literal "Aspect" or "Imprinted" label. This prevents power roll ranges
    // from leaking backward into the final affix.
    const explicitPowerIndex = lines.findIndex((line, index) =>
        index >= cursor && /\b(?:imprinted|aspect)\b/i.test(line)
    );
    const metadataIndex = lines.findIndex((line, index) =>
        index >= cursor &&
        /\b(?:empty socket|requires level|sell value|durability|tempers?|mark as junk|compare|drop|scroll)\b/i.test(line)
    );
    let uniquePowerIndex = -1;
    if (explicitPowerIndex < 0 && fields.rarity === "Unique") {
        uniquePowerIndex = lines.findIndex((line, index) =>
            index >= cursor &&
            /\b(?:your\s+summons|a\s+dark\s+aura|only\s+army|curses?\s+inflicted|consuming\s+a\s+corpse)\b/i.test(line)
        );
    }
    const affixHardEnd = explicitPowerIndex >= 0
        ? explicitPowerIndex
        : (uniquePowerIndex >= 0 ? uniquePowerIndex : (metadataIndex >= 0 ? metadataIndex : lines.length));
    const affixLines = lines.slice(0, affixHardEnd);

    const stopPattern = /\b(?:imprinted|aspect|empty socket|requires level|sell value|durability|tempers?|mark as junk|compare|drop|scroll)\b/i;
    const parsedAffixes = sequentialAffixes(affixLines, cursor, stopPattern);
    fields.affixDetails = parsedAffixes.details;
    fields.affixes = formatAffixDetails(fields.affixDetails);
    uncertain.push(...parsedAffixes.uncertain);
    if (fields.affixDetails.length) detected.push("Affixes");

    const lifeDetail = fields.affixDetails.find(detail => detail.stat === "Maximum Life");
    if (lifeDetail?.value) {
        fields.life = integerFromOcr(lifeDetail.value);
        detected.push("Maximum Life");
    }

    // Power owns the prose after the structured affix block. Prefer explicit
    // Aspect/Imprinted labels, but recover conservatively when OCR drops them.
    const finalAffixLine = affixAnchors(affixLines, cursor, stopPattern)
        .reduce((max, anchor) => Math.max(max, anchor.lineIndex), cursor);
    // If OCR preserved an explicit power label, start there. Using the final
    // affix anchor as the only lower bound can jump past the power when noisy
    // comparison text creates a late false affix anchor.
    const powerSearchStart = explicitPowerIndex >= 0
        ? explicitPowerIndex
        : (uniquePowerIndex >= 0 ? uniquePowerIndex : finalAffixLine + 1);
    const powerBlock = powerBlockFromLines(lines, powerSearchStart);

    if (powerBlock) {
        fields.power = powerBlock.text;
        fields.powerValue = powerBlock.roll;
        fields.powerMin = powerBlock.min;
        fields.powerMax = powerBlock.max;
        detected.push("Aspect / unique power");
        if (powerBlock.roll) detected.push("Power roll");
        else if (powerBlock.min || powerBlock.max) uncertain.push("Power roll");
    }

    const requiredLevelMatch = joined.match(/\bRequires\s+Level\s+([0-9OIlS]{1,3})\b/i);
    if (requiredLevelMatch) {
        const value = integerFromOcr(requiredLevelMatch[1]);
        if (value > 0 && value <= 100) {
            fields.requiredLevel = value;
            detected.push("Required level");
        }
    }

    const temperMatch = joined.match(/\bTempers?\s*:\s*([0-9OIlS]{1,2}\s*\/\s*[0-9OIlS]{1,2})/i);
    if (temperMatch) {
        fields.tempers = temperMatch[1].replace(/\s+/g, "");
        detected.push("Temper status");
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
        fields.socketContents = Array(fields.sockets).fill("Empty").join(", ");
        detected.push("Sockets");
        detected.push("Socket contents");
    }

    return {
        fields,
        detected: [...new Set(detected)],
        inferred,
        rejected: [...new Set(rejected)],
        uncertain: [...new Set(uncertain)],
        rawText: String(rawText ?? "").trim()
    };
}

function applyScreenshotExtraction(prefix, extraction, ocrConfidence) {
    const ui = screenshotElements(prefix);
    const detectedCount = extraction.detected.length;

    prototypeState.screenshotItemTypes[prefix] =
        extraction.detected.includes("Item type")
            ? extraction.fields.itemType
            : "";
    prototypeState.itemConfirmed[prefix] = false;
    updateItemConfirmationUI(prefix);
    updateGearSlotMismatchUI();

    ui.readout.hidden = false;
    ui.ocrText.textContent = extraction.rawText || "No text detected.";

    if (detectedCount < 2) {
        ui.readoutText.textContent =
            `Darkstorm could not confidently map enough item data to replace the current fields. OCR text confidence: ${Math.round(ocrConfidence)}%. Review the detected text and enter the item manually for now.`;
        return false;
    }

    setGear(prefix, extraction.fields);
    prototypeState.baseScreenshotExtractions[prefix] = {
        ...extraction,
        fields: {
            ...extraction.fields,
            affixDetails: Array.isArray(extraction.fields?.affixDetails)
                ? extraction.fields.affixDetails.map(detail => ({ ...detail }))
                : []
        }
    };
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
    const uncertainText = extraction.uncertain?.length
        ? ` Gamer entry needed: ${extraction.uncertain.join(", ")} could not be read confidently and was left blank.`
        : "";

    ui.readoutText.textContent =
        `Detected: ${extraction.detected.join(", ")}. OCR text confidence: ${Math.round(ocrConfidence)}%. Fields Darkstorm could not confidently map were left blank or zero.${rejectedText}${uncertainText}${inferredText} Review the fields before confirming the item.`;

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
        !fields.name ||
        extraction?.uncertain?.includes("Name") ||
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
        uncertain: [...new Set(primary.uncertain ?? [])],
        rawText: primary.rawText ?? ""
    };

    const fieldLabels = {
        name: "Name",
        rarity: "Rarity",
        itemType: "Item type",
        itemPower: "Item power",
        armor: "Armor",
        baseArmor: "Armor",
        damage: "Damage",
        requiredLevel: "Required level",
        power: "Aspect / unique power",
        powerValue: "Power roll",
        powerMin: "Power roll low",
        powerMax: "Power roll high",
        affixes: "Affixes",
        tempers: "Temper status",
        masterwork: "Masterwork",
        sockets: "Sockets",
        socketContents: "Socket contents"
    };

    Object.entries(enhanced.fields ?? {}).forEach(([key, value]) => {
        if (key === "affixDetails") return;

        const current = merged.fields[key];
        const isMissing = current === "" || current === 0 || current == null;
        const hasValue = value !== "" && value !== 0 && value != null;

        if (key === "name") {
            const primaryName = String(current ?? "").trim();
            const enhancedName = String(value ?? "").trim();

            if (primaryName && enhancedName) {
                if (
                    normalizedItemName(primaryName) ===
                    normalizedItemName(enhancedName)
                ) {
                    merged.fields.name = primaryName;
                    merged.detected.push("Name");
                    merged.uncertain = merged.uncertain.filter(
                        label => label !== "Name"
                    );
                } else {
                    merged.fields.name = "";
                    merged.detected = merged.detected.filter(
                        label => label !== "Name"
                    );
                    merged.uncertain.push("Name");
                }
            } else if (primaryName || enhancedName) {
                // One OCR pass is not enough evidence for a noisy item name.
                // If only one pass sees a name, leave it for the gamer to enter.
                merged.fields.name = "";
                merged.detected = merged.detected.filter(
                    label => label !== "Name"
                );
                merged.uncertain.push("Name");
            }

            return;
        }

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

    const primaryAffixes = Array.isArray(primary.fields?.affixDetails)
        ? primary.fields.affixDetails
        : affixDetailsFromLegacyText(primary.fields?.affixes);
    const enhancedAffixes = Array.isArray(enhanced.fields?.affixDetails)
        ? enhanced.fields.affixDetails
        : affixDetailsFromLegacyText(enhanced.fields?.affixes);

    const combinedAffixes = [];

    [...primaryAffixes, ...enhancedAffixes].forEach(detail => {
        if (!detail?.stat) return;

        const existing = combinedAffixes.find(item =>
            String(item.stat).toLowerCase() === String(detail.stat).toLowerCase()
        );

        if (!existing) {
            if (combinedAffixes.length < MAX_AFFIX_ROWS) {
                combinedAffixes.push({ ...detail });
            }
            return;
        }

        if (!existing.min && detail.min) existing.min = detail.min;
        if (!existing.max && detail.max) existing.max = detail.max;

        if (existing.value && detail.value && existing.value !== detail.value) {
            existing.value = "";
            merged.uncertain.push(detail.stat);
            return;
        }

        if (!existing.value && detail.value) {
            const numeric = decimalFromOcr(detail.value);
            const low = decimalFromOcr(existing.min);
            const high = decimalFromOcr(existing.max);
            const fitsRange = !low || !high || (numeric >= low && numeric <= high);

            if (fitsRange) {
                existing.value = detail.value;
            } else {
                merged.uncertain.push(detail.stat);
            }
        }
    });

    // Reparse the combined raw OCR after both passes are available. This
    // preserves the actual top-to-bottom tooltip records and prevents a noisy
    // enhanced pass from relabeling a good primary-pass value.
    // Reparse each OCR pass independently. Never concatenate passes before
    // affix parsing: doing so lets the end of the primary pass borrow a range
    // from the beginning/power block of the enhanced pass.
    const combinedStopPattern = /\b(?:imprinted|aspect|empty socket|requires level|sell value|durability|tempers?|mark as junk|compare|drop|scroll)\b/i;
    const rawAffixes = [primary.rawText ?? "", enhanced.rawText ?? ""]
        .flatMap(raw => {
            const passLines = cleanedOcrLines(raw);
            if (!passLines.length) return [];

            const explicitPowerIndex = passLines.findIndex(line =>
                /\b(?:imprinted|aspect)\b/i.test(line)
            );
            const metadataIndex = passLines.findIndex(line =>
                /\b(?:empty socket|requires level|sell value|durability|tempers?|mark as junk|compare|drop|scroll)\b/i.test(line)
            );
            const hardEnd = explicitPowerIndex >= 0
                ? explicitPowerIndex
                : (metadataIndex >= 0 ? metadataIndex : passLines.length);

            return sequentialAffixes(
                passLines.slice(0, hardEnd),
                0,
                combinedStopPattern
            ).details;
        });

    rawAffixes.forEach(detail => {
        if (!detail?.stat) return;
        const existing = combinedAffixes.find(item =>
            String(item.stat).toLowerCase() === String(detail.stat).toLowerCase()
        );

        if (!existing) {
            if (combinedAffixes.length < MAX_AFFIX_ROWS) {
                combinedAffixes.push({ ...detail });
            }
            return;
        }

        // Fill missing pieces from a self-consistent raw record, but do not let
        // a later/noisier pass overwrite a value already supported by a pass.
        if (!existing.value && detail.value) existing.value = detail.value;
        if (!existing.min && detail.min) existing.min = detail.min;
        if (!existing.max && detail.max) existing.max = detail.max;
    });

    combinedAffixes.forEach(detail => {
        const numeric = decimalFromOcr(detail.value);
        const low = decimalFromOcr(detail.min);
        const high = decimalFromOcr(detail.max);

        if (
            detail.value &&
            low &&
            high &&
            (numeric < low || numeric > high)
        ) {
            detail.value = "";
            merged.uncertain.push(detail.stat);
        }
    });

    // Scalar base stats are trustworthy when either pass found a plausible
    // bounded header value. Re-read both raw passes before finalizing merge so
    // a good primary Armor value cannot disappear because enhanced OCR missed it.
    const rawPasses = [primary.rawText ?? "", enhanced.rawText ?? ""]
        .map(cleanedOcrLines)
        .filter(lines => lines.length);

    if (!merged.fields.armor) {
        const directArmor =
            baseArmorFromRawText(primary.rawText ?? "") ||
            baseArmorFromRawText(enhanced.rawText ?? "");

        if (directArmor) {
            merged.fields.baseArmor = directArmor;
            merged.fields.armor = directArmor;
            merged.detected.push("Armor");
            merged.uncertain = merged.uncertain.filter(label => label !== "Armor");
        }
    }

    if (!merged.fields.armor) {
        for (const passLines of rawPasses) {
            const rarityIndex = passLines.findIndex(line =>
                /\b(?:legendary|unique|rare|magic)\b/i.test(line) &&
                /\b(?:helm|chest|armor|gloves|pants|boots|amulet|ring|sword|axe|mace|dagger|wand|scythe|focus|shield|staff|polearm|totem)\b/i.test(line)
            );
            const start = Math.max(0, rarityIndex + 1);
            const firstAffix = passLines.findIndex((line, index) =>
                index >= start &&
                lineStatDefinitions(line).length > 0
            );
            const end = firstAffix >= 0 ? firstAffix : Math.min(passLines.length, start + 14);
            const armor = baseArmorFromHeader(passLines, start, end);
            if (armor) {
                merged.fields.baseArmor = armor;
                merged.fields.armor = armor;
                merged.detected.push("Armor");
                merged.uncertain = merged.uncertain.filter(label => label !== "Armor");
                break;
            }
        }
    }

    merged.fields.affixDetails = combinedAffixes.slice(0, MAX_AFFIX_ROWS);
    if (merged.fields.affixDetails.length) {
        merged.fields.affixes = formatAffixDetails(merged.fields.affixDetails);
        merged.detected.push("Affixes");
    }

    merged.detected = [...new Set(merged.detected)];
    merged.inferred = [...new Set([
        ...merged.inferred,
        ...(enhanced.inferred ?? [])
    ])];
    merged.rejected = [...new Set([
        ...merged.rejected,
        ...(enhanced.rejected ?? [])
    ])];
    merged.uncertain = [...new Set([
        ...merged.uncertain,
        ...(enhanced.uncertain ?? [])
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
        prototypeState.screenshotIncomplete[prefix] =
            /\bScroll\s+Down\b/i.test(extraction.rawText ?? "");
        updateContinuationUI(prefix);
        updateItemConfirmationUI(prefix);
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

        ui.continuationInput?.addEventListener("change", event => {
            setContinuationScreenshot(prefix, event.target.files?.[0]);
        });

        ui.continuationRead?.addEventListener("click", () => {
            readContinuationScreenshot(prefix);
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
    const affixDetails = getAffixDetails(prefix);
    const baseArmor = numberValue(el[prefix + "Armor"]);
    const bonusArmor = affixValueFor(affixDetails, /^Armor$/i);
    const life = affixValueFor(affixDetails, /^Maximum Life$/i);
    const defense = affixValueFor(
        affixDetails,
        /^(?:Damage Reduction|All Resistance|Resistance)$/i
    );

    return {
        name: el[prefix + "Name"].value.trim(),
        rarity: el[prefix + "Rarity"].value.trim(),
        itemType: el[prefix + "ItemType"].value.trim(),
        itemPower: numberValue(el[prefix + "ItemPower"]),
        baseArmor,
        armor: baseArmor + bonusArmor,
        life,
        defense,
        damage: numberValue(el[prefix + "Damage"]),
        requiredLevel: numberValue(el[prefix + "RequiredLevel"]),
        power: el[prefix + "Power"].value.trim(),
        powerValue: el[prefix + "PowerValue"].value.trim(),
        powerMin: el[prefix + "PowerMin"].value.trim(),
        powerMax: el[prefix + "PowerMax"].value.trim(),
        affixes: formatAffixDetails(affixDetails),
        affixDetails,
        tempers: el[prefix + "Tempers"].value.trim(),
        masterwork: numberValue(el[prefix + "Masterwork"]),
        sockets: numberValue(el[prefix + "Sockets"]),
        socketContents: el[prefix + "SocketContents"].value.trim()
    };
}

function getCharacterFromForm() {
    return {
        schemaVersion: "0.3",
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
    el[prefix + "Name"].value = gear?.name === "Unnamed item" ? "" : (gear?.name ?? "");
    el[prefix + "Rarity"].value = gear?.rarity ?? "";
    el[prefix + "ItemType"].value = gear?.itemType ?? "";
    el[prefix + "ItemPower"].value = gear?.itemPower ?? 0;
    el[prefix + "Armor"].value = gear?.baseArmor ?? gear?.armor ?? 0;
    el[prefix + "Damage"].value = gear?.damage ?? 0;
    el[prefix + "RequiredLevel"].value = gear?.requiredLevel ?? 0;
    el[prefix + "Power"].value = gear?.power ?? "";
    el[prefix + "PowerValue"].value = gear?.powerValue ?? "";
    el[prefix + "PowerMin"].value = gear?.powerMin ?? "";
    el[prefix + "PowerMax"].value = gear?.powerMax ?? "";
    el[prefix + "Tempers"].value = gear?.tempers ?? "";
    el[prefix + "Masterwork"].value = gear?.masterwork ?? 0;
    el[prefix + "Sockets"].value = gear?.sockets ?? 0;
    el[prefix + "SocketContents"].value = gear?.socketContents ?? "";

    const structuredAffixes = Array.isArray(gear?.affixDetails) && gear.affixDetails.length
        ? gear.affixDetails
        : affixDetailsFromLegacyText(gear?.affixes ?? "");

    setAffixDetails(prefix, structuredAffixes);
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
    const mismatch = updateGearSlotMismatchUI();
    const confirmation = confirmationBlockingState();

    if (mismatch.blocking || confirmation.blocking) {
        prototypeState.lastGearComparison = null;
        document.getElementById("equipCandidateButton").disabled = true;

        if (mismatch.blocking) {
            document.getElementById("gearVerdict").textContent = "REVIEW SLOT";
            document.getElementById("gearReason").textContent =
                "Darkstorm stopped the comparison because the screenshot item type does not match the selected comparison slot.";
        } else {
            const pendingLabels = confirmation.pending
                .map(prefix => prefix === "equipped" ? "Equipped Item" : "Candidate Item")
                .join(" and ");
            document.getElementById("gearVerdict").textContent = "CONFIRM DATA";
            document.getElementById("gearReason").textContent =
                `Darkstorm is waiting for gamer verification of ${pendingLabels} before comparing the items.`;
        }

        return null;
    }

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
        `${itemDisplayName(candidate, "Candidate item")} scores ${absoluteDelta} prototype points ${direction} than ${itemDisplayName(equipped, "equipped item")} in the ${slotLabel} slot for the current "${character.profile.goal}" goal. This is a test heuristic, not a live Diablo IV damage calculator.`;

    equipButton.disabled = verdict === "KEEP";

    return comparison;
}

function resetGearVerdict() {
    document.getElementById("gearVerdict").textContent = "No comparison yet";
    document.getElementById("gearReason").textContent = "Enter two items or load the demo character.";
    document.getElementById("equipCandidateButton").disabled = true;
}

function equipCandidate() {
    const mismatch = updateGearSlotMismatchUI();
    const confirmation = confirmationBlockingState();

    if (mismatch.blocking || confirmation.blocking) {
        document.getElementById("gearVerdict").textContent =
            mismatch.blocking ? "REVIEW SLOT" : "CONFIRM DATA";
        document.getElementById("gearReason").textContent =
            mismatch.blocking
                ? "Resolve the screenshot/comparison-slot mismatch before equipping the candidate."
                : "Confirm the screenshot-derived item data before equipping the candidate.";
        return;
    }

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
        `${itemDisplayName(candidate, "Candidate item")} is now treated as equipped for the next Darkstorm analysis.`;
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
renderGearAffixRows();
wireScreenshotIntake();
updateAllItemConfirmationUI();

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
    prototypeState.lastGearComparison = null;
    prototypeState.candidateEquipped = false;
    resetGearVerdict();

    if (hasTemporaryScreenshots()) {
        updateGearSlotMismatchUI();
        markUnsaved();
        return;
    }

    loadSelectedSlotFromLoadout();
    setGear("candidate", {});
    updateGearSlotMismatchUI();
});

document.getElementById("useDetectedSlotButton").addEventListener("click", event => {
    const suggestedSlot = event.currentTarget.dataset.slot;
    if (!suggestedSlot) return;

    el.comparisonSlot.value = suggestedSlot;
    prototypeState.lastGearComparison = null;
    prototypeState.candidateEquipped = false;
    resetGearVerdict();
    updateGearSlotMismatchUI();
    markUnsaved();
});

document.getElementById("compareGearButton").addEventListener("click", () => {
    const comparison = compareGear();
    if (comparison) analyzeBuild();
});
document.getElementById("equipCandidateButton").addEventListener("click", equipCandidate);

SCREENSHOT_PREFIXES.forEach(prefix => {
    document.getElementById(`${prefix}ConfirmButton`).addEventListener(
        "click",
        () => confirmItemData(prefix)
    );

    GEAR_FIELD_SUFFIXES.forEach(suffix => {
        const field = el[prefix + suffix];
        if (!field) return;

        field.addEventListener("input", () => {
            if (!itemConfirmationRequired(prefix)) return;
            invalidateItemConfirmation(prefix);
            updateGearSlotMismatchUI();
        });
    });
});

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
        const continuation = prototypeState.continuations[prefix];
        if (continuation?.url) {
            URL.revokeObjectURL(continuation.url);
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
