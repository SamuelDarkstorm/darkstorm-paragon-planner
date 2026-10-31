// Darkstorm Prototype 0.3
// Complete-player-loop controller.
// This is intentionally simple and readable so the prototype can be rebuilt deliberately later.

const STORAGE_KEY = "darkstorm-prototype-v0.3";

const prototypeState = {
    feedbackResult: null,
    lastGearComparison: null,
    candidateEquipped: false,
    activeTest: null,
    testAwaitingFeedback: false,
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
    screenshotIncomplete: {
        equipped: false,
        candidate: false
    },
    baseScreenshotExtractions: {
        equipped: null,
        candidate: null
    },
    intakeSessions: {},
    loadoutScreenshots: {},
    loadoutScreenshotUrls: {},
    loadoutExtractions: {},
    loadoutVerified: {}
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
        // Start every equipment slot collapsed. The player opens only the
        // slot they want to inspect or edit, keeping the loadout scannable.
        card.open = false;

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

        const intake = document.createElement("div");
        intake.className = "screenshot-intake wide";
        const slotId = slot.key;
        intake.innerHTML = `
            <div class="screenshot-heading">
                <strong>${slot.label} Screenshot</strong>
                <span id="loadout-${slotId}-screenshot-status" class="status-pill compact">Temporary</span>
            </div>
            <p class="muted">Scan the equipped ${slot.label.toLowerCase()} here. Darkstorm keeps screenshot review inside Equipment.</p>
            <div class="screenshot-preview">
                <img id="loadout-${slotId}-screenshot-preview" alt="${slot.label} item screenshot preview" hidden>
                <p id="loadout-${slotId}-screenshot-empty" class="muted">No screenshot selected.</p>
            </div>
            <div class="screenshot-actions">
                <label class="button secondary" for="loadout-${slotId}-screenshot-input">Choose Screenshot</label>
                <input id="loadout-${slotId}-screenshot-input" type="file" accept="image/*" hidden>
                <button id="loadout-${slotId}-screenshot-read" type="button" disabled>Read ${slot.label} Screenshot</button>
                <button id="loadout-${slotId}-screenshot-remove" type="button" class="secondary" hidden>Remove</button>
                <button id="loadout-${slotId}-confirm" type="button" hidden>Confirm ${slot.label} Data</button>
            </div>
            <div id="loadout-${slotId}-readout" class="screenshot-readout" hidden>
                <p id="loadout-${slotId}-readout-text" class="muted"></p>
                <details>
                    <summary>Show detected text (Tesseract)</summary>
                    <pre id="loadout-${slotId}-ocr-text"></pre>
                </details>
            </div>
        `;
        fields.append(intake);

        LOADOUT_FIELDS.forEach(field => {
            const label = document.createElement("label");
            if (field.wide) label.classList.add("wide");
            label.append(document.createTextNode(field.label));

            // Long prose such as Aspect / Unique Power should wrap like
            // affix notes instead of forcing horizontal scrolling.
            const useTextarea = field.type === "textarea" || field.key === "power";
            const input = useTextarea
                ? document.createElement("textarea")
                : document.createElement("input");

            input.id = loadoutFieldId(slot.key, field.key);
            input.dataset.slot = slot.key;
            input.dataset.field = field.key;

            if (useTextarea) {
                input.rows = field.key === "power" ? 3 : 2;
            } else {
                input.type = field.type;
            }

            if (field.min !== undefined) input.min = field.min;
            if (field.max !== undefined) input.max = field.max;

            input.addEventListener("input", () => {
                if (prototypeState.loadoutExtractions[slot.key]) {
                    prototypeState.loadoutVerified[slot.key] = false;
                    const confirm = document.getElementById("loadout-" + slot.key + "-confirm");
                    const status = document.getElementById("loadout-" + slot.key + "-screenshot-status");
                    if (confirm) {
                        confirm.hidden = false;
                        confirm.textContent = "Confirm " + slot.label + " Data";
                    }
                    if (status) status.textContent = "Edited · confirm again";
                }
                updateLoadoutSummary(slot.key);
                updateLoadoutStatus();
                markUnsaved();
            });

            label.append(input);
            fields.append(label);
        });

        card.append(summary, fields);
        container.append(card);
    });

    updateLoadoutStatus();
}

function applyExtractionToLoadout(slotKey, extraction) {
    const item = {
        ...emptyLoadoutItem(),
        ...extraction.fields,
        affixDetails: Array.isArray(extraction.fields?.affixDetails)
            ? extraction.fields.affixDetails.map(detail => ({ ...detail }))
            : []
    };
    item.affixes = formatAffixDetails(item.affixDetails);
    setLoadoutItem(slotKey, item);
    return item;
}

// Capture sessions are temporary. Only the final player-verified item is saved.
function newIntakeSession(key) {
    const session = { captures: [], incomplete: false, pending: false, reading: false,
        conflict: "", reviewComplete: false };
    prototypeState.intakeSessions[key] = session;
    return session;
}

function intakeBlocked(session) {
    return Boolean(session && (session.pending || session.reading || session.incomplete ||
        session.conflict || (session.captures.length > 1 && !session.reviewComplete)));
}

function intakeValuePresent(value) {
    return value !== "" && value !== 0 && value != null;
}

// Different views are NOT preprocessing passes. Never reparse concatenated views,
// replace a player correction, or silently choose between two nonempty values.
function mergeContinuationDraft(current, extraction, sameItemConfirmed) {
    const fields = { ...current, affixDetails: (current.affixDetails ?? []).map(row => ({ ...row })) };
    const conflicts = [];
    if (!sameItemConfirmed) return { ok: false, conflicts: ["Confirm that both views show the same item"] };
    const next = extraction.fields ?? {};
    const equivalent = (a, b) => String(a).trim().toLowerCase().replace(/\s+/g, " ") ===
        String(b).trim().toLowerCase().replace(/\s+/g, " ");
    Object.entries(next).forEach(([key, value]) => {
        if (["affixDetails", "affixes", "baseArmor", "life", "defense"].includes(key) || !intakeValuePresent(value)) return;
        const old = fields[key];
        if (!intakeValuePresent(old)) { fields[key] = value; return; }
        if (equivalent(old, value)) return;
        if (key === "power") {
            const a = String(old).trim(), b = String(value).trim();
            if (a.toLowerCase().includes(b.toLowerCase())) return;
            if (b.toLowerCase().includes(a.toLowerCase())) { fields[key] = b; return; }
            const left = a.split(/\s+/), right = b.split(/\s+/);
            for (let n = Math.min(left.length, right.length); n >= 3; n -= 1) {
                if (equivalent(left.slice(-n).join(" "), right.slice(0, n).join(" "))) {
                    fields[key] = [...left, ...right.slice(n)].join(" ");
                    return;
                }
            }
        }
        conflicts.push(`${key}: current “${old}”, continuation “${value}”`);
    });
    (next.affixDetails ?? []).forEach(row => {
        if (!row.stat) return;
        const existing = fields.affixDetails.find(item => equivalent(item.stat, row.stat));
        if (!existing) {
            if (fields.affixDetails.length >= MAX_AFFIX_ROWS) conflicts.push("Too many affixes; review overlap");
            else fields.affixDetails.push({ ...row });
            return;
        }
        ["value", "min", "max"].forEach(key => {
            if (!intakeValuePresent(row[key])) return;
            if (!intakeValuePresent(existing[key])) existing[key] = row[key];
            else if (!equivalent(existing[key], row[key])) conflicts.push(`${row.stat} ${key}: current “${existing[key]}”, continuation “${row[key]}”`);
        });
    });
    // A range without a supported roll stays out of the decision fields.
    fields.affixDetails.forEach(row => {
        if (!row.value) { row.min = ""; row.max = ""; return; }
        if (row.min && row.max) {
            const roll = decimalFromOcr(row.value), low = decimalFromOcr(row.min), high = decimalFromOcr(row.max);
            if (roll < low || roll > high) conflicts.push(`${row.stat}: roll is outside the visible range`);
        }
    });
    fields.affixes = formatAffixDetails(fields.affixDetails);
    fields.life = fields.life || affixValueFor(fields.affixDetails, /^Maximum Life$/i);
    fields.defense = fields.defense || affixValueFor(fields.affixDetails, /^(?:Damage Reduction|All Resistance|Resistance)$/i);
    fields.baseArmor = fields.armor;
    return { ok: conflicts.length === 0, fields, conflicts };
}

function intakeTarget(key) {
    if (key.startsWith("loadout:")) {
        const slot = key.slice(8), root = `loadout-${slot}`;
        return {
            get: () => getLoadoutItem(slot),
            set: fields => applyExtractionToLoadout(slot, { fields }),
            base: () => prototypeState.loadoutExtractions[slot],
            store: value => { prototypeState.loadoutExtractions[slot] = value; },
            revoke: () => { prototypeState.loadoutVerified[slot] = false; updateLoadoutIntelligence(); },
            slot,
            text: document.getElementById(`${root}-readout-text`),
            raw: document.getElementById(`${root}-ocr-text`),
            readout: document.getElementById(`${root}-readout`)
        };
    }
    const ui = screenshotElements(key);
    return {
        // getGear includes bonus Armor in armor; intake compares the base header.
        get: () => { const item = getGear(key); return { ...item, armor: item.baseArmor }; },
        set: fields => setGear(key, fields),
        base: () => prototypeState.baseScreenshotExtractions[key],
        store: value => { prototypeState.baseScreenshotExtractions[key] = value; },
        revoke: () => invalidateItemConfirmation(key), slot: el.comparisonSlot.value,
        text: ui.readoutText, raw: ui.ocrText, readout: ui.readout
    };
}

function invalidateIntakeDecision(key) {
    intakeTarget(key).revoke();
    prototypeState.lastGearComparison = null;
    prototypeState.candidateEquipped = false;
    resetGearVerdict();
    markUnsaved();
}

function renderIntakeGate(key) {
    const session = prototypeState.intakeSessions[key];
    const root = document.getElementById(`continuation-${key}`);
    if (!root) return;
    const target = intakeTarget(key);
    root.hidden = !target.base();
    const read = root.querySelector('[data-intake="read"]');
    read.disabled = !session?.file || session.reading || !root.querySelector('[data-intake="same"]').checked;
    const complete = root.querySelector('[data-intake="complete"]');
    complete.disabled = !session || session.captures.length < 2 || session.pending || session.reading || Boolean(session.conflict);
    complete.checked = Boolean(session?.reviewComplete);
    root.querySelector('[data-intake="status"]').textContent = session?.conflict ||
        (session?.reading ? "Reading another view…" : session?.pending ? "Another view selected · read it before confirming." :
        session?.incomplete ? "More of this tooltip remains below. Add the next view." :
        session?.captures.length > 1 ? "Review the combined fields and confirm capture completeness below." :
        "Long tooltip? Add a scrolled view with some overlap.");
    if (key.startsWith("loadout:")) {
        const confirm = document.getElementById(`loadout-${target.slot}-confirm`);
        confirm.hidden = !target.base();
        confirm.disabled = intakeBlocked(session);
    } else updateItemConfirmationUI(key);
}

