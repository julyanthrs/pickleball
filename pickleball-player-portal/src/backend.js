import { assertState, stats, playerState, queue } from './engine.js';
const DAY=86400000, MAX_BODY=2000000;
const json=(data,status=200,extra={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer',...extra}});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const uid=()=>crypto.randomUUID();
export const normalizeName=s=>s.trim().normalize('NFKC').replace(/\s+/g,' ').toLocaleLowerCase();
export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
const secretEqual=(a,b)=>{if(!a||!b||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;};
const random=()=>{const bytes=crypto.getRandomValues(new Uint8Array(24));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');};
async function body(request){
 if(Number(request.headers.get('content-length'))>MAX_BODY)fail('This request is too large.',413);
 const reader=request.body?.getReader(),decoder=new TextDecoder();let text='',size=0;
 if(reader){for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();fail('This request is too large.',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}
 try{return JSON.parse(text);}catch{fail('Invalid request.');}
}
function validateState(value){
  if(!value?.session||!['preparing','live','paused','ended'].includes(value.session.status)||typeof value.session.name!=='string'||!value.session.name.trim()||value.session.name.length>60)fail('Invalid session.');
  if(!Array.isArray(value.players)||value.players.length>120||!Array.isArray(value.courts)||value.courts.length<1||value.courts.length>12||!Array.isArray(value.history)||value.history.length>10000)fail('Invalid session records.');
  if(value.players.some(p=>typeof p.id!=='string'||p.id.length>100||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||!Number.isFinite(p.rating)||p.rating<1||p.rating>5||!['waiting','break','out'].includes(p.status)||!Number.isFinite(p.waitSince)))fail('Invalid player.');
  if(new Set(value.players.map(p=>p.id)).size!==value.players.length||value.players.some(p=>p.lock&&!value.players.some(q=>q.id===p.lock&&q.lock===p.id)))fail('Invalid player identities or locks.');
  if(value.courts.some(c=>typeof c.id!=='string'||typeof c.name!=='string'||c.name.length>40||!['available','closed','pending','playing'].includes(c.status)))fail('Invalid courts.');
  if(value.history.some(m=>typeof m.id!=='string'||!Array.isArray(m.teams)||m.teams.length!==2||m.teams.some(t=>!Array.isArray(t)||t.length!==2)||m.teams.flat().some(id=>!value.players.some(p=>p.id===id))||![0,1,null].includes(m.winner)||m.scores&&(!Array.isArray(m.scores)||m.scores.length!==2||m.scores.some(n=>!Number.isInteger(n)||n<0||n>999))))fail('Invalid results.');
  if(!['fair','balanced','social'].includes(value.settings?.mode)||![7,11,15,21].includes(value.settings.target)||![0,2,5,10].includes(value.settings.rest)||![.5,1,1.5,2].includes(value.settings.maxGap))fail('Invalid matchmaking settings.');
  const state=structuredClone({session:value.session,players:value.players,courts:value.courts,settings:value.settings,history:value.history});
  delete state.session.portal;
  try{assertState(state);}catch(e){fail(e.message);}
  return state;
}
const getRoom=(db,id)=>db.prepare('SELECT * FROM rooms WHERE id=?').bind(id).first();
const getInvite=(db,invite)=>db.prepare('SELECT * FROM rooms WHERE invite=?').bind(invite).first();
const roomState=row=>JSON.parse(row.state_json);
const pending=async(db,id)=>(await db.prepare("SELECT id,name,rating,status,duplicate_player_id,created_at FROM identities WHERE room_id=? AND status IN ('pending','duplicate') ORDER BY created_at").bind(id).all()).results;
async function organizerView(db,row){return {roomId:row.id,invite:row.invite,version:row.version,state:roomState(row),requireApproval:!!row.require_approval,joinsOpen:!!row.joins_open,pending:await pending(db,row.id),joined:(await db.prepare("SELECT count(DISTINCT player_id) AS n FROM identities WHERE room_id=? AND status='approved'").bind(row.id).first()).n};}
function canJoin(row){const state=roomState(row);return row.joins_open&&state.session.status!=='ended'&&Date.now()-row.organizer_seen_at<DAY;}
async function write(db,row,state,source,identitySql=[],pendingIdentity=null){
  const nonce=uid(),next=row.version+1,now=Date.now();
  const guard=pendingIdentity?" AND EXISTS(SELECT 1 FROM identities WHERE id=? AND status IN ('pending','duplicate'))":'';
  const args=[JSON.stringify(state),next,nonce,now,row.id,row.version,...(pendingIdentity?[pendingIdentity]:[])];
  const statements=[db.prepare('UPDATE rooms SET state_json=?,version=?,mutation_id=?,updated_at=? WHERE id=? AND version=?'+guard).bind(...args),...identitySql.map(make=>make(nonce)),db.prepare('INSERT INTO changes(room_id,version,source) SELECT id,version,? FROM rooms WHERE id=? AND mutation_id=?').bind(source,row.id,nonce)];
  const results=await db.batch(statements);return results[0].meta.changes>0;
}
function leaderboard(state){
  const rows=state.players.map(p=>{const s=stats(state,p.id);return {id:p.id,name:p.name,...s,partners:undefined,scored:s.wins+s.losses,points:s.wins*3+s.losses,rank:null};});
  const qualified=rows.filter(p=>p.scored>=3).sort((a,b)=>b.points-a.points||b.rate-a.rate||b.wins-a.wins||a.name.localeCompare(b.name));
  qualified.forEach((p,i)=>p.rank=i+1);
  return [...qualified,...rows.filter(p=>p.scored<3).sort((a,b)=>a.name.localeCompare(b.name))];
}
async function playerView(db,row,identity){
  const state=roomState(row),participant=state.players.find(p=>p.id===identity.player_id);
  const common={version:row.version,identityStatus:identity.status,name:identity.name,session:{name:state.session.name,venue:state.session.venue,status:state.session.status},organizerOnline:Date.now()-row.organizer_seen_at<90000,joinsOpen:!!row.joins_open};
  if(identity.status!=='approved'||!participant)return common;
  const board=leaderboard(state),myStats=stats(state,participant.id),ordered=queue(state),court=state.courts.find(c=>c.teams?.flat().includes(participant.id));
  const playerName=id=>state.players.find(p=>p.id===id)?.name||'Former player';
  return {...common,playerId:participant.id,name:participant.name,rating:participant.rating,status:playerState(state,participant.id),waitSince:participant.waitSince,queuePosition:ordered.findIndex(p=>p.id===participant.id)+1,queueLength:ordered.length,restUntil:participant.lastEnd?participant.lastEnd+(state.settings.rest||0)*60000:0,stats:myStats,rank:board.find(p=>p.id===participant.id)?.rank,minimumGames:3,leaderboard:board,
    assignment:court?{id:court.id,name:court.name,status:court.status,startedAt:court.startedAt,teammate:court.teams.find(t=>t.includes(participant.id)).filter(id=>id!==participant.id).map(playerName),opponents:court.teams.find(t=>!t.includes(participant.id)).map(playerName)}:null,
    history:state.history.filter(m=>m.teams.flat().includes(participant.id)).map(m=>{const team=m.teams.findIndex(t=>t.includes(participant.id));return {id:m.id,court:m.court,scores:m.scores?[m.scores[team],m.scores[1-team]]:null,winner:m.winner,outcome:m.winner===null?'Casual':m.winner===team?'Win':'Loss',teammates:m.teams[team].filter(id=>id!==participant.id).map(playerName),opponents:m.teams[1-team].map(playerName),endedAt:m.endedAt,note:m.note||''};}).sort((a,b)=>b.endedAt-a.endedAt)};
}
async function limit(db,request,invite,secret){const key=await hash((request.headers.get('cf-connecting-ip')||'local')+secret+invite+Math.floor(Date.now()/60000));const row=await db.prepare('INSERT INTO rate_limits(key,count) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key).first();if(row.count>12)fail('Too many join attempts. Wait a minute and try again.',429);}

export async function portalApi(request,env){
 try{
  if(!env.DB)fail('Shared storage is unavailable. Please try again shortly.',503);
  const db=env.DB,url=new URL(request.url),scoped=url.pathname.startsWith('/api/host/'),path=scoped?url.pathname.replace('/api/host/','/api/organizer/'):url.pathname,method=request.method;
  if(path.startsWith('/api/organizer/')){
    const hostToken=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
    if(scoped?!/^[A-Za-z0-9_-]{43,100}$/.test(hostToken):!secretEqual(request.headers.get('x-organizer-key'),env.PORTAL_API_KEY))fail('Organizer authorization required.',401);
    const hostHash=scoped?await hash(hostToken):null;
    if(path==='/api/organizer/rooms'&&method==='POST'){
      const data=await body(request),state=validateState(data.state),clientId=String(data.clientSessionId||'');
      if(!clientId||clientId.length>120)fail('Invalid session identifier.');
      let row=await db.prepare('SELECT * FROM rooms WHERE client_session_id=?').bind(clientId).first();
      if(scoped)await limit(db,request,'organizer-create',env.PORTAL_API_KEY||'');
      if(!row){const id=uid(),invite=random(),now=Date.now();const statements=[db.prepare('INSERT INTO rooms(id,client_session_id,invite,state_json,mutation_id,organizer_seen_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(client_session_id) DO NOTHING').bind(id,clientId,invite,JSON.stringify(state),uid(),now,now,now)];if(scoped)statements.push(db.prepare('INSERT INTO room_organizers(room_id,token_hash) SELECT id,? FROM rooms WHERE id=?').bind(hostHash,id));await db.batch(statements);row=await db.prepare('SELECT * FROM rooms WHERE client_session_id=?').bind(clientId).first();}
      if(scoped){const owner=await db.prepare('SELECT token_hash FROM room_organizers WHERE room_id=?').bind(row.id).first();if(!secretEqual(owner?.token_hash,hostHash))fail('This session belongs to another organizer. Open it on the original organizer device.',403);}
      return json(await organizerView(db,row));
    }
    const match=path.match(/^\/api\/organizer\/rooms\/([^/]+)(?:\/(settings|approve|reject))?$/);if(!match)fail('Not found.',404);
    let row=await getRoom(db,match[1]);if(!row)fail('Session not found.',404);
    if(scoped){const owner=await db.prepare('SELECT token_hash FROM room_organizers WHERE room_id=?').bind(row.id).first();if(!secretEqual(owner?.token_hash,hostHash))fail('Organizer access to this session is required.',403);}
    const operation=match[2];
    if(method==='GET'&&!operation){if(Date.now()-row.organizer_seen_at>30000)await db.prepare('UPDATE rooms SET organizer_seen_at=? WHERE id=?').bind(Date.now(),row.id).run();return json(await organizerView(db,row));}
    if(method==='PUT'&&!operation){
      const data=await body(request);let state=validateState(data.state);
      if((state.session.id||'legacy-'+state.session.startedAt)!==row.client_session_id)fail('This data belongs to a different session.');
      if(Number(data.version)!==row.version){const changed=(await db.prepare('SELECT source FROM changes WHERE room_id=? AND version>?').bind(row.id,Number(data.version)||0).all()).results;if(!changed.length||changed.some(c=>c.source!=='join'))return json({conflict:true,...await organizerView(db,row)},409);}
      for(let attempt=0;attempt<5;attempt++){
        const remote=roomState(row);const additions=remote.players.filter(p=>!state.players.some(q=>q.id===p.id));
        const joined=(await db.prepare("SELECT player_id FROM identities WHERE room_id=? AND status='approved'").bind(row.id).all()).results;
        state.players.push(...additions.filter(p=>joined.some(j=>j.player_id===p.id)));
        state=validateState(state);
        if(await write(db,row,state,'organizer')){await db.prepare('UPDATE rooms SET organizer_seen_at=? WHERE id=?').bind(Date.now(),row.id).run();return json(await organizerView(db,await getRoom(db,row.id)));}
        row=await getRoom(db,row.id);
        return json({conflict:true,...await organizerView(db,row)},409);
      }
    }
    if(method==='POST'&&operation==='settings'){
      const data=await body(request);if(typeof data.requireApproval!=='boolean'||typeof data.joinsOpen!=='boolean')fail('Invalid join settings.');
      await db.prepare('UPDATE rooms SET require_approval=?,joins_open=? WHERE id=?').bind(+data.requireApproval,+data.joinsOpen,row.id).run();return json(await organizerView(db,await getRoom(db,row.id)));
    }
    if(method==='POST'&&['approve','reject'].includes(operation)){
      const data=await body(request),identity=await db.prepare('SELECT * FROM identities WHERE room_id=? AND id=?').bind(row.id,data.identityId).first();if(!identity||!['pending','duplicate'].includes(identity.status))fail('This request has already been handled.');
      if(operation==='reject'){const rejected=await db.prepare("UPDATE identities SET status='rejected' WHERE id=? AND status IN ('pending','duplicate')").bind(identity.id).run();if(!rejected.meta.changes)fail('This request has already been handled.');return json(await organizerView(db,row));}
      for(let attempt=0;attempt<5;attempt++){
        const latestIdentity=await db.prepare('SELECT status FROM identities WHERE id=?').bind(identity.id).first();if(latestIdentity.status==='approved')return json(await organizerView(db,await getRoom(db,row.id)));if(latestIdentity.status==='rejected')fail('This request was declined.');
        row=await getRoom(db,row.id);const state=roomState(row);if(state.session.status==='ended')fail('This session is completed.');
        const playerId=identity.duplicate_player_id||identity.player_id;
        if(!identity.duplicate_player_id&&!state.players.some(p=>p.id===playerId)){if(state.players.length>=120)fail('This session has reached its 120-player limit.');state.players.push({id:playerId,name:identity.name,rating:identity.rating,status:'waiting',waitSince:Date.now(),totalWait:0,priority:0,lock:null});}
        if(await write(db,row,state,'join',[nonce=>db.prepare("UPDATE identities SET status='approved',player_id=? WHERE id=? AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND mutation_id=?)").bind(playerId,identity.id,row.id,nonce)],identity.id))return json(await organizerView(db,await getRoom(db,row.id)));
      }fail('Session is busy. Try approving again.',409);
    }
    fail('Method not allowed.',405);
  }
  const match=path.match(/^\/api\/(join|me)\/([A-Za-z0-9_-]{20,80})$/);if(!match)fail('Not found.',404);
  let row=await getInvite(db,match[2]);if(!row)fail('This session link is invalid. Ask the organizer for a new QR code.',404);
  if(match[1]==='join'&&method==='GET')return json({name:roomState(row).session.name,venue:roomState(row).session.venue,status:roomState(row).session.status,canJoin:!!canJoin(row),requireApproval:!!row.require_approval});
  if(match[1]==='join'&&method==='POST'){
    const data=await body(request),token=data.token;if(typeof token!=='string'||! /^[A-Za-z0-9_-]{43,100}$/.test(token))fail('Invalid player identity.');
    const tokenHash=await hash(token);let identity=await db.prepare('SELECT * FROM identities WHERE token_hash=? AND room_id=?').bind(tokenHash,row.id).first();
    if(identity)return json(await playerView(db,row,identity));
    await limit(db,request,row.invite,env.PORTAL_API_KEY||'');
    if(typeof data.name!=='string')fail('Enter your name.');
    const name=data.name.trim().replace(/\s+/g,' '),rating=data.rating==null||data.rating===''?3:Number(data.rating);
    if(!name||name.length>60||!Number.isFinite(rating)||rating<1||rating>5)fail('Enter a name (up to 60 characters) and a skill rating from 1 to 5.');
    for(let attempt=0;attempt<5;attempt++){
      row=await getRoom(db,row.id);if(!canJoin(row))fail('Joining is closed or this session is no longer active. Ask the organizer for help.',403);
      const existing=await db.prepare('SELECT * FROM identities WHERE token_hash=? AND room_id=?').bind(tokenHash,row.id).first();if(existing)return json(await playerView(db,row,existing));
      const state=roomState(row),duplicate=state.players.find(p=>normalizeName(p.name)===normalizeName(name));
      if((await pending(db,row.id)).some(p=>normalizeName(p.name)===normalizeName(name)))fail('A request with this name is already waiting for approval. Use its recovery code or ask the organizer for help.',409);
      const status=duplicate?'duplicate':row.require_approval?'pending':'approved',id=uid(),playerId=uid();
      if(state.players.length>=120)fail('This session has reached its 120-player limit.');
      if(status==='approved')state.players.push({id:playerId,name,rating,status:'waiting',waitSince:Date.now(),totalWait:0,priority:0,lock:null});
      if(await write(db,row,state,'join',[nonce=>db.prepare('INSERT INTO identities(id,room_id,token_hash,player_id,name,rating,status,duplicate_player_id,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rooms WHERE id=? AND mutation_id=?)').bind(id,row.id,tokenHash,playerId,name,rating,status,duplicate?.id||null,Date.now(),row.id,nonce)])){
        identity=await db.prepare('SELECT * FROM identities WHERE id=?').bind(id).first();return json(await playerView(db,await getRoom(db,row.id),identity),201);
      }
    }fail('Session is busy. Please try joining again.',409);
  }
  if(match[1]==='me'&&method==='GET'){
    const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
    if(!/^[A-Za-z0-9_-]{43,100}$/.test(token))fail('Reconnect with your saved player identity.',401);
    const identity=await db.prepare('SELECT * FROM identities WHERE token_hash=? AND room_id=?').bind(await hash(token),row.id).first();if(!identity)fail('Player identity not found. Join this session or use your recovery code.',401);
    return json(await playerView(db,row,identity));
  }
  fail('Method not allowed.',405);
 }catch(e){return json({error:e.status?e.message:'The session service is temporarily unavailable. Please try again.'},e.status||500);}
}
