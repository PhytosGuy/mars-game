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
tui.innerHTML='<div id="joyhint"></div><div id="joy"><i></i></div><div id="touchaim"></div>';
document.body.appendChild(tui);
// [id, label, action, position, size]
const TBTNS=[
  ['t-jump','Jump','Space',{right:'18px',bottom:'92px'},'big'],
  ['t-use','Use','use',{right:'112px',bottom:'74px'},'big'],
  ['t-int','F','KeyF',{right:'110px',bottom:'170px'},''],
  ['t-run','Run','sprint',{right:'24px',bottom:'196px'},''],
  ['t-car','Rover','KeyE',{right:'186px',bottom:'160px'},'sm'],
  ['t-menu','Menu','Tab',{right:'12px',top:'10px'},'sm'],
  ['t-map','Map','KeyM',{right:'64px',top:'10px'},'sm'],
  ['t-build','Build','KeyB',{right:'116px',top:'10px'},'sm'],
  ['t-pause','❚❚','Escape',{right:'168px',top:'10px'},'sm'],
];
for(const[id,label,action,pos,size]of TBTNS){const b=document.createElement('button');b.className='tbtn '+size;b.id=id;b.textContent=label;Object.assign(b.style,pos);b.dataset.a=action;tui.appendChild(b);
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
      const j=touch.joy;j.id=t.identifier;j.ox=t.clientX;j.oy=t.clientY;j.x=j.y=0;const el=$('#joy');el.style.left=j.ox+'px';el.style.top=j.oy+'px';el.style.display='block';el.firstChild.style.transform='';
    }else touch.looks.set(t.identifier,{x:t.clientX,y:t.clientY,sx:t.clientX,sy:t.clientY,t0:performance.now()});
  }
  if(touch.looks.size===2){const[a,b]=[...touch.looks.values()];touch.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.zoom}}
},{passive:false});
canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
    const j=touch.joy;
    if(t.identifier===j.id){let dx=t.clientX-j.ox,dy=t.clientY-j.oy;const d=Math.hypot(dx,dy),R=52;if(d>R){dx*=R/d;dy*=R/d}j.x=dx/R;j.y=dy/R;$('#joy').firstChild.style.transform=`translate(${dx}px,${dy}px)`;continue}
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
  if(on){const car=$('#t-car');car.textContent=P.mode==='rover'?'Exit':'Rover';$('#t-build').classList.toggle('on',!!build.active);$('#t-run').classList.toggle('on',!!keys.ShiftLeft)}
  if(touch.use)aimCenter();
},120);
