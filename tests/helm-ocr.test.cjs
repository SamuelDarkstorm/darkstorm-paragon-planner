const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/prototype.js'), 'utf8');
const context = vm.createContext({ console, document: { getElementById: () => ({}) } });
vm.runInContext(source.slice(0, source.indexOf('\nrenderEquipmentLoadout();')), context);
context.fixture = require('./fixtures/helm-2026-10-31.json');
const run = code => vm.runInContext(code, context);
const merged = () => JSON.parse(JSON.stringify(run(`mergeScreenshotExtractions(parseDiabloItemText(fixture.primary,'helm'),parseDiabloItemText(fixture.enhanced,'helm'))`)));

test('reported helm: use supported Healing Received reading, never the power range', () => {
    const result = merged();
    const row = result.fields.affixDetails.find(row => row.stat === 'Healing Received');
    assert.equal(row.value, '+7.4%'); assert.equal(row.min, '7%'); assert.equal(row.max, '11%');
    assert.equal(result.uncertain.includes('Healing Received'), false);
});
test('reported helm: recover Thorns from the bounded second-pass record', () => {
    const row = merged().fields.affixDetails.find(row => row.stat === 'Thorns');
    assert.equal(row.value, '+887'); assert.equal(row.min, '611'); assert.equal(row.max, '916');
});
test('reported helm: corrupted title remains blank for player correction', () => {
    const result = merged(); assert.equal(result.fields.name, ''); assert.ok(result.uncertain.includes('Name'));
});
test('reported helm: disagreeing plausible Intelligence ranges stay uncertain', () => {
    const result = merged(), row = result.fields.affixDetails.find(row => row.stat === 'Intelligence');
    assert.equal(row.value, '+90'); assert.equal(row.min, ''); assert.equal(row.max, '');
    assert.ok(result.uncertain.includes('Intelligence range'));
});
test('reported helm: correct base values, power and sockets survive reconciliation', () => {
    const fields = merged().fields;
    assert.equal(fields.itemPower,850); assert.equal(fields.baseArmor,1275); assert.equal(fields.life,1028);
    assert.equal(fields.powerValue,'17.5%'); assert.equal(fields.powerMin,'15%'); assert.equal(fields.powerMax,'17.5%');
    assert.equal(fields.sockets,1); assert.equal(fields.socketContents,'Empty'); assert.equal(fields.tempers,'3/3');
});
test('an unrecognized power sentence cannot donate a wrapped range to the last affix', () => {
    const rows=run(`sequentialAffixes(['+7.4% Healing Received','Some unrecognized power increases damage','[15.0 - 17.5]%'],0,/imprinted/i).details`);
    assert.equal(rows[0].value,'+7.4%'); assert.equal(rows[0].min,''); assert.equal(rows[0].max,'');
});
test('a range with no supported affix roll is not shown as verified evidence', () => {
    const row=run(`sequentialAffixes(['+47.4% Healing Received [7 - 11]%'],0,/imprinted/i).details[0]`);
    // 47.4 is repaired only if its signed value and the same row's range prove 7.4.
    assert.equal(row.value,'+7.4%');
    const unsupported=run(`sequentialAffixes(['Healing Received [7 - 11]%'],0,/imprinted/i).details[0]`);
    assert.equal(unsupported.value,''); assert.equal(unsupported.min,''); assert.equal(unsupported.max,'');
});
test('pass ordering does not change supported numeric affix evidence', () => {
    const reverse=JSON.parse(JSON.stringify(run(`mergeScreenshotExtractions(parseDiabloItemText(fixture.enhanced,'helm'),parseDiabloItemText(fixture.primary,'helm'))`)));
    const normalize=result=>result.fields.affixDetails.map(({stat,value,min,max})=>({stat,value,min,max})).sort((a,b)=>a.stat.localeCompare(b.stat));
    assert.deepEqual(normalize(reverse),normalize(merged()));
});
test('missing row values cannot borrow a preceding affix range separator', () => {
    const rows=run(`sequentialAffixes(['+90 Intelligence [83 - 99] Healing Received [7 - 11]%'],0,/imprinted/i).details`);
    assert.equal(rows[1].value,''); assert.equal(rows[1].min,'');
});
test('multiplier ranges wrap numerically but stop at power prose', () => {
    const good=run(`sequentialAffixes(['x18% All Damage Multiplier [12 -','20]%'],0,/imprinted/i).details[0]`);
    assert.equal(good.min,'12%'); assert.equal(good.max,'20%');
    const bad=run(`sequentialAffixes(['x18% All Damage Multiplier','Your power deals extra damage [15 - 20]%'],0,/imprinted/i).details[0]`);
    assert.equal(bad.min,''); assert.equal(bad.max,'');
});
test('unsupported Life readings cannot survive in the aggregate Life field', () => {
    const result=run(`mergeScreenshotExtractions(
        parseDiabloItemText('Legendary Helm\\n850 Item Power\\n1,275 Armor\\n+1,028 Maximum Life [1000 - 1250]','helm'),
        parseDiabloItemText('Legendary Helm\\n850 Item Power\\n1,275 Armor\\n+1,100 Maximum Life [1000 - 1250]','helm'))`);
    assert.equal(result.fields.affixDetails.find(row=>row.stat==='Maximum Life').value,'');
    assert.equal(result.fields.life,0);
});
test('one clean supported title survives when the other pass loses its header', () => {
    const result=run(`mergeScreenshotExtractions(
        parseDiabloItemText('PRIMAL BASCINET\\nOF BITING COLD\\nLegendary Helm\\n850 Item Power\\n1,275 Armor\\n+90 Intelligence [83 - 99]','helm'),
        parseDiabloItemText('850 Item Power\\n1,275 Armor\\n+90 Intelligence [83 - 99]','helm'))`);
    assert.equal(result.fields.name,'PRIMAL BASCINET OF BITING COLD');
});
