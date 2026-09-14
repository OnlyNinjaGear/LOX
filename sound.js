import {createFileSounds} from './sound-files.js?v=57834a056649';
const fileSounds=createFileSounds(new URL('./sounds/',import.meta.url));
// Cached contact-noise foley. Inharmonic resonances stay below the friction layer.
let context, output, enabled=true;
const cache=new Map(), voices=new Set();
const durations={select:.07,insert:.28,turn:.12,slide:.25,impact:.1,bend:.22,snap:.3,remove:.3};
export function setSound(value){enabled=value;if(!enabled)for(const voice of voices){try{voice.stop();}catch{}}}
function buffer(kind,variant){
 const key=kind+variant;if(cache.has(key))return cache.get(key);
 const duration=durations[kind];
 const result=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate);
 const samples=result.getChannelData(0);let low=0,grain=0;
 const pulses={select:[0],insert:[.015,.21],turn:[.01,.085],slide:[.005,.218],impact:[0],bend:[0,.12],snap:[0,.035,.095,.18],remove:[.015,.25]}[kind];
 for(let i=0;i<samples.length;i++){
  const t=i/context.sampleRate,n=Math.random()*2-1;
  low+=.09*(n-low);grain+=.42*(n-grain);
  const friction=grain-low;
  const envelope=Math.sin(Math.PI*t/duration)**2;
  const moving=['insert','slide','remove','turn','bend'].includes(kind);
  let value=moving?(.13*low+.055*friction)*envelope*(.75+.25*Math.sin(t*187+variant)):0;
  for(const start of pulses){
   const age=t-start;if(age<0)continue;
   const snap=kind==='snap',impact=kind==='impact'||kind==='bend';
   const decay=snap?100:impact?115:190;
   value+=(n*.11+low*.25)*Math.exp(-age*decay)*(snap?1.4:1);
   // A damped cluster rather than a pitched electronic note.
   for(const [hz,weight] of [[317,.045],[863,.018],[1471,.009]])
    value+=weight*Math.sin(age*2*Math.PI*(hz+variant*13))*Math.exp(-age*(impact?65:130));
  }
  if(kind==='bend')value+=friction*.08*envelope*(.5+.5*Math.sin(t*t*1600));
  samples[i]=Math.tanh(value)*Math.min(1,t/.0015,Math.max(0,(duration-t)/.008));
 }
 cache.set(key,result);return result;
}
export function play(kind){
 if(!enabled||!(kind in durations))return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  if(!context && navigator.userActivation && !navigator.userActivation.isActive)return;
  if(!context){context=new Audio();output=context.createGain();output.gain.value=.65;output.connect(context.destination);void fileSounds.decode(context);}
  if(context.state==='suspended')context.resume().catch(()=>{});
  if(voices.size>=8){const oldest=voices.values().next().value;oldest.stop();voices.delete(oldest);}
  const source=context.createBufferSource(),custom=fileSounds.get(kind);
  source.buffer=custom||buffer(kind,Math.floor(Math.random()*3));
  source.playbackRate.value=custom?1:.97+Math.random()*.06;
  source.connect(output);voices.add(source);source.onended=()=>{source.disconnect();voices.delete(source);};
  source.start(context.currentTime+(kind==='remove'?.24:kind==='insert'?.02:0));
 }catch{/* Sound cannot block input. */}
}
