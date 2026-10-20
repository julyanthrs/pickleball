import {welcomeScene} from './welcome-scene.js';
import { STATES, stats, playerState, queue, suggest, reserve, startMatch, completeMatch, validateLineup, assertState, scoreError, demoState, cancelPartnerLock } from './engine.js';
import { elapsedSession, createSession, startSession, finishSession, removeCourt, snapshotSession, openSavedSession, duplicateSession, deleteSavedSession, archiveCurrentSession, normalizeSavedSessions } from './sessions.js';
import { defaultSetup, createConfiguredSession, exportSessionFile, importSessionRecord, settingsImpact, sessionIdentity } from './entry.js';
import { emptyState, sessionFlow, suggestAvailableCourts, suggestAfterResult } from './flow.js';
import { installSelectMenus } from './selects.js';
import { createSessionCloud, sessionPayload } from './cloud.js';
import { toString as qrSvg } from './qr.js';
import { createCourtDisplayHost } from './court-display-host.js';
import {applyRosterImport,mergeManualSetupRoster} from './reclub-import.js';
import {createRosterImporter} from './roster-import-ui.js';

const icons = {
  announce:'<path d="M3 10v4h4l11 5V5L7 10H3Zm4 4 2 7h3l-2-6m11-6v6"/>',
  screen:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart:'<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
  court:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M12 4v16M3 12h18M7 4v16m10-16v16"/>',
  back:'<path d="M19 12H5m5-5-5 5 5 5"/>',
  settings:'<path d="m12 3 2 2 3-.1.9 3 2.1 2.1-1.5 2.8.2 3-3 1.2-2.7 1.8-2.7-1.8-3-1.2.2-3L6 10l2.1-2.1.9-3 3 .1Z"/><circle cx="12" cy="11" r="3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  pause:'<path d="M8 5v14m8-14v14" stroke-width="3"/>',
  play:'<path d="m8 5 11 7-11 7Z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  leaf:'<path d="M5 19C-1 9 8 3 21 3c0 13-5 21-16 16Zm0 0L16 8"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 11 3 3 5-6"/>',
  pin:'<path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  trophy:'<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm4 11v6m-4 1h8M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4"/>',
  edit:'<path d="m15 4 5 5M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16Z"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 16v5h16v-5"/>',
  undo:'<path d="M4 5v6h6M4 11a8 8 0 1 1 1 8"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  unlock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 7.5-2M12 14v3"/>',
  copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  qr:'<path d="M3 3h6v6H3ZM15 3h6v6h-6ZM3 15h6v6H3ZM15 15h3v3h-3Zm6 0v3m-6 3h6"/>',
  coffee:'<path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Zm13 1h2a3 3 0 0 1 0 6h-2M7 3v3m5-3v3"/>',
  exit:'<path d="M9 4H4v16h5m4-8h9m-4-4 4 4-4 4"/>',
  filter:'<path d="M4 6h16M7 12h10m-6 6h2M8 3v6m8 0v6"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.grid}</svg>`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = name => name.trim().split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase();
const KEY = 'pickleball-studio-v1';
let entryReturn=null;
let welcomeMotionPaused=false;
let state, sessionSelected=false, selectedSessionId=null, entryView='welcome', setup=null, page = 'live', manageOpen=false, manageTab='general', courtFilter = 'all', playerFilter = 'all', playerSearch = '', queueSearch = '', lastUndo = null, dialogContext = {}, persistence = true, toastTimer, nextRestAt=0, lineupNotice = '';
try { const stored = JSON.parse(localStorage.getItem(KEY)); if (stored && ('session' in stored) && stored.players && stored.courts && stored.history) { assertState(stored); state = stored; if(normalizeSavedSessions(state)){state.revision++;localStorage.setItem(KEY,JSON.stringify(state));} } } catch { persistence = false; }
if (!state) { state = emptyState(); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { persistence = false; } }
const app = document.querySelector('#app'), modal = document.querySelector('#modal');
let cloud=null, inviteSvg='';
const courtDisplay=createCourtDisplayHost(()=>state,()=>sessionSelected);
const player = id => state.players.find(p => p.id === id);
const court = id => state.courts.find(c => c.id === id);
const name = id => player(id)?.name || 'Former player';
const lockMark = p => p?.lock ? '<span class="partner-lock-indicator" role="img" aria-label="Locked with '+esc(name(p.lock))+'" title="Locked with '+esc(name(p.lock))+'">'+icon('lock')+'</span>' : '';
const modeLabel = () => ({fair:'Fair rotation', balanced:'Balanced skill', social:'Social mixer'}[state.settings.mode]);
const avatar = (p, size = '') => `<span class="avatar tone${state.players.indexOf(p)%4} ${size}" aria-hidden="true">${esc(initials(p.name))}</span>`;
const badge = (status, label) => `<span class="badge ${status}"><span class="dot"></span>${esc(label || STATES[status] || status)}</span>`;
const btn = (action, text, glyph, cls = '', extra = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${glyph ? icon(glyph) : ''}${text}</button>`;
const rosterImporter=createRosterImporter({modal,openDialog,esc,getPlayers:target=>target==='setup'?setup.players:state.players,invite:()=>invitePlayers(),save:(target,records,options)=>{
  let result;
  if(target==='setup'){
    result=applyRosterImport(setup.players,records,options);setup.players=result.players;
    setup.rosterText=setup.players.filter(p=>!p.rosterSources?.length).map(p=>csvCell(p.name)+','+p.rating).join('\n');modal.close();render();
  }else{
    if(state.session?.status==='ended')throw new Error('This session is completed. Create or open an unfinished session to import players.');
    if(!commit('Imported authorized player roster',()=>{result=applyRosterImport(state.players,records,options);state.players=result.players;}))return;
    modal.close();render();
  }
  notify(result.added+(result.added===1?' player added. ':' players added. ')+result.linked+' linked. '+result.skipped+' existing players skipped.'+(options.checkIn?'':' New players are Not Checked In.'));
}});
const ibtn = (action, title, glyph, cls = '', extra = '') => `<button type="button" class="icon-btn ${cls}" aria-label="${esc(title)}" title="${esc(title)}" data-action="${action}" ${extra}>${icon(glyph)}</button>`;
const minWait = p => Math.max(0, Math.floor((Date.now() - p.waitSince) / 60000));
const date = timestamp => new Intl.DateTimeFormat('en-PH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Manila'}).format(new Date(timestamp));
const duration = timestamp => { const sec = Math.max(0,Math.floor((Date.now() - timestamp)/1000)); return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`; };
function sessionElapsed() { const sec=Math.floor(elapsedSession(state)/1000);return [Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(n=>String(n).padStart(2,'0')).join(':'); }

function notify(text) {
  const toast=document.querySelector('#toast');toast.innerHTML='<span>'+esc(text)+'</span>'+(lastUndo?'<button type="button" data-action="undo">Undo</button>':'');toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),6500);
}

function commit(label, fn) {
  if(cloud&&!cloud.canEdit()){notify('Connecting to the shared session. Please try your action again in a moment.');return false;}
  const before = structuredClone(state);
  const beforeNotice = lineupNotice;
  try {
    let latest = null;
    try { latest = JSON.parse(localStorage.getItem(KEY)); } catch { persistence = false; }
    if (latest && latest.revision !== state.revision) { lastUndo=null;lineupNotice='';state = latest;if(sessionSelected&&sessionIdentity(state.session)!==selectedSessionId){sessionSelected=false;selectedSessionId=null;entryView='load';} modal.close(); render(); notify('Another tab updated this session. The latest version is now loaded; please retry your action.'); return false; }
    lineupNotice=''; fn(); normalizeSavedSessions(state); assertState(state);
    state.revision++;
    state.audit.unshift({ at:Date.now(), label }); state.audit = state.audit.slice(0,100);
    try { localStorage.setItem(KEY,JSON.stringify(state)); persistence = true; } catch { persistence = false; }
    lastUndo = before;
    render();
    cloud?.changed(state);
    return true;
  } catch (e) { state = before; lineupNotice=beforeNotice; const field = modal.open ? modal.querySelector('.form-error') : document.querySelector('#manage-panel .form-error'); if (field) { field.textContent = e.message; field.classList.add('error'); } else notify(e.message); return false; }
}
function render() {
  normalizeSavedSessions(state);
  courtDisplay.publish();
  cloud?.select(sessionSelected?state:null);
  document.body.classList.toggle('entry-mode',!sessionSelected||!state.session);
  if(!sessionSelected||!state.session){app.innerHTML=entryView==='setup'&&setup?setupWizard():entryView==='load'?loadSessionsEntry():welcome();nextRestAt=Infinity;if(!persistence)app.insertAdjacentHTML('beforeend','<div class="save-warning" role="alert">This browser cannot save sessions. Export a session file from Session Settings before leaving your workspace.</div>');return;}

  app.innerHTML = rail()+ '<main class="shell '+(page==='live'&&!manageOpen&&state.session&&state.session.status!=='ended'&&state.players.length?'has-mobile-queue':'')+'">'+topbar()+( !persistence ? '<div class="save-warning">Changes are not saved in this browser. Download a backup from Session Settings → Saved Sessions before closing.</div>':'')+(!state.session ? welcome() : page==='live'?(manageOpen?manageSession():live()):page==='players'?playersPage():resultsPage())+footer()+'</main>'+mobileNav();
  nextRestAt=Math.min(...queue(state).map(p=>(p.lastEnd||0)+state.settings.rest*60000).filter(at=>at>Date.now()),Infinity);
  updateTimers();
}

const navItems = [['live','grid','Live session'],['players','users','Players'],['results','chart','Results'],['invite','qr','Invite Players'],['settings','settings','Session Settings']];
const navActive = id => id==='settings'?manageOpen:!manageOpen&&page===id;
const navAttributes = id => id==='invite'?'data-action="invite-players" aria-haspopup="dialog"':'data-action="nav" data-page="'+id+'"';
function rail() {
  return '<aside class="rail" aria-label="Main navigation"><a class="brand rail-brand" href="#live" aria-label="Pickleball Studio home"><img src="icon.svg" alt="" /><span>Pickleball<br /><strong>Studio</strong></span></a><div class="rail-caption">OPEN PLAY</div><nav class="rail-group">'+navItems.map(([id,i,label])=>'<button class="rail-btn '+(navActive(id)?'active':'')+'" '+navAttributes(id)+' '+(navActive(id)?'aria-current="page"':'')+'>'+icon(i)+'<span class="nav-label">'+label+'</span></button>').join('')+'</nav><div class="rail-bottom"><button class="rail-btn" data-action="help">'+icon('info')+'<span class="nav-label">Help</span></button><div class="rail-note">'+icon('shield')+'<span>Saved in this browser</span></div></div></aside>';
}

function mobileNav() {
  const showQueue=page==='live'&&!manageOpen&&state.session&&state.players.length&&state.session.status!=='ended';
  return '<nav class="mobile-nav '+(showQueue?'has-queue':'')+'" aria-label="Main navigation">'+(showQueue?'<button class="nav-queue" data-action="queue">'+icon('users')+'<span>Player queue · '+queue(state).length+' waiting</span>'+icon('arrow')+'</button>':'')+'<div class="mobile-nav-items">'+navItems.map(([id,i,label])=>'<button '+navAttributes(id)+' class="'+(navActive(id)?'active':'')+'" '+(navActive(id)?'aria-current="page"':'')+'>'+icon(i)+'<span>'+label+'</span></button>').join('')+'</div></nav>';
}
function topbar() {
 const back=!manageOpen&&page!=='live';
 return '<header class="topbar between '+(back?'has-back':'')+'"><div class="topbar-leading">'+(back?btn('back-live','Back to Live Session','back','quiet workspace-back'):'')+'<div class="topbar-identity"><div class="flex"><span class="wordmark">pickleball<span> studio</span></span><span class="crumb">'+(manageOpen?'Session Settings':page==='live'?'Live session':page==='players'?'Players':'Results')+'</span></div>'+(page!=='live'?'<span class="current-session-name" title="'+esc(state.session.name)+'">'+esc(state.session.name)+'</span>':'')+'</div></div><div class="flex topbar-right">'+(state.demo?'<span class="demo-tag">Demo session</span>':'')+btn('entry','Choose session','court','quiet')+'</div></header>';
}

function rememberWorkspace(){
 if(sessionSelected&&state.session)entryReturn={id:sessionIdentity(state.session),page,manageOpen,manageTab};
}
function canReturnToSession(){return !!entryReturn&&entryReturn.id===sessionIdentity(state.session);}
function returnToSession(){
 if(!canReturnToSession())return;
 const previous=entryReturn;entryReturn=null;sessionSelected=true;selectedSessionId=previous.id;
 page=previous.page;manageOpen=previous.manageOpen;manageTab=previous.manageTab;setup=null;
 modal.close();render();window.scrollTo({top:0,behavior:'instant'});
}

