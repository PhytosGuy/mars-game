'use strict';
/* =========================================================
   LANDING SEQUENCE: the first time you load into a new world you ride the lander down,
   sitting in its cockpit. Look out of the big window, or at the two dashboard screens:
   a LIDAR scan of the ground underneath, and a chase camera showing the lander with its
   flight statistics. Entry, parachute and heat-shield separation happen on their own (a real
   Mars landing is automatic: radio takes minutes to reach Earth). For powered descent you take
   the throttle lever: up for more thrust, down for less. Touch down gently. Space skips.
   ========================================================= */
const LAND={on:false,t:0,h:0,v:0,thr:0.5,fuel:100,phase:0,done:false,shake:0,touch:null,keys:{up:false,down:false},ck:null,yaw:0,pitch:0,frame:0};
const LAND_G=3.71,LAND_THRUST=12,LAND_BURN=5;
const landHead=()=>staticLander.rotation.y;                     // the cockpit faces the lander's window, the hatch is behind you      // Mars gravity (m/s²), full-throttle acceleration, fuel %/s at full throttle, heading
const LAND_DRY=1650,LAND_PROP=420;                               // lander dry mass and propellant (kg), for the statistics screen
const LAND_PHASES=[
  {id:'orbit',t:6,title:'Approaching Mars',body:'Your spacecraft swings in from orbit. Mars is 6,779 km across, about half the size of Earth. Its red colour comes from iron oxide (rust) in the dust. Entry begins in a few seconds.'},
  {id:'entry',t:3.6,title:'Atmospheric entry',body:'The capsule hits the top of the Martian atmosphere at about 20,000 km/h. Friction heats the heat shield to around 1,300 °C. Radio takes 5 to 20 minutes each way, so every Mars landing flies itself: NASA calls it the “seven minutes of terror”.',h:[900,560]},
  {id:'chute',t:3.6,title:'Parachute deployed',body:'About 11 km up and still near 1,500 km/h, a supersonic parachute opens (Perseverance’s was 21.5 m wide). Mars’ air is about 1% as thick as Earth’s, so a parachute can only slow a heavy lander so much.',h:[560,330]},
  {id:'shield',t:2.4,title:'Heat shield released',body:'Now the LIDAR and cameras can see the ground. Terrain-Relative Navigation compares the scan with orbital maps to steer to a safe landing spot. Watch the LIDAR screen.',h:[330,260]},
  {id:'powered',t:0,title:'Powered descent: you have control',body:'Push the throttle up for more thrust and down for less (W/S, arrow keys or drag the lever). Mars gravity is 3.71 m/s². Touch down slower than 3 m/s.'},
];
/* ---------- the cockpit (built once, shown only during the landing) ---------- */
const CK_LAYER=3;
function buildCockpit(){
  if(LAND.ck)return LAND.ck;
  const g=new THREE.Group(),L=[];const add=(m,p=g)=>{p.add(m);L.push(m);return m};
  const hull=mat('#4a5059',{roughness:0.6,metalness:0.3}),panel=mat('#2a2e35',{roughness:0.5,metalness:0.4}),trim=mat('#c9d0d8',{roughness:0.35,metalness:0.6}),
    pad=mat('#5a3a2a',{roughness:0.9}),dark=mat('#15181d',{roughness:0.4});
  const lite=c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.6});
  // shell: floor, walls, ceiling, padded panels
  add(bx(2.0,0.06,1.9,hull,0,-0.9,-0.25));add(bx(2.0,0.06,1.6,hull,0,0.86,0.05));
  for(const s of[-1,1]){add(bx(0.06,1.8,1.9,hull,s*1.0,0,-0.25));for(let i=0;i<3;i++)add(bx(0.04,0.42,0.5,pad,s*0.96,0.25-i*0.48,0.1));
    // side consoles full of buttons
    const sc=add(bx(0.32,0.12,1.0,panel,s*0.78,-0.52,-0.3));sc.rotation.z=-s*0.25;
    for(let i=0;i<5;i++)for(let j=0;j<3;j++)add(bx(0.05,0.025,0.06,lite(['#3fe07a','#ffb35c','#5fe8ff','#ff5a4f'][(i+j*2)%4]),s*(0.7+j*0.06),-0.45+j*0.015,-0.7+i*0.16)).material.emissiveIntensity=0.6+((i*7+j*3)%5)*0.3}
  // overhead panel with toggle switches
  const ov=add(bx(1.1,0.05,0.55,panel,0,0.78,-0.35));ov.rotation.x=0.25;
  for(let i=0;i<8;i++)for(let j=0;j<2;j++){add(cy(0.012,0.012,0.06,6,trim,-0.42+i*0.12,0.74-j*0.06,-0.48+j*0.18)).rotation.x=0.6;add(sp(0.012,lite(i%3?'#3fe07a':'#ffb35c'),-0.42+i*0.12,0.755-j*0.06,-0.42+j*0.18,6,4))}
  // the big window: only a thin frame at the edges, no bars across the view
  add(bx(2.0,0.1,0.12,trim,0,0.66,-1.12));add(bx(2.0,0.12,0.14,trim,0,-0.27,-1.1));
  for(const s of[-1,1]){const p=add(bx(0.1,1.0,0.12,trim,s*0.96,0.2,-1.1));p.rotation.z=-s*0.06}
  const glass=add(new THREE.Mesh(new THREE.PlaneGeometry(1.86,0.94),new THREE.MeshBasicMaterial({color:'#9fc3ff',transparent:true,opacity:0.05,depthWrite:false})));glass.position.set(0,0.2,-1.11);
  const plasma=add(new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.3),new THREE.MeshBasicMaterial({color:'#ff7a2e',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false})));plasma.position.set(0,0.2,-1.25);
  // dashboard under the window, angled toward you
  const dash=new THREE.Group();dash.position.set(0,-0.42,-0.76);dash.rotation.x=0.8;g.add(dash);   // tilted up toward you
  add(bx(1.95,0.08,0.7,panel,0,0,0),dash);add(bx(1.95,0.05,0.04,lite('#5fe8ff'),0,0.045,0.33),dash).material.emissiveIntensity=0.5;
  add(bx(2.0,0.6,0.06,hull,0,-0.66,-1.06));
  const screens=[];
  for(const s of[-1,1]){const fr=add(bx(0.74,0.06,0.48,dark,s*0.44,0.04,0),dash);
    const scr=new THREE.Mesh(new THREE.PlaneGeometry(0.68,0.425),new THREE.MeshBasicMaterial({color:'#e6e6e6',toneMapped:false}));scr.rotation.x=-Math.PI/2;scr.position.set(s*0.44,0.075,0);dash.add(scr);L.push(scr);
    const ov2=new THREE.Mesh(new THREE.PlaneGeometry(0.68,0.425),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false}));ov2.rotation.x=-Math.PI/2;ov2.position.set(s*0.44,0.078,0);dash.add(ov2);L.push(ov2);screens.push({scr,ov:ov2})}
  // centre stack: attitude ball, buttons, warning lights
  const ball=new THREE.Group();ball.position.set(0,0.06,-0.05);dash.add(ball);
  const bt=new THREE.Mesh(new THREE.SphereGeometry(0.07,16,10,0,Math.PI*2,0,Math.PI/2),mat('#4f86f7'));const bb=new THREE.Mesh(new THREE.SphereGeometry(0.07,16,10,0,Math.PI*2,Math.PI/2,Math.PI/2),mat('#a5623f'));ball.add(bt,bb);L.push(bt,bb);
  for(let i=0;i<4;i++)for(let j=0;j<2;j++)add(cy(0.018,0.018,0.02,10,lite(['#ff5a4f','#ffb35c','#3fe07a','#5fe8ff'][i]),-0.06+i*0.04,0.05,0.12+j*0.06),dash).material.emissiveIntensity=0.4;
  const warn=[];for(let i=0;i<6;i++){const w=add(bx(0.1,0.04,0.02,lite(['#ff5a4f','#ffb35c','#3fe07a'][i%3]),-0.5+i*0.2,-0.2,-1.03));w.material.emissiveIntensity=0.3;warn.push(w)}
  // throttle lever on the right console
  const thr=new THREE.Group();thr.position.set(0.62,-0.42,-0.42);g.add(thr);add(bx(0.16,0.08,0.34,dark,0,0,0),thr);add(bx(0.03,0.02,0.28,lite('#ffb35c'),0,0.045,0),thr).material.emissiveIntensity=0.3;
  const stick=new THREE.Group();stick.position.set(0,0.04,0);thr.add(stick);add(cy(0.018,0.018,0.26,8,trim,0,0.13,0),stick);add(sp(0.045,mat('#ff7a2e',{roughness:0.4}),0,0.27,0,12,10),stick);
  // the rear wall with the hatch, a porch and stairs down to the ground (for walking out after touchdown)
  const RZ=0.7,steel=mat('#9aa3ad',{roughness:0.35,metalness:0.7});
  add(bx(0.62,1.8,0.06,hull,-0.71,0,RZ));add(bx(0.62,1.8,0.06,hull,0.71,0,RZ));add(bx(0.8,0.22,0.06,hull,0,0.8,RZ));
  for(const s of[-1,1])add(bx(0.06,1.62,0.1,trim,s*0.43,-0.09,RZ));add(bx(0.92,0.06,0.1,trim,0,0.72,RZ));
  const door=add(bx(0.8,1.6,0.05,mat('#c9d0d8',{roughness:0.4,metalness:0.5}),0,-0.1,RZ-0.02));
  const port=new THREE.Mesh(new THREE.CircleGeometry(0.12,20),mat('#2a3a4a',{roughness:0.1,metalness:0.6}));port.position.set(0,0.35,-0.03);port.rotation.y=Math.PI;door.add(port);L.push(port);
  const hatchLight=add(sp(0.04,lite('#ff5a4f'),0,0.86,RZ-0.06,8,6));
  add(bx(0.9,0.06,0.9,hull,0,-0.93,RZ+0.45));add(bx(0.9,0.06,0.9,hull,0,0.72,RZ+0.45));for(const s of[-1,1])add(bx(0.06,1.66,0.9,hull,s*0.45,-0.1,RZ+0.45));
  add(new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.04),lite('#ffb35c'))).position.set(0,0.69,RZ+0.45);
  // seat edge
  add(bx(0.7,0.08,0.4,pad,0,-0.8,0.45));
  const cabin=new THREE.PointLight(0xffe2c0,1.4,4,1.5);cabin.position.set(0,0.6,-0.1);g.add(cabin);const glowL=new THREE.PointLight(0x7fe8ff,0.8,2.2,1.5);glowL.position.set(0,-0.15,-0.7);g.add(glowL);
  g.traverse(o=>{o.layers.set(CK_LAYER);if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
  // the two live screens: LIDAR and a chase camera, each with a text overlay
  const rtL=new THREE.WebGLRenderTarget(512,320),rtT=new THREE.WebGLRenderTarget(512,320);
  screens[0].scr.material.map=rtL.texture;screens[1].scr.material.map=rtT.texture;
  const mkCv=()=>{const c=document.createElement('canvas');c.width=512;c.height=320;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return{c,x:c.getContext('2d'),t}};
  const ovL=mkCv(),ovT=mkCv();screens[0].ov.material.map=ovL.t;screens[1].ov.material.map=ovT.t;
  const camT=new THREE.PerspectiveCamera(38,512/320,0.5,3000);camT.layers.enable(1);
  const camL=new THREE.OrthographicCamera(-60,60,37.5,-37.5,1,3000);
  const lidarMat=new THREE.ShaderMaterial({uniforms:{gy:{value:0},t:{value:0}},
    vertexShader:`varying vec3 wp;void main(){vec4 p=vec4(position,1.0);
      #ifdef USE_INSTANCING
      p=instanceMatrix*p;
      #endif
      vec4 w=modelMatrix*p;wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform float gy;uniform float t;varying vec3 wp;void main(){float h=wp.y-gy;
      vec3 c=mix(vec3(0.0,0.05,0.02),vec3(0.12,0.75,0.3),clamp(h*0.06+0.45,0.0,1.0));
      float band=fract(h*0.5);c+=vec3(0.1,0.6,0.3)*(1.0-smoothstep(0.0,0.08,band));
      float gx=step(0.96,fract(wp.x*0.1)),gz=step(0.96,fract(wp.z*0.1));c+=vec3(0.0,0.18,0.1)*max(gx,gz);
      float sweep=smoothstep(0.0,0.4,fract(t*0.5-wp.z*0.004));c*=0.75+0.25*sweep;gl_FragColor=vec4(c,1.0);}`});
  const chute=mkChute();chute.visible=false;
  LAND.ck={g,dash,stick,ball,warn,plasma,screens,door,hatchLight,rtL,rtT,ovL,ovT,camT,camL,lidarMat,chute,L};
  return LAND.ck}
// a striped parachute canopy with suspension lines (seen on the chase camera)
function mkChute(){const g=new THREE.Group();const N=12;
  for(let i=0;i<N;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(9,4,8,i/N*Math.PI*2,Math.PI*2/N,0,Math.PI/2.4),new THREE.MeshStandardMaterial({color:i%2?'#ffffff':'#ff7a2e',side:THREE.DoubleSide,roughness:0.8}));m.scale.y=0.55;m.position.y=26;g.add(m)}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,top=new THREE.Vector3(Math.cos(a)*7,25,Math.sin(a)*7),bot=new THREE.Vector3(0,5,0),len=top.distanceTo(bot);
    const l=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,len,4),mat('#d9d3cb'));l.position.copy(top).add(bot).multiplyScalar(0.5);l.lookAt(top);l.rotateX(Math.PI/2);g.add(l)}
  g.traverse(o=>o.layers.set(1));return g}
