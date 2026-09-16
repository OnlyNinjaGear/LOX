import {normalizeSeed,seedNumber} from './seed.js?v=9e96a8c1cbcb';
import {textLockToken,lockToken,parseLock,moveCode,replayToken,parseReplay,replayFrames,MAX_REPLAY_STEPS} from './replay.js?v=f5bae173291e';
import {createReplayViewer} from './replay-view.js?v=48db20979776';
import {readStats,updateStats} from './stats.js?v=3415224f3396';
import {generate, move, solved, blockers} from './mechanics/lock-mechanics.mjs?v=7cb0dc9bef19';
import {play, setSound} from './sound.js?v=86f0cde10bb9';
import {icon} from './icons.js?v=73c0fd1751a8';
const $=id=>document.getElementById(id);
let gesture=null,ignoreClickUntil=0;
let seedText='';
let recordPath='',recordMode=true,recordValid=true;
let game, selected=0, history=[], errors=0, reveal=true;
let renderedSeed, attempts=0, breakFlashTimer, roundFinished=false;
let statsStorage;try{statsStorage=window.localStorage;}catch{}

let sound=true, fragile=true, damage=0, blockedRows=[], shakeTimer;
const titles=['Замок ученика','Замок торговца','Замок стражника','Замок мастера'];
function save(){try{sessionStorage.setItem('gothic-practice',JSON.stringify({game,selected,history,errors,reveal,sound,fragile,damage,attempts,roundFinished,recordPath,recordMode,recordValid,seedText}));}catch{}}
function create(count=game?.count??4,seed=crypto.getRandomValues(new Uint32Array(1))[0],text=String(seed)){
  finishDrag();
  seedText=text;$('seed-input').value=seedText;$('seed-error').textContent='';
  game=generate(count,seed); delete game.proof; selected=0;history=[];errors=0;
  damage=0;attempts=0;roundFinished=false;resetRecording();clearBlocked();render();play('insert');save();
}
function currentToken(mode){return seedText?textLockToken(game.count,seedText,mode):lockToken(game.count,game.seed,mode);}
function resetRecording(){recordPath='';recordMode=fragile;recordValid=true;}
function record(code){if(recordPath.length>=MAX_REPLAY_STEPS){recordValid=false;return;}recordPath+=code;}
function renderStats(){
 const s=readStats(statsStorage);
 $('stats-content').innerHTML=`<dl class="stats-grid"><div><dt>Победы</dt><dd>${s.wins}</dd></div><div><dt>Поражения</dt><dd>${s.losses}</dd></div><div><dt>Серия</dt><dd>${s.streak}</dd></div><div><dt>Лучшая серия</dt><dd>${s.bestStreak}</dd></div><div><dt>Всего ходов</dt><dd>${s.moves}</dd></div></dl><h3>Рекорды по ходам</h3><dl class="stats-records">${[4,5,6,7].map(n=>`<div><dt>${n} ${n===4?'пластины':'пластин'}</dt><dd>${s.records[n]??'—'}</dd></div>`).join('')}</dl>`;
}
function finishRound(type){
 if(roundFinished)return;
 roundFinished=true;updateStats(statsStorage,{type,count:game.count,moves:attempts});renderStats();
}
function clearBlocked(){
  clearTimeout(shakeTimer); blockedRows=[];
  document.querySelectorAll('.plate.blocked').forEach(row=>row.classList.remove('blocked'));
}
function shake(indices){
  clearBlocked(); blockedRows=indices;
  const rows=indices.map(i=>$('board').children[i]);
  // Restart one finite CSS animation; only the actual blocking rows are marked.
  void $('board').offsetWidth;
  rows.forEach(row=>row.classList.add('blocked'));
  shakeTimer=setTimeout(clearBlocked,700);
}
function render(){
  const board = $('board');
  const done=solved(game.pins);
  $('share-replay').hidden=!(done&&recordValid&&recordPath.length);
  document.querySelectorAll('[data-count]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.count===game.count)));
  $('difficulty').textContent=['Простой','Обычный','Сложный','Мастерский'][game.count-4];
  $('chest-name').textContent=titles[game.count-4];
  $('status-label').innerHTML=icon(damage>=2?'broken':damage===1?'bent':'pick');
  $('status-label').title=damage>=2?'Заменить сломанную отмычку':damage===1?'Отмычка погнута':'Отмычка целая';
  $('status-label').disabled=!(fragile && damage>=2);
  $('status-label').classList.toggle('broken',fragile && damage>=2);
  $('status-label').setAttribute('aria-label',$('status-label').title);
  if (renderedSeed !== `${game.count}:${game.seed}`) board.innerHTML=game.pins.map((pin,i)=>`<div class="plate ${i===selected?'selected':''} ${pin===3?'centered':''}" data-plate="${i}" tabindex="0" aria-label="Пластина ${i+1}"><button class="arrow" data-plate="${i}" data-dir="-1" aria-label="Пластина ${i+1}: влево" ${done?'disabled':''}>‹</button><div class="rail" role="img" aria-label="Пластина ${i+1}: отверстие ${pin+1}"><div class="plate-track" data-position="${pin}" style="transform:translateX(${(3-pin)*100/7}%)">${Array.from({length:7},(_,j)=>`<span class="hole ${j===3?'target':''}"></span>`).join('')}</div><div class="plate-bed" style="transform:translateX(${(3-pin)*100/7}%)" aria-hidden="true"></div><span class="fixed-pin" aria-hidden="true"></span></div><button class="arrow" data-plate="${i}" data-dir="1" aria-label="Пластина ${i+1}: вправо" ${done?'disabled':''}>›</button></div>`).join('');
  renderedSeed = `${game.count}:${game.seed}`;
  [...board.children].forEach((row, i) => {
    const pin = game.pins[i];
    row.classList.toggle('selected', i === selected);
    row.classList.toggle('centered', pin === 3);

    row.querySelectorAll('[data-dir]').forEach(button => { button.disabled = done || (fragile && damage >= 2); });
    row.querySelector('.rail').setAttribute('aria-label', `Штифт ${i+1}: позиция ${pin+1} из 7; цель 4`);
    const track = row.querySelector('.plate-track');
    const target = `translateX(${(3-pin)*100/7}%)`;
    if (Number(track.dataset.position) !== pin) {
      track.dataset.position = pin;
      clearTimeout(row.motionTimer);
      row.classList.remove('moving');
      void row.offsetWidth;
      row.classList.add('moving');
      track.style.transform = target;
      row.querySelector('.plate-bed').style.transform = target;
      row.motionTimer = setTimeout(() => row.classList.remove('moving'), 250);
    }
  });
  $('mobile-left').disabled=done || (fragile && damage>=2);
  $('mobile-right').disabled=done || (fragile && damage>=2);
  const broken=fragile && damage>=2;
  $('mobile-action').innerHTML=icon('new')+'<span>Новый замок</span>';
  $('mobile-action').setAttribute('aria-label','Новый замок');
  $('mobile-action').classList.toggle('ready',done || broken);
  $('result').hidden=!(done||broken);
  const word=attempts%10===1 && attempts%100!==11?'ход':attempts%10>=2 && attempts%10<=4 && (attempts%100<12 || attempts%100>14)?'хода':'ходов';
  $('result').innerHTML=icon(done?'unlock':'broken')+`<span>${done?'Открыт':'Сломана'} — ${attempts} ${word}</span>`;
  $('undo').disabled=!history.length || broken || done;
  for(const [id,value,label,on,off] of [['sound',sound,'Звук','sound','mute'],['fragile',fragile,'Поломка','bent','shield'],['show-links',reveal,'Связи','links','hidden']]){
    $(id).setAttribute('aria-pressed',String(value));
    $(id).innerHTML=icon(value?on:off)+`<span>${label}</span>`;
    $(id).title=label+(value?' включён':' выключен');
  }
  setSound(sound);
  $('mode-tag').textContent=fragile?'Новичок':'Тренировка';
  $('matrix').innerHTML=reveal?`<table aria-label="Связи между пластинами"><thead><tr><th scope="col"><span class="sr-only">Двигаете / следует</span>↘</th>${game.pins.map((_,i)=>`<th scope="col">${i+1}</th>`).join('')}</tr></thead><tbody>${game.links.map((row,i)=>`<tr class="${i===selected?'active':''}"><th scope="row">${i+1}</th>${row.map((value,j)=>`<td class="${i===j?'self':value===1?'same':value===-1?'opposite':''}" aria-label="${i===j?'Сама пластина':value===1?'В ту же сторону':value===-1?'В противоположную сторону':'Нет связи'}">${i===j?'×':value===1?'+':value===-1?'−':''}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="hidden-map"><span>?</span><strong>Связи скрыты</strong></div>';
  const related=game.links[selected].flatMap((v,i)=>v?[`${i+1} (${v===1?'+':'−'})`]:[]);
  $('selected-note').innerHTML=`<strong>Пластина ${selected+1}</strong><p>${!reveal?'':related.length?'Влияет на: '+related.join(', '):'Без связей'}</p>`;

}
function flashBreak(){
  const overlay=$('break-flash');
  clearTimeout(breakFlashTimer);
  overlay.classList.remove('active');
  void overlay.offsetWidth;
  overlay.classList.add('active');
  breakFlashTimer=setTimeout(()=>overlay.classList.remove('active'),1000);
}
function act(plate,dir){
  finishDrag();
  if(solved(game.pins) || (fragile && damage>=2))return;
  clearBlocked();attempts++;updateStats(statsStorage,{type:'move'});play('turn');
  if(selected!==plate)play('select');
  selected=plate;
  record(moveCode(plate,dir));
  const next=move(game.pins,game.links,plate,dir);
  if(!next){
    const stuck=blockers(game.pins,game.links,plate,dir);
    errors++;if(fragile)damage++;
    render();shake(stuck);play(fragile?(damage>=2?'snap':'bend'):'impact');
    if(fragile && damage>=2){game.pins=[...game.start];history=[];render();flashBreak();finishRound('loss');}
  }
  else{play('slide');history.push([...game.pins]);game.pins=next;render();if(solved(next)){play('remove');finishRound('win');}}
  save();
}
function select(plate){if(selected!==plate){selected=plate;play('select');render();save();}}
$('board').addEventListener('click',e=>{const arrow=e.target.closest('[data-dir]');if(arrow){act(+arrow.dataset.plate,+arrow.dataset.dir);return;}const row=e.target.closest('[data-plate]');if(row){select(+row.dataset.plate);}});
$('new').onclick=()=>create();
document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{if(+b.dataset.count!==game.count)create(+b.dataset.count);});
$('reset').onclick=()=>{finishDrag();damage=0;clearBlocked();game.pins=[...game.start];history=[];errors=0;attempts=0;roundFinished=false;resetRecording();render();play('insert');save();};
$('undo').onclick=()=>{if(history.length && !solved(game.pins) && !(fragile && damage>=2)){clearBlocked();play('turn');play('slide');record('u');game.pins=history.pop();attempts++;updateStats(statsStorage,{type:'move'});render();save();}};
$('sound').onclick=()=>{sound=!sound;setSound(sound);if(sound)play('select');render();save();};
$('fragile').onclick=()=>{const restart=damage>=2;if(restart){roundFinished=false;attempts=0;}fragile=!fragile;damage=0;if(restart)resetRecording();else if(!solved(game.pins))record(fragile?'g':'f');clearBlocked();play('select');render();save();};
$('status-label').onclick=()=>{if(!(fragile && damage>=2))return;damage=0;attempts=0;errors=0;roundFinished=false;game.pins=[...game.start];history=[];resetRecording();clearBlocked();render();play('insert');save();};
$('show-links').onclick=()=>{reveal=!reveal;play('select');render();save();};
document.addEventListener('keydown',e=>{
  if(e.code==='KeyR' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !document.querySelector('dialog[open]') && !e.target.closest('input,select,textarea,[contenteditable]')){e.preventDefault();if(!e.repeat)$('reset').click();return;}
  if(e.code==='Space' || e.key===' '){
    if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||document.querySelector('dialog[open]')||e.target.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])'))return;
    e.preventDefault();
    if(!e.repeat)create();
    return;
  }
  if(document.querySelector('dialog[open]')||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target.matches('input,select,textarea')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){select((selected+(e.key==='ArrowUp'?-1:1)+game.count)%game.count);}
  else act(selected,e.key==='ArrowLeft'?-1:1);
});
try{
 const saved=JSON.parse(sessionStorage.getItem('gothic-practice'));
 if(saved && [4,5,6,7].includes(saved.game?.count) && saved.game.pins.length===saved.game.count && saved.game.pins.every(p=>Number.isInteger(p)&&p>=0&&p<=6) && saved.game.links.length===saved.game.count && saved.game.links.every(r=>r.length===saved.game.count&&r.every(v=>[-1,0,1].includes(v)))) {
 ({game,selected,history,errors,reveal}=saved);
 attempts=Number.isInteger(saved.attempts)?Math.max(0,saved.attempts):history.length+errors;
 roundFinished=saved.roundFinished===true||solved(game.pins)||saved.damage>=2;
 seedText=typeof saved.seedText==='string'&&saved.seedText.length<=128?saved.seedText:String(game.seed);
 if(seedNumber(seedText)!==game.seed)seedText=String(game.seed);
 $('seed-input').value=seedText;
 recordMode=typeof saved.recordMode==='boolean'?saved.recordMode:true;
 recordPath=typeof saved.recordPath==='string'?saved.recordPath:'';recordValid=saved.recordValid===true;
 if(recordValid){try{const last=replayFrames(currentToken(recordMode),recordPath,false).frames.at(-1);recordValid=last.pins.every((p,i)=>p===game.pins[i])&&last.damage===saved.damage&&last.fragile===saved.fragile;}catch{recordValid=false;}}
 sound=saved.sound!==false;fragile=saved.fragile===true;damage=Number.isInteger(saved.damage)?Math.max(0,Math.min(2,saved.damage)):0;render();

 }else create();
}catch{create();}

// Keep a single set of settings and connections across desktop and mobile.
const mobileLayout=matchMedia('(max-width: 1100px), (max-height: 700px)');
const setup=document.querySelector('.setup'), connections=document.querySelector('.connections');
const setupHome=document.createComment('settings'), linksHome=document.createComment('connections');
setup.before(setupHome);connections.before(linksHome);
function arrangeMobile(){
  document.querySelectorAll('.game-sheet[open]').forEach(dialog=>dialog.close());
  if(mobileLayout.matches){$('menu-content').append(setup);$('links-content').append(connections);}
  else{setupHome.after(setup);linksHome.after(connections);}
}
mobileLayout.addEventListener('change',arrangeMobile);arrangeMobile();
$('open-menu').onclick=()=>$('mobile-menu').showModal();
$('open-links').onclick=()=>$('mobile-links').showModal();
document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>button.closest('dialog').close());
document.querySelectorAll('.game-sheet').forEach(dialog=>dialog.addEventListener('click',event=>{
 if(event.target!==dialog)return;
 const rect=dialog.getBoundingClientRect();
 if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)dialog.close();
}));
$('new').addEventListener('click',()=>$('mobile-menu').close());
$('mobile-left').onclick=()=>act(selected,-1);
$('mobile-right').onclick=()=>act(selected,1);
$('mobile-action').onclick=()=>create();
function finishDrag(){
 if(!gesture)return;
 const current=gesture;gesture=null;
 for(const row of $('board').children){
  row.classList.remove('dragging');row.classList.add('drag-settle');
  const track=row.querySelector('.plate-track');
  // Flush the finger position before transitioning back or committing the move.
  void row.offsetWidth;
  const target=`translateX(${(3-game.pins[Number(row.dataset.plate)])*100/7}%)`;
  track.style.transform=target;row.querySelector('.plate-bed').style.transform=target;
  clearTimeout(row.settleTimer);row.settleTimer=setTimeout(()=>row.classList.remove('drag-settle'),250);
 }
 return current;
}
$('board').addEventListener('pointerdown',event=>{
 if(gesture||!event.isPrimary||event.button!==0||event.target.closest('button')||solved(game.pins)||(fragile&&damage>=2))return;
 const row=event.target.closest('.plate');if(!row)return;
 const plate=Number(row.dataset.plate);select(plate);clearBlocked();
 gesture={id:event.pointerId,x:event.clientX,y:event.clientY,plate,step:row.querySelector('.rail').getBoundingClientRect().width/13,amount:0,dragged:false};
 row.setPointerCapture(event.pointerId);
});
$('board').addEventListener('pointermove',event=>{
 if(!gesture||event.pointerId!==gesture.id)return;
 const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
 if(!gesture.dragged){if(Math.abs(dx)<5||Math.abs(dx)<Math.abs(dy)*1.2)return;gesture.dragged=true;}
 event.preventDefault();
 const dir=dx<0?-1:1,allowed=!!move(game.pins,game.links,gesture.plate,dir);
 gesture.amount=Math.max(-1,Math.min(1,dx/Math.max(1,gesture.step)));
 const amount=allowed?gesture.amount:Math.sign(dx)*Math.min(.13,Math.abs(gesture.amount)*.2);
 [...$('board').children].forEach((row,i)=>{
  const factor=i===gesture.plate?1:game.links[gesture.plate][i];if(!factor)return;
  clearTimeout(row.motionTimer);clearTimeout(row.settleTimer);
  row.classList.remove('moving','drag-settle');row.classList.add('dragging');
  const target=`translateX(${(3-game.pins[i]+amount*factor)*100/7}%)`;
  row.querySelector('.plate-track').style.transform=target;
  row.querySelector('.plate-bed').style.transform=target;
 });
});
$('board').addEventListener('pointerup',event=>{
 if(!gesture||gesture.id!==event.pointerId)return;
 const current=finishDrag();
 if(current.dragged){
  ignoreClickUntil=performance.now()+350;
  if(Math.abs(current.amount)>=.35)act(current.plate,current.amount<0?-1:1);
 }
});
$('board').addEventListener('pointercancel',finishDrag);
$('board').addEventListener('lostpointercapture',finishDrag);
window.addEventListener('blur',finishDrag);
window.addEventListener('resize',finishDrag);
$('board').addEventListener('click',event=>{
 if(performance.now()<ignoreClickUntil){event.preventDefault();event.stopImmediatePropagation();}
},true);

for(const [id,name,label] of [['new','new','Новый замок'],['undo','undo','Отмена'],['reset','reset','Сброс'],['open-links','links','Связи'],['open-menu','menu','Меню']]) $(id).innerHTML=icon(name)+`<span>${label}</span>`;
$('board').addEventListener('focusin',event=>{const row=event.target.closest('.plate');if(row)select(Number(row.dataset.plate));});
document.querySelectorAll('.game-page button,.game-page .board').forEach(element=>element.addEventListener('contextmenu',event=>event.preventDefault()));

renderStats();
$('stats-panel').addEventListener('toggle',()=>{if($('stats-panel').open)renderStats();});
window.addEventListener('storage',renderStats);

const replayViewer=createReplayViewer();
$('share-lock').innerHTML=icon('share')+'<span>Поделиться замком</span>';
$('share-replay').innerHTML=icon('play')+'<span>Поделиться реплеем</span>';
$('copy-link').innerHTML=icon('share')+'<span>Копировать</span>';
function showShare(replay=false){
 const url=new URL(location.hostname==='gothic-chest-practice.partplacecorp.chatgpt.site'?'https://onlyninjagear.github.io/LOX/':location.href);url.search='';
 try{
  const token=currentToken(replay?recordMode:fragile);
  url.hash=replay?'replay='+replayToken(token,recordPath):'lock='+token;
 }catch{$('share-note').textContent='Не удалось собрать реплей.';return;}
 document.querySelectorAll('.game-sheet[open]').forEach(d=>d.close());
 $('share-title').textContent=replay?'Поделиться реплеем':'Поделиться замком';
 $('share-note').textContent=replay?'Прохождение до победы':`Сид: ${seedText||game.seed}`;
 $('share-url').value=url.href;$('copy-status').textContent='';$('share-dialog').showModal();
}
$('share-lock').onclick=()=>showShare();
$('share-replay').onclick=()=>{if(solved(game.pins)&&recordValid)showShare(true);};
$('share-close').onclick=()=>$('share-dialog').close();
$('copy-link').onclick=async()=>{
 try{await navigator.clipboard.writeText($('share-url').value);$('copy-status').textContent='Скопировано';}
 catch{$('share-url').focus();$('share-url').select();$('copy-status').textContent='Скопируйте выделенную ссылку';}
};
function loadSharedLink(){
 if(!location.hash)return;
 const params=new URLSearchParams(location.hash.slice(1));
 try{
  if(params.has('replay')){
   const replay=parseReplay(params.get('replay'));
   document.querySelectorAll('dialog[open]').forEach(d=>d.close());replayViewer.open(replay);
  }else if(params.has('lock')){
   const spec=parseLock(params.get('lock'));fragile=spec.fragile;create(spec.count,spec.seed,spec.seedText??String(spec.seed));
   window.history.replaceState(null,'',location.pathname+location.search);
  }
 }catch{
  $('share-title').textContent='Ссылка не открылась';$('share-note').textContent='Замок или реплей повреждён.';
  $('share-url').value=location.href;$('copy-status').textContent='';$('share-dialog').showModal();
 }
}
window.addEventListener('hashchange',loadSharedLink);loadSharedLink();

$('seed-form').addEventListener('submit',event=>{
 event.preventDefault();
 try{
  const text=normalizeSeed($('seed-input').value);
  if(text)create(game.count,seedNumber(text),text);else create();
  $('mobile-menu').close();
 }catch(error){$('seed-error').textContent=error.message;}
});
$('open-seed').innerHTML=icon('lock')+'<span>Открыть</span>';
