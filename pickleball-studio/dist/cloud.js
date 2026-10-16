const clone=value=>structuredClone(value);
export function sessionPayload(state){const value=clone({session:state.session,settings:state.settings,players:state.players,courts:state.courts,history:state.history});delete value.session.portal;return value;}
export function createSessionCloud({getState,receive,connection,notice}){
 const records=new Map();let active=null,lastInfo=null;
 const stash=(r)=>{try{if(r.queued)localStorage.setItem('pickleball-outbox-'+r.id,JSON.stringify({state:r.queued,version:r.version}));else localStorage.removeItem('pickleball-outbox-'+r.id);}catch{}};
 async function api(path,method='GET',data){const response=await fetch('/api/portal/'+path,{method,headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(12000)});let value;try{value=await response.json();}catch{throw new Error('Live sharing could not be reached.');}if(!response.ok)throw Object.assign(new Error(value.error||'Live session changed.'),{status:response.status,info:value});return value;}
 function status(r,value){r.status=value;if(r===active)connection(value);}
 function accept(r,info,mergeOnly=false){r.version=info.version;r.info=info;r.base=clone(info.state);if(r===active){lastInfo=info;receive(info,{mergeOnly});}status(r,'connected');}
 async function flush(r){if(r.flushing||!r.queued)return;r.flushing=true;const snapshot=r.queued,sequence=r.sequence;status(r,'syncing');
  try{const info=await api('rooms/'+r.id,'PUT',{state:snapshot,version:r.version});if(r.sequence===sequence)r.queued=null;accept(r,info,r.sequence!==sequence);stash(r);}
  catch(e){if(e.status===409&&e.info?.state){try{localStorage.setItem('pickleball-recovery-'+r.id,JSON.stringify({savedAt:Date.now(),state:r.queued}));}catch{}r.queued=null;accept(r,e.info);stash(r);notice('Another organizer updated this session. The latest shared version is loaded; your unsynced version is saved as a local recovery copy. Please repeat your last action.');}else{status(r,'offline');stash(r);}}
  finally{r.flushing=false;if(r.queued&&r.status!=='offline')queueMicrotask(()=>flush(r));}
 }
 async function refresh(r=active){if(!r||r.flushing)return;if(r.queued)return flush(r);const sequence=r.sequence,version=r.version;try{const info=await api('rooms/'+r.id);if(r!==active||r.sequence!==sequence||r.version!==version||r.flushing||r.queued)return;if(info.version!==r.version||!r.info){accept(r,info);}else{r.info=info;lastInfo=info;connection('connected',info);}}catch{if(r.sequence===sequence&&!r.flushing)status(r,'offline');}}
 function select(state){const meta=state?.session?.portal;if(!meta?.roomId){active=null;return;}if(active?.id===meta.roomId)return;
  let r=records.get(meta.roomId);if(!r){r={id:meta.roomId,version:meta.version||0,info:null,queued:null,sequence:0,flushing:false,status:'connecting'};try{const saved=JSON.parse(localStorage.getItem('pickleball-outbox-'+r.id));if(saved){r.queued=saved.state;r.version=saved.version;}}catch{}records.set(r.id,r);}active=r;connection(r.status);refresh(r);
 }
 function changed(state){if(!state.session?.portal?.roomId)return;let r=records.get(state.session.portal.roomId);if(!r){select(state);r=active;}if(!r)return;r.queued=sessionPayload(state);r.sequence++;stash(r);flush(r);}
 async function enable(){const state=getState();if(active&&active.id===state.session.portal?.roomId){if(active.queued){await flush(active);if(active.queued)throw new Error('Wait for your local changes to sync before inviting players.');}await refresh(active);return active.info;}
  const clientSessionId=state.session.id||'legacy-'+state.session.startedAt;const info=await api('rooms','POST',{clientSessionId,state:sessionPayload(state)});const r={id:info.roomId,version:info.version,info,base:clone(info.state),queued:null,sequence:0,flushing:false,status:'connected'};records.set(r.id,r);active=r;lastInfo=info;return info;
 }
 async function settings(values){if(!active)throw new Error('Open the session invite first.');const info=await api('rooms/'+active.id+'/settings','POST',values);active.info=info;lastInfo=info;connection('connected',info);return info;}
 async function decide(identityId,approve){if(!active)throw new Error('Open the session invite first.');const r=active;if(r.flushing)throw new Error('Your changes are syncing. Try this request again in a moment.');if(r.queued)await flush(r);if(r.queued||r.flushing)throw new Error('Reconnect and sync your changes before handling this request.');const sequence=r.sequence;const info=await api('rooms/'+r.id+'/'+(approve?'approve':'reject'),'POST',{identityId});accept(r,info,r.sequence!==sequence);return info;}
 setInterval(()=>refresh(),2000);window.addEventListener('online',()=>refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 return {select,changed,enable,settings,decide,refresh,recovery:()=>{try{return active?JSON.parse(localStorage.getItem('pickleball-recovery-'+active.id)):null;}catch{return null;}},info:()=>lastInfo,status:()=>active?.status||'local',canEdit:()=>!active||active.status!=='connecting',isShared:()=>!!active};
}