/* ---------- start, controls, skip ---------- */
function startLanding(){
  game.orbitView=true;
  Object.assign(LAND,{on:true,t:0,h:LAND_PHASES[1].h[0],v:-3500,thr:0.5,fuel:100,phase:0,done:false,shake:0,touch:null,yaw:0,pitch:0,frame:0});game.landing=true;
  const ck=buildCockpit();orbitEnter(ck);staticLander.add(ck.chute);
  staticLander.traverse(o=>o.layers.set(1));camera.layers.enable(CK_LAYER);              // the lander hull is seen only by the chase camera
  landUI(true);renderLandPhase();
}
function landUI(on){
  let el=$('#landui');
  if(!el){el=document.createElement('div');el.id='landui';el.className='hidden';
    el.innerHTML=`<div class="lflash" id="l-flash"></div><div class="lstats" id="l-stats"></div><div class="ltop"><div class="lph" id="l-ph"></div><h3 id="l-title"></h3><p id="l-body"></p><div class="lsteps" id="l-steps"></div></div>
      <div class="lever" id="l-lever" title="Throttle: drag, or use W/S or the arrow keys"><div class="ltrack"><i id="l-fill"></i></div><div class="lhandle" id="l-handle"></div><span>THROTTLE</span></div>
      <button class="btn sm" id="l-skip">Skip landing <kbd>Space</kbd></button><div class="llook">Drag to look around the cockpit</div>`;
    document.body.appendChild(el);
    const lev=el.querySelector('#l-lever');const setFromY=y=>{const r=lev.querySelector('.ltrack').getBoundingClientRect();LAND.thr=clamp(1-(y-r.top)/r.height,0,1)};
    lev.addEventListener('pointerdown',e=>{lev.setPointerCapture(e.pointerId);LAND.drag=true;setFromY(e.clientY)});
    lev.addEventListener('pointermove',e=>{if(LAND.drag)setFromY(e.clientY)});lev.addEventListener('pointerup',()=>{LAND.drag=false});lev.addEventListener('pointercancel',()=>{LAND.drag=false});
    lev.addEventListener('wheel',e=>{e.preventDefault();LAND.thr=clamp(LAND.thr-Math.sign(e.deltaY)*0.06,0,1)},{passive:false});
    el.querySelector('#l-skip').onclick=()=>landSkip()}
  el.classList.toggle('hidden',!on);
}
addEventListener('keydown',e=>{if(!LAND.on)return;const k=e.key;
  if(k==='ArrowUp'||k==='w'||k==='W'){LAND.keys.up=true;e.preventDefault()}else if(k==='ArrowDown'||k==='s'||k==='S'){LAND.keys.down=true;e.preventDefault()}
  else if(k===' '||k==='Escape'){e.preventDefault();e.stopImmediatePropagation();landSkip()}},true);
