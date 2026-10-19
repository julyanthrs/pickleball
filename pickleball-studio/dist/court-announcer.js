export function courtAnnouncementLines(court){
  return [court.name+'.','Team one. '+court.teams[0].join(' and ')+'.',
    'Team two. '+court.teams[1].join(' and ')+'.','Please proceed to '+court.name+'.'];
}

export function announcementVoice(voices){
  // Web Speech exposes names, but no standard gender field. Prefer known female voices.
  const female=/\b(female|aria|jenny|zira|hazel|sonia|susan|heera|samantha|karen|moira|tessa|fiona|victoria|ava|emma|michelle|libby|natasha)(?=\b|neural|multilingual)/i;
  const score=v=>(female.test(v.name)?1000:0)+(/natural|neural/i.test(v.name)?100:0)
    +(/^en-PH$/i.test(v.lang)?40:/^en-US$/i.test(v.lang)?20:0)+(v.localService?10:0);
  return voices.filter(v=>/^en\b/i.test(v.lang)).sort((a,b)=>score(b)-score(a))[0];
}

// Advance only on the voice engine's end events, never an estimated reading time.
export function createCourtAnnouncer({synthesis=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onStatus=()=>{},onComplete=()=>{}}={}){
  const supported=!!synthesis&&typeof Utterance==='function';
  let generation=0,current=null,watchdog,stopWaiting;
  function cancel(){
    generation++;clearTimeout(watchdog);
    stopWaiting?.();stopWaiting=null;
    if(current){current=null;synthesis.cancel();}
  }
  function play(court){
    cancel();
    if(!supported){onStatus({phase:'unavailable',completed:0,total:8});return false;}
    const token=generation,lines=courtAnnouncementLines(court),script=[...lines,...lines];
    let completed=0,voice;
    function fail(error){
      if(token!==generation)return;
      cancel();onStatus({phase:'error',error,completed,total:script.length});
    }
    function speak(){
      if(token!==generation)return;
      const text=completed===lines.length?'Once again. '+script[completed]:script[completed];
      const utterance=new Utterance(text);current=utterance;
      if(voice)utterance.voice=voice;
      const teamLine=[1,2].includes(completed%lines.length);
      utterance.lang=voice?.lang||'en-US';utterance.rate=teamLine?.90:.94;utterance.pitch=1;utterance.volume=1;
      const status=phase=>onStatus({phase,completed,total:script.length,reading:Math.floor(completed/lines.length)+1});
      utterance.onstart=()=>{
        if(token!==generation)return;
        clearTimeout(watchdog);watchdog=setTimeout(()=>fail('interrupted'),90000);status('speaking');
      };
      utterance.onend=()=>{
        if(token!==generation)return;
        clearTimeout(watchdog);current=null;completed++;
        if(completed===script.length){generation++;onStatus({phase:'complete',completed,total:script.length});onComplete();}
        else watchdog=setTimeout(speak,completed===lines.length?1000:400);
      };
      utterance.onerror=e=>fail(e.error||'synthesis-failed');
      status('starting');watchdog=setTimeout(()=>fail('not-started'),8000);
      try{synthesis.speak(utterance);}catch{fail('synthesis-failed');}
    }
    function begin(){
      if(token!==generation)return;
      clearTimeout(watchdog);stopWaiting?.();stopWaiting=null;
      voice=announcementVoice(synthesis.getVoices());speak();
    }
    // Voices often arrive after page load; don't lock the opening line to a male default.
    if(synthesis.getVoices().length||!synthesis.addEventListener)begin();
    else{
      const changed=()=>{if(synthesis.getVoices().length)begin();};
      synthesis.addEventListener('voiceschanged',changed);
      stopWaiting=()=>synthesis.removeEventListener('voiceschanged',changed);
      onStatus({phase:'starting',completed:0,total:script.length,reading:1});
      watchdog=setTimeout(begin,1500);
    }
    return true;
  }
  return {supported,play,cancel};
}
