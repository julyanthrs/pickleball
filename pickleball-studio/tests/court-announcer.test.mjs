import test from 'node:test';
import assert from 'node:assert/strict';
import { courtAnnouncementLines,createCourtAnnouncer } from '../dist/court-announcer.js';

const court={name:'Court 3',teams:[['Isa Garcia','Jules Rivera'],['Kai Mendoza','Lia Torres']]};
function harness(t){
 t.mock.timers.enable({apis:['setTimeout']});
 const utterances=[],statuses=[];let finished=0,cancelled=0;
 const synthesis={getVoices:()=>[],speak:u=>utterances.push(u),cancel:()=>cancelled++};
 const announcer=createCourtAnnouncer({synthesis,Utterance:class{constructor(text){this.text=text;}},onStatus:s=>statuses.push(s),onComplete:()=>finished++});
 return {announcer,utterances,statuses,get finished(){return finished;},get cancelled(){return cancelled;}};
}

test('reads court, both teams and destination twice, and completes only after the final end event',t=>{
 const h=harness(t);h.announcer.play(court);
 const expected=[...courtAnnouncementLines(court),...courtAnnouncementLines(court)];
 assert.deepEqual(expected.slice(0,4),['Court 3.','Team 1: Isa Garcia, Jules Rivera.','Team 2: Kai Mendoza, Lia Torres.','Please proceed to Court 3.']);
 for(let i=0;i<expected.length;i++){
  assert.equal(h.utterances.length,i+1,'only one utterance at a time');
  assert.equal(h.utterances[i].text,expected[i]);
  h.utterances[i].onstart();t.mock.timers.tick(5500);
  assert.equal(h.finished,0,'old visual timeout cannot finish speech');
  h.utterances[i].onend();
 }
 assert.equal(h.finished,1);assert.equal(h.statuses.at(-1).completed,8);
});

test('blocked speech keeps the announcement pending and retry starts both readings again',t=>{
 const h=harness(t);h.announcer.play(court);const blocked=h.utterances[0];
 blocked.onerror({error:'not-allowed'});blocked.onend();
 assert.equal(h.finished,0);assert.equal(h.statuses.at(-1).phase,'error');
 h.announcer.play(court);assert.equal(h.utterances[1].text,'Court 3.');
 assert.equal(h.statuses.at(-1).completed,0);
});

test('cancelling or replacing an announcement ignores late events from its old voice',t=>{
 const h=harness(t);h.announcer.play(court);const old=h.utterances[0];
 h.announcer.cancel();old.onend();old.onerror({error:'interrupted'});
 assert.equal(h.finished,0);assert.equal(h.utterances.length,1);
 h.announcer.play({...court,name:'Court 4'});old.onend();
 assert.equal(h.utterances.at(-1).text,'Court 4.');assert.equal(h.utterances.length,2);
 assert.equal(h.cancelled,1);
});

test('missing or unresponsive speech never pretends two readings have finished',t=>{
 const h=harness(t);h.announcer.play(court);t.mock.timers.tick(8000);
 assert.equal(h.finished,0);assert.equal(h.statuses.at(-1).error,'not-started');
 let complete=false,status;
 const unavailable=createCourtAnnouncer({synthesis:null,Utterance:null,onComplete:()=>{complete=true;},onStatus:s=>{status=s;}});
 assert.equal(unavailable.play(court),false);assert.equal(complete,false);assert.equal(status.phase,'unavailable');
});