addEventListener('keyup',e=>{const k=e.key;if(k==='ArrowUp'||k==='w'||k==='W')LAND.keys.up=false;if(k==='ArrowDown'||k==='s'||k==='S')LAND.keys.down=false});
// drag anywhere to look around the cabin
addEventListener('pointermove',e=>{if(!LAND.on||LAND.drag||!(e.buttons&1)||e.target.closest&&e.target.closest('#landui .lever,#landui button'))return;LAND.yaw=clamp(LAND.yaw-e.movementX*0.004,-0.9,0.9);LAND.pitch=clamp(LAND.pitch-e.movementY*0.004,-0.55,0.45)});
function renderLandPhase(){const p=LAND_PHASES[LAND.phase];$('#l-ph').textContent=`Entry, descent and landing · ${LAND.phase+1}/${LAND_PHASES.length}`;$('#l-title').textContent=p.title;$('#l-body').textContent=p.body;
  $('#l-steps').innerHTML=LAND_PHASES.map((q,i)=>`<i class="${i<LAND.phase?'done':i===LAND.phase?'on':''}" title="${q.title}"></i>`).join('');
  $('#l-lever').classList.toggle('live',p.id==='powered')}
function landSkip(){if(!LAND.on)return;LAND.touch=LAND.touch||{v:1.2,skipped:true};LAND.h=0;finishLanding()}
/* ---------- each frame ---------- */
const _lv=new THREE.Vector3(),_lt=new THREE.Vector3();
function landingUpdate(dt){
  if(!LAND.on)return;LAND.t+=dt;LAND.frame++;S.time+=dt*HPS*0.3;const gy=game.introGY,ck=LAND.ck;
  const ph=LAND_PHASES[LAND.phase];
  if(ph.id==='orbit'){const f=LAND.t/ph.t;LAND.h=LAND_PHASES[1].h[0];LAND.v=-3500;LAND.shake=0.1+smooth(0.6,1,f)*1.6;game.orbitView=true;orbitUpdate(dt,ck);$('#l-flash').style.opacity=smooth(0.72,1,f);
    if(f>0.6&&LAND.frame%8===0)sfx(0.5,120+f*80,0.5,0.04*f,'lowpass');
    if(LAND.t>=ph.t){LAND.phase++;LAND.t=0;game.orbitView=false;orbitLeave(ck);renderLandPhase();beep(240,0.3,'sawtooth',0.06)}}
  else if(ph.id!=='powered'){ // automatic phases follow a scripted path
    const f=clamp(LAND.t/ph.t,0,1);LAND.h=lerp(ph.h[0],ph.h[1],f);LAND.v=ph.id==='entry'?-150+f*40:ph.id==='chute'?-80+f*30:-45;
    LAND.shake=ph.id==='entry'?1.4:ph.id==='chute'&&f<0.15?2.6:0.35;if(ph.id==='entry')$('#l-flash').style.opacity=1-smooth(0,2.2,LAND.t);   // the glow fades as you break through
    if(LAND.t>=ph.t){LAND.phase++;LAND.t=0;if(LAND_PHASES[LAND.phase].id==='powered'){LAND.v=-32;LAND.h=260}renderLandPhase();beep(LAND.phase===2?300:520,0.18,'sine',0.08)}
  }else if(!LAND.touch){
    if(LAND.keys.up)LAND.thr=clamp(LAND.thr+dt*0.9,0,1);if(LAND.keys.down)LAND.thr=clamp(LAND.thr-dt*0.9,0,1);
    const thr=LAND.fuel>0?LAND.thr:0;LAND.fuel=Math.max(0,LAND.fuel-thr*LAND_BURN*dt);
    LAND.v+=(thr*LAND_THRUST-LAND_G)*dt;LAND.v=Math.min(LAND.v,6);LAND.h+=LAND.v*dt;LAND.shake=0.25+thr*0.8;
    if(LAND.h<25&&thr>0.25&&LAND.frame%6===0)puff(LANDER_X+(Math.random()-0.5)*6,gy,LANDER_Z+(Math.random()-0.5)*6,4+thr*6);   // engine dust blasting off the ground
    if(LAND.h<=0){LAND.h=0;LAND.touch={v:-LAND.v};LAND.t=0;puff(LANDER_X,gy,LANDER_Z,14);beep(160,0.5,'sine',0.1);
      const v=LAND.touch.v,grade=v<1.5?['Perfect landing!','Barely a bump. Mission Control is cheering.']:v<3?['Good landing','Solid touchdown, well within the lander’s limits.']:v<6?['Hard landing','The legs absorbed it, but you felt that one.']:['Crash landing!','The lander survived, just. Check your suit.'];
      $('#l-title').textContent=grade[0];$('#l-body').textContent=`${grade[1]} Touchdown speed: ${v.toFixed(1)} m/s. Fuel left: ${Math.round(LAND.fuel)}%.`;$('#l-lever').classList.remove('live')}
  }else if(LAND.touch.skipped)finishLanding();
  else if(LAND.t>EXIT_T+1.6)finishLanding();
  if(!LAND.on)return;                                            // the landing just finished this frame
  const pid=LAND_PHASES[LAND.phase].id,powered=pid==='powered'&&!LAND.touch;
  // lander, flame, parachute
  staticLander.position.y=gy+LAND.h;const fl=staticLander.userData.flame;fl.visible=powered&&LAND.thr>0.05&&LAND.fuel>0;if(fl.visible)fl.scale.set(1,0.4+LAND.thr*1.2+Math.random()*0.2,1);
  ck.chute.visible=pid==='chute'||(pid==='shield'&&LAND.t<0.6);
  // cockpit sits inside the lander; you look out through the window
  const sh=LAND.shake*(LAND.touch?0:1),ex=LAND.touch?landExit(LAND.t-1.6):null;
  if(game.orbitView){ck.g.position.set(0,ORB.R+ORB.alt,0)}else ck.g.position.set(LANDER_X,gy+LAND.h+2.9,LANDER_Z);ck.g.rotation.set(ex?ex.level:game.orbitView?-0.85:-0.36,landHead()+Math.PI,0,'YXZ');   // nose down on the way in, level once landed
  if(ex){_lv.copy(ex.eye);ck.door.position.x=ex.door*0.82;if(ex.door>0.02&&!LAND.shown){LAND.shown=true;staticLander.traverse(o=>o.layers.set(0));staticLander.userData.flame.visible=false}ck.hatchLight.material.color.set(ex.door>0.05?'#3fe07a':'#ff5a4f');ck.hatchLight.material.emissive.copy(ck.hatchLight.material.color)}
  else _lv.set((Math.random()-0.5)*0.01*sh,0.08+(Math.random()-0.5)*0.01*sh,0.28);
  ck.g.updateMatrixWorld(true);ck.g.localToWorld(camera.position.copy(_lv));
  const yaw=ex?ex.yaw+LAND.yaw*0.3:LAND.yaw,pit=ex?ex.pitch:-0.2+LAND.pitch;_lt.set(_lv.x-Math.sin(yaw)*Math.cos(pit),_lv.y+Math.sin(pit),_lv.z-Math.cos(yaw)*Math.cos(pit));ck.g.localToWorld(_lt);camera.lookAt(_lt);
  if(camera.fov!==72){camera.fov=72;camera.updateProjectionMatrix()}
  ck.stick.rotation.x=lerp(0.55,-0.55,LAND.thr);ck.ball.rotation.z=Math.sin(LAND.t*1.3)*0.08*sh;ck.ball.rotation.x=-0.3+Math.sin(LAND.t*0.9)*0.05;
  ck.plasma.material.opacity=pid==='entry'?0.5+Math.sin(LAND.t*23)*0.12:pid==='chute'?Math.max(0,0.35-LAND.t*0.18):0;
  ck.warn.forEach((w,i)=>{w.material.emissiveIntensity=(-LAND.v>6&&powered&&LAND.h<80&&i%3===0)?(Math.sin(LAND.t*12)>0?2.2:0.2):(LAND.fuel<15&&i%3===1?1.6:0.3)});
  if(!game.orbitView){updateEnv(dt,camera.position);updateWeatherFX(dt,camera.position);updateLanders(dt)}
  landScreens(gy);
  if(LAND.frame%3===0)landStatsHTML(pid);
  $('#l-fill').style.height=(LAND.thr*100)+'%';$('#l-handle').style.bottom=`calc(${LAND.thr*100}% - 14px)`;
}
// draw the two dashboard screens: chase camera every frame, LIDAR every other frame, text 10 times a second
function landScreens(gy){
  const ck=LAND.ck,r=renderer,prevT=r.getRenderTarget(),lp=staticLander.position;
  if(game.orbitView){ORB.chase.position.copy(ck.g.position).add(_lv.set(0,-3.4,0));ck.camT.position.copy(ORB.chase.position).add(_lt.set(26,9,30));ck.camT.lookAt(ORB.chase.position);
    r.setRenderTarget(ck.rtT);r.clear();r.render(ORB.scene,ck.camT);r.setRenderTarget(ck.rtL);r.setClearColor(0x001006,1);r.clear();r.setRenderTarget(prevT);if(LAND.frame%6===0)drawLandText(gy);return}
  const a=landHead()+0.7+LAND.t*0.05,pid=LAND_PHASES[LAND.phase].id,R_=pid==='chute'?55:30;
  ck.camT.position.set(lp.x+Math.sin(a)*R_,lp.y+(pid==='chute'?14:7),lp.z+Math.cos(a)*R_);ck.camT.lookAt(lp.x,lp.y+(pid==='chute'?12:2.5),lp.z);
  r.setRenderTarget(ck.rtT);r.clear();r.render(scene,ck.camT);
  if(LAND.frame%2===0){const w=clamp(LAND.h*0.45,22,140);Object.assign(ck.camL,{left:-w,right:w,top:w*0.625,bottom:-w*0.625});ck.camL.updateProjectionMatrix();
    ck.camL.position.set(lp.x,lp.y+5,lp.z);ck.camL.up.set(Math.sin(landHead()),0,Math.cos(landHead()));ck.camL.lookAt(lp.x,lp.y-100,lp.z);
    ck.lidarMat.uniforms.gy.value=gy;ck.lidarMat.uniforms.t.value=LAND.t+LAND.phase*10;
    const bg=scene.background,fog=scene.fog,cc=r.getClearColor(new THREE.Color()),ca=r.getClearAlpha();scene.overrideMaterial=ck.lidarMat;scene.background=null;scene.fog=null;r.setClearColor(0x001006,1);
    r.setRenderTarget(ck.rtL);r.clear();r.render(scene,ck.camL);scene.overrideMaterial=null;scene.background=bg;scene.fog=fog;r.setClearColor(cc,ca)}
  r.setRenderTarget(prevT);
  if(LAND.frame%6===0)drawLandText(gy)}
