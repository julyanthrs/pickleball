import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState,reserve,startMatch } from '../dist/engine.js';
import { snapshotSession,finishSession } from '../dist/sessions.js';
import { sessionIdentity } from '../dist/entry.js';
import { courtDisplayView,newCourtAssignments,validCourtAnnouncement } from '../dist/court-display-model.js';

test('TV projection contains court names and lineups without organizer credentials or player profiles',()=>{
 const state=demoState();state.session.portal={roomId:'room',hostToken:'private-organizer-token'};
 state.players[0].privateNote='private-player-note';const before=structuredClone(state);
 const view=courtDisplayView(state,sessionIdentity(state.session));
 assert.equal(view.courts[0].teams[0][0],'Alex Mercado');
 assert.equal(view.courts[0].lastResult.scores[0],11);
 assert.equal(JSON.stringify(view).includes('private-organizer-token'),false);
 assert.equal(JSON.stringify(view).includes('private-player-note'),false);
 assert.equal('players' in view,false);assert.equal('settings' in view,false);
 assert.deepEqual(state,before);
});

test('TV remains pinned to its original session after another session is selected',()=>{
 const state=demoState(),id=sessionIdentity(state.session),saved=snapshotSession(state);
 state.archive=[saved];state.session={...state.session,id:crypto.randomUUID(),name:'Different session'};
 const view=courtDisplayView(state,id);
 assert.equal(view.name,saved.session.name);assert.equal(view.archived,true);
 assert.equal(view.elapsedMs,saved.durationMs);
 state.archive=[];assert.equal(courtDisplayView(state,id),null);
});

test('new lineups announce once, preserve the call across match start, and drop cancelled calls',()=>{
 const state=demoState(),id=sessionIdentity(state.session),court=state.courts[3];
 const before=courtDisplayView(state,id),teams=[['p13','p14'],['p15','p16']];
 reserve(state,court,teams,Date.now());const reserved=courtDisplayView(state,id);
 const calls=newCourtAssignments(before,reserved);assert.equal(calls.length,1);assert.equal(calls[0].name,'Court 4');
 assert.deepEqual(newCourtAssignments(null,reserved),[]);
 assert.deepEqual(newCourtAssignments(reserved,courtDisplayView(state,id)),[]);
 startMatch(state,court);const playing=courtDisplayView(state,id);
 assert.deepEqual(newCourtAssignments(reserved,playing),[]);assert.equal(validCourtAnnouncement(calls[0],playing),true);
 court.status='available';court.teams=null;
 assert.equal(validCourtAnnouncement(calls[0],courtDisplayView(state,id)),false);
 reserve(state,court,teams,Date.now()+1000);
 assert.equal(newCourtAssignments(playing,courtDisplayView(state,id)).length,1);
 const paused=courtDisplayView(state,id);paused.status='paused';
 assert.equal(validCourtAnnouncement(calls[0],paused),false);
 finishSession(state);assert.deepEqual(newCourtAssignments(reserved,courtDisplayView(state,id)),[]);
});

test('simultaneous court assignments produce distinct announcements in court order',()=>{
 const state=demoState(),id=sessionIdentity(state.session);
 for(const c of state.courts){c.status='available';c.teams=null;}
 const before=courtDisplayView(state,id);
 state.courts.slice(0,3).forEach((c,i)=>{const ids=state.players.slice(i*4,i*4+4).map(p=>p.id);reserve(state,c,[ids.slice(0,2),ids.slice(2)]);});
 const after=courtDisplayView(state,id),calls=newCourtAssignments(before,after);
 assert.deepEqual(calls.map(c=>c.name),['Court 1','Court 2','Court 3']);
 after.organizerActive=false;assert.deepEqual(newCourtAssignments(before,after),[]);
});
