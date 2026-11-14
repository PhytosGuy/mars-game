'use strict';
/* =========================================================
   INVENTORY UI: hotbar, grid inventory, storage, crafting
   Left-click picks up / places a stack, right-click picks up half / places one,
   Shift-click quick-moves, drag works too, click outside the window to drop.
   ========================================================= */
const invUI={open:false,tab:'craft',mtab:'inv',held:null,dragFrom:null,moved:false,hover:null};
// the Tab menu: Tab opens it on Inventory, Tab again moves to the next page (Shift+Tab goes back)
const MTABS=[['inv','Inventory'],['missions','Missions'],['colony','Colony'],['research','Research'],['crew','Crew'],['stats','Stats'],['log','Logbook'],['data','Mars data']];
function slotHTML(s,c,i,heldN){
  const n=s?s.n-heldN:0,d=s&&ITEMS[s.id];
  let h=`<div class="slot${c==='inv'&&i<HOTBAR?' hb':''}${c==='inv'&&i===P.hot&&i<HOTBAR?' sel':''}" data-c="${c}" data-i="${i}">`;
  if(s&&n>0){h+=`<img src="${iconURL(s.id)}" alt="" draggable="false">`;if(n>1)h+=`<b>${n}</b>`;
    if(d.dur)h+=`<i class="dur"><i style="width:${Math.round(s.d/d.dur*100)}%;background:${s.d/d.dur<0.25?'var(--bad)':s.d/d.dur<0.5?'var(--warn)':'var(--good)'}"></i></i>`}
  return h+'</div>';
}
const heldFrom=(c,i)=>invUI.held&&invUI.held.c===c&&invUI.held.i===i?invUI.held.n:0;
function renderGrid(el,arr,c,a,b){let h='';for(let i=a;i<b;i++)h+=slotHTML(arr[i],c,i,heldFrom(c,i));el.innerHTML=h}
function refreshInvUI(){
  renderHotbar();
  if(!invUI.open||!S)return;
  $('#mtabs').innerHTML=MTABS.map(([k,l])=>`<button class="mtab${invUI.mtab===k?' on':''}" data-mtab="${k}">${l}</button>`).join('');
  const inv=invUI.mtab==='inv';$('#pane-inv').classList.toggle('hidden',!inv);$('#pane-col').classList.toggle('hidden',inv);
  if(!inv){renderMenuPage();return}
  renderPlayerCard();
  renderGrid($('#g-bag'),S.inv,'inv',HOTBAR,INV_SIZE);renderGrid($('#g-hot'),S.inv,'inv',0,HOTBAR);
  const base=nearBase(ME),fab=nearFab(ME);
  $('#inv-sub').textContent=fab?'· at a Fabricator: every recipe':base?'· at base: storage and base recipes':'· in the field: suit recipes only';
  $('#inv-tabs').innerHTML=`<button class="tab ${invUI.tab==='craft'?'on':''}" data-t="craft">Crafting</button><button class="tab ${invUI.tab==='store'?'on':''}" data-t="store" ${base?'':'disabled title="Only at base"'}>Colony storage</button>`;
  if(invUI.tab==='store'&&!base)invUI.tab='craft';

  const pnl=$('#inv-panel');
  if(invUI.tab==='store'){
    pnl.innerHTML=`<div class="grid g9" id="g-sto"></div><div class="storebar"><button class="btn sm" id="b-melt" ${slotsCount(S.storage,'ice')?'':'disabled'}>Melt ice → water</button><span class="sub">Colony: ${S.res.o2.toFixed(0)} kg O₂ · ${Math.round(S.res.water)} L water · ${S.res.food.toFixed(0)} kg food</span></div>`;
    renderGrid($('#g-sto'),S.storage,'sto',0,STORE_SIZE);
  }else{
    let h='';const groups={suit:[],base:[],fab:[]};for(const r of RECIPES)groups[r.st].push(r);
    for(const st of['suit','base','fab']){const ok=stationOK(st,ME);
      h+=`<div class="rgroup"><div class="sub">${STATION_NAME[st]}${ok?'':' · <span class="neg">not here</span>'}</div>`;
      for(const r of groups[st]){const o=ITEMS[r.out[0]];let can=ok||S.mode==='sandbox'&&st!=='fab'&&base;
        const ing=Object.entries(r.in).map(([id,n])=>{const have=slotsCount(S.inv,id)+(base?slotsCount(S.storage,id):0);if(have<n&&S.mode!=='sandbox')can=false;
          return`<span class="ing ${have>=n||S.mode==='sandbox'?'':'miss'}" title="${esc(ITEMS[id].name)}"><img src="${iconURL(id)}" alt="">${have}/${n}</span>`}).join('');
        h+=`<div class="recipe ${can?'':'off'}"><img class="ro" src="${iconURL(r.out[0])}" alt=""><div class="rn"><b>${esc(o.name)}${r.out[1]>1?' ×'+r.out[1]:''}</b><div>${ing}${r.colony?`<span class="ing">+${r.colony.o2} kg colony O₂</span>`:''}</div></div>`+
          `<button class="btn sm" data-craft="${r.id}" ${can?'':'disabled'}>Craft</button></div>`}
      h+='</div>'}
    pnl.innerHTML=h;
  }
  if(invUI.hover)showTip(invUI.hover.c,invUI.hover.i);
}
function renderHotbar(){
  if(!S)return;let h='';
  for(let i=0;i<HOTBAR;i++){const s=S.inv[i],d=s&&ITEMS[s.id];
    h+=`<div class="slot${i===P.hot?' sel':''}" data-h="${i}">`+(s?`<img src="${iconURL(s.id)}" alt="">${s.n>1?`<b>${s.n}</b>`:''}`+
      (d.dur?`<i class="dur"><i style="width:${Math.round(s.d/d.dur*100)}%;background:${s.d/d.dur<0.25?'var(--bad)':s.d/d.dur<0.5?'var(--warn)':'var(--good)'}"></i></i>`:''):'')+`<u>${i+1}</u></div>`}
  h+=`<button class="hbmore" data-more title="Full inventory (Tab)"><i></i><i></i><i></i></button>`;
  const el=$('#hotbar');if(el.innerHTML!==h)el.innerHTML=h;
}
function selectHot(i){P.hot=((i%HOTBAR)+HOTBAR)%HOTBAR;renderHotbar();const s=S.inv[P.hot];const l=$('#hblabel');l.textContent=s?ITEMS[s.id].name:'Empty hand';l.classList.remove('show');void l.offsetWidth;l.classList.add('show');if(typeof onHotbarChange==='function')onHotbarChange()}
function openMenu(tab){
  if(tab===false){if(!invUI.open)return;invUI.open=false;$('#invov').classList.add('hidden');invUI.held=null;$('#cursorstack').classList.add('hidden');$('#tip').classList.add('hidden');renderHotbar();return}
  if(!invUI.open){invUI.open=true;$('#invov').classList.remove('hidden');closePanels(true);if(nearBase(ME)&&invUI.tab!=='craft')invUI.tab='store';mouse.drag=false;sfx(0.08,1400,2,0.04)}
  else sfx(0.04,1900,2,0.03);
  invUI.mtab=tab||'inv';invUI.held=null;$('#cursorstack').classList.add('hidden');$('#tip').classList.add('hidden');refreshInvUI();
}
function openInventory(on){if(on===false||(on===undefined&&invUI.open&&invUI.mtab==='inv'))openMenu(false);else openMenu('inv')}
function cycleMenu(dir){if(!invUI.open){openMenu('inv');return}const i=MTABS.findIndex(t=>t[0]===invUI.mtab);openMenu(MTABS[(i+dir+MTABS.length)%MTABS.length][0])}
/* ---------- menu pages ---------- */
function repWord(r){return r<=-40?'Hostile':r<-10?'Wary':r<15?'Neutral':r<45?'Friendly':'Trusted'}
function renderPlayerCard(){
  const pc=$('#pcard');if(!pc||!S)return;
  const hp=maxHP();
  const bar=(l,v,c,tx)=>`<div class="pbar"><span>${l}</span><i><i style="width:${clamp(v,0,100)}%;background:${c}"></i></i><b>${tx}</b></div>`;
  const chip=(id,label,col)=>`<span class="chip"${col?` style="--bc:${col}"`:''}><img src="${iconURL(id)}" alt="">${label}</span>`,none='<span class="dim">None</span>';
  const ups=Object.keys(S.ups||{}).filter(k=>ITEMS[k]).map(k=>chip(k,esc(ITEMS[k].name))).join('')||none;
  const bf=P.buffs?Object.keys(P.buffs).filter(k=>P.buffs[k]>0).map(k=>chip(BUFFS[k].item,BUFFS[k].name+' '+Math.ceil(P.buffs[k])+'s',BUFFS[k].col)).join(''):'';
  const held=S.inv[P.hot],where=cave.active?Math.round(cave.depth)+' m underground':(typeof curRegion!=='undefined'&&curRegion?curRegion.name:SITE.name);
  const stand=['tharrak','lumari'].filter(sp=>S.met&&S.met[sp]).map(sp=>`<span class="chip">${SPECIES[sp].name} · ${repWord(S.rep[sp]||0)}</span>`).join('');
  pc.innerHTML=`<div class="pc-id"><svg class="emblem" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="20" cy="17" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 32c2.5-5 6.5-7 11-7s8.5 2 11 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
    <div><div class="pc-name">${esc(net.name)}</div><div class="sub">${S.mode==='sandbox'?'Sandbox':'Survival'} · Sol ${solNum()}, ${fmtTime()} · ${esc(where)}</div></div>
</div>
    <div class="pc-grid"><div class="pc-bars">${bar('Health',P.hp/hp*100,'#ff6f61',Math.round(P.hp)+'/'+hp)}${bar('Oxygen',P.o2,'#7fd3ff',Math.round(P.o2)+'%')}${bar('Battery',P.bat,'#ffd34d',Math.round(P.bat)+'%')}${bar('Stamina',P.stam,'#a6e36f',Math.round(P.stam)+'%')}</div>
    <div class="pc-rows"><div><span class="sub">Holding</span>${held?chip(held.id,esc(ITEMS[held.id].name)):none}</div><div><span class="sub">Boosts</span>${bf||none}</div>
    <div><span class="sub">Suit upgrades</span>${ups}</div>${stand?`<div><span class="sub">Standing</span>${stand}</div>`:''}</div></div>`;
}
function renderMissions(){
  let h=`<p class="lead">${S.mode==='sandbox'?'Missions are optional goals in Sandbox (no rewards).':'Track any mission: its next step shows on your compass and as the guide arrow. Objectives count whenever you complete them, tracked or not.'}</p><div class="mlist">`;
  CHAPTERS.forEach((ch,i)=>{const done=missionDone(i),[d,n]=missionProgress(i),tr=S.mission===i;
    h+=`<div class="mcard${done?' done':''}${tr?' tracked':''}"><div class="mhead"><span class="mnum">${String(i+1).padStart(2,'0')}</span><div class="mt"><h4>${esc(ch.title)}</h4><div class="sub">${done?'Complete':d+'/'+n+' objectives'} · ${S.mode==='sandbox'?'no reward':ch.reward.rp+' RP + supplies'}</div></div>`+
      (done?'<span class="mtick">✓</span>':`<button class="btn sm${tr?' primary':''}" data-mission="${tr?-1:i}">${tr?'Tracking':'Track'}</button>`)+`</div>
      <p>${esc(ch.intro)}</p><ul>${ch.objs.map(o=>`<li class="${S.objDone.has(i+':'+o.id)?'done':''}">${esc(o.text)}</li>`).join('')}</ul></div>`});
  $('#col-body').innerHTML=h+'</div>';$('#col-sub').textContent=`· ${S.chapter}/${CHAPTERS.length} complete`;
}
function renderStats(){
  const st=S.stats||{},sum=o=>Object.values(o||{}).reduce((a,b)=>a+b,0),lm=Object.values(S.landmarks||{});
  const rows=[['Sols survived',solNum()],['Walked',fmtDist(st.walkDist||0)],['Driven',fmtDist(st.roverDist||0)],['Modules built',st.built||0],['Items crafted',sum(st.crafted)],['Ore and crystal mined',sum(st.mined)],
    ['Landmarks seen / visited',lm.filter(l=>l.seen).length+' / '+lm.filter(l=>l.visited).length],['Caves entered',Object.keys(S.caves||{}).length],['Regions discovered',Object.keys(S.regions||{}).length],
    ['Species met',Object.keys(S.met||{}).length],['Research complete',S.research.size+' / '+RESEARCH.length],['Missions complete',S.chapter+' / '+CHAPTERS.length],['Colonists',S.crew],['Radiation dose',S.dose.toFixed(2)+' mSv']];
  const mined=Object.entries(st.mined||{}).filter(([k])=>ITEMS[k]).sort((a,b)=>b[1]-a[1]);
  $('#col-body').innerHTML=`<div class="grid2"><div><table class="rt">${rows.map(r=>`<tr><td>${r[0]}</td><td><b>${r[1]}</b></td></tr>`).join('')}</table></div>
    <div><h3>Mined</h3>${mined.length?mined.map(([k,n])=>`<span class="chip"><img src="${iconURL(k)}" alt="">${esc(ITEMS[k].name)} ×${n}</span>`).join(''):'<p class="sub">Nothing yet. Hold left mouse with a drill on ore.</p>'}</div></div>`;
  $('#col-sub').textContent='';
}
function renderMenuPage(){
  const t=invUI.mtab;$('#col-title').textContent=(MTABS.find(x=>x[0]===t)||['',''])[1];
  if(t==='missions')renderMissions();else if(t==='stats')renderStats();
  else{colTab=t==='colony'?'overview':t;renderColony()}
}
/* ---------- feedback ---------- */
function invChanged(id,n){
  renderHotbar();if(invUI.open)refreshInvUI();
  if(!n||n<=0||!ITEMS[id])return;
  const feed=$('#pickfeed');let row=[...feed.children].find(e=>e.dataset.id===id&&!e.classList.contains('out'));
  if(row){row.dataset.n=+row.dataset.n+n;row.querySelector('b').textContent='+'+row.dataset.n;clearTimeout(row._t)}
  else{row=document.createElement('div');row.className='pf';row.dataset.id=id;row.dataset.n=n;row.innerHTML=`<img src="${iconURL(id)}" alt=""><b>+${n}</b> ${esc(ITEMS[id].name)}`;feed.appendChild(row);while(feed.children.length>5)feed.firstChild.remove()}
  row._t=setTimeout(()=>{row.classList.add('out');setTimeout(()=>row.remove(),500)},2600);
  const idx=S.inv.findIndex((s,i)=>i<HOTBAR&&s&&s.id===id);if(idx>=0){const sl=$('#hotbar').children[idx];if(sl){sl.classList.remove('pulse');void sl.offsetWidth;sl.classList.add('pulse')}}
  sfx(0.06,1800,2,0.05);beep(1320,0.05,'sine',0.035,0.02);
}
function sfxCraft(){sfx(0.25,900,1.2,0.06,'bandpass',0,2200);beep(660,0.06,'triangle',0.05,0.05);beep(990,0.08,'triangle',0.05,0.12)}
/* ---------- tooltips ---------- */
function showTip(c,i){
  const arr=c==='sto'?S.storage:S.inv,s=arr[i],tip=$('#tip');if(!s||invUI.held){tip.classList.add('hidden');return}
  const d=ITEMS[s.id];let h=`<b>${esc(d.name)}</b><div class="sub">${d.tool?'Tool'+(d.tier?' · tier '+d.tier:''):d.use==='upgrade'?'Suit upgrade':d.use?'Consumable':'Material'} · ${s.n}/${d.stack}</div><p>${esc(d.desc)}</p>`;
  if(d.dur)h+=`<div class="durbar"><i style="width:${s.d/d.dur*100}%"></i></div><div class="sub">Durability ${Math.round(s.d)}/${d.dur}</div>`;
  const acts=[];if(c==='inv'&&d.use)acts.push(`<button class="btn sm" data-use="${i}">Use</button>`);
  if(c==='inv'&&d.dur&&s.d<d.dur&&nearBase(ME))acts.push(`<button class="btn sm" data-repair="${i}">Repair (${Math.max(1,Math.ceil((1-s.d/d.dur)*3))} Iron Plate)</button>`);
  if(acts.length)h+=`<div class="tipacts">${acts.join('')}</div>`;
  h+=`<div class="sub tiphint">Right-click: half · Shift-click: quick-move · Click outside: drop</div>`;
  tip.innerHTML=h;tip.classList.remove('hidden');
  const el=document.querySelector(`#invov .slot[data-c="${c}"][data-i="${i}"]`);if(el){const r=el.getBoundingClientRect(),w=tip.offsetWidth;let x=r.right+8;if(x+w>innerWidth-8)x=r.left-w-8;tip.style.left=x+'px';tip.style.top=Math.min(r.top,innerHeight-tip.offsetHeight-8)+'px'}
}
/* ---------- mouse handling ---------- */
function slotFromEvent(e){const el=e.target.closest('.slot');if(!el||!el.closest('#invov'))return null;return{c:el.dataset.c,i:+el.dataset.i}}
function placeHeld(dst,n){const h=invUI.held;if(!h)return;if(h.c===dst.c&&h.i===dst.i){invUI.held=null;refreshInvUI();return}
  const ok=act({a:'move',src:{c:h.c,i:h.i},dst,n});
  if(ok){h.n-=n;if(h.n<=0)invUI.held=null}else if(n===h.n)invUI.held=null;
  sfx(0.04,1200,2,0.03);refreshInvUI();updateCursor()}
