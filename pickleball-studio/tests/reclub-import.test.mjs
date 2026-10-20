import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRoster,reviewRoster,applyRosterImport,validateReclubURL,mergeManualSetupRoster} from '../dist/reclub-import.js';
import {reclubResponse} from '../reclub-service.mjs';
import {demoState,assertState,queue} from '../dist/engine.js';
import {defaultSetup,createConfiguredSession} from '../dist/entry.js';
import {emptyState} from '../dist/flow.js';

test('Reclub URL allowlist accepts known event formats and rejects SSRF inputs',()=>{
  for(const url of ['https://reclub.co/m/ABC123?share=true','https://reclub.co/c/019b8d81-a326-7301-bffe-fa92835a30b9','https://discover.reclub.co/discover/meet/198WKC'])assert.ok(validateReclubURL(url));
  for(const url of ['','http://reclub.co/m/ABC123','https://reclub.co.evil.com/m/ABC123','https://127.0.0.1/m/ABC123','https://reclub.co@evil.com/m/ABC123','https://user:pass@reclub.co/m/ABC123','https://reclub.co:123/m/ABC123','https://reclub.co/m/%41BC123','https://reclub.co/clubs/example','https://evil.com'])assert.throws(()=>validateReclubURL(url));
});
test('unavailable adapter never makes outbound requests or pretends to know private event access',async()=>{
  const previous=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('No outbound access');};
  try{
    assert.equal((await reclubResponse(new Request('https://app/api/reclub'))).status,200);
    for(const url of ['https://reclub.co/m/ABC123','https://reclub.co/m/PRIVAT']){
      const response=await reclubResponse(new Request('https://app/api/reclub',{method:'POST',body:JSON.stringify({url})}));
      assert.equal(response.status,503);assert.equal((await response.json()).code,'integration_unavailable');
    }
    assert.equal((await reclubResponse(new Request('https://app/api/reclub',{method:'POST',body:'{"url":"http://localhost"}'}))).status,400);
    assert.equal((await reclubResponse(new Request('https://app/api/reclub',{method:'POST',body:'oops'}))).status,400);
    assert.equal(calls,0);
  }finally{globalThis.fetch=previous;}
});
test('authorized CSV preserves supplied ratings, IDs and RSVP without inventing missing data',async()=>{
  const rows=await prepareRoster('\uFEFFName,Rating,Status,Participant ID\r\n"River, QA",3.5,Confirmed,one\r\nAsh QA,,Waitlisted,two\r\nFern QA,,Withdrawn,three','https://reclub.co/m/ABC123');
  assert.equal(rows[0].name,'River, QA');assert.equal(rows[0].rating,3.5);assert.equal(rows[1].rating,null);assert.equal(rows[1].selected,false);assert.equal(rows[2].selected,false);
  assert.equal((await prepareRoster('Name\tRating\nElm QA\t3'))[0].rating,3);
  await assert.rejects(prepareRoster('Name,Rating\nElm QA,unknown'),/rating/);
  await assert.rejects(prepareRoster('"unfinished'),/unfinished/);
  await assert.rejects(prepareRoster('Name,Rating'),/No player/);
});
test('new imported players are out of queue and repeated imports remain idempotent after edits',async()=>{
  const s=demoState(),before=structuredClone(s),rows=await prepareRoster('Name,Rating,Participant ID\nRiver QA,3.5,one','https://reclub.co/m/ABC123');
  const result=applyRosterImport(s.players,reviewRoster(rows,s.players));s.players=result.players;
  const p=s.players.at(-1);assert.equal(p.status,'out');assert.equal(queue(s).some(x=>x.id===p.id),false);assertState(s);
  p.name='Renamed by organizer';p.status='break';
  const repeat=applyRosterImport(s.players,reviewRoster(rows,s.players),{checkIn:true});
  assert.equal(repeat.added,0);assert.equal(repeat.skipped,1);assert.equal(repeat.players.at(-1).name,p.name);assert.equal(repeat.players.at(-1).status,'break');
  assert.deepEqual(s.players.slice(0,-1),before.players);assert.deepEqual(s.history,before.history);assert.deepEqual(s.courts,before.courts);
});
test('same normalized name is only a review flag: explicit linking preserves all existing fields',async()=>{
  const s=demoState(),before=structuredClone(s.players[0]);
  const rows=await prepareRoster('Name,Rating,Participant ID\n ALEX   MERCADO,4,one','https://reclub.co/m/ABC123');
  const review=reviewRoster(rows,s.players);assert.equal(review[0].decision,'review');assert.throws(()=>applyRosterImport(s.players,review),/Review/);
  review[0].decision='link';review[0].target=before.id;
  const result=applyRosterImport(s.players,review,{checkIn:true});assert.equal(result.linked,1);
  const linked=result.players[0];const {rosterSources,...originalFields}=linked;assert.deepEqual(originalFields,before);assert.equal(rosterSources[0].participantId,'one');
  assert.equal(applyRosterImport(result.players,review).skipped,1);
  review[0].decision='separate';assert.equal(applyRosterImport(s.players,review).added,1);
});
test('no-ID identical files are retryable even reordered; same names remain distinct on explicit separate import',async()=>{
  const first=await prepareRoster('Name,Rating\nRiver QA,3\nAsh QA,4');
  const result=applyRosterImport([],reviewRoster(first,[]));
  const reordered=await prepareRoster('Name,Rating\nAsh QA,4\nRiver QA,3');
  assert.equal(applyRosterImport(result.players,reviewRoster(reordered,result.players)).added,0);
  const same=reviewRoster(await prepareRoster('Name,Rating\nRiver QA,3\nRiver QA,3'),[]);assert.ok(same.every(r=>r.decision==='review'));same.forEach(r=>r.decision='separate');
  const separate=applyRosterImport([],same);assert.equal(separate.added,2);assert.notEqual(separate.players[0].id,separate.players[1].id);
});
test('stable IDs deduplicate source rows and scope identity to an event',async()=>{
  const csv='Name,Rating,Participant ID\nRiver QA,3,one\nRiver QA,3,one';
  const a=await prepareRoster(csv,'https://reclub.co/m/ABC123'),b=await prepareRoster(csv,'https://reclub.co/m/DEF456');
  assert.equal(a.length,1);assert.notEqual(a[0].key,b[0].key);
  await assert.rejects(prepareRoster('Name,Rating,Participant ID\nRiver QA,3,one\nOther QA,4,one'),/conflicting/);
});
test('validation failures and capacity overflow leave source roster untouched',async()=>{
  const s=demoState(),before=structuredClone(s.players),records=reviewRoster(await prepareRoster('Name,Rating\nRiver QA,3\nAsh QA,'),s.players);
  assert.throws(()=>applyRosterImport(s.players,records),/starting rating/);assert.deepEqual(s.players,before);
  const large=Array.from({length:120},(_,i)=>({...before[0],id:'large-'+i,name:'Large '+i}));
  assert.throws(()=>applyRosterImport(large,records,{defaultRating:3}),/120/);assert.equal(large.length,120);
  const result=applyRosterImport([],records,{defaultRating:2.5,checkIn:true});assert.equal(result.players[1].rating,2.5);assert.equal(result.players[1].rosterSources[0].sourceRating,null);assert.equal(result.players[1].status,'waiting');
});
test('setup draft preserves imported metadata and attendance; Start validates checked-in players before any mutation',async()=>{
  const setup=defaultSetup();setup.name='Import QA';
  const records=reviewRoster(await prepareRoster('Name,Rating\nRiver QA,3\nAsh QA,3\nElm QA,3\nFern QA,3'),[]);
  setup.players=applyRosterImport([],records).players;const s=emptyState(),before=structuredClone(s);
  assert.throws(()=>createConfiguredSession(s,setup,true),/Check in/);assert.deepEqual(s,before);
  createConfiguredSession(s,setup,false);assert.equal(s.session.status,'preparing');assert.ok(s.players.every(p=>p.status==='out'));assert.equal(s.players[0].rosterSources[0].key,setup.players[0].rosterSources[0].key);assertState(s);
  const ready=defaultSetup();ready.name='Ready';ready.players=applyRosterImport([],records,{checkIn:true}).players;createConfiguredSession(s,ready,true);assert.equal(s.session.status,'live');assert.equal(queue(s).length,4);
});

test('editing manual setup roster preserves imported identities, separate same-name participants and attendance',async()=>{
  const imported=reviewRoster(await prepareRoster('Name,Rating\nSame QA,3\nSame QA,3'),[]);imported.forEach(r=>r.decision='separate');
  const old=applyRosterImport([],imported).players;
  const result=mergeManualSetupRoster(old,[{name:'Manual QA',rating:4}]);
  assert.deepEqual(result.slice(1),old);assert.equal(result[0].name,'Manual QA');
  const removedManual=mergeManualSetupRoster(result,[]);assert.deepEqual(removedManual,old);
  assert.throws(()=>mergeManualSetupRoster(old,[{name:'same qa',rating:4}]),/distinguish/);
});
