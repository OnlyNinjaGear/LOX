import {icon} from './icons.js?v=73c0fd1751a8';
export function createReplayViewer(){
 const $=id=>document.getElementById(id),dialog=$('replay-dialog'),board=$('replay-board');
 let replay,index=0,speed=1,playing=false,timer;
 const clear=()=>{clearTimeout(timer);timer=undefined;};
 function schedule(){clear();if(playing)timer=setTimeout(()=>step(1,false),1000/speed);}
 function controls(){
  $('replay-progress').textContent=`${index} / ${replay.frames.length-1}`;
  $('replay-state').textContent=index===replay.frames.length-1?'Победа':'Реплей';
  $('replay-play').innerHTML=icon(playing?'pause':'play');
  $('replay-play').setAttribute('aria-label',playing?'Пауза':'Воспроизвести');
  $('replay-prev').disabled=index===0;$('replay-next').disabled=index===replay.frames.length-1;
  $('replay-speed').textContent=`${speed} ход/с`;
  $('replay-slower').disabled=speed===1;$('replay-faster').disabled=speed===4;
 }
 function draw(animate=true){
  const frame=replay.frames[index];
  [...board.children].forEach((row,i)=>{
   const pin=frame.pins[i],track=row.querySelector('.plate-track');
   row.classList.toggle('selected',i===frame.selected);
   row.classList.toggle('centered',pin===3);
   row.classList.remove('blocked');
   row.setAttribute('aria-label',`Пластина ${i+1}: позиция ${pin+1}`);
   if(Number(track.dataset.position)!==pin){
    clearTimeout(row.motionTimer);row.classList.remove('moving');void row.offsetWidth;
    if(animate)row.classList.add('moving');
    track.style.transform=`translateX(${(3-pin)*100/7}%)`;track.dataset.position=pin;
    row.motionTimer=setTimeout(()=>row.classList.remove('moving'),250);
   }
   if(animate&&frame.blocked.includes(i)){void row.offsetWidth;row.classList.add('blocked');}
  });controls();
 }
 function step(delta,pause=true){
  if(pause){playing=false;clear();}
  index=Math.max(0,Math.min(replay.frames.length-1,index+delta));
  if(index===replay.frames.length-1)playing=false;
  draw();schedule();
 }
 function toggle(){
  if(index===replay.frames.length-1){index=0;draw(false);}
  playing=!playing;controls();schedule();
 }
 function changeSpeed(delta){speed=Math.max(1,Math.min(4,speed+delta));controls();schedule();}
 $('replay-prev').onclick=()=>step(-1);$('replay-next').onclick=()=>step(1);
 $('replay-play').onclick=toggle;$('replay-slower').onclick=()=>changeSpeed(-1);$('replay-faster').onclick=()=>changeSpeed(1);
 $('replay-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{playing=false;clear();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open){playing=false;clear();controls();}});
 dialog.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)&&e.code!=='Space')return;
  e.preventDefault();e.stopPropagation();
  if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1);
  else if(e.key==='ArrowUp')changeSpeed(1);else if(e.key==='ArrowDown')changeSpeed(-1);else if(!e.repeat)toggle();
 });
 return {
  open(data){
   clear();replay=data;index=0;speed=1;playing=true;
   board.innerHTML=data.game.start.map((pin,i)=>`<div class="plate ${pin===3?'centered':''}" role="img" aria-label="Пластина ${i+1}"><div class="rail"><div class="plate-track" data-position="${pin}" style="transform:translateX(${(3-pin)*100/7}%)">${Array.from({length:7},(_,j)=>`<span class="hole ${j===3?'target':''}"></span>`).join('')}</div><span class="fixed-pin" aria-hidden="true"></span></div></div>`).join('');
   draw(false);dialog.showModal();schedule();
  }
 };
}
