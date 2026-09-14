export const STATS_KEY='lox-stats-v1';
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function readStats(storage){
 let raw;try{raw=JSON.parse(storage.getItem(STATS_KEY));}catch{}
 const s=raw&&typeof raw==='object'?raw:{};
 return {wins:count(s.wins),losses:count(s.losses),streak:count(s.streak),bestStreak:count(s.bestStreak),moves:count(s.moves),records:Object.fromEntries([4,5,6,7].map(n=>[n,count(s.records?.[n])||null]))};
}
export function updateStats(storage,event){
 const s=readStats(storage);
 if(event.type==='move')s.moves++;
 if(event.type==='win'){
  s.wins++;s.streak++;s.bestStreak=Math.max(s.bestStreak,s.streak);
  if([4,5,6,7].includes(event.count)&&count(event.moves)>0)s.records[event.count]=Math.min(s.records[event.count]??Infinity,event.moves);
 }
 if(event.type==='loss'){s.losses++;s.streak=0;}
 try{storage.setItem(STATS_KEY,JSON.stringify(s));}catch{}
 return s;
}
