'use strict';
/* =========================================================
   TOUCH CONTROLS (phones & tablets)
   Left thumb: a floating joystick. Right side: drag to look, pinch to zoom,
   tap to use/place. Buttons for jump, use (hold), interact, run, rover, menu, map, build, pause.
   ========================================================= */
const touch={joy:{x:0,y:0,id:null,ox:0,oy:0},looks:new Map(),pinch:null,use:false};
const isTouchDevice=()=>document.body.classList.contains('touch');
function enableTouch(){if(isTouchDevice()||OPT.touch==='off')return;document.body.classList.add('touch');if(typeof applyGfx==='function')applyGfx()}
if(matchMedia('(pointer:coarse)').matches||OPT.touch==='on')enableTouch();
addEventListener('touchstart',enableTouch,{passive:true,capture:true});

// ---- build the overlay ----
const tui=document.createElement('div');tui.id='touchui';
tui.innerHTML='<div id="joyhint"><b>&#9650;</b><b>&#9654;</b><b>&#9660;</b><b>&#9664;</b></div><div id="joy"><b>&#9650;</b><b>&#9654;</b><b>&#9660;</b><b>&#9664;</b><i></i></div><div id="touchaim"></div>';
document.body.appendChild(tui);
// [id, icon, action, position, size, caption] — rounded, blocky tiles with simple icons
const TI={
  jump:'<svg viewBox="0 0 24 24"><path d="M12 5l7 8h-4v6H9v-6H5z" fill="currentColor"/></svg>',
  use:'<svg viewBox="0 0 24 24"><path d="M4 20l7-7M13 4l7 7-3 3-7-7z" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linejoin="round"/></svg>',
  f:'<svg viewBox="0 0 24 24"><path d="M8 11V5.5a1.5 1.5 0 013 0V10m0-1V4.5a1.5 1.5 0 013 0V10m0-.5V6a1.5 1.5 0 013 0v7.5A6.5 6.5 0 0110.5 20 5.5 5.5 0 015 14.5V12a1.5 1.5 0 013 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  run:'<svg viewBox="0 0 24 24"><circle cx="14" cy="4.5" r="2.2" fill="currentColor"/><path d="M9 21l2.5-6 3 2.5V21M6 12l3-4 4 1 2 3h3M11.5 15L9.5 9" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  car:'<svg viewBox="0 0 24 24"><path d="M3 14l2-5h14l2 5v3H3z" fill="currentColor"/><circle cx="7" cy="18" r="2.4" fill="currentColor"/><circle cx="17" cy="18" r="2.4" fill="currentColor"/></svg>',
  menu:'<svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="currentColor"/></svg>',
  map:'<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="2"/></svg>',
  build:'<svg viewBox="0 0 24 24"><path d="M4 20l9-9M14 4l6 6-3 3-6-6z" stroke="currentColor" stroke-width="2.6" fill="none"/><path d="M11 7l6 6" stroke="currentColor" stroke-width="2"/></svg>',
  pause:'<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>'};
const TBTNS=[
  ['t-jump',TI.jump,'Space',{right:'14px',bottom:'16px'},'big','Jump'],
  ['t-use',TI.use,'use',{right:'90px',bottom:'12px'},'','Use'],
  ['t-run',TI.run,'sprint',{right:'18px',bottom:'92px'},'','Run'],
  ['t-int',TI.f,'KeyF',{right:'78px',bottom:'74px'},'ctx int','Interact'],
  ['t-car',TI.car,'KeyE',{right:'146px',bottom:'16px'},'ctx car','Rover'],
  ['t-menu',TI.menu,'Tab',{right:'10px',top:'10px'},'sm','Menu'],
  ['t-map',TI.map,'KeyM',{right:'56px',top:'10px'},'sm','Map'],
  ['t-build',TI.build,'KeyB',{right:'102px',top:'10px'},'sm','Build'],
  ['t-pause',TI.pause,'Escape',{right:'148px',top:'10px'},'sm','Pause'],
];for(const[id,icon,action,pos,size,cap]of TBTNS){const b=document.createElement('button');b.className='tbtn '+size;b.id=id;b.innerHTML=icon+'<i>'+cap+'</i>';b.title=cap;Object.assign(b.style,pos);b.dataset.a=action;tui.appendChild(b);
  b.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();initAudio();touchPress(action,b,true)},{passive:false});
  b.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();touchPress(action,b,false)},{passive:false});
  b.addEventListener('touchcancel',()=>touchPress(action,b,false));
  b.addEventListener('mousedown',e=>e.preventDefault());}