function entryBrand() {
 return '<div class="entry-brand"><img src="icon.svg" alt="" /><span>Pickleball <strong>Studio</strong></span></div>';
}
function welcome() {
 const choice=(action,title,glyph,variant='')=>'<button class="surface entry-choice '+variant+'" data-action="'+action+'"><span class="entry-choice-icon">'+icon(glyph)+'</span><span class="entry-choice-title">'+title+'</span><span class="entry-choice-arrow">'+icon('arrow')+'</span></button>';
 return '<main class="entry-shell welcome-entry'+(welcomeMotionPaused?' motion-paused':'')+'">'+welcomeScene+'<header class="between">'+entryBrand()+'<div class="welcome-header-actions">'+(canReturnToSession()?btn('entry-back','Back to session','back','quiet entry-back'):'')+ibtn('toggle-welcome-motion',welcomeMotionPaused?'Resume background animation':'Pause background animation',welcomeMotionPaused?'play':'pause','welcome-motion-toggle')+'</div></header><section class="entry-welcome" aria-labelledby="welcome-title"><div class="welcome-copy"><h1 id="welcome-title">Your court.<br><span>Your call.</span></h1></div><div class="entry-choices">'+choice('new-session','Create New Session','plus','entry-choice-primary')+choice('load-sessions','Load Saved Session','court')+choice('entry-reclub','Import from Reclub','upload','entry-choice-reclub')+'</div><button class="text-btn entry-demo" data-action="sample">Explore Demo Session '+icon('arrow')+'</button></section><footer class="entry-footer">'+icon('shield')+'<span>Saved in this browser.</span></footer></main>';
}
function deleteSessionButton(index,name) {
 return btn('delete-session','Delete Session','trash','danger','data-index="'+index+'" aria-label="Delete session '+esc(name)+'"');
}
function loadSessionsEntry() {
 const row=(saved,index,current=false)=>'<article class="entry-saved-row"><div><h3>'+esc(saved.session.name)+'</h3><p>'+date(saved.session.createdAt||saved.session.startedAt)+' · '+saved.players.length+' players · '+saved.history.length+' matches</p><span class="tag">'+(current?'Autosaved · ':'')+(!saved.courts?'Completed':({preparing:'Preparing',live:'Live',paused:'Paused',ended:'Completed'}[saved.session.status]||'Saved'))+(!saved.courts?' · Results only':'')+'</span></div><div class="entry-saved-actions">'+btn(current?'load-current':'open-saved',saved.session.status==='ended'||!saved.courts?'View session':'Load session','arrow','',current?'':'data-index="'+index+'"')+deleteSessionButton(index,saved.session.name)+'</div></article>';
 return '<main class="entry-shell load-entry"><header class="between">'+entryBrand()+btn('entry-back',canReturnToSession()?'Back to session':'Back to welcome','back','quiet entry-back')+'</header><section class="entry-page-heading"><h1>Load Saved Session</h1><p>Continue a session. Your changes update the same saved entry.</p>'+btn('import-session','Import session file','upload','quiet')+'</section><section class="surface entry-saved-list">'+(state.session?row(snapshotSession(state),-1,true):'')+state.archive.map((saved,i)=>row(saved,i)).join('')+(!state.session&&!state.archive.length?'<div class="entry-empty"><h2>No saved sessions yet</h2><p>Create a new session or import a session file to get started.</p>'+btn('new-session','Create New Session','plus','primary')+'</div>':'')+'</section><footer class="entry-footer">'+icon('shield')+'<span>Players, courts, and results stay in the same saved session.</span></footer></main>';
}
function startSetup() {
 rememberWorkspace();setup={...defaultSetup(),returnToSession:sessionSelected};sessionSelected=false;entryView='setup';modal.close();render();window.scrollTo({top:0,behavior:'instant'});
}
function setupWizard() {
 const steps=['Session details','Matchmaking','Players & review'];
 return '<main class="entry-shell setup-entry"><header class="between">'+entryBrand()+btn('setup-exit',setup.returnToSession?'Back to session':'Back to welcome','back','quiet')+'</header><section class="entry-page-heading"><div class="eyebrow">STEP '+setup.step+' OF 3</div><h1>Create New Session</h1><p>'+['Start with the essentials for your open play.','Choose how players rotate into fair teams.','Add your players, then review and start.'][setup.step-1]+'</p></section><ol class="setup-progress" aria-label="Setup progress">'+steps.map((label,i)=>'<li class="'+(i+1===setup.step?'current':i+1<setup.step?'complete':'')+'" '+(i+1===setup.step?'aria-current="step"':'')+'><span>'+(i+1<setup.step?icon('check'):i+1)+'</span><strong>'+label+'</strong></li>').join('')+'</ol><section class="surface setup-panel"><form id="setup-form">'+(setup.step===1?setupDetails():setup.step===2?setupMatchmaking():setupPlayers())+'<div class="form-error" role="alert"></div><div class="setup-actions">'+(setup.step>1?btn('setup-back',setup.step===2?'Back to details':'Back to matchmaking','back','quiet'):'<span></span>')+'<div>'+ (setup.step===3?'<button type="submit" class="btn" name="intent" value="draft">'+icon('download')+'Save Draft</button><button type="submit" class="btn primary setup-start" name="intent" value="start" '+(setup.players.filter(p=>p.status!=='out').length<4?'disabled':'')+'>'+icon('play')+'Start Session</button>':'<button type="submit" class="btn primary">Continue '+icon('arrow')+'</button>')+'</div></div></form></section><footer class="entry-footer">'+icon('clock')+'<span>Your timer starts only when you select Start Session.</span></footer></main>';
}
function setupDetails() {
 return '<h2>Session details</h2><div class="setup-fields"><div class="field"><label for="setup-name">Session name</label><input id="setup-name" name="name" value="'+esc(setup.name)+'" placeholder="e.g. Saturday open play" maxlength="60" required /></div><div class="field"><label for="setup-venue">Venue (optional)</label><input id="setup-venue" name="venue" value="'+esc(setup.venue)+'" maxlength="80" placeholder="e.g. Green Courts" /></div><div class="form-grid"><div class="field"><label for="setup-courts">Number of courts</label><input id="setup-courts" name="courts" type="number" min="1" max="12" value="'+setup.courts+'" required /></div><div class="field"><span class="field-label">Game mode</span><div class="setup-static inset">Doubles · 2 players per team</div></div></div><div class="field"><label for="setup-target">Score target</label><select id="setup-target" name="target">'+[7,11,15,21].map(n=>'<option '+(n===setup.target?'selected':'')+'>'+n+'</option>').join('')+'</select><small>Win by 2. You can also record a quick winner or a casual game.</small></div></div>';
}
function setupMatchmaking() {
 return '<h2>Matchmaking</h2><div class="setup-fields"><div class="field"><label for="setup-mode">Rotation mode</label><select id="setup-mode" name="mode">'+[['fair','Fair rotation'],['balanced','Balanced skill'],['social','Social mixer']].map(([id,label])=>'<option value="'+id+'" '+(setup.mode===id?'selected':'')+'>'+label+'</option>').join('')+'</select><small>Fair: turns first. Balanced: closer team ratings. Social: more partner variety.</small></div><div class="fair-rule inset"><h3>Fairness comes first</h3><p>Fewer games and longer waits take priority. You can prioritize a waiting player during the session. Players never occupy two courts at once.</p></div><details class="advanced-settings"><summary>Advanced matchmaking <small>Rest, skill restrictions, repeat encounters, and teammate rules</small></summary><div><div class="field"><label for="setup-rest">Minimum rest between games</label><select id="setup-rest" name="rest">'+[0,2,5,10].map(n=>'<option value="'+n+'" '+(n===setup.rest?'selected':'')+'>'+(n?n+' minutes':'No minimum')+'</option>').join('')+'</select></div><div class="setting-row"><div><h3>Enforce skill gap</h3><p>Only match players inside the allowed rating range.</p></div><label class="switch"><input type="checkbox" name="strictSkill" aria-label="Enforce skill gap" '+(setup.strictSkill?'checked':'')+' /><span></span></label></div><div class="field"><label for="setup-gap">Maximum rating gap</label><select id="setup-gap" name="maxGap">'+[.5,1,1.5,2].map(n=>'<option '+(n===setup.maxGap?'selected':'')+'>'+n+'</option>').join('')+'</select></div><div class="setting-row"><div><h3>Limit repeat encounters</h3><p>Prevent a third meeting as partners or opponents.</p></div><label class="switch"><input type="checkbox" name="avoidRepeats" aria-label="Limit repeat encounters" '+(setup.avoidRepeats?'checked':'')+' /><span></span></label></div><div class="setting-row"><div><h3>Use fixed teammate pairs</h3><p>Choose partner locks in the roster step. Unpaired players rotate normally.</p></div><label class="switch"><input type="checkbox" name="useLocks" aria-label="Use fixed teammate pairs" '+(setup.useLocks?'checked':'')+' /><span></span></label></div><p class="dialog-meta">Strict rules can limit available matches. Sensible defaults keep open play moving.</p></div></details></div>';
}
function setupReview() {
 return '<div class="setup-review-grid">'+[[setup.name,'Session'],[setup.courts+' courts','Courts'],[setup.target+' · Win by 2','Scoring'],[{fair:'Fair rotation',balanced:'Balanced skill',social:'Social mixer'}[setup.mode],'Rotation']].map(([value,label])=>'<div><span>'+label+'</span><strong>'+esc(value)+'</strong></div>').join('')+'</div><p class="setup-review-meta">'+setup.players.length+' registered · '+(setup.rest?setup.rest+' min rest':'No minimum rest')+(setup.strictSkill?' · Skill gap ≤ '+setup.maxGap:'')+(setup.avoidRepeats?' · Repeat limits':'')+'</p>';
}
function setupRosterPreview() {
 const checked=setup.players.filter(p=>p.status!=='out').length,locks=setup.players.filter(p=>p.lock&&p.id<p.lock),free=setup.players.filter(p=>!p.lock);
 return '<div class="roster-preview-head"><strong>'+setup.players.length+' players registered</strong><small>'+(checked<4?'Save a draft, then check in '+(4-checked)+' more players in Players to start.':'Ready to start a doubles session.')+'</small></div><div class="roster-preview-list">'+setup.players.slice(0,8).map(p=>'<div><span>'+esc(p.name)+'</span><small>'+p.rating.toFixed(1)+(p.status==='out'?' · Not Checked In':'')+'</small></div>').join('')+'</div>'+(setup.players.length>8?'<details class="roster-more"><summary>View all '+setup.players.length+' players</summary><div>'+setup.players.slice(8).map(p=>'<div class="roster-extra">'+esc(p.name)+'<small>'+p.rating.toFixed(1)+(p.status==='out'?' · Not Checked In':'')+'</small></div>').join('')+'</div></details>':'')+(setup.useLocks?'<div class="setup-partners"><h3>Fixed teammate pairs</h3>'+locks.map(p=>'<div class="setup-lock"><span>'+esc(p.name)+' &amp; '+esc(setup.players.find(other=>other.id===p.lock)?.name)+'</span>'+ibtn('setup-unpair','Remove pairing for '+p.name,'close','tiny','data-id="'+p.id+'"')+'</div>').join('')+(free.length>=2?'<div class="form-grid"><div class="field"><label for="setup-pair-a">Player</label><select id="setup-pair-a">'+free.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('')+'</select></div><div class="field"><label for="setup-pair-b">Teammate</label><select id="setup-pair-b">'+free.map((p,i)=>'<option value="'+p.id+'" '+(i===1?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></div></div>'+btn('setup-pair','Lock teammates','lock','quiet'):'<p class="dialog-meta">Add two unpaired players to create a partner lock.</p>')+'</div>':'');
}
function setupPlayers() {
 return '<h2>Players & final review</h2><div class="setup-review" id="setup-review">'+setupReview()+'</div><div class="setup-roster-grid"><div><div class="field"><label for="setup-roster">Manual player roster</label><textarea id="setup-roster" name="roster" rows="6" placeholder="One player per line, optional rating.\nAlex Mercado,3.5\nBea Santos,3.0">'+esc(setup.rosterText)+'</textarea><small>One manual player per line; these players are checked in. Ratings default to 3.0. Imported players appear in the review alongside this field; edit their names during import or later in Players.</small></div><div class="setup-roster-tools">'+btn('setup-import','Import CSV','upload','quiet')+btn('setup-reclub','Import from Reclub','upload','reclub-accent')+(state.players.length?btn('setup-reuse','Use previous roster','users','quiet'):'')+'</div></div><div id="roster-preview">'+setupRosterPreview()+'</div></div>';
}
function syncSetupRoster(text) {
 setup.players=mergeManualSetupRoster(setup.players,parseRoster(text));setup.rosterText=text;
}

function captureSetup(validate=true) {
 const form=document.querySelector('#setup-form');if(!form)return;
 const fd=new FormData(form);
 if(setup.step===1){Object.assign(setup,{name:String(fd.get('name')).trim(),venue:String(fd.get('venue')).trim(),courts:Number(fd.get('courts')),target:Number(fd.get('target'))});if(validate&&!setup.name)throw new Error('Give your session a name.');}
 if(setup.step===2)Object.assign(setup,{mode:fd.get('mode'),rest:Number(fd.get('rest')),maxGap:Number(fd.get('maxGap')),strictSkill:fd.has('strictSkill'),avoidRepeats:fd.has('avoidRepeats'),useLocks:fd.has('useLocks')});
 if(setup.step===3){setup.rosterText=String(fd.get('roster'));if(validate)syncSetupRoster(setup.rosterText);else{try{syncSetupRoster(setup.rosterText);}catch{}}}
}
function openWorkspace() {
 entryReturn=null;
 sessionSelected=true;selectedSessionId=sessionIdentity(state.session);setup=null;entryView='welcome';page='live';manageOpen=false;courtFilter='all';playerSearch='';playerFilter='all';queueSearch='';modal.close();render();window.scrollTo({top:0,behavior:'instant'});
}
function applyPreferenceChange(change) {
 if(change.kind==='general'){state.session.name=change.name;state.session.venue=change.venue;}
 Object.assign(state.settings,change.settings);
}
function requestPreferenceChange(change) {
 const impact=settingsImpact(state,change.settings);
 if(impact){dialogContext={preferenceChange:change};openDialog('Review settings change','<p class="dialog-intro">'+esc(impact)+'</p><div class="dialog-actions">'+btn('close','Keep current')+btn('confirm-preferences','Apply changes','check','primary')+'</div>');return;}
 if(commit('Updated session preferences',()=>applyPreferenceChange(change))){render();notify('Session preferences saved.');}
}



function footer() { return `<footer class="page-footer"><span class="flex">${icon('leaf')} A little less organizing. A lot more playing.</span><span class="footer-right">${state.demo?'Sample data · ':''}Saved in this browser · ${state.audit.length?'Last saved '+new Intl.DateTimeFormat('en-PH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Manila'}).format(new Date(state.audit[0].at)):'Ready to play'}</span></footer>`; }
function sessionHeader() {
 const status={preparing:'Preparing',live:'Live',paused:'Paused',ended:'Completed'}[state.session.status];
 return '<section class="session-head"><div class="grow"><div class="session-title"><h1>'+esc(state.session.name)+'</h1>'+badge(state.session.status==='live'?'playing':state.session.status==='ended'?'finished':'break',status)+'</div><div class="session-sub">'+(state.session.venue?'<span>'+esc(state.session.venue)+'</span><span>·</span>':'')+'<span>'+state.courts.length+' courts</span><span>·</span><span class="flex">'+icon('clock')+'<span data-session-clock>'+sessionElapsed()+'</span></span>'+(state.session.portal?'<span>·</span><span class="portal-sync-state" data-portal-connection>Live sync</span>':'')+'</div></div><div class="session-actions"><a class="btn present-courts-action" href="courts.html#session='+encodeURIComponent(sessionIdentity(state.session))+'" target="_blank" rel="noopener noreferrer" aria-label="Present Courts (opens a new tab)">'+icon('screen')+'Present Courts</a>'+(state.session.status==='live'||state.session.status==='paused'?btn('add-player','Add player','plus','live-player-action')+btn('add-court','Add court','plus','live-court-action','data-source="live" '+(state.courts.length>=12?'disabled title="Sessions support up to 12 courts."':'')):'')+'</div></section>';
}
function completedSession() {
 const courts=state.session.endedCourts||state.courts;
 return sessionHeader()+'<section class="surface completion-card"><span class="completion-symbol">'+icon('check')+'</span><div class="eyebrow">OPEN PLAY COMPLETE</div><h2>That’s a wrap.</h2><p>Your results and player statistics are saved.</p><div class="completion-stats">'+[[state.history.length,'Matches'],[state.players.length,'Players'],[sessionElapsed(),'Session time']].map(([n,l])=>'<div><strong>'+n+'</strong><span>'+l+'</span></div>').join('')+'</div><div class="completion-actions">'+btn('nav','View Results','chart','primary','data-page="results"')+btn('new-session','Create New Session','plus')+'</div></section><details class="surface completed-details"><summary>Session court details <small>'+courts.length+' courts · Completed matches and final lineups</small></summary><div class="completed-courts">'+courts.map(c=>'<div class="completed-court"><h3>'+esc(c.name)+'</h3><p>'+state.history.filter(m=>m.court===c.name).length+' recorded matches'+(c.status==='closed'?' · Unavailable at completion':'')+'</p>'+(c.teams?'<p>Unfinished lineup · No result recorded</p><div>'+c.teams.map(t=>t.map(id=>esc(name(id))).join(' &amp; ')).join('<br />')+'</div>':'')+'</div>').join('')+'</div></details>';
}
function live() {
 if(state.session.status==='ended')return completedSession();
 const playing=state.courts.filter(c=>c.status==='playing').length*4,pending=state.courts.filter(c=>c.status==='pending').length*4,waiting=queue(state).length,present=state.players.filter(p=>p.status!=='out').length;
 const flow=sessionFlow(state),preparing=state.session.status==='preparing';
 const action=flow.action==='rotation'?'manage':flow.action==='add-court'?'manage':flow.action;
 const actionTab=flow.action==='rotation'?'matchmaking':flow.action==='add-court'?'courts':'general';
 const banner=(flow.action||preparing)&&flow.action!=='start-ready'?'<section class="surface action-strip" aria-label="Next step"><div class="grow"><h2>'+esc(flow.title)+'</h2><p>'+esc(flow.detail)+'</p></div>'+(action&&!(flow.action==='add-players'&&!preparing)?btn(action,action==='manage'?'Manage '+(actionTab==='courts'?'courts':'matchmaking'):flow.label,action==='generate-all'?'refresh':action==='start-ready'||action==='begin-session'?'play':action==='lineup'?'edit':action==='manage'?'settings':'plus','primary',flow.courtId?'data-id="'+flow.courtId+'"':'data-tab="'+actionTab+'"'):'')+'</section>':'';
 return sessionHeader()+banner+(lineupNotice?'<div class="inline-feedback" role="status">'+icon('info')+'<span>'+esc(lineupNotice)+'</span></div>':'')+'<section class="surface participation-summary" aria-label="Player availability">'+[[present,'Checked in'],[playing,'Playing'],[waiting,preparing?'Ready':'Waiting'],[pending,'Up next']].map(([n,l])=>'<div><strong>'+n+'</strong><span>'+l+'</span></div>').join('')+'</section>'+(preparing?'<section class="surface preparation-card"><h2>Prepare your open play</h2><ol><li class="'+(present>=4?'done':'')+'">'+icon(present>=4?'check':'users')+'<span>Check in at least four players <small>'+present+' checked in</small></span></li><li class="'+(state.courts.some(c=>c.status==='available')?'done':'')+'">'+icon('court')+'<span>Confirm your courts <small>'+state.courts.filter(c=>c.status==='available').length+' available</small></span></li><li>'+icon('play')+'<span>Start the session <small>Then generate your first matches</small></span></li></ol><p>Adjust courts and preferences in Session Settings.</p></section>':'')+'<div class="workspace"><div class="workspace-main"><div class="section-head between"><h2>Courts</h2><div class="section-actions"><div class="segmented" aria-label="Court filter">'+[['all','All courts'],['playing','Playing']].map(([id,l])=>'<button data-action="court-filter" data-filter="'+id+'" class="'+(courtFilter===id?'active':'')+'" aria-pressed="'+(courtFilter===id)+'">'+l+'</button>').join('')+'</div>'+btn('queue','Player queue · '+waiting,'users','mobile-queue')+'</div></div><div class="court-grid">'+(state.courts.filter(c=>courtFilter==='all'||c.status===courtFilter).map(courtCard).join('')||'<div class="surface empty-state"><h3>No matches are playing</h3>'+btn('court-filter','Show all courts','court','quiet','data-filter="all"')+'</div>')+'</div><div class="court-add-action">'+btn('add-court','Add court','plus','','data-source="live" '+(state.courts.length>=12?'disabled title="Sessions support up to 12 courts."':''))+(state.courts.length>=12?'<small>12 court limit reached</small>':'')+'</div></div><aside class="surface queue-panel desktop-queue" aria-label="Player queue">'+queueContent()+'</aside></div>';
}

const courtMarkings = '<svg class="court-markings" viewBox="0 0 440 200" preserveAspectRatio="none" aria-hidden="true"><rect class="court-kitchen" x="150" y="4" width="140" height="192"/><rect class="court-boundary" x="4" y="4" width="432" height="192" rx="4"/><path class="court-lines" d="M150 4v192M290 4v192M4 100h146m140 0h146"/><path class="court-net-edge" d="M220 0v200"/><path class="court-net-mesh" d="M220 0v200"/></svg>';
function courtCard(c) {
 const problem=c.status==='pending'?validateLineup(state,c,c.teams):null,show=['playing','pending'].includes(c.status);
 const eligible=queue(state).filter(p=>!state.settings.rest||!p.lastEnd||Date.now()-p.lastEnd>=state.settings.rest*60000).length;
 return '<article class="surface court '+c.status+'" aria-label="'+esc(c.name)+', '+(c.status==='playing'?'Playing':c.status==='pending'?'Up next':c.status==='closed'?'Unavailable':'Available')+'"><div class="court-head"><h3>'+esc(c.name)+'</h3>'+badge(c.status,c.status==='closed'?'Unavailable':c.status==='pending'?(problem?'Needs review':'Up next'):c.status==='playing'?'Playing':'Available')+ibtn('court-menu',c.name+' options','more','tiny','data-id="'+c.id+'"')+'</div>'+(show?'<div class="match-surface teams-grid pickle-court">'+courtMarkings+c.teams.map((t,i)=>'<div class="team"><div class="team-label">Team '+(i?'B':'A')+'</div>'+t.map(id=>'<div class="player-line">'+avatar(player(id))+'<span class="player-name">'+esc(name(id))+'</span>'+lockMark(player(id))+'</div>').join('')+'</div>').join('')+'</div><div class="court-meta"><span class="flex">'+(c.status==='playing'?icon('clock')+'<span data-match-clock="'+c.id+'">'+duration(c.startedAt)+'</span>':'Four players reserved')+'</span><span class="tag">Play to '+(c.status==='playing'?(c.target||state.settings.target):state.settings.target)+'</span></div>'+(problem?'<div class="lineup-error">'+esc(problem)+'</div>':'')+'<div class="court-actions">'+btn(c.status==='playing'?'score':problem?'lineup':'start',c.status==='playing'?'Record Result':problem?'Review lineup':'Start match',c.status==='playing'?'check':problem?'edit':'play','primary','data-id="'+c.id+'" '+(state.session.status!=='live'&&c.status==='pending'&&!problem?'disabled':''))+(c.status==='pending'&&!problem?btn('lineup','Edit lineup','edit','quiet','data-id="'+c.id+'"'):'')+(state.session.status==='live'&&!problem?btn('announce-court','Announce','announce','quiet','data-id="'+c.id+'" title="Show these players again on Present Courts"'):'')+'</div>':'<div class="pickle-court court-plan-empty" aria-hidden="true">'+courtMarkings+'</div><div class="court-idle-actions">'+(c.status==='closed'?'<p class="muted">Excluded from rotation</p>':btn('generate','Generate Match','plus','primary','data-id="'+c.id+'" '+(state.session.status!=='live'||eligible<4?'disabled':'')))+'</div>')+'</article>';
}

function queueContent(inModal=false) {
 const pending=state.courts.filter(c=>c.status==='pending'),waiting=queue(state);
 return '<div class="between"><h2>Player queue</h2>'+(inModal?ibtn('close','Close queue','close','tiny'):'<span class="tag">'+waiting.length+' waiting</span>')+'</div><label class="queue-search">'+icon('search')+'<input type="search" id="queue-search" placeholder="Search waiting players" aria-label="Search waiting players" value="'+esc(queueSearch)+'" /></label><div class="queue-section-title"><span>Up Next · '+pending.length*4+'</span></div>'+ (pending.length?pending.map(c=>'<div class="up-next"><strong>'+esc(c.name)+'</strong><div class="up-next-names">'+c.teams.map(t=>'<span>'+t.map(id=>esc(name(id))+(player(id)?.lock?' '+lockMark(player(id)):'')).join(' &amp; ')+'</span>').join('')+'</div></div>').join(''):'<p class="queue-empty compact">No reserved lineups</p>')+'<div class="queue-section-title"><span>Waiting · '+waiting.length+'</span><span>Priority order</span></div><div class="queue-list" id="queue-list">'+queueRows()+'</div>';
}

function queueRows() {
  const ordered=queue(state), list=ordered.filter(p=>p.name.toLowerCase().includes(queueSearch.toLowerCase()));
  return list.map(p=>{const s=stats(state,p.id),resting=p.lastEnd&&Date.now()-p.lastEnd<state.settings.rest*60000;return '<button class="queue-row" data-action="player-detail" data-id="'+p.id+'" aria-label="'+esc(p.name)+', '+s.games+' games, waiting '+minWait(p)+' minutes"><span class="queue-rank">'+(ordered.indexOf(p)+1)+'</span>'+avatar(p)+'<span class="grow"><span class="player-name-with-lock"><span class="queue-name">'+esc(p.name)+'</span>'+lockMark(p)+'</span><span class="queue-details">'+s.games+' game'+(s.games===1?'':'s')+(p.lock?' · Partner locked':'')+(p.priority?' · Priority override':'')+'</span></span><span class="queue-wait"><span data-wait="'+p.id+'">'+minWait(p)+'m</span><small>'+ (resting?'Resting':'Waiting')+'</small></span></button>';}).join('')||'<div class="queue-empty">'+(queueSearch?'No waiting players match your search.':(state.players.some(p=>['playing','pending'].includes(playerState(state,p.id)))?'Everyone available is currently assigned.':'No available players. Check participants in or return them from a break.'))+'</div>';
}

function playersPage() {
  return '<div class="between page-head player-page-head"><div><h1>Players</h1><p>'+ (state.session.status==='ended'?'Review the roster and player profiles from this completed session.':'Manage participants, availability, and fixed teammate pairs.')+'</p></div><div class="player-page-actions">'+(state.session.status==='ended'?'':btn('add-player','Add player','plus','primary'))+'</div></div><div class="toolbar players-toolbar"><div class="player-search-controls"><div class="search-field">'+icon('search')+'<input type="search" id="player-search" aria-label="Search players" placeholder="Search players" value="'+esc(playerSearch)+'" /></div><select class="select-filter" id="player-filter" aria-label="Filter player availability">'+[['all','All players'],...Object.entries(STATES)].map(([id,label])=>'<option value="'+id+'" '+(id===playerFilter?'selected':'')+'>'+label+'</option>').join('')+'</select></div><div class="toolbar-actions player-roster-tools">'+btn('player-locks','Lock players','lock','lock-accent')+(state.session.status==='ended'?'':btn('add-players','Add multiple players','users')+btn('import-reclub','Import Players','upload','reclub-accent')+btn('all-present','Check in all','check'))+'</div></div><section class="surface player-join-requests" id="player-join-requests" hidden></section><div class="surface table-surface" id="players-table">'+playersTable()+'</div>';
}

function playersTable() {
  const ps = state.players.filter(p=>p.name.toLowerCase().includes(playerSearch.toLowerCase())&&(playerFilter==='all'||playerState(state,p.id)===playerFilter));
  if (!ps.length) return '<div class="empty-state">'+icon('users')+'<h3>'+(state.players.length?'No matching players':'No players yet')+'</h3><p>'+(state.players.length?'Try another name or availability filter.':'Add your first participant to begin. Doubles needs four checked-in players.')+'</p>'+(state.players.length?btn('clear-player-filter','Clear filters','refresh','quiet'):'')+'</div>';
  return `<table><thead><tr><th>Player</th><th>Availability</th><th class="optional-col">Level</th><th>Games</th><th class="optional-col">Wins / Losses</th><th class="optional-col">Win rate</th><th><span class="hide-mobile">Quick actions</span></th></tr></thead><tbody>${ps.map(p=>{const s=stats(state,p.id), status=playerState(state,p.id);return `<tr><td><div class="flex">${avatar(p)}<div><div class="player-name-with-lock"><button class="text-btn table-name player-profile-link" data-action="player-detail" data-id="${p.id}" aria-label="View ${esc(p.name)} profile">${esc(p.name)}</button>${lockMark(p)}</div><div class="table-caption">${p.lock?`Paired with ${esc(name(p.lock))}`:status==='waiting'?`${minWait(p)} min in queue`:'Level '+p.rating.toFixed(1)}</div></div></div></td><td>${badge(status)}</td><td class="optional-col table-number">${p.rating.toFixed(1)}</td><td class="table-number">${s.games}</td><td class="optional-col">${s.wins} / ${s.losses}</td><td class="optional-col table-number">${s.rate}%</td><td><div class="row-actions">${state.session.status!=='ended'&&!['playing','pending'].includes(status)?btn('player-status',status==='out'?'Check in':status==='break'?'Return to queue':'Take a break',status==='waiting'?'coffee':'check','quiet',`data-id="${p.id}" data-status="${status==='waiting'?'break':'waiting'}"`):''}${btn('edit-player','Edit','edit','quiet',`data-id="${p.id}"`)}</div></td></tr>`;}).join('')}</tbody></table>`;
}
function resultsPage() {
  const games = state.history.length, ps=state.players.filter(p=>p.status!=='out'), counts=ps.map(p=>stats(state,p.id).games), diversity = ps.length ? (ps.reduce((n,p)=>n+stats(state,p.id).partners,0)/ps.length).toFixed(1):'0';
  const leaders=[...state.players].filter(p=>stats(state,p.id).games).sort((a,b)=>stats(state,b.id).wins-stats(state,a.id).wins||stats(state,b.id).rate-stats(state,a.id).rate||a.name.localeCompare(b.name)).slice(0,8);
  return `<div class="between page-head"><div><h1>Results</h1><p>Review completed matches, player performance, and fair playing opportunities.</p></div>${btn('export-results','Export results','download')}</div><section class="results-stats">${[[games,'Matches completed','Recorded this session'],[counts.length?(counts.reduce((a,b)=>a+b,0)/counts.length).toFixed(1):0,'Games per player','Among checked-in players'],[diversity,'Partner variety','Average unique partners']].map(([n,title,caption])=>`<div class="surface result-metric"><div class="eyebrow">${title}</div><h3>${n}</h3><p>${caption}</p></div>`).join('')}</section>
  <div class="results-grid"><section class="surface results-card"><div class="between"><h2>Leaderboard</h2><span class="tag">Session leaderboard</span></div>${leaders.map((p,i)=>{const s=stats(state,p.id);return `<div class="leader-row"><span class="leader-rank">${String(i+1).padStart(2,'0')}</span>${avatar(p)}<div class="grow"><button class="text-btn table-name" data-action="player-detail" data-id="${p.id}">${esc(p.name)}</button><div class="table-caption">${s.wins} win${s.wins===1?'':'s'} · ${s.losses} loss${s.losses===1?'':'es'} · ${s.games} game${s.games===1?'':'s'}</div></div><div class="leader-rate">${s.rate}%<small>Win rate</small></div></div>`;}).join('')||'<div class="empty-state"><h3>No ranked results yet</h3><p>Record a full score or quick winner to build the leaderboard. Casual games count toward participation.</p></div>'}</section>
  <section class="surface results-card"><div class="between"><h2>Match history</h2><span class="tag">${games} recorded</span></div>${state.history.slice(0,8).map(m=>`<div class="history-row"><div class="between history-top"><span>${esc(m.court)} · ${new Intl.DateTimeFormat('en-PH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Manila'}).format(new Date(m.endedAt))}</span><div class="flex history-controls">${m.note?'<span>'+esc(m.note)+'</span>':''}<button class="text-btn" data-action="correct-score" data-id="${m.id}" aria-label="Correct result on ${esc(m.court)}">${icon('edit')}Edit</button></div></div><div class="between"><div class="history-teams">${m.teams.map((t,i)=>`<div ${m.winner===i?'style="font-weight:650"':''}>${t.map(id=>esc(name(id))).join(' & ')} ${m.winner===i?'✓':''}</div>`).join('')}</div><div class="history-score">${m.scores?m.scores.join(' : '):m.winner===null?'—':'W'}</div></div></div>`).join('')||'<div class="empty-state"><h3>No results yet</h3><p>Your session statistics will appear after the first completed match. Record a result from Live session.</p></div>'}${games>8?btn('all-history','View all '+games+' matches','arrow','quiet'):''}</section></div>
  <section class="surface fairness-card"><div class="between"><h2>Fairness · Games per player</h2><span class="tag">Participation</span></div><div class="fairness-layout"><div class="fairness-bars" aria-label="Completed games per checked-in player">${ps.map(p=>{const s=stats(state,p.id);return `<div class="fairness-column" title="${esc(p.name)}: ${s.games} games"><i style="height:${Math.max(7,s.games/Math.max(1,...counts)*58)}px"></i><span>${s.games}</span></div>`;}).join('')}</div><p class="fairness-copy">${games&&counts.length?`Checked-in players have completed between ${Math.min(...counts)} and ${Math.max(...counts)} games. Rotation prioritizes fewer games and longer waits, before balancing skill and partner variety.`:'Complete a few matches to see how playing opportunities are distributed.'} ${state.demo?'These are sample-session records.':''}</p></div></section>`;
}
function manageSession() {
 const tabs=[['general','General'],['matchmaking','Matchmaking'],['courts','Courts'],['saved','Saved Sessions']];
 return '<section class="manage-head between"><div><div class="eyebrow">'+esc(state.session.name)+'</div><h1>Session Settings</h1><p>Session setup, preferences, and saved records.</p></div>'+btn('back-live','Back to Live Session','back','quiet')+'</section><div class="manage-layout"><div class="manage-tabs" role="tablist" aria-label="Session Settings sections">'+tabs.map(([id,label])=>'<button type="button" role="tab" id="manage-tab-'+id+'" aria-selected="'+(manageTab===id)+'" aria-controls="manage-panel" tabindex="'+(manageTab===id?'0':'-1')+'" class="'+(manageTab===id?'active':'')+'" data-action="manage-tab" data-tab="'+id+'">'+label+'</button>').join('')+'</div><section id="manage-panel" role="tabpanel" aria-labelledby="manage-tab-'+manageTab+'">'+(manageTab==='general'?manageGeneral():manageTab==='matchmaking'?manageMatchmaking():manageTab==='courts'?manageCourts():manageSaved())+'</section></div>';
}
function savePreferences(label='Save preferences') {
 return '<div class="form-error" role="alert"></div><div class="manage-form-actions"><button class="btn primary" type="submit">'+icon('check')+label+'</button><span>Saved in this browser</span></div>';
}
function manageGeneral() {
 const status=state.session.status;
 return '<div class="manage-general-grid"><section class="surface manage-card"><h2>Session information</h2><p class="manage-description">The essentials for this open play.</p><form id="general-form"><div class="field"><label for="session-name">Session name</label><input id="session-name" name="sessionName" value="'+esc(state.session.name)+'" maxlength="60" required /></div><div class="field"><label for="venue">Venue (optional)</label><input id="venue" name="venue" value="'+esc(state.session.venue)+'" maxlength="80" /></div><div class="field"><label for="target-score">Score target</label><select id="target-score" name="target">'+[7,11,15,21].map(n=>'<option '+(n===state.settings.target?'selected':'')+'>'+n+'</option>').join('')+'</select><small>Win by 2. Matches already in play keep their original target.</small></div>'+savePreferences()+'</form></section><section class="surface manage-card session-control-card"><h2>Session status</h2><div class="manage-status">'+badge(status==='live'?'playing':status==='ended'?'finished':'break',{live:'Live',preparing:'Preparing',paused:'Paused',ended:'Completed'}[status])+'<span>'+date(state.session.createdAt||state.session.startedAt)+'</span></div><div class="manage-duration inset"><span>Session duration</span><strong data-session-clock>'+sessionElapsed()+'</strong></div><p class="manage-description">'+(status==='preparing'?'The clock starts when you start the session.':status==='ended'?'Results are saved. This session is complete.':status==='paused'?'Match generation is paused. You can still record results.':'Courts and fair rotations are running.')+'</p><div class="menu-options">'+(status==='preparing'?btn('begin-session','Start session','play','primary',queue(state).length<4||!state.courts.some(c=>c.status==='available')?'disabled':''):status!=='ended'?btn('pause',status==='paused'?'Resume session':'Pause session',status==='paused'?'play':'pause',status==='paused'?'primary':'caution'):'')+(status==='ended'?btn('nav','View Results','chart','quiet','data-page="results"'):btn('end-session','End session','exit','danger'))+'</div>'+(lastUndo?'<div class="manage-undo">'+btn('undo','Undo last change','undo','quiet')+'</div>':'')+'</section></div>';
}
function manageMatchmaking() {
 const s=state.settings;
 return '<section class="surface manage-card"><h2>Matchmaking</h2><p class="manage-description">Set how waiting players become fair teams. Existing lineups stay in place and are rechecked before starting.</p><form id="matchmaking-form"><div class="field"><label for="rotation-mode">Rotation mode</label><select id="rotation-mode" name="mode">'+[['fair','Fair rotation'],['balanced','Balanced skill'],['social','Social mixer']].map(([id,label])=>'<option value="'+id+'" '+(s.mode===id?'selected':'')+'>'+label+'</option>').join('')+'</select><small>Fair: turns first. Balanced: closer team ratings. Social: more partner variety.</small></div><div class="fair-rule inset"><h3>Fairness rules</h3><p>Queue priority → fewer completed games → longest wait. A player can occupy only one court at a time.</p></div><details class="advanced-settings"><summary>Advanced rules <small>Rest periods, skill gaps, partner and opponent repeats</small></summary><div><div class="field"><label for="rest-time">Minimum rest between games</label><select id="rest-time" name="rest">'+[0,2,5,10].map(n=>'<option value="'+n+'" '+(n===s.rest?'selected':'')+'>'+(n?n+' minutes':'No minimum')+'</option>').join('')+'</select></div><div class="setting-row"><div><h3>Enforce skill gap</h3><p>Require players to fit the allowed rating range.</p></div><label class="switch"><input type="checkbox" name="strictSkill" aria-label="Enforce skill gap" '+(s.strictSkill?'checked':'')+' /><span></span></label></div><div class="field"><label for="max-gap">Maximum rating gap</label><select id="max-gap" name="maxGap">'+[.5,1,1.5,2].map(n=>'<option '+(n===s.maxGap?'selected':'')+'>'+n+'</option>').join('')+'</select></div><div class="setting-row"><div><h3>Limit repeat encounters</h3><p>Block a third meeting between the same players, as partners or opponents.</p></div><label class="switch"><input type="checkbox" name="avoidRepeats" aria-label="Limit repeat encounters" '+(s.avoidRepeats?'checked':'')+' /><span></span></label></div><p class="dialog-meta">Strict restrictions can prevent a match. In all modes, team selection also favors fewer repeated partners and opponents.</p></div></details>'+savePreferences('Save matchmaking')+'</form></section>';
}
function manageCourts() {
 const ended=state.session.status==='ended';
 return '<section class="surface manage-card"><div class="between"><div><h2>Courts</h2><p class="manage-description">'+state.courts.length+' of 12 courts · Change availability between matches.</p></div>'+(ended?'':btn('add-court','Add court','plus','primary',state.courts.length>=12?'disabled':''))+'</div><div class="managed-courts">'+state.courts.map(c=>'<div class="managed-court"><div><h3>'+esc(c.name)+'</h3>'+badge(c.status,ended?'Completed':c.status==='closed'?'Unavailable':c.status==='pending'?'Up next':c.status==='playing'?'Playing':'Available')+'</div><div class="managed-court-actions">'+(ended?'':btn('rename-court','Rename','edit','quiet','data-id="'+c.id+'"')+(['playing','pending'].includes(c.status)?'<span class="dialog-meta">Finish or release its match to change availability.</span>':btn(c.status==='closed'?'reopen':'close-court',c.status==='closed'?'Make available':'Make unavailable',c.status==='closed'?'play':'pause','quiet','data-id="'+c.id+'"')+btn('remove-court','Remove','close','quiet','data-id="'+c.id+'" '+(state.courts.length===1?'disabled':''))))+'</div></div>').join('')+'</div>'+(ended?'<p class="dialog-meta">Court details are preserved for this completed session. Duplicate it for a fresh setup.</p>':'')+'</section>';
}
function manageSaved() {
 return '<section class="surface manage-card"><div class="between"><div><h2>Saved Sessions</h2><p class="manage-description">One saved entry per session, updated automatically as you play.</p></div>'+btn('new-session','Create session','plus','primary')+'</div><div class="saved-current inset"><div><span class="eyebrow">CURRENT SESSION</span><h3>'+esc(state.session.name)+'</h3><p>'+state.players.length+' players · '+state.history.length+' matches</p></div>'+ '<div class="saved-current-actions">'+btn('export-session','Export session file','download','quiet')+btn('duplicate-session','Duplicate','plus','quiet')+deleteSessionButton(-1,state.session.name)+'</div></div><div class="saved-session-list">'+(state.archive.length?state.archive.map((saved,i)=>'<article class="saved-session"><div><h3>'+esc(saved.session.name)+'</h3><p>'+date(saved.session.createdAt||saved.session.startedAt)+' · '+saved.players.length+' players · '+saved.history.length+' matches</p><span class="tag">'+(!saved.courts?'Results only':saved.session.status==='ended'?'Completed':saved.session.status==='preparing'?'Preparing':'Unfinished')+'</span></div><div class="saved-actions">'+btn('archive-view','View results','chart','quiet','data-index="'+i+'"')+btn('open-saved',saved.courts&&['live','paused'].includes(saved.session.status)?'Restore unfinished':'Open session','arrow','','data-index="'+i+'"')+btn('duplicate-session','Duplicate','plus','quiet','data-index="'+i+'"')+deleteSessionButton(i,saved.session.name)+'</div></article>').join(''):'<div class="saved-empty"><p>No previous sessions yet. Your current session is saved automatically.</p></div>')+'</div></section><details class="surface backup-tools"><summary>Backup & recovery <small>Move saved records to another browser or restore a backup</small></summary><div><p class="manage-description">All records are stored in this browser. An unfinished session returns automatically after a refresh.</p><div class="backup-actions">'+btn('backup','Download backup','download')+btn('restore-backup','Restore a backup','upload')+btn('audit','Activity log','clock','quiet')+'</div></div></details>';
}
function enterManage(tab='general') {
 manageOpen=true;manageTab=tab;page='live';modal.close();render();window.scrollTo({top:0,behavior:'instant'});
}
function updateCloudConnection(status,info) {
 document.querySelectorAll('[data-portal-connection]').forEach(el=>{el.textContent=status==='connected'?'Live sync':status==='syncing'?'Syncing…':status==='connecting'?'Connecting…':'Reconnecting…';el.classList.toggle('offline',status==='offline');});
 if(info)updateInviteLive(info);
}
function receiveSharedSession(info,{mergeOnly=false}={}) {
 if(!sessionSelected||state.session?.portal?.roomId!==info.roomId)return;
 const same=JSON.stringify(sessionPayload(state))===JSON.stringify(sessionPayload(info.state));
 const previousVersion=state.session.portal.version;
 const portal={...state.session.portal,version:info.version};
 let changed=!same;
 if(mergeOnly)changed=info.state.players.some(p=>!state.players.some(q=>q.id===p.id));
 if(changed){
   if(mergeOnly){for(const p of info.state.players)if(!state.players.some(q=>q.id===p.id))state.players.push(structuredClone(p));}
   else for(const key of ['session','players','courts','settings','history'])state[key]=structuredClone(info.state[key]);
   lastUndo=null;
 }
 state.session.portal=portal;
 if(changed||previousVersion!==info.version){state.revision++;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{persistence=false;}}
 if(changed&&!manageOpen){const focused=document.activeElement?.id,selection=document.activeElement?.selectionStart;render();if(focused){const input=document.getElementById(focused);if(input){input.focus({preventScroll:true});if(typeof selection==='number'&&input.setSelectionRange)input.setSelectionRange(selection,selection);}}}
 updateInviteLive(info);updateCloudConnection('connected');
}
function pendingJoinContent(info) {
 return info.pending.length?'<h3>Join requests · '+info.pending.length+'</h3>'+info.pending.map(p=>'<div class="join-request"><strong>'+esc(p.name)+' · '+p.rating.toFixed(1)+'</strong><p>'+(p.status==='duplicate'?'Possible duplicate. Approving reconnects this device to the existing player record.':'This player enters the waiting queue only after approval.')+'</p><div>'+btn('approve-join',p.status==='duplicate'?'Approve reconnect':'Approve','check','','data-identity="'+esc(p.id)+'"')+btn('reject-join','Decline','close','quiet','data-identity="'+esc(p.id)+'"')+'</div></div>').join(''):'<p class="dialog-meta">No pending join requests.</p>';
}
function updateInviteLive(info) {
 const requestKey=JSON.stringify(info.pending);
 const requestsPanel=document.querySelector('#player-join-requests');if(requestsPanel){requestsPanel.hidden=!info.pending.length;if(requestsPanel.dataset.requests!==requestKey){requestsPanel.innerHTML=pendingJoinContent(info);requestsPanel.dataset.requests=requestKey;}}
 if(!modal.open||!modal.querySelector('#invite-link'))return;
 modal.querySelector('#invite-joined').textContent=info.joined;
 modal.querySelector('#invite-pending').textContent=info.pending.length;
 const requests=modal.querySelector('#invite-requests');if(requests.dataset.requests!==requestKey){requests.innerHTML=pendingJoinContent(info);requests.dataset.requests=requestKey;}
 for(const[id,value]of [['invite-approval',info.requireApproval],['invite-open',info.joinsOpen]]){const input=modal.querySelector('#'+id);if(input&&document.activeElement!==input)input.checked=value;}
}
async function invitePlayers() {
 openDialog('Invite players','<p class="dialog-intro">Preparing your secure session link…</p>');
 try{
   const info=await cloud.enable();if(!info)throw new Error('Live sharing could not connect. Try again.');
   if(state.session.portal?.roomId!==info.roomId){
     for(const key of ['session','players','courts','settings','history'])state[key]=structuredClone(info.state[key]);
     if(!commit('Enabled player portal',()=>{state.session.portal={roomId:info.roomId,invite:info.invite,version:info.version,hostToken:info.hostToken};}))return;
   }
   openDialog('Invite players','<div class="invite-qr"><img id="invite-qr-img" alt="Scan to join '+esc(state.session.name)+'" /></div><div class="invite-summary"><span><strong id="invite-joined">'+info.joined+'</strong> joined</span><span><strong id="invite-pending">'+info.pending.length+'</strong> awaiting approval</span></div><div class="field"><label for="invite-link">Session join link</label><input class="invite-link" id="invite-link" readonly value="'+esc(info.joinUrl)+'" /></div><div class="invite-tools">'+btn('copy-invite','Copy Link','copy')+btn('download-qr','Download QR Code','download')+btn('share-invite','Share','upload')+'<a class="btn present-action" href="present.html#join='+encodeURIComponent(info.joinUrl)+'" target="_blank" rel="noopener noreferrer" aria-label="Present session QR (opens a new tab)"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>Present</a></div>'+(cloud.recovery()?'<div class="invite-tools">'+btn('download-shared-recovery','Download local recovery','download','quiet')+'</div>':'')+(['localhost','127.0.0.1'].includes(new URL(info.joinUrl).hostname)?'<p class="invite-security-note">Local preview: this link works on this computer only. For phone joining, use Invite Players in the published Pickleball Studio app.</p>':'')+'<div class="invite-preferences"> <div class="setting-row"><div><h3>Allow joining</h3><p>Close the link when you have enough players.</p></div><label class="switch"><input type="checkbox" id="invite-open" aria-label="Allow joining" '+(info.joinsOpen?'checked':'')+' /><span></span></label></div><div class="setting-row"><div><h3>Approve new players</h3><p>Review requests before players enter the queue.</p></div><label class="switch"><input type="checkbox" id="invite-approval" aria-label="Approve new players" '+(info.requireApproval?'checked':'')+' /><span></span></label></div></div><div id="invite-error" class="invite-error" role="alert"></div><section class="invite-requests" id="invite-requests">'+pendingJoinContent(info)+'</section><p class="invite-security-note">Players see their own session dashboard. Only the organizer can change matches, scores, courts, and settings. No account or app installation is required.</p><div class="dialog-actions">'+btn('close','Done','check','quiet')+'</div>');
   inviteSvg=await qrSvg(info.joinUrl,{type:'svg',errorCorrectionLevel:'M',margin:4,color:{dark:'#365C3B',light:'#FFFFFF'}});
   const image=modal.querySelector('#invite-qr-img');if(image)image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(inviteSvg);
 }catch(e){openDialog('Invite players','<p class="invite-error">'+esc(e.message)+'</p><div class="dialog-actions">'+btn('invite-players','Try again','refresh')+btn('close','Close','close','quiet')+'</div>');}
}
async function copyInviteLink(){const input=modal.querySelector('#invite-link');if(!input)return;try{await navigator.clipboard.writeText(input.value);notify('Session join link copied.');}catch{input.focus();input.select();notify('Select and copy the session link above.');}}
async function saveJoinPreferences(){const approval=modal.querySelector('#invite-approval'),open=modal.querySelector('#invite-open');if(!approval||!open)return;try{await cloud.settings({requireApproval:approval.checked,joinsOpen:open.checked});}catch(e){modal.querySelector('#invite-error').textContent=e.message;}}
async function decideJoin(id,approve,button){button.disabled=true;try{const info=await cloud.decide(id,approve);updateInviteLive(info);notify(approve?'Player approved.':'Join request declined.');}catch(e){const error=modal.querySelector('#invite-error');if(error)error.textContent=e.message;button.disabled=false;}}
function playerLocksDialog() {
 const locks=state.players.filter(p=>p.lock&&p.id<p.lock),completed=state.session.status==='ended';
 const assigned=id=>['playing','pending'].includes(playerState(state,id));
 const available=state.players.filter(p=>!p.lock&&!assigned(p.id));
 const pairs=locks.map(p=>{
   const blocked=assigned(p.id)||assigned(p.lock);
   const extra='data-id="'+p.id+'" '+(blocked?'disabled title="Finish or release their court assignment first."':'');
   return '<div class="partner-lock-row" data-lock-names="'+esc(p.name+' '+name(p.lock))+'"><span>'+esc(p.name)+' &amp; '+esc(name(p.lock))+'</span>'+(completed?'':'<div class="partner-lock-actions">'+btn('lock-player','Change','edit','quiet',extra)+btn('cancel-lock','Cancel lock','unlock','cancel-lock-button',extra)+'</div>')+'</div>';
 }).join('');
 const search='<div class="search-field partner-lock-search">'+icon('search')+'<input type="search" id="partner-lock-search" aria-label="Search players to lock" placeholder="Search players by name" /></div><div class="partner-lock-divider" aria-hidden="true"></div>';
 const empty=pairs?'':'<div class="info-box">No partner locks'+(completed?' were saved for this session.':available.length?' yet. Choose a player below to set a fixed teammate.':' yet.')+'</div>';
 const picker=!completed&&available.length?'<div class="partner-picker" id="lock-player-picker"><div class="field"><label for="partner-player">Player</label><select id="partner-player">'+available.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('')+'</select></div>'+btn('pick-lock-player','Choose partner','lock')+'</div><div class="info-box lock-search-empty" id="lock-player-empty" role="status" hidden>No unpaired players match your search.</div>':!completed?'<div class="info-box">'+(state.players.length?'No unpaired players are available. Cancel a lock or release a court assignment to choose someone.':'Add players to your roster before choosing teammates.')+'</div>':'';
 openDialog('Partner locks',search+pairs+empty+'<div class="info-box lock-search-empty" id="lock-pair-empty" role="status" hidden>No matching partner locks.</div>'+picker+'<div class="dialog-actions">'+btn('close','Done','check','quiet')+'</div>');
}
function filterPartnerLocks(query) {
 const term=query.trim().toLocaleLowerCase();
 const rows=[...modal.querySelectorAll('[data-lock-names]')];
 rows.forEach(row=>{row.hidden=!row.dataset.lockNames.toLocaleLowerCase().includes(term);});
 modal.querySelector('#lock-pair-empty').hidden=!term||!rows.length||rows.some(row=>!row.hidden);
 const select=modal.querySelector('#partner-player');
 if(!select)return;
 const selected=select.value;
 const matches=state.players.filter(p=>!p.lock&&!['playing','pending'].includes(playerState(state,p.id))&&p.name.toLocaleLowerCase().includes(term));
 select.replaceChildren(...matches.map(p=>new Option(p.name,p.id,false,p.id===selected)));
 if(!matches.some(p=>p.id===selected)&&matches.length)select.selectedIndex=0;
 select.dispatchEvent(new Event('change',{bubbles:true}));
 modal.querySelector('#lock-player-picker').hidden=!matches.length;
 modal.querySelector('#lock-player-empty').hidden=!!matches.length;
}
function partnerDialog(id) {
 const current=player(id);
 const candidates=state.players.filter(p=>p.id!==id&&!p.lock&&!['playing','pending'].includes(playerState(state,p.id)));
 const options=(current.lock?'<option value="__keep__" selected>Keep current pairing</option>':'')+'<option value="">No partner lock</option>'+candidates.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('');
 dialogContext={playerId:id};
 openDialog('Partner preference','<p class="dialog-intro">Choose a fixed partner for '+esc(current.name)+'. Only unpaired players are available.</p>'+(current.lock?'<div class="info-box">Current partner: '+esc(name(current.lock))+'</div>':'')+'<form id="lock-form"><div class="field"><label for="partner">Partner</label><select id="partner" name="partner">'+options+'</select></div>'+(current.lock?'<div class="partner-release">'+btn('cancel-lock','Cancel lock','unlock','cancel-lock-button','data-id="'+id+'"')+'</div>':'')+formActions('Save pairing')+'</form>');
}

function updateTimers() { if(sessionSelected&&state.session?.status==='live'&&!manageOpen&&Date.now()>=nextRestAt&&!modal.open&&!document.activeElement?.matches('input,select,textarea')){render();return;}  document.querySelectorAll('[data-session-clock]').forEach(el=>el.textContent=sessionElapsed()); document.querySelectorAll('[data-match-clock]').forEach(el=>{ const c=court(el.dataset.matchClock); if(c) el.textContent=duration(c.startedAt); }); document.querySelectorAll('[data-wait]').forEach(el=>{const p=player(el.dataset.wait);if(p)el.textContent=minWait(p)+'m';}); }
function openDialog(title, content, cls='sheet') { if(modal.open)modal.close();modal.className=cls;modal.innerHTML=`<div class="between dialog-head"><h2 id="dialog-title">${title}</h2>${btn('close','Back','back','quiet dialog-back')}</div>${content}`;modal.showModal(); }
function formActions(label, cancel = true) { return `<div class="form-error" role="alert"></div><div class="dialog-actions">${cancel?btn('close','Cancel'):''}<button type="submit" class="btn primary">${icon('check')}${label}</button></div>`; }
function showPlayer(id) {
  const p=player(id),status=playerState(state,id),s=stats(state,id),assigned=['playing','pending'].includes(status);
  openDialog('Player details',`<div class="player-profile">${avatar(p)}<h3>${esc(p.name)}${lockMark(p)}</h3><p class="dialog-meta">Level ${p.rating.toFixed(1)} · ${STATES[status]}${p.lock?' · Paired with '+esc(name(p.lock)):''}</p></div><div class="profile-stats">${[[s.games,'Games'],[s.wins,'Wins'],[s.rate+'%','Win rate']].map(([n,label])=>`<div class="profile-stat inset"><strong>${n}</strong><small>${label}</small></div>`).join('')}</div><div class="menu-options">${btn('edit-player','Edit player','edit','',`data-id="${id}"`)}${state.session.status==='ended'?'':assigned?'<div class="info-box">This player is assigned to a court. Finish the match or cancel the pending lineup before changing availability or partner locks.</div>':btn('player-status',status==='waiting'?'Take a break':'Return to queue',status==='waiting'?'coffee':'play','',`data-id="${id}" data-status="${status==='waiting'?'break':'waiting'}"`)+btn('player-status',status==='out'?'Check in':'Check out',status==='out'?'check':'exit','',`data-id="${id}" data-status="${status==='out'?'waiting':'out'}"`)+btn('priority','Move to front of queue','arrow','',`data-id="${id}" ${status!=='waiting'?'disabled':''}`)+btn('lock-player',p.lock?'Change partner lock':'Lock a partner','lock','',`data-id="${id}"`)}${btn('player-history','View match history','clock','',`data-id="${id}"`)}</div>`);
}
function playerForm(id) {
  const p=id?player(id):null, status=p?playerState(state,id):'waiting';dialogContext={playerId:id};
  const ratings=[...new Set([1,1.5,2,2.5,3,3.5,4,4.5,5,p?.rating||3])].sort((a,b)=>a-b);
  const readOnly=['playing','pending'].includes(status)||state.session.status==='ended';
  const availability=readOnly?'<div class="read-only-field">'+badge(status)+'</div><small>'+ (state.session.status==='ended'?'Availability is archived for this completed session.':'Finish the match or cancel its pending lineup before changing availability.')+'</small>':'<select id="availability" name="status">'+['waiting','break','out'].map(k=>'<option value="'+k+'" '+(k===status?'selected':'')+'>'+STATES[k]+'</option>').join('')+'</select>';
  openDialog(p?'Edit player':'Add player','<p class="dialog-intro">'+(p?(state.session.status==='ended'?'Update this participant’s name and rating. Session attendance is archived.':'Update this participant’s name, rating, and availability.'):'New players join this session. Choose Waiting to check them in immediately.')+'</p><form id="player-form"><div class="field"><label for="full-name">Player name</label><input id="full-name" name="name" placeholder="e.g. Alex Mercado" maxlength="60" value="'+esc(p?.name||'')+'" required autofocus /></div><div class="form-grid"><div class="field"><label for="skill">Skill rating</label><select id="skill" name="rating">'+ratings.map(n=>'<option '+(n===(p?.rating||3)?'selected':'')+'>'+n.toFixed(1)+'</option>').join('')+'</select><small>1 = beginner · 3 = intermediate · 5 = advanced</small></div><div class="field"><label '+(readOnly?'':'for="availability"')+'>Availability</label>'+availability+'</div></div>'+formActions(p?'Save player':'Add player')+'</form>');
}
function scoreDialog(id, correction=false, type='full') {
  const c=correction?state.history.find(m=>m.id===id):court(id); if(!c)return;
  dialogContext={scoreId:id,correction,scoreType:type,winner:correction?c.winner:null};
  openDialog(correction?'Correct result':'Record result',`<p class="dialog-intro">${esc(correction?c.court:c.name)} · ${correction?'Stats will update when you save the corrected result.':'Record the result and send all four players back to the queue.'}</p><div class="segmented" style="margin-bottom:20px">${[['full','Full score'],['quick','Quick winner'],['casual','Casual game']].map(([v,t])=>`<button data-action="score-tab" data-type="${v}" class="${v===type?'active':''}" aria-pressed="${v===type}">${t}</button>`).join('')}</div><form id="score-form">${type==='full'?`<div class="score-form">${c.teams.map((t,i)=>`${i?'<div class="score-versus">VS</div>':''}<div class="score-team"><h3>Team ${i?'B':'A'}</h3><p>${t.map(id=>esc(name(id))).join('<br />')}</p><label><span class="field-label">Final score</span><input type="number" class="score-input" aria-label="Team ${i?'B':'A'} score" name="score${i}" min="0" max="999" step="1" value="${c.scores?.[i]??''}" placeholder="0" required /></label></div>`).join('')}</div><p class="dialog-meta">Play to ${c.target||state.settings.target} · Win by 2. Use Quick winner for a forfeit or a special finish.</p>`:type==='quick'?`<div class="quick-winners">${c.teams.map((t,i)=>`<button type="button" class="btn ${i===dialogContext.winner?'selected':''}" data-action="select-winner" data-winner="${i}">Team ${i?'B':'A'} wins<small>${t.map(id=>esc(name(id))).join('<br />')}</small></button>`).join('')}</div><p class="dialog-meta">Choose the winning team. A final score is not required.</p>`:'<div class="info-box">Everyone gets credit for a game played. Wins, losses, and win rates stay unchanged.</div>'}<div class="field" style="margin-top:17px"><label for="result-note">Note <span class="muted">(optional)</span></label><input id="result-note" name="note" maxlength="100" placeholder="e.g. Forfeit, time limit" value="${esc(c.note||'')}" /></div>${formActions(correction?'Save correction':'Save result')}</form>`);
}
function lineupDialog(id) { const c=court(id);dialogContext={courtId:id};const eligible=state.players.filter(p=>playerState(state,p.id)==='waiting'||c.teams?.flat().includes(p.id));openDialog('Edit lineup',`<p class="dialog-intro">${esc(c.name)} · Choose four available players. Regenerate suggests a new team pairing in fair queue order. Partner and session rules still apply.</p><form id="lineup-form">${[0,1].map(team=>`<div class="inset lineup-team"><h3>Team ${team?'B':'A'}</h3>${[0,1].map(slot=>`<div class="field"><label for="lineup-${team}-${slot}" class="sr-only">Player ${slot+1}</label><select id="lineup-${team}-${slot}" name="p${team}${slot}" required><option value="">Select a player</option>${eligible.map(p=>`<option value="${p.id}" ${c.teams?.[team]?.[slot]===p.id?'selected':''}>${esc(p.name)} · ${p.rating.toFixed(1)}</option>`).join('')}</select></div>`).join('')}</div>`).join('')}<div class="between" style="margin-top:15px"><button class="text-btn" type="button" data-action="why" data-id="${id}">${icon('info')}Why this matchup?</button>${btn('regenerate','Regenerate match','refresh','quiet',`data-id="${id}" ${state.session.status!=='live'?'disabled':''}`)}</div>${formActions('Save lineup')}</form>`); }
function confirmDialog(title, text, action, id='', label='Confirm') { openDialog(title,`<p class="dialog-intro">${text}</p><div class="dialog-actions">${btn('close','Keep as is')}${btn(action,label,'check','primary',`data-id="${id}"`)}</div>`); }
function newSessionDialog() {startSetup();}

function generated(id,variant=0) {
  const c=court(id);if(state.session.status!=='live'){notify('Resume the session to generate a match.');return;}
  const old=structuredClone(c), canonical=t=>t?.map(team=>[...team].sort().join(',')).sort().join('|');
  if(c.status==='pending'){c.status='available';c.teams=null;}
  let result=suggest(state,c,Date.now(),variant),selectedVariant=variant;
  if(variant&&result.teams&&canonical(result.teams)===canonical(old.teams)){
    for(let attempt=1;attempt<=3;attempt++){
      const next=suggest(state,c,Date.now(),variant+attempt);
      if(next.teams&&canonical(next.teams)!==canonical(old.teams)){result=next;selectedVariant=variant+attempt;break;}
    }
  }
  Object.assign(c,old);
  if(result.error){openDialog('No valid match yet','<div class="info-box">'+esc(result.error)+'</div><div class="dialog-actions">'+btn('rotation','Matchmaking settings','filter','primary')+btn('lineup','Choose players','users','','data-id="'+id+'"')+'</div>');return;}
  if(variant&&canonical(result.teams)===canonical(old.teams)){notify('Only one valid team pairing fits the current rules. You can edit players or change matchmaking settings.');return;}
  if(commit('Generated lineup for '+c.name,()=>{if(c.status==='pending'){c.status='available';c.teams=null;}reserve(state,c,result.teams);c.lineupVariant=selectedVariant;})){
    if(modal.open){lineupDialog(id);notify('Lineup updated on '+c.name+'.');}else notify('Lineup ready on '+c.name+'. Review it, then start the match.');
  }
}
function historyContent(matches) {return matches.length?matches.map(m=>`<div class="history-row"><div class="between"><h3>${esc(m.court)} · ${date(m.endedAt)}</h3><span class="history-score">${m.scores?m.scores.join(' : '):m.winner===null?'—':'W'}</span></div><div class="history-teams">${m.teams.map((t,i)=>`<div>${t.map(id=>esc(name(id))).join(' & ')}${m.winner===i?' ✓':''}</div>`).join('')}</div></div>`).join(''):'<div class="info-box">No completed matches yet. Your first game is waiting.</div>'; }
async function handleAction(e) {
  const target=e.target.closest('[data-action]');if(!target||target.disabled)return;const {action,id}=target.dataset;
  switch(action) {
    case 'entry':rememberWorkspace();sessionSelected=false;selectedSessionId=null;entryView='welcome';setup=null;modal.close();render();window.scrollTo({top:0,behavior:'instant'});break;
    case 'entry-back':if(canReturnToSession())returnToSession();else{entryView='welcome';setup=null;modal.close();render();window.scrollTo({top:0,behavior:'instant'});}break;
    case 'load-sessions':entryView='load';render();break;
    case 'load-current':openWorkspace();break;
    case 'toggle-welcome-motion':{welcomeMotionPaused=!welcomeMotionPaused;document.querySelector('.welcome-entry')?.classList.toggle('motion-paused',welcomeMotionPaused);const label=welcomeMotionPaused?'Resume background animation':'Pause background animation';target.setAttribute('aria-label',label);target.title=label;target.innerHTML=icon(welcomeMotionPaused?'play':'pause');break;}
    case 'entry-reclub':startSetup();rosterImporter.open('setup');break;
    case 'import-session':importFile('session');break;
    case 'confirm-import':if(commit('Imported session file',()=>importSessionRecord(state,dialogContext.incomingSession))){openWorkspace();notify('Session imported. Existing sessions were preserved.');}break;
    case 'export-session':download('pickleball-studio-session.json',JSON.stringify(exportSessionFile(state),null,2),'application/json');notify('Session file exported. Open Load Saved Session → Import session file to use it in another browser.');break;
    case 'setup-exit':{const back=setup.returnToSession;setup=null;entryView='welcome';if(back&&canReturnToSession())returnToSession();else render();break;}
    case 'setup-back':captureSetup(false);setup.step--;render();window.scrollTo({top:0,behavior:'instant'});break;
    case 'setup-import':case 'setup-reclub':captureSetup(false);rosterImporter.open('setup',action==='setup-import'?'file':'link');break;
    case 'setup-reuse':setup.players=structuredClone(state.players);setup.rosterText=state.players.filter(p=>!p.rosterSources?.length).map(p=>csvCell(p.name)+','+p.rating).join('\n');syncSetupRoster(setup.rosterText);render();break;
    case 'setup-pair':{const a=document.querySelector('#setup-pair-a').value,b=document.querySelector('#setup-pair-b').value;if(a===b){notify('Choose two different players.');break;}const p=setup.players.find(p=>p.id===a),q=setup.players.find(p=>p.id===b);p.lock=q.id;q.lock=p.id;document.querySelector('#roster-preview').innerHTML=setupRosterPreview();break;}
    case 'setup-unpair':{const p=setup.players.find(p=>p.id===id),other=setup.players.find(q=>q.id===p.lock);if(other)other.lock=null;p.lock=null;document.querySelector('#roster-preview').innerHTML=setupRosterPreview();break;}
    case 'confirm-court-name':if(commit('Renamed court',()=>{const change=dialogContext.courtNameChange;court(change.id).name=change.name;})){modal.close();render();notify('Court renamed. Saved result labels are unchanged.');}break;
    case 'confirm-preferences':if(commit('Updated session preferences',()=>applyPreferenceChange(dialogContext.preferenceChange))){modal.close();render();notify('Session preferences saved. Existing results are unchanged.');}break;
    case 'sample':if(commit('Opened demo session',()=>{archiveCurrentSession(state);const {revision,audit,archive}=state;state={...demoState(),archive,revision,audit};})){openWorkspace();notify('Demo session opened. Your saved sessions are retained.');}break;
    case 'clear-player-filter': playerSearch='';playerFilter='all';render();break;
    case 'generate-all': { let report; if(commit('Generated matches for available courts',()=>{report=suggestAvailableCourts(state);lineupNotice=report.blocked.length?report.blocked[0].reason:report.generated.length+' matches generated. Review the lineups and start when ready.';}))notify(lineupNotice);break; }
    case 'start-ready': { let count=0;if(commit('Started ready matches',()=>{for(const c of state.courts.filter(c=>c.status==='pending')){startMatch(state,c);count++;}lineupNotice='';}))notify(count+' match'+(count===1?'':'es')+' started. Record each result on its court.');break; }
    case 'manage':enterManage(target.dataset.tab||'general');break;
    case 'manage-tab':manageTab=target.dataset.tab;render();document.querySelector('#manage-tab-'+manageTab).focus();break;
    case 'back-live':manageOpen=false;page='live';modal.close();render();window.scrollTo({top:0,behavior:'instant'});break;
    case 'begin-session':if(commit('Started open play',()=>startSession(state))){manageOpen=false;render();notify('Session started. Generate your first matches.');}break;
    case 'invite-players':invitePlayers();break;
    case 'copy-invite':copyInviteLink();break;
    case 'download-shared-recovery':{const recovery=cloud.recovery();if(recovery)download('pickleball-session-recovery.json',JSON.stringify({format:'pickleball-studio-session',version:1,...recovery.state,revision:0,demo:false,archive:[],audit:[]},null,2),'application/json');break;}
    case 'download-qr':if(inviteSvg)download('pickleball-session-qr.svg',inviteSvg,'image/svg+xml');break;
    case 'share-invite':{const link=modal.querySelector('#invite-link')?.value;if(link){if(navigator.share)navigator.share({title:state.session.name,url:link}).catch(()=>{});else copyInviteLink();}break;}
    case 'approve-join':case 'reject-join':decideJoin(target.dataset.identity,target.dataset.action==='approve-join',target);break;
    case 'player-locks':playerLocksDialog();break;
    case 'cancel-lock':if(commit('Cancelled partner lock',()=>cancelPartnerLock(state,id))){playerLocksDialog();notify('Partner lock cancelled. Both players can rotate independently.');}break;
    case 'pick-lock-player':partnerDialog(document.querySelector('#partner-player').value);break;
    case 'delete-session':{
      const index=Number(target.dataset.index),saved=index===-1?state:state.archive[index];
      if(!saved?.session){notify('This saved session is no longer available.');break;}
      dialogContext={deleteIndex:index};
      openDialog('Delete session?', '<p class="dialog-intro">Delete <strong>'+esc(saved.session.name)+'</strong> and its saved players, courts, and results from this browser? Other saved sessions will stay.</p><p class="dialog-intro">Export the session first if you want to keep a backup. You can undo immediately after deleting.</p>'+(saved.session.portal?.roomId?'<p class="dialog-intro">This removes the browser save only. Its shared player portal and QR link will remain available.</p>':'')+'<div class="dialog-actions">'+btn('close','Cancel')+btn('confirm-delete-session','Delete Session','trash','danger')+'</div>');
      break;
    }
    case 'confirm-delete-session':{
      const index=dialogContext.deleteIndex;
      if(commit('Deleted saved session',()=>deleteSavedSession(state,index))){
        modal.close();
        if(index===-1){sessionSelected=false;selectedSessionId=null;entryView='load';manageOpen=false;render();}
        notify('Session deleted from this browser.');
      }
      break;
    }
    case 'open-saved':dialogContext={savedIndex:Number(target.dataset.index)};confirmDialog('Open saved session?','Your current session will be saved with its courts, players, and results. An unfinished session opens paused so you can review it before resuming.','confirm-open','','Open session');break;
    case 'confirm-open':if(commit('Opened saved session',()=>openSavedSession(state,dialogContext.savedIndex))){openWorkspace();notify(state.session.status==='paused'?'Session restored paused. Review your courts, then resume.':'Saved session opened.');}break;
    case 'duplicate-session':{dialogContext={duplicate:target.dataset.index===undefined?snapshotSession(state):structuredClone(state.archive[Number(target.dataset.index)])};const saved=dialogContext.duplicate;openDialog('Duplicate session','<p class="dialog-intro">Copy the players, court names, and preferences. Results stay with the original session.</p><form id="duplicate-form"><div class="field"><label for="duplicate-name">New session name</label><input id="duplicate-name" name="name" value="'+esc((saved.session.name+' copy').slice(0,60))+'" maxlength="60" required /></div>'+formActions('Duplicate session')+'</form>');break;}
    case 'remove-court':confirmDialog('Remove '+court(id).name+'?','Recorded match results stay in Results. You can undo this change.','confirm-remove-court',id,'Remove court');break;
    case 'confirm-remove-court':if(commit('Removed '+court(id).name,()=>removeCourt(state,id))){modal.close();notify('Court removed. Match history is preserved.');}break;
    case 'nav': if(target.dataset.page==='settings'){enterManage();break;}manageOpen=false;page=target.dataset.page;modal.close();render();window.scrollTo({top:0,behavior:'instant'});break;
    case 'close':modal.close();break;
    case 'court-filter':courtFilter=target.dataset.filter;render();break;
    case 'queue':modal.className='queue-modal sheet';if(modal.open)modal.close();modal.innerHTML=`<aside class="surface queue-panel" aria-label="Player queue"><h2 id="dialog-title" style="display:none">Player queue</h2>${queueContent(true)}</aside>`;modal.showModal();break;
    case 'add-player':playerForm();break;
    case 'player-detail':showPlayer(id);break;
    case 'edit-player':playerForm(id);break;
    case 'player-status':if(commit('Changed availability for '+name(id),()=>{if(['playing','pending'].includes(playerState(state,id)))throw new Error('Finish or release this player’s assigned match first.');const p=player(id);p.status=target.dataset.status;p.waitSince=Date.now();p.priority=0;})){modal.close();notify('Player availability updated.');}break;
    case 'priority':if(commit('Prioritized '+name(id),()=>{player(id).priority=Math.max(0,...state.players.map(p=>p.priority||0))+1;})){modal.close();notify('Moved to the front of the queue.');}break;
    case 'lock-player':partnerDialog(id);break;
    case 'player-history':openDialog(esc(name(id))+' · Match history',historyContent(state.history.filter(m=>m.teams.flat().includes(id))));break;
    case 'add-players':case 'bulk':openDialog('Add players',`<p class="dialog-intro">Enter one player name per line. Players are checked in immediately. You can optionally add a rating, for example Alex Mercado,3.5.</p><form id="bulk-form"><div class="field"><label for="bulk-roster">Player names</label><textarea name="roster" id="bulk-roster" rows="7" required placeholder="Alex Mercado,3.5\nBea Santos,3.0"></textarea><small>Existing names are skipped to avoid duplicates.</small></div>${formActions('Add players')}</form>`);break;
    case 'all-present':if(commit('Checked in available roster',()=>state.players.filter(p=>!['playing','pending'].includes(playerState(state,p.id))).forEach(p=>{if(p.status!=='waiting'){p.status='waiting';p.waitSince=Date.now();}})))notify('Your available roster is checked in.');break;
    case 'generate':generated(id);break;
    case 'regenerate':generated(id,(court(id).lineupVariant||0)+1);break;
    case 'announce-court':notify(courtDisplay.announce(id)?'Announcement sent to Present Courts.':'Open Present Courts for this live session to announce its players.');break;
    case 'start':if(commit('Started match on '+court(id).name,()=>startMatch(state,court(id))))notify('Match started on '+court(id).name+'.');break;
    case 'lineup':if(court(id).status==='playing'){notify('The lineup is locked while a match is playing.');break;}lineupDialog(id);break;
    case 'score':scoreDialog(id);break;
    case 'correct-score':scoreDialog(id,true);break;
    case 'score-tab':scoreDialog(dialogContext.scoreId,dialogContext.correction,target.dataset.type);break;
    case 'select-winner':dialogContext.winner=Number(target.dataset.winner);modal.querySelectorAll('[data-action="select-winner"]').forEach(b=>b.classList.toggle('selected',b===target));break;
    case 'details':{const c=court(id);openDialog(esc(c.name)+' · In play',`<p class="dialog-intro">${c.teams.map(t=>t.map(id=>esc(name(id))).join(' & ')).join('<br />vs<br />')}</p><div class="info-box">Match duration: <span data-match-clock="${id}">${duration(c.startedAt)}</span><br />Play to ${c.target||state.settings.target}, win by 2.<br />Record a result to return all four players to fair rotation.</div><div class="dialog-actions">${btn('abandon','Abandon match','close','quiet',`data-id="${id}"`)}${btn('score','Record result','check','primary',`data-id="${id}"`)}</div>`);break;}
    case 'why':{const c=court(id);openDialog('Fair turns, thoughtfully paired.',`<p class="dialog-intro">The queue prioritizes manual priority, fewer completed games, then longest waiting time. Players who joined first take priority when game counts and waits are equal.</p><div class="info-box">Team assignment evaluates all three possible doubles pairings, balances the sum of skill ratings, and reduces repeated partners and opponents. ${esc(modeLabel())} changes the weight of skill and partner variety.<br /><br />${state.settings.strictSkill?'The skill gap is enforced. ':''}${state.settings.rest?state.settings.rest+' minutes of rest is required. ':''}Partner locks are always respected.</div>${c.teams?c.teams.flat().map(pid=>`<div class="between" style="padding:9px 0"><span>${esc(name(pid))}</span><span class="dialog-meta">${stats(state,pid).games} games · ${minWait(player(pid))}m waiting</span></div>`).join(''):''}<div class="dialog-actions">${btn('lineup','Back to lineup','arrow','primary',`data-id="${id}"`)}</div>`);break;}
    case 'court-menu':{const c=court(id);openDialog(esc(c.name)+' · Options',`<div class="menu-options">${c.status==='playing'?btn('score','Record result','check','primary',`data-id="${id}"`)+btn('details','Match details','info','',`data-id="${id}"`)+btn('abandon','Abandon current match','close','',`data-id="${id}"`):c.status==='pending'?btn('lineup','Edit lineup','edit','',`data-id="${id}"`)+btn('why','Why this matchup?','info','',`data-id="${id}"`)+btn('cancel-lineup','Cancel pending lineup','close','',`data-id="${id}"`):btn(c.status==='closed'?'reopen':'close-court',c.status==='closed'?'Reactivate court':'Mark court unavailable',c.status==='closed'?'play':'pause','',`data-id="${id}"`)}${btn('manage','Manage courts','settings','','data-tab="courts"')}</div>`);break;}
    case 'cancel-lineup':if(commit('Cancelled pending lineup',()=>{const c=court(id);if(c.status!=='pending')throw new Error('This court no longer has a pending lineup.');c.status='available';c.teams=null;})){modal.close();notify('Lineup released. Players are back in the queue.');}break;
    case 'close-court':if(commit('Closed '+court(id).name,()=>{court(id).status='closed';})){modal.close();notify('Court is excluded from rotation.');}break;
    case 'reopen':if(commit('Reactivated '+court(id).name,()=>court(id).status='available')){modal.close();notify('Court is ready to play.');}break;
    case 'rename-court':dialogContext={courtId:id};openDialog('Rename court',`<form id="rename-court-form"><div class="field"><label for="court-name">Court name</label><input id="court-name" name="name" maxlength="24" value="${esc(court(id).name)}" required /></div>${formActions('Save court name')}</form>`);break;
    case 'abandon':confirmDialog('End without a result?', 'All four players will return to the waiting queue. No game, win, or loss will be recorded. You can undo this change.', 'confirm-abandon',id,'Release court');break;
    case 'confirm-abandon':if(commit('Abandoned match on '+court(id).name,()=>{const c=court(id);c.teams.flat().forEach(pid=>{player(pid).waitSince=Date.now();});c.teams=null;c.status='available';})){modal.close();notify('Match released without a result.');}break;
    case 'add-court':if(commit('Added a court',()=>{if(state.courts.length>=12)throw new Error('Sessions support up to 12 courts.');let n=1;while(state.courts.some(c=>c.name==='Court '+n))n++;state.courts.push({id:crypto.randomUUID(),name:'Court '+n,status:'available',teams:null});})){if(target.dataset.source==='live'){courtFilter='all';render();}notify('New court added.');}break;
    case 'pause':if(commit(state.session.status==='paused'?'Resumed session':'Paused session',()=>{const s=state.session;if(!['live','paused'].includes(s.status))throw new Error('Only an active session can be paused or resumed.');if(s.status==='paused'){s.pausedTime+=Date.now()-s.pausedAt;s.status='live';}else{s.status='paused';s.pausedAt=Date.now();}})){modal.close();notify(state.session.status==='paused'?'Session paused. Results can still be recorded.':'Session resumed. Generate or start matches when ready.');}break;
    case 'rotation':enterManage('matchmaking');break;
    case 'end-session':confirmDialog('End session?', 'Completed matches and player statistics will be preserved. Pending lineups and unfinished matches will be released without results. You can undo this change.', 'confirm-end','','End session');break;
    case 'confirm-end':if(commit('Ended session',()=>finishSession(state))){modal.close();manageOpen=false;render();notify('Session finished. All completed results are saved.');}break;
    case 'new-session':newSessionDialog();break;
    case 'undo':{if(!lastUndo){notify('No change to undo.');break;}const undo=structuredClone(lastUndo),atEntry=!sessionSelected;if(commit('Undid last change',()=>{const revision=state.revision,audit=state.audit;state={...undo,revision,audit};lineupNotice='';})){lastUndo=null;if(atEntry||!state.session){sessionSelected=false;selectedSessionId=null;entryView='load';render();}else openWorkspace();notify('Last change undone.');}break;}
    case 'export-results':download('session-results.csv','Court,Team A,Team B,Score A,Score B,Winner,Ended at,Note\n'+state.history.map(m=>[m.court,m.teams[0].map(name).join(' & '),m.teams[1].map(name).join(' & '),m.scores?.[0]??'',m.scores?.[1]??'',m.winner===null?'Casual':m.winner?'Team B':'Team A',new Date(m.endedAt).toISOString(),m.note].map(csvCell).join(',')).join('\n'),'text/csv');break;
    case 'backup':download('pickleball-studio-backup.json',JSON.stringify(state,null,2),'application/json');notify('Backup downloaded. Keep it somewhere safe.');break;
    case 'import-reclub':rosterImporter.open('session');break;
    case 'restore-backup':importFile('backup');break;
    case 'all-history':openDialog('Every game.',historyContent(state.history));break;
    case 'audit':openDialog('A little session history.',state.audit.length?state.audit.map(item=>`<div class="history-row"><h3>${esc(item.label)}</h3><p class="dialog-meta">${new Date(item.at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})}</p></div>`).join(''):'<div class="info-box">Your session activity will appear here as you make changes.</div>');break;
    case 'archive-view':{const saved=state.archive[Number(target.dataset.index)];openDialog(esc(saved.session.name),`<p class="dialog-intro">${date(saved.session.startedAt)} · ${saved.players.length} players · ${saved.history.length} matches</p>`+saved.history.map(m=>`<div class="history-row"><h3>${esc(m.court)} · ${m.scores?m.scores.join(' : '):m.winner===null?'Casual':'Quick result'}</h3><div class="history-teams">${m.teams.map(t=>t.map(pid=>esc(saved.players.find(p=>p.id===pid)?.name||'Former player')).join(' & ')).join('<br />')}</div></div>`).join(''));break;}
    case 'help':openDialog('Help',`<p class="dialog-intro">Welcome to Pickleball Studio. Your courts and queue stay together, so you can keep the games flowing.</p><div class="info-box"><strong>1. Bring your crew.</strong><br />Add players or import a CSV with Name and Rating columns. Check them in to join the queue.<br /><br /><strong>2. Start a fresh game.</strong><br />Generate a lineup, review the two teams, then Start match. The same player can never be assigned to two courts.<br /><br /><strong>3. Keep the turns moving.</strong><br />Record a full score, quick winner, or casual result. The court is freed and all four players return to the queue.<br /><br /><strong>4. Make it yours.</strong><br />Adjust rotation, rest time, partner locks, and skill restrictions. View results and correct old scores at any time.</div><p class="dialog-meta">${state.demo?'This is a sample session. Start a new session for your own records. ':''}Data is saved only in this browser. Export a backup before moving devices.</p><div class="dialog-actions">${btn('close','Got it','check','primary')}</div>`);break;
  }
}
function parseRoster(text) {
  return text.split(/\r?\n/).filter(l=>l.trim()).map(line=>{const cells=parseCSVLine(line);const nm=cells[0]?.trim();if(!nm||nm.length>60)throw new Error('Player names must be between 1 and 60 characters.');const rating=cells[1]?.trim()?Number(cells[1]):3;if(!Number.isFinite(rating)||rating<1||rating>5)throw new Error('Skill ratings must be between 1.0 and 5.0.');return{name:nm,rating};});
}
function newPlayer(p) {return{id:crypto.randomUUID(),...p,status:p.status||'waiting',waitSince:Date.now(),totalWait:0,priority:0,lock:null};}
function handleSubmit(e) {
  e.preventDefault();const form=e.target,fd=new FormData(form);let ok=false,message='Saved.';
  switch(form.id) {
    case 'player-form':ok=commit(dialogContext.playerId?'Edited player':'Added player',()=>{const nm=String(fd.get('name')).trim();if(!nm)throw new Error('Enter a player name.');if(state.players.some(p=>p.id!==dialogContext.playerId&&p.name.toLowerCase()===nm.toLowerCase()))throw new Error('That name is already on your roster. Add an initial to distinguish players.');if(dialogContext.playerId){const p=player(dialogContext.playerId);p.name=nm;p.rating=Number(fd.get('rating'));if(fd.has('status')){if(p.status!==fd.get('status'))p.waitSince=Date.now();p.status=fd.get('status');}}else{if(state.players.length>=120)throw new Error('Sessions support up to 120 players.');state.players.push(newPlayer({name:nm,rating:Number(fd.get('rating')),status:fd.get('status')}));}});message=dialogContext.playerId?'Player details updated.':'Player added to this session.';break;
    case 'bulk-form':ok=commit('Added players in bulk',()=>{const ps=parseRoster(String(fd.get('roster')));let added=0;ps.forEach(p=>{if(!state.players.some(v=>v.name.toLowerCase()===p.name.toLowerCase())){if(state.players.length>=120)throw new Error('Sessions support up to 120 players.');state.players.push(newPlayer(p));added++;}});if(!added)throw new Error('These names are already on your roster.');message=added+' players added to the queue.';});break;
    case 'score-form':{const {scoreId,correction,scoreType,winner}=dialogContext;const result={scores:scoreType==='full'?[Number(fd.get('score0')),Number(fd.get('score1'))]:null,winner:scoreType==='casual'?null:winner,note:String(fd.get('note')).trim()};ok=commit(correction?'Corrected match result':'Recorded match result',()=>{if(scoreType==='quick'&&![0,1].includes(winner))throw new Error('Choose the winning team before saving.');if(correction){const m=state.history.find(m=>m.id===scoreId);if(result.scores){const error=scoreError(result.scores,m.target||state.settings.target);if(error)throw new Error(error);result.winner=result.scores[0]>result.scores[1]?0:1;}Object.assign(m,result);m.correctedAt=Date.now();}else { const c=court(scoreId);completeMatch(state,c,result);if(state.session.status==='live'){const next=suggestAfterResult(state,c);lineupNotice=next.ready?'Result saved on '+c.name+'. The next lineup is ready to start.':'Result saved on '+c.name+'. '+next.reason;}else lineupNotice='Result saved on '+c.name+'. Resume the session to create the next match.'; }});message=correction?'Result corrected. Player statistics updated.':lineupNotice||'Result saved. Players returned to the queue.';break;}
    case 'lineup-form':ok=commit('Updated lineup',()=>{const c=court(dialogContext.courtId),teams=[[fd.get('p00'),fd.get('p01')],[fd.get('p10'),fd.get('p11')]];if(c.status==='playing'||c.status==='closed')throw new Error('This court is unavailable for lineup changes.');const error=validateLineup(state,c,teams);if(error)throw new Error(error);reserve(state,c,teams);});message='Lineup saved. Start the match when you’re ready.';break;
    case 'general-form':requestPreferenceChange({kind:'general',name:String(fd.get('sessionName')).trim(),venue:String(fd.get('venue')).trim(),settings:{target:Number(fd.get('target'))}});return;
    case 'matchmaking-form':requestPreferenceChange({kind:'matchmaking',settings:{mode:fd.get('mode'),rest:Number(fd.get('rest')),maxGap:Number(fd.get('maxGap')),strictSkill:fd.has('strictSkill'),avoidRepeats:fd.has('avoidRepeats')}});return;
    case 'duplicate-form':ok=commit('Duplicated session',()=>duplicateSession(state,dialogContext.duplicate,String(fd.get('name'))));page='live';manageOpen=false;courtFilter='all';playerSearch='';playerFilter='all';queueSearch='';if(ok)openWorkspace();message='Session duplicated. Check your roster, then start the session.';break;
    case 'rename-court-form':{const nm=String(fd.get('name')).trim(),c=court(dialogContext.courtId);if(!nm){notify('Enter a court name.');return;}if(nm!==c.name&&(['playing','pending'].includes(c.status)||state.history.some(m=>m.court===c.name))){dialogContext={courtNameChange:{id:c.id,name:nm}};openDialog('Rename this court?','<p class="dialog-intro">Existing result records keep their original court label. The current court and future results will use “'+esc(nm)+'”. Teams and scoring rules stay the same.</p><div class="dialog-actions">'+btn('close','Keep current')+btn('confirm-court-name','Rename court','edit','primary')+'</div>');return;}ok=commit('Renamed court',()=>{c.name=nm;});break;}
    case 'lock-form':ok=commit('Updated partner lock',()=>{const p=player(dialogContext.playerId),otherId=fd.get('partner');if(['playing','pending'].includes(playerState(state,p.id)))throw new Error('Release this player from their court before changing partner locks.');if(otherId==='__keep__')return;if(p.lock){player(p.lock).lock=null;p.lock=null;}if(otherId){const other=player(otherId);if(other.lock||['playing','pending'].includes(playerState(state,other.id)))throw new Error('That partner is unavailable or already locked.');p.lock=other.id;other.lock=p.id;}});message='Partner preference saved.';break;
    case 'setup-form':try{captureSetup();if(setup.step<3){setup.step++;render();window.scrollTo({top:0,behavior:'instant'});return;}const start=e.submitter?.value==='start';ok=commit(start?'Configured and started session':'Saved session draft',()=>createConfiguredSession(state,setup,start));if(ok){openWorkspace();notify(start?'Session started. Generate your first matches.':'Draft saved. Your timer has not started.');}return;}catch(error){const field=form.querySelector('.form-error');field.textContent=error.message;field.classList.add('error');return;}
  }
  if(ok){modal.close();render();notify(message);}
}
function csvCell(v) {let str=String(v);if(/^[=+@\-\t\r]/.test(str))str="'"+str;return '"'+str.replaceAll('"','""')+'"';}
function parseCSVLine(line) {const cells=[];let cell='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){cells.push(cell);cell='';}else cell+=ch;}cells.push(cell);return cells;}
function download(file,text,mime) {const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function importFile(kind) {
  const input=document.createElement('input');input.type='file';input.accept=kind==='csv'?'.csv,text/csv':'.json,application/json';
  input.addEventListener('change',async()=>{const file=input.files[0];if(!file)return;if(file.size>5*1024*1024){notify('Choose a file smaller than 5 MB.');return;}try{const text=await file.text();if(kind==='csv'){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(l=>l.trim());const head=parseCSVLine(lines[0]||'').map(s=>s.trim().toLowerCase());const hasHeader=head.includes('name'),ni=hasHeader?head.indexOf('name'):0,ri=hasHeader?head.indexOf('rating'):1;const roster=lines.slice(hasHeader?1:0).map(l=>{const cells=parseCSVLine(l);return csvCell(cells[ni]||'')+','+(cells[ri]||3);}).join('\n');dialogContext={};openDialog('Ready to join the crew.',`<p class="dialog-intro">Review the names from ${esc(file.name)} before adding them. Existing names will be skipped.</p><form id="bulk-form"><div class="field"><label for="import-roster">Players & ratings</label><textarea id="import-roster" name="roster" rows="8" required>${esc(roster)}</textarea></div>${formActions('Import players')}</form>`);}else{const backup=JSON.parse(text);validateBackup(backup);if(kind==='session'){dialogContext={incomingSession:backup};openDialog('Import session?', '<p class="dialog-intro">Open “'+esc(backup.session.name)+'” ('+backup.players.length+' players, '+backup.history.length+' matches). Existing sessions will be preserved. Unfinished play opens paused for review.</p><div class="dialog-actions">'+btn('close','Cancel')+btn('confirm-import','Import Session','upload','primary')+'</div>');return;}dialogContext={backup};openDialog('Restore saved sessions?',`<p class="dialog-intro">Replace this browser’s workspace with “${esc(backup.session.name)}” (${backup.players.length} players, ${backup.history.length} matches). You can undo the restore.</p><div class="dialog-actions">${btn('close','Keep current')}${btn('confirm-restore','Restore backup','upload','primary')}</div>`);}}catch(e){notify('Could not import: '+e.message);}});input.click();
}
function validateBackup(b) {
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
  const validTeams = teams => Array.isArray(teams) && teams.length === 2 && teams.every(t=>Array.isArray(t)&&t.length===2) && new Set(teams.flat()).size===4 && teams.flat().every(id=>b.players.some(p=>p.id===id));
  if(!b||!Array.isArray(b.players)||b.players.length>120||!Array.isArray(b.courts)||!b.courts.length||b.courts.length>12||!Array.isArray(b.history)||!b.session||!b.settings||!Array.isArray(b.archive)||!Array.isArray(b.audit)||!Number.isInteger(b.revision))throw new Error('This file is not a valid Pickleball Studio backup.');
  if(typeof b.session.name!=='string'||typeof b.session.venue!=='string'||!['preparing','live','paused','ended'].includes(b.session.status)||!Number.isFinite(b.session.startedAt)||!Number.isFinite(b.session.pausedTime)||b.session.status==='paused'&&!Number.isFinite(b.session.pausedAt)||b.session.status==='ended'&&!Number.isFinite(b.session.endedAt))throw new Error('Invalid session record.');
  if(!['fair','balanced','social'].includes(b.settings.mode)||![7,11,15,21].includes(b.settings.target)||![0,2,5,10].includes(b.settings.rest)||![.5,1,1.5,2].includes(b.settings.maxGap))throw new Error('Invalid session preferences.');
  if(b.players.some(p=>!validId(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||!Number.isFinite(p.rating)||p.rating<1||p.rating>5||!['waiting','break','out'].includes(p.status)||!Number.isFinite(p.waitSince)||p.lock&&!b.players.some(other=>other.id===p.lock&&other.lock===p.id)))throw new Error('Invalid player records.');
  if(new Set(b.players.map(p=>p.id)).size!==b.players.length||new Set(b.courts.map(c=>c.id)).size!==b.courts.length)throw new Error('Duplicate player or court identifiers.');
  if(b.courts.some(c=>!validId(c.id)||typeof c.name!=='string'||!['playing','pending','available','closed'].includes(c.status)||(['playing','pending'].includes(c.status)?!validTeams(c.teams):!!c.teams)||c.status==='playing'&&(!Number.isFinite(c.startedAt)||!validId(c.matchId))))throw new Error('Invalid court records.');
  if(b.history.some(m=>!validId(m.id)||!validTeams(m.teams)||![0,1,null].includes(m.winner)||typeof m.court!=='string'||!Number.isFinite(m.endedAt)||!Number.isFinite(m.startedAt)||m.scores&&(!Array.isArray(m.scores)||m.scores.length!==2||m.scores.some(s=>!Number.isInteger(s)||s<0||s>999))))throw new Error('Invalid match records.');
  if(b.archive.some(s=>!s.session||typeof s.session.name!=='string'||!Number.isFinite(s.session.startedAt)||!Array.isArray(s.players)||!Array.isArray(s.history)||s.players.some(p=>typeof p.name!=='string')||s.history.some(m=>typeof m.court!=='string'||!Array.isArray(m.teams)||m.teams.length!==2||m.teams.some(t=>!Array.isArray(t)))))throw new Error('Invalid archived session.');
  for(const saved of b.archive)if(saved.courts&&saved.settings)validateBackup({...saved,archive:[],audit:[],revision:0});
  if(b.audit.some(item=>typeof item.label!=='string'||!Number.isFinite(item.at)))throw new Error('Invalid activity log.');
  assertState(b);
}
app.addEventListener('click',handleAction);
document.querySelector('#toast').addEventListener('click',handleAction);
modal.addEventListener('click',e=>{if(e.target.closest('[data-action="confirm-restore"]')){const backup=dialogContext.backup;if(commit('Restored workspace backup',()=>{const revision=state.revision;state={...structuredClone(backup),revision};})){openWorkspace();notify('Backup restored.');}}else handleAction(e);});
document.addEventListener('submit',handleSubmit);
document.addEventListener('input',e=>{if(e.target.id==='partner-lock-search')filterPartnerLocks(e.target.value);if(e.target.id==='setup-roster'){setup.rosterText=e.target.value;const error=document.querySelector('#setup-form .form-error');try{syncSetupRoster(e.target.value);error.textContent='';error.classList.remove('error');document.querySelector('#roster-preview').innerHTML=setupRosterPreview();document.querySelector('#setup-review').innerHTML=setupReview();document.querySelector('.setup-start').disabled=setup.players.filter(p=>p.status!=='out').length<4;}catch(err){error.textContent=err.message;error.classList.add('error');document.querySelector('.setup-start').disabled=true;}} if(e.target.id==='player-search'){playerSearch=e.target.value;document.querySelector('#players-table').innerHTML=playersTable();}if(e.target.id==='queue-search'){queueSearch=e.target.value;document.querySelector('#queue-list').innerHTML=queueRows();}});
document.addEventListener('change',e=>{if(['invite-approval','invite-open'].includes(e.target.id))saveJoinPreferences();if(e.target.id==='player-filter'){playerFilter=e.target.value;document.querySelector('#players-table').innerHTML=playersTable();}});
document.addEventListener('keydown',e=>{const tab=e.target.closest('[role=tab][data-tab]');if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=['general','matchmaking','courts','saved'];manageTab=e.key==='Home'?tabs[0]:e.key==='End'?tabs[3]:tabs[(tabs.indexOf(manageTab)+(e.key==='ArrowRight'?1:3))%4];render();document.querySelector('#manage-tab-'+manageTab).focus();}if(e.key==='Escape'&&modal.open)modal.close();});
window.addEventListener('hashchange',()=>{if(location.hash==='#live'){manageOpen=false;page='live';render();}});
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{const next=JSON.parse(e.newValue);assertState(next);state=next;if(sessionSelected&&sessionIdentity(state.session)!==selectedSessionId){sessionSelected=false;selectedSessionId=null;entryView='load';}lastUndo=null;modal.close();render();notify('Session updated from another tab.');}catch{notify('Unable to read changes from another tab.');}}});
setInterval(updateTimers,1000);
cloud=createSessionCloud({getState:()=>state,receive:receiveSharedSession,connection:updateCloudConnection,notice:notify});
installSelectMenus();
render();
