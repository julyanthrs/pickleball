import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionCloud } from '../dist/cloud.js';
import { demoState } from '../dist/engine.js';
import { playerNotifications } from '../portal/player-updates.js';

async function cloudFixture(t){
  const storage=new Map();
  for(const [key,value] of Object.entries({window:{addEventListener(){}},document:{addEventListener(){}},localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)}})){
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{value,configurable:true});
    t.after(()=>descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key]);
  }
  t.mock.method(globalThis,'setInterval',()=>0);
  const state=demoState(),received=[],requests=[];
  const info={roomId:'room',version:1,state:structuredClone(state),pending:[]};
  t.mock.method(globalThis,'fetch',async(path,options)=>{
    if(path==='/api/portal/rooms')return Response.json(info);
    return new Promise(resolve=>requests.push({path,options,resolve}));
  });
  const cloud=createSessionCloud({getState:()=>state,receive:(v,options)=>received.push({v,options}),connection(){},notice(){}});
  await cloud.enable();state.session.portal={roomId:'room',version:1};
  return {cloud,state,info,received,requests,storage};
}

test('delayed polling cannot replace a local edit or a newer synced state',async t=>{
  const f=await cloudFixture(t);
  const polling=f.cloud.refresh();
  f.state.courts[0].name='New court name';f.cloud.changed(f.state);
  assert.equal(f.requests.length,2);
  f.requests[0].resolve(Response.json(f.info));await polling;
  assert.equal(f.received.length,0);
  f.requests[1].resolve(Response.json({...f.info,version:2,state:structuredClone(f.state)}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.received.length,1);
  assert.equal(f.received[0].v.state.courts[0].name,'New court name');
});

test('approval waits for unsynced changes instead of discarding them',async t=>{
  const f=await cloudFixture(t);f.cloud.changed(f.state);
  await assert.rejects(f.cloud.decide('pending',true),/syncing/);
  assert.equal(f.requests.length,1);
  f.requests[0].resolve(new Response('{}',{status:503}));
  await new Promise(resolve=>setImmediate(resolve));
  const approval=f.cloud.decide('pending',true);
  f.requests[1].resolve(new Response('{}',{status:503}));
  await assert.rejects(approval,/Reconnect and sync/);
  assert.ok(f.storage.has('pickleball-outbox-room'));
  assert.ok(f.requests.every(r=>r.options.method==='PUT'));
});

test('player alerts cover court reassignment, pause, completion and older score corrections',()=>{
  const before={session:{status:'live'},status:'pending',assignment:{id:'1',name:'Court 1'},history:[{id:'recent',outcome:'Win'},{id:'old',outcome:'Loss'}]};
  assert.match(playerNotifications(before,{...before,assignment:{id:'2',name:'Court 2'}})[0],/Court 2/);
  assert.match(playerNotifications(before,{...before,status:'playing'})[0],/Match started/);
  assert.deepEqual(playerNotifications(before,{...before,session:{status:'paused'}}),['Session paused. Your assignment is saved.']);
  assert.deepEqual(playerNotifications(before,{...before,session:{status:'ended'}}),['Session complete. Your results are saved.']);
  assert.deepEqual(playerNotifications(before,{...before,history:[before.history[0],{id:'old',outcome:'Win'}]}),['Your match result was updated.']);
  assert.deepEqual(playerNotifications(before,structuredClone(before)),[]);
});
