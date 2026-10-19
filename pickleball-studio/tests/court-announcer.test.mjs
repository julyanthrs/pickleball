import test from 'node:test';
import assert from 'node:assert/strict';
import { courtAnnouncementLines,createCourtAnnouncer,announcementVoice } from '../dist/court-announcer.js';

const court={name:'Court 3',teams:[['Isa Garcia','Jules Rivera'],['Kai Mendoza','Lia Torres']]};
function harness(t){
 t.mock.timers.enable({apis:['setTimeout']});
 const utterances=[],statuses=[];let finished=0,cancelled=0;
 const synthesis={getVoices:()=>[{name:'Microsoft Zira Desktop',lang:'en-US',localService:true}],speak:u=>utterances.push(u),cancel:()=>cancelled++};
 const announcer=createCourtAnnouncer({synthesis,Utterance:class{constructor(text){this.text=text;}},onStatus:s=>statuses.push(s),onComplete:()=>finished++});
 return {announcer,utterances,statuses,get finished(){return finished;},get cancelled(){return cancelled;}};
}

test('reads court, both teams and destination twice, and completes only after the final end event',t=>{
 const h=harness(t);h.announcer.play(court);
 const expected=[...courtAnnouncementLines(court),...courtAnnouncementLines(court)];expected[4]='Once again, '+expected[4];
 assert.deepEqual(expected.slice(0,4),['Court 3.','Team one, Isa Garcia and Jules Rivera.','Team two, Kai Mendoza and Lia Torres.','Please proceed to Court 3.']);
 for(let i=0;i<expected.length;i++){
  assert.equal(h.utterances.length,i+1,'only one utterance at a time');
  assert.equal(h.utterances[i].text,expected[i]);
  assert.equal(h.utterances[i].rate,1,'maintains a consistent natural pace');
  h.utterances[i].onstart();t.mock.timers.tick(5500);
  assert.equal(h.finished,0,'old visual timeout cannot finish speech');
  h.utterances[i].onend();
  if(i<expected.length-1){
   assert.equal(h.utterances.length,i+1,'leaves a clear pause between sections');
   const pause=i===3?800:180;
   t.mock.timers.tick(pause-1);assert.equal(h.utterances.length,i+1);
   t.mock.timers.tick(1);
  }
 }
 assert.equal(h.finished,1);assert.equal(h.statuses.at(-1).completed,8);
});

test('prefers a female English voice over male defaults and keeps natural voices first',()=>{
 const david={name:'Microsoft David Desktop',lang:'en-US',localService:true};
 const zira={name:'Microsoft Zira Desktop',lang:'en-US',localService:true};
 const aria={name:'Microsoft Aria Online (Natural)',lang:'en-US',localService:false};
 assert.equal(announcementVoice([david,zira]),zira);
 assert.equal(announcementVoice([david,zira,aria]),aria);
 assert.equal(announcementVoice([{name:'Samantha',lang:'en-US',localService:true},david]).name,'Samantha');
 assert.equal(announcementVoice([david]),david);assert.equal(announcementVoice([]),undefined);
});

test('waits for installed voices and uses the same female voice for both readings',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let voices=[],changed;const utterances=[];
 const zira={name:'Microsoft Zira Desktop',lang:'en-US',localService:true};
 const synthesis={getVoices:()=>voices,addEventListener:(type,fn)=>{changed=fn;},removeEventListener(){},speak:u=>utterances.push(u),cancel(){}};
 const announcer=createCourtAnnouncer({synthesis,Utterance:class{constructor(text){this.text=text;}}});
 announcer.play(court);assert.equal(utterances.length,0);
 voices=[{name:'Microsoft David Desktop',lang:'en-US'},zira];changed();
 for(let i=0;i<8;i++){
  assert.equal(utterances[i].voice,zira);
  utterances[i].onstart();utterances[i].onend();
  t.mock.timers.tick(i===3?800:180);
 }
});

test('cancel during a pause does not start the next sentence',t=>{
 const h=harness(t);h.announcer.play(court);h.utterances[0].onstart();h.utterances[0].onend();
 h.announcer.cancel();t.mock.timers.tick(1000);
 assert.equal(h.utterances.length,1);assert.equal(h.finished,0);
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