function drawLandText(gy){
  const ck=LAND.ck,pid=LAND_PHASES[LAND.phase].id,lp=staticLander.position;
  // LIDAR overlay: range rings, crosshair, ground slope under you
  {const x=ck.ovL.x;x.clearRect(0,0,512,320);x.strokeStyle='rgba(140,255,180,.85)';x.fillStyle='rgba(140,255,180,.95)';x.lineWidth=2;
    x.beginPath();x.moveTo(236,160);x.lineTo(276,160);x.moveTo(256,140);x.lineTo(256,180);x.stroke();for(const rr of[50,100,150]){x.beginPath();x.arc(256,160,rr,0,TAU);x.globalAlpha=0.35;x.stroke();x.globalAlpha=1}
    const dx=groundHeight(lp.x+4,lp.z)-groundHeight(lp.x-4,lp.z),dz=groundHeight(lp.x,lp.z+4)-groundHeight(lp.x,lp.z-4),slope=Math.atan(Math.hypot(dx,dz)/8)*180/Math.PI,safe=slope<12;
    x.font='bold 22px monospace';x.fillText('LIDAR · TERRAIN SCAN',16,32);x.font='bold 20px monospace';
    x.fillText(pid==='orbit'?'OUT OF RANGE':pid==='entry'||pid==='chute'?'HEAT SHIELD ON: NO SCAN':`RANGE ${Math.round(LAND.h+2.9)} m`,16,62);
    if(pid!=='orbit'&&pid!=='entry'&&pid!=='chute'){x.fillText(`SLOPE ${slope.toFixed(1)}°`,16,292);x.fillStyle=safe?'#7fffa0':'#ff6a4d';x.fillText(safe?'LANDING ZONE SAFE':'SLOPE: STEER CLEAR',250,292)}
    ck.ovL.t.needsUpdate=true}
  // chase camera overlay: the lander's statistics
  {const x=ck.ovT.x;x.clearRect(0,0,512,320);x.fillStyle='rgba(6,10,16,.55)';x.fillRect(0,0,215,320);x.fillStyle='#e8f4ff';x.font='bold 18px monospace';
    const vs=pid==='orbit'?0:-LAND.v,mass=Math.round(LAND_DRY+LAND_PROP*LAND.fuel/100),temp=pid==='orbit'?-120:pid==='entry'?Math.round(900+LAND.t*110):pid==='chute'?Math.round(1300-LAND.t*250):Math.round(-40+LAND.thr*30);
    const rows=[['ALT',pid==='orbit'?Math.round(ORB.alt*0.6)+' km':Math.round(LAND.h)+' m'],['V/SPD',vs.toFixed(1)+' m/s'],['SPEED',pid==='orbit'?'12,600 km/h':pid==='entry'?Math.round(20000-LAND.t*4000)+' km/h':pid==='chute'?Math.round(1500-LAND.t*330)+' km/h':Math.round(vs*3.6)+' km/h'],
      ['FUEL',Math.round(LAND.fuel)+' %'],['THRUST',Math.round((pid==='powered'?LAND.thr:0)*100)+' %'],['MASS',mass.toLocaleString()+' kg'],['GRAVITY','3.71 m/s²'],['HULL',temp+' °C'],['PHASE',{orbit:'ORBIT',entry:'ENTRY',chute:'PARACHUTE',shield:'SHIELD SEP',powered:'POWERED'}[pid]]];
    rows.forEach(([k,v],i)=>{x.fillStyle='#8fb3d9';x.fillText(k,12,30+i*32);x.fillStyle=k==='V/SPD'&&pid==='powered'?(vs>6?'#ff6a4d':vs>3?'#ffd34d':'#7fffa0'):'#ffffff';x.fillText(v,96,30+i*32)});
    x.fillStyle='#ffb35c';x.font='bold 16px monospace';x.fillText('CHASE CAM',400,24);ck.ovT.t.needsUpdate=true}}