function aimCenter(){mouse.x=innerWidth/2;mouse.y=innerHeight/2;mouse.nx=0;mouse.ny=0.05}
function touchPress(action,b,down){
  if(action==='use'){
    touch.use=down;b.classList.toggle('on',down);
    if(down){if(game.state!=='play')return;if(build.active){aimCenter();updateBuild();if(build.mode==='recycle')recycle(build.hover);else placeBuild();return}
      aimCenter();mouse.drag=true;mouse.btn=0;mouse.moved=0;onWorldClick()}
    else mouse.drag=false;
    return}
  if(action==='sprint'){if(!down)return;const on=!keys.ShiftLeft;keys.ShiftLeft=on;b.classList.toggle('on',on);return}
  if(down){keys[action]=true;if(!game.typing)onKey(action)}else keys[action]=false;
}
// ---- joystick, look, pinch and taps on the game view ----
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();initAudio();
  for(const t of e.changedTouches){
    if(game.state==='play'&&touch.joy.id===null&&t.clientX<innerWidth*0.42&&t.clientY>innerHeight*0.3){
      const j=touch.joy;j.id=t.identifier;j.ox=t.clientX;j.oy=t.clientY;j.x=j.y=0;const el=$('#joy');el.style.left=j.ox+'px';el.style.top=j.oy+'px';el.style.display='block';$('#joy i').style.transform='';
    }else touch.looks.set(t.identifier,{x:t.clientX,y:t.clientY,sx:t.clientX,sy:t.clientY,t0:performance.now()});
  }
  if(touch.looks.size===2){const[a,b]=[...touch.looks.values()];touch.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.zoom}}
},{passive:false});
canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    const j=touch.joy;
    if(t.identifier===j.id){let dx=t.clientX-j.ox,dy=t.clientY-j.oy;const d=Math.hypot(dx,dy),R=52;if(d>R){dx*=R/d;dy*=R/d}j.x=dx/R;j.y=dy/R;$('#joy i').style.transform=`translate(${dx}px,${dy}px)`;continue}
    const L=touch.looks.get(t.identifier);if(!L)continue;
    const dx=t.clientX-L.x,dy=t.clientY-L.y;L.x=t.clientX;L.y=t.clientY;
    if(touch.looks.size===1&&game.state==='play'){cam.yaw-=dx*0.0065*OPT.sens;cam.pitch=clamp(cam.pitch+dy*0.005*OPT.sens,-0.3,1.35);cam.lastDrag=now}
  }
  if(touch.looks.size===2&&touch.pinch){const[a,b]=[...touch.looks.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(d>10)cam.zoom=clamp(touch.pinch.z*touch.pinch.d/d,0.45,3)}
},{passive:false});
function touchEnd(e){
  for(const t of e.changedTouches){
    const j=touch.joy;
    if(t.identifier===j.id){j.id=null;j.x=j.y=0;$('#joy').style.display='none';continue}
    const L=touch.looks.get(t.identifier);touch.looks.delete(t.identifier);
    if(L&&touch.looks.size===0&&!touch.pinch&&Math.hypot(L.x-L.sx,L.y-L.sy)<12&&performance.now()-L.t0<350)touchTap(L.x,L.y);
  }
  if(touch.looks.size<2)touch.pinch=null;
}
canvas.addEventListener('touchend',e=>{e.preventDefault();touchEnd(e)},{passive:false});
canvas.addEventListener('touchcancel',touchEnd);
// a quick tap on the world: place/recycle in build mode, otherwise use the held consumable
function touchTap(x,y){
  if(game.state!=='play'||game.paused)return;
  mouse.x=x;mouse.y=y;mouse.nx=x/innerWidth*2-1;mouse.ny=-(y/innerHeight)*2+1;
  if(build.active){updateBuild();if(build.mode==='recycle')recycle(build.hover);else placeBuild();return}
  onWorldClick();
}
// joystick feeds the same input as WASD (analog: push further to go faster)
function touchInput(inp){
  const j=touch.joy;if(j.id===null&&!j.x&&!j.y)return inp;
  inp.fwd=clamp(inp.fwd-j.y,-1,1);inp.steer=clamp(inp.steer-j.x,-1,1);return inp;
}
// keep the aim centred while Use is held, and show/hide the overlay with the game state
setInterval(()=>{
  const on=isTouchDevice()&&game.state==='play'&&!game.paused&&!invUI.open&&!game.wardrobe&&!game.typing&&!game.dialogue&&(!S||!S.over);
  tui.classList.toggle('on',on);$('#touchaim').classList.toggle('on',on);
  if(!on&&touch.joy.id!==null){touch.joy.id=null;touch.joy.x=touch.joy.y=0;$('#joy').style.display='none'}
  if(on){const car=$('#t-car');car.querySelector('i').textContent=P.mode==='rover'?'Exit':'Rover';$('#t-build').classList.toggle('on',!!build.active);$('#t-run').classList.toggle('on',!!keys.ShiftLeft)}
  if(touch.use)aimCenter();
},120);

// show Interact only when there's something to interact with, and Rover only near the rover
function touchContext(){if(!isTouchDevice()||game.state!=='play')return;const t=$('#touchui');
  t.classList.toggle('canint',!!game.hasHint);t.classList.toggle('cancar',P.mode==='rover'||(!P.inside&&Math.hypot(R.pos.x-P.pos.x,R.pos.z-P.pos.z)<9)||(P.inside&&INT.desk&&Math.hypot(P.pos.x-INT.x-INT.desk.x,P.pos.z-INT.z-INT.desk.z)<1.7))}
setInterval(touchContext,250);
