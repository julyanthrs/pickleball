import { queue, suggest, reserve, validateLineup } from './engine.js';

export function emptyState() {
  return { revision:0, demo:false, session:null, settings:{ mode:'fair', target:11, rest:0, strictSkill:false, maxGap:1, avoidRepeats:false }, players:[], courts:[], history:[], archive:[], audit:[] };
}
export function sessionFlow(state, now=Date.now()) {
  if (!state.session) return { step:1, title:'Ready to start playing?', detail:'A session brings your players, courts, and results together for one open-play session.', action:'new-session', label:'Create session' };
  if (state.session.status==='ended') return { step:5, title:'Session complete', detail:'Your completed matches and statistics are saved in Results. Start a new session when you’re ready.', action:'new-session', label:'Create session' };
  if (state.session.status==='paused') return { step:4, title:'Session paused', detail:'You can still record results. Resume the session to generate or start matches.', action:'pause', label:'Resume session' };
  if (state.session.status==='preparing') {
    const ready=queue(state).length;
    if (ready<4) return { step:2, title:'Add players to prepare your session', detail:`${ready} checked in · Doubles needs at least four players.`, action:'add-players', label:'Add players' };
    if (!state.courts.some(c=>c.status==='available')) return { step:2, title:'Make a court available', detail:'Review your courts in Manage Session before starting.', action:'add-court', label:'Manage courts' };
    return {step:3,title:'Your session is ready',detail:`${ready} players checked in. Start the session, then generate your first matches.`,action:'begin-session',label:'Start session'};
  }
  const waiting=queue(state), pending=state.courts.filter(c=>c.status==='pending'), playing=state.courts.filter(c=>c.status==='playing'), available=state.courts.filter(c=>c.status==='available');
  if (!state.players.length) return { step:2, title:'Add players to get started', detail:`You have ${state.courts.length} courts ready. Doubles needs four checked-in players per match.`, action:'add-players', label:'Add players' };
  const needsReview=pending.find(c=>validateLineup(state,c,c.teams,now));
  if(needsReview) return { step:3, title:'A lineup needs review', detail:'The current matchmaking rules no longer fit this lineup. Edit or regenerate it before starting.', action:'lineup', label:'Review lineup', courtId:needsReview.id };
  if (pending.length) return { step:4, title:`${pending.length} match${pending.length===1?' is':'es are'} ready to start`, detail:'Review the teams below. Start each court separately or start all ready matches together.', action:'start-ready', label:pending.length===1?'Start ready match':'Start ready matches' };
  const eligible=waiting.filter(p=>!state.settings.rest||!p.lastEnd||now-p.lastEnd>=state.settings.rest*60000);
  if (available.length&&eligible.length>=4) return { step:3, title:'Ready to generate matches', detail:`${eligible.length} eligible players · ${available.length} available court${available.length===1?'':'s'}. We’ll suggest teams in fair queue order.`, action:'generate-all', label:'Generate matches' };
  if (playing.length) return { step:5, title:'Matches are in progress', detail:'When a court finishes, record its result below. Players return to the queue and a new lineup is suggested.', action:null };
  if (!available.length) return { step:3, title:'No courts are available', detail:'Reactivate a court from its Court options to include it in rotation.', action:'add-court', label:'Add court' };
  if (waiting.length>=4&&eligible.length<4) return { step:3, title:'Players are resting', detail:`${eligible.length} players are ready now. Match generation needs four players who have finished their rest time.`, action:'rotation', label:'Matchmaking settings' };
  return { step:2, title:`${Math.max(0,4-eligible.length)} more player${4-eligible.length===1?'':'s'} needed`, detail:'Add players or check participants in from Players. Only available, checked-in players can join a match.', action:'add-players', label:'Add players' };
}
export function suggestAvailableCourts(state, now=Date.now()) {
  const generated=[], blocked=[];
  for (const court of state.courts.filter(c=>c.status==='available')) {
    if (queue(state).length<4) break;
    const result=suggest(state,court,now);
    if(result.error){ blocked.push({court:court.name,reason:result.error}); break; }
    reserve(state,court,result.teams,now); generated.push(court.id);
  }
  return { generated, blocked };
}
export function suggestAfterResult(state, court, now=Date.now()) {
  const result=suggest(state,court,now);
  if(result.error)return { ready:false, reason:result.error };
  reserve(state,court,result.teams,now);return { ready:true };
}