function wireContinuationTarget(key, host) {
    const root = document.createElement("div");
    root.id = `continuation-${key}`;
    root.className = "screenshot-readout";
    root.hidden = true;
    root.innerHTML = `<p data-intake="status" class="muted" role="status"></p>
        <label class="button secondary">Add another view<input data-intake="file" type="file" accept="image/*" hidden></label>
        <label><input data-intake="same" type="checkbox"> These views show the same item</label>
        <button data-intake="read" type="button" class="secondary" disabled>Read another view</button>
        <label><input data-intake="complete" type="checkbox" disabled> I reviewed the combined views and the complete item is captured</label>`;
    root.querySelectorAll("label").forEach(label => {
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "0.5rem";
        label.style.marginBlock = "0.75rem";
    });
    root.querySelectorAll('input[type="checkbox"]').forEach(input => { input.style.width = "auto"; });
    host.append(root);
    root.querySelector('[data-intake="file"]').addEventListener("change", event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.type && !file.type.startsWith("image/")) { window.alert("Choose an image file."); return; }
        const session = prototypeState.intakeSessions[key] ?? newIntakeSession(key);
        session.file = file; session.pending = true; session.reviewComplete = false; session.conflict = "";
        root.querySelector('[data-intake="same"]').checked = false;
        invalidateIntakeDecision(key);
        renderIntakeGate(key);
    });
    root.querySelector('[data-intake="same"]').addEventListener("change", () => renderIntakeGate(key));
    root.querySelector('[data-intake="complete"]').addEventListener("change", event => {
        const session = prototypeState.intakeSessions[key];
        if (!session || session.pending || session.reading || session.conflict) return;
        session.reviewComplete = event.target.checked;
        // Completeness is explicitly reviewed, not inferred from OCR missing a marker.
        if (session.reviewComplete) session.incomplete = false;
        if (!key.startsWith("loadout:")) prototypeState.screenshotIncomplete[key] = session.incomplete;
        invalidateIntakeDecision(key);
        renderIntakeGate(key);
    });
    root.querySelector('[data-intake="read"]').addEventListener("click", () => readIntakeContinuation(key));
}

async function readIntakeContinuation(key) {
    const session = prototypeState.intakeSessions[key];
    const root = document.getElementById(`continuation-${key}`);
    if (!session?.file || session.reading || !root.querySelector('[data-intake="same"]').checked) return;
    const target = intakeTarget(key), file = session.file;
    const original = JSON.stringify(target.get());
    session.reading = true;
    invalidateIntakeDecision(key);
    renderIntakeGate(key);
    try {
        const result = await window.Tesseract.recognize(file, "eng");
        const passes = [result?.data?.text ?? ""];
        let extraction = parseDiabloItemText(passes[0], target.slot);
        if (shouldRunEnhancedRead(extraction)) {
            try {
                const enhanced = await window.Tesseract.recognize(await createEnhancedOcrSource(file), "eng");
                passes.push(enhanced?.data?.text ?? "");
                extraction = mergeScreenshotExtractions(extraction, parseDiabloItemText(passes[1], target.slot));
            } catch (error) { console.warn("Enhanced continuation read failed:", error); }
        }
        if (prototypeState.intakeSessions[key] !== session || session.file !== file) return;
        if (JSON.stringify(target.get()) !== original || target.slot !== intakeTarget(key).slot) {
            session.conflict = "Fields changed during the read. Review them, then read this view again.";
            return;
        }
        const merged = mergeContinuationDraft(target.get(), extraction,
            root.querySelector('[data-intake="same"]').checked);
        // Keep each capture and each preprocessing pass independently inspectable.
        session.captures.push({ fileName: file.name, passes: [...passes], accepted: merged.ok });
        target.readout.hidden = false;
        target.raw.textContent += "\n\n--- Another view ---\n" + passes.map((raw, index) => `Pass ${index + 1}\n${raw}`).join("\n\n");
        if (!merged.ok) {
            session.conflict = "Views were not merged. " + merged.conflicts.join("; ") + ". Correct the current fields or choose the matching view, then read again.";
            return;
        }
        target.set(merged.fields);
        target.store({ ...extraction, fields: merged.fields, captures: session.captures.map(capture => ({ ...capture })) });
        session.pending = false;
        session.conflict = "";
        session.incomplete = /\bScroll\s+Down\b/i.test(extraction.rawText ?? "");
        session.reviewComplete = false;
        target.text.textContent = "Another view merged into the draft. Review all fields before final Gamer Verification.";
        invalidateIntakeDecision(key);
    } catch (error) {
        if (prototypeState.intakeSessions[key] === session) session.conflict = "Could not read this view. Try again or choose another image.";
    } finally {
        session.reading = false;
        if (prototypeState.intakeSessions[key] === session) renderIntakeGate(key);
    }
}

function wireLoadoutScreenshotIntake(slot) {
    const slotKey = slot.key;
    const input = document.getElementById(`loadout-${slotKey}-screenshot-input`);
    const read = document.getElementById(`loadout-${slotKey}-screenshot-read`);
    const confirm = document.getElementById(`loadout-${slotKey}-confirm`);
    const remove = document.getElementById(`loadout-${slotKey}-screenshot-remove`);
    const preview = document.getElementById(`loadout-${slotKey}-screenshot-preview`);
    const empty = document.getElementById(`loadout-${slotKey}-screenshot-empty`);
    const status = document.getElementById(`loadout-${slotKey}-screenshot-status`);
    const readout = document.getElementById(`loadout-${slotKey}-readout`);
    const readoutText = document.getElementById(`loadout-${slotKey}-readout-text`);
    const ocrText = document.getElementById(`loadout-${slotKey}-ocr-text`);
    if (!input || !read || !confirm || !remove || !preview || !empty || !status || !readout || !readoutText || !ocrText) return;
    const intakeKey = `loadout:${slotKey}`;
    wireContinuationTarget(intakeKey, readout.parentElement);

    input.addEventListener("change", event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.type && !file.type.startsWith("image/")) {
            window.alert(`Please choose an image file for the ${slot.label.toLowerCase()} screenshot.`);
            input.value = "";
            return;
        }

        newIntakeSession(intakeKey);
        delete prototypeState.loadoutExtractions[slotKey];
        renderIntakeGate(intakeKey);
        const oldUrl = prototypeState.loadoutScreenshotUrls[slotKey];
        if (oldUrl) URL.revokeObjectURL(oldUrl);

        const url = URL.createObjectURL(file);
        prototypeState.loadoutScreenshots[slotKey] = file;
        prototypeState.loadoutScreenshotUrls[slotKey] = url;
        preview.src = url;
        preview.hidden = false;
        empty.hidden = true;
        remove.hidden = false;
        status.textContent = `${file.name || slot.label + " screenshot"} · ${formatScreenshotSize(file.size || 0)}`;
        read.disabled = false;
        confirm.hidden = true;
        readout.hidden = true;
        prototypeState.loadoutVerified[slotKey] = false;
        updateLoadoutIntelligence();
    });

    remove.addEventListener("click", () => {
        const session = newIntakeSession(intakeKey);
        session.pending = true;
        session.conflict = "Reattach item views to finish verification.";
        const url = prototypeState.loadoutScreenshotUrls[slotKey];
        if (url) URL.revokeObjectURL(url);
        delete prototypeState.loadoutScreenshots[slotKey];
        delete prototypeState.loadoutScreenshotUrls[slotKey];
        delete prototypeState.loadoutExtractions[slotKey];
        delete prototypeState.loadoutVerified[slotKey];
        input.value = "";
        preview.removeAttribute("src");
        preview.hidden = true;
        empty.hidden = false;
        remove.hidden = true;
        read.disabled = true;
        confirm.hidden = true;
        status.textContent = "Reattach views · unverified draft";
        readout.hidden = true;
        renderIntakeGate(intakeKey);
        updateLoadoutIntelligence();
    });

    read.addEventListener("click", async () => {
        const file = prototypeState.loadoutScreenshots[slotKey];
        if (!file) return;
        if (!window.Tesseract?.recognize) {
            readout.hidden = false;
            readoutText.textContent = "The screenshot reader did not load. Refresh the page and try again.";
            return;
        }

        const session = newIntakeSession(intakeKey);
        const original = JSON.stringify(getLoadoutItem(slotKey));
        session.reading = true;
        prototypeState.loadoutVerified[slotKey] = false;
        updateLoadoutIntelligence();
        read.disabled = true;
        confirm.hidden = true;
        status.textContent = "Reading…";

        try {
            const result = await window.Tesseract.recognize(file, "eng", {
                logger: message => {
                    if (message.status === "recognizing text") {
                        status.textContent = `Reading ${Math.round((message.progress ?? 0) * 100)}%`;
                    }
                }
            });

            let confidence = Number(result?.data?.confidence ?? 0);
            const rawOcrPasses = [result?.data?.text ?? ""];
            let extraction = parseDiabloItemText(rawOcrPasses[0], slotKey);
            let enhancedUsed = false;

            if (shouldRunEnhancedRead(extraction)) {
                try {
                    status.textContent = "Trying enhanced item-card read…";
                    const enhancedSource = await createEnhancedOcrSource(file);
                    const enhancedResult = await window.Tesseract.recognize(enhancedSource, "eng");
                    rawOcrPasses.push(enhancedResult?.data?.text ?? "");
                    extraction = mergeScreenshotExtractions(
                        extraction,
                        parseDiabloItemText(rawOcrPasses[1], slotKey)
                    );
                    confidence = Math.max(confidence, Number(enhancedResult?.data?.confidence ?? 0));
                    enhancedUsed = true;
                } catch (error) {
                    console.warn("Darkstorm enhanced Equipment read failed:", error);
                }
            }

            if (prototypeState.intakeSessions[intakeKey] !== session || prototypeState.loadoutScreenshots[slotKey] !== file) return;
            if (JSON.stringify(getLoadoutItem(slotKey)) !== original) {
                readoutText.textContent = "Fields changed during the read. Read again to replace them.";
                readout.hidden = false;
                return;
            }
            if ((extraction.detected ?? []).length < 2) {
                ocrText.textContent = rawOcrPasses
                    .map((text, index) => `--- Tesseract pass ${index + 1} ---\n${String(text ?? "").trim() || "(no text)"}`)
                    .join("\n\n");
                readout.hidden = false;
                readoutText.textContent =
                    `Darkstorm could not confidently map enough ${slot.label.toLowerCase()} data. Existing fields were left unchanged.`;
                status.textContent = "Needs manual review";
                return;
            }

            applyExtractionToLoadout(slotKey, extraction);
            session.captures = [{ fileName: file.name, passes: [...rawOcrPasses], accepted: true }];
            session.incomplete = /\bScroll\s+Down\b/i.test(extraction.rawText ?? "");
            prototypeState.loadoutExtractions[slotKey] = extraction;
            prototypeState.loadoutVerified[slotKey] = false;

            ocrText.textContent = rawOcrPasses
                .map((text, index) => `--- Tesseract pass ${index + 1} ---\n${String(text ?? "").trim() || "(no text)"}`)
                .join("\n\n");
            readout.hidden = false;
            readoutText.textContent =
                `OCR draft loaded into ${slot.label} (${Math.round(confidence)}% text confidence). Review the fields below, correct anything needed, then confirm.`;
            status.textContent = enhancedUsed ? "OCR draft · enhanced review" : "OCR draft · review";
            confirm.hidden = false;
            confirm.textContent = `Confirm ${slot.label} Data`;
            markUnsaved();
        } catch (error) {
            if (prototypeState.intakeSessions[intakeKey] !== session) return;
            console.error("Darkstorm Equipment screenshot read failed:", error);
            readout.hidden = false;
            readoutText.textContent =
                `Darkstorm could not read this ${slot.label.toLowerCase()} screenshot. Try a tighter crop or enter the item manually.`;
            status.textContent = "Read failed";
        } finally {
            session.reading = false;
            if (prototypeState.intakeSessions[intakeKey] !== session) return;
            read.disabled = false;
            renderIntakeGate(intakeKey);
        }
    });

    confirm.addEventListener("click", () => {
        if (!prototypeState.loadoutExtractions[slotKey] || intakeBlocked(prototypeState.intakeSessions[intakeKey])) return;
        prototypeState.loadoutVerified[slotKey] = true;
        updateLoadoutSummary(slotKey);
        updateLoadoutStatus();
        status.textContent = `Verified · saved to ${slot.label}`;
        readoutText.textContent =
            `${slot.label} verified. You can close this slot; its data stays in the character loadout.`;
        confirm.hidden = true;
        markUnsaved();
        analyzeBuild();
    });
}

function wireLoadoutScreenshotIntakes() {
    EQUIPMENT_SLOTS.forEach(wireLoadoutScreenshotIntake);
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

    item.affixDetails = affixDetailsFromLegacyText(item.affixes);
    return item;
}

