import test from 'node:test';
import assert from 'node:assert/strict';
import {demoState,queue,playerState,reserve,startMatch,assertState} from '../dist/engine.js';
import {emptyState,sessionFlow} from '../dist/flow.js';
import {elapsedSession,snapshotSession,createSession,startSession,finishSession,openSavedSession,duplicateSession,removeCourt,deleteSavedSession,normalizeSavedSessions,sessionIdentity} from '../dist/sessions.js';

test('deleting an archived session preserves the active session and other saves',()=>{
 const s=demoState();s.archive=[snapshotSession(s),snapshotSession(s)];
 s.archive[0].session.name='Delete me';s.archive[1].session.name='Keep me';
 const current=snapshotSession(s,1000),kept=structuredClone(s.archive[1]);
 deleteSavedSession(s,0);
 assert.deepEqual(snapshotSession(s,1000),current);assert.deepEqual(s.archive,[kept]);
 const unchanged=structuredClone(s);
 for(const index of [-2,NaN,.5,10])assert.throws(()=>deleteSavedSession(s,index),/no longer available/);
 assert.deepEqual(s,unchanged);
});

test('deleting the current session clears only its operational data and retains archived sessions',()=>{
 const s=demoState();s.session.portal={roomId:'shared-room'};s.archive=[snapshotSession(s)];
 const archive=structuredClone(s.archive);s.revision=8;s.audit=[{label:'Previous action'}];
 deleteSavedSession(s,-1);
 assert.equal(s.session,null);assert.deepEqual(s.players,[]);assert.deepEqual(s.courts,[]);assert.deepEqual(s.history,[]);
 assert.deepEqual(s.settings,emptyState().settings);assert.deepEqual(s.archive,archive);
 assert.equal(s.revision,8);assert.deepEqual(s.audit,[{label:'Previous action'}]);assertState(s);
 assert.throws(()=>deleteSavedSession(s,-1),/no longer available/);
});

test('preparation requires four checked-in players and an available court; the clock starts at Start session',()=>{
 const s=emptyState();createSession(s,{name:'Saturday',courtNames:['Court 1'],players:demoState(1000).players.slice(0,3)},2000);
 assert.equal(s.session.status,'preparing');assert.equal(elapsedSession(s,10000),0);assert.equal(sessionFlow(s).action,'add-players');
 assert.throws(()=>startSession(s,10000),/four players/);s.players.push({...demoState(1000).players[3],id:'new'});
 s.courts[0].status='closed';assert.throws(()=>startSession(s,10000),/court available/);s.courts[0].status='available';
 assert.equal(sessionFlow(s).action,'begin-session');startSession(s,10000);assert.equal(elapsedSession(s,11000),1000);
 assert.ok(s.players.every(p=>p.waitSince===10000));
});

test('preparing sessions cannot reserve or start matches',()=>{
 const s=emptyState();createSession(s,{name:'Fresh',courtNames:['Court 1'],players:demoState().players.slice(0,4)});
 const teams=[s.players.slice(0,2).map(p=>p.id),s.players.slice(2).map(p=>p.id)];
 assert.throws(()=>reserve(s,s.courts[0],teams));assert.throws(()=>startMatch(s,s.courts[0]));assertState(s);
});

test('finishing a paused session freezes duration, clears queue, preserves results and final assignments',()=>{
 const s=demoState(5000000);s.session.status='paused';s.session.pausedAt=5100000;
 const duration=elapsedSession(s,5200000),history=structuredClone(s.history),courts=structuredClone(s.courts);
 finishSession(s,5300000);assert.equal(elapsedSession(s,9000000),duration);assert.deepEqual(s.history,history);
 assert.equal(queue(s).length,0);assert.equal(playerState(s,s.players[0].id),'finished');
 assert.deepEqual(s.session.endedCourts,courts);assert.ok(s.courts.every(c=>!c.teams));assertState(s);
});

test('switching and restoring an unfinished session retains lineups, results, settings, queue order, and freezes archived time',()=>{
 const s=demoState(5000000),original=snapshotSession(s,5100000),order=queue(s).map(p=>p.id);
 createSession(s,{name:'Next open play',courtNames:['North'],players:[]},5100000);
 assert.deepEqual(s.archive[0],original);openSavedSession(s,0,6100000);
 assert.equal(s.session.status,'paused');assert.equal(elapsedSession(s,7000000),original.durationMs);
 assert.deepEqual(s.history,original.history);assert.deepEqual(s.settings,original.settings);
 assert.deepEqual(s.courts[0].teams,original.courts[0].teams);assert.equal(s.courts[0].startedAt,original.courts[0].startedAt+1000000);
 assert.deepEqual(queue(s).map(p=>p.id),order);assert.equal(s.archive[0].session.name,'Next open play');assertState(s);
});

test('duplicate creates a prepared session with new identities and copied preferences, never copies results',()=>{
 const s=demoState(),source=snapshotSession(s);s.players[16].lock=s.players[17].id;s.players[17].lock=s.players[16].id;
 const locked=snapshotSession(s);duplicateSession(s,locked,'Sunday copy');
 assert.equal(s.session.status,'preparing');assert.equal(s.history.length,0);assert.equal(s.archive[0].history.length,source.history.length);
 assert.deepEqual(s.courts.map(c=>c.name),source.courts.map(c=>c.name));assert.deepEqual(s.settings,source.settings);
 assert.ok(s.players.every(p=>!source.players.some(old=>old.id===p.id)));
 const a=s.players.find(p=>p.name===locked.players[16].name),b=s.players.find(p=>p.name===locked.players[17].name);
 assert.equal(a.lock,b.id);assert.equal(b.lock,a.id);assertState(s);
});

