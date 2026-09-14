// Independent trainer implementation. Indices are 0..6; the center is 3.
export const solved = pins => pins.every(pin => pin === 3);
export function move(pins, links, plate, direction) {
  if (!Number.isInteger(plate) || plate < 0 || plate >= pins.length || ![-1,1].includes(direction)) return null;
  // Like the reference: moving a plate left shifts the pin one hole right.
  const next = pins.map((pin, i) => pin - direction * (i === plate ? 1 : links[plate][i]));
  return next.every(pin => pin >= 0 && pin <= 6) ? next : null;
}
export function randomSource(seed) {
  let n = seed >>> 0;
  return () => {n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296;};
}
export function generate(count = 4, seed = Date.now()) {
  if (![4,5,6,7].includes(count)) throw new RangeError('Plate count must be 4–7');
  const random = randomSource(seed);
  // Directed, direct-only links. Generate from an open lock using reversible legal moves.
  const links = Array.from({length:count}, (_, i) => Array.from({length:count}, (_, j) => i === j ? 0 : random() < .14 + (count-4)*.045 ? (random()<.5?1:-1) : 0));
  links[0][1] = 1; links[1][2] = -1;
  let pins = Array(count).fill(3), path = [], previous = '';
  for (let step=0; step<60+count*15; step++) {
    const candidates=[];
    for(let plate=0;plate<count;plate++) for(const direction of [-1,1]) {
      const next=move(pins,links,plate,direction);
      if(next && next.join(',') !== previous) candidates.push({plate,direction,next});
    }
    if(!candidates.length) break;
    const chosen=candidates[Math.floor(random()*candidates.length)];
    previous=pins.join(','); pins=chosen.next; path.push({plate:chosen.plate,direction:chosen.direction});
  }
  if(solved(pins)) { const next=move(pins,links,0,1); pins=next; path.push({plate:0,direction:1}); }
  return {count,seed:seed>>>0,links,start:[...pins],pins:[...pins],proof:path.reverse().map(({plate,direction})=>({plate,direction:-direction}))};
}

export function blockers(pins, links, plate, direction) {
  return pins.flatMap((pin, i) => {
    const next = pin - direction * (i === plate ? 1 : links[plate][i]);
    return next < 0 || next > 6 ? [i] : [];
  });
}

// Optional session API. All transitions return new state; no DOM or storage required.
export function createSession(count = 4, seed = Date.now(), breakPicks = true) {
  const lock = generate(count, seed);
  // Keep the generator's solution witness out of the public session.
  return {count:lock.count, links:lock.links, start:lock.start, pins:lock.pins,
    breakPicks, damage:0, errors:0, history:[]};
}
export function attempt(state, plate, direction) {
  if(!Number.isInteger(plate) || plate<0 || plate>=state.count || ![-1,1].includes(direction))
    return {state, event:'invalid', blocked:[]};
  if(solved(state.pins)) return {state,event:'open',blocked:[]};
  if(state.breakPicks && state.damage>=2) return {state,event:'broken',blocked:[]};
  const next=move(state.pins,state.links,plate,direction);
  if(next) {
    const updated={...state,pins:next,history:[...state.history,[...state.pins]]};
    return {state:updated,event:solved(next)?'open':'move',blocked:[]};
  }
  const blocked=blockers(state.pins,state.links,plate,direction);
  const damage=state.breakPicks?state.damage+1:state.damage;
  const broken=state.breakPicks && damage>=2;
  return {state:{...state,damage,errors:state.errors+1,
    pins:broken?[...state.start]:state.pins,history:broken?[]:state.history},
    event:broken?'break':'blocked',blocked};
}
export function replacePick(state) {
  return {...state,damage:0,pins:[...state.start],history:[]};
}
export function resetSession(state) {
  return {...replacePick(state),errors:0};
}
export function undo(state) {
  if(!state.history.length || (state.breakPicks && state.damage>=2))return state;
  return {...state,pins:[...state.history[state.history.length-1]],history:state.history.slice(0,-1)};
}
