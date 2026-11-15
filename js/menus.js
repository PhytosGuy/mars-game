'use strict';
/* =========================================================
   HOME SCREEN: Expeditions (your worlds + create new), Settings, Controls
   ========================================================= */
const SITE_COL={jezero:['#d29a6a','#6b3b25'],utopia:['#e0d0c0','#7a6a5e'],gale:['#c97f4e','#55291a'],tharsis:['#9a5440','#2a1612'],elysium:['#dca878','#8a5a3a']};
const SOL_MIN=Math.round(SOL_REAL/60);
const W_OPTS=[
  ['mode','Mode',[['survival','Survival'],['sandbox','Sandbox']],{survival:'Oxygen, water and food run out. Build, explore and keep the crew alive.',sandbox:'Unlimited materials and everything unlocked. Nothing can run out.'}],
  ['difficulty','Difficulty',[['easy','Easy'],['normal','Normal'],['hard','Hard']],{easy:'You take half damage and your oxygen lasts longer.',normal:'The intended challenge.',hard:'50% more damage, and your suit uses oxygen faster.'}],
  ['day','Day & night',[['short','Short'],['normal','Normal'],['long','Long'],['day','Always day'],['night','Always night']],
    {short:`A sol passes in about ${Math.round(SOL_MIN/2)} minutes.`,normal:`A sol (24 h 39 min on Mars) passes in about ${SOL_MIN} minutes.`,long:`A sol passes in about ${SOL_MIN*2} minutes.`,day:'The Sun never sets.',night:'Endless night under the stars and both moons.'}],
  ['weather','Weather & disasters',[['off','Off'],['rare','Rare'],['normal','Normal'],['frequent','Frequent']],
    {off:'No dust storms, quakes, meteor showers, cold snaps or solar storms.',rare:'Disasters come about half as often.',normal:'Storms, quakes and meteors every few sols.',frequent:'Disasters strike about twice as often.'}],
  ['creatures','Creatures',[['peaceful','Peaceful'],['normal','Normal'],['lots','Lots']],{peaceful:'Friendly life only: no hostile creatures.',normal:'Friendly and hostile life.',lots:'Bigger herds, colonies and swarms.'}],
];
const newCfg={name:'',mode:'survival',difficulty:'normal',day:'normal',weather:'normal',creatures:'normal'};
function showScreen(id){for(const s of['title','worlds','sites'])$('#'+s).classList.toggle('hidden',s!==id);game.state=id==='title'?'title':'sites'}
function ago(ms){const s=(Date.now()-ms)/1000;return s<90?'just now':s<3600?Math.round(s/60)+' min ago':s<86400?Math.round(s/3600)+' h ago':Math.round(s/86400)+' days ago'}
const LBL=(k,v)=>{const o=W_OPTS.find(o=>o[0]===k);const x=o&&o[2].find(x=>x[0]===v);return x?x[1]:v};
function renderWorlds(){
  const l=worldsList().sort((a,b)=>b.played-a.played);
  $('#wlist').innerHTML=l.length?l.map(w=>{const c=SITE_COL[w.site]||['#c98a5a','#5a2e1c'],st=w.settings||{};
    return`<div class="wcard" data-w="${esc(w.id)}"><div class="wthumb" style="--c1:${c[0]};--c2:${c[1]}"></div>
      <div class="wi"><b>${esc(w.name)}</b><span>${esc(SITES[w.site]?SITES[w.site].name:w.site)} · ${w.mode==='sandbox'?'Sandbox':'Survival'} · ${esc(LBL('difficulty',st.difficulty||'normal'))}${st.weather&&st.weather!=='normal'?' · weather '+esc(LBL('weather',st.weather)).toLowerCase():''}</span>
      <span>Sol ${w.sol} · ${w.missions}/${CHAPTERS.length} missions · played ${ago(w.played)}</span></div>
      <div class="wb"><button class="btn sm primary" data-play="${esc(w.id)}">Play</button><button class="btn sm" data-del="${esc(w.id)}">Delete</button></div></div>`}).join('')
    :'<div class="wempty">No expeditions yet. Create one to land on Mars.</div>';
}
$('#b-exp').onclick=()=>{initAudio();renderWorlds();showScreen('worlds')};
$('#w-back').onclick=()=>showScreen('title');
$('#wlist').addEventListener('click',async e=>{
  const pl=e.target.closest('[data-play]'),dl=e.target.closest('[data-del]');
  if(dl){if(dl.dataset.sure){deleteWorld(dl.dataset.del);renderWorlds()}else{dl.dataset.sure='1';dl.textContent='Delete forever?';dl.classList.add('primary');setTimeout(()=>{if(dl.isConnected){delete dl.dataset.sure;dl.textContent='Delete';dl.classList.remove('primary')}},3500)}return}
  if(pl){initAudio();const w=worldsList().find(x=>x.id===pl.dataset.play);fade(true,'Loading '+(w?w.name:'expedition')+'…');await wait(600);$('#worlds').classList.add('hidden');
    if(loadGame(pl.dataset.play)){updateChunks(focusPos().x,focusPos().z,999);enterPlay();toast('Welcome back to Mars','good')}else{toast('That expedition couldn’t be loaded','bad');showTitle()}fade(false)}
});
$('#w-new').onclick=()=>{Object.assign(newCfg,{name:'Expedition '+(worldsList().length+1),mode:'survival',difficulty:'normal',day:'normal',weather:'normal',creatures:'normal'});
  $('#w-name').value=newCfg.name;renderSites();renderWOpts();showScreen('sites')};
