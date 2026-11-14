'use strict';
/* =========================================================
   LANDING SEQUENCE: the first time you load into a new world you ride the lander down.
   Entry, parachute and heat-shield separation happen on their own (like a real Mars landing,
   which is fully automatic because radio takes minutes to reach Earth). For powered descent
   you take the throttle lever: up for more thrust, down for less. Touch down gently.
   ========================================================= */
const LAND={on:false,t:0,h:0,v:0,thr:0.5,fuel:100,phase:0,done:false,shake:0,touch:null,keys:{up:false,down:false}};
const LAND_G=3.71,LAND_THRUST=12,LAND_BURN=5;           // Mars gravity (m/s²), full-throttle acceleration, fuel % per second at full throttle
const LAND_PHASES=[
  {id:'entry',t:3.4,title:'Atmospheric entry',body:'The capsule hits the top of the Martian atmosphere at about 20,000 km/h. Friction heats the heat shield to around 1,300 °C. Mars is so far away that radio takes 5 to 20 minutes each way, so every landing has to fly itself: NASA calls it the “seven minutes of terror”.',h:[900,560]},
  {id:'chute',t:3.4,title:'Parachute deployed',body:'About 11 km up and still near 1,500 km/h, a supersonic parachute opens (Perseverance’s was 21.5 m wide). The air on Mars is about 1% as thick as Earth’s, so a parachute can only slow a heavy lander so much.',h:[560,330]},
  {id:'shield',t:2.2,title:'Heat shield released',body:'With the heat shield gone, radar and cameras can see the ground. Terrain-Relative Navigation compares the view with orbital maps to steer to a safe landing spot.',h:[330,260]},
  {id:'powered',t:0,title:'Powered descent: you have control',body:'Retro-rockets do the rest. Push the lever up for more thrust and down for less. Mars gravity is 3.71 m/s², 38% of Earth’s. Touch down slower than 3 m/s.'},
];
function startLanding(){
  Object.assign(LAND,{on:true,t:0,h:LAND_PHASES[0].h[0],v:-120,thr:0.5,fuel:100,phase:0,done:false,shake:0,touch:null});game.landing=true;
  staticLander.visible=false;landUI(true);renderLandPhase();
}
function landUI(on){
  let el=$('#landui');
  if(!el){el=document.createElement('div');el.id='landui';el.className='hidden';
    el.innerHTML=`<div class="lwin"></div><div class="lstrut l"></div><div class="lstrut r"></div><div class="lglow" id="l-glow"></div>
      <div class="ltop"><div class="lph" id="l-ph"></div><h3 id="l-title"></h3><p id="l-body"></p></div>
      <div class="ldash"><div class="lins"><div><span>Altitude</span><b id="l-alt">0 m</b></div><div><span>Vertical speed</span><b id="l-vs">0 m/s</b></div><div><span>Fuel</span><b id="l-fuel">100%</b></div>
        <div class="lsteps" id="l-steps"></div></div>
        <div class="lever" id="l-lever" title="Throttle: drag, or use W/S or the arrow keys"><div class="ltrack"><i id="l-fill"></i></div><div class="lhandle" id="l-handle"></div><span>THROTTLE</span></div></div>
      <button class="btn sm" id="l-skip">Skip landing</button>`;
    document.body.appendChild(el);
    const lev=el.querySelector('#l-lever');const setFromY=y=>{const r=lev.querySelector('.ltrack').getBoundingClientRect();LAND.thr=clamp(1-(y-r.top)/r.height,0,1)};
    lev.addEventListener('pointerdown',e=>{lev.setPointerCapture(e.pointerId);LAND.drag=true;setFromY(e.clientY)});
    lev.addEventListener('pointermove',e=>{if(LAND.drag)setFromY(e.clientY)});lev.addEventListener('pointerup',()=>{LAND.drag=false});lev.addEventListener('pointercancel',()=>{LAND.drag=false});
    lev.addEventListener('wheel',e=>{e.preventDefault();LAND.thr=clamp(LAND.thr-Math.sign(e.deltaY)*0.06,0,1)},{passive:false});
    el.querySelector('#l-skip').onclick=()=>landSkip()}
  el.classList.toggle('hidden',!on);
}
addEventListener('keydown',e=>{if(!LAND.on)return;const k=e.key;
  if(k==='ArrowUp'||k==='w'||k==='W'){LAND.keys.up=true;e.preventDefault()}else if(k==='ArrowDown'||k==='s'||k==='S'){LAND.keys.down=true;e.preventDefault()}else if(k==='Escape')landSkip()},true);
addEventListener('keyup',e=>{const k=e.key;if(k==='ArrowUp'||k==='w'||k==='W')LAND.keys.up=false;if(k==='ArrowDown'||k==='s'||k==='S')LAND.keys.down=false});
function renderLandPhase(){const p=LAND_PHASES[LAND.phase];$('#l-ph').textContent=`Entry, descent and landing · ${LAND.phase+1}/${LAND_PHASES.length}`;$('#l-title').textContent=p.title;$('#l-body').textContent=p.body;
  $('#l-steps').innerHTML=LAND_PHASES.map((q,i)=>`<i class="${i<LAND.phase?'done':i===LAND.phase?'on':''}" title="${q.title}"></i>`).join('');
  $('#l-lever').classList.toggle('live',p.id==='powered')}
