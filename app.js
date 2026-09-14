import {generate, move, solved, blockers} from './mechanics/lock-mechanics.mjs';
import {play, setSound} from './sound.js';
const $=id=>document.getElementById(id);
let game, selected=0, history=[], errors=0, reveal=true;
let renderedSeed;

let sound=true, fragile=true, damage=0, blockedRows=[], shakeTimer;
const titles=['Замок ученика','Замок торговца','Замок стражника','Замок мастера'];
function save(){try{sessionStorage.setItem('gothic-practice',JSON.stringify({game,selected,history,errors,reveal,sound,fragile,damage}));}catch{}}
function create(count=game?.count??4){
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  game=generate(count,seed); delete game.proof; selected=0;history=[];errors=0;
  damage=0;clearBlocked();render();feedback('Замок закрыт.');save();
}
function feedback(text,error=false){$('feedback').textContent=text;$('feedback').classList.toggle('error',error);}
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
  document.querySelectorAll('[data-count]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.count===game.count)));
  $('difficulty').textContent=['Простой','Обычный','Сложный','Мастерский'][game.count-4];
  $('chest-name').textContent=titles[game.count-4];
  $('status-label').textContent=done?'Открыт':'Закрыт';$('status-label').classList.toggle('won',done);
  if (renderedSeed !== game.seed) board.innerHTML=game.pins.map((pin,i)=>`<div class="plate ${i===selected?'selected':''} ${pin===3?'centered':''}" data-plate="${i}"><button class="plate-number" data-select="${i}" aria-label="Выбрать пластину ${i+1}" aria-pressed="${i===selected}">${String(i+1).padStart(2,'0')}</button><button class="arrow" data-plate="${i}" data-dir="-1" aria-label="Пластина ${i+1}: влево" ${done?'disabled':''}>‹</button><div class="rail" role="img" aria-label="Пластина ${i+1}: отверстие ${pin+1}"><div class="plate-track" style="transform:translateX(${(3-pin)*100/7}%)">${Array.from({length:7},(_,j)=>`<span class="hole ${j===3?'target':''}"></span>`).join('')}</div><span class="fixed-pin" aria-hidden="true"></span></div><button class="arrow" data-plate="${i}" data-dir="1" aria-label="Пластина ${i+1}: вправо" ${done?'disabled':''}>›</button><span class="plate-state" aria-label="${pin===3?'В центре':'Не в центре'}">${pin===3?'✓':'·'}</span></div>`).join('');
  renderedSeed = game.seed;
  [...board.children].forEach((row, i) => {
    const pin = game.pins[i];
    row.classList.toggle('selected', i === selected);
    row.classList.toggle('centered', pin === 3);
    row.querySelector('[data-select]').setAttribute('aria-pressed', String(i === selected));
    row.querySelectorAll('[data-dir]').forEach(button => { button.disabled = done || (fragile && damage >= 2); });
    row.querySelector('.rail').setAttribute('aria-label', `Штифт ${i+1}: позиция ${pin+1} из 7; цель 4`);
    row.querySelector('.plate-track').style.transform = `translateX(${(3-pin)*100/7}%)`;
    const status = row.querySelector('.plate-state');
    status.textContent = pin === 3 ? '✓' : '·';
    status.setAttribute('aria-label', pin === 3 ? 'В центре' : 'Не в центре');
  });
  $('mobile-left').disabled=done || (fragile && damage>=2);
  $('mobile-right').disabled=done || (fragile && damage>=2);
  $('mobile-action').textContent=done?'Следующий сундук':fragile && damage>=2?'Новая отмычка':`Пластина ${selected+1} · ${fragile ? 2-damage : '∞'}`;
  $('mobile-action').classList.toggle('ready',done || (fragile && damage>=2));
  $('aligned').textContent=`${game.pins.filter(p=>p===3).length} / ${game.count} на месте`;
  $('moves').textContent=history.length;$('errors').textContent=errors;$('undo').disabled=!history.length || (fragile && damage >= 2);
  $('sound').checked=sound;$('fragile').checked=fragile;setSound(sound);
  $('pick-status').textContent=fragile ? (damage>=2?'Отмычка сломана':`Отмычка: ${2-damage} / 2`) : 'Отмычка не ломается';
  $('replace-pick').hidden=!(fragile && damage>=2);
  $('mode-tag').innerHTML=fragile?'Новичок':'Тренировка';
  $('show-links').checked=reveal;
  $('matrix').innerHTML=reveal?`<table aria-label="Связи между пластинами"><thead><tr><th scope="col"><span class="sr-only">Двигаете / следует</span>↘</th>${game.pins.map((_,i)=>`<th scope="col">${i+1}</th>`).join('')}</tr></thead><tbody>${game.links.map((row,i)=>`<tr class="${i===selected?'active':''}"><th scope="row">${i+1}</th>${row.map((value,j)=>`<td class="${i===j?'self':value===1?'same':value===-1?'opposite':''}" aria-label="${i===j?'Сама пластина':value===1?'В ту же сторону':value===-1?'В противоположную сторону':'Нет связи'}">${i===j?'×':value===1?'+':value===-1?'−':'·'}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="hidden-map"><span>?</span><strong>Связи скрыты</strong></div>';
  const related=game.links[selected].flatMap((v,i)=>v?[`${i+1} (${v===1?'+':'−'})`]:[]);
  $('selected-note').innerHTML=`<strong>Пластина ${selected+1}</strong><p>${!reveal?'':related.length?'Влияет на: '+related.join(', '):'Без связей'}</p>`;
  if(done) feedback('Сундук открыт.');
}
function act(plate,dir){
  if(solved(game.pins) || (fragile && damage>=2))return;
  clearBlocked();play('turn');
  selected=plate;
  const next=move(game.pins,game.links,plate,dir);
  if(!next){
    const stuck=blockers(game.pins,game.links,plate,dir);
    errors++;if(fragile)damage++;
    render();shake(stuck);play(fragile && damage>=2?'snap':'impact');
    if(fragile && damage>=2){game.pins=[...game.start];history=[];render();}
    feedback(`Упор в край: ${stuck.length===1?'пластина':'пластины'} ${stuck.map(i=>i+1).join(', ')}. `+(fragile && damage>=2?'Отмычка сломана. Замок сброшен.':'Ход не выполнен.'),true);
  }
  else{play('slide');history.push([...game.pins]);game.pins=next;render();if(!solved(next))feedback(`Пластина ${plate+1} ${dir===-1?'←':'→'}`);}
  save();
}
$('board').addEventListener('click',e=>{const arrow=e.target.closest('[data-dir]');if(arrow){act(+arrow.dataset.plate,+arrow.dataset.dir);return;}const row=e.target.closest('[data-plate]');if(row){selected=+row.dataset.plate;render();save();}});
$('new').onclick=()=>create();
document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{if(+b.dataset.count!==game.count)create(+b.dataset.count);});
$('reset').onclick=()=>{damage=0;clearBlocked();game.pins=[...game.start];history=[];errors=0;render();feedback('Замок сброшен.');save();};
$('undo').onclick=()=>{if(history.length && !(fragile && damage>=2)){clearBlocked();play('turn');play('slide');game.pins=history.pop();render();feedback('Ход отменён.');save();}};
$('sound').onchange=e=>{sound=e.target.checked;setSound(sound);if(sound)play('turn');save();};
$('fragile').onchange=e=>{fragile=e.target.checked;damage=0;clearBlocked();render();feedback(fragile?'Режим: новичок.':'Режим: тренировка.');save();};
$('replace-pick').onclick=()=>{damage=0;game.pins=[...game.start];history=[];clearBlocked();render();play('turn');feedback('Новая отмычка.');save();};
$('show-links').onchange=e=>{reveal=e.target.checked;render();save();};
document.addEventListener('keydown',e=>{
  if(e.code==='Space' || e.key===' '){
    if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||document.querySelector('dialog[open]')||e.target.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])'))return;
    e.preventDefault();
    if(!e.repeat)create();
    return;
  }
  if(document.querySelector('dialog[open]')||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target.matches('input,select,textarea')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){selected=(selected+(e.key==='ArrowUp'?-1:1)+game.count)%game.count;render();save();}
  else act(selected,e.key==='ArrowLeft'?-1:1);
});
try{
 const saved=JSON.parse(sessionStorage.getItem('gothic-practice'));
 if(saved && [4,5,6,7].includes(saved.game?.count) && saved.game.pins.length===saved.game.count && saved.game.pins.every(p=>Number.isInteger(p)&&p>=0&&p<=6) && saved.game.links.length===saved.game.count && saved.game.links.every(r=>r.length===saved.game.count&&r.every(v=>[-1,0,1].includes(v)))) {
 ({game,selected,history,errors,reveal}=saved);
 sound=saved.sound!==false;fragile=saved.fragile===true;damage=Number.isInteger(saved.damage)?Math.max(0,Math.min(2,saved.damage)):0;render();
 if(fragile && damage>=2)feedback('Отмычка сломана.',true);
 }else create();
}catch{create();}

// Keep a single set of settings and connections across desktop and mobile.
const mobileLayout=matchMedia('(max-width: 900px), (pointer: coarse) and (max-height: 600px)');
const setup=document.querySelector('.setup'), connections=document.querySelector('.connections');
const setupHome=document.createComment('settings'), linksHome=document.createComment('connections');
setup.before(setupHome);connections.before(linksHome);
function arrangeMobile(){
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
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
$('replace-pick').addEventListener('click',()=>$('mobile-menu').close());
$('mobile-left').onclick=()=>act(selected,-1);
$('mobile-right').onclick=()=>act(selected,1);
$('mobile-action').onclick=()=>{if(solved(game.pins))create();else if(fragile && damage>=2)$('replace-pick').click();};
let gesture=null, ignoreClickUntil=0;
$('board').addEventListener('pointerdown',event=>{
 if(!event.isPrimary || event.button!==0 || event.target.closest('button'))return;
 const row=event.target.closest('.plate');if(!row)return;
 gesture={id:event.pointerId,x:event.clientX,y:event.clientY,plate:Number(row.dataset.plate)};
 row.setPointerCapture(event.pointerId);
});
$('board').addEventListener('pointerup',event=>{
 if(!gesture || gesture.id!==event.pointerId)return;
 const {x,y,plate}=gesture;gesture=null;
 const dx=event.clientX-x,dy=event.clientY-y;
 if(Math.abs(dx)>=24 && Math.abs(dx)>Math.abs(dy)*1.3){
   ignoreClickUntil=performance.now()+350;act(plate,dx<0?-1:1);
 }
});
$('board').addEventListener('pointercancel',()=>{gesture=null;});
$('board').addEventListener('lostpointercapture',()=>{gesture=null;});
$('board').addEventListener('click',event=>{
 if(performance.now()<ignoreClickUntil){event.preventDefault();event.stopImmediatePropagation();}
},true);