$('#w-name').addEventListener('keydown',e=>e.stopPropagation());
$('#b-back').onclick=()=>{renderWorlds();showScreen('worlds')};
$('#b-land').onclick=()=>{const name=$('#w-name').value.trim()||newCfg.name;selMode=newCfg.mode;
  startNew(selSite,newCfg.mode,{name,settings:{difficulty:newCfg.difficulty,day:newCfg.day,weather:newCfg.weather,creatures:newCfg.creatures}})};
function renderWOpts(){
  $('#wopts').innerHTML=W_OPTS.map(([k,label,vals,hints])=>`<div class="orow"><span class="sub">${label}</span><div class="opt">${vals.map(([v,l])=>`<button data-k="${k}" data-v="${v}" class="${newCfg[k]===v?'on':''}">${l}</button>`).join('')}</div><div class="hint">${hints[newCfg[k]]||''}</div></div>`).join('');
}
$('#wopts').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;newCfg[b.dataset.k]=b.dataset.v;renderWOpts()});
/* ---------- settings (this device) ---------- */
let setFrom='title';
function renderSettings(){
  const tog=(k,vals)=>`<div class="opt">${vals.map(([v,l])=>`<button data-o="${k}" data-v="${v}" class="${String(k==='quality'?GFX.q:OPT[k])===String(v)?'on':''}">${l}</button>`).join('')}</div>`;
  const C=gc(),gtog=(k,lbl,sub)=>`<div class="srow sub2"><span>${lbl}${sub?`<br><small class="sub">${sub}</small>`:''}</span><div class="opt">${[[true,'On'],[false,'Off']].map(([v,l])=>`<button data-gc="${k}" data-v="${v}" class="${C[k]===v?'on':''}">${l}</button>`).join('')}</div></div>`;
  const sl=(k,min,max,step)=>`<input type="range" data-r="${k}" min="${min}" max="${max}" step="${step}" value="${OPT[k]}"><b>${Math.round(OPT[k]*100)}%</b>`;
  $('#setbody').innerHTML=
    `<div class="srow"><span>Graphics<br><small class="sub">Auto adjusts to keep it smooth${GFX.q==='auto'?` (now ${gfxLevel()}, ${Math.round(GFX.scale*100)}% resolution)`:''}</small></span>${tog('quality',[['auto','Auto'],['high','High'],['medium','Medium'],['low','Low'],['custom','Custom']])}</div>`+
    (GFX.q==='custom'?`<div class="gcbox"><p class="sub">Custom graphics: switch each effect on or off.</p>`+
      gtog('post','Shaders (post-processing)','Turns every screen effect below on or off together')+
      gtog('bloom','Glow (bloom)','Soft glow around lights and the Sun')+
      gtog('grade','Colour grading and vignette','Film-like colours and darker corners')+
      gtog('shadows','Shadows')+gtog('hiShadows','Sharp shadows','Higher-resolution shadow maps')+
      gtog('cel','Cel shading','Cartoon-style banded lighting; applies after you reload the game')+
      `<div class="srow sub2"><span>Resolution</span><input type="range" data-gcr="res" min="0.5" max="1" step="0.05" value="${C.res}"><b>${Math.round(C.res*100)}%</b></div></div>`:'')+
    `<div class="srow"><span>Sound effects on</span>${tog('sound',[[true,'On'],[false,'Off']])}</div>`+
    `<div class="srow"><span>Painted look</span>${tog('paint',[[true,'On'],[false,'Off']])}</div>`+
    `<div class="srow"><span>Music</span>${sl('music',0,1,0.05)}</div>`+
    `<div class="srow"><span>Sound effects</span>${sl('sfx',0,1,0.05)}</div>`+
    `<div class="srow"><span>Look sensitivity</span>${sl('sens',0.3,2,0.05)}</div>`+
    `<div class="srow"><span>Field of view</span><input type="range" data-fov="1" min="50" max="100" step="1" value="${OPT.fov||60}"><b>${OPT.fov||60}°</b></div>`+
    `<div class="srow"><span>Dynamic field of view<br><small class="sub">Widens when you run or drive fast</small></span>${tog('fovAuto',[[true,'On'],[false,'Off']])}</div>`+
    `<div class="srow"><span>Pip, your robot companion</span>${tog('companion',[[true,'On'],[false,'Off']])}</div>`+
    `<div class="srow"><span>Guide arrow</span>${tog('guide',[[true,'On'],[false,'Off']])}</div>`+
    `<div class="srow"><span>Touch controls</span>${tog('touch',[['auto','Auto'],['on','On'],['off','Off']])}</div>`+
    `<div class="srow"><span>Controls<br><small class="sub">Keyboard, mouse and rover controls</small></span><button class="btn sm" id="set-ctrls">View controls</button></div>`+
    `<div class="srow"><span>Tutorial</span><button class="btn sm" id="tour-replay">Replay the tour</button></div>`+
    `<p class="sub" style="line-height:1.5">World options (difficulty, day cycle, weather, creatures) are chosen when you create an expedition.</p>`;
}
function openSettings(from){setFrom=from;renderSettings();$('#settings').classList.toggle('live',game.state==='play');$('#settings').classList.remove('hidden')}
function closeSettings(){$('#settings').classList.add('hidden');saveOpts()}
$('#b-set').onclick=()=>{initAudio();openSettings('title')};
$('#b-mlab').onclick=()=>openMissionLab();
/* ---------- the NASA Mission Lab is its own page (missionlab/) ----------
   From the home screen it opens in this tab; during a game it opens in a new tab so your world keeps running.
   Missions launched there are saved in this browser, and each one gives the colony you're playing research points once. */
