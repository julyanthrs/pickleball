import {prepareRoster,reviewRoster,validateReclubURL,RECLUB_UNAVAILABLE} from './reclub-import.js';

export function createRosterImporter({modal,openDialog,esc,getPlayers,save,invite}) {
  let records=[],eventURL='',target=null;
  const button=(action,label,cls='')=>`<button type="button" class="btn ${cls}" data-roster="${action}">${label}</button>`;
  const error=message=>{const el=modal.querySelector('.form-error');if(el){el.textContent=message;el.classList.add('error');}};
  function open(context,method='link'){target=context;records=[];eventURL='';source();if(method!=='link')entry(method);}
  function source(){
    openDialog('Import Players',`<div class="roster-import"><p class="dialog-intro">Bring your roster into this session. Review every player before adding them.</p><div class="import-methods" role="group" aria-label="Import method">${button('link','Reclub Link','reclub-accent')}${button('file','Roster file')}${button('paste','Paste roster')}${target==='session'?button('qr','Invite with QR'):''}</div><div id="import-source"></div><div class="form-error" role="alert"></div></div>`);
    link();
  }
  function link(){
    modal.querySelector('#import-source').innerHTML=`<div class="field"><label for="reclub-event-url">Reclub Meet or Competition link</label><input id="reclub-event-url" type="url" placeholder="https://reclub.co/m/ABC123" value="${esc(eventURL)}"><small>In Reclub, open your Meet or Competition → Share → Copy Link.</small><small id="reclub-link-feedback" aria-live="polite"></small></div><div class="info-box"><strong>Partner access required</strong><p>${RECLUB_UNAVAILABLE}</p><p>A shareable event link does not grant participant-roster API access.</p></div><div class="dialog-actions"><button type="button" class="btn primary" disabled aria-describedby="reclub-link-feedback">Fetch Players</button></div>`;
  }
  function entry(mode){
    modal.querySelector('.form-error').textContent='';
    modal.querySelector('#import-source').innerHTML=`<p class="dialog-intro">Use a roster you own or have permission to import. This does not retrieve data from Reclub.</p><div class="field"><label for="roster-event">Reclub event link (optional)</label><input id="roster-event" type="url" placeholder="https://reclub.co/m/ABC123" value="${esc(eventURL)}"><small>Attach the event link to keep the source with imported players.</small></div>${mode==='file'?'<div class="field"><label for="authorized-roster-file">Authorized roster file</label><input id="authorized-roster-file" type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values"><small>CSV or TSV, up to 1 MB. Choose a file to preview it.</small></div>':'<div class="field"><label for="authorized-roster-text">Your player roster</label><textarea id="authorized-roster-text" rows="7" placeholder="Name,Rating,Status,Participant ID"></textarea></div>'}<p class="dialog-meta">One player per line, or columns: Name, Rating, Status, Participant ID. Rating, status and ID are optional. Missing ratings stay identified as unavailable.</p>${mode==='paste'?'<div class="dialog-actions">'+button('preview','Review players','primary')+'</div>':''}`;
  }
  async function prepare(text){
    const sourceNode=modal.querySelector('#import-source'),context=target;
    eventURL=modal.querySelector('#roster-event')?.value||eventURL;
    const control=modal.querySelector('[data-roster="preview"]');if(control){control.disabled=true;control.textContent='Preparing preview…';}
    try{const result=await prepareRoster(text,eventURL);if(!modal.open||sourceNode!==modal.querySelector('#import-source')||context!==target)return;records=reviewRoster(result,getPlayers(target));preview();}
    catch(e){error(e.message);}finally{if(control?.isConnected){control.disabled=false;control.textContent='Review players';}}
  }
  function preview(){
    openDialog('Review imported players',`<div class="roster-import"><p class="dialog-intro">${records.length} participants found.${eventURL?' Source: <a href="'+esc(validateReclubURL(eventURL))+'" target="_blank" rel="noopener noreferrer">Reclub event</a>':''} Nothing is added until you confirm.</p><div class="import-selection"><label><input id="roster-select-all" type="checkbox"> Select all</label><span id="roster-selection-count" role="status"></span></div><div class="import-records">${records.map((r,i)=>`<article class="import-record"><div class="import-record-main"><input type="checkbox" aria-label="Select ${esc(r.name)}" data-row="${i}" data-field="selected" ${r.selected?'checked':''}><div class="field"><label for="roster-name-${i}">Player ${i+1}</label><input id="roster-name-${i}" data-row="${i}" data-field="name" value="${esc(r.name)}" maxlength="60" ${r.known?'readonly':''}></div><span class="import-rating">${r.rating===null?'No source rating':'Rating '+r.rating.toFixed(1)}<small>${esc(r.rsvp||'RSVP not provided')}</small></span></div><div class="import-duplicate">${r.known?'<span>Already imported · existing player will be kept</span>':`${!r.matches.length&&!r.batchDuplicate?'<details><summary>New player · options</summary>':''}<label for="roster-decision-${i}">${r.matches.length||r.batchDuplicate?'Possible duplicate — choose an action':'Import action'}</label><select id="roster-decision-${i}" data-row="${i}" data-field="decision">${(r.decision==='review'?'<option value="review">Review duplicate…</option>':'')}<option value="add" ${r.decision==='add'?'selected':''}>Add new player</option><option value="skip">Skip existing player</option>${getPlayers(target).length?'<option value="link">Link to existing player</option>':''}<option value="separate">Import as separate player</option></select><div class="import-link-target" ${r.decision==='link'?'':'hidden'}><label for="roster-target-${i}">Existing player</label><select id="roster-target-${i}" data-row="${i}" data-field="target">${getPlayers(target).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===r.target?'selected':'')+'>'+esc(p.name)+'</option>').join('')}</select></div>${!r.matches.length&&!r.batchDuplicate?'</details>':''}`}</div></article>`).join('')}</div><div class="import-preferences"><div class="field"><label for="roster-default-rating">Starting rating for players without a source rating</label><select id="roster-default-rating"><option value="">Choose if needed…</option>${[1,1.5,2,2.5,3,3.5,4,4.5,5].map(n=>'<option value="'+n+'">'+n.toFixed(1)+'</option>').join('')}</select><small>Chosen by you for matchmaking; never presented as a Reclub rating.</small></div><label class="import-checkin"><input id="roster-check-in" type="checkbox"> Check in newly added players now</label><p class="dialog-meta">New players are Not Checked In by default. Linking preserves existing names, attendance and results. Waitlisted or withdrawn participants are unselected.</p></div><div class="form-error" role="alert"></div><div class="dialog-actions">${button('back','Back to import')}${button('confirm','Import Selected Players','primary')}</div></div>`);
    updateCount();
  }
  function updateCount(){const count=records.filter(r=>r.selected).length;const el=modal.querySelector('#roster-selection-count');if(el)el.textContent=count+' selected';const all=modal.querySelector('#roster-select-all');if(all){all.checked=count===records.length;all.indeterminate=count>0&&count<records.length;}const confirm=modal.querySelector('[data-roster="confirm"]');if(confirm)confirm.disabled=count===0;}
  modal.addEventListener('click',e=>{
    const action=e.target.closest('[data-roster]')?.dataset.roster;if(!action)return;
    if(action==='link'){eventURL=modal.querySelector('#roster-event')?.value||eventURL;link();}
    if(action==='file'||action==='paste'){eventURL=modal.querySelector('#reclub-event-url')?.value??modal.querySelector('#roster-event')?.value??eventURL;entry(action);}
    if(action==='back')source();
    if(action==='preview')prepare(modal.querySelector('#authorized-roster-text').value);
    if(action==='qr'){modal.close();invite();}
    if(action==='confirm'){
      try{save(target,records,{checkIn:modal.querySelector('#roster-check-in').checked,defaultRating:modal.querySelector('#roster-default-rating').value||null});}catch(e){error(e.message);}
    }
  });
  modal.addEventListener('input',e=>{
    if(e.target.id==='reclub-event-url'){
      eventURL=e.target.value;const feedback=modal.querySelector('#reclub-link-feedback');
      if(!eventURL.trim()){feedback.textContent='';return;}
      try{validateReclubURL(eventURL);feedback.textContent='Recognized event-link format. Roster retrieval requires approved partner access; event accessibility has not been checked.';}catch(err){feedback.textContent=err.message;}
    }
    if(e.target.dataset.field==='name')records[Number(e.target.dataset.row)].name=e.target.value;
  });
  modal.addEventListener('change',async e=>{
    if(e.target.id==='authorized-roster-file'){
      const file=e.target.files[0];if(!file)return;
      if(file.size>1024*1024){error('Choose a roster smaller than 1 MB.');return;}
      try{await prepare(await file.text());}catch(err){error('Could not read this file. Try again or paste the roster.');}
    }
    if(e.target.id==='roster-select-all'){records.forEach(r=>r.selected=e.target.checked);modal.querySelectorAll('[data-field="selected"]').forEach(el=>el.checked=e.target.checked);updateCount();}
    const {row,field}=e.target.dataset;
    if(row!==undefined&&field){const r=records[Number(row)];r[field]=field==='selected'?e.target.checked:e.target.value;
      if(field==='decision'){const container=e.target.closest('.import-duplicate');container.querySelector('.import-link-target').hidden=r.decision!=='link';if(r.decision==='link'&&!r.target)r.target=getPlayers(target)[0]?.id||'';}updateCount();}
  });
  return {open};
}