function getLoadoutFromForm() {
    return Object.fromEntries(
        EQUIPMENT_SLOTS.map(slot => [slot.key, getLoadoutItem(slot.key)])
    );
}

function setLoadoutItem(slotKey, item = {}) {
    const normalized = { ...emptyLoadoutItem(), ...item };
    if (Array.isArray(item?.affixDetails) && item.affixDetails.length) {
        normalized.affixes = formatAffixDetails(item.affixDetails);
    }

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

function loadoutItemHasData(slotKey) {
    const item = getLoadoutItem(slotKey);
    return Boolean(
        item.name || item.rarity || item.itemType || item.itemPower ||
        item.armor || item.life || item.defense || item.damage ||
        item.requiredLevel || item.power || item.affixes || item.tempers ||
        item.masterwork || item.sockets || item.socketContents
    );
}

function updateLoadoutSummary(slotKey) {
    const summary = document.getElementById(`loadout-${slotKey}-summary`);
    if (!summary) return;

    const item = getLoadoutItem(slotKey);
    if (!loadoutItemHasData(slotKey)) {
        summary.textContent = "Empty";
        return;
    }

    // Item names are deliberately optional because OCR should not invent them.
    // Give a useful collapsed summary from trusted structured fields instead.
    const identity = item.name || [item.rarity, item.itemType].filter(Boolean).join(" ") || "Item";
    const power = item.itemPower ? ` · ${item.itemPower}` : "";
    summary.textContent = `${identity}${power}`;
}

function updateLoadoutStatus() {
    const status = document.getElementById("loadoutStatus");
    if (!status) return;

    const filled = EQUIPMENT_SLOTS.filter(slot => loadoutItemHasData(slot.key)).length;
    status.textContent = `${filled} / ${EQUIPMENT_SLOTS.length} slots filled`;
    updateLoadoutIntelligence();
}

function parseTemperUsage(value) {
    const match = String(value ?? "").match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) return null;
    return { used: Number(match[1]), total: Number(match[2]) };
}

function loadoutIntelligenceFor(character) {
    const loadout = character.gear?.loadout ?? {};
    const filled = EQUIPMENT_SLOTS
        .map(slot => ({ slot, item: loadout[slot.key] ?? emptyLoadoutItem() }))
        .filter(({ item }) => item.name || item.rarity || item.itemType || item.itemPower || item.power || item.affixes);

    if (!filled.length) {
        return {
            title: "Add equipped gear to begin.",
            summary: "Darkstorm needs at least one equipped item before it can reason about the loadout.",
            why: "There is no verified equipment evidence yet.",
            whyNow: "Loadout intelligence should be grounded in the character's actual gear.",
            whyNot: "Darkstorm will not invent missing equipment.",
            changes: "Scan or enter an equipped item and confirm its data.",
            confidence: null
        };
    }

    const screenshotDrafts = filled.filter(({ slot }) =>
        (prototypeState.loadoutExtractions[slot.key] || prototypeState.loadoutScreenshots[slot.key] ||
            intakeBlocked(prototypeState.intakeSessions[`loadout:${slot.key}`])) && !prototypeState.loadoutVerified[slot.key]
    );
    if (screenshotDrafts.length) {
        const labels = screenshotDrafts.map(({ slot }) => slot.label).join(", ");
        return {
            title: "Verify scanned equipment before optimizing.",
            summary: "OCR draft data is still awaiting gamer confirmation in: " + labels + ".",
            why: "Darkstorm treats OCR as intake assistance, not trusted character truth.",
            whyNow: "Gear intelligence should only act on screenshot-derived values after the player has reviewed them.",
            whyNot: "Using an unconfirmed OCR value could create a confident recommendation from a bad read.",
            changes: "Review and confirm the listed equipment slot" + (screenshotDrafts.length === 1 ? "" : "s") + ".",
            confidence: 96
        };
    }

    const level = Number(character.profile?.level ?? 0);
    const goal = character.profile?.goal ?? "balanced";
    const actionable = [];

    filled.forEach(({ slot, item }) => {
        const temperText = String(item.tempers ?? "");
        if (/\b(?:available|remaining|open temper|temper slot open)\b/i.test(temperText)) {
            actionable.push({ priority: 100, slot, item,
                reason: "the recorded temper notes explicitly show an available temper opportunity",
                action: "Review the available temper opportunity on " + slot.label + "." });
        }
        if (level >= 70 && item.itemPower > 0 && item.itemPower < 700) {
            actionable.push({ priority: 78, slot, item,
                reason: "item power " + item.itemPower + " is notably below the likely upgrade space for an endgame-level character",
                action: "Look for a replacement " + slot.label.toLowerCase() + " before spending heavily on this item." });
        }
        if (item.power && item.powerValue && item.powerMin && item.powerMax) {
            const value = Number(String(item.powerValue).replace(/[^0-9.]/g, ""));
            const low = Number(String(item.powerMin).replace(/[^0-9.]/g, ""));
            const high = Number(String(item.powerMax).replace(/[^0-9.]/g, ""));
            if (Number.isFinite(value) && Number.isFinite(low) && Number.isFinite(high) && high > low &&
                (value - low) / (high - low) < 0.25) {
                actionable.push({ priority: 62, slot, item,
                    reason: "its visible power roll is near the low end of the shown range",
                    action: "Keep " + slot.label + " in the upgrade watchlist rather than treating the current power roll as settled." });
            }
        }
    });

    const chosen = actionable.sort((a, b) => b.priority - a.priority)[0];
    const coverage = filled.length;
    const verifiedScans = filled.filter(({ slot }) => prototypeState.loadoutVerified[slot.key]).length;
    const confidence = Math.min(88, 46 + coverage * 3 + verifiedScans * 2);

    if (chosen) {
        const itemName = chosen.item.name || [chosen.item.rarity, chosen.item.itemType].filter(Boolean).join(" ") || chosen.slot.label;
        return {
            title: chosen.action,
            summary: itemName + ": " + chosen.reason + ".",
            why: "This is a concrete loadout issue Darkstorm can see directly in the recorded equipment data.",
            whyNow: "It is a controlled gear action that can be addressed without changing skills, Paragon, and multiple items at once.",
            whyNot: "Darkstorm is not claiming this is the mathematically best possible item; the prototype does not yet have authoritative build-specific damage simulation.",
            changes: "A stronger verified replacement, completed temper/socket state, or player test result can change this priority.",
            confidence
        };
    }

    const identity = buildIdentityFor(character);
    const unverified = filled.filter(({ slot }) => !prototypeState.loadoutVerified[slot.key]);
    const verifiedLabel = verifiedScans === 1 ? "1 slot is" : verifiedScans + " slots are";

    if (coverage === EQUIPMENT_SLOTS.length && unverified.length) {
        return {
            title: "Keep the current recorded gear stable and verify the loadout.",
            summary: coverage + " of " + EQUIPMENT_SLOTS.length + " equipment slots contain data, but only " + verifiedLabel + " verified from player-reviewed equipment evidence. No obvious low-risk gear action is visible yet.",
            why: "Darkstorm can use the full recorded loadout for context, but it should not treat demo or otherwise unverified slot data as equal to player-confirmed equipment.",
            whyNow: "The loadout is already complete. The useful next step is improving evidence quality, not asking the player to fill slots that already contain data.",
            whyNot: "A generic score or unverified demo item is not enough to justify replacing a functioning item, especially for " + identity.label.toLowerCase() + " and the current " + goal + " goal.",
            changes: "Verify another equipped slot, compare a real candidate, or record a play-test result. Each confirmed slot can raise Darkstorm's confidence.",
            confidence
        };
    }

    return {
        title: "Keep the current recorded gear stable and fill the remaining loadout.",
        summary: coverage + " of " + EQUIPMENT_SLOTS.length + " equipment slots contain data. No obvious low-risk gear action is visible yet.",
        why: "The recorded items do not expose an explicitly available temper, clearly low item-power outlier, or bottom-quartile visible power roll.",
        whyNow: "More complete loadout coverage gives Darkstorm better evidence before it recommends replacing a functioning item.",
        whyNot: "A generic score alone is not enough to justify a swap, especially for " + identity.label.toLowerCase() + " and the current " + goal + " goal.",
        changes: "Add and verify more equipped slots, compare a real candidate, or record a play-test result.",
        confidence
    };
}

function updateLoadoutIntelligence(character = getCharacterFromForm()) {
    const result = loadoutIntelligenceFor(character);
    const fields = {
        loadoutIntelligenceTitle: result.title,
        loadoutIntelligenceSummary: result.summary,
        loadoutIntelligenceWhy: result.why,
        loadoutIntelligenceWhyNow: result.whyNow,
        loadoutIntelligenceWhyNot: result.whyNot,
        loadoutIntelligenceChanges: result.changes
    };
    Object.entries(fields).forEach(([id, value]) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    });
    const badge = document.getElementById("loadoutIntelligenceConfidence");
    if (badge) badge.textContent = result.confidence == null ? "Confidence: --" : "Confidence: " + result.confidence + "%";
    return result;
}

function comparisonSlotLabel(slotKey = el.comparisonSlot?.value) {
    return EQUIPMENT_SLOTS.find(slot => slot.key === slotKey)?.label ?? "Item";
}