function openMissionLab(){const u='missionlab/';if(game.state==='play'){if(document.pointerLockElement)document.exitPointerLock();const w=window.open(u,'_blank');if(!w)location.href=u}else location.href=u}
function labMissions(){try{const a=JSON.parse(localStorage.getItem('mlc_missions')||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function claimLabMissions(){
  if(game.state!=='play'||!S||net.role==='guest')return;const list=labMissions(),fresh=list.filter(m=>!m.claimed&&isNum(m.rp));if(!fresh.length)return;
  let rp=0;for(const m of fresh){rp+=clamp(Math.round(m.rp),0,25);m.claimed=true}
  S.res.rp+=rp;S.stats.missionsDesigned=(S.stats.missionsDesigned||0)+fresh.length;
  try{localStorage.setItem('mlc_missions',JSON.stringify(list))}catch(e){}
  toast(`Mission Lab: ${fresh.length===1?'“'+str(fresh[0].name,40)+'”':fresh.length+' missions'} earned your colony ${rp} research points`,'good')}
addEventListener('focus',claimLabMissions);addEventListener('storage',e=>{if(e.key==='mlc_missions')claimLabMissions()});setInterval(claimLabMissions,8000);
$('#p-set').onclick=()=>openSettings('pause');
$('#set-x').onclick=closeSettings;$('#set-done').onclick=closeSettings;
$('#setbody').addEventListener('click',e=>{
  if(e.target.id==='set-ctrls'){openControls('settings');return}
  if(e.target.id==='tour-replay'){OPT.onboarded=false;saveOpts();closeSettings();if(game.state==='play'){if(game.paused)togglePause(false);startTour()}else toast('The tour will play when you next land');return}
  const g=e.target.closest('[data-gc]');if(g){OPT.gc=Object.assign(gc(),{[g.dataset.gc]:g.dataset.v==='true'});saveOpts();applyGfx();if(g.dataset.gc==='cel')toast('Cel shading changes after you reload the game');renderSettings();return}
  const b=e.target.closest('[data-o]');if(!b)return;const k=b.dataset.o,v=b.dataset.v;
  if(k==='quality'){GFX.q=v;GFX.autoLvl=null;GFX.scale=1;applyGfx()}
  else if(k==='paint'||k==='guide'||k==='fovAuto'||k==='companion')OPT[k]=v==='true';
  else if(k==='sound'){AU.sound=v==='true';OPT.sound=AU.sound}
  else if(k==='touch'){OPT.touch=v;if(v==='off')document.body.classList.remove('touch');else if(v==='on'||matchMedia('(pointer:coarse)').matches)enableTouch()}
  saveOpts();renderSettings()});
/* ---------- one window at a time ----------
   Opening any window closes whichever one was open. A window opened from the pause menu
   hides the pause menu, and closing it brings the pause menu back. */
const WINS=['pause','settings','controls','coop','account','friends','mapov','wardrobe','invov','journalov','creator','habcol'];
const winOpen=id=>!$('#'+id).classList.contains('hidden');
function closeWin(id){
  if(!winOpen(id))return;
  if(id==='invov'&&invUI.open)openInventory(false);
  else if(id==='wardrobe'&&game.wardrobe)closeWardrobe();
  else if(id==='journalov')closeJournal();
  else if(id==='creator')closeCreator();
  else if(id==='settings')closeSettings();
  else if(id==='coop'){closeCoop();if(net.peer&&!net.role)leaveNet(true)}
  else $('#'+id).classList.add('hidden');
}
function topWin(){return WINS.slice().reverse().find(id=>id!=='pause'&&winOpen(id))||null}
const winWatch=(recs=>{
  for(const r of recs){const id=r.target.id,was=(r.oldValue||'').split(/\s+/).includes('hidden'),now_=!r.target.classList.contains('hidden');
    if(was&&now_)for(const o of WINS)if(o!==id)closeWin(o);}
  // nothing else open while the game is paused: show the pause menu again
  if(game.state==='play'&&game.paused&&!S.over&&!topWin()&&!winOpen('pause'))$('#pause').classList.remove('hidden');
});
{const mo=new MutationObserver(winWatch);for(const id of WINS)mo.observe($('#'+id),{attributes:true,attributeFilter:['class'],attributeOldValue:true})}
// Escape closes the open window first (on the home screen too)
addEventListener('keydown',e=>{if(e.key!=='Escape')return;
  const w=['settings','controls','coop','account','friends','journalov','creator','habcol'].find(winOpen);if(w){e.stopImmediatePropagation();e.preventDefault();closeWin(w)}},true);
$('#setbody').addEventListener('input',e=>{const gr=e.target.closest('[data-gcr]');if(gr){OPT.gc=Object.assign(gc(),{res:+gr.value});gr.nextElementSibling.textContent=Math.round(+gr.value*100)+'%';saveOpts();applyGfx();return}const fv=e.target.closest('[data-fov]');if(fv){OPT.fov=+fv.value;fv.nextElementSibling.textContent=OPT.fov+'°';camera.fov=OPT.fov;camera.updateProjectionMatrix();saveOpts();return}const r=e.target.closest('[data-r]');if(!r)return;OPT[r.dataset.r]=+r.value;r.nextElementSibling.textContent=Math.round(+r.value*100)+'%';if(r.dataset.r==='music'&&+r.value>0)AU.music=true;saveOpts()});
