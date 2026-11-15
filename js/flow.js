'use strict';

/* =========================================================
   GAME FLOW
   ========================================================= */
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function fade(on,text=''){const f=$('#fade');if(on&&text){const ft=typeof randomFact==='function'?randomFact():'';f.innerHTML=`<div>${esc(text)}</div>`+(ft?`<div class="ffact"><b>NASA fact</b>${esc(ft)}</div>`:'')}f.classList.toggle('on',on)}
async function fadeFlash(){fade(true);await wait(700);fade(false)}
const LANDER_X=-28,LANDER_Z=24;
function spawnStaticLander(){staticLander=mkLander();const x=LANDER_X,z=LANDER_Z;staticLander.position.set(x,groundHeight(x,z),z);staticLander.rotation.y=0.6;scene.add(staticLander)}
function spawnBase(){
  addBuilding('habitat',0,0,0,1);
  addBuilding('solar',16,-8,0,1);addBuilding('solar',16,-1,0,1);addBuilding('solar',16,6,0,1);
  addBuilding('battery',-11,-7,0.4,1);
}
function placeActors(){
  P.mode='foot';P.o2=100;P.pos.set(-14,0,10);P.pos.y=groundHeight(P.pos.x,P.pos.z);P.vel.set(0,0,0);P.yaw=Math.atan2(14,-10);
  R.pos.set(-6,0,17);R.pos.y=groundHeight(R.pos.x,R.pos.z);R.yaw=0.5;R.speed=0;R.battery=100;R.visY=R.pos.y;R.lastG=R.pos.y;R.cruise=false;
  cam.yaw=P.yaw;cam.pitch=0.32;cam.zoom=1;
}
function enterPlay(){
  game.state='play';game.paused=false;astro.visible=P.mode==='foot';rover.visible=true;
  $('#hud').classList.toggle('hidden',game.hudHidden);applyUIState();applyLook();game.camSnap=true;game.guide=null;game.spot=null;
  game.quietPOI=true;updatePOIs(focusPos());game.quietPOI=false;
  if(P.mode==='foot'){astro.position.copy(P.pos)}
  if(P.hp==null||P.hp<=0)P.hp=maxHP();P.stam=100;game.dead=false;syncLamps();onHotbarChange();refreshInvUI();updateDeposits();
  updateHUD();
  if(typeof autoHostIfWanted==='function')setTimeout(autoHostIfWanted,2500);
  if(!OPT.onboarded&&typeof worldsList==='function'&&worldsList().length>1){OPT.onboarded=true;saveOpts()}
  if(!OPT.onboarded&&!net.role)setTimeout(()=>{if(game.state==='play'&&!game.tour&&typeof startTour==='function')startTour()},1800);   // first landing: show the tour
}
let selSite='jezero',selMode='survival';
async function startNew(site,mode,cfg={}){
  initAudio();fade(true,'Entering Mars orbit…');await wait(900);
  $('#title').classList.add('hidden');$('#sites').classList.add('hidden');$('#over').classList.add('hidden');
  clearAll();initSite(site);S=newState(site,mode);curWorld=newWorldId();P.inside=false;if(INT.g)INT.g.visible=false;
  S.worldName=String(cfg.name||'').trim().slice(0,28)||(SITES[site].name+' expedition');Object.assign(S.settings,cfg.settings||{});
  S.nextStorm=S.time+wxGap(S.nextStorm-S.time);S.nextSPE=S.time+wxGap(S.nextSPE-S.time);
  spawnBase();placeActors();P.hp=100;P.bat=100;P.stam=100;P.hot=0;
  updateChunks(0,0,999);
  spawnStaticLander();game.introGY=staticLander.position.y;
  game.state='intro';game.introT=0;game.puffed=false;astro.visible=false;rover.visible=true;if(typeof startLanding==='function')startLanding();
  rover.position.set(R.pos.x,R.pos.y,R.pos.z);rover.rotation.set(0,R.yaw,0);
  $('#cards').innerHTML='';$('#toasts').innerHTML='';
  fade(false);
}
function introUpdate(dt){
  if(game.landing){landingUpdate(dt);return}
  game.introT+=dt;S.time+=dt*HPS*0.3;updateEnv(dt,staticLander.position);
  const T=7.5,e=Math.min(1,game.introT/T),gy=game.introGY;
  staticLander.position.y=gy+240*Math.pow(1-e,3);
  const fl=staticLander.userData.flame;fl.visible=e<1;fl.scale.set(1,0.7+Math.random()*0.5,1);
  if(e>=1&&!game.puffed){game.puffed=true;puff(LANDER_X,gy,LANDER_Z,14);beep(160,0.5,'sine',0.1)}
  const a=0.9+game.introT*0.06;
  camera.position.set(LANDER_X+Math.cos(a)*42,gy+10+Math.max(0,staticLander.position.y-gy)*0.35,LANDER_Z+Math.sin(a)*42);
  camera.lookAt(LANDER_X,staticLander.position.y+2,LANDER_Z);
  updateWeatherFX(dt,camera.position);updateLanders(dt);
  if(game.introT>T+2){staticLander.position.y=gy;fl.visible=false;enterPlay();saveGame(true);   // the new expedition appears in the list right away
cam.target.set(LANDER_X,gy+2,LANDER_Z);game.camSnap=false;
    if(S.mode==='survival')card('Survival','Mission tracked: '+CHAPTERS[0].title,CHAPTERS[0].intro+' Walk with WASD and look around with right-drag or the arrow keys. Your Hand Drill is in slot 1 and your Pulse Blaster in slot 2. Press Tab for your inventory, missions and colony: pick any mission there to track it.','#7fe6dc');
    else card('Sandbox','Free build','Everything is unlocked and materials are unlimited. Press B to build, E to drive, Tab for your inventory, missions and colony, and M for the map.','#7fe6dc');}
}
/* ---------- missions: any order, one tracked at a time (Tab → Missions) ---------- */
const missionDone=i=>!!(S.flags&&S.flags['mdone'+i]);
function missionProgress(i){const ch=CHAPTERS[i];return[ch.objs.filter(o=>S.objDone.has(i+':'+o.id)).length,ch.objs.length]}
function trackMission(i){S.mission=CHAPTERS[i]&&!missionDone(i)?i:null;game.guideT=0;toast(S.mission!=null?'Tracking mission: '+CHAPTERS[i].title:'Mission tracking off',S.mission!=null?'good':'');SFX.radio()}
function checkObjectives(){
  if(S.over)return;
  if(count('pad')&&count('habitat')>=2&&!S.flags.crewSent){S.flags.crewSent=true;S.crewLanderAt=S.time+2.5;toast('A crew lander has left orbit. ETA about 2.5 hours','good')}
  for(let i=0;i<CHAPTERS.length;i++){if(missionDone(i))continue;const ch=CHAPTERS[i];let all=true;
    for(const o of ch.objs){const k=i+':'+o.id;if(S.objDone.has(k))continue;
      if(o.check()){S.objDone.add(k);toast('✓ '+o.text,'good');if(S.mission===i)SFX.radio()}else all=false}
    if(!all)continue;
    S.flags['mdone'+i]=true;S.chapter=CHAPTERS.filter((_,j)=>missionDone(j)).length;
    const sb=S.mode==='sandbox';if(!sb){const rw=ch.reward.mat;storeItems({plate:Math.round(rw/5),glass:Math.round(rw/8),circuit:Math.round(rw/10),brick:Math.round(rw/6)});S.res.rp+=ch.reward.rp}
    const nx=CHAPTERS.findIndex((_,j)=>!missionDone(j));if(S.mission===i)S.mission=nx>=0?nx:null;
    card('Mission complete: '+ch.title,sb?'Sandbox: no rewards needed':`Reward: supplies in colony storage · +${ch.reward.rp} RP`,
      nx>=0?`Now tracking: ${CHAPTERS[nx].title}. ${CHAPTERS[nx].intro} (Change it any time: Tab → Missions.)`:'Every mission is complete. The colony stands on its own; the planet is yours to explore.','#7fe6dc');
    beep(660,0.12);beep(880,0.12,'sine',0.07,0.12);beep(1320,0.25,'sine',0.07,0.24);saveGame(true);
  }
}
function gameOver(){
  S.over=true;game.paused=true;
  const why=S.res.o2<=0?'The oxygen reserves ran dry.':S.res.water<=0?'The colony ran out of water.':'The food supply ran out.';
  $('#over-title').textContent='Colony lost';
  $('#over-text').innerHTML=`${why} The crew had to evacuate to orbit on sol ${solNum()}.<br><br>You completed ${S.chapter} of ${CHAPTERS.length} missions, built ${blds.length} modules, analysed ${S.analyzed.length} samples and drove ${(S.stats.roverDist/1000).toFixed(1)} km.<br><br><span class="sub" style="text-transform:none;letter-spacing:0">Tip: build an Oxygen Unit early, find ice for the Ice Drill, and keep an eye on the per-sol rates at the bottom of the screen.</span>`;
  $('#over').classList.remove('hidden');if(curWorld)deleteWorld(curWorld);
}
function togglePause(force){
  game.paused=force===undefined?!game.paused:force;$('#pause').classList.toggle('hidden',!game.paused);
  if(typeof updateNetUI==='function')updateNetUI();
}
function showTitle(){
  if(net.role)leaveNet(true);
  game.state='title';game.paused=false;S=null;P.inside=false;if(INT.g)INT.g.visible=false;$('#journalov').classList.add('hidden');game.typing=false;
  for(const id of['hud','buildbar','mapov','pause','over','sites','worlds','settings','invov','dlg','chatbox','quick'])$('#'+id).classList.add('hidden');invUI.open=false;game.dialogue=null;game.dead=false;
  build.active=false;selectBuild(null);
  $('#title').classList.remove('hidden');curWorld=null;
  clearAll();astro.visible=false;rover.visible=false;setTitleScene(tScene);
}
const tcam={d:0,mode:'fly',a:0};
/* ---------- home screen scenes: ◀ ▶ under the menu switch between landing sites, biomes, times of day, a habitat and wildlife ----------
   fly: glide across the site · pan: stand in the middle and turn to look at what surrounds you · orbit: circle around a spot */
