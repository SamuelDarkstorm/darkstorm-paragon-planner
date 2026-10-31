// Run with: node --test tests/continuation.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/prototype.js'), 'utf8');
// Load the actual model and handlers without starting the browser application.
const context = vm.createContext({ console, document: { getElementById: () => ({}) } });
vm.runInContext(source.slice(0, source.indexOf('\nrenderEquipmentLoadout();')), context);
const evaluate = code => vm.runInContext(code, context);
const merge = (current, fields, same = true) => {
    context.current = structuredClone(current);
    context.next = { fields: structuredClone(fields) };
    context.same = same;
    return JSON.parse(JSON.stringify(evaluate('mergeContinuationDraft(current, next, same)')));
};
const helm = { name: 'Test Helm', itemType: 'Helm', itemPower: 850, armor: 1275,
    affixDetails: [{ stat: 'Intelligence', value: '90', min: '83', max: '99' }] };

test('adds lower-view fields and deduplicates overlap without modifying inputs', () => {
    const original = structuredClone(helm);
    const result = merge(helm, { sockets: 2, affixDetails: [...helm.affixDetails,
        { stat: 'Maximum Life', value: '1028', min: '1016', max: '1225' }] });
    assert.equal(result.ok, true);
    assert.equal(result.fields.affixDetails.length, 2);
    assert.equal(result.fields.sockets, 2);
    assert.equal(result.fields.life, 1028);
    assert.deepEqual(helm, original);
});
test('requires explicit same-item acknowledgement even for matching headers', () => {
    assert.equal(merge(helm, helm, false).ok, false);
});
test('rejects a different item with the same slot and item power', () => {
    const result = merge(helm, { name: 'Other Helm', itemType: 'Helm', itemPower: 850 });
    assert.equal(result.ok, false);
    assert.match(result.conflicts.join(), /name/);
});
test('holds differing visible affix rolls rather than restoring the old roll silently', () => {
    const result = merge(helm, { affixDetails: [{ stat: 'Intelligence', value: '91', min: '83', max: '99' }] });
    assert.equal(result.ok, false);
    assert.match(result.conflicts.join(), /Intelligence value/);
});
test('does not replace corrected header values', () => {
    const result = merge({ ...helm, armor: 1300 }, { armor: 1275 });
    assert.equal(result.ok, false);
    assert.equal(result.fields.armor, 1300);
});
test('empty continuation fields cannot erase corrected values', () => {
    const result = merge({ ...helm, powerValue: '34%', sockets: 2 }, { name: '', armor: 0, powerValue: '', sockets: 0 });
    assert.equal(result.ok, true);
    assert.equal(result.fields.name, helm.name);
    assert.equal(result.fields.armor, 1275);
    assert.equal(result.fields.powerValue, '34%');
    assert.equal(result.fields.sockets, 2);
});
test('joins power prose only with explicit matching overlap', () => {
    const result = merge({ ...helm, power: 'Your summons unleash a dark aura' }, { power: 'a dark aura that curses nearby enemies' });
    assert.equal(result.ok, true);
    assert.equal(result.fields.power, 'Your summons unleash a dark aura that curses nearby enemies');
    assert.equal(merge({ ...helm, power: 'Cold damage makes enemies Vulnerable' }, { power: 'Gain life on kill' }).ok, false);
});
test('does not expose orphaned ranges as supported rolls', () => {
    const result = merge(helm, { affixDetails: [{ stat: 'Fortify Generation', value: '', min: '5%', max: '10%' }] });
    assert.equal(result.ok, true);
    assert.equal(result.fields.affixDetails[1].min, '');
});
test('verification stays blocked through pending, reading, incomplete and conflict states', () => {
    for (const state of [{ pending: true }, { reading: true }, { incomplete: true }, { conflict: 'Different roll' }]) {
        context.session = { captures: [], ...state };
        assert.equal(evaluate('intakeBlocked(session)'), true);
    }
    context.session = { captures: [{}, {}], reviewComplete: false };
    assert.equal(evaluate('intakeBlocked(session)'), true);
    context.session.reviewComplete = true;
    assert.equal(evaluate('intakeBlocked(session)'), false);
});
test('confirmation handler cannot bypass an incomplete or restored pending capture', () => {
    evaluate(`prototypeState.intakeSessions.equipped = { captures: [], pending: true };
        prototypeState.itemConfirmed.equipped = false;
        confirmItemData('equipped');`);
    assert.equal(evaluate('prototypeState.itemConfirmed.equipped'), false);
});
test('new range evidence cannot turn an impossible current roll into accepted data', () => {
    const result = merge({ ...helm, affixDetails: [{ stat: 'Fortify Generation', value: '95%' }] },
        { affixDetails: [{ stat: 'Fortify Generation', value: '', min: '5%', max: '10%' }] });
    assert.equal(result.ok, false);
    assert.match(result.conflicts.join(), /outside the visible range/);
});
test('single-roll numeric extraction and item-level scoring use distinct helpers', () => {
    assert.equal(evaluate(`affixValueFor([{stat:'Maximum Life', value:'+1,028'}], /^Maximum Life$/i)`), 1028);
    assert.equal(evaluate(`numericAffixValue({affixDetails:[{stat:'Intelligence',value:'90'}]}, [/intelligence/])`), 90);
});
