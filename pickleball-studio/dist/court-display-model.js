import { sessionIdentity } from './entry.js';
import { elapsedSession } from './sessions.js';

export const COURT_CHANNEL='pickleball-court-display-v1';
export const WORKSPACE_KEY='pickleball-studio-v1';

// Explicit spectator projection: never send organizer tokens, settings or full profiles.
export function courtDisplayView(workspace,sessionId,now=Date.now()){
  const current=sessionIdentity(workspace?.session)===sessionId;
  const source=current?workspace:workspace?.archive?.find(s=>sessionIdentity(s.session)===sessionId);
  if(!source?.session)return null;
  const names=new Map(source.players.map(p=>[p.id,p.name]));
  const teamNames=teams=>teams?.map(t=>t.map(id=>names.get(id)||'Former player'))||null;
  const at=current?now:source.savedAt||now;
  return {id:sessionId,name:source.session.name,venue:source.session.venue||'',
    status:source.session.status,archived:!current,capturedAt:now,
    elapsedMs:current?elapsedSession(source,now):source.durationMs??elapsedSession(source,at),
    pausedAt:source.session.pausedAt||null,frozenAt:!current?at:source.session.endedAt||null,
    courts:source.courts.map(c=>{
      const assigned=['pending','playing'].includes(c.status)&&!!c.teams;
      const last=source.history.filter(m=>m.court===c.name).sort((a,b)=>b.endedAt-a.endedAt)[0];
      return {id:c.id,name:c.name,status:c.status,teams:assigned?teamNames(c.teams):null,
        key:assigned?JSON.stringify([c.id,c.reservedAt??c.matchId??c.startedAt,c.teams]):null,
        startedAt:Number.isFinite(c.startedAt)?c.startedAt:null,target:Number(c.target||source.settings.target)||11,
        lastResult:last?{scores:last.scores||null,teams:teamNames(last.teams),winner:last.winner}:null};
    })};
}

export function newCourtAssignments(previous,next){
  if(!previous||previous.id!==next?.id||next.status!=='live'||next.archived||next.organizerActive===false)return [];
  const old=new Map(previous.courts.map(c=>[c.id,c.key]));
  return next.courts.filter(c=>c.key&&old.get(c.id)!==c.key);
}

export function validCourtAnnouncement(announcement,view){
  return !!announcement&&view?.status==='live'&&!view.archived&&view.organizerActive!==false&&view.courts.some(c=>c.id===announcement.id&&c.key===announcement.key);
}
