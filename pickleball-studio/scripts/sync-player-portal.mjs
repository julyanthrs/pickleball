import fs from 'node:fs/promises';
import path from 'node:path';
const target=path.resolve('../pickleball-player-portal');
await fs.mkdir(path.join(target,'src'),{recursive:true});
for(const name of ['player.html','player.js','player.css','player-updates.js'])await fs.copyFile('portal/'+name,path.join(target,'src',name));
for(const name of ['engine.js','selects.js','selects.css','icon.svg'])await fs.copyFile('dist/'+name,path.join(target,'src',name));
const backend=(await fs.readFile('portal/backend.js','utf8')).replace("'../dist/engine.js'","'./engine.js'");await fs.writeFile(path.join(target,'src/backend.js'),backend);
await fs.mkdir(path.join(target,'drizzle/meta'),{recursive:true});
const migration=path.join(target,'drizzle/0000_player_sessions.sql');
try{await fs.access(migration);}catch{await fs.copyFile('portal/schema.sql',migration);await fs.writeFile(path.join(target,'drizzle/meta/_journal.json'),JSON.stringify({version:'7',dialect:'sqlite',entries:[{idx:0,version:'6',when:Date.now(),tag:'0000_player_sessions',breakpoints:true}]},null,2)+'\n');}
console.log('Synchronized self-contained player portal source.');

const ownerMigration=path.join(target,'drizzle/0001_session_organizers.sql');
try{await fs.access(ownerMigration);}catch{await fs.copyFile('portal/migrations/0001_session_organizers.sql',ownerMigration);const journalPath=path.join(target,'drizzle/meta/_journal.json');const journal=JSON.parse(await fs.readFile(journalPath,'utf8'));journal.entries.push({idx:1,version:'6',when:1792195200000,tag:'0001_session_organizers',breakpoints:true});await fs.writeFile(journalPath,JSON.stringify(journal,null,2)+'\n');}
