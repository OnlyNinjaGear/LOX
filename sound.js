// Short procedural foley buffers, cached once and played only after a gesture.
let context, output;
const cache = new Map(), voices = new Set();
let enabled = true;
export function setSound(value) {
  enabled = value;
  if (!value) for (const voice of voices) { try { voice.stop(); } catch {} }
}
function buffer(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const duration = {turn:.13, slide:.19, impact:.14, snap:.38}[kind];
  const result = context.createBuffer(1, Math.ceil(context.sampleRate*duration), context.sampleRate);
  const samples = result.getChannelData(0);
  let smooth = 0;
  for(let i=0;i<samples.length;i++) {
    const t=i/context.sampleRate, noise=Math.random()*2-1;
    smooth = .84*smooth + .16*noise;
    let value = 0;
    if(kind==='turn') value = .18*smooth*Math.sin(Math.PI*t/duration) + .1*Math.sin(2*Math.PI*(730*t-1200*t*t))*Math.exp(-t*40);
    if(kind==='slide') {
      value = .24*smooth*Math.sin(Math.PI*t/duration);
      // Small metal pin clicks over the rougher sliding plate sound.
      for(const start of [.012,.068,.135]) if(t>=start) value += .13*Math.sin(2*Math.PI*2400*(t-start))*Math.exp(-(t-start)*170);
    }
    if(kind==='impact') value = (.28*Math.sin(2*Math.PI*170*t)+.16*noise)*Math.exp(-t*45);
    if(kind==='snap') {
      value = .35*noise*Math.exp(-t*65);
      for(const start of [0,.045,.11]) if(t>=start) value += .13*Math.sin(2*Math.PI*(1750+start*5000)*(t-start))*Math.exp(-(t-start)*24);
    }
    samples[i] = value*Math.min(1,t/.002);
  }
  cache.set(kind,result);return result;
}
export function play(kind) {
  if(!enabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if(!Audio) return;
    if(!context) { context=new Audio(); output=context.createGain();output.gain.value=.48;output.connect(context.destination); }
    if(context.state==='suspended') context.resume().catch(()=>{});
    if(voices.size>=8) {const oldest=voices.values().next().value;oldest.stop();voices.delete(oldest);}
    const source=context.createBufferSource();source.buffer=buffer(kind);source.connect(output);
    voices.add(source);source.onended=()=>{source.disconnect();voices.delete(source);};source.start();
  } catch { /* Audio failure never interrupts a move. */ }
}
