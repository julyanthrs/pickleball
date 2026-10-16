import { toString as qrSvg } from './qr.js';

const message=document.querySelector('#present-message'),frame=document.querySelector('#qr-frame'),fullscreen=document.querySelector('#fullscreen');
async function present(){
  try{
    const value=new URLSearchParams(location.hash.slice(1)).get('join');
    if(!value||value.length>2048)throw new Error('Open Invite Players and select Present to display your session QR.');
    const url=new URL(value),local=['localhost','127.0.0.1'].includes(location.hostname);
    const validLocal=local&&url.origin===location.origin&&/^\/player\/join\/[A-Za-z0-9_-]{32}$/.test(url.pathname);
    const validHosted=url.origin==='https://pickleball-studio-players.julyanthrs.chatgpt.site'&&/^\/join\/[A-Za-z0-9_-]{32}$/.test(url.pathname);
    if((!validLocal&&!validHosted)||url.search||url.hash)throw new Error('This session QR link is invalid. Open Invite Players and select Present again.');
    const svg=await qrSvg(url.href,{type:'svg',errorCorrectionLevel:'M',margin:4,color:{dark:'#365C3B',light:'#FFFFFF'}});
    const image=document.querySelector('#session-qr');
    image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    await image.decode();frame.hidden=false;message.hidden=true;
    if(document.fullscreenEnabled)fullscreen.hidden=false;
  }catch(error){message.textContent=error.message||'The QR could not be displayed. Open Invite Players and try again.';}
}
let hideControls;
function showControls(){document.body.classList.add('controls-visible');clearTimeout(hideControls);hideControls=setTimeout(()=>document.body.classList.remove('controls-visible'),2200);}
document.addEventListener('pointermove',showControls,{passive:true});
document.addEventListener('keydown',showControls);
fullscreen.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{fullscreen.title='Use your browser’s full-screen option';}
});
document.addEventListener('fullscreenchange',()=>{fullscreen.setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Enter full screen');fullscreen.title=document.fullscreenElement?'Exit full screen':'Full screen';});
present();
