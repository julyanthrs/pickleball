import { assertState, queue } from './engine.js';
import { emptyState } from './flow.js';

export function deleteSavedSession(state,index) {
  if(!Number.isInteger(index)||index < -1)throw new Error('This saved session is no longer available.');
  if(index===-1){
    if(!state.session)throw new Error('This saved session is no longer available.');
    const empty=emptyState();
    for(const key of ['session','players','courts','settings','history','demo'])state[key]=empty[key];
  }else{
    if(!state.archive[index])throw new Error('This saved session is no longer available.');
    state.archive.splice(index,1);
  }
  assertState(state);
}

export function elapsedSession(state, now=Date.now()) {
  const s=state.session;
  if (!s || s.status==='preparing') return 0;
  const end=s.status==='ended'?s.endedAt:s.status==='paused'?s.pausedAt:now;
  return Math.max(0,end-s.startedAt-(s.pausedTime||0));
}

export function snapshotSession(state, now=Date.now()) {
  return structuredClone({session:state.session,players:state.players,courts:state.courts,
    settings:state.settings,history:state.history,demo:state.demo,
    savedAt:now,durationMs:elapsedSession(state,now)});
}

function keepCurrent(state, now) {
  if (state.session) state.archive.unshift(snapshotSession(state,now));
  // Session history is retained in full; switching sessions never drops older records.
}

export function createSession(state, {name,courtNames,players=[],settings=state.settings}, now=Date.now()) {
  if (!name.trim()||name.trim().length>60) throw new Error('Enter a session name of up to 60 characters.');
  if (!courtNames.length||courtNames.length>12) throw new Error('Choose between 1 and 12 courts.');
  if(players.length>120) throw new Error('Sessions support up to 120 players.');
  keepCurrent(state,now);
  const idMap=new Map(players.map(p=>[p.id,crypto.randomUUID()]));
  state.session={id:crypto.randomUUID(),name:name.trim(),venue:state.session?.venue||'',createdAt:now,
    startedAt:now,status:'preparing',pausedTime:0};
  state.players=players.map(p=>({id:idMap.get(p.id),name:p.name,rating:p.rating,status:'waiting',
    waitSince:now,totalWait:0,priority:0,lock:p.lock&&idMap.get(p.lock)||null}));
  state.courts=courtNames.map(name=>({id:crypto.randomUUID(),name,status:'available',teams:null}));
  state.settings=structuredClone(settings);state.history=[];state.demo=false;
  assertState(state);
}

export function startSession(state, now=Date.now()) {
  if(state.session.status!=='preparing') throw new Error('This session has already started.');
  if(queue(state).length<4) throw new Error('Check in at least four players before starting.');
  if(!state.courts.some(c=>c.status==='available')) throw new Error('Make at least one court available before starting.');
  state.session.status='live';state.session.startedAt=now;state.session.pausedTime=0;
  state.players.filter(p=>p.status==='waiting').forEach(p=>p.waitSince=now);
}

export function finishSession(state, now=Date.now()) {
  if(state.session.status==='ended') throw new Error('This session is already complete.');
  const elapsed=elapsedSession(state,now);
  state.session.endedCourts=structuredClone(state.courts);
  state.session.status='ended';state.session.endedAt=now;
  state.session.pausedTime=Math.max(0,now-state.session.startedAt-elapsed);
  state.courts.forEach(c=>{c.teams=null;if(c.status!=='closed')c.status='available';});
}

export function removeCourt(state,id) {
  const c=state.courts.find(c=>c.id===id);
  if(!c)throw new Error('This court no longer exists.');
  if(state.courts.length===1)throw new Error('Keep at least one court in the session.');
  if(c.teams||['playing','pending'].includes(c.status))throw new Error('Finish the match or cancel its lineup before removing this court.');
  state.courts=state.courts.filter(c=>c.id!==id);
}

export function openSavedSession(state,index,now=Date.now()) {
  const saved=state.archive[index];
  if(!saved)throw new Error('This saved session is no longer available.');
  const restored=structuredClone(saved);
  // Older archives contain results only. Open them as completed sessions, never invent lineups.
  if(!restored.courts||!restored.settings) {
    const names=[...new Set(restored.history.map(m=>m.court))];
    restored.courts=(names.length?names:['Court 1']).slice(0,12).map(name=>({id:crypto.randomUUID(),name,status:'available',teams:null}));
    restored.settings={mode:'fair',target:11,rest:0,strictSkill:false,maxGap:1,avoidRepeats:false};
    restored.session.status='ended';
    restored.session.endedAt=Math.max(restored.session.startedAt,...restored.history.map(m=>m.endedAt));
    restored.session.pausedTime=0;
  }else if(restored.session.status!=='ended'&&restored.session.status!=='preparing') {
    const inactive=Math.max(0,now-(saved.savedAt||now));
    const duration=saved.durationMs??elapsedSession(restored,saved.savedAt||now);
    restored.session.status='paused';restored.session.pausedAt=now;
    restored.session.pausedTime=Math.max(0,now-restored.session.startedAt-duration);
    restored.players.forEach(p=>{for(const key of ['waitSince','lastEnd'])if(Number.isFinite(p[key]))p[key]+=inactive;});
    restored.courts.forEach(c=>{for(const key of ['startedAt','reservedAt'])if(Number.isFinite(c[key]))c[key]+=inactive;});
  }
  assertState(restored);
  state.archive.splice(index,1);keepCurrent(state,now);
  for(const key of ['session','players','courts','settings','history','demo'])state[key]=restored[key];
}

export function duplicateSession(state,saved,name,now=Date.now()) {
  const source=structuredClone(saved);
  const names=(source.courts||[]).map(c=>c.name);
  createSession(state,{name,courtNames:names.length?names:['Court 1'],players:source.players,
    settings:source.settings||state.settings},now);
  state.session.venue=source.session.venue||'';
}
