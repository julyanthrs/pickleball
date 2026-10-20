export const STATES = { waiting: 'Waiting', pending: 'Up next', playing: 'Playing', break: 'On break', out: 'Not Checked In', finished: 'Session complete' };
export function stats(state, id) {
  const matches = state.history.filter(m => m.teams.flat().includes(id));
  const scored = matches.filter(m => m.winner !== null);
  const wins = scored.filter(m => m.teams[m.winner].includes(id)).length;
  return { games: matches.length, wins, losses: scored.length - wins, rate: scored.length ? Math.round(wins / scored.length * 100) : 0, partners: new Set(matches.flatMap(m => m.teams.find(t => t.includes(id)).filter(p => p !== id))).size };
}
export function playerState(state, id) {
  if (state.session?.status==='ended') return state.players.find(p=>p.id===id)?.status==='out'?'out':'finished';
  for (const c of state.courts) if (c.teams?.flat().includes(id)) return c.status;
  return state.players.find(p => p.id === id)?.status || 'out';
}
export function queue(state, now = Date.now()) {
  return state.players.filter(p => playerState(state, p.id) === 'waiting').sort((a, b) => (b.priority || 0) - (a.priority || 0) || stats(state, a.id).games - stats(state, b.id).games || a.waitSince - b.waitSince || state.players.indexOf(a) - state.players.indexOf(b));
}
export function cancelPartnerLock(state, id) {
  if (state.session?.status === 'ended') throw new Error('Partner locks are archived for this completed session.');
  const player = state.players.find(p => p.id === id);
  const partner = state.players.find(p => p.id === player?.lock);
  if (!player || !partner || partner.lock !== id) throw new Error('This partner lock is no longer available.');
  if ([player.id, partner.id].some(pid => ['playing', 'pending'].includes(playerState(state, pid)))) {
    throw new Error('Finish the match or release the lineup before cancelling this lock.');
  }
  player.lock = null;
  partner.lock = null;
}
function pairCount(state, a, b, partner) {
  return state.history.filter(m => {
    if (!m.teams.flat().includes(a) || !m.teams.flat().includes(b)) return false;
    const together = m.teams.some(t => t.includes(a) && t.includes(b));
    return partner ? together : !together;
  }).length;
}
export function validateLineup(state, court, teams, now = Date.now()) {
  const ids = teams.flat();
  if (teams.length !== 2 || teams.some(t => t.length !== 2) || new Set(ids).size !== 4) return 'Choose four different players, two on each team.';
  const ps = ids.map(id => state.players.find(p => p.id === id));
  if (ps.some(p => !p || !['waiting', 'pending'].includes(playerState(state, p.id)) || state.courts.some(c => c.id !== court.id && c.teams?.flat().includes(p.id)))) return 'A selected player is unavailable or assigned to another court.';
  if (ps.some(p => p.lock && !teams.some(t => t.includes(p.id) && t.includes(p.lock)))) return 'Locked partners must play together. Choose both players on the same team.';
  if (state.settings.strictSkill && Math.max(...ps.map(p => p.rating)) - Math.min(...ps.map(p => p.rating)) > state.settings.maxGap) return 'These players exceed the allowed skill gap.';
  if (state.settings.rest && ps.some(p => p.lastEnd && now - p.lastEnd < state.settings.rest * 60000)) return 'One or more players still need their configured rest time.';
  if (state.settings.avoidRepeats && ids.some((a, i) => ids.slice(i + 1).some(b => pairCount(state, a, b, true) + pairCount(state, a, b, false) >= 2))) return 'These players have already met twice. Relax encounter limits or choose another lineup.';
  return null;
}
export function suggest(state, court, now = Date.now(), variant = 0) {
  const eligible = queue(state, now).filter(p => !state.settings.rest || !p.lastEnd || now - p.lastEnd >= state.settings.rest * 60000);
  if (eligible.length < 4) return { error: 'Four eligible waiting players are needed. Add players or check their rest and availability.' };
  const candidates = [];
  let bestPriority = Infinity;
  // Prioritize the whole eligible roster; strict locks may require a lower-ranked partner.
  for (let a = 0; a < eligible.length - 3; a++) for (let b = a + 1; b < eligible.length - 2; b++) for (let c = b + 1; c < eligible.length - 1; c++) for (let d = c + 1; d < eligible.length; d++) {
    const priority = (a + b + c + d) * 1000;
    if (priority > bestPriority) continue;
    const ps = [eligible[a], eligible[b], eligible[c], eligible[d]];
    const ids = ps.map(p => p.id);
    const pairs = [[[ids[0], ids[1]], [ids[2], ids[3]]], [[ids[0], ids[2]], [ids[1], ids[3]]], [[ids[0], ids[3]], [ids[1], ids[2]]]];
    for (const teams of pairs) {
      if (validateLineup(state, court, teams, now)) continue;
      if (priority < bestPriority) { candidates.length = 0; bestPriority = priority; }
      const rating = t => t.reduce((sum, id) => sum + state.players.find(p => p.id === id).rating, 0);
      const balance = Math.abs(rating(teams[0]) - rating(teams[1]));
      const repeats = teams.reduce((sum, t) => sum + pairCount(state, ...t, true), 0);
      const opponentRepeats = teams[0].reduce((sum, id) => sum + teams[1].reduce((v, other) => v + pairCount(state, id, other, false), 0), 0);
      candidates.push({ teams, value: priority + balance * (state.settings.mode === 'balanced' ? 60 : 20) + repeats * (state.settings.mode === 'social' ? 80 : 30) + opponentRepeats * 4 });
    }
  }
  candidates.sort((a, b) => a.value - b.value || a.teams.flat().join().localeCompare(b.teams.flat().join()));
  if (!candidates.length) return { error: 'No valid lineup fits the current partner, skill, rest, and encounter rules. Review rotation settings or player availability.' };
  // Regeneration offers a different valid pairing from the same highest-priority group.
  const bestIds = candidates[0].teams.flat().sort().join();
  const best = candidates.filter(x => x.teams.flat().sort().join() === bestIds);
  return best[variant % best.length];
}
export function reserve(state, court, teams, now = Date.now()) {
  if (state.session.status !== 'live' && !(state.session.status === 'paused' && court.status === 'pending')) throw new Error('Resume the session before generating a lineup.');
  if (!['available', 'pending'].includes(court.status)) throw new Error('This court is unavailable for a new lineup.');
  const error = validateLineup(state, court, teams, now);
  if (error) throw new Error(error);
  court.teams = teams;
  court.status = 'pending';
  court.reservedAt = now;
}
export function startMatch(state, court, now = Date.now()) {
  if (state.session.status !== 'live') throw new Error('Resume the session before starting a match.');
  if (court.status !== 'pending') throw new Error('Generate a lineup first.');
  const error = validateLineup(state, court, court.teams, now);
  if (error) throw new Error(error);
  court.status = 'playing';
  court.startedAt = now;
  court.target = state.settings.target;
  court.matchId = crypto.randomUUID();
  court.teams.flat().forEach(id => {
    const p = state.players.find(p => p.id === id);
    p.totalWait = (p.totalWait || 0) + Math.max(0, now - p.waitSince);
    p.priority = 0;
  });
}
export function scoreError(scores, target) {
  if (scores.some(s => !Number.isInteger(s) || s < 0 || s > 999)) return 'Enter whole-number scores between 0 and 999.';
  if (Math.max(...scores) < target || Math.abs(scores[0] - scores[1]) < 2) return `Play to ${target}, win by 2. Use a quick result for a forfeit or special finish.`;
  if (Math.max(...scores) > target && Math.abs(scores[0] - scores[1]) !== 2) return 'An extended game must finish with a two-point margin.';
  return null;
}
export function completeMatch(state, court, result, now = Date.now()) {
  if (court.status !== 'playing' || state.history.some(m => m.id === court.matchId)) throw new Error('This match has already ended.');
  if (!result.scores && ![0, 1, null].includes(result.winner)) throw new Error('Select a winning team or record a casual game.');
  if (result.scores) { const error = scoreError(result.scores, court.target || state.settings.target); if (error) throw new Error(error); }
  const winner = result.scores ? (result.scores[0] > result.scores[1] ? 0 : 1) : result.winner;
  state.history.unshift({ id: court.matchId, court: court.name, teams: structuredClone(court.teams), target: court.target || state.settings.target, scores: result.scores || null, winner, startedAt: court.startedAt, endedAt: now, note: result.note || '' });
  court.teams.flat().forEach(id => { const p = state.players.find(p => p.id === id); p.waitSince = now; p.lastEnd = now; });
  court.teams = null;
  court.status = 'available';
}
export function assertState(state) {
  if (state.courts.some(c => !['playing', 'pending'].includes(c.status) && c.teams)) throw new Error('An available or closed court cannot have assigned players.');
  const assigned = state.courts.filter(c => c.teams).flatMap(c => c.teams.flat());
  if (new Set(assigned).size !== assigned.length) throw new Error('A player cannot be assigned to two courts.');
  if (state.courts.some(c => ['pending', 'playing'].includes(c.status) && (!c.teams || c.teams.flat().length !== 4 || c.teams.some(t => t.length !== 2)))) throw new Error('A doubles match requires four players.');
  if (assigned.some(id => !state.players.some(p => p.id === id && p.status === 'waiting'))) throw new Error('Assigned players must be checked in.');
  if (new Set(state.history.map(m => m.id)).size !== state.history.length) throw new Error('Duplicate match result.');
  return true;
}
export function demoState(now = Date.now()) {
  const names = ['Alex Mercado', 'Bea Santos', 'Chris Uy', 'Dani Reyes', 'Ella Cruz', 'Fio Tan', 'Gio Ramos', 'Hana Lim', 'Isa Garcia', 'Jules Rivera', 'Kai Mendoza', 'Lia Torres', 'Marco Silva', 'Nina Reyes', 'Owen Lee', 'Pia Ramos', 'Quinn Chen', 'Rae Navarro', 'Sam Flores', 'Toni Dela Cruz', 'Uma Santos', 'Vince Tan', 'Wren Lopez', 'Zoe Bautista'];
  const players = names.map((name, i) => ({ id: `p${String(i + 1).padStart(2, '0')}`, name, rating: [3.5, 3, 4, 3, 3.5, 4, 3, 4.5][i % 8], status: 'waiting', waitSince: now - (20 - Math.floor(i / 2)) * 60000, totalWait: 0, lock: null, priority: 0 }));
  const teams = n => [[players[n].id, players[n+1].id], [players[n+2].id, players[n+3].id]];
  const history = [0, 4, 8, 12, 16, 20].map((n, i) => ({ id: `demo-${i}`, court: `Court ${i % 4 + 1}`, teams: teams(n), scores: [11, 7 + i % 3], winner: 0, startedAt: now - (60 - i * 4) * 60000, endedAt: now - (42 - i * 4) * 60000, note: 'Sample match' }));
  return { revision: 0, demo: true, session: { name: 'Wednesday open play', venue: 'The Green Courts', startedAt: now - 64 * 60000, status: 'live', pausedTime: 0 }, settings: { mode: 'balanced', target: 11, rest: 0, strictSkill: false, maxGap: 1, avoidRepeats: false }, players, courts: [
    { id: 'c1', name: 'Court 1', status: 'playing', teams: teams(0), startedAt: now - 12 * 60000, matchId: 'live-1' },
    { id: 'c2', name: 'Court 2', status: 'playing', teams: teams(4), startedAt: now - 8 * 60000, matchId: 'live-2' },
    { id: 'c3', name: 'Court 3', status: 'pending', teams: teams(8), reservedAt: now - 60000 },
    { id: 'c4', name: 'Court 4', status: 'available', teams: null }
  ], history, archive: [], audit: [] };
}
