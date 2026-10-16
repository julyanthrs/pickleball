import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, suggest, reserve, startMatch, completeMatch, stats, playerState, queue, assertState, scoreError, validateLineup, cancelPartnerLock } from '../dist/engine.js';

function session(count,courts=2) {
  const s=demoState(1_000_000);s.history=[];s.demo=false;s.players=Array.from({length:count},(_,i)=>({id:'p'+String(i).padStart(3,'0'),name:'Player '+i,rating:2.5+(i%5)*.5,status:'waiting',waitSince:1_000_000+i,lock:null}));s.courts=Array.from({length:courts},(_,i)=>({id:'c'+i,name:'Court '+i,status:'available',teams:null}));return s;
}
test('cancelling a partner lock releases both players without changing other session records',()=>{
  const s=session(8);s.players[0].lock=s.players[1].id;s.players[1].lock=s.players[0].id;
  s.players[2].lock=s.players[3].id;s.players[3].lock=s.players[2].id;
  const before=structuredClone(s);
  cancelPartnerLock(s,s.players[1].id);
  before.players[0].lock=null;before.players[1].lock=null;
  assert.deepEqual(s,before);assertState(s);
  assert.throws(()=>cancelPartnerLock(s,s.players[0].id),/no longer available/);
});
test('cancelling a lock protects either assigned teammate and completed-session records',()=>{
  for(const status of ['pending','playing','ended'])for(const member of [0,1]){
    const s=session(8);s.players[0].lock=s.players[1].id;s.players[1].lock=s.players[0].id;
    if(status==='ended')s.session.status='ended';
    else{s.courts[0].status=status;s.courts[0].teams=[[s.players[member].id,s.players[2].id],[s.players[3].id,s.players[4].id]];}
    const before=structuredClone(s);
    assert.throws(()=>cancelPartnerLock(s,s.players[0].id),/archived|release the lineup/);
    assert.deepEqual(s,before);
  }
});
for(const [players,courts] of [[8,2],[10,2],[17,3],[24,4],[40,6]])test(`${players} players / ${courts} courts: 20 rotations preserve assignments, results, and fair opportunities`,()=>{
  const s=session(players,courts);let now=2_000_000;
  for(let rotation=0;rotation<20;rotation++) {
    for(const c of s.courts){const result=suggest(s,c,now);if(result.error)continue;reserve(s,c,result.teams,now);startMatch(s,c,now);assertState(s);}
    const assigned=s.courts.flatMap(c=>c.teams?.flat()||[]);assert.equal(new Set(assigned).size,assigned.length);
    for(const c of s.courts.filter(c=>c.status==='playing')){completeMatch(s,c,{scores:[11,7]},now+600000);assertState(s);}
    now+=1_000_000;
  }
  const counts=s.players.map(p=>stats(s,p.id).games);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
  assert.equal(s.players.reduce((n,p)=>n+stats(s,p.id).games,0),s.history.length*4);
  assert.equal(s.players.reduce((n,p)=>n+stats(s,p.id).wins,0),s.history.length*2);
  assert.equal(s.players.reduce((n,p)=>n+stats(s,p.id).losses,0),s.history.length*2);
});
test('lineups exclude breaks, checkout, already assigned players, and rest restrictions',()=>{
  const s=session(12,2);s.players[0].status='break';s.players[1].status='out';s.players[2].lastEnd=1_990_000;s.settings.rest=5;
  const first=suggest(s,s.courts[0],2_000_000);assert.ok(!first.error);reserve(s,s.courts[0],first.teams,2_000_000);startMatch(s,s.courts[0],2_000_000);
  const second=suggest(s,s.courts[1],2_000_000);assert.ok(!second.error);reserve(s,s.courts[1],second.teams,2_000_000);assertState(s);
  assert.ok(!s.courts.flatMap(c=>c.teams.flat()).some(id=>['p000','p001','p002'].includes(id)));
  assert.equal(playerState(s,first.teams[0][0]),'playing');
});
test('partner locks stay together; an unavailable locked partner prevents selection',()=>{
  const s=session(8);s.players[0].lock=s.players[7].id;s.players[7].lock=s.players[0].id;
  s.players[7].waitSince=999_000;
  const r=suggest(s,s.courts[0],2_000_000);assert.ok(r.teams.some(t=>t.includes('p000')&&t.includes('p007')));
  s.players[7].status='break';const next=suggest(s,s.courts[0],2_000_000);assert.ok(!next.teams.flat().includes('p000'));
});
test('strict skill conflicts produce an explanation, never an invalid match',()=>{
  const s=session(4);s.settings.strictSkill=true;s.settings.maxGap=.5;
  assert.ok(suggest(s,s.courts[0],2_000_000).error);
  s.settings.strictSkill=false;assert.ok(suggest(s,s.courts[0],2_000_000).teams);
});
test('repeat restrictions, distinct players, and simultaneous assignment are enforced',()=>{
  const s=session(8);const teams=[['p000','p001'],['p002','p003']];
  assert.ok(validateLineup(s,s.courts[0],[['p000','p000'],['p002','p003']],2_000_000));
  reserve(s,s.courts[0],teams,2_000_000);assert.ok(validateLineup(s,s.courts[1],teams,2_000_000));
  startMatch(s,s.courts[0],2_000_000);completeMatch(s,s.courts[0],{scores:[11,7]},3_000_000);
  reserve(s,s.courts[0],teams,4_000_000);startMatch(s,s.courts[0],4_000_000);completeMatch(s,s.courts[0],{scores:[11,7]},5_000_000);
  s.settings.avoidRepeats=true;assert.ok(validateLineup(s,s.courts[0],teams,6_000_000));
});
test('score validation supports deuce, rejects wrong margins, and duplicate submission',()=>{
  assert.equal(scoreError([11,9],11),null);assert.equal(scoreError([17,15],11),null);assert.ok(scoreError([11,10],11));assert.ok(scoreError([15,10],11));assert.ok(scoreError([-1,11],11));
  const s=session(4);const r=suggest(s,s.courts[0],2_000_000);reserve(s,s.courts[0],r.teams,2_000_000);startMatch(s,s.courts[0],2_000_000);completeMatch(s,s.courts[0],{scores:[11,9]},3_000_000);
  assert.throws(()=>completeMatch(s,s.courts[0],{scores:[11,9]},3_000_000));assert.equal(queue(s).length,4);
});
test('quick wins, casual games, score corrections, and reload derive correct statistics',()=>{
  const s=session(4);for(const winner of [0,null,1]){const r=suggest(s,s.courts[0],2_000_000);reserve(s,s.courts[0],r.teams,2_000_000);startMatch(s,s.courts[0],2_000_000);completeMatch(s,s.courts[0],{winner},3_000_000);}
  assert.equal(stats(s,'p000').games,3);assert.equal(stats(s,'p000').wins+stats(s,'p000').losses,2);
  const match=s.history[0],pid=match.teams[0][0],before=stats(s,pid).wins;match.winner=0;assert.equal(stats(s,pid).wins,before+1);
  const restored=JSON.parse(JSON.stringify(s));assertState(restored);assert.deepEqual(stats(restored,pid),stats(s,pid));
});
test('matchmaking is deterministic and handles a late check-in fairly',()=>{
  const s=session(8);const r=suggest(s,s.courts[0],2_000_000);assert.deepEqual(suggest(s,s.courts[0],2_000_000),r);
  reserve(s,s.courts[0],r.teams,2_000_000);startMatch(s,s.courts[0],2_000_000);completeMatch(s,s.courts[0],{winner:0},3_000_000);
  s.players.push({id:'late',name:'Late guest',rating:3,status:'waiting',waitSince:3_500_000});
  const next=suggest(s,s.courts[0],4_000_000);assert.ok(next.teams.flat().every(id=>stats(s,id).games===0));
});
test('closed courts, paused sessions, missing winners, and scoring rule changes are handled',()=>{
  const s=session(4),c=s.courts[0],teams=[['p000','p001'],['p002','p003']];
  c.status='closed';assert.throws(()=>reserve(s,c,teams,2_000_000));
  c.status='available';s.session.status='paused';assert.throws(()=>reserve(s,c,teams,2_000_000));
  s.session.status='live';s.settings.target=7;reserve(s,c,teams,2_000_000);startMatch(s,c,2_000_000);
  s.settings.target=21;assert.throws(()=>completeMatch(s,c,{},3_000_000));
  completeMatch(s,c,{scores:[7,5]},3_000_000);assert.equal(s.history[0].target,7);assert.equal(s.history[0].winner,0);
});
test('a paused session can edit an existing reserved lineup but cannot start it',()=>{
  const s=session(4),c=s.courts[0];reserve(s,c,[['p000','p001'],['p002','p003']],2_000_000);
  s.session.status='paused';reserve(s,c,[['p000','p002'],['p001','p003']],2_000_000);assertState(s);
  assert.throws(()=>startMatch(s,c,2_000_000));assert.equal(c.status,'pending');
});