function landSkip(){if(!LAND.on)return;LAND.touch=LAND.touch||{v:1.2,skipped:true};LAND.h=0;finishLanding()}
function landingUpdate(dt){
  if(!LAND.on)return;LAND.t+=dt;S.time+=dt*HPS*0.3;const gy=game.introGY;
  const ph=LAND_PHASES[LAND.phase];
  if(ph.id!=='powered'){ // automatic phases: fall along a scripted path
    const f=clamp(LAND.t/ph.t,0,1);LAND.h=lerp(ph.h[0],ph.h[1],f);LAND.v=ph.id==='entry'?-150+f*40:ph.id==='chute'?-80+f*30:-45;
    LAND.shake=ph.id==='entry'?1.4:ph.id==='chute'&&f<0.15?2.5:0.35;
    if(LAND.t>=ph.t){LAND.phase++;LAND.t=0;if(LAND_PHASES[LAND.phase].id==='powered'){LAND.v=-32;LAND.h=260}renderLandPhase();beep(LAND.phase===1?300:520,0.18,'sine',0.08)}
  }else if(!LAND.touch){
    if(LAND.keys.up)LAND.thr=clamp(LAND.thr+dt*0.9,0,1);if(LAND.keys.down)LAND.thr=clamp(LAND.thr-dt*0.9,0,1);
    const thr=LAND.fuel>0?LAND.thr:0;LAND.fuel=Math.max(0,LAND.fuel-thr*LAND_BURN*dt);
    LAND.v+=(thr*LAND_THRUST-LAND_G)*dt;LAND.v=Math.min(LAND.v,6);LAND.h+=LAND.v*dt;LAND.shake=0.25+thr*0.8;
    if(LAND.h<=0){LAND.h=0;LAND.touch={v:-LAND.v};LAND.t=0;puff(LANDER_X,gy,LANDER_Z,14);beep(160,0.5,'sine',0.1);
      const v=LAND.touch.v,grade=v<1.5?['Perfect landing!','Barely a bump. Mission Control is cheering.']:v<3?['Good landing','Solid touchdown, well within the lander’s limits.']:v<6?['Hard landing','The legs absorbed it, but you felt that one.']:['Crash landing!','The lander survived, just. Check your suit.'];
      $('#l-title').textContent=grade[0];$('#l-body').textContent=`${grade[1]} Touchdown speed: ${v.toFixed(1)} m/s. Fuel left: ${Math.round(LAND.fuel)}%.`;$('#l-lever').classList.remove('live')}
  }else if(LAND.t>2.2)finishLanding();
  // the lander and the view from its window
  staticLander.position.y=gy+LAND.h;const fl=staticLander.userData.flame;fl.visible=false;
  const sh=LAND.shake*(LAND.touch?0:1),jx=(Math.random()-0.5)*0.06*sh,jy=(Math.random()-0.5)*0.06*sh;
  const look=0.62+(LAND_PHASES[LAND.phase].id==='powered'?0.25:0)*clamp(1-LAND.h/260,0,1);
  camera.position.set(LANDER_X+jx,gy+LAND.h+3.4+jy,LANDER_Z+jx);
  camera.lookAt(LANDER_X+Math.sin(0.9)*30,gy+LAND.h+3.4-30*Math.tan(look),LANDER_Z+Math.cos(0.9)*30);
  updateEnv(dt,camera.position);updateWeatherFX(dt,camera.position);updateLanders(dt);
  // instruments and window glow
  $('#l-alt').textContent=Math.round(LAND.h)+' m';$('#l-vs').textContent=(-LAND.v).toFixed(1)+' m/s';$('#l-vs').className=-LAND.v>6?'bad':-LAND.v>3?'warn':'good';
  $('#l-fuel').textContent=Math.round(LAND.fuel)+'%';$('#l-fill').style.height=(LAND.thr*100)+'%';$('#l-handle').style.bottom=`calc(${LAND.thr*100}% - 14px)`;
  const g=$('#l-glow'),pid=LAND_PHASES[LAND.phase].id;g.style.opacity=pid==='entry'?0.55+Math.sin(LAND.t*20)*0.1:pid==='chute'?Math.max(0,0.4-LAND.t*0.2):0;
}
function finishLanding(){
  if(!LAND.on)return;LAND.on=false;game.landing=false;landUI(false);staticLander.visible=true;staticLander.position.y=game.introGY;staticLander.userData.flame.visible=false;
  const v=LAND.touch?LAND.touch.v:1;S.stats.landing=Math.round(v*10)/10;game.introT=99;introUpdate(0);
  if(v>=3&&!(LAND.touch&&LAND.touch.skipped)){const dmg=Math.round(clamp((v-3)*6,4,35));P.hp=Math.max(10,P.hp-dmg);toast(`Hard landing: suit integrity -${dmg}`,'warn')}
}