const TITLE_SCENES=[
  {n:'Flight over Jezero',site:'sel',t:16.9,mode:'fly'},
  {n:'Ice-rich Plains · morning',site:'utopia',t:9.4,mode:'pan',h:9},
  {n:'Ice biome · crystal mountains',site:'jezero',t:15.2,mode:'orbit',at:'ice',r:120,h:34,lift:0.12},
  {n:'Crater Basin · sunset',site:'gale',t:18.25,mode:'pan',h:14},
  {n:'Volcanic Highlands',site:'tharsis',t:13.5,mode:'pan',h:16},
  {n:'Rocky Plains · night',site:'elysium',t:21.9,mode:'pan',h:12},
  {n:'Habitat close-up',site:'jezero',t:17.7,mode:'orbit',r:26,h:9,ty:3,props:'hab'},
  {n:'Loomstriders and Lumari',site:'gale',t:17.2,mode:'orbit',r:27,h:8,ty:5,props:'animals'},
  {n:'Dawn over the crater',site:'gale',t:6.4,mode:'fly'},
];
let tScene=0,titleProps=null;
// scenes you have seen: ◀ steps back through them, and each scene picks up where you left it
const sceneHistory=[],sceneState={};
function saveSceneState(){sceneState[tScene]={d:tcam.d,a:tcam.a,tY:game.tY,t:titleTime}}
function nextTitleScene(){saveSceneState();sceneHistory.push(tScene);if(sceneHistory.length>40)sceneHistory.shift();setTitleScene(tScene+1,true)}
function prevTitleScene(){saveSceneState();const i=sceneHistory.length?sceneHistory.pop():tScene-1;setTitleScene(i,true)}
function clearTitleProps(){if(!titleProps)return;for(const o of titleProps.list){scene.remove(o);if(o.userData.own&&typeof disposeObj==='function')disposeObj(o)}if(titleProps.astro){astro.visible=false;rover.visible=false}titleProps=null}
function titleSceneProps(kind){const list=[],put=(o,x,z,ry=0,own=true)=>{o.position.set(x,groundHeight(x,z),z);o.rotation.y=ry;o.userData.own=own;scene.add(o);list.push(o);return o};
  if(kind==='hab'){put(MAKERS.habitat(),0,0,0.4);put(MAKERS.solar(),13,5,0.5);put(MAKERS.solar(),15,-6,0.5);put(MAKERS.moxie(),-9,9,1.2);put(rover,9,13,2.4,false);rover.visible=true;put(astro,5,6,2.6,false);astro.visible=true;astro.position.y+=0;titleProps={list,astro:true};return}
  if(kind==='animals'){[[0,-4,0.2],[7,2,2.6],[-6,4,4.3]].forEach(([x,z,ry])=>put(CR_MAKE.strider().g,x,z,ry));[[3,8,3.4],[-3,10,1]].forEach(([x,z,ry])=>{const g=put(CR_MAKE.lumari().g,x,z,ry);g.position.y+=1.4});
    [[10,-6],[11,-3],[9,-9]].forEach(([x,z],i)=>put(CR_MAKE.hopper().g,x,z,i));titleProps={list};return}}
