import {seedNumber,encodeSeed,decodeSeed} from './seed.js?v=9e96a8c1cbcb';
import {generate,move,solved,blockers} from './mechanics/lock-mechanics.mjs?v=7cb0dc9bef19';
const moves='0123456789abcd';
export const MAX_REPLAY_STEPS=20000;
export function moveCode(plate,direction){return moves[plate*2+(direction===1?1:0)];}
export function lockToken(count,seed,fragile=true){
 if(![4,5,6,7].includes(count)||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('Неверный замок');
 return `1.${count}.${seed.toString(36)}.${fragile?1:0}`;
}
export function textLockToken(count,text,fragile=true){
 lockToken(count,seedNumber(text),fragile);
 return `2.${count}.${encodeSeed(text)}.${fragile?1:0}`;
}
export function parseLock(token){
 if(typeof token==='string'&&/^2\.[4-7]\.[0-9a-f]+\.[01]$/.test(token)){
  const [,n,s,f]=token.split('.'),seedText=decodeSeed(s);
  return {count:Number(n),seed:seedNumber(seedText),fragile:f==='1',seedText};
 }

 if(typeof token!=='string'||!/^1\.[4-7]\.[0-9a-z]{1,7}\.[01]$/.test(token))throw new Error('Неверная ссылка');
 const [,n,s,f]=token.split('.'),count=Number(n),seed=parseInt(s,36),fragile=f==='1';
 lockToken(count,seed,fragile);
 return {count,seed,fragile};
}
export function replayFrames(token,path,requireWin=true){
 const spec=parseLock(token);
 if(typeof path!=='string'||path.length>MAX_REPLAY_STEPS||!/^[0-9a-dufg]*$/.test(path))throw new Error('Неверный реплей');
 const game=generate(spec.count,spec.seed),stack=[];
 let pins=[...game.start],damage=0,fragile=spec.fragile,selected=0;
 const frames=[{pins:[...pins],damage,fragile,selected,blocked:[],action:'start'}];
 for(const code of path){
  if(solved(pins)||fragile&&damage>=2)throw new Error('Ходы после завершения');
  let blocked=[],action='move';
  if(code==='u'){
   if(!stack.length)throw new Error('Нет хода для отмены');
   pins=stack.pop();action='undo';
  }else if(code==='f'||code==='g'){
   fragile=code==='g';damage=0;action='mode';
  }else{
   const n=moves.indexOf(code);selected=Math.floor(n/2);
   if(selected>=spec.count)throw new Error('Неверная пластина');
   const direction=n%2?1:-1,next=move(pins,game.links,selected,direction);
   if(next){stack.push([...pins]);pins=next;}
   else{blocked=blockers(pins,game.links,selected,direction);if(fragile)damage++;action='blocked';}
  }
  frames.push({pins:[...pins],damage,fragile,selected,blocked,action});
 }
 if(requireWin&&!solved(pins))throw new Error('Замок не открыт');
 return {spec,game,frames};
}
export function replayToken(token,path){replayFrames(token,path);return token+'.'+path;}
export function parseReplay(value){
 if(typeof value!=='string'||value.length>MAX_REPLAY_STEPS+2100)throw new Error('Слишком длинный реплей');
 const parts=value.split('.');if(parts.length!==5)throw new Error('Неверная ссылка');
 return replayFrames(parts.slice(0,4).join('.'),parts[4]);
}
