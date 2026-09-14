import {generate, move, solved, blockers} from './mechanics/lock-mechanics.mjs?v=7cb0dc9bef19';
import {play, setSound} from './sound.js?v=d0aade0092af';
import {icon} from './icons.js?v=ce80afa38b12';
const $=id=>document.getElementById(id);
let game, selected=0, history=[], errors=0, reveal=true;
let renderedSeed, attempts=0;

let sound=true, fragile=true, damage=0, blockedRows=[], shakeTimer;
const titles=['Замок ученика','Замок торговца','Замок стражника','Замок мастера'];
function save(){try{sessionStorage.setItem('gothic-practice',JSON.stringify({game,selected,history,errors,reveal,sound,fragile,damage,attempts}));}catch{}}
function create(count=game?.count??4){
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  game=generate(count,seed); delete game.proof; selected=0;history=[];errors=0;
  damage=0;attempts=0;clearBlocked();render();play('insert');save();
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
  document.querySelectorAll('[data-count]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.count===game.count)));
  $('difficulty').textContent=['Простой','Обычный','Сложный','Мастерский'][game.count-4];
  $('chest-name').textContent=titles[game.count-4];
  $('status-label').innerHTML=icon(damage>=2?'broken':damage===1?'bent':'pick');
  $('status-label').title=damage>=2?'Отмычка сломана':damage===1?'Отмычка погнута':'Отмычка целая';
  $('status-label').setAttribute('aria-label',$('status-label').title);
  if (renderedSeed !== game.seed) board.innerHTML=game.pins.map((pin,i)=>`<div class="plate ${i===selected?'selected':''} ${pin===3?'centered':''}" data-plate="${i}" tabindex="0" aria-label="Пластина ${i+1}"><button class="arrow" data-plate="${i}" data-dir="-1" aria-label="Пластина ${i+1}: влево" ${done?'disabled':''}>‹</button><div class="rail" role="img" aria-label="Пластина ${i+1}: отверстие ${pin+1}"><div class="plate-track" data-position="${pin}" style="transform:translateX(${(3-pin)*100/7}%)">${Array.from({length:7},(_,j)=>`<span class="hole ${j===3?'target':''}"></span>`).join('')}</div><span class="fixed-pin" aria-hidden="true"></span></div><button class="arrow" data-plate="${i}" data-dir="1" aria-label="Пластина ${i+1}: вправо" ${done?'disabled':''}>›</button></div>`).join('');
  renderedSeed = game.seed;
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
      row.motionTimer = setTimeout(() => row.classList.remove('moving'), 250);
    }
  });
  $('mobile-left').disabled=done || (fragile && damage>=2);
  $('mobile-right').disabled=done || (fragile && damage>=2);
  const broken=fragile && damage>=2;
  $('mobile-action').innerHTML=icon(broken?'pick':'new')+`<span>${broken?'Заменить':'Новый замок'}</span>`;
  $('mobile-action').setAttribute('aria-label',broken?'Заменить отмычку':'Новый замок');
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
  $('pick-status').innerHTML=icon(fragile?(damage>=2?'broken':damage===1?'bent':'pick'):'shield')+`<span>${fragile?(damage>=2?'Сломана':damage===1?'Погнута':'Целая'):'Без поломки'}</span>`;
  $('replace-pick').hidden=!broken;
  $('mode-tag').textContent=fragile?'Новичок':'Тренировка';
  $('matrix').innerHTML=reveal?`<table aria-label="Связи между пластинами"><thead><tr><th scope="col"><span class="sr-only">Двигаете / следует</span>↘</th>${game.pins.map((_,i)=>`<th scope="col">${i+1}</th>`).join('')}</tr></thead><tbody>${game.links.map((row,i)=>`<tr class="${i===selected?'active':''}"><th scope="row">${i+1}</th>${row.map((value,j)=>`<td class="${i===j?'self':value===1?'same':value===-1?'opposite':''}" aria-label="${i===j?'Сама пластина':value===1?'В ту же сторону':value===-1?'В противоположную сторону':'Нет связи'}">${i===j?'×':value===1?'+':value===-1?'−':''}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="hidden-map"><span>?</span><strong>Связи скрыты</strong></div>';
  const related=game.links[selected].flatMap((v,i)=>v?[`${i+1} (${v===1?'+':'−'})`]:[]);
  $('selected-note').innerHTML=`<strong>Пластина ${selected+1}</strong><p>${!reveal?'':related.length?'Влияет на: '+related.join(', '):'Без связей'}</p>`;

}
function act(plate,dir){
  if(solved(game.pins) || (fragile && damage>=2))return;
  clearBlocked();attempts++;play('turn');
  if(selected!==plate)play('select');
  selected=plate;
  const next=move(game.pins,game.links,plate,dir);
  if(!next){
    const stuck=blockers(game.pins,game.links,plate,dir);
    errors++;if(fragile)damage++;
    render();shake(stuck);play(fragile?(damage>=2?'snap':'bend'):'impact');
    if(fragile && damage>=2){game.pins=[...game.start];history=[];render();}
  }
  else{play('slide');history.push([...game.pins]);game.pins=next;render();if(solved(next))play('remove');}
  save();
}
function select(plate){if(selected!==plate){selected=plate;play('select');render();save();}}
$('board').addEventListener('click',e=>{const arrow=e.target.closest('[data-dir]');if(arrow){act(+arrow.dataset.plate,+arrow.dataset.dir);return;}const row=e.target.closest('[data-plate]');if(row){select(+row.dataset.plate);}});
$('new').onclick=()=>create();
document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{if(+b.dataset.count!==game.count)create(+b.dataset.count);});
$('reset').onclick=()=>{damage=0;clearBlocked();game.pins=[...game.start];history=[];errors=0;attempts=0;render();play('insert');save();};
$('undo').onclick=()=>{if(history.length && !solved(game.pins) && !(fragile && damage>=2)){clearBlocked();play('turn');play('slide');game.pins=history.pop();attempts++;render();save();}};
$('sound').onclick=()=>{sound=!sound;setSound(sound);if(sound)play('select');render();save();};
$('fragile').onclick=()=>{fragile=!fragile;damage=0;clearBlocked();play('select');render();save();};
$('replace-pick').onclick=()=>{damage=0;attempts=0;errors=0;game.pins=[...game.start];history=[];clearBlocked();render();play('insert');save();};
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
 sound=saved.sound!==false;fragile=saved.fragile===true;damage=Number.isInteger(saved.damage)?Math.max(0,Math.min(2,saved.damage)):0;render();

 }else create();
}catch{create();}

// Keep a single set of settings and connections across desktop and mobile.
const mobileLayout=matchMedia('(max-width: 1100px), (max-height: 700px)');
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
$('mobile-action').onclick=()=>{if(fragile && damage>=2)$('replace-pick').click();else create();};
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

for(const [id,name,label] of [['new','new','Новый замок'],['undo','undo','Отмена'],['reset','reset','Сброс'],['replace-pick','pick','Заменить'],['open-links','links','Связи'],['open-menu','menu','Меню']]) $(id).innerHTML=icon(name)+`<span>${label}</span>`;
$('board').addEventListener('focusin',event=>{const row=event.target.closest('.plate');if(row)select(Number(row.dataset.plate));});
document.querySelectorAll('.game-page button,.game-page .board').forEach(element=>element.addEventListener('contextmenu',event=>event.preventDefault()));