function setTitleScene(i,resume){
  tScene=(i+TITLE_SCENES.length)%TITLE_SCENES.length;const sc=TITLE_SCENES[tScene],site=sc.site==='sel'?selSite:sc.site;
  clearTitleProps();if(SITE!==SITES[site]||typeof N1!=='function')initSite(site);titleTime=sc.t;tcam.mode=sc.mode;tcam.d=0;tcam.a=i*1.7;tcam.sc=sc;
  const ic=SITE.ice[0];tcam.cx=sc.at==='ice'?ic[0]:0;tcam.cz=sc.at==='ice'?ic[1]:0;
  if(sc.props)titleSceneProps(sc.props);game.tY=undefined;
  const st=resume&&sceneState[tScene];if(st){tcam.d=st.d;tcam.a=st.a;game.tY=st.tY;titleTime=st.t}
  titleCam(0);updateChunks(camera.position.x,camera.position.z,80);
  const lbl=$('#sc-name');if(lbl)lbl.textContent=sc.n}
function titleCam(dt){
  const sc=tcam.sc;
  if(tcam.mode==='orbit'){tcam.a+=dt*0.06;const r=sc.r,x=tcam.cx+Math.cos(tcam.a)*r,z=tcam.cz+Math.sin(tcam.a)*r,g=groundHeight(tcam.cx,tcam.cz);
    camera.position.set(x,Math.max(groundHeight(x,z)+2,g+sc.h),z);camera.lookAt(tcam.cx,g+(sc.ty||sc.h*0.25)-r*(sc.lift??0.34),tcam.cz);return}   // look a little below the subject, so it sits above the menu
  if(tcam.mode==='pan'){tcam.a+=dt*0.035;const g=groundHeight(0,0);camera.position.set(0,g+sc.h,0);camera.lookAt(Math.cos(tcam.a)*300,g+sc.h+22,Math.sin(tcam.a)*300);return}
  tcam.d+=dt*9;const z=-tcam.d,x=Math.sin(tcam.d*0.0016)*140;
  const ahead=40,x2=Math.sin((tcam.d+ahead)*0.0016)*140,z2=z-ahead;
  let gh=-1e9;for(let i=0;i<4;i++)gh=Math.max(gh,groundHeight(lerp(x,x2,i/3),lerp(z,z2,i/3)));
  game.tY=game.tY===undefined||dt===0?gh+20:lerp(game.tY,gh+20,damp(1.5,dt));
  camera.position.set(x,game.tY,z);camera.lookAt(x2,game.tY-6,z2);
}
function titleUpdate(dt){
  titleTime+=dt*0.01;titleCam(dt);updateEnv(dt,camera.position);updateChunks(camera.position.x,camera.position.z,3);updateWeatherFX(dt,camera.position);
}
function playUpdate(dt){
  if(game.cine){game.cine(dt);return}
  const h=dt*HPS*dayMul();S.time+=h;
  const f0=focusPos();updateEnv(dt,f0);
  const blocked=game.wardrobe||game.dialogue||game.typing||invUI.open||game.dead||game.sleeping;
  const inp=blocked?{fwd:0,steer:0,camTurn:0,jump:false,sprint:false,brake:true}:readInput();
  updateRover(dt,inp);
  if(P.mode==='foot'){if(P.ragdoll)updateRagdoll(dt,inp);else updateWalker(dt,inp)}else P.pos.copy(R.pos);
  if(P.mode==='foot'&&!P.inside&&!cave.active&&!setupDone()){const hb=home(),dx=P.pos.x-hb.x,dz=P.pos.z-hb.z,d=Math.hypot(dx,dz);if(d>SETUP_R){P.pos.x=hb.x+dx/d*SETUP_R;P.pos.z=hb.z+dz/d*SETUP_R;P.vel.x*=0.2;P.vel.z*=0.2;if(now-(game.edgeT||-99)>6){game.edgeT=now;toast('Mission Control: stay near the base until the solar arrays and oxygen unit are running','warn')}}}
  updateToolUse(dt);updateEmote(dt);
  updateCamera(dt);
  updateMeteors(dt);
  const f=focusPos();
  updateChunks(f.x,f.z,2);updateCaves(dt);
  updateWeatherFX(dt,f);caveEnv();
  if((game.poiT-=dt)<=0){game.poiT=0.5;updatePOIs(f);updateDeposits()}
  animatePOIs(dt);updateNPCs(dt);updateSfx();netTick(dt);
  worldTick(dt);aliensTick(dt);dialogueTick(dt);factTick(dt);
  updateInteraction(dt);
  devilPushThings(dt);updatePickups(dt);if(typeof blockedCaveCollide==='function')blockedCaveCollide();if(typeof tickNeeds==='function')tickNeeds(dt);if(typeof updatePip==='function')updatePip(dt);updateBolts(dt);updateFlares(dt);updateLightPool();updateSparks(dt);updateFlyers(dt);updatePings(dt);updateDrones(dt);
  S.roverKW=0;
  if(R.battery<R.maxBat&&!S.roverChargeBlocked){
    const chg=blds.find(b=>b.type==='charger'&&b.progress>=1&&Math.hypot(b.x-R.pos.x,b.z-R.pos.z)<4.5),nh=nearHab(R.pos,12);
    if(chg||nh){R.battery=Math.min(R.maxBat,R.battery+dt*(chg?7:2.5));S.roverKW=chg?3:1.2}
  }
  if(net.role!=='guest')simTick(h);
  disasterTick(dt,h);
  if(game.state!=='play')return;
  updateBuildingsFX(dt);updateLanders(dt);
  if(build.active)updateBuild();
  if(net.role!=='guest'&&(game.objT-=dt)<=0){game.objT=0.5;checkObjectives()}
  if((game.hudT-=dt)<=0){game.hudT=0.12;updateHUD()}
  if((game.guideT=(game.guideT||0)-dt)<=0){game.guideT=0.3;game.guide=computeGuide();if(build.active)renderBuildBar()}
  updateGuide(dt);tabHintTick(dt);
  if((game.cmpT-=dt)<=0){game.cmpT=0.04;updateCompass()}
  if(!$('#mapov').classList.contains('hidden')&&(game.mapT=(game.mapT||0)-dt)<=0){game.mapT=1;drawMap()}
  if((game.saveT-=dt)<=0){game.saveT=30;saveGame(true)}
}

