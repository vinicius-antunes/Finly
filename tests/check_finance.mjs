import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {empty,cents,generate,metrics,migrate,validate,csv} from '../src/finance/model.ts';
const base=empty();
assert.equal(cents('19,99'),1999);assert.equal(cents('1.234,56'),123456);assert.throws(()=>cents('-1'));assert.throws(()=>cents('NaN'));
const input={description:'Compra sintética',amountCents:3300,period:'2026-11',legacyKind:'credit',category:'Teste',owner:'self',status:'planned',confirmed:true,note:''};
assert.equal(generate(input,2).reduce((a,x)=>a+x.amountCents,0),6600);
assert.equal(generate({...input,amountCents:1999},3).reduce((a,x)=>a+x.amountCents,0),5997);
const third=generate({...input,amountCents:2500,owner:'third'},3,1,true);assert.equal(third.length,6);assert.equal(third.filter(x=>x.legacyKind==='credit').reduce((n,x)=>n+x.amountCents,0),7500);assert.ok(third.filter(x=>x.legacyKind==='reimbursement').every(x=>third.some(p=>p.id===x.purchaseId)));
base.transactions=third;assert.equal(metrics(base,'2026-11').received,0);base.invoiceStatuses['2026-11']='paid';assert.equal(metrics(base,'2026-11').invoice,2500);
const before=JSON.stringify(third[2]);third[0]={...third[0],amountCents:3000};assert.equal(JSON.stringify(third[2]),before);
const fixture={version:1,settings:{salary:4800,reserve:7200,cushion:600,goal:3500,installmentCap:100,dueDay:10,cardLabel:'Cartão sintético',includeExpectedRefunds:false},entries:[{id:'last-only',description:'Parcela final sintética',amount:19.99,month:'2026-11',kind:'credit',groupId:'group',part:2,parts:2,confirmed:false,owner:'unknown',note:'preservar'},{id:'refund',description:'Reembolso sintético',amount:25,month:'2026-11',kind:'reimbursement',status:'planned'}],pending:[{id:'pending',description:'Cobrança sintética',amount:10,chargedAt:'2026-11-01'}],invoiceStatuses:{'2026-11':'unpaid'}};
const raw=JSON.stringify(fixture),v2=await migrate(raw);assert.equal(JSON.stringify(fixture),raw);assert.equal(v2.transactions.length,2);assert.equal(v2.transactions[0].part,2);assert.equal(v2.transactions[0].amountCents,1999);assert.equal(v2.pending[0].amountCents,1000);assert.deepEqual((await migrate(raw)).transactions,v2.transactions);assert.deepEqual(await migrate(JSON.stringify(v2)),v2);
await assert.rejects(migrate(JSON.stringify({...fixture,entries:[fixture.entries[0],fixture.entries[0]]})));await assert.rejects(migrate('{bad'));assert.throws(()=>validate({...v2,transactions:[{...v2.transactions[0],amountCents:1.5}]}));
// Evaluate the original metrics function with the same synthetic state.
const source=readFileSync(process.env.FINLY_REFERENCE || new URL('../public/legacy/index.html',import.meta.url),'utf8');const fn=source.slice(source.indexOf('  function metrics('),source.indexOf('  function badge('));
const sandbox={state:fixture,selectedMonth:'2026-11',entries:(m)=>fixture.entries.filter(x=>x.month===m),sum:xs=>Math.round(xs.reduce((n,x)=>n+Number(x.amount),0)*100)/100,money:n=>Math.round(n*100)/100};vm.createContext(sandbox);vm.runInContext(fn+';result=metrics()',sandbox);
const m=metrics(v2,'2026-11');for(const [modern,legacy] of [['invoice','invoice'],['cash','cashOut'],['available','available'],['pending','expectedRefund'],['received','receivedRefund']])assert.equal(m[modern],Math.round(sandbox.result[legacy]*100));
assert.ok(csv([{...v2.transactions[0],description:'=FORMULA;"'}]).includes("'=FORMULA"));
console.log('PASS: exact cents, installments, third-party links, reimbursement isolation, invoice, individual edits, migration identity/idempotence/failure, backup roundtrip, CSV safety and legacy metric equivalence');

const memory=new Map([['saldoclaro-v1',raw]]);globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
const {save,load}=await import('../src/finance/storage.ts');save(v2,null);assert.deepEqual(load(),v2);assert.throws(()=>save(v2,null));assert.equal(memory.get('saldoclaro-v1'),raw);const saved=memory.get('finly-v2');globalThis.localStorage.setItem=()=>{throw Error('QuotaExceeded')};assert.throws(()=>save(v2,saved));assert.equal(memory.get('finly-v2'),saved);console.log('PASS: storage compare-and-set, quota failure and untouched v1');
// Startup must distinguish absence from invalid data and never rewrite a valid state.
const {initialize}=await import('../src/finance/storage.ts');globalThis.localStorage.setItem=(k,v)=>memory.set(k,v);
assert.deepEqual(initialize(),v2);assert.equal(memory.get('finly-v2'),saved);memory.set('finly-v2','{bad');assert.throws(initialize);assert.equal(memory.get('finly-v2'),'{bad');memory.delete('finly-v2');const first=initialize();assert.equal(first.transactions.length,0);assert.equal(metrics(first,'2026-11').available,0);const firstRaw=memory.get('finly-v2');assert.deepEqual(initialize(),first);assert.equal(memory.get('finly-v2'),firstRaw);assert.equal(memory.get('saldoclaro-v1'),raw);console.log('PASS: idempotent absent-only initialization, valid state unchanged, invalid state preserved');
