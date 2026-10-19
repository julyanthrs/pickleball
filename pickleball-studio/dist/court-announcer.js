export function courtAnnouncementLines(court){
  return [court.name+'.','Team 1: '+court.teams[0].join(', ')+'.',
    'Team 2: '+court.teams[1].join(', ')+'.','Please proceed to '+court.name+'.'];
}

// Advance only on the voice engine's end events, never an estimated reading time.
export function createCourtAnnouncer({synthesis=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onStatus=()=>{},onComplete=()=>{}}={}){
  const supported=!!synthesis&&typeof Utterance==='function';
  let generation=0,current=null,watchdog;
  function cancel(){
    generation++;clearTimeout(watchdog);
    if(current){current=null;synthesis.cancel();}
  }
  function play(court){
    cancel();
    if(!supported){onStatus({phase:'unavailable',completed:0,total:8});return false;}
    const token=generation,lines=courtAnnouncementLines(court),script=[...lines,...lines];
    let completed=0;
    function fail(error){
      if(token!==generation)return;
      cancel();onStatus({phase:'error',error,completed,total:script.length});
    }
    function speak(){
      if(token!==generation)return;
      const utterance=new Utterance(script[completed]);current=utterance;
      const voices=synthesis.getVoices();
      const voice=voices.find(v=>v.localService&&/^en-PH$/i.test(v.lang))
        ||voices.find(v=>v.localService&&/^en\b/i.test(v.lang))
        ||voices.find(v=>/^en\b/i.test(v.lang));
      if(voice)utterance.voice=voice;
      utterance.lang=voice?.lang||'en-US';utterance.rate=.95;utterance.pitch=1;utterance.volume=1;
      const status=phase=>onStatus({phase,completed,total:script.length,reading:Math.floor(completed/lines.length)+1});
      utterance.onstart=()=>{
        if(token!==generation)return;
        clearTimeout(watchdog);watchdog=setTimeout(()=>fail('interrupted'),90000);status('speaking');
      };
      utterance.onend=()=>{
        if(token!==generation)return;
        clearTimeout(watchdog);current=null;completed++;
        if(completed===script.length){generation++;onStatus({phase:'complete',completed,total:script.length});onComplete();}
        else speak();
      };
      utterance.onerror=e=>fail(e.error||'synthesis-failed');
      status('starting');watchdog=setTimeout(()=>fail('not-started'),8000);
      try{synthesis.speak(utterance);}catch{fail('synthesis-failed');}
    }
    speak();return true;
  }
  return {supported,play,cancel};
}