/* =========================================================
   INPUT
   ========================================================= */
const mouse={x:0,y:0,nx:0,ny:0,drag:false,lx:0,ly:0,moved:0,btn:0};
addEventListener('keydown',e=>{
  if(game.typing)return;
  if(e.code==='Tab'||e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();
  keys[e.code]=true;if(e.repeat)return;initAudio();onKey(e.code);
});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyV')closeQuick()});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
const HOTKEYS={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Digit5:4,Digit6:5,Digit7:6,Digit8:7,Digit9:8};
function onKey(c){
  if(game.state==='intro'){if(game.landing)return;if(c==='Space'||c==='Enter'||c==='Escape')game.introT=Math.max(game.introT,9.4);return}
  if(game.state!=='play'||S.over)return;
  if(c==='Escape'){
    if(game.dialogue){closeDialogue();return}if(invUI.open){openInventory(false);return}if(build.active){toggleBuild(false);return}
    if(game.wardrobe||!$('#mapov').classList.contains('hidden')){closePanels();return}togglePause();return}
  if(game.paused||game.dead)return;
  if(game.dialogue)return;
  switch(c){
    case'KeyE':if(P.inside){if(typeof interiorPressE==='function')interiorPressE()}else toggleRover();break;
    case'CapsLock':setShiftLock(!game.shiftLock);break;
    case'KeyB':if(P.inside){toast('Go outside to build');break}toggleBuild();break;
    case'KeyI':openInventory();break;
    case'Tab':cycleMenu(keys.ShiftLeft||keys.ShiftRight?-1:1);break;
    case'KeyM':togglePanel('mapov');break;
    case'KeyH':game.hudHidden=!game.hudHidden;$('#hud').classList.toggle('hidden',game.hudHidden);break;
    case'KeyC':if(P.mode==='rover'){R.cruise=!R.cruise;R.cruiseV=Math.max(6,R.speed);toast(R.cruise?`Cruise control on (${Math.round(R.cruiseV*3.6)} km/h). Steer and enjoy the view`:'Cruise control off')}break;
    case'KeyR':if(build.type)build.rot+=Math.PI/8;break;
    case'KeyX':if(!build.active)toggleBuild(true);setBuildMode(build.mode==='recycle'?'build':'recycle');break;
    case'KeyF':pressF();break;
    case'KeyQ':if(S.inv[P.hot]&&P.mode==='foot'&&!invUI.open)act({a:'drop',src:{c:'inv',i:P.hot},n:1,fw:[Math.sin(P.yaw),Math.cos(P.yaw)]});refreshInvUI();break;
    case'KeyG':sendPing();break;
    case'KeyV':openQuick();break;
    case'Enter':openChat();break;
    case'KeyJ':setCollapsed('journal',!isCollapsed('journal'));break;
    case'KeyK':setCollapsed('status',!isCollapsed('status'));break;
    case'KeyN':AU.music=!AU.music;toast('Music '+(AU.music?'on':'off'));break;
    case'Equal':if(!build.active)cam.zoom=clamp(cam.zoom*0.9,0.45,3);else if(build.mode==='build')selectBuild(BUILD_ORDER[KEYMAP[c]]);break;
    case'Minus':if(!build.active)cam.zoom=clamp(cam.zoom*1.1,0.45,3);else if(build.mode==='build')selectBuild(BUILD_ORDER[KEYMAP[c]]);break;
    default:
      if(build.active&&build.mode==='build'&&c in KEYMAP){const t=BUILD_ORDER[KEYMAP[c]];selectBuild(build.type===t?null:t)}
      else if(!build.active&&c in HOTKEYS)selectHot(HOTKEYS[c]);
  }
}
canvas.addEventListener('mousedown',e=>{initAudio();mouse.drag=true;mouse.btn=e.button;mouse.lx=e.clientX;mouse.ly=e.clientY;mouse.moved=0;canvas.focus();
  if(e.button===0&&game.state==='play')onWorldClick()});
/* ---------- shift lock (Caps Lock): the mouse turns the camera and you aim at the centre ---------- */
function setShiftLock(on){game.wantLock=on;if(on&&document.pointerLockElement!==canvas){try{const r=canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{})}catch(e){}}if(!on&&document.pointerLockElement)document.exitPointerLock()}
document.addEventListener('pointerlockchange',()=>{const on=document.pointerLockElement===canvas;game.shiftLock=on;$('#lockaim').classList.toggle('hidden',!on);
  if(on){mouse.x=innerWidth/2;mouse.y=innerHeight/2;mouse.nx=0;mouse.ny=0.05;toast('Shift lock on: the mouse looks around. Caps Lock to turn it off')}else if(game.state==='play'&&!game.paused&&!invUI.open&&game.wantLock&&!game.typing)toast('Shift lock off')});
