import { DatabaseSync } from 'node:sqlite';
export function sqliteD1(filename=':memory:') {
 const database=new DatabaseSync(filename);database.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
 const wrap=(sql,args=[])=>({bind(...values){return wrap(sql,values);},async first(){return database.prepare(sql).get(...args)||null;},async all(){return {results:database.prepare(sql).all(...args)};},async run(){const r=database.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},_sql:sql,_args:args});
 return {prepare:wrap,async batch(statements){database.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>{const r=database.prepare(s._sql).run(...s._args);return {meta:{changes:Number(r.changes)}};});database.exec('COMMIT');return results;}catch(e){database.exec('ROLLBACK');throw e;}},exec:sql=>database.exec(sql),close:()=>database.close()};
}
