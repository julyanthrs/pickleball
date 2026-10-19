import { COURT_CHANNEL,WORKSPACE_KEY,courtDisplayView,newCourtAssignments,validCourtAnnouncement } from './court-display-model.js';
import { createCourtAnnouncer } from './court-announcer.js';

const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sessionId=new URLSearchParams(location.hash.slice(1)).get('session');
let view=null,signature='',rawStored='',lastHeard=0,lastActive=0,page=0,announcements=[],currentAnnouncement=null,announcementSignature='',channel=null,voiceNeedsGesture=false;
const announcer=createCourtAnnouncer({onStatus:updateVoiceStatus,onComplete:()=>{hideAnnouncement();nextAnnouncement();}});
function updateVoiceStatus(status){
  const {phase,completed,total,reading}=status;
  const failed=phase==='error'||phase==='unavailable';
  const blocked=['not-allowed','not-started'].includes(status.error);
  $('announcement-voice-status').textContent=failed?(phase==='unavailable'?'Voice playback is unavailable in this browser.':blocked?'Your browser blocked audio. Click anywhere on the presentation to start this announcement.':'Voice playback could not finish. Check your audio and click the presentation to retry.'):phase==='complete'?'Announcement read twice.':'Reading '+reading+' of 2'+(phase==='starting'?' · Preparing voice…':' · Calling players…');
  document.querySelector('.announcement-progress').style.transform='scaleX('+(completed/total)+')';
  voiceNeedsGesture=phase==='error';
}
function speakCurrentAnnouncement(){
  if(!currentAnnouncement)return;
  voiceNeedsGesture=false;announcer.play(currentAnnouncement);
}
function retryVoiceAfterGesture(event){
  if(!voiceNeedsGesture||!currentAnnouncement||!event.isTrusted||event.target?.closest?.('#dismiss-announcement'))return;
  if(event.type==='keydown'&&(event.repeat||!['Enter',' '].includes(event.key)))return;
  if(event.type==='pointerup'&&event.button!==0)return;
  speakCurrentAnnouncement();
}
const labels={preparing:'Preparing',live:'Live session',paused:'Session paused',ended:'Session complete'};
const duration=ms=>{const seconds=Math.max(0,Math.floor(ms/1000));return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':');};
const courtMarkings='<svg class="tv-court-markings" viewBox="0 0 440 200" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="220" height="200" fill="#B2CE9E"/><rect x="220" y="0" width="220" height="200" fill="#E1ECD6"/><rect x="150" y="0" width="140" height="200" fill="#B2CE9E"/><rect x="5" y="5" width="430" height="190" rx="1" fill="none" stroke="#FFFFFF" stroke-width="2.5"/><path d="M150 5v190M290 5v190M5 100h145m140 0h145" fill="none" stroke="#FFFFFF" stroke-width="2.5"/><path d="M220 0v200" stroke="#638154" stroke-width="4"/><path d="M220 0v200" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="3 2"/></svg>';
function teamsMarkup(teams,rally=false){return '<div class="tv-court">'+courtMarkings+(teams?teams.map((team,i)=>'<div class="tv-team '+(i?'team-b':'team-a')+'"><span class="team-label">TEAM '+(i?'B':'A')+'</span>'+team.map(name=>'<div class="tv-player">'+esc(name)+'</div>').join('')+'</div>').join(''):'')+(rally?rallyMarkup:'')+'</div>';}
const rallyMarkup='<span class="court-rally" aria-hidden="true"><span class="rally-flight"><span class="rally-shadow"></span><svg class="rally-ball" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#CAFF00" stroke="#E8FF91" stroke-width="1.2"/><path d="M4 11a8 8 0 0 1 8-8" fill="none" stroke="#F5FFD2" stroke-width="2" stroke-linecap="round"/><g fill="#FFFFFF"><ellipse cx="8" cy="7" rx="1.4" ry="1.1"/><ellipse cx="15" cy="6.5" rx="1.2" ry="1"/><circle cx="11.5" cy="12" r="1.5"/><ellipse cx="18" cy="12" rx="1" ry="1.5"/><ellipse cx="6" cy="13" rx="1" ry="1.5"/><ellipse cx="9" cy="18" rx="1.3" ry="1"/><ellipse cx="16" cy="17" rx="1.2" ry="1.1"/></g></svg></span></span>';
function renderCourt(c){
  const ended=view.status==='ended',paused=view.status==='paused'||view.archived;
  const assigned=c.teams&&!ended;
  const label=ended?'Completed':paused&&assigned?'Paused':c.status==='pending'?'Up next':c.status==='playing'?'Playing':c.status==='closed'?'Unavailable':'Available';
  const rally=assigned&&c.status==='playing'&&view.status==='live'&&!paused;
  return '<article class="display-court '+c.status+'" aria-label="'+esc(c.name)+', '+label+'"><header><h2>'+esc(c.name)+'</h2><span class="court-status '+c.status+'">'+label+'</span></header>'+teamsMarkup(assigned?c.teams:null,rally)+'</article>';
}
function renderBoard(){
  if(!view)return;
  $('session-name').textContent=view.name;$('venue').textContent=view.venue;
  $('session-status').textContent=view.archived&&view.status!=='ended'?'Saved session':labels[view.status]||view.status;
  const pages=Math.max(1,Math.ceil(view.courts.length/6));page=Math.min(page,pages-1);
  const courts=view.courts.slice(page*6,page*6+6),columns=courts.length>4?3:courts.length>1?2:1;
  const grid=$('display-courts');grid.style.setProperty('--columns',columns);grid.style.setProperty('--rows',Math.ceil(courts.length/columns));grid.classList.toggle('dense',courts.length>4);
  grid.innerHTML=courts.length?courts.map(renderCourt).join(''):'<div class="display-empty"><h2>No courts configured</h2><p>Courts added by the organizer will appear here.</p></div>';
  $('page-controls').hidden=pages===1;$('page-label').textContent='Courts '+(page*6+1)+'–'+Math.min(page*6+6,view.courts.length)+' of '+view.courts.length;
  tick();
}
function showEmpty(message){
  view=null;signature='';announcements=[];hideAnnouncement();$('session-name').textContent='Court presentation';$('session-status').textContent='Not connected';$('session-clock').textContent='00:00:00';$('venue').textContent='';$('page-controls').hidden=true;
  $('display-courts').innerHTML='<div class="display-empty"><h2>Your courts will appear here.</h2><p>'+esc(message)+'</p></div>';
  $('display-notice').textContent='';$('connection-status').textContent='Waiting for an organizer';
}
function applyView(next){
  if(!next){showEmpty('This session is no longer saved. Open a session in Live Session and choose Present Courts.');return;}
  if(next.id!==sessionId)return;
  const additions=newCourtAssignments(view,next);view=next;
  announcements=announcements.filter(a=>validCourtAnnouncement(a,view));
  if(currentAnnouncement&&!validCourtAnnouncement(currentAnnouncement,view))hideAnnouncement();
  for(const c of additions)if(!announcements.some(a=>a.key===c.key)&&currentAnnouncement?.key!==c.key)announcements.push(c);
  const nextSignature=JSON.stringify({...next,capturedAt:undefined,elapsedMs:undefined});
  if(signature!==nextSignature){signature=nextSignature;renderBoard();}
  if(currentAnnouncement){currentAnnouncement=view.courts.find(c=>c.id===currentAnnouncement.id&&c.key===currentAnnouncement.key);renderAnnouncement();}
  nextAnnouncement();tick();
}
function renderAnnouncement(){
  if(!currentAnnouncement)return;
  const c=currentAnnouncement,key=JSON.stringify(c);if(announcementSignature===key)return;announcementSignature=key;
  $('announcement-content').innerHTML='<p class="announcement-eyebrow">'+(c.status==='playing'?'MATCH STARTED':'YOU’RE UP · NEW MATCH')+'</p><h2>'+esc(c.name)+'</h2>'+teamsMarkup(c.teams)+'<p class="announcement-caption">'+(c.status==='playing'?'Your match is now in play.':'Players, please head to '+esc(c.name)+'.')+'</p>';
}
function nextAnnouncement(){
  if(currentAnnouncement||!view||Date.now()-lastHeard>8500)return;
  while(announcements.length){const next=announcements.shift();if(!validCourtAnnouncement(next,view))continue;currentAnnouncement=next;break;}
  if(!currentAnnouncement)return;
  const courtPage=Math.floor(view.courts.findIndex(c=>c.id===currentAnnouncement.id)/6);if(page!==courtPage){page=courtPage;renderBoard();}
  renderAnnouncement();$('announcement-layer').hidden=false;
  document.querySelector('.announcement-progress').style.transform='scaleX(0)';
  speakCurrentAnnouncement();
}
function hideAnnouncement(){announcer.cancel();voiceNeedsGesture=false;currentAnnouncement=null;announcementSignature='';$('announcement-layer').hidden=true;}
function replayAnnouncement(courtId,key){
  const court=view?.courts.find(c=>c.id===courtId&&c.key===key);
  if(!court?.key||!validCourtAnnouncement(court,view))return;
  announcements=announcements.filter(c=>c.key!==key);
  if(currentAnnouncement?.key===key)hideAnnouncement();
  announcements.unshift(court);nextAnnouncement();
}
function tick(){
  if(!view)return;
  const connected=lastHeard&&Date.now()-lastHeard<8500,active=connected&&view.organizerActive!==false;
  document.body.classList.toggle('rally-paused',!active||view.status!=='live'||view.archived);
  $('connection-status').textContent=active?'Live updates · Organizer connected':connected?'Organizer is viewing another session':'Organizer disconnected · Showing last saved courts';
  $('connection-status').classList.toggle('offline',!active);
  $('display-notice').textContent=view.status==='ended'?'This open play is complete. No new matches will be called.':view.archived?'This is a saved session. Return to it on the organizer screen to continue live updates.':!connected?'Keep the organizer tab open in this browser. Live updates reconnect automatically.':view.organizerActive===false?'Open this session on the organizer screen to continue.':view.status==='paused'?'Play is paused. Court assignments are saved until the organizer resumes.':'';
  $('display-notice').hidden=!!connected&&!view.archived&&view.organizerActive!==false;
  const advance=view.status==='live'&&!view.archived&&view.organizerActive!==false;
  const clockNow=Math.min(Date.now(),(lastHeard||view.capturedAt)+8500);
  $('session-clock').textContent=duration(view.elapsedMs+(advance?Math.max(0,clockNow-view.capturedAt):0));
  const matchNow=view.archived?view.frozenAt:view.status==='paused'?view.pausedAt:clockNow;
  document.querySelectorAll('[data-start]').forEach(el=>el.textContent=duration(matchNow-Number(el.dataset.start)));
  if(!connected){announcements=[];hideAnnouncement();}
}
function readStored(){
  try{const raw=localStorage.getItem(WORKSPACE_KEY);if(raw===rawStored)return;rawStored=raw;if(!raw)return showEmpty('Open Live Session and choose Present Courts.');applyView(courtDisplayView(JSON.parse(raw),sessionId));}catch{if(!view)showEmpty('Open this display from Live Session in the same browser as the organizer.');}
}
function watch(){channel?.postMessage({type:'watch-courts',sessionId});}
if(!sessionId||sessionId.length>150){showEmpty('Open Live Session and choose Present Courts to display the selected session.');}
else{
  readStored();
  if(typeof BroadcastChannel!=='undefined'){
    channel=new BroadcastChannel(COURT_CHANNEL);
    channel.addEventListener('message',e=>{const packet=e.data;if(!['courts','announce-court'].includes(packet?.type)||packet.sessionId!==sessionId)return;if(packet.view?.organizerActive===false&&Date.now()-lastActive<5000)return;lastHeard=Date.now();if(packet.view?.organizerActive)lastActive=lastHeard;applyView(packet.view);if(packet.type==='announce-court')replayAnnouncement(packet.courtId,packet.key);});watch();
  }
  window.addEventListener('storage',e=>{if(e.key===WORKSPACE_KEY)readStored();});
  setInterval(()=>{readStored();watch();tick();},2000);
  setInterval(tick,1000);
  setInterval(()=>{if(view&&view.courts.length>6&&!currentAnnouncement){page=(page+1)%Math.ceil(view.courts.length/6);renderBoard();}},14000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){readStored();watch();tick();}});
}
$('previous-page').addEventListener('click',()=>{if(view){page=(page+Math.ceil(view.courts.length/6)-1)%Math.ceil(view.courts.length/6);renderBoard();}});
$('next-page').addEventListener('click',()=>{if(view){page=(page+1)%Math.ceil(view.courts.length/6);renderBoard();}});
$('dismiss-announcement').addEventListener('click',()=>{hideAnnouncement();nextAnnouncement();});
document.addEventListener('pointerup',retryVoiceAfterGesture,{passive:true});
document.addEventListener('keydown',retryVoiceAfterGesture);
window.addEventListener('pagehide',()=>announcer.cancel());
const fullscreen=$('fullscreen');
function syncFullscreenButton(){fullscreen.hidden=!document.fullscreenEnabled||!!document.fullscreenElement;}
syncFullscreenButton();
fullscreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{fullscreen.title='Use your browser’s full-screen option';}});
document.addEventListener('fullscreenchange',syncFullscreenButton);
let controlsTimer;function showControls(){document.body.classList.add('controls-visible');clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>document.body.classList.remove('controls-visible'),2500);}
document.addEventListener('pointermove',showControls,{passive:true});document.addEventListener('keydown',showControls);
