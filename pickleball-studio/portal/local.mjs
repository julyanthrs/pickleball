import fs from 'node:fs/promises';
import { sqliteD1 } from './sqlite.mjs';
import { portalApi } from './backend.js';
import { fileURLToPath } from 'node:url';
let db;
const localKey=crypto.randomUUID()+crypto.randomUUID();
export async function initializeLocalPortal(){if(db)return;await fs.mkdir(new URL('../.sites/',import.meta.url),{recursive:true});db=sqliteD1(fileURLToPath(new URL('../.sites/player-portal.sqlite',import.meta.url)));const version=db.prepare('PRAGMA user_version');if((await version.first()).user_version===0){db.exec(await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8'));db.exec('PRAGMA user_version=1');}}
export async function localPortal(request){
 if(!db)throw new Error('Initialize the local database before serving requests.');
 const url=new URL(request.url),organizer=url.pathname.startsWith('/api/portal/');
 if(organizer&&request.method!=='GET'&&request.headers.get('origin')!==url.origin)return Response.json({error:'Request origin not allowed.'},{status:403});
 if(organizer)url.pathname=url.pathname.replace('/api/portal/','/api/organizer/');
 else url.pathname=url.pathname.replace('/public-api/','/api/');
 const headers=new Headers(request.headers);headers.delete('x-organizer-key');if(organizer)headers.set('x-organizer-key',localKey);
 const response=await portalApi(new Request(url,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:await request.text()}),{DB:db,PORTAL_API_KEY:localKey});
 const data=await response.json();if(organizer&&data.invite)data.joinUrl=url.origin+'/player/join/'+data.invite;
 return Response.json(data,{status:response.status,headers:{'Cache-Control':'no-store'}});
}
