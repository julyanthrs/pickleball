import { COURT_CHANNEL,WORKSPACE_KEY,courtDisplayView,newCourtAssignments,validCourtAnnouncement } from './court-display-model.js';

const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sessionId=new URLSearchParams(location.hash.slice(1)).get('session');
let view=null,signature='',rawStored='',lastHeard=0,lastActive=0,page=0,announcements=[],currentAnnouncement=null,announcementTimer,announcementSignature='',channel=null;
const labels={preparing:'Preparing',live:'Live session',paused:'Session paused',ended:'Session complete'};
const duration=ms=>{const seconds=Math.max(0,Math.floor(ms/1000));return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':');};
function teamsMarkup(teams){return '<div class="tv-court">'+teams.map((team,i)=>'<div class="tv-team '+(i?'team-b':'team-a')+'"><span class="team-label">TEAM '+(i?'B':'A')+'</span>'+team.map(name=>'<div class="tv-player">'+esc(name)+'</div>').join('')+'</div>').join('')+'</div>';}
function renderCourt(c){
  const ended=view.status==='ended',paused=view.status==='paused'||view.archived;
  const assigned=c.teams&&!ended;
  const label=ended?'Completed':paused&&assigned?'Paused':c.status==='pending'?'Up next':c.status==='playing'?'Playing':c.status==='closed'?'Unavailable':'Available';
  const last=c.lastResult?.scores?'Last result · '+c.lastResult.scores.join(' – '):c.lastResult?'Last game recorded':'';
  return '<article class="display-court" aria-label="'+esc(c.name)+', '+label+'"><header><h2>'+esc(c.name)+'</h2><span class="court-status '+c.status+'">'+label+'</span></header>'+(assigned?teamsMarkup(c.teams):'<div class="empty-court"><strong>'+(ended?'Thanks for playing.':c.status==='closed'?'Court unavailable':view.status==='preparing'?'Getting ready.':'Ready for the next match.')+'</strong><p>'+(ended?'All completed results are saved.':c.status==='closed'?'This court is outside the rotation.':view.status==='preparing'?'The organizer will start the session soon.':'Your next lineup will appear here.')+'</p></div>')+'<footer><span>'+(c.status==='playing'&&!ended?'<span class="match-time" data-start="'+c.startedAt+'">00:00:00</span>':c.status==='pending'&&!ended?'Four players called':esc(last))+'</span><span>'+(ended?'Session complete':'Play to '+c.target)+'</span></footer></article>';
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
  const progress=document.querySelector('.announcement-progress');progress.replaceWith(progress.cloneNode());
  announcementTimer=setTimeout(()=>{hideAnnouncement();nextAnnouncement();},7000);
}
function hideAnnouncement(){clearTimeout(announcementTimer);currentAnnouncement=null;announcementSignature='';$('announcement-layer').hidden=true;}
function tick(){
  if(!view)return;
  const connected=lastHeard&&Date.now()-lastHeard<8500,active=connected&&view.organizerActive!==false;
  $('connection-status').textContent=active?'Live updates · Organizer connected':connected?'Organizer is viewing another session':'Organizer disconnected · Showing last saved courts';
  $('connection-status').classList.toggle('offline',!active);
  $('display-notice').textContent=view.status==='ended'?'This open play is complete. No new matches will be called.':view.archived?'This is a saved session. Return to it on the organizer screen to continue live updates.':!connected?'Keep the organizer tab open in this browser. Live updates reconnect automatically.':view.organizerActive===false?'Open this session on the organizer screen to continue.':view.status==='paused'?'Play is paused. Court assignments are saved until the organizer resumes.':'';
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
    channel.addEventListener('message',e=>{const packet=e.data;if(packet?.type!=='courts'||packet.sessionId!==sessionId)return;if(packet.view?.organizerActive===false&&Date.now()-lastActive<5000)return;lastHeard=Date.now();if(packet.view?.organizerActive)lastActive=lastHeard;applyView(packet.view);});watch();
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
const fullscreen=$('fullscreen');fullscreen.hidden=!document.fullscreenEnabled;
fullscreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{fullscreen.title='Use your browser’s full-screen option';}});
document.addEventListener('fullscreenchange',()=>fullscreen.setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Enter full screen'));
let controlsTimer;function showControls(){document.body.classList.add('controls-visible');clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>document.body.classList.remove('controls-visible'),2500);}
document.addEventListener('pointermove',showControls,{passive:true});document.addEventListener('keydown',showControls);
