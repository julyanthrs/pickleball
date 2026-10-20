// Approved roster files/paste only. This module never requests Reclub pages or APIs.
export const RECLUB_UNAVAILABLE = 'Direct Reclub roster import is not available yet. Use an authorized roster file, paste your own roster, or invite players through your session QR code.';

export function validateReclubURL(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('Please enter a valid Reclub event link.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || /%|\\/.test(url.pathname)) throw new Error('Use an HTTPS Reclub event link without credentials or a custom port.');
  const direct = url.hostname === 'reclub.co' && /^\/(m\/[A-Za-z0-9]{6}|c\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/?$/.test(url.pathname);
  const discover = url.hostname === 'discover.reclub.co' && /^\/discover\/meet\/[A-Za-z0-9]{6}\/?$/.test(url.pathname);
  if (!direct && !discover) throw new Error('Use a Reclub Meet or Competition share link, such as https://reclub.co/m/ABC123. Other links cannot be resolved here.');
  return url.origin + url.pathname.replace(/\/$/, '');
}

export const normalizedName = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
export function mergeManualSetupRoster(old,parsed) {
  const imported=old.filter(p=>p.rosterSources?.length),used=new Set(),manual=[];
  for(const p of parsed){
    if([...manual,...imported].some(x=>normalizedName(x.name)===normalizedName(p.name)))throw new Error('Add an initial to distinguish manually entered players with the same name.');
    const prior=old.find(x=>!x.rosterSources?.length&&!used.has(x.id)&&normalizedName(x.name)===normalizedName(p.name));
    if(prior)used.add(prior.id);
    manual.push({...prior,...p,id:prior?.id||crypto.randomUUID(),lock:prior?.lock||null});
  }
  const result=[...manual,...imported];
  if(result.length>120)throw new Error('Sessions support up to 120 players.');
  return result.map(p=>({...p,lock:result.some(other=>other.id===p.lock)?p.lock:null}));
}
function csv(text) {
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const ch=text[i];
    if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&(ch===','||ch==='\t')){row.push(cell);cell='';}
    else if(!quoted&&(ch==='\n'||ch==='\r')){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(c=>c.trim()))rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  if(quoted)throw new Error('A quoted CSV value is unfinished. Check the file and try again.');
  row.push(cell);if(row.some(c=>c.trim()))rows.push(row);return rows;
}
async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
}

export async function prepareRoster(text, eventURL='') {
  if(typeof text!=='string'||text.length>1024*1024)throw new Error('Choose a roster smaller than 1 MB.');
  const event=eventURL.trim()?validateReclubURL(eventURL):'';
  const rows=csv(text.replace(/^\uFEFF/,'')),head=(rows[0]||[]).map(c=>c.trim().toLowerCase().replace(/[_-]/g,' '));
  const find=(...names)=>head.findIndex(h=>names.includes(h));
  const ni=find('name','player','player name','display name'),hasHeader=ni>=0;
  const ri=find('rating','skill rating','dupr'),si=find('status','rsvp','rsvp status'),pi=find('participant id','reclub id','player id','id');
  const data=rows.slice(hasHeader?1:0);
  if(!data.length)throw new Error('No player names were found. Add a Name column or one player per line.');
  if(data.length>120)throw new Error('Import up to 120 participants at a time.');
  const records=data.map((cells,index)=>{
    const name=(cells[hasHeader?ni:0]||'').trim();
    if(!name||name.length>60||/[\r\n\x00-\x1f]/.test(name))throw new Error('Row '+(index+1)+': enter a name of 1–60 characters on one line.');
    const raw=(cells[hasHeader?ri:1]||'').trim(),rating=raw?Number(raw):null;
    if(rating!==null&&(!Number.isFinite(rating)||rating<1||rating>5))throw new Error('Row '+(index+1)+': rating must be 1.0–5.0, or blank if unavailable.');
    const rsvp=(hasHeader&&si>=0?cells[si]||'':'').trim().slice(0,60),participantId=(hasHeader&&pi>=0?cells[pi]||'':'').trim().slice(0,120);
    return {name,rating,rsvp,participantId,selected:!/(wait.?list|withdraw|cancel|declin)/i.test(rsvp)};
  });
  // Identical files remain retryable, including reordered rows. No name-only identity inference.
  const fingerprint=await digest(JSON.stringify(records.map(r=>[r.name,r.rating,r.rsvp,r.participantId]).sort()));
  const counts=new Map(),seenIds=new Map();
  const result=[];
  for(const record of records){
    if(record.participantId&&seenIds.has(record.participantId)){
      const prior=seenIds.get(record.participantId);
      if(prior.name!==record.name||prior.rating!==record.rating||prior.rsvp!==record.rsvp)throw new Error('A participant ID has conflicting player details. Review the roster before importing.');
      continue;
    }
    if(record.participantId)seenIds.set(record.participantId,record);
    const signature=JSON.stringify([record.name,record.rating,record.rsvp]),occurrence=counts.get(signature)||0;counts.set(signature,occurrence+1);
    const key=record.participantId?await digest(JSON.stringify([event||'authorized-roster',record.participantId])):await digest(JSON.stringify([fingerprint,signature,occurrence]));
    result.push({...record,key,event});
  }
  return result;
}

export function reviewRoster(records,players) {
  return records.map(record=>{
    const known=players.find(p=>p.rosterSources?.some(s=>s.key===record.key));
    const matches=players.filter(p=>normalizedName(p.name)===normalizedName(record.name));
    const batchDuplicate=records.filter(r=>normalizedName(r.name)===normalizedName(record.name)).length>1;
    return {...record,known:known?.id||null,batchDuplicate,matches:matches.map(p=>({id:p.id,name:p.name})),decision:known?'skip':matches.length||batchDuplicate?'review':'add',target:known?.id||matches[0]?.id||''};
  });
}

export function applyRosterImport(players,records,{checkIn=false,defaultRating=null,now=Date.now()}={}) {
  const next=structuredClone(players),keys=new Set();let added=0,linked=0,skipped=0;
  for(const r of records){
    if(!r.selected)continue;
    if(keys.has(r.key)||next.some(p=>p.rosterSources?.some(s=>s.key===r.key))){skipped++;continue;}
    keys.add(r.key);
    if(r.decision==='skip'){skipped++;continue;}
    if(!['add','link','separate'].includes(r.decision))throw new Error('Review possible duplicates before importing.');
    const source={key:r.key,event:r.event,participantId:r.participantId,rsvp:r.rsvp,sourceRating:r.rating};
    if(r.decision==='link'){
      const target=next.find(p=>p.id===r.target);if(!target)throw new Error('Choose an existing player to link.');
      target.rosterSources=[...(target.rosterSources||[]),source];linked++;continue;
    }
    const name=r.name.trim(),rating=r.rating===null?Number(defaultRating):Number(r.rating);
    if(r.decision==='add'&&next.some(p=>normalizedName(p.name)===normalizedName(name)))throw new Error('A player named '+name+' already exists. Choose Skip, Link, or Import as separate player.');
    if(!name||name.length>60)throw new Error('Player names must be between 1 and 60 characters.');
    if(!Number.isFinite(rating)||rating<1||rating>5)throw new Error('Choose a starting rating for players without a source rating.');
    if(next.length>=120)throw new Error('Sessions support up to 120 players. Deselect some participants.');
    next.push({id:crypto.randomUUID(),name,rating,status:checkIn?'waiting':'out',waitSince:now,totalWait:0,priority:0,lock:null,rosterSources:[source]});added++;
  }
  if(!records.some(r=>r.selected))throw new Error('Select at least one participant.');
  return {players:next,added,linked,skipped};
}
