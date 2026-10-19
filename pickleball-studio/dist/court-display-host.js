import { COURT_CHANNEL,courtDisplayView,validCourtAnnouncement } from './court-display-model.js';
import { sessionIdentity } from './entry.js';

export function createCourtDisplayHost(getState,isSelected){
  if(typeof BroadcastChannel==='undefined')return {publish(){},announce(){return false;}};
  const channel=new BroadcastChannel(COURT_CHANNEL),subscribers=new Set();
  function send(id){
    const state=getState(),view=courtDisplayView(state,id);
    if(view)view.organizerActive=isSelected()&&!view.archived;
    channel.postMessage({type:'courts',sessionId:id,view});
  }
  channel.addEventListener('message',e=>{
    if(e.data?.type!=='watch-courts'||typeof e.data.sessionId!=='string'||e.data.sessionId.length>150)return;
    subscribers.add(e.data.sessionId);send(e.data.sessionId);
  });
  function publish(){for(const id of subscribers)send(id);}
  function announce(courtId){
    const state=getState(),id=sessionIdentity(state.session);
    if(!isSelected()||!subscribers.has(id))return false;
    const view=courtDisplayView(state,id),court=view?.courts.find(c=>c.id===courtId);
    if(!court?.key||!validCourtAnnouncement(court,view))return false;
    view.organizerActive=true;
    channel.postMessage({type:'announce-court',sessionId:id,courtId,key:court.key,view});
    return true;
  }
  const heartbeat=setInterval(publish,2000);
  window.addEventListener('pagehide',()=>{clearInterval(heartbeat);channel.close();},{once:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
  return {publish,announce};
}
