import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
const assets={};
for(const name of ['player.html','player.js','player.css','player-updates.js','selects.js','selects.css','icon.svg'])assets['/'+name]=await fs.readFile(path.join('src',name),'utf8');
await fs.mkdir('dist/server',{recursive:true});await fs.mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['worker/index.js'],define:{__PORTAL_ASSETS__:JSON.stringify(assets)},bundle:true,platform:'browser',format:'esm',target:'es2022',outfile:'dist/server/index.js'});
await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');await fs.cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Built public player portal Worker and D1 migrations.');