test('legacy results-only archives open as completed without fabricating unfinished court assignments',()=>{
 const s=demoState();s.archive=[{session:{name:'Old',venue:'',status:'live',startedAt:1000,pausedTime:0},players:structuredClone(s.players),history:structuredClone(s.history)}];
 s.archive[0].players[0].lock=s.archive[0].players[1].id;s.archive[0].players[1].lock=s.archive[0].players[0].id;
 const previous=s.history.length;openSavedSession(s,0);assert.equal(s.session.status,'ended');assert.equal(queue(s).length,0);
 assert.equal(s.history.length,previous);assert.ok(s.courts.every(c=>c.status==='available'&&!c.teams));assertState(s);
 assert.equal(s.players[0].lock,s.players[1].id);assert.equal(s.players[1].lock,s.players[0].id);
});

test('court removal preserves history and rejects assigned or last courts',()=>{
 const s=demoState(),history=structuredClone(s.history);assert.throws(()=>removeCourt(s,'c1'),/Finish/);
 removeCourt(s,'c4');assert.deepEqual(s.history,history);assert.equal(s.courts.length,3);assertState(s);
 s.courts=[{id:'last',name:'Last',status:'available',teams:null}];assert.throws(()=>removeCourt(s,'last'),/at least one/);
});

test('switching sessions retains archives beyond the former 30-session limit',()=>{
 const s=demoState();s.archive=Array.from({length:31},(_,i)=>({...snapshotSession(s),session:{...s.session,id:'saved-'+i,name:'Saved '+i}}));
 createSession(s,{name:'New',courtNames:['Court 1']});assert.equal(s.archive.length,32);assert.equal(s.archive.at(-1).session.name,'Saved 30');
});

test('repeatedly loading and updating a session keeps one latest record for each session',()=>{
 const s=demoState(10000000),first=sessionIdentity(s.session);
 createSession(s,{name:'Next open play',courtNames:['North'],players:[]},10100000);
 const second=sessionIdentity(s.session);
 for(let i=0;i<5;i++){
  openSavedSession(s,s.archive.findIndex(record=>sessionIdentity(record.session)===first),10200000+i*2000);
  s.players[0].name='Updated player '+i;s.settings.target=15;
  s.history[0].scores=[11,9];s.history[0].winner=0;
  openSavedSession(s,s.archive.findIndex(record=>sessionIdentity(record.session)===second),10201000+i*2000);
  assert.equal(s.archive.length,1);assert.equal(sessionIdentity(s.archive[0].session),first);
  assert.equal(s.archive[0].players[0].name,'Updated player '+i);
  assert.equal(s.archive[0].settings.target,15);assert.deepEqual(s.archive[0].history[0].scores,[11,9]);assertState(s);
 }
 openSavedSession(s,0,10300000);
 assert.equal(sessionIdentity(s.session),first);assert.equal(s.players[0].name,'Updated player 4');
 assert.equal(s.archive.length,1);assert.equal(sessionIdentity(s.archive[0].session),second);
});

test('existing duplicate saves keep the latest snapshot and the active session stays authoritative',()=>{
 const s=demoState(10000000),staleCurrent=snapshotSession(s,10001000);
 s.players[0].name='Current edit';
 const older={...snapshotSession(s,10002000),session:{...s.session,id:'other',name:'Other session'}};
 const latest=structuredClone(older);latest.savedAt=10004000;latest.players[0].name='Latest saved edit';
 latest.history=latest.history.slice(0,1);
 s.archive=[staleCurrent,older,latest];
 assert.equal(normalizeSavedSessions(s),true);assert.deepEqual(s.archive,[latest]);
 assert.equal(s.players[0].name,'Current edit');assert.equal(normalizeSavedSessions(s),false);
 openSavedSession(s,0,10005000);
 assert.equal(s.players[0].name,'Latest saved edit');assert.equal(s.history.length,1);
 assert.equal(s.archive.length,1);assert.equal(s.archive[0].players[0].name,'Current edit');
});

test('loading an older duplicate selects its latest save and removes all versions from the archive',()=>{
 const s=demoState(10000000);
 const older={...snapshotSession(s,10001000),session:{...s.session,id:'saved',name:'Saved session'}};
 const latest=structuredClone(older);latest.savedAt=10003000;latest.players[0].name='Latest player';
 s.archive=[older,latest];
 openSavedSession(s,0,10005000);
 assert.equal(s.session.id,'saved');assert.equal(s.players[0].name,'Latest player');
 assert.equal(s.archive.length,1);assert.ok(s.archive.every(record=>record.session.id!=='saved'));assertState(s);
});

test('opening a stale copy of the current session never rolls back its live data',()=>{
 const s=demoState(10000000);s.archive=[snapshotSession(s,10001000)];
 s.players[0].name='Keep this edit';const current=snapshotSession(s,10002000);
 openSavedSession(s,0,10003000);
 assert.deepEqual(snapshotSession(s,10002000),current);assert.deepEqual(s.archive,[]);
});

test('same-name sessions and deliberate duplicates remain separate while legacy copies consolidate',()=>{
 const s=demoState(10000000),legacy=snapshotSession(s,10001000);s.session=null;
 const renamed=structuredClone(legacy);renamed.savedAt=10002000;renamed.session.name='Renamed session';
 const distinct={...structuredClone(legacy),session:{...legacy.session,id:'separate-session'}};
 s.archive=[legacy,distinct,renamed];normalizeSavedSessions(s);
 assert.equal(s.archive.length,2);assert.equal(s.archive[0].session.name,'Renamed session');
 assert.equal(s.archive[1].session.name,legacy.session.name);
});
