import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,sessionFlow,suggestAvailableCourts,suggestAfterResult} from '../dist/flow.js';
import {demoState,startMatch,completeMatch,stats,queue,assertState} from '../dist/engine.js';

function readySession(count=20) {
  const s=demoState();s.demo=false;s.history=[];s.players=s.players.slice(0,count);s.courts.forEach(c=>{c.status='available';c.teams=null;});return s;
}
test('a first-time visitor gets Create session, then Add players, then Generate matches',()=>{
  const s=emptyState();assertState(s);assert.equal(sessionFlow(s).action,'new-session');
  s.session={status:'live'};s.courts=[{id:'c1',name:'Court 1',status:'available',teams:null}];assert.equal(sessionFlow(s).action,'add-players');
  const ready=readySession(3);assert.equal(sessionFlow(ready).action,'add-players');assert.match(sessionFlow(ready).title,/1 more player needed/);
  ready.players.push(demoState().players[3]);assert.equal(sessionFlow(ready).action,'generate-all');
});
test('20 players on four courts complete the create, generate, start, record, continue flow',()=>{
  const s=readySession();const now=Date.now();
  const r=suggestAvailableCourts(s,now);assert.equal(r.generated.length,4);assert.equal(queue(s).length,4);assertState(s);assert.equal(sessionFlow(s).action,'start-ready');
  s.courts.forEach(c=>startMatch(s,c,now));assert.equal(sessionFlow(s).action,null);assert.match(sessionFlow(s).title,/in progress/);assertState(s);
  const court=s.courts[0],before=court.teams.flat();completeMatch(s,court,{scores:[11,8]},now+600000);
  assert.equal(s.history.length,1);assert.ok(before.every(id=>stats(s,id).games===1));
  const next=suggestAfterResult(s,court,now+600000);assert.equal(next.ready,true);assert.equal(court.status,'pending');assert.equal(queue(s).length,4);assertState(s);assert.ok(court.teams.flat().every(id=>!before.includes(id)));
  startMatch(s,court,now+600000);assertState(s);assert.equal(sessionFlow(s).action,null);
});
test('a saved result survives when restrictions prevent the next lineup',()=>{
  const s=readySession(4);suggestAvailableCourts(s);startMatch(s,s.courts[0]);completeMatch(s,s.courts[0],{winner:0});
  s.settings.rest=5;const next=suggestAfterResult(s,s.courts[0]);assert.equal(next.ready,false);assert.equal(s.history.length,1);assert.equal(s.courts[0].status,'available');assert.match(sessionFlow(s).title,/resting/);
});
test('paused, ended, and closed-court states explain the next task',()=>{
  const s=readySession();s.session.status='paused';assert.equal(sessionFlow(s).label,'Resume session');
  s.session.status='ended';assert.equal(sessionFlow(s).action,'new-session');
  s.session.status='live';s.courts.forEach(c=>c.status='closed');assert.match(sessionFlow(s).title,/No courts/);
});
test('changed rules prompt review instead of claiming a reserved lineup is ready',()=>{
  const s=readySession(4);suggestAvailableCourts(s);s.settings.strictSkill=true;s.settings.maxGap=.5;
  const flow=sessionFlow(s);assert.equal(flow.action,'lineup');assert.equal(flow.courtId,s.courts[0].id);assert.match(flow.title,/review/);
});