function loadSelectedSlotFromLoadout() {
    const slotKey = el.comparisonSlot.value;
    const equippedItem = getLoadoutItem(slotKey);
    clearItemScreenshot("equipped");
    setGear("equipped", equippedItem);
    prototypeState.itemConfirmed.equipped = Boolean(prototypeState.loadoutVerified[slotKey]);
    if (!prototypeState.loadoutVerified[slotKey] &&
        (prototypeState.loadoutExtractions[slotKey] || intakeBlocked(prototypeState.intakeSessions[`loadout:${slotKey}`]))) {
        const session = newIntakeSession("equipped");
        session.pending = true;
        session.conflict = "Verify this item in Equipment, then load the slot again, or reattach its screenshots here.";
        updateItemConfirmationUI("equipped");
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

function numericAffixRoll(detail) {
    return decimalFromOcr(String(detail?.value ?? ""));
}

function affixValueFor(details, pattern) {
    return details
        .filter(detail => pattern.test(String(detail?.stat ?? "")))
        .reduce((sum, detail) => sum + numericAffixRoll(detail), 0);
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
    // The shared controller owns continuation selection and completeness review.
    for (const element of [ui.continuationNotice, ui.continuationLabel, ui.continuationRead]) {
        if (element) element.hidden = true;
    }
    renderIntakeGate(prefix);
}

function clearContinuation(prefix) {
    delete prototypeState.intakeSessions[prefix];
    prototypeState.screenshotIncomplete[prefix] = false;
    updateContinuationUI(prefix);
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

function clearItemScreenshot(prefix, { revoke = true, preserveDraft = false } = {}) {
    const screenshot = prototypeState.screenshots[prefix];
    const needsReview = preserveDraft && (screenshot || prototypeState.baseScreenshotExtractions[prefix]) && !prototypeState.itemConfirmed[prefix];
    prototypeState.baseScreenshotExtractions[prefix] = null;
    clearContinuation(prefix);

    if (revoke && screenshot?.url) {
        URL.revokeObjectURL(screenshot.url);
    }

    prototypeState.screenshots[prefix] = null;
    prototypeState.screenshotItemTypes[prefix] = "";
    prototypeState.itemConfirmed[prefix] = false;
    if (needsReview) {
        const session = newIntakeSession(prefix);
        session.pending = true;
        session.conflict = "Reattach item views to finish verification.";
    }
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
    newIntakeSession(prefix);

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
    return Boolean(prototypeState.screenshots[prefix] || intakeBlocked(prototypeState.intakeSessions[prefix]));
}

function confirmationBlockingState() {
    const pending = SCREENSHOT_PREFIXES.filter(prefix =>
        itemConfirmationRequired(prefix) &&
        (!prototypeState.itemConfirmed[prefix] || intakeBlocked(prototypeState.intakeSessions[prefix]))
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
    } else if (prototypeState.screenshotIncomplete[prefix] || intakeBlocked(prototypeState.intakeSessions[prefix])) {
        panel.classList.add("needs-confirmation");
        status.textContent = prototypeState.intakeSessions[prefix]?.conflict || "Incomplete capture · continuation needed";
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
    if (!itemConfirmationRequired(prefix) || prototypeState.screenshotIncomplete[prefix] ||
        intakeBlocked(prototypeState.intakeSessions[prefix])) return;

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
    const normalized = String(text ?? "")
        .toLowerCase()
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ");
    const matches = OCR_ITEM_TYPES
        .filter(([needle]) => normalized.includes(needle))
        .sort((a, b) => b[0].length - a[0].length);
    return matches[0]?.[1] ?? "";
}

function itemTitleLooksSupported(value) {
    const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
    if (!words.length || words.some(word => /^[iIlL]$/.test(word))) return false;
    const capsTitle = words.filter(word => /^[A-Z]{3,}$/.test(word)).length >= 2;
    return !capsTitle || words.every(word => /^[A-Z'’&-]+$/.test(word) || /^(?:of|the|and|a)$/i.test(word));
}

function recoverItemIdentityFromRawPasses(rawPasses = []) {
    const results = [];

    rawPasses.forEach(raw => {
        const lines = cleanedOcrLines(raw);
        if (!lines.length) return;

        const rarityIndex = lines.findIndex(line => /\b(?:legendary|unique|rare|magic)\b/i.test(line));
        if (rarityIndex < 0) return;

        const rarityMatch = lines[rarityIndex].match(/\b(Legendary|Unique|Rare|Magic)\b/i);
        const rarity = rarityMatch
            ? rarityMatch[1][0].toUpperCase() + rarityMatch[1].slice(1).toLowerCase()
            : "";

        // Reconstruct wrapped item types from the rarity line plus nearby header
        // lines. Prefer the longest recognized type so "Two-Handed Sword" wins
        // over the nested generic "Sword".
        const typeWindow = lines.slice(rarityIndex, Math.min(lines.length, rarityIndex + 4)).join(" ");
        const normalizedWindow = typeWindow.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ");
        const typeMatches = OCR_ITEM_TYPES
            .filter(([needle]) => normalizedWindow.includes(needle))
            .sort((a, b) => b[0].length - a[0].length);
        const itemType = typeMatches[0]?.[1] ?? "";

        const nameResult = parseItemName(lines, rarityIndex);
        const headerIdentity = recoverHeaderIdentityNearItemPower(lines);
        results.push({
            rarity,
            itemType,
            name: [nameResult.confident ? nameResult.value : "", headerIdentity.name || ""]
                .find(value => value && itemTitleLooksSupported(value)) || ""
        });
    });

    const chooseConsensus = key => {
        const values = results.map(result => result[key]).filter(Boolean);
        if (!values.length) return "";
        const groups = new Map();
        values.forEach(value => {
            const normalized = key === "name" ? normalizedItemName(value) : value.toLowerCase();
            if (!groups.has(normalized)) groups.set(normalized, []);
            groups.get(normalized).push(value);
        });
        const best = [...groups.values()].sort((a, b) => b.length - a.length)[0];
        // For clean header identity fields, a single usable pass is evidence.
        // Names are special: preprocessing can make one pass lose border-adjacent
        // title text while the other still has a clean title. Prefer the longest
        // normalized title when one is a clear word-preserving extension of the
        // other; otherwise conflicting names still fail closed.
        if (groups.size > 1) {
            if (key !== "name") return "";
            const normalizedGroups = [...groups.entries()]
                .sort((a, b) => b[0].length - a[0].length);
            const [longestKey, longestValues] = normalizedGroups[0];
            const compatible = normalizedGroups.slice(1).every(([candidate]) =>
                longestKey.includes(candidate) || candidate.includes(longestKey)
            );
            return compatible ? longestValues[0] : "";
        }
        return best[0];
    };

    return {
        rarity: chooseConsensus("rarity"),
        itemType: chooseConsensus("itemType"),
        name: chooseConsensus("name")
    };
}

function normalizedItemName(value) {
    return normalizeIdentityOcr(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function parseItemName(lines, rarityIndex) {
    if (rarityIndex < 0) {
        return { value: "", confident: false };
    }

    // Tesseract can collapse the wrapped item title and rarity onto one line.
    const rarityLine = String(lines[rarityIndex] ?? "");
    const inlineRarity = rarityLine.match(/\b(?:Legendary|Unique|Rare|Magic)\b/i);
    if (inlineRarity?.index > 0) {
        const inlineTitle = cleanDiabloTitleLine(rarityLine.slice(0, inlineRarity.index));
        const words = inlineTitle.split(/\s+/).filter(Boolean);
        if (inlineTitle.length >= 3 && inlineTitle.length <= 64 && words.length <= 8 && /^[A-Za-z][A-Za-z'’& -]+$/.test(inlineTitle)) {
            return { value: inlineTitle, confident: true };
        }
    }

    if (rarityIndex === 0) {
        return { value: "", confident: false };
    }

    // Item names are much noisier than numeric stats. Stay conservative:
    // only inspect the lines immediately above the rarity/type line and
    // prefer a blank field over combining unrelated UI text into a fake name.
    const blacklist = /(?:equipped|character|stats|materials|no title|weapon damage|toughness|strength|intelligence|willpower|dexterity|equipment|dungeon keys|slot transmog|hide transmog|mark as favorite|legendary|unique|rare|magic|item power|armor|damage per second)/i;
    const candidates = [];
    const windowStart = Math.max(0, rarityIndex - 3);

    for (let index = windowStart; index < rarityIndex; index += 1) {
        const line = lines[index].trim()
            .replace(/[Ø@]/g, "O")
            .replace(/\s+/g, " ");
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

    // Diablo item names frequently wrap across 2-3 short all-caps lines
    // (e.g. BRISTLEBACK / GARGOYLE / GREATSWORD). Reconstruct the contiguous
    // title block immediately above rarity, while still refusing UI text.
    const contiguous = [];
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
        const candidate = candidates[index];
        const expectedIndex = rarityIndex - 1 - contiguous.length;
        if (candidate.index !== expectedIndex) break;
        contiguous.unshift(candidate.line);
        if (contiguous.length === 3) break;
    }

    let value = nearest.line;
    if (contiguous.length >= 2) {
        const combined = contiguous.join(" ").trim();
        const combinedWords = combined.split(/\s+/).filter(Boolean);
        if (combined.length <= 64 && combinedWords.length <= 8) {
            value = combined;
        }
    }

    return {
        value,
        confident: Boolean(value)
    };
}

function normalizeIdentityOcr(value) {
    return String(value ?? "")
        .replace(/[®©Ø@]/g, "O")
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanDiabloTitleLine(value) {
    let line = normalizeIdentityOcr(value)
        .replace(/^[^A-Za-z]+/, "")
        .replace(/[^A-Za-z]+$/g, "")
        .trim();

    // OCR border fragments can attach one stray letter to an otherwise
    // all-caps title line: "FBRISTLEBACK" / "GREATSWORD J".
    const words = line.split(/\s+/).filter(Boolean)
        .filter(word => word.length > 1 || /^(?:A|I)$/i.test(word));
    line = words.join(" ");

    if (/^[A-Z]{8,}$/.test(line) && /^F[A-Z]{7,}$/.test(line)) {
        line = line.slice(1);
    }
    return line;
}

function recoverHeaderIdentityNearItemPower(lines) {
    const powerIndex = lines.findIndex(line => /\bitem\s+power\b/i.test(line));
    if (powerIndex < 1) return { name: "", rarity: "", itemType: "" };

    const start = Math.max(0, powerIndex - 10);
    const header = lines.slice(start, powerIndex).map(normalizeIdentityOcr);
    const rarityLocal = header.findIndex(line => /\b(?:legendary|unique|rare|magic)\b/i.test(line));
    if (rarityLocal < 0) return { name: "", rarity: "", itemType: "" };

    const rarityMatch = header[rarityLocal].match(/\b(Legendary|Unique|Rare|Magic)\b/i);
    const rarity = rarityMatch ? rarityMatch[1][0].toUpperCase() + rarityMatch[1].slice(1).toLowerCase() : "";

    // Type may wrap: "Legendary Two-Handed /" then "Sword".
    const typeWindow = header.slice(rarityLocal, Math.min(header.length, rarityLocal + 3))
        .join(" ")
        .replace(/[|/\\]+/g, " ")
        .replace(/[^A-Za-z -]+/g, " ")
        .replace(/\s+/g, " ");
    let itemType = exactItemTypeFromText(typeWindow);
    if (/two\s*-?\s*handed/i.test(typeWindow)) {
        const weapon = typeWindow.match(/\b(sword|axe|mace|scythe)\b/i)?.[1];
        if (weapon) itemType = `Two-Handed ${weapon[0].toUpperCase() + weapon.slice(1).toLowerCase()}`;
    }

    // Walk upward from rarity, collecting title-like lines. Skip pure border/UI
    // noise but stop before EQUIPPED / Item Selected. Strip border punctuation
    // around the words instead of rejecting the entire OCR line.
    const title = [];
    for (let i = rarityLocal - 1; i >= 0 && title.length < 4; i -= 1) {
        let line = header[i];
        if (/\b(?:equipped|item selected|two-handed.*selected)\b/i.test(line)) break;
        line = cleanDiabloTitleLine(line);
        if (!line) continue;
        if (/\b(?:equipped|character|inventory|compare)\b/i.test(line)) break;
        const words = line.match(/[A-Za-z][A-Za-z'’&-]*/g) ?? [];
        if (!words.length) continue;
        const cleaned = words.join(" ");
        if (cleaned.length < 3) continue;
        title.unshift(cleaned);
    }

    let name = title.join(" ").trim();
    // Common tooltip border/OCR debris can appear as tiny lowercase prefixes
    // or short suffixes around an otherwise clean all-caps title.
    let titleWords = name.split(/\s+/).filter(Boolean);
    while (titleWords.length > 1 && /^[a-z]{1,3}$/.test(titleWords[0])) titleWords.shift();
    while (titleWords.length > 1 && /^[A-Z]{1,3}$/.test(titleWords[titleWords.length - 1]) &&
           !/^(?:OF|THE|AND)$/.test(titleWords[titleWords.length - 1])) titleWords.pop();
    name = titleWords.join(" ");
    const wordCount = titleWords.length;

    // If OCR preserved a clean title immediately above the rarity but lost
    // enough letters to make the assembled title unusable, prefer that local
    // title evidence rather than returning blank. Do not invent missing words.
    if (!name && rarityLocal > 0) {
        const nearby = header
            .slice(Math.max(0, rarityLocal - 3), rarityLocal)
            .map(cleanDiabloTitleLine)
            .filter(line =>
                line &&
                !/\b(?:equipped|item selected|character|inventory|compare)\b/i.test(line) &&
                /^[A-Za-z][A-Za-z'’& -]{2,64}$/.test(line)
            );
        name = nearby.join(" ").trim();
        titleWords = name.split(/\s+/).filter(Boolean);
    }

    return {
        name: name.length >= 3 && name.length <= 72 && titleWords.length <= 9 ? name : "",
        rarity,
        itemType
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
        [/\bt(?:[hn]orns|homs)\b/i, "Thorns"],
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
        [/vulnerable\s+damage\s+multiplier/i, "Vulnerable Damage Multiplier", true],
        [/shadow\s+damage\s+multiplier/i, "Shadow Damage Multiplier", true],
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
        [/(?:poison|fire|cold|lightning|shadow)\s+resistance/i, source => {
            const m = source.match(/(poison|fire|cold|lightning|shadow)\s+resistance/i);
            return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() + " Resistance" : "Resistance";
        }, false],
        [/resistance/i, "Resistance", true],
        [/intelligence/i, "Intelligence", false],
        [/strength/i, "Strength", false],
        [/dexterity/i, "Dexterity", false],
        [/willpower/i, "Willpower", false],
        [/\bt(?:[hn]orns|homs)\b/i, "Thorns", false],
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
        [/vulnerable\s+damage\s+multiplier/ig, "Vulnerable Damage Multiplier", true],
        [/shadow\s+damage\s+multiplier/ig, "Shadow Damage Multiplier", true],
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
        [/(?:poison|fire|cold|lightning|shadow)\s+resistance/ig, source => {
            const m = source.match(/(poison|fire|cold|lightning|shadow)\s+resistance/i);
            return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() + " Resistance" : "Resistance";
        }, false],
        [/resistance/ig, "Resistance", true],
        [/intelligence/ig, "Intelligence", false],
        [/strength/ig, "Strength", false],
        [/dexterity/ig, "Dexterity", false],
        [/willpower/ig, "Willpower", false],
        [/\bt(?:[hn]orns|homs)\b/ig, "Thorns", false],
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
            if (stat === "Resistance" && /(?:all|poison|fire|cold|lightning|shadow)\s+$/i.test(source.slice(Math.max(0, match.index - 12), match.index))) {
                continue;
            }
            const resolvedStat = typeof stat === "function" ? stat(source) : stat;
            definitions.push({ stat: resolvedStat, percent, charIndex: match.index, endIndex: match.index + match[0].length });
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
        // A hyphen following a number is a range separator, not an affix roll.
        .filter(match => !match[0].startsWith("-") ||
            !/[0-9OIlS,.]\s*$/.test(source.slice(0, match.index)))
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

            const rangeOffset = line.slice(definition.endIndex).search(/[\[(]/);
            const rangeStart = rangeOffset < 0 ? segmentEnd : definition.endIndex + rangeOffset;
            const inside = signedValues.find(value =>
                value.charIndex >= definition.endIndex &&
                value.charIndex < Math.min(segmentEnd, rangeStart) &&
                /^[\s:|]*$/.test(line.slice(definition.endIndex, value.charIndex))
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

function recoverMultiplierAffixesBefore(lines, endIndex) {
    const details = [];
    const safeEnd = Math.max(0, Math.min(lines.length, endIndex));
    for (let index = 0; index < safeEnd; index += 1) {
        const line = String(lines[index] ?? "");
        const match = line.match(/[xX×]\s*([0-9OIlS,.]+(?:\.[0-9]+)?)\s*%\s+([A-Za-z ]+?Damage Multiplier)\b/i);
        if (!match) continue;
        const value = decimalFromOcr(match[1]);
        if (!value) continue;
        const stat = match[2].replace(/\s+/g, " ").trim();
        const window = lines.slice(index, Math.min(safeEnd, index + 3)).join(" ");
        const rangeMatch = window.match(/[\[(]?\s*([0-9OIlS,.]+(?:\.[0-9]+)?)\s*[-–—]\s*([0-9OIlS,.]+(?:\.[0-9]+)?)\s*[\])]?\s*%/);
        let min = "", max = "";
        if (rangeMatch) {
            const low = decimalFromOcr(rangeMatch[1]), high = decimalFromOcr(rangeMatch[2]);
            if (low > 0 && high >= low && high <= 100) {
                min = String(low) + "%"; max = String(high) + "%";
            }
        }
        details.push({ stat, value: "x" + value + "%", min, max });
    }
    return details;
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
            const sameLineSegment = line.slice(segmentStart, segmentEnd);

            // Multiplier ranges are often wrapped by OCR, e.g.
            // "x18% All Damage Multiplier [12 -" then "20]%".
            const wrappedRows = [];
            for (let index = anchor.lineIndex + 1; index < Math.min(lines.length, anchor.lineIndex + 3); index += 1) {
                if (stopPattern.test(lines[index]) || lineStatDefinitions(lines[index]).length || /[a-z]{3,}/i.test(lines[index])) break;
                wrappedRows.push(lines[index]);
            }
            const wrappedSegment = [sameLineSegment, ...wrappedRows].join(" ");

            const multiplierRange = wrappedSegment.match(
                /[\[(]?\s*([0-9OIlS,.]+(?:\.[0-9]+)?)\s*[-–—]\s*([0-9OIlS,.]+(?:\.[0-9]+)?)\s*[\])]?\s*%?/
            );
            if (multiplierRange) {
                const low = decimalFromOcr(multiplierRange[1]);
                let high = decimalFromOcr(multiplierRange[2]);

                // OCR sometimes turns the closing bracket in "[12 - 20]%"
                // into a trailing 1, yielding 201. For a percentage multiplier
                // range, only repair that specific implausible shape.
                if (
                    high >= 100 &&
                    /1$/.test(String(multiplierRange[2]).trim()) &&
                    high / 10 >= low &&
                    high / 10 <= 100
                ) {
                    high = Math.trunc(high / 10);
                }

                if (low > 0 && high >= low && high <= 100) range = { low, high };
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
                // Wrapped range rows contain numbers/punctuation, not power prose.
                // Stop even when the next power's wording is unknown to the parser.
                if (/[a-z]{3,}/i.test(lines[lineIndex])) break;
                range = decimalRangeFromLine(lines[lineIndex]);
                if (range) break;
            }
        }

        let numeric = decimalFromOcr(anchor.value);
        let displayValue = anchor.value;

        // A second OCR pass can add a stray leading digit to a percentage
        // (7.4% -> 17.4%). If the visible roll range proves that dropping that
        // one leading digit produces a valid value, repair only that narrow case.
        if (anchor.percent && range && numeric > range.high) {
            const unsigned = String(anchor.value ?? "").replace(/^[+-]/, "").replace("%", "");
            if (/^[0-9][0-9]\.[0-9]+$/.test(unsigned)) {
                const candidate = decimalFromOcr(unsigned.slice(1));
                if (candidate >= range.low && candidate <= range.high) {
                    numeric = candidate;
                    displayValue = (String(anchor.value).trim().startsWith("-") ? "-" : "+") + candidate + "%";
                }
            }
        }

        const valueValid = Boolean(displayValue) &&
            numeric > 0 &&
            (!range || (numeric >= range.low && numeric <= range.high));

        // A range is decision data only when the same record supports its roll.
        // Keep the raw OCR for review, but never attach an orphaned range.
        const percentSuffix = anchor.percent ? "%" : "";
        details.push({
            stat: anchor.stat,
            value: valueValid ? (
                anchor.percent && !displayValue.includes("%")
                    ? displayValue + "%"
                    : displayValue
            ) : "",
            min: range && valueValid ? String(range.low) + percentSuffix : "",
            max: range && valueValid ? String(range.high) + percentSuffix : ""
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
        .replace(/(^|\s)[<>{}]+(?=\s|$)/g, " ")
        .replace(/\{[Il1]\s+/g, " ")
        .replace(/\s+([,.;:])/g, "$1")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function socketEffectFromLines(lines) {
    const effectIndex = lines.findIndex(line =>
        /\+\s*[0-9OIlS,.]+\s+(?:Poison|Fire|Cold|Lightning|Shadow)\s+Resistance\b/i.test(line)
    );
    if (effectIndex < 0) return null;

    const match = lines[effectIndex].match(
        /\+\s*([0-9OIlS,.]+)\s+(Poison|Fire|Cold|Lightning|Shadow)\s+Resistance\b/i
    );
    if (!match) return null;

    const value = integerFromOcr(match[1]);
    if (!value) return null;
    const element = match[2][0].toUpperCase() + match[2].slice(1).toLowerCase();
    return {
        lineIndex: effectIndex,
        text: `Gem: +${value} ${element} Resistance`
    };
}

function uniquePowerStartIndex(lines, startIndex = 0) {
    const strongPatterns = [
        /\ba\s*dark\s+aura\s+surrounds\s+you\b/i,
        /\byour\s+summons?\b/i,
        /\bconsuming\s+a\s+corpse\b/i,
        /\bonly\s+army\s+of\s+the\s+dead\b/i
    ];
    for (let index = Math.max(0, startIndex); index < lines.length; index += 1) {
        const normalized = String(lines[index] ?? "").replace(/[^A-Za-z0-9%]+/g, " ").replace(/\s+/g, " ").trim();
        if (strongPatterns.some(pattern => pattern.test(normalized))) return index;
    }
    return -1;
}

function powerBlockFromLines(lines, affixEndIndex = 0) {
    const metadataPattern = /\b(?:empty socket|requires level|sell value|durability|equip|compare|mark as junk|drop|scroll|tempers?|properties lost when equipped|poison resistance|fire resistance|cold resistance|lightning resistance|shadow resistance)\b|\(\s*[0-9OIlS]{1,4}\s*\/\s*[0-9OIlS,]{3,}\s*\)/i;
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
                /\b(?:damage|increased|deals|makes|enemies|vulnerable|ground|desecrated|seconds?|summons?|vampiric|curse|corpse|souls?|army|dodge|block|trigger|attack|attacker|thorns)\b/i.test(window);
            const hasPercentEvidence =
                /[0-9OIlS]+(?:\.[0-9OIlS]+)?\s*%(?:\s*\|?\s*\[x\])?/.test(window);
            const hasUniqueProse =
                /\b(?:your\s+summons|vampiric\s+curse|consuming\s+a\s+corpse|only\s+army\s+of\s+the\s+dead|a\s+dark\s+aura|decrepify|iron\s+maiden|curses?\s+inflicted)\b/i.test(window);
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
        /\b(?:your\s+summons|vampiric\s+curse|consuming\s+a\s+corpse|only\s+army\s+of\s+the\s+dead|a\s+dark\s+aura|decrepify|iron\s+maiden|curses?\s+inflicted)\b/i.test(text) &&
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
    const headerFallback = recoverHeaderIdentityNearItemPower(lines);

    let rarityIndex = lines.findIndex(line =>
        /\b(?:legendary|unique|rare|magic)\b/i.test(line) &&
        /\b(?:helm|chest|armor|gloves|pants|boots|amulet|ring|sword|axe|mace|dagger|wand|scythe|focus|shield|staff|polearm|totem)\b/i.test(line)
    );

    // Weapon headers are especially prone to line wrapping. Accept a rarity
    // line when a recognized item type appears in the next two OCR lines.
    if (rarityIndex < 0) {
        rarityIndex = lines.findIndex((line, index) =>
            /\b(?:legendary|unique|rare|magic)\b/i.test(line) &&
            Boolean(exactItemTypeFromText(lines.slice(index, index + 3).join(" ")))
        );
    }

    if (rarityIndex >= 0) {
        const rarityMatch = lines[rarityIndex].match(/\b(Legendary|Unique|Rare|Magic)\b/i);
        if (rarityMatch) {
            const rarity = rarityMatch[1].toLowerCase();
            fields.rarity = rarity[0].toUpperCase() + rarity.slice(1);
            detected.push("Rarity");
        }

        const exactType = exactItemTypeFromText(lines.slice(rarityIndex, rarityIndex + 3).join(" "));
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

    if (!fields.rarity && headerFallback.rarity) {
        fields.rarity = headerFallback.rarity;
        detected.push("Rarity");
    }
    if ((!fields.itemType || fields.itemType === "Sword") && headerFallback.itemType) {
        fields.itemType = headerFallback.itemType;
        detected.push("Item type");
        const rejectedIndex = rejected.indexOf("Item type");
        if (rejectedIndex >= 0) rejected.splice(rejectedIndex, 1);
    }
    if (!fields.name && headerFallback.name) {
        fields.name = headerFallback.name;
        detected.push("Name");
        const uncertainIndex = uncertain.indexOf("Name");
        if (uncertainIndex >= 0) uncertain.splice(uncertainIndex, 1);
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

    if (fields.itemType === "Ring") {
        const allResistLine = lines.find(line => /\ball\s+resist\b/i.test(line));
        if (allResistLine) {
            const match = allResistLine.match(/([0-9OIlS,.]+)\s+All\s+Resist/i);
            if (match) {
                const value = integerFromOcr(match[1]);
                if (value > 0) {
                    fields.defense = value;
                    detected.push("All Resist");
                }
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
    let inferredPowerIndex = -1;
    if (explicitPowerIndex < 0) {
        inferredPowerIndex = lines.findIndex((line, index) => {
            if (index < cursor) return false;
            const current = String(line ?? "");
            const actionStart = /\b(?:when\s+you|your\s+summons|a\s+dark\s+aura|consuming\s+a\s+corpse|only\s+army|cold\s+damages?\s+(?:is\s+)?increased|your\s+desecrated\s+ground)\b/i.test(current);
            if (!actionStart) return false;
            const window = lines.slice(index, Math.min(lines.length, index + 5)).join(" ");
            const powerLanguage = /\b(?:trigger|increased\s+damage|damage\s+is\s+increased|vampiric\s+curse|decrepify|iron\s+maiden|thorns\s+attack|souls?|vulnerable)\b/i.test(window);
            return powerLanguage;
        });
    }

    let uniquePowerIndex = -1;
    if (explicitPowerIndex < 0 && fields.rarity === "Unique") {
        // Prefer the earliest strong Unique-power opening. Continuation prose
        // such as "Curses inflicted..." must not outrank "A dark aura...".
        const strongOpen = uniquePowerStartIndex(lines, cursor);
        const continuationOpen = lines.findIndex((line, index) =>
            index >= cursor && /\bcurses?\s+inflicted\b/i.test(line)
        );
        uniquePowerIndex = strongOpen >= 0 ? strongOpen : continuationOpen;
    }
    const socketEffect = socketEffectFromLines(lines);
    const affixHardEnd = explicitPowerIndex >= 0
        ? explicitPowerIndex
        : (uniquePowerIndex >= 0
            ? uniquePowerIndex
            : (inferredPowerIndex >= 0
                ? inferredPowerIndex
                : (socketEffect?.lineIndex >= 0
                    ? socketEffect.lineIndex
                    : (metadataIndex >= 0 ? metadataIndex : lines.length))));
    const affixLines = lines.slice(0, affixHardEnd);

    const stopPattern = /\b(?:imprinted|aspect|empty socket|requires level|sell value|durability|tempers?|mark as junk|compare|drop|scroll)\b/i;
    const parsedAffixes = sequentialAffixes(affixLines, cursor, stopPattern);
    recoverMultiplierAffixesBefore(lines, affixHardEnd).forEach(detail => {
        const existing = parsedAffixes.details.find(item =>
            String(item.stat).toLowerCase() === String(detail.stat).toLowerCase()
        );
        if (!existing && parsedAffixes.details.length < MAX_AFFIX_ROWS) parsedAffixes.details.push(detail);
        else if (existing) {
            if (!existing.value && detail.value) existing.value = detail.value;
            if (!existing.min && detail.min) existing.min = detail.min;
            if (!existing.max && detail.max) existing.max = detail.max;
        }
    });
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
        : (uniquePowerIndex >= 0
            ? uniquePowerIndex
            : (inferredPowerIndex >= 0 ? inferredPowerIndex : finalAffixLine + 1));
    let powerBlock = null;
    if (powerSearchStart >= 0 && (explicitPowerIndex >= 0 || uniquePowerIndex >= 0 || inferredPowerIndex >= 0)) {
        const metadataPattern = /\b(?:empty socket|requires level|sell value|durability|equip|compare|mark as junk|drop|scroll|tempers?|properties lost when equipped|poison resistance|fire resistance|cold resistance|lightning resistance|shadow resistance)\b/i;
        const blockLines = [];
        for (let index = powerSearchStart; index < lines.length && blockLines.length < 10; index += 1) {
            if (index > powerSearchStart && metadataPattern.test(lines[index])) break;
            blockLines.push(lines[index]);
        }
        const text = cleanPowerText(
            blockLines.join(" ").replace(/^.*?\b(?:imprinted|aspect)\b\s*:?\s*/i, "")
        );
        if (powerLooksUsable(text) || text.length >= 30) {
            let range = decimalRangeFromLine(text);
            if (!range) {
                const looseRange = text.match(/[\[({<]?\s*([0-9OIlS,.]+(?:\.[0-9]+)?)\s*[-–—]\s*([0-9OIlS,.]+(?:\.[0-9]+)?)\s*[\])}>]?\s*%/i);
                if (looseRange) {
                    const low = decimalFromOcr(looseRange[1]);
                    const high = decimalFromOcr(looseRange[2]);
                    if (low > 0 && high >= low) range = { low, high };
                }
            }
            const percents = [...text.matchAll(/([0-9OIlS,.]+(?:\.[0-9]+)?)\s*%/gi)]
                .map(match => decimalFromOcr(match[1]))
                .filter(value => Number.isFinite(value) && value > 0);
            const roll = range
                ? (percents.find(value => value >= range.low && value <= range.high) ?? 0)
                : 0;
            powerBlock = {
                text,
                roll: roll ? String(roll) + "%" : "",
                min: range ? String(range.low) + "%" : "",
                max: range ? String(range.high) + "%" : ""
            };
        }
    }
    if (!powerBlock) {
        powerBlock = powerBlockFromLines(lines, powerSearchStart);
    }

    // Biting Cold is a common legendary power whose leading words can survive
    // OCR even when the visual Aspect label disappears. Recover the block from
    // the distinctive "Cold damage is increased" sentence rather than leaving
    // a readable power blank.
    if (!powerBlock) {
        const bitingColdIndex = lines.findIndex((line, index) =>
            index >= cursor && /\bcold\s+damages?\s+(?:is\s+)?increased\b/i.test(line)
        );
        if (bitingColdIndex >= 0) {
            powerBlock = powerBlockFromLines(lines, bitingColdIndex);
        }
    }

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

    // OCR frequently damages the short "Empty Socket" label. Accept a small
    // family of close variants, including a dropped first word, but only in
    // metadata-shaped lines so ordinary socket prose cannot create a phantom.
    const socketMatches = lines.filter(line =>
        /\b(?:Empty|Mpty|Emptv|Empt)\s+Socket\b/i.test(line) ||
        /^\W*Socket\W*$/i.test(line)
    );
    if (socketMatches.length) {
        fields.sockets = Math.min(2, socketMatches.length);
        fields.socketContents = Array(fields.sockets).fill("Empty").join(", ");
        detected.push("Sockets");
        detected.push("Socket contents");
    } else if (socketEffect) {
        fields.sockets = 1;
        fields.socketContents = socketEffect.text;
        detected.push("Sockets");
        detected.push("Socket contents");
    }

    if (fields.name && !itemTitleLooksSupported(fields.name)) {
        fields.name = "";
        const nameIndex = detected.indexOf("Name");
        if (nameIndex >= 0) detected.splice(nameIndex, 1);
        uncertain.push("Name");
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

// Reconcile complete per-pass records. Never combine a value from one pass
// with another pass's unsupported range, or prefer a pass merely by order.
function reconcileAffixPasses(...passes) {
    const groups = new Map();
    passes.flat().forEach(row => {
        if (!row?.stat) return;
        const key = row.stat.toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    });
    const details = [], uncertain = [];
    groups.forEach(rows => {
        const stat = rows[0].stat;
        const supported = rows.filter(row => {
            if (!row.value) return false;
            const value = decimalFromOcr(row.value);
            return value > 0 && (!row.min || !row.max ||
                (value >= decimalFromOcr(row.min) && value <= decimalFromOcr(row.max)));
        });
        const bounded = supported.filter(row => row.min && row.max);
        const candidates = bounded.length ? bounded : supported;
        const values = new Set(candidates.map(row => decimalFromOcr(row.value)));
        let value = "", min = "", max = "";
        if (values.size === 1) {
            value = candidates[0].value;
            const ranges = new Map(bounded.map(row => [
                `${decimalFromOcr(row.min)}:${decimalFromOcr(row.max)}`, row
            ]));
            if (ranges.size === 1) {
                const record = [...ranges.values()][0];
                min = record.min; max = record.max;
            } else if (ranges.size > 1) uncertain.push(`${stat} range`);
        } else uncertain.push(stat);
        details.push({ stat, value, min, max });
    });
    return { details: details.slice(0, MAX_AFFIX_ROWS), uncertain };
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
                const loneName = primaryName || enhancedName;
                const cleanTitle = /^[A-Za-z][A-Za-z'’& -]{2,48}$/.test(loneName) &&
                    loneName.split(/\s+/).filter(Boolean).length <= 7;
                if (cleanTitle) {
                    merged.fields.name = loneName;
                    merged.detected.push("Name");
                    merged.uncertain = merged.uncertain.filter(label => label !== "Name");
                } else {
                    merged.fields.name = "";
                    merged.detected = merged.detected.filter(label => label !== "Name");
                    merged.uncertain.push("Name");
                }
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

    const reconciliation = reconcileAffixPasses(primaryAffixes, enhancedAffixes);
    const combinedAffixes = reconciliation.details;
    merged.uncertain.push(...reconciliation.uncertain);

    // Scalar base stats are trustworthy when either pass found a plausible
    // bounded header value. Re-read both raw passes before finalizing merge so
    // a good primary Armor value cannot disappear because enhanced OCR missed it.
    const rawTexts = [primary.rawText ?? "", enhanced.rawText ?? ""].filter(Boolean);
    const identity = recoverItemIdentityFromRawPasses(rawTexts);
    if (identity.rarity) {
        merged.fields.rarity = identity.rarity;
        merged.detected.push("Rarity");
    }
    if (identity.itemType) {
        merged.fields.itemType = identity.itemType;
        merged.detected.push("Item type");
        merged.rejected = merged.rejected.filter(label => label !== "Item type");
    }
    if (identity.name) {
        merged.fields.name = identity.name;
        merged.detected.push("Name");
        merged.uncertain = merged.uncertain.filter(label => label !== "Name");
    }

    const rawPasses = rawTexts
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

    {
        const powerCandidates = [primary.rawText ?? "", enhanced.rawText ?? ""]
            .map(raw => {
                const passLines = cleanedOcrLines(raw);
                if (!passLines.length) return null;

                const stopPattern = /\b(?:imprinted|aspect|empty socket|requires level|sell value|durability|tempers?|mark as junk|compare|drop|scroll)\b/i;
                const uniqueStart = uniquePowerStartIndex(passLines, 0);
                if (uniqueStart >= 0) return powerBlockFromLines(passLines, uniqueStart);
                const anchors = affixAnchors(passLines, 0, stopPattern);
                const finalAffixLine = anchors.reduce(
                    (max, anchor) => Math.max(max, anchor.lineIndex),
                    0
                );
                return powerBlockFromLines(passLines, finalAffixLine + 1);
            })
            .filter(Boolean)
            .sort((a, b) => {
                const score = candidate => {
                    const actionStart = /\b(?:when\s+you|your\s+summons|a\s+dark\s+aura|consuming\s+a\s+corpse|only\s+army|cold\s+damage|your\s+desecrated)\b/i.test(candidate.text);
                    return (actionStart ? 8 : 0) + (candidate.roll ? 4 : 0) +
                        (candidate.min && candidate.max ? 3 : 0) + Math.min(candidate.text.length / 100, 2);
                };
                const aScore = score(a);
                const bScore = score(b);
                return bScore - aScore;
            });

        const recoveredPower = powerCandidates[0];
        const recoveredLooksComplete = recoveredPower &&
            /\b(?:a\s+dark\s+aura|your\s+summons|when\s+you|cold\s+damage|your\s+desecrated)\b/i.test(recoveredPower.text);
        const currentLooksFragmentary = !/\b(?:a\s+dark\s+aura|your\s+summons|when\s+you|cold\s+damage|your\s+desecrated)\b/i.test(merged.fields.power ?? "");
        if (recoveredPower && (recoveredLooksComplete || currentLooksFragmentary)) {
            merged.fields.power = recoveredPower.text;
            merged.fields.powerValue = recoveredPower.roll;
            merged.fields.powerMin = recoveredPower.min;
            merged.fields.powerMax = recoveredPower.max;
            merged.detected.push("Aspect / unique power");
            if (recoveredPower.roll) merged.detected.push("Power roll");
        }
    }

    // Recover explicit empty sockets across both OCR passes as well as gem
    // effects. This mirrors single-pass parsing so a good socket read from one
    // pass is not lost during merge.
    const mergedEmptySockets = rawPasses
        .map(passLines => passLines.filter(line =>
            /\b(?:Empty|Mpty|Emptv|Empt)\s+Socket\b/i.test(line) ||
            /^\W*Socket\W*$/i.test(line)
        ).length)
        .reduce((max, count) => Math.max(max, count), 0);
    if (mergedEmptySockets) {
        merged.fields.sockets = Math.min(2, mergedEmptySockets);
        merged.fields.socketContents = Array(merged.fields.sockets).fill("Empty").join(", ");
        merged.detected.push("Sockets", "Socket contents");
    }

    const mergedSocketEffect = rawPasses
        .map(socketEffectFromLines)
        .find(Boolean);
    if (mergedSocketEffect) {
        merged.fields.sockets = 1;
        merged.fields.socketContents = mergedSocketEffect.text;
        merged.detected.push("Sockets", "Socket contents");
        for (let index = combinedAffixes.length - 1; index >= 0; index -= 1) {
            if (/^(?:Poison|Fire|Cold|Lightning|Shadow) Resistance$/i.test(combinedAffixes[index].stat)) {
                combinedAffixes.splice(index, 1);
            }
        }
    }

    merged.fields.affixDetails = combinedAffixes.slice(0, MAX_AFFIX_ROWS);
    if (combinedAffixes.some(row => row.stat === "Maximum Life")) {
        merged.fields.life = affixValueFor(combinedAffixes, /^Maximum Life$/i);
    }
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
    ])].filter(label => !combinedAffixes.some(row => row.stat === label && row.value));

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
        // Diablo item screenshots usually place the tooltip on the left while
        // inventory art/UI occupies the right. Trim that noisy side and the
        // bottom controller prompts before enlarging the text for OCR.
        const cropWidth = Math.max(1, Math.floor(bitmap.width * 0.86));
        const cropHeight = Math.max(1, Math.floor(bitmap.height * 0.92));
        const scale = Math.min(2.2, Math.max(1.5, 2300 / cropWidth));

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
            // A slightly stronger text/background separation reduces the
            // decorative brown tooltip texture without turning thin glyphs into
            // solid blobs.
            const contrasted = Math.max(
                0,
                Math.min(255, ((inverted - 128) * 1.6) + 128)
            );
            const cleaned = contrasted < 28 ? 0 : (contrasted > 232 ? 255 : contrasted);

            pixels[index] = cleaned;
            pixels[index + 1] = cleaned;
            pixels[index + 2] = cleaned;
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

    const session = newIntakeSession(prefix);
    const original = JSON.stringify(getGear(prefix));
    const comparisonSlot = el.comparisonSlot.value;
    session.reading = true;
    invalidateItemConfirmation(prefix);
    ui.read.disabled = true;
    ui.read.textContent = "Reading…";
    ui.remove.disabled = true;
    ui.dropZone.classList.add("reading");
    resetScreenshotReadout(prefix);
    renderIntakeGate(prefix);
    const rawOcrPasses = [];

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
        rawOcrPasses.push(rawText);
        let ocrConfidence = Number(result?.data?.confidence ?? 0);
        let extraction = parseDiabloItemText(
            rawText,
            comparisonSlot
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
                rawOcrPasses.push(enhancedText);
                const enhancedConfidence = Number(
                    enhancedResult?.data?.confidence ?? 0
                );
                const enhancedExtraction = parseDiabloItemText(
                    enhancedText,
                    comparisonSlot
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

        if (prototypeState.intakeSessions[prefix] !== session || prototypeState.screenshots[prefix] !== screenshot) return;
        if (JSON.stringify(getGear(prefix)) !== original || el.comparisonSlot.value !== comparisonSlot) {
            ui.readoutText.textContent = "Fields changed during the read. Read again to replace them.";
            ui.readout.hidden = false;
            return;
        }
        session.captures = [{ fileName: screenshot.fileName, passes: [...rawOcrPasses], accepted: true }];
        session.incomplete = /\bScroll\s+Down\b/i.test(extraction.rawText ?? "");
        applyScreenshotExtraction(prefix, extraction, ocrConfidence);
        prototypeState.screenshotIncomplete[prefix] =
            /\bScroll\s+Down\b/i.test(extraction.rawText ?? "");
        updateContinuationUI(prefix);
        updateItemConfirmationUI(prefix);
        ui.status.textContent = enhancedUsed
            ? `OCR ${Math.round(ocrConfidence)}% · enhanced review`
            : `OCR ${Math.round(ocrConfidence)}% · review`;
    } catch (error) {
        if (prototypeState.intakeSessions[prefix] !== session) return;
        console.error("Darkstorm screenshot read failed:", error);
        ui.readout.hidden = false;
        ui.readoutText.textContent =
            "Darkstorm could not read this screenshot. Try a tighter crop around the item card or enter the item manually.";
        ui.ocrText.textContent = "";
        ui.status.textContent = "Read failed";
    } finally {
        session.reading = false;
        if (prototypeState.intakeSessions[prefix] !== session) return;
        renderIntakeGate(prefix);
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
            clearItemScreenshot(prefix, { preserveDraft: true });
        });

        wireContinuationTarget(prefix, ui.readout.parentElement);

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
            loadoutVerified: { ...prototypeState.loadoutVerified },
            intakePending: Object.fromEntries(Object.entries(prototypeState.intakeSessions)
                .filter(([key, session]) => intakeBlocked(session) ||
                    (key.startsWith("loadout:") ? !prototypeState.loadoutVerified[key.slice(8)] : !prototypeState.itemConfirmed[key]))
                .map(([key]) => [key, true])),
            comparisonSlot: el.comparisonSlot.value,
            equipped: getGear("equipped"),
            candidate: getGear("candidate")
        },
        feedback: {
            result: prototypeState.feedbackResult,
            notes: el.feedbackNotes.value.trim(),
            activeTest: prototypeState.activeTest ? { ...prototypeState.activeTest } : null,
            testAwaitingFeedback: prototypeState.testAwaitingFeedback
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
    prototypeState.intakeSessions = {};
    Object.values(prototypeState.loadoutScreenshotUrls).forEach(url => URL.revokeObjectURL(url));
    prototypeState.loadoutScreenshots = {};
    prototypeState.loadoutScreenshotUrls = {};
    EQUIPMENT_SLOTS.forEach(slot => {
        const root = `loadout-${slot.key}`;
        document.getElementById(`${root}-screenshot-input`).value = "";
        document.getElementById(`${root}-screenshot-preview`).hidden = true;
        document.getElementById(`${root}-screenshot-empty`).hidden = false;
        document.getElementById(`${root}-screenshot-read`).disabled = true;
        document.getElementById(`${root}-screenshot-remove`).hidden = true;
        document.getElementById(`${root}-confirm`).hidden = true;
        document.getElementById(`${root}-readout`).hidden = true;
        document.getElementById(`${root}-screenshot-status`).textContent = "Temporary";
        document.getElementById(`continuation-loadout:${slot.key}`).hidden = true;
    });
    prototypeState.loadoutExtractions = {};
    prototypeState.loadoutVerified = {};

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
    prototypeState.loadoutVerified = { ...(character.gear?.loadoutVerified ?? {}) };
    const pendingIntakes = character.gear?.intakePending ?? {};
    [...SCREENSHOT_PREFIXES, ...EQUIPMENT_SLOTS.map(slot => `loadout:${slot.key}`)].forEach(key => {
        if (pendingIntakes[key] !== true) return;
        const session = newIntakeSession(key);
        session.pending = true;
        session.conflict = "Screenshots are temporary. Reattach the item views to finish verification.";
        if (key.startsWith("loadout:")) {
            const slot = key.slice(8);
            prototypeState.loadoutVerified[slot] = false;
            document.getElementById(`loadout-${slot}-screenshot-status`).textContent = "Reattach views · unverified draft";
        }
    });
    updateLoadoutIntelligence();
    el.comparisonSlot.value = character.gear?.comparisonSlot ?? "chest";
    const selectedEquipped = loadout[el.comparisonSlot.value] ?? {};
    setGear("equipped", character.gear?.equipped ?? selectedEquipped);
    setGear("candidate", character.gear?.candidate ?? {});

    prototypeState.feedbackResult = character.feedback?.result ?? null;
    el.feedbackNotes.value = character.feedback?.notes ?? "";
    prototypeState.lastGearComparison = null;
    const savedActiveTest = character.feedback?.activeTest;
    prototypeState.activeTest =
        savedActiveTest?.type === "gear-swap" &&
        typeof savedActiveTest.slotKey === "string" &&
        typeof savedActiveTest.slotLabel === "string" &&
        typeof savedActiveTest.itemName === "string"
            ? { ...savedActiveTest }
            : null;
    prototypeState.candidateEquipped = false;
    prototypeState.testAwaitingFeedback = Boolean(
        prototypeState.activeTest &&
        (character.feedback?.testAwaitingFeedback ?? !prototypeState.feedbackResult)
    );

    // Older v0.3 saves may contain feedback without test provenance. Keep the
    // note/result visible, but do not let it drive a recommendation as if the
    // tested change were known.
    if (!prototypeState.activeTest && prototypeState.feedbackResult) {
        prototypeState.feedbackResult = null;
    }

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

function numericAffixValue(item, patterns) {
    return (item.affixDetails ?? []).reduce((total, affix) => {
        const label = String(affix.stat ?? affix.text ?? "").toLowerCase();
        if (!patterns.some(pattern => pattern.test(label))) return total;
        const value = Number(String(affix.value ?? "").replace(/[^0-9.-]/g, ""));
        return total + (Number.isFinite(value) ? value : 0);
    }, 0);
}

function defensiveScore(item) {
    const affixLife = numericAffixValue(item, [/maximum life/, /max life/]);
    const affixArmor = numericAffixValue(item, [/\barmor\b/]);
    const affixDefense = numericAffixValue(item, [/resist/, /damage reduction/, /fortify/]);
    return ((Number(item.armor) || affixArmor) * 0.35) +
        ((Number(item.life) || affixLife) * 0.55) +
        ((Number(item.defense) || affixDefense) * 35);
}

function offensiveScore(item, character) {
    const intelligence = numericAffixValue(item, [/\bintelligence\b/]);
    const minion = numericAffixValue(item, [/minion/, /skeleton/, /golem/, /summon/]);
    const multiplier = numericAffixValue(item, [/multiplier/, /vulnerable damage/, /shadow damage/]);
    const identity = character ? buildIdentityFor(character) : null;
    const minionWeight = identity?.key === "minion-necromancer" ? 1.25 : 0.5;

    return ((Number(item.damage) || 0) * 1.2) +
        ((Number(item.armor) || 0) * 0.05) +
        ((Number(item.life) || 0) * 0.05) +
        (intelligence * 0.18) +
        (minion * minionWeight) +
        (multiplier * 1.5);
}

function scoreGear(item, goal, character) {
    if (goal === "damage" || goal === "clear-speed") {
        return offensiveScore(item, character);
    }

    if (goal === "survivability") {
        return defensiveScore(item);
    }

    return (defensiveScore(item) * 0.65) + (offensiveScore(item, character) * 0.35);
}

function compareGear() {
    if (prototypeState.testAwaitingFeedback) {
        document.getElementById("gearVerdict").textContent = "TEST IN PROGRESS";
        document.getElementById("gearReason").textContent =
            "Finish the active controlled test and record Better, No change, or Worse before starting another gear comparison.";
        document.getElementById("equipCandidateButton").disabled = true;
        return null;
    }

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
                .map(prefix => prefix === "equipped" ? "Item A" : "Item B")
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
    const hasDecisionData = item => Boolean(
        item?.name || item?.rarity || item?.itemType || item?.itemPower ||
        item?.armor || item?.damage || item?.power ||
        (Array.isArray(item?.affixDetails) && item.affixDetails.length)
    );

    if (!hasDecisionData(equipped) || !hasDecisionData(candidate)) {
        prototypeState.lastGearComparison = null;
        document.getElementById("gearVerdict").textContent = "ADD TWO ITEMS";
        document.getElementById("gearReason").textContent =
            "Darkstorm needs decision data for both Item A and Item B before comparing them.";
        document.getElementById("equipCandidateButton").disabled = true;
        return null;
    }

    const equippedScore = scoreGear(equipped, character.profile.goal, character);
    const candidateScore = scoreGear(candidate, character.profile.goal, character);
    const delta = candidateScore - equippedScore;

    let verdict = "HOLD";
    if (delta > 25) verdict = "SWAP";
    if (delta < -25) verdict = "KEEP";

    const differentPowers = Boolean(
        equipped.power && candidate.power &&
        equipped.power.trim().toLowerCase() !== candidate.power.trim().toLowerCase()
    );
    if (differentPowers && Math.abs(delta) < 60) {
        verdict = "HOLD";
    }

    const slotKey = el.comparisonSlot.value;
    const slotLabel = comparisonSlotLabel(slotKey);

    const comparison = {
        verdict,
        delta,
        equippedScore,
        candidateScore,
        goal: character.profile.goal,
        slotKey,
        slotLabel,
        differentPowers
    };

    prototypeState.lastGearComparison = comparison;

    const verdictEl = document.getElementById("gearVerdict");
    const reasonEl = document.getElementById("gearReason");
    const equipButton = document.getElementById("equipCandidateButton");

    verdictEl.textContent = verdict;

    const direction = delta >= 0 ? "higher" : "lower";
    const absoluteDelta = Math.abs(Math.round(delta));

    reasonEl.textContent = verdict === "HOLD"
        ? (differentPowers
            ? "Item A and Item B have different powers, and the prototype cannot safely reduce that build interaction to a numeric score. The stat difference is not large enough to override that uncertainty; use a controlled play test."
            : "The prototype heuristic does not see enough separation between Item A and Item B to justify a swap for the current \"" + character.profile.goal + "\" goal. Hold the current setup or use a controlled play test.")
        : itemDisplayName(candidate, "Item B") + " scores " + absoluteDelta + " prototype points " + direction + " than " + itemDisplayName(equipped, "Item A") + " in the " + slotLabel + " slot for the current \"" + character.profile.goal + "\" goal. This is a test heuristic, not a live Diablo IV damage calculator.";

    equipButton.disabled = verdict !== "SWAP";

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

    if (prototypeState.lastGearComparison?.verdict !== "SWAP") {
        document.getElementById("gearVerdict").textContent = "COMPARE FIRST";
        document.getElementById("gearReason").textContent =
            "Run the comparison first. Darkstorm will only write Item B into the equipped loadout after a current SWAP result.";
        document.getElementById("equipCandidateButton").disabled = true;
        return;
    }

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
    const candidateWasVerified = prototypeState.itemConfirmed.candidate;
    promoteCandidateScreenshotToEquipped();
    prototypeState.loadoutExtractions[slotKey] = null;
    prototypeState.loadoutVerified[slotKey] = candidateWasVerified;
    prototypeState.candidateEquipped = true;
    prototypeState.activeTest = {
        type: "gear-swap",
        slotKey,
        slotLabel: comparisonSlotLabel(slotKey),
        itemName: itemDisplayName(candidate, "Item B")
    };
    prototypeState.testAwaitingFeedback = true;
    prototypeState.feedbackResult = null;
    el.feedbackNotes.value = "";
    updateFeedbackUI();
    document.getElementById("gearVerdict").textContent = "EQUIPPED";
    document.getElementById("gearReason").textContent =
        `${itemDisplayName(candidate, "Item B")} is now saved as the equipped ${comparisonSlotLabel(slotKey).toLowerCase()} for the next Darkstorm analysis.`;
    markUnsaved();
    analyzeBuild();
}

function recommendationFor(character) {
    const problem = character.build.problem;
    const goal = character.profile.goal;
    const feedback = prototypeState.feedbackResult;
    const gearComparison = prototypeState.lastGearComparison;
    const identity = buildIdentityFor(character);

    if (feedback === "worse" && prototypeState.activeTest) {
        return {
            title: "Revert the last change and reassess.",
            summary: prototypeState.activeTest.type === "gear-swap"
                ? prototypeState.activeTest.itemName + " tested worse in the " + prototypeState.activeTest.slotLabel.toLowerCase() + " slot."
                : "The player's test result outweighs the prototype's earlier assumption.",
            why: "The active controlled test made the character feel worse in actual play.",
            whyNow: "Darkstorm should not continue optimizing on top of a change that failed the play test.",
            whyNot: "Do not stack another major change yet; that would make it harder to identify the cause.",
            changes: "If a repeat test shows the problem was unrelated to the change, this recommendation can be revised.",
            confidence: 90
        };
    }

    if (feedback === "same" && prototypeState.activeTest) {
        return {
            title: "Keep the test controlled and change one variable.",
            summary: prototypeState.activeTest.type === "gear-swap"
                ? prototypeState.activeTest.itemName + " produced no noticeable improvement in the " + prototypeState.activeTest.slotLabel.toLowerCase() + " slot."
                : "The last play test produced no noticeable change, so Darkstorm should not treat that hypothesis as confirmed.",
            why: "A neutral result is still evidence: the tested change did not clearly solve the reported problem.",
            whyNow: "Moving to one different controlled variable preserves what was learned without stacking changes.",
            whyNot: "Repeating broad changes on top of a neutral result would make the next outcome harder to interpret.",
            changes: "If a repeat run shows a clear improvement or regression, that stronger player evidence takes priority.",
            confidence: 78
        };
    }

    if (feedback === "better" && prototypeState.activeTest?.type === "gear-swap") {
        return {
            title: "Keep the gear change and reassess the build.",
            summary: prototypeState.activeTest.itemName + " improved the player's reported result in the " + prototypeState.activeTest.slotLabel.toLowerCase() + " slot.",
            why: "The controlled Item B test improved the player's reported experience.",
            whyNow: "The gear question has enough evidence to stop consuming attention for the moment.",
            whyNot: "Another immediate gear swap would add noise before the current improvement is established.",
            changes: "If survivability or clear speed falls off again, gear returns to the priority list.",
            confidence: 86
        };
    }

    if (gearComparison?.verdict === "SWAP" && !prototypeState.candidateEquipped) {
        return {
            title: `Test Item B in the ${(gearComparison.slotLabel ?? "item").toLowerCase()} slot.`,
            summary: "Darkstorm found Item B better matches the current goal than Item A using the prototype heuristic.",
            why: "Item B scores meaningfully better than Item A for the selected priority.",
            whyNow: "It is a reversible change with a clear before-and-after test.",
            whyNot: "Changing skills at the same time would make the result harder to interpret.",
            changes: "If Item B feels worse in play, revert it regardless of the prototype score.",
            confidence: 82
        };
    }

    const loadoutDecision = loadoutIntelligenceFor(character);
    const loadoutHasConcreteAction =
        loadoutDecision.confidence != null &&
        !loadoutDecision.title.startsWith("Keep the current recorded gear stable") &&
        !loadoutDecision.title.startsWith("Add equipped gear") &&
        !loadoutDecision.title.startsWith("Verify scanned equipment");
    const loadoutActionMatchesProblem =
        problem === "unsure" ||
        (problem === "survivability" && /life|armor|resist|defen|surviv|fortify/i.test(loadoutDecision.summary + " " + loadoutDecision.title)) ||
        ((problem === "damage" || problem === "clear-speed") && /damage|power roll|weapon|intelligence|minion|multiplier/i.test(loadoutDecision.summary + " " + loadoutDecision.title));

    if (loadoutHasConcreteAction && loadoutActionMatchesProblem) {
        return {
            title: loadoutDecision.title,
            summary: loadoutDecision.summary,
            why: loadoutDecision.why,
            whyNow: loadoutDecision.whyNow,
            whyNot: loadoutDecision.whyNot,
            changes: loadoutDecision.changes,
            confidence: Math.min(loadoutDecision.confidence, 84)
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
    const buttons = document.querySelectorAll("[data-feedback]");

    buttons.forEach(button => {
        button.setAttribute(
            "aria-pressed",
            String(Boolean(prototypeState.feedbackResult) &&
                button.dataset.feedback === prototypeState.feedbackResult)
        );
    });

    if (!prototypeState.feedbackResult) {
        status.textContent = prototypeState.testAwaitingFeedback && prototypeState.activeTest
            ? "Awaiting test result: " + prototypeState.activeTest.itemName
            : "No test result";
        return;
    }

    const labels = {
        better: "Test result: Better",
        same: "Test result: No change",
        worse: "Test result: Worse"
    };
    status.textContent = labels[prototypeState.feedbackResult];
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
            const validShape = data && typeof data === "object" &&
                data.profile && typeof data.profile === "object" &&
                data.build && typeof data.build === "object" &&
                data.gear && typeof data.gear === "object";

            if (!validShape) {
                throw new Error("Not a Darkstorm character file");
            }

            populateForm(data);
            analyzeBuild();
            document.getElementById("saveStatus").textContent = "Imported · not saved locally";
        } catch (error) {
            window.alert("Darkstorm could not read that character file. Choose a Darkstorm JSON export.");
        }
    });
    reader.readAsText(file);
}

function resetPrototype() {
    localStorage.removeItem(STORAGE_KEY);
    prototypeState.loadoutVerified = {};
    prototypeState.loadoutExtractions = {};
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
wireLoadoutScreenshotIntakes();
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
            prototypeState.lastGearComparison = null;
            if (!prototypeState.activeTest) prototypeState.candidateEquipped = false;
            resetGearVerdict();

            if (itemConfirmationRequired(prefix)) {
                invalidateItemConfirmation(prefix, { resetComparison: false });
                updateGearSlotMismatchUI();
            }
        });
    });
});

document.querySelectorAll(".affix-rows input").forEach(input => {
    input.addEventListener("input", () => {
        const prefix = input.id.startsWith("equipped") ? "equipped" : "candidate";
        prototypeState.lastGearComparison = null;
        prototypeState.candidateEquipped = false;
        resetGearVerdict();
        if (itemConfirmationRequired(prefix)) {
            invalidateItemConfirmation(prefix, { resetComparison: false });
            updateGearSlotMismatchUI();
        }
    });
});

document.querySelectorAll("[data-feedback]").forEach(button => {
    button.addEventListener("click", () => {
        if (!prototypeState.testAwaitingFeedback || !prototypeState.activeTest) {
            document.getElementById("feedbackStatus").textContent =
                "No active controlled test · equip a recommended Item B first";
            return;
        }
        prototypeState.feedbackResult = button.dataset.feedback;
        updateFeedbackUI();
        markUnsaved();
    });
});

document.getElementById("applyFeedbackButton").addEventListener("click", () => {
    if (!prototypeState.testAwaitingFeedback || !prototypeState.activeTest) {
        document.getElementById("feedbackStatus").textContent =
            "No active controlled test · equip a recommended Item B first";
        return;
    }
    if (!prototypeState.feedbackResult) {
        document.getElementById("feedbackStatus").textContent =
            "Choose Better, No change, or Worse before applying feedback";
        return;
    }
    analyzeBuild();
    prototypeState.testAwaitingFeedback = false;
    prototypeState.candidateEquipped = false;
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
    Object.values(prototypeState.loadoutScreenshotUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
    });
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