// the walk out, in the cockpit's own frame: turn round, stand up, the hatch opens, through it and down the stairs
// the walk out, in the cockpit's own frame: turn round and stand up, the hatch opens, step to the threshold,
// pause to take in the view, walk down the ten stairs one step at a time, and step onto Mars
const EXIT_T=11.2;
function landExit(t){
  const ss=x=>x<=0?0:x>=1?1:x*x*(3-2*x),e=new THREE.Vector3();let yaw=0,pitch=-0.05,door=0;
  if(t<0)return{eye:e.set(0,0.08,0.28),yaw:0,pitch:-0.2,door:0,level:-0.36*(1-ss((t+1.6)/1.6))};
  if(!LAND.exitShown){LAND.exitShown=true;$('#l-title').textContent='Touchdown';$('#l-body').textContent='Unbuckling and turning round to the hatch…';$('#l-lever').style.display='none';$('#l-stats').style.display='none'}
  // 0–1.6 s: turn round and stand up
  const turn=ss(t/1.6),stand=ss((t-0.3)/1.3);yaw=turn*Math.PI;e.set(0,lerp(0.08,0.62,stand),0.28);pitch=lerp(-0.2,-0.02,stand);
  // 1.6–2.8 s: the hatch slides open
  door=ss((t-1.6)/1.2);if(t>1.6&&!LAND.hiss){LAND.hiss=true;SFX.hiss()}
  // 2.8–4.0 s: walk to the threshold, a gentle bob with each step
  const w1=clamp((t-2.8)/1.2,0,1);if(w1>0){e.z=lerp(0.28,1.8,ss(w1));e.y+=Math.abs(Math.sin(w1*Math.PI*3))*0.025}
  // 4.0–5.8 s: stop in the hatch and look out over Mars
  if(t>=4.0&&!LAND.viewMsg){LAND.viewMsg=true;$('#l-title').textContent='Welcome to Mars';$('#l-body').textContent='Your first look at your new home. Time to head down the stairs.'}
  const look=clamp((t-4.0)/1.8,0,1);if(look>0&&look<1){yaw+=Math.sin(look*Math.PI*2)*0.38*Math.sin(look*Math.PI);pitch=0.05*Math.sin(look*Math.PI)}
  // 5.8–9.6 s: down the ten stairs, one step at a time
  const st=clamp((t-5.8)/3.8,0,1);if(st>0){const s10=st*10,k=Math.floor(Math.min(s10,9.999)),f=ss(s10-k),steps=Math.min(10,k+f);
    e.z=lerp(1.95,5.0,steps/10);e.y=0.62-0.2*steps-Math.sin(f*Math.PI)*0.02;pitch=-0.72*Math.sin(Math.min(1,st*1.6)*Math.PI*0.5)*(1-ss((st-0.7)/0.3))-0.06;yaw=Math.PI+Math.sin(st*Math.PI*2)*0.04}
  // 9.6–11.2 s: step onto the ground and walk a few paces, looking up at the horizon
  const w2=clamp((t-9.6)/1.6,0,1);if(w2>0){e.z=lerp(5.0,6.6,ss(w2));e.y=-1.38+Math.abs(Math.sin(w2*Math.PI*2.5))*0.03;pitch=lerp(-0.04,0.02,ss(w2));yaw=Math.PI}
  return{eye:e,yaw,pitch,door,level:0}}
