import {validateReclubURL,RECLUB_UNAVAILABLE} from './dist/reclub-import.js';
// No network access until an approved, documented partner adapter is configured.
export async function reclubResponse(request) {
  const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
  const json=(status,body)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method==='GET')return json(200,{available:false,message:RECLUB_UNAVAILABLE});
  if(request.method!=='POST')return json(405,{error:'Use GET or POST.'});
  try{
    const text=await request.text();if(text.length>4096)return json(413,{error:'The event link is too long.'});
    const body=JSON.parse(text);validateReclubURL(body.url);
    return json(503,{code:'integration_unavailable',error:RECLUB_UNAVAILABLE});
  }catch(error){return json(400,{error:error instanceof SyntaxError?'Send a valid event link.':error.message});}
}