function updateCursor(e){const cs=$('#cursorstack'),h=invUI.held;if(!h){cs.classList.add('hidden');return}
  const arr=h.c==='sto'?S.storage:S.inv,s=arr[h.i];if(!s){invUI.held=null;cs.classList.add('hidden');return}
  cs.innerHTML=`<img src="${iconURL(s.id)}" alt="">${h.n>1?`<b>${h.n}</b>`:''}`;cs.classList.remove('hidden');if(e){cs.style.left=e.clientX+'px';cs.style.top=e.clientY+'px'}}
$('#invov').addEventListener('mousedown',e=>{
  if(e.target.closest('[data-close]')){openMenu(false);return}
  const mt=e.target.closest('[data-mtab]');if(mt){openMenu(mt.dataset.mtab);return}
  const ms=e.target.closest('[data-mission]');if(ms){trackMission(+ms.dataset.mission);refreshInvUI();return}
  const rs=e.target.closest('[data-res]');if(rs&&!rs.disabled){if(act({a:'research',id:rs.dataset.res})!==false)refreshInvUI();return}
  const tg=e.target.closest('[data-toggle]');if(tg){const list=blds.filter(b=>b.type===tg.dataset.toggle),on=list.some(b=>!b.on);for(const b of list)b.on=on;refreshInvUI();return}
  const t=e.target.closest('[data-t]');if(t&&!t.disabled){invUI.tab=t.dataset.t;refreshInvUI();return}
  const cr=e.target.closest('[data-craft]');if(cr&&!cr.disabled){act({a:'craft',r:cr.dataset.craft,n:e.shiftKey?5:1});refreshInvUI();return}
  const us=e.target.closest('[data-use]');if(us){useSlot(+us.dataset.use);return}
  const rp=e.target.closest('[data-repair]');if(rp){act({a:'repairTool',i:+rp.dataset.repair});refreshInvUI();return}
  if(e.target.id==='b-melt'){act({a:'melt'});refreshInvUI();return}
  const sl=slotFromEvent(e);
  if(!sl){if(invUI.mtab!=='inv'){if(e.target.id==='invov')openMenu(false);return}if(e.target.id==='invov'&&invUI.held){const h=invUI.held;const fw=[Math.sin(P.yaw),Math.cos(P.yaw)];act({a:'drop',src:{c:h.c,i:h.i},n:h.n,fw});invUI.held=null;refreshInvUI();updateCursor()}else if(e.target.id==='invov')openMenu(false);return}
  e.preventDefault();const arr=sl.c==='sto'?S.storage:S.inv,s=arr[sl.i];
  if(invUI.held){placeHeld(sl,e.button===2?1:invUI.held.n);return}
  if(!s)return;
  if(e.shiftKey&&e.button===0){act({a:'quick',src:sl,toStore:invUI.tab==='store'});refreshInvUI();return}
  invUI.held={c:sl.c,i:sl.i,n:e.button===2?Math.ceil(s.n/2):s.n};invUI.dragFrom=sl;invUI.moved=false;
  $('#tip').classList.add('hidden');refreshInvUI();updateCursor(e);
});
$('#invov').addEventListener('mousemove',e=>{
  if(invUI.held){invUI.moved=true;updateCursor(e);return}
  const sl=slotFromEvent(e);if(!sl){if(!e.target.closest('#tip')){invUI.hover=null;$('#tip').classList.add('hidden')}return}
  if(!invUI.hover||invUI.hover.c!==sl.c||invUI.hover.i!==sl.i){invUI.hover=sl;showTip(sl.c,sl.i)}
});
$('#invov').addEventListener('mouseup',e=>{
  if(!invUI.held||!invUI.moved||e.button!==0)return;const sl=slotFromEvent(e);
  if(sl&&invUI.dragFrom&&(sl.c!==invUI.dragFrom.c||sl.i!==invUI.dragFrom.i))placeHeld(sl,invUI.held.n);
});
$('#invov').addEventListener('contextmenu',e=>e.preventDefault());
// the hotbar is clickable: pick a slot, or the ⋯ button for the full inventory
$('#hotbar').addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();if(game.state!=='play')return;const m=e.target.closest('[data-more]');if(m){openInventory(true);return}const s=e.target.closest('[data-h]');if(s&&!invUI.open)selectHot(+s.dataset.h)});
function useSlot(i){const s=S.inv[i];if(!s)return;const d=ITEMS[s.id];if(!d.use){toast(d.tool?'Select it on the hotbar and hold left mouse':'This item can’t be used directly');return}
  if(d.use==='lamp'||d.use==='flare'){if(invUI.open)openInventory(false)}
  act({a:'use',i});refreshInvUI()}