function finishLanding(){
  if(!LAND.on)return;$('#l-flash').style.opacity=0;LAND.on=false;game.landing=false;landUI(false);const ck=LAND.ck;if(game.orbitView)orbitLeave(ck);
  staticLander.visible=true;staticLander.position.y=game.introGY;staticLander.userData.flame.visible=false;
  const v=LAND.touch?LAND.touch.v:1,walked=!!(LAND.touch&&!LAND.touch.skipped),foot=new THREE.Vector3(0,-2.9,6.6),eyeP=camera.position.clone(),eyeQ=camera.quaternion.clone();if(walked)ck.g.localToWorld(foot);
  scene.remove(ck.g);staticLander.remove(ck.chute);staticLander.traverse(o=>o.layers.set(0));camera.layers.disable(CK_LAYER);ck.rtL.dispose();ck.rtT.dispose();LAND.ck=null;
  S.stats.landing=Math.round(v*10)/10;game.introT=99;introUpdate(0);LAND.exitShown=false;LAND.hiss=false;LAND.viewMsg=false;LAND.shown=false;game.orbitView=false;$('#l-lever').style.display='';$('#l-stats').style.display='';
  if(walked){const yw=landHead()+Math.PI;P.pos.set(foot.x,groundHeight(foot.x,foot.z),foot.z);P.yaw=yw;cam.yaw=yw+1.75;cam.pitch=0.2;cam.zoom=0.9;P.lastG=undefined;game.camSnap=true;astro.rotation.set(0,yw,0,'YXZ');
    game.camBlend={p:eyeP,q:eyeQ,t:0,dur:1.6}}   // glide from your eyes out to the usual camera
  if(v>=3&&!(LAND.touch&&LAND.touch.skipped)){const dmg=Math.round(clamp((v-3)*6,4,35));P.hp=Math.max(10,P.hp-dmg);toast(`Hard landing: suit integrity -${dmg}`,'warn')}
}

