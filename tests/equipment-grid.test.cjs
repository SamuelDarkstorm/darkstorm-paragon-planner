const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/prototype.js'), 'utf8');

// Small DOM adapter tests: exercise the actual render/get/set/event functions.
function setup() {
    const elements = new Map();
    class Element {
        constructor(tag) { this.tagName = tag; this.children = []; this.listeners = {}; this.attributes = {}; this.dataset = {}; this.classList = { add() {} }; this.value = ''; }
        set id(value) { this._id = value; elements.set(value, this); }
        get id() { return this._id; }
        set value(value) { this._value = String(value); }
        get value() { return this._value; }
        set innerHTML(value) { this.html = value; this.children = []; }
        append(...children) { this.children.push(...children); }
        setAttribute(key, value) { this.attributes[key] = value; }
        addEventListener(event, callback) { this.listeners[event] = callback; }
    }
    const document = { getElementById: id => elements.get(id) ?? null,
        createElement: tag => new Element(tag), createTextNode: text => ({ textContent: text }) };
    const context = vm.createContext({ console, document });
    const run = code => vm.runInContext(code, context);
    run(source.slice(0, source.indexOf('\nrenderEquipmentLoadout();')));
    run('updateLoadoutSummary = () => {}; updateLoadoutStatus = () => {}; resetGearVerdict = () => {}; markUnsaved = () => {};');
    new Element('div').id = 'equipmentLoadout';
    run('renderEquipmentLoadout()');
    return { run, elements, context, Element };
}

test('all ten Equipment cards use the shared six-row grid with unique accessible cell IDs', () => {
    const { run, elements, Element } = setup();
    assert.equal(elements.get('equipmentLoadout').children.length, 10);
    for (const slot of JSON.parse(run('JSON.stringify(EQUIPMENT_SLOTS)'))) {
        for (let row = 1; row <= 6; row++) for (const key of ['Stat','Value','Min','Max']) {
            const cell = elements.get(`loadout-${slot.key}Affix${row}${key}`);
            assert.ok(cell); assert.match(cell.attributes['aria-label'], /affix/);
        }
        assert.equal(elements.has(`loadout-${slot.key}-affixes`), false);
    }
    new Element('div').id = 'equippedAffixRows'; new Element('div').id = 'candidateAffixRows';
    run('renderGearAffixRows()');
    assert.equal(elements.get('equippedAffixRows').children.length, 6);
    assert.equal(elements.get('loadout-helmAffix1Stat').placeholder, elements.get('equippedAffix1Stat').placeholder);
});
test('older text-only saves migrate to structured cells', () => {
    const { run, elements } = setup();
    run(`setLoadoutItem('helm', {name:'Old Helm', affixes:'+887 Thorns [611 - 916]\\n+7.4% Healing Received [7% - 11%]'})`);
    assert.equal(elements.get('loadout-helmAffix1Stat').value, 'Thorns');
    assert.equal(elements.get('loadout-helmAffix2Value').value, '+7.4%');
    assert.equal(run('getLoadoutItem("helm").affixDetails.length'), 2);
});
test('structured unknown stats and incomplete ranges survive save/load without reparsing', () => {
    const { run } = setup();
    run(`setLoadoutItem('helm', {name:'Helm', affixDetails:[{stat:'Unrecognized custom stat',value:'',min:'5%',max:'10%'}, {stat:'Thorns',value:'+887',min:'611',max:'916'}]});
        const savedGrid = JSON.parse(JSON.stringify(getLoadoutFromForm())); setLoadout(savedGrid);`);
    assert.equal(run('getLoadoutItem("helm").affixDetails[0].stat'), 'Unrecognized custom stat');
    assert.equal(run('getLoadoutItem("helm").affixDetails[0].value'), '');
    assert.equal(run('getLoadoutItem("helm").affixDetails[0].min'), '5%');
    assert.equal(run('getLoadoutItem("helm").affixDetails[1].value'), '+887');
});
test('structured rows take precedence over the compatibility text mirror and empty loads clear all cells', () => {
    const { run, elements } = setup();
    run(`setLoadoutItem('helm', {affixes:'+1 Thorns', affixDetails:[{stat:'Thorns',value:'+887',min:'611',max:'916'}]})`);
    assert.equal(elements.get('loadout-helmAffix1Value').value, '+887');
    run(`setLoadoutItem('helm', {})`);
    assert.equal(elements.get('loadout-helmAffix1Value').value, '');
    assert.equal(run('getLoadoutItem("helm").affixDetails.length'), 0);
});
test('a grid edit revokes scanned-item verification and the previous verdict', () => {
    const { run, elements } = setup();
    run(`prototypeState.loadoutExtractions.helm = {fields:{}}; prototypeState.loadoutVerified.helm = true;
        prototypeState.lastGearComparison = {verdict:'SWAP'};`);
    elements.get('loadout-helmAffix1Value').value = '+888';
    elements.get('loadout-helmAffix1Value').listeners.input();
    assert.equal(run('prototypeState.loadoutVerified.helm'), false);
    assert.equal(run('prototypeState.lastGearComparison'), null);
});
test('OCR fills all four supported helm affixes into the Equipment grid and transfers them to comparison', () => {
    const { run, context, Element } = setup();
    context.fixture = require('./fixtures/helm-2026-10-31.json');
    run(`const scan = mergeScreenshotExtractions(parseDiabloItemText(fixture.primary,'helm'),parseDiabloItemText(fixture.enhanced,'helm'));
        applyExtractionToLoadout('helm', scan);`);
    assert.equal(run('getLoadoutItem("helm").affixDetails.length'), 4);
    assert.equal(run('getLoadoutItem("helm").affixDetails.find(row=>row.stat==="Thorns").value'), '+887');
    new Element('div').id = 'equippedAffixRows'; new Element('div').id = 'candidateAffixRows';
    run('renderGearAffixRows(); setAffixDetails("equipped",getLoadoutItem("helm").affixDetails);');
    assert.equal(run('getAffixDetails("equipped").find(row=>row.stat==="Thorns").value'), '+887');
});