addEventListener('mousemove',e=>{
  if(document.pointerLockElement===canvas&&game.state==='play'){cam.yaw-=e.movementX*0.0024*OPT.sens;cam.pitch=clamp(cam.pitch+e.movementY*0.002*OPT.sens,-0.3,1.35);cam.lastDrag=now;mouse.x=innerWidth/2;mouse.y=innerHeight/2;mouse.nx=0;mouse.ny=0.05;return}
  mouse.x=e.clientX;mouse.y=e.clientY;mouse.nx=e.clientX/innerWidth*2-1;mouse.ny=-(e.clientY/innerHeight)*2+1;
  if(mouse.drag&&game.state==='play'){const dx=e.clientX-mouse.lx,dy=e.clientY-mouse.ly;mouse.lx=e.clientX;mouse.ly=e.clientY;mouse.moved+=Math.abs(dx)+Math.abs(dy);
    const rotate=mouse.btn===2||mouse.btn===1||(mouse.btn===0&&(P.mode==='rover'||build.active)&&mouse.moved>=6);
    if(rotate){cam.yaw-=dx*0.005*OPT.sens;cam.pitch=clamp(cam.pitch+dy*0.004*OPT.sens,-0.3,1.35);cam.lastDrag=now}}
});
addEventListener('mouseup',()=>{if(mouse.drag&&mouse.btn===0&&mouse.moved<6&&build.active&&game.state==='play'&&!game.paused){if(build.mode==='recycle')recycle(build.hover);else placeBuild()}mouse.drag=false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{
  if(game.state==='play'&&P.mode==='foot'&&!build.active&&!e.altKey)selectHot(P.hot+Math.sign(e.deltaY));
  else cam.zoom=clamp(cam.zoom*(1+Math.sign(e.deltaY)*0.1),0.45,3)},{passive:true});
$('#buildbar').addEventListener('click',e=>{const m=e.target.closest('[data-m]');if(m){setBuildMode(m.dataset.m);return}const c=e.target.closest('[data-b]');if(c){const t=c.dataset.b;selectBuild(build.type===t?null:t)}});

/* ---------- menus ---------- */
const CONTROLS=`<b>WASD</b> walk / drive · <b>Shift</b> sprint · <b>Space</b> jump (hold in mid-air with a Thruster Pack)<br>
<b>Walk into cliffs, modules, wrecks or boulders</b> to climb (uses stamina) · <b>Right-drag</b> or <b>arrow keys</b> look around · <b>Alt+scroll</b> or <b>+/−</b> zoom<br>
<b>1–9</b>, <b>scroll</b> or <b>click</b> the hotbar · <b>Hold left mouse</b> use the item (drill, blaster, prod) · <b>Q</b> drop one<br>
<b>I</b> inventory & crafting · <b>F</b> interact, talk, feed animals, scan, open · <b>E</b> rover (get out any time; at speed you tumble) · <b>C</b> cruise<br><b>In the air</b> (rover): <b>W/S</b> flip, <b>A/D</b> spin, <b>Shift+A/D</b> barrel roll<br><b>Tumbling</b> (thrown or bailed out): <b>WASD</b> steer and turn, <b>W/S</b> flip, hold <b>Space</b> to brace and land on your feet<br>
<b>Tab</b> menu: inventory, missions, colony, research, stats (Tab again for the next page) · <b>I</b> inventory · <b>M</b> map<br><b>B</b> build · <b>X</b> recycle · <b>R</b> rotate<br>
<b>Caps Lock</b> shift lock (the mouse looks around, aim at the centre) · <b>Enter</b> radio chat · <b>G</b> ping a spot · <b>V</b> quick comms & wave<br><b>J</b> objectives · <b>H</b> hide HUD · <b>N</b> music · <b>Esc</b> pause`;
$('#ctrl-list').innerHTML=CONTROLS;
// Controls opens from Settings or the pause menu; closing it goes back to where you came from
let ctrlFrom=null;
function openControls(from){ctrlFrom=from||null;$('#controls').classList.remove('hidden')}
$('#p-ctrls').onclick=()=>openControls('pause');
$('#ctrl-x').onclick=$('#ctrl-done').onclick=()=>{$('#controls').classList.add('hidden');if(ctrlFrom==='settings')openSettings(setFrom);ctrlFrom=null};
// the links at the top left of the home screen fold away (they start open)
$('#sc-prev').onclick=prevTitleScene;$('#sc-next').onclick=nextTitleScene;
$('#hl-tog').onclick=()=>{const h=$('#homelinks'),c=h.classList.toggle('closed');$('#hl-tog').setAttribute('aria-expanded',String(!c));$('#hl-tog').title=c?'Show the links':'Hide these links'};
// (home screen, expeditions list, world creation and settings live in menus.js)
function renderSites(){
  // each landing site shows a picture of where you will set up your base
  $('#sgrid').innerHTML=Object.entries(SITES).map(([k,s])=>`<div class="site ${k===selSite?'sel':''}" data-site="${k}"><h3>${s.name}</h3><div class="ins">${s.inspired}</div>
    <img class="sitepic" src="img/sites/${k}.jpg?v=1" alt="Your base site at the ${s.name}" loading="lazy" onerror="this.remove()"></div>`).join('');
  $$('#sgrid .site').forEach(el=>el.onclick=()=>{if(selSite===el.dataset.site)return;selSite=el.dataset.site;renderSites();clearTitleProps();initSite(selSite);tcam.mode='fly';tcam.d=0;titleCam(0);updateChunks(camera.position.x,camera.position.z,40)});
}
$('#p-resume').onclick=()=>togglePause(false);
$('#p-save').onclick=()=>{saveGame()};
$('#p-friends').onclick=()=>{if(typeof openFriends==='function')openFriends()};
$('#p-coop').onclick=()=>{if(net.role==='guest'){leaveNet(false);showTitle();return}if(net.role==='host'){leaveNet(false);togglePause(true);return}hostGame();togglePause(false)};
$('#b-coop').onclick=()=>{initAudio();$('#coop-name').value=net.name;$('#coop-code').value='';coopMsg('');$('#coop').classList.remove('hidden');$('#coop-code').focus()};
$('#coop-x').onclick=()=>{closeCoop();if(net.peer&&!net.role)leaveNet(true)};
$('#coop-join').onclick=()=>{const n=$('#coop-name').value.trim();if(n){net.name=n.slice(0,20);try{localStorage.setItem('mlc-name',net.name)}catch(e){}}joinGame($('#coop-code').value)};
$('#coop-code').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')$('#coop-join').click()});$('#coop-name').addEventListener('keydown',e=>e.stopPropagation());
$('#p-quit').onclick=()=>{game.paused=false;saveGame(true);showTitle()};
$('#o-retry').onclick=()=>{const s=S.site,m=S.mode,cfg={name:S.worldName,settings:{...S.settings}};$('#over').classList.add('hidden');startNew(s,m,cfg)};
$('#o-title').onclick=()=>showTitle();
$$('[data-close]').forEach(b=>b.addEventListener('click',closePanels));