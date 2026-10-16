// Player alerts follow real assignments and saved results, including corrections.
export function playerNotifications(previous,next){
  if(!previous)return [];
  const messages=[];
  if(next.session.status==='ended'){
    if(previous.session.status!=='ended')messages.push('Session complete. Your results are saved.');
  }else if(next.session.status==='paused'){
    if(previous.session.status!=='paused')messages.push('Session paused. Your assignment is saved.');
  }else if(next.assignment&&next.session.status==='live'){
    const changed=previous.status!==next.status||previous.assignment?.id!==next.assignment.id||previous.assignment?.name!==next.assignment.name||previous.session.status!=='live';
    if(changed)messages.push(next.status==='playing'?'Match started on '+next.assignment.name+'.':'You’re Up Next! Head to '+next.assignment.name+'.');
  }
  const old=new Map((previous.history||[]).map(m=>[m.id,m]));
  const result=(next.history||[]).find(m=>!old.has(m.id));
  if(result)messages.push('Match result recorded: '+result.outcome+'.');
  else if((next.history||[]).some(m=>JSON.stringify(m)!==JSON.stringify(old.get(m.id))))messages.push('Your match result was updated.');
  return messages;
}
