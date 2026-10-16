import { portalApi } from '../src/backend.js';
const assets=__PORTAL_ASSETS__;
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/'))return portalApi(request,env);
 const name=url.pathname.startsWith('/join/')||url.pathname==='/'?'/player.html':url.pathname;
 const asset=assets[name];if(asset===undefined)return new Response('Not found',{status:404});
 const type={html:'text/html; charset=utf-8',js:'text/javascript',css:'text/css',svg:'image/svg+xml'}[name.split('.').pop()];
 return new Response(asset,{headers:{'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
}};
