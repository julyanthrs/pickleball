export async function organizerProxy(request,env){
 const url=new URL(request.url);
 if(!request.headers.get('oai-authenticated-user-id'))return Response.json({error:'Sign in as the organizer to use live sharing.'},{status:401});
 if(!env.PORTAL_API_KEY||!env.PLAYER_PORTAL_ORIGIN)return Response.json({error:'Live sharing is not configured yet.'},{status:503});
 if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return Response.json({error:'Request origin not allowed.'},{status:403});
 const target=new URL('/api/organizer/'+url.pathname.slice('/api/portal/'.length),env.PLAYER_PORTAL_ORIGIN);
 const headers=new Headers({'Content-Type':'application/json','x-organizer-key':env.PORTAL_API_KEY});
 const response=await fetch(target,{method:request.method,headers,body:request.method==='GET'?undefined:await request.text()});
 const text=await response.text();
 if(!response.headers.get('content-type')?.includes('application/json'))return Response.json({error:'The player service could not be reached.'},{status:502});
 const data=JSON.parse(text);if(data.invite)data.joinUrl=env.PLAYER_PORTAL_ORIGIN+'/join/'+data.invite;
 return Response.json(data,{status:response.status,headers:{'Cache-Control':'no-store'}});
}
