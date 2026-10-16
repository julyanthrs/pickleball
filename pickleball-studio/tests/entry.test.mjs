import test from 'node:test';
import assert from 'node:assert/strict';
import {demoState,assertState} from '../dist/engine.js';
import {emptyState} from '../dist/flow.js';
import {elapsedSession} from '../dist/sessions.js';
import {defaultSetup,createConfiguredSession,exportSessionFile,importSessionRecord,settingsImpact,sessionIdentity} from '../dist/entry.js';

test('guided setup saves a configured draft without starting its timer or losing the current session',()=>{
 const s=demoState(10000000),previous=structuredClone(s),setup=defaultSetup();
 Object.assign(setup,{name:'Next session',venue:'Garden',courts:2,target:15,mode:'balanced',rest:2});
 createConfiguredSession(s,setup,false,10100000);
 assert.equal(s.session.status,'preparing');assert.equal(elapsedSession(s,99999999),0);assert.equal(s.session.venue,'Garden');
 assert.equal(s.settings.target,15);assert.equal(s.settings.mode,'balanced');assert.equal(s.courts.length,2);
 assert.deepEqual(s.archive[0].history,previous.history);assert.deepEqual(s.archive[0].courts,previous.courts);assertState(s);
});

test('Start Session validates before changing records and starts a fully configured session explicitly',()=>{
 const s=emptyState(),setup=defaultSetup();setup.name='Ready';const before=structuredClone(s);
 assert.throws(()=>createConfiguredSession(s,setup,true),/four players/);assert.deepEqual(s,before);
 setup.players=demoState().players.slice(0,4);createConfiguredSession(s,setup,true,5000000);
 assert.equal(s.session.status,'live');assert.equal(elapsedSession(s,5002000),2000);assertState(s);
});

test('session export/import preserves original sessions and restores incoming unfinished matches paused',()=>{
 const original=demoState(10000000),incoming=demoState(12000000);incoming.session.name='Imported';
 const originalCourts=structuredClone(original.courts),file=exportSessionFile(incoming,12100000);
 importSessionRecord(original,file,13100000);
 assert.equal(original.session.name,'Imported');assert.equal(original.session.status,'paused');
 assert.deepEqual(original.courts[0].teams,incoming.courts[0].teams);assert.deepEqual(original.archive[0].courts,originalCourts);
 assert.equal(elapsedSession(original,14100000),file.durationMs);assertState(original);
 assert.notEqual(sessionIdentity(original.session),sessionIdentity(original.archive[0].session));
});

test('legacy workspace-file import retains both existing and incoming session histories',()=>{
 const current=demoState(),incoming=demoState();incoming.archive=[{session:{...incoming.session,name:'Earlier'},players:incoming.players,history:incoming.history}];
 importSessionRecord(current,incoming);assert.equal(current.archive.length,2);assert.equal(current.archive[1].session.name,'Earlier');
});

test('settings warnings appear only for actual rule changes when matches or results exist',()=>{
 const s=demoState();assert.match(settingsImpact(s,{target:15}),/future matches/);
 assert.match(settingsImpact(s,{rest:5}),/Reserved lineups/);assert.equal(settingsImpact(s,{target:11}),'');
 s.history=[];s.courts.forEach(c=>{c.status='available';c.teams=null;});assert.equal(settingsImpact(s,{target:15}),'');
});

test('session identity remains stable across naming edits and changes across chosen sessions',()=>{
 const s=demoState();const id=sessionIdentity(s.session);s.session.name='Renamed';assert.equal(sessionIdentity(s.session),id);
 assert.notEqual(sessionIdentity({...s.session,startedAt:s.session.startedAt+1}),id);assert.equal(sessionIdentity(null),null);
});
