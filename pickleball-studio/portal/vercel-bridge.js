// Public Vercel bridge. Each request carries a session-specific organizer token;
// the player service verifies it. No service-wide key is used by this bridge.
const portalOrigin='https://pickleball-studio-players.julyanthrs.chatgpt.site';
const json=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export default {
  async fetch(request){
    const url=new URL(request.url),path=url.searchParams.get('portalPath')??(url.pathname.startsWith('/api/portal/')?url.pathname.slice('/api/portal/'.length):'');
    if(!/^rooms(?:\/[a-zA-Z0-9-]+(?:\/(?:settings|approve|reject))?)?$/.test(path))return json('Session endpoint not found.',404);
    if(!['GET','POST','PUT'].includes(request.method))return json('Method not allowed.',405);
    if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return json('Request origin not allowed.',403);
    const authorization=request.headers.get('authorization')||'';
    if(!/^Bearer [A-Za-z0-9_-]{43,100}$/.test(authorization))return json('Reconnect using this session’s organizer device.',401);
    try{
      const body=request.method==='GET'?undefined:await request.text();
      if(body&&new TextEncoder().encode(body).length>2000000)return json('This session is too large to share.',413);
      const response=await fetch(portalOrigin+'/api/host/'+path,{method:request.method,headers:{'Content-Type':'application/json',Authorization:authorization},body,signal:AbortSignal.timeout(10000)});
      if(!response.headers.get('content-type')?.includes('application/json'))return json('The player service is temporarily unavailable. Try again.',502);
      const data=await response.json();if(data.invite)data.joinUrl=portalOrigin+'/join/'+data.invite;
      return Response.json(data,{status:response.status,headers:{'Cache-Control':'no-store'}});
    }catch{return json('The player service could not be reached. Try again shortly.',502);}
  }
};
