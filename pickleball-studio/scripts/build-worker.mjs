import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
await import('./build-client.mjs');
const assets={};
for(const file of await fs.readdir('dist'))if(/\.(html|js|css|svg|webp)$/.test(file)){
  const binary=file.endsWith('.webp');
  const data=await fs.readFile(path.join('dist',file));
  assets['/'+file]={body:data.toString(binary?'base64':'utf8'),binary};
}
await fs.mkdir('dist/server',{recursive:true});await fs.mkdir('dist/.openai',{recursive:true});
const entry="import {organizerProxy} from './portal/proxy.js';\nconst assets="+JSON.stringify(assets)+";\nexport default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/portal/'))return organizerProxy(request,env);const path=url.pathname==='/'?'/index.html':url.pathname;const value=assets[path];if(value===undefined)return new Response('Not found',{status:404});const ext=path.split('.').pop(),type={html:'text/html; charset=utf-8',js:'text/javascript',css:'text/css',svg:'image/svg+xml',webp:'image/webp'}[ext];const body=value.binary?Uint8Array.from(atob(value.body),c=>c.charCodeAt(0)):value.body;return new Response(body,{headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});}};";
await build({stdin:{contents:entry,resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',target:'es2022',outfile:'dist/server/index.js'});
await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built organizer Worker with private live-sharing proxy.');
