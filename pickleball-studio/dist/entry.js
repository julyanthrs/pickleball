import { createSession, startSession, snapshotSession, openSavedSession } from './sessions.js';

export const sessionIdentity = session => session ? session.id||'legacy-'+session.startedAt : null;

export function defaultSetup() {
 return {step:1,name:'',venue:'',courts:4,target:11,mode:'fair',rest:0,strictSkill:false,maxGap:1,
   avoidRepeats:false,useLocks:false,players:[],rosterText:''};
}

export function createConfiguredSession(state,setup,start=false,now=Date.now()) {
 if(!Number.isInteger(setup.courts)||setup.courts<1||setup.courts>12)throw new Error('Choose between 1 and 12 courts.');
 if(![7,11,15,21].includes(setup.target))throw new Error('Choose a supported score target.');
 if(!['fair','balanced','social'].includes(setup.mode)||![0,2,5,10].includes(setup.rest)||![.5,1,1.5,2].includes(setup.maxGap))throw new Error('Choose valid matchmaking preferences.');
 if(start&&setup.players.length<4)throw new Error('Add at least four players to start. You can save a draft with fewer players.');
 const players=setup.players.map(p=>({...p,lock:setup.useLocks?p.lock:null}));
 createSession(state,{name:setup.name,courtNames:Array.from({length:setup.courts},(_,i)=>'Court '+(i+1)),
  players,settings:{mode:setup.mode,target:setup.target,rest:setup.rest,strictSkill:setup.strictSkill,
    maxGap:setup.maxGap,avoidRepeats:setup.avoidRepeats}},now);
 state.session.venue=setup.venue.trim();
 if(start)startSession(state,now);
}

export function exportSessionFile(state,now=Date.now()) {
 return {format:'pickleball-studio-session',version:1,...snapshotSession(state,now),revision:0,archive:[],audit:[]};
}

export function importSessionRecord(state,file,now=Date.now()) {
 // File validation happens before this operation. Keep existing records when importing.
 const imported=structuredClone(file);
 const holder={session:null,archive:[imported]};openSavedSession(holder,0,now);
 const retained=state.session?[snapshotSession(state,now),...state.archive]:[...state.archive];
 for(const key of ['session','players','courts','history','settings','demo'])state[key]=holder[key];
 state.session={...state.session,sourceSessionId:state.session.id||null,id:crypto.randomUUID(),importedAt:now};
 const importedArchive=(imported.archive||[]).map(saved=>({...saved,session:{...saved.session,
   sourceSessionId:saved.session.id||null,id:crypto.randomUUID(),importedAt:now}}));
 state.archive=[...retained,...importedArchive];
}

export function settingsImpact(state,next) {
 const changed=Object.keys(next).some(key=>key in state.settings&&next[key]!==state.settings[key]);
 if(!changed||!state.history.length&&!state.courts.some(c=>['playing','pending'].includes(c.status)))return '';
 if(Object.keys(next).length===1&&'target' in next)return 'The new score target applies to future matches. Matches already playing and recorded results keep their original scoring rules.';
 return 'Reserved lineups will be checked against these rules before starting, and stricter rules may require a new lineup. Playing matches and recorded results keep their teams and scores.';
}