/* ---------- approaching from orbit: Mars from space, before entry ---------- */
const ORB={scene:null,planet:null,R:2400,alt:900,chase:null};
function marsTexture(){const W=512,H=256,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),img=x.createImageData(W,H),n1=makeNoise(5),n2=makeNoise(9);
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){const lon=i/W*TAU,lat=(0.5-j/H)*Math.PI,cx=Math.cos(lat)*Math.cos(lon),cz=Math.cos(lat)*Math.sin(lon),cyv=Math.sin(lat);
    let f=0.5+0.35*n1(cx*3+cyv*2,cz*3-cyv)+0.18*n2(cx*9,cz*9+cyv*7);const dark=clamp((n2(cx*2.2+5,cz*2.2+cyv*1.5)-0.15)*2.2,0,1);
    let r=196+f*40-dark*70,g=96+f*30-dark*40,b=56+f*16-dark*20;const cap=Math.abs(lat)>1.25+0.08*n1(cx*6,cz*6);if(cap){r=g=b=238}
    const k=(j*W+i)*4;img.data[k]=clamp(r,0,255);img.data[k+1]=clamp(g,0,255);img.data[k+2]=clamp(b,0,255);img.data[k+3]=255}
  x.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function orbitBuild(){if(ORB.scene)return;const sc=new THREE.Scene();sc.background=new THREE.Color('#020308');
  const sky=new THREE.Group();sc.add(sky);ORB.sky=sky;const st=new THREE.BufferGeometry(),pts=[];for(let i=0;i<2500;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(2100);pts.push(v.x,v.y,v.z)}st.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  sky.add(new THREE.Points(st,new THREE.PointsMaterial({color:0xffffff,size:2.2,sizeAttenuation:false,depthWrite:false})));
  const sun=new THREE.DirectionalLight(0xfff2e0,3.2);sun.position.set(-1,0.35,-0.6);sc.add(sun,new THREE.AmbientLight(0x404858,0.6));
  const planet=new THREE.Mesh(new THREE.SphereGeometry(ORB.R,96,64),new THREE.MeshStandardMaterial({map:marsTexture(),roughness:1}));sc.add(planet);ORB.planet=planet;
  const halo=new THREE.Mesh(new THREE.SphereGeometry(ORB.R*1.025,96,64),new THREE.MeshBasicMaterial({color:'#ffb27a',transparent:true,opacity:0.22,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));sc.add(halo);
  const sunDisk=new THREE.Mesh(new THREE.SphereGeometry(40,16,12),new THREE.MeshBasicMaterial({color:'#fff6dc'}));sunDisk.position.set(-1600,700,-1000);sky.add(sunDisk);
  const ch=mkLander();ch.traverse(o=>o.layers.set(1));sc.add(ch);ORB.chase=ch;ORB.scene=sc}
function orbitEnter(ck){orbitBuild();ORB.alt=900;ORB.scene.add(ck.g)}
function orbitLeave(ck){if(ck&&ck.g.parent!==scene)scene.add(ck.g)}
function orbitUpdate(dt,ck){const f=clamp(LAND.t/LAND_PHASES[0].t,0,1);ORB.sky.position.copy(ck.g.position);ORB.alt=lerp(900,160,f*f);ORB.planet.rotation.y+=dt*0.035;ORB.planet.rotation.z=0.3;
  ck.plasma.material.opacity=f>0.8?(f-0.8)*2.5:0}

// the same flight numbers as the screen, in the corner of your view
function landStatsHTML(pid){const vs=pid==='orbit'?0:-LAND.v,cls=pid==='powered'?(vs>6?'bad':vs>3?'warn':'good'):'';
  const rows=[['Altitude',pid==='orbit'?Math.round(ORB.alt*0.6)+' km':Math.round(LAND.h)+' m'],['Vertical speed',`<b class="${cls}">${vs.toFixed(1)} m/s</b>`],
    ['Speed',pid==='orbit'?'12,600 km/h':pid==='entry'?Math.round(20000-LAND.t*4000)+' km/h':pid==='chute'?Math.round(1500-LAND.t*330)+' km/h':Math.round(vs*3.6)+' km/h'],
    ['Thrust',Math.round((pid==='powered'?LAND.thr:0)*100)+' %'],['Fuel',Math.round(LAND.fuel)+' %'],['Mass',Math.round(LAND_DRY+LAND_PROP*LAND.fuel/100).toLocaleString()+' kg']];
  $('#l-stats').innerHTML=rows.map(([k,v])=>`<div><span>${k}</span>${String(v).startsWith('<b')?v:`<b>${v}</b>`}</div>`).join('')}
