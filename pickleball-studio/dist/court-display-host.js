import { COURT_CHANNEL,courtDisplayView } from './court-display-model.js';

export function createCourtDisplayHost(getState,isSelected){
  if(typeof BroadcastChannel==='undefined')return {publish(){}};
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
  const heartbeat=setInterval(publish,2000);
  window.addEventListener('pagehide',()=>{clearInterval(heartbeat);channel.close();},{once:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
  return {publish};
}
