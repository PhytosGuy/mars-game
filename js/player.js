'use strict';

/* =========================================================
   PLAYER, ROVER, CAMERA
   ========================================================= */
let now=0;
const astro=mkAstronaut();astro.visible=false;scene.add(astro);
const rover=mkRover();rover.visible=false;rover.rotation.order='YXZ';scene.add(rover);
const P={mode:'foot',pos:new THREE.Vector3(),vel:new THREE.Vector3(),yaw:0,onGround:true,o2:100,phase:0,hp:100,bat:100,stam:100,stamT:0,climbing:false,hot:0};
const R={pos:new THREE.Vector3(),yaw:0,speed:0,steer:0,vy:0,vx:0,vz:0,wp:0,wr:0,wy:0,upside:false,upT:0,airRot:0,battery:100,maxBat:100,pitch:0,roll:0,cruise:false,cruiseV:0,air:false,wheel:0,lastG:0,visY:0};
const cam={yaw:0,pitch:0.32,zoom:1,lastDrag:-10,target:new THREE.Vector3()};
const focusPos=()=>P.mode==='foot'?P.pos:R.pos;
const keys={};
function readInput(){const k=keys,inp={fwd:(k.KeyW?1:0)-(k.KeyS?1:0),steer:(k.KeyA?1:0)-(k.KeyD?1:0),
  camTurn:(k.ArrowLeft?1:0)-(k.ArrowRight?1:0),jump:!!k.Space,sprint:!!(k.ShiftLeft||k.ShiftRight),brake:!!k.Space};
  return typeof touchInput==='function'?touchInput(inp):inp}
function pushOut(pos,cx,cz,rr){const dx=pos.x-cx,dz=pos.z-cz,d=Math.hypot(dx,dz);if(d<rr&&d>0.001){pos.x=cx+dx/d*rr;pos.z=cz+dz/d*rr;return true}return false}
function collideWorld(pos,rad,self){
  let hit=false;
  for(const b of blds){const d=BUILD[b.type];if(d.solid===false||b.progress<0.05||Math.abs(b.x-pos.x)>d.r+rad+4||Math.abs(b.z-pos.z)>d.r+rad+4)continue;
    for(let it=0;it<3;it++)if(pushField(pos,b,rad,pos.y,self==='rover'?0.6:0.45))hit=true;else break}
  if(staticLander&&pushOut(pos,staticLander.position.x,staticLander.position.z,2.4+rad))hit=true;
  for(const l of landers)if(l.done&&pushOut(pos,l.x,l.z,(l.crew?2.2:1.7)+rad))hit=true;
  if(self!=='rover'&&P.mode==='foot'&&pushOut(pos,R.pos.x,R.pos.z,2.3+rad))hit=true;
  return hit;
}
/* ---------- building hitboxes: a height map of each module's real shape ----------
   Each building is probed once from above on a small grid (in its own rotated frame). Cells taller than a step block you;
   anything lower is a floor you can stand on, so every module (solar panels included) is climbable and walkable. */
const _bmInv=new THREE.Matrix4(),_bmT=new THREE.Matrix4(),_bbx=new THREE.Box3();
function toLocal(b,x,z){const dx=x-b.x,dz=z-b.z,c=Math.cos(b.rot),s=Math.sin(b.rot);return[dx*c-dz*s,dx*s+dz*c]}
function toWorld(b,lx,lz){const c=Math.cos(b.rot),s=Math.sin(b.rot);return[b.x+lx*c+lz*s,b.z-lx*s+lz*c]}
function bldField(b){
  const done=b.progress>=1,key=done+'|'+(b.type==='solar'?Math.floor(now/6)+'|'+!!S.stowed:'')+'|'+b.y;
  if(b._hf&&b._hfKey===key)return b._hf;
  const d=BUILD[b.type];let F;
  if(!done){const r=d.r*0.7;F={x0:-r,z0:-r,cs:r/2,n:4,m:4,h:new Float32Array(16).fill(Math.max(0.15,b.progress*1.2))}} // a low construction frame
  else{
    b.g.updateMatrixWorld(true);_bmInv.copy(b.g.matrixWorld).invert();const u=new THREE.Box3();
    b.g.traverse(m=>{if(!m.isMesh||!m.visible||!m.geometry)return;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();
      _bbx.copy(m.geometry.boundingBox).applyMatrix4(_bmT.multiplyMatrices(_bmInv,m.matrixWorld));if(_bbx.max.y<0.1)return;u.union(_bbx)});
    if(u.isEmpty()){const r=d.r*0.8;u.set(new THREE.Vector3(-r,0,-r),new THREE.Vector3(r,1.5,r))}
    const x0=u.min.x-0.1,z0=u.min.z-0.1,w=u.max.x-x0+0.1,dd=u.max.z-z0+0.1,cs=clamp(Math.max(w,dd)/36,0.3,1),n=Math.ceil(w/cs),mm=Math.ceil(dd/cs),h=new Float32Array(n*mm);
    for(let j=0;j<mm;j++)for(let i=0;i<n;i++){const[wx,wz]=toWorld(b,x0+(i+0.5)*cs,z0+(j+0.5)*cs),s=surfaceY(b.g,wx,wz);h[j*n+i]=s>-1e8?s-b.y:-99}
    F={x0,z0,cs,n,m:mm,h}}
  b._hf=F;b._hfKey=key;return F}
// height of the building's surface (above its base) at a world point, or -99 if there's nothing there
function fieldTop(b,x,z){const F=bldField(b),[lx,lz]=toLocal(b,x,z),i=Math.floor((lx-F.x0)/F.cs),j=Math.floor((lz-F.z0)/F.cs);return i<0||j<0||i>=F.n||j>=F.m?-99:F.h[j*F.n+i]}
// push a body of radius rad (feet at y) away from the nearest part of the building that's taller than a step
function pushField(pos,b,rad,y,step){
  const F=bldField(b),[lx,lz]=toLocal(b,pos.x,pos.z),rel=y-b.y;
  const i0=Math.floor((lx-rad-F.x0)/F.cs),i1=Math.floor((lx+rad-F.x0)/F.cs),j0=Math.floor((lz-rad-F.z0)/F.cs),j1=Math.floor((lz+rad-F.z0)/F.cs);
  let best=null,bd=1e9;
  for(let j=Math.max(0,j0);j<=Math.min(F.m-1,j1);j++)for(let i=Math.max(0,i0);i<=Math.min(F.n-1,i1);i++){
    if(F.h[j*F.n+i]<=rel+step)continue;const cx0=F.x0+i*F.cs,cz0=F.z0+j*F.cs,qx=clamp(lx,cx0,cx0+F.cs),qz=clamp(lz,cz0,cz0+F.cs),dd=Math.hypot(lx-qx,lz-qz);
    if(dd<rad&&dd<bd){bd=dd;best=[qx,qz,cx0+F.cs/2,cz0+F.cs/2]}}
  if(!best)return false;
  let nx,nz;const dx=lx-best[0],dz=lz-best[1],dl=Math.hypot(dx,dz);
  if(dl>1e-4){nx=best[0]+dx/dl*(rad+0.01);nz=best[1]+dz/dl*(rad+0.01)}
  else{const ex=lx-best[2],ez=lz-best[3],el=Math.hypot(ex,ez)||1;nx=best[2]+ex/el*(F.cs*0.72+rad);nz=best[3]+ez/el*(F.cs*0.72+rad)} // inside a solid cell
  const[wx,wz]=toWorld(b,nx,nz);pos.x=wx;pos.z=wz;return true}
// boulders that would poke through a new module are cleared away
function clearRocksUnder(b){const r=BUILD[b.type].r;forRocks(b.x,b.z,r,k=>{if(Math.hypot(k.p.x-b.x,k.p.z-b.z)<r+rockHR(k)*0.5){k.hp=0;_m4.makeScale(0,0,0);const ch=chunks.get(k.key.split(',').slice(0,2).join(','));if(ch&&ch.im){ch.im.setMatrixAt(k.i,_m4);ch.im.instanceMatrix.needsUpdate=true}}})}
/* ---------- surfaces you can climb and stand on (modules, wrecks, ruins, huts, boulders) ---------- */
const _downRay=new THREE.Raycaster(),_dn=new THREE.Vector3(0,-1,0),_ro=new THREE.Vector3();
function surfaceY(obj,x,z){_ro.set(x,obj.position.y+70,z);_downRay.set(_ro,_dn);_downRay.far=90;
  for(const h of _downRay.intersectObject(obj,true)){const m=h.object;if(!m.isMesh||!m.visible||m.isSprite||(m.material&&m.material.transparent&&m.material.opacity<0.6))continue;let v=m,ok=true;while(v&&v!==obj){if(!v.visible){ok=false;break}v=v.parent}if(ok)return h.point.y}
  return -1e9}
function solidTopAt(x,z){
  let t=-1e9;
  for(const b of blds){const d=BUILD[b.type];if(b.progress<0.05||Math.abs(b.x-x)>d.r+4||Math.abs(b.z-z)>d.r+4)continue;const h=fieldTop(b,x,z);if(h>-50)t=Math.max(t,b.y+h)}
  if(typeof lmMeshes!=='undefined')for(const M of lmMeshes.values()){if(!M.solids||Math.abs(M.L.x-x)>45||Math.abs(M.L.z-z)>45)continue;if(M.solids.some(s=>Math.hypot(x-s.x,z-s.z)<s.r))t=Math.max(t,surfaceY(M.g,x,z))}
  forRocks(x,z,0.5,k=>{t=Math.max(t,rockTopAt(k,Math.hypot(k.p.x-x,k.p.z-z)))});
  return t}
function solidFloor(x,z,y,g){const t=solidTopAt(x,z);return t>g&&y>=t-0.5?t:g}
/* ---------- boulders: solid from the side, standable from above ---------- */
function forRocks(x,z,r,fn){const c0=Math.floor((x-r)/CHUNK),c1=Math.floor((x+r)/CHUNK),d0=Math.floor((z-r)/CHUNK),d1=Math.floor((z+r)/CHUNK);
  for(let i=c0;i<=c1;i++)for(let j=d0;j<=d1;j++){const c=chunks.get(i+','+j);if(!c||!c.rocks)continue;for(const k of c.rocks)if(k.hp>0&&Math.abs(k.p.x-x)<r+4&&Math.abs(k.p.z-z)<r+4)fn(k)}}
const rockHR=k=>(k.sc.x+k.sc.z)*0.45;
function rockTopAt(k,d){const hr=rockHR(k);return d>=hr?-Infinity:k.p.y+k.sc.y*0.92*Math.sqrt(1-(d/hr)*(d/hr))}
function rockFloor(x,z,y,g){let f=g;forRocks(x,z,1,k=>{const t=rockTopAt(k,Math.hypot(k.p.x-x,k.p.z-z));if(t>f&&y>=t-0.5)f=t});return f}
function collideRocks(pos,rad,stepH){let hit=false;
  forRocks(pos.x,pos.z,rad,k=>{const hr=rockHR(k),d=Math.hypot(pos.x-k.p.x,pos.z-k.p.z);if(d>=hr+rad)return;
    if(k.p.y+k.sc.y*0.92-groundHeight(k.p.x,k.p.z)<stepH)return;                // small stones: step over them
    if(pos.y>=rockTopAt(k,Math.max(0,d-rad*0.7))-0.45)return;                     // you're on top of it
    if(pushOut(pos,k.p.x,k.p.z,hr+rad))hit=true});
  return hit}
/* ---------- other bodies: creatures, crewmates, ruins and wrecks ---------- */
const CR_RAD={tharrak:0.6,rockback:1.6,skitter:0.35,wyrm:1.2,stalker:0.6,hopper:0.3,strider:1.1,mite:0.3,ravager:1.7};
function collideBodies(pos,rad,self){let hit=false;
  if(typeof creatures!=='undefined')for(const c of creatures.values()){const r=CR_RAD[c.sp];if(!r||(c.sp==='wyrm'&&!(c.emerge>0)))continue;
    if(pos.y>c.y+(c.h||1)*0.85||pos.y+1.8<c.y)continue;if(pushOut(pos,c.x,c.z,r+rad))hit=true}
  if(typeof net!=='undefined')for(const p of net.players.values()){const q=p.t&&p.t.p;if(!q)continue;
    if(q[4]){if(self!=='rover'&&pushOut(pos,p.rv.position.x,p.rv.position.z,2.2+rad))hit=true}
    else if(Math.abs(p.a.position.y-pos.y)<1.8&&pushOut(pos,p.a.position.x,p.a.position.z,0.42+rad))hit=true}
  if(typeof lmMeshes!=='undefined')for(const M of lmMeshes.values()){if(!M.solids||Math.abs(M.L.x-pos.x)>60||Math.abs(M.L.z-pos.z)>60)continue;
    for(const s of M.solids){if(Math.hypot(pos.x-s.x,pos.z-s.z)>=s.r+rad)continue;if(pos.y>s.top-0.4)continue;
      if(self==='p'&&P.climbing&&pos.y>groundHeight(s.x,s.z)+0.2)continue;
      if(self!=='rover'&&pos.y>groundHeight(s.x,s.z)+0.6){const sy=surfaceY(M.g,pos.x,pos.z);if(sy>-1e8&&pos.y>=sy-0.45)continue}
      if(pushOut(pos,s.x,s.z,s.r+rad))hit=true}}
  return hit}
/* ---------- the suit's walk cycle (you and your crewmates) ---------- */
function animSuit(av,ph,amt,ground,climb){
  const u=av.userData,s=Math.sin(ph),c=Math.cos(ph),A=0.6*amt,kL=u.legL.userData.knee,kR=u.legR.userData.knee;
  if(climb){u.legL.rotation.x=-0.6+s*0.5;u.legR.rotation.x=-0.6-s*0.5;kL.rotation.x=0.9-s*0.4;kR.rotation.x=0.9+s*0.4;u.armL.rotation.set(-2.6+s*0.6,0,0);u.armR.rotation.set(-2.6-s*0.6,0,0);return 0}
  if(!ground){u.legL.rotation.x=lerp(u.legL.rotation.x,-0.45,0.15);u.legR.rotation.x=lerp(u.legR.rotation.x,0.3,0.15);kL.rotation.x=lerp(kL.rotation.x,0.75,0.15);kR.rotation.x=lerp(kR.rotation.x,0.4,0.15);
    u.armL.rotation.set(-0.5,0,0.65);u.armR.rotation.set(-0.3,0,-0.65);return 0}
  u.legL.rotation.x=s*A;u.legR.rotation.x=-s*A;                                   // hips swing in opposition
  kL.rotation.x=0.06+Math.max(0,-c)*1.15*amt;kR.rotation.x=0.06+Math.max(0,c)*1.15*amt; // knee bends on the forward swing
  u.armL.rotation.set(-s*A*0.9,0,0.06);u.armR.rotation.set(s*A*0.9,0,-0.06);       // arms counter-swing
  return Math.abs(c)*0.07*Math.min(1,amt)-0.035*Math.min(1,amt)}                  // bob: high mid-stride, low as feet land
function updateWalker(dt,inp){
  if(inp.camTurn)cam.yaw+=inp.camTurn*dt*1.8;
  const fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw),lx=Math.cos(cam.yaw),lz=-Math.sin(cam.yaw);
  let mx=fx*inp.fwd+lx*inp.steer,mz=fz*inp.fwd+lz*inp.steer;const ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml}
  if(game.dead){mx=mz=0}
  const tired=P.stam<=0.5&&!buffOn('stam'),sprint=inp.sprint&&!tired&&ml>0.1&&P.onGround,spd=(sprint?8.4:5.2)*(buffOn('speed')?1.4:1)*(S.cold&&S.cold.level>0.2&&!sheltered(P.pos)?1-0.25*S.cold.level:1); // numb, stiff legs in the cold
  tickBuffs(dt);
  // steep ground ahead? Climb it (uses stamina) like a cliff face
  let climb=false,steep=false;
  if(ml>0.1&&!cave.active&&!underground(P.pos.x,P.pos.z,P.pos.y)){const ah=groundHeight(P.pos.x+mx*1.1,P.pos.z+mz*1.1),rise=ah-P.pos.y;
    let st=-1e9;for(const f of[0.5,0.9])st=Math.max(st,solidTopAt(P.pos.x+mx*f,P.pos.z+mz*f));const srise=st-P.pos.y; // probe only right at the wall;               // walls of modules, wrecks, ruins and big boulders
    if((rise>1.15&&rise<40)||(srise>0.55&&srise<30)){steep=true;climb=true}}           // any slope or wall can be climbed; tired just means slower
  let jumped=false;
  if(climb){
    P.climbing=true;P.onGround=false;const cs=buffOn('stam')?1.6:P.stam>0?1:0.55;P.vel.set(mx*1.4*cs,2.3*cs,mz*1.4*cs);if(!buffOn('stam'))P.stam=Math.max(0,P.stam-dt*15);P.stamT=0;
  }else{
    if(P.climbing){P.climbing=false;if(steep)P.vel.y=Math.min(P.vel.y,0)}
    if(P.onGround){const k=damp(9,dt);P.vel.x=lerp(P.vel.x,mx*spd,k);P.vel.z=lerp(P.vel.z,mz*spd,k)}
    else if(ml>0.1){const k=damp(2.2,dt);P.vel.x=lerp(P.vel.x,mx*spd,k);P.vel.z=lerp(P.vel.z,mz*spd,k)} // air control: steer, keep momentum
    if(P.onGround&&inp.jump&&!game.dead){P.vel.y=Math.max(P.vel.y,0)+(buffOn('jump')?8:4.6);P.onGround=false;jumped=true;P.jetLock=true}
    if(!inp.jump)P.jetLock=false;
    // thruster pack: hold Space in mid-air
    P.jet=false;if(!P.onGround&&inp.jump&&!P.jetLock&&S.ups&&S.ups.u_jets&&P.bat>0){P.vel.y=Math.min(P.vel.y+7.8*dt,5);P.bat=Math.max(0,P.bat-dt*7*batMult());P.jet=true;if(Math.random()<0.7)emitSparks(_v1.set(P.pos.x-Math.sin(P.yaw)*0.4,P.pos.y+0.9,P.pos.z-Math.cos(P.yaw)*0.4),2,'#ffb070')}
    P.vel.y-=G*dt;                                   // gravity always pulls
    if(sprint&&!buffOn('stam')){P.stam=Math.max(0,P.stam-dt*9);P.stamT=0}
  }
  if(!climb&&!sprint){P.stamT+=dt;if(P.stamT>0.8)P.stam=Math.min(100,P.stam+dt*(P.onGround?30:8))}
  // environment pushes you around: storm wind, quakes
  if(typeof envPush==='function')envPush(P,dt);
  P.pos.x+=P.vel.x*dt;P.pos.z+=P.vel.z*dt;P.pos.y+=P.vel.y*dt;
  const ug=cave.active||underground(P.pos.x,P.pos.z,P.pos.y);
  if(cave.active||caveNear(P.pos))caveCollide(P.pos);if(!cave.active){collideWorld(P.pos,0.45,'p');collideRocks(P.pos,0.42,0.5);collideBodies(P.pos,0.42,'p')}
  const fl=floorAt(P.pos.x,P.pos.z,P.pos.y),g=ug?fl:solidFloor(P.pos.x,P.pos.z,P.pos.y,fl),gv=(g-(P.lastG===undefined?g:P.lastG))/Math.max(dt,1e-3);P.lastG=g;
  const ceil=caveCeil(P.pos.x,P.pos.z,P.pos.y);if(P.pos.y>ceil-1.9){P.pos.y=ceil-1.9;if(P.vel.y>0)P.vel.y=0}
  if(P.onGround&&!jumped&&P.pos.y-g<0.12){P.pos.y=g;P.vel.y=clamp(gv,-25,5)}   // walking: follow the ground
  else if(P.pos.y<=g){                                                           // landing
    const v=P.vel.y;if(!P.onGround&&v<-4.5)puff(P.pos.x,g,P.pos.z,1.2);
    const safe=buffOn('jump')?-17:-9.5;if(!P.onGround&&v<safe&&!P.climbing)hurt((-v+safe)*7,'fall');
    P.pos.y=g;P.vel.y=0;P.onGround=true}
  else if(!P.climbing)P.onGround=false;                                         // falling: ledge, ramp or jump
  const hs=Math.hypot(P.vel.x,P.vel.z);
  if(ml>0.1)P.yaw=lerpA(P.yaw,Math.atan2(mx,mz),damp(P.onGround||P.climbing?10:5,dt));
  P.lean=lerp(P.lean||0,P.onGround||P.climbing?(P.climbing?-0.25:0):clamp(0.3*hs/6-P.vel.y*0.03,-0.35,0.45),damp(5,dt));
  // walk cycle: stride lengthens with speed so the feet don't skate
  P.walkAmt=lerp(P.walkAmt||0,P.climbing?1:clamp(hs/4.6,0,1.25),damp(8,dt));
  P.phase+=P.climbing?dt*5:hs*dt*TAU/(1.5+hs*0.18);
  const u=astro.userData,bob=animSuit(astro,P.phase,P.walkAmt,P.onGround,P.climbing);
  // the head turns toward where the camera is looking (straight ahead if you're looking back at yourself)
  {let hy=wrapA(cam.yaw-P.yaw);hy=Math.abs(hy)>2.2?0:clamp(hy,-1.1,1.1);const hp=P.climbing?-0.35:clamp((cam.pitch-0.3)*0.6,-0.5,0.5);
   u.head.rotation.y=lerpA(u.head.rotation.y,hy,damp(7,dt));u.head.rotation.x=lerp(u.head.rotation.x,hp,damp(7,dt))}
  astro.position.copy(P.pos);astro.position.y+=bob;astro.rotation.set(P.lean+(P.onGround?P.walkAmt*0.06:0),P.yaw,0,'YXZ');
  S.stats.walkDist+=hs*dt;
  const atHab=nearHab(P.pos,6)&&!cave.active;
  if(atHab){P.o2=Math.min(100,P.o2+dt*25);P.bat=Math.min(100,P.bat+dt*8);P.hp=Math.min(maxHP(),P.hp+dt*3)}
  else P.o2-=dt*100/240*o2Mult()*o2Diff()*(typeof coldFactor==='function'?coldFactor():1);
  if(P.o2<25&&(game.o2Beep=(game.o2Beep||0)-dt)<=0){game.o2Beep=2.5;beep(740,0.12,'square',0.04)}
  if(P.o2<=0&&!game.dead)die('oxygen');
  u.lamp.intensity=(LOOK.lamp||cave.active)?smooth(0.4,0.9,ENV.night+ENV.storm*0.6+(cave.active?1:0))*(cave.active?50:30):0;
}
function blackout(){die('oxygen')}
/* ---------- rover: the original arcade driving model, plus full air control (A/D yaw, W/S flips) ---------- */
// ground tilt under the rover's four wheels (pitch along its heading, roll across it)
function terrainTilt(x,z,yaw){const s=Math.sin(yaw),c=Math.cos(yaw),hp=(f,l)=>groundHeight(x+s*f+c*l,z+c*f-s*l);
  const hfl=hp(1.5,1.2),hfr=hp(1.5,-1.2),hbl=hp(-1.5,1.2),hbr=hp(-1.5,-1.2);return{p:Math.atan2((hfl+hfr-hbl-hbr)/2,3),r:Math.atan2((hfl+hbl-hfr-hbr)/2,2.4),h:(hfl+hfr+hbl+hbr)/4}}
const ROVER_CY=1.0,_rq=new THREE.Quaternion(),_re=new THREE.Euler(0,0,0,'YXZ'),_rc=new THREE.Vector3();
function updateRover(dt,inp){
  const driving=P.mode==='rover',i=driving?inp:{fwd:0,steer:0,brake:false,camTurn:0,sprint:false};
  const maxBat=S.research.has('rovercell')?175:100;R.maxBat=maxBat;
  const top=S.research.has('roverspeed')?18:14;
  let thr=i.fwd;const steerIn=clamp(i.steer+(driving?i.camTurn:0),-1,1);
  if(R.cruise){if(thr<0||i.brake)R.cruise=false;else if(thr===0)thr=R.speed<R.cruiseV?0.8:0}
  const lim=(R.battery>0?top:2.5)*(1-0.35*clamp((S.storm.level-0.5)*2,0,1));     // a thick storm slows you down
  sample(R.pos.x,R.pos.z,TS);const sand=TS.dune*(S.research.has('roverspeed')?0.35:0.7);
  if(!R.air){
    if(thr>0)R.speed+=thr*(R.speed<0?14:6.5)*dt;
    else if(thr<0)R.speed+=thr*(R.speed>0?12:4)*dt;
    else R.speed*=1-Math.min(1,dt*(driving?0.5:0.9));                            // nobody aboard: it coasts to a stop
    if(i.brake&&!R.cruise)R.speed*=1-Math.min(1,dt*3.5);
    const fx=Math.sin(R.yaw),fz=Math.cos(R.yaw);
    const slope=(groundHeight(R.pos.x+fx*2,R.pos.z+fz*2)-groundHeight(R.pos.x-fx*2,R.pos.z-fz*2))/4;
    R.speed-=slope*G*dt*1.2*(thr>0&&slope>0?0.15:1);R.speed-=R.speed*sand*dt;    // under power it can crawl up any slope
    if(thr>0&&slope>0.25&&R.speed<4*thr)R.speed=4*thr;
    if(R.speed>lim)R.speed=lerp(R.speed,lim,damp(3,dt));if(R.speed<-5)R.speed=-5;
    if(Math.abs(R.speed)<0.05&&!thr)R.speed=0;
    R.yaw+=R.steer*R.speed*dt/2.7;
  }else{
    // airborne: momentum carries on and gravity keeps pulling. A/D turn the rover (yaw);
    // W/S tip the nose and, held long enough, flip it all the way round. Let go and it settles nose-first again.
    R.yaw+=steerIn*1.6*dt;
    if(driving&&i.fwd)R.wp=clamp((R.wp||0)-i.fwd*7*dt,-4.5,4.5);else R.wp=(R.wp||0)*(1-Math.min(1,dt*2));
    R.pitch=wrapA(R.pitch+R.wp*dt);R.airRot=(R.airRot||0)+Math.abs(R.wp)*dt;
    if(!(driving&&i.fwd)&&Math.abs(R.wp)<0.6)R.pitch=lerpA(R.pitch,Math.atan2(R.vy,Math.max(5,Math.abs(R.speed)))*0.7,damp(0.9,dt));
    R.roll=lerp(R.roll,-steerIn*0.25,damp(2,dt));
  }
  R.steer=lerp(R.steer,steerIn*0.55/(1+Math.abs(R.speed)*0.05),damp(6,dt));
  const s=Math.sin(R.yaw),c=Math.cos(R.yaw);
  R.pos.x+=s*R.speed*dt;R.pos.z+=c*R.speed*dt;R.vx=s*R.speed;R.vz=c*R.speed;
  // disasters reach the rover too: storm gusts shove it sideways, quakes bounce it
  if(S.storm.level>0.5&&!cave.active){const w=windVec(),k=(S.storm.level-0.5)*2.4*(1+0.6*Math.sin(now*1.7));R.pos.x+=w.x*k*dt;R.pos.z+=w.z*k*dt}
  if(typeof devilPushRover==='function')devilPushRover(dt);
  if(typeof quake!=='undefined'&&quake.active&&!R.air&&Math.random()<quakeLocal()*dt*3){R.vy=1.5+Math.random()*3*quakeLocal();R.speed*=0.85}
  if(collideWorld(R.pos,2.0,'rover')|collideRocks(R.pos,1.9,0.75)|collideBodies(R.pos,1.9,'rover')){if(driving&&Math.abs(R.speed)>2)beep(120,0.12,'square',0.06);R.speed*=-0.25}
  const g=Math.max(groundHeight(R.pos.x,R.pos.z),terrainTilt(R.pos.x,R.pos.z,R.yaw).h),tv=(g-R.lastG)/Math.max(dt,1e-3);R.lastG=g; // the body never sinks into a hill
  R.vy-=G*dt;R.pos.y+=R.vy*dt;                     // gravity always pulls
  const contact=!R.air&&R.pos.y-g<0.15;
  if(contact||R.pos.y<=g){
    if(R.air){                                     // touchdown
      const t=terrainTilt(R.pos.x,R.pos.z,R.yaw),flips=Math.floor((R.airRot||0)/(TAU*0.9));
      if(driving&&R.vy<-3.5){beep(90,0.15,'sine',0.08);puff(R.pos.x,g,R.pos.z,3)}
      const rough=Math.abs(wrapA(R.pitch-t.p))>0.85||Math.abs(R.roll)>0.8;
      if(rough){R.speed*=0.35;if(driving)toast(flips?`Rough landing… but that's ×${flips} flip!`:'Rough landing!','warn')}
      else if(driving&&flips)toast(`Clean landing: ×${flips} flip!`,'good');
      R.wp=0;R.airRot=0;
    }
    R.pos.y=g;R.vy=clamp(tv,-30,9);R.air=false;    // on the ground: follow it (cresting a ramp launches you)
  }else{if(!R.air){R.wp=0;R.airRot=0}R.air=true}
  if(!R.air){const t=terrainTilt(R.pos.x,R.pos.z,R.yaw);R.pitch=lerpA(R.pitch,t.p,damp(10,dt));R.roll=lerp(R.roll,t.r,damp(10,dt))}
  // draw: spin about the body's centre (not the wheel base) so flips look right
  R.visY=Math.abs(R.visY-R.pos.y)>3||R.air?R.pos.y:lerp(R.visY,R.pos.y,damp(18,dt));
  rover.rotation.set(-R.pitch,R.yaw,R.roll);_re.set(-R.pitch,R.yaw,R.roll,'YXZ');_rq.setFromEuler(_re);_rc.set(0,ROVER_CY,0).applyQuaternion(_rq);
  rover.position.set(R.pos.x-_rc.x,R.visY+ROVER_CY-_rc.y,R.pos.z-_rc.z);
  R.wheel+=R.speed*dt/0.5;
  for(const w of rover.userData.wheels){w.spin.rotation.x=R.wheel;w.piv.rotation.y=w.front?R.steer*1.1:(w.piv.position.z<-1?-R.steer*0.6:0)}
  if(driving){
    if(Math.abs(R.speed)>0.3||thr)R.battery-=(0.08+Math.abs(thr)*0.32)*(hasRole('Robotics Specialist')?0.8:1)*dt;
    S.stats.roverDist+=Math.abs(R.speed)*dt;P.o2=Math.min(100,P.o2+dt*20);
  }
  R.battery=clamp(R.battery+0.05*Math.max(0,ENV.sunDir.y)*(1-ENV.storm)*dt,0,maxBat);
  rover.userData.lamp.intensity=driving?smooth(0.4,0.9,ENV.night+ENV.storm*0.6)*60:0;
}
function toggleRover(){
  if(P.mode==='foot'){
    if(P.ragdoll)return;
    if(Math.hypot(R.pos.x-P.pos.x,R.pos.z-P.pos.z)<6){P.mode='rover';astro.visible=false;R.cruise=false;cam.yaw=R.yaw;beep(500,0.08);beep(700,0.1,'sine',0.06,0.08);S.flags.nearRover=true}
  }else{
    // you can always get out; at speed (or in the air) you keep the rover's momentum and tumble
    const vx=R.vx||Math.sin(R.yaw)*R.speed,vz=R.vz||Math.cos(R.yaw)*R.speed,v=Math.hypot(vx,vz),side=R.upside?0:2.4;
    const lx=Math.cos(R.yaw),lz=-Math.sin(R.yaw),x=R.pos.x+lx*side,z=R.pos.z+lz*side,gh=groundHeight(x,z);
    P.mode='foot';astro.visible=true;R.cruise=false;P.yaw=R.yaw;P.lastG=undefined;
    if(v>4||(R.air&&R.pos.y-gh>1.5)){
      P.pos.set(x,Math.max(gh,R.pos.y+0.6),z);P.vel.set(vx*0.95,Math.max(R.vy,0)+2.8,vz*0.95);P.onGround=false;startRagdoll(v);
    }else{
      P.pos.set(x,gh,z);P.vel.set(0,0,0);P.onGround=true;collideWorld(P.pos,0.5,'p');P.pos.y=groundHeight(P.pos.x,P.pos.z);
    }
    beep(700,0.08);beep(500,0.1,'sine',0.06,0.08);
  }
}
/* ---------- ragdoll: bailing out of a moving rover ---------- */
function startRagdoll(v,msg){
  const s=v*0.45;
  // every joint is a loose spring: angle, angular velocity, relaxed angle
  const J=(rest)=>({a:rest,v:(Math.random()-0.5)*8,rest,k:0.6+Math.random()*0.8,c:0.7+Math.random()*0.6,ph:Math.random()*TAU}); // each joint has its own looseness
  P.ragdoll={t:0,rx:0,rz:0,spin:new THREE.Vector3((Math.random()<0.5?-1:1)*s,0,(Math.random()-0.5)*s*1.4),dmg:clamp((v-4)*2.6,0,55),hit:false,up:0,lastV:P.vel.clone(),
    j:{aLx:J(-0.4),aLz:J(0.7),aRx:J(-0.4),aRz:J(-0.7),lL:J(0.15),lR:J(-0.1),kL:J(0.45),kR:J(0.45),hx:J(0),hy:J(0)}};
  P.climbing=false;mouse.drag=false;if(msg!==null)toast(msg||`You bailed out at ${Math.round(v*3.6)} km/h!`,'warn');sfx(0.3,600,1,0.08,'lowpass');
}
// joint limits so the floppy limbs never bend the wrong way
const RAG_LIM={aLx:[-3.1,1.4],aLz:[-0.2,2.7],aRx:[-3.1,1.4],aRz:[-2.7,0.2],lL:[-1.7,1.0],lR:[-1.7,1.0],kL:[0,2.3],kR:[0,2.3],hx:[-0.7,0.7],hy:[-1.1,1.1]};
function updateRagdoll(dt,inp){
  const r=P.ragdoll,u=astro.userData;r.t+=dt;inp=inp||{fwd:0,steer:0,camTurn:0,jump:false};
  // ---- you're still in charge: steer, turn, pitch and brace ----
  if(inp.camTurn)cam.yaw+=inp.camTurn*dt*1.8;
  const fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw),lx=Math.cos(cam.yaw),lz=-Math.sin(cam.yaw);
  let mx=fx*inp.fwd+lx*inp.steer,mz=fz*inp.fwd+lz*inp.steer;const ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml}
  const g0=floorAt(P.pos.x,P.pos.z,P.pos.y),airborne=P.pos.y-g0>0.15;
  if(ml>0.1){const acc=airborne?6.5:3.2;P.vel.x+=mx*acc*dt;P.vel.z+=mz*acc*dt;              // swim through the air / scramble along the ground
    P.yaw=lerpA(P.yaw,Math.atan2(mx,mz),damp(3,dt))}                                       // turn your body toward where you're heading
  if(inp.fwd)r.spin.x-=inp.fwd*5*dt;                                                       // W/S tuck forwards or backwards (flip on purpose)
  const brace=!!inp.jump;
  if(brace){r.spin.multiplyScalar(1-Math.min(1,dt*3.5));r.rx=lerpA(r.rx,0,damp(2.4,dt));r.rz=lerpA(r.rz,0,damp(2.4,dt))} // brace: kill the spin, get feet-down
  else r.spin.multiplyScalar(1-Math.min(1,dt*0.35));
  if(typeof envPush==='function')envPush(P,dt);
  const acc3=new THREE.Vector3().copy(P.vel).sub(r.lastV).divideScalar(Math.max(dt,1e-3));r.lastV.copy(P.vel);   // body acceleration (felt by the limbs)
  P.vel.y-=G*dt;P.pos.addScaledVector(P.vel,dt);
  if(!cave.active){collideWorld(P.pos,0.4,'p');collideRocks(P.pos,0.4,0.5)}else caveCollide(P.pos);
  const g=cave.active?floorAt(P.pos.x,P.pos.z,P.pos.y):solidFloor(P.pos.x,P.pos.z,P.pos.y,floorAt(P.pos.x,P.pos.z,P.pos.y));
  const hs=Math.hypot(P.vel.x,P.vel.z);
  if(P.pos.y<=g){
    P.pos.y=g;const upright=Math.abs(wrapA(r.rx))<0.6&&Math.abs(wrapA(r.rz))<0.6;
    // stuck the landing: feet first, braced and not too fast → you stay on your feet
    if(upright&&brace&&P.vel.y>-14&&r.t>0.3){if(!r.hit&&r.dmg>0.5)hurt(r.dmg*0.25,'crash');P.ragdoll=null;P.onGround=true;P.lastG=undefined;P.vel.y=0;P.vel.x*=0.5;P.vel.z*=0.5;astro.rotation.set(0,P.yaw,0,'YXZ');puff(P.pos.x,g,P.pos.z,1.2);toast('Nice landing!','good');return}
    if(!r.hit){r.hit=true;if(r.dmg>0.5)hurt(r.dmg,'crash');puff(P.pos.x,g,P.pos.z,1.6)}
    if(P.vel.y<-2.2){P.vel.y=-P.vel.y*0.32;sfx(0.12,300,1,0.06,'lowpass');for(const k in r.j)r.j[k].v+=(Math.random()-0.5)*14}   // limbs slap the ground
    else P.vel.y=0;
    const f=Math.max(0,hs-dt*7)/(hs||1);P.vel.x*=f;P.vel.z*=f;               // sliding across the regolith
    r.spin.multiplyScalar(1-Math.min(1,dt*2.4));if(hs>2&&Math.random()<0.3)puff(P.pos.x,g,P.pos.z,0.6);
  }
  const rest=r.t>0.8&&P.pos.y-g<0.05&&hs<0.6;
  if(rest){r.up+=dt*(brace||ml>0.1?2.5:1);r.rx=lerpA(r.rx,0,damp(6,dt));r.rz=lerpA(r.rz,0,damp(6,dt))}    // get back up (faster if you try to)
  else{r.rx=wrapA(r.rx+r.spin.x*dt);r.rz=wrapA(r.rz+r.spin.z*dt)}
  // ---- floppy limbs: underdamped springs pushed around by the tumble, acceleration, wind and your own effort ----
  const fwdA=acc3.x*Math.sin(P.yaw)+acc3.z*Math.cos(P.yaw),sideA=acc3.x*Math.cos(P.yaw)-acc3.z*Math.sin(P.yaw),upA=acc3.y;
  const wind=(typeof devils!=='undefined'?devils.some(d=>d.alive&&Math.hypot(d.x-P.pos.x,d.z-P.pos.z)<devilReach(d)):false)||S.storm.level>0.5?1:0;
  const reach=ml>0.1&&!rest?-1.3:null;                                                     // trying to move: arms reach out ahead
  for(const k in r.j){const J=r.j[k],L=RAG_LIM[k];
    let target=rest?{aLx:0,aLz:0.06,aRx:0,aRz:-0.06,lL:0,lR:0,kL:0.1,kR:0.1,hx:0,hy:0}[k]:J.rest;
    if(reach!=null&&(k==='aLx'||k==='aRx'))target=reach;if(brace&&!rest&&(k==='lL'||k==='lR'))target=-0.35;if(brace&&!rest&&(k==='kL'||k==='kR'))target=0.9;
    const arm=k[0]==='a',leg=k[0]==='l'||k[0]==='k',side=k.endsWith('z')?(k[1]==='L'?1:-1):0;
    let force=-(rest?60:16*J.k)*(J.a-target)-(rest?14:2.6*J.c)*J.v;                               // spring back toward the relaxed pose, loosely
    force+=(-r.spin.x*(arm?3.2:leg?2.2:1.2)*(k.endsWith('z')?0.2:1))+(side?side*r.spin.z*2.6:0); // the tumble flings limbs outward
    force+=(arm?-fwdA*0.18:leg?-fwdA*0.12:0)+(side?side*(upA*0.05+sideA*0.06):0);          // inertia when you speed up, slow down or bounce
    if(!rest)force+=Math.sin(r.t*(5+J.k*4)+J.ph)*7*(1+hs*0.08)+(Math.random()-0.5)*(wind?40:10); // jostled independently, more in the wind                                           // buffeted by gusts
    J.v+=force*dt;J.a+=J.v*dt;if(J.a<L[0]){J.a=L[0];J.v*=-0.3}else if(J.a>L[1]){J.a=L[1];J.v*=-0.3}}
  const j=r.j;u.armL.rotation.set(j.aLx.a,0,j.aLz.a);u.armR.rotation.set(j.aRx.a,0,j.aRz.a);u.legL.rotation.x=j.lL.a;u.legR.rotation.x=j.lR.a;
  u.legL.userData.knee.rotation.x=j.kL.a;u.legR.userData.knee.rotation.x=j.kR.a;u.head.rotation.set(j.hx.a,j.hy.a,0);
  _re.set(r.rx,P.yaw,r.rz,'YXZ');astro.rotation.copy(_re);_rq.setFromEuler(_re);_rc.set(0,0.9,0).applyQuaternion(_rq);
  astro.position.set(P.pos.x-_rc.x,P.pos.y+0.9-_rc.y+(rest?0:0.15),P.pos.z-_rc.z);
  P.o2-=dt*100/240*o2Mult()*o2Diff()*(typeof coldFactor==='function'?coldFactor():1);if(P.o2<=0&&!game.dead)die('oxygen');
  if(rest&&r.up>0.7){P.ragdoll=null;P.onGround=true;P.lastG=undefined;P.vel.set(0,0,0);astro.rotation.set(0,P.yaw,0,'YXZ')}
}
function camBlocked(x,y,z){
  if(y<groundHeight(x,z)+0.3)return true;
  for(const b of blds){const d=BUILD[b.type];if(d.solid===false||b.progress<0.3||Math.abs(b.x-x)>d.r+2||Math.abs(b.z-z)>d.r+2)continue;const h=fieldTop(b,x,z);if(h>-50&&y<b.y+h+0.15)return true}
  let hit=false;forRocks(x,z,0.5,k=>{if(!hit&&y<rockTopAt(k,Math.hypot(k.p.x-x,k.p.z-z))+0.15)hit=true});if(hit)return true;
  if(typeof lmMeshes!=='undefined')for(const M of lmMeshes.values())if(M.solids&&Math.abs(M.L.x-x)<50&&Math.abs(M.L.z-z)<50)for(const s of M.solids)if(y<s.top&&Math.hypot(x-s.x,z-s.z)<s.r)return true;
  return false}
function updateCamera(dt){
  const rv=P.mode==='rover';
  // arrow keys: ↑/↓ tilt the view (left/right already turn it)
  if(!game.typing&&!game.dialogue){const kp=(keys.ArrowUp?1:0)-(keys.ArrowDown?1:0);if(kp){cam.pitch=clamp(cam.pitch-kp*dt*1.1,-0.3,1.35);cam.lastDrag=now}}
  _v1.copy(rv?rover.position:P.pos);_v1.y+=rv?2.2:1.5;
  if(game.camSnap){cam.target.copy(_v1);game.camSnap=false}else cam.target.lerp(_v1,damp(10,dt));
  if(rv&&now-cam.lastDrag>1.5&&Math.abs(R.speed)>1)cam.yaw=lerpA(cam.yaw,R.yaw,damp(2.2,dt));
  const d=(rv?15:9)*cam.zoom*(cave.active?0.7:1),p=cam.pitch;
  camera.position.set(cam.target.x-Math.sin(cam.yaw)*Math.cos(p)*d,cam.target.y+Math.sin(p)*d,cam.target.z-Math.cos(cam.yaw)*Math.cos(p)*d);
  if(cave.active)caveCamClamp();
  else{
    // pull the camera in front of anything between it and you (hills, modules, boulders, ruins)
    const N=14;let free=1;for(let i=1;i<=N;i++){const f=i/N;_v2.lerpVectors(cam.target,camera.position,f);if(camBlocked(_v2.x,_v2.y,_v2.z)){free=Math.max(0.08,(i-1)/N);break}}
    cam.free=free<(cam.free??1)?free:lerp(cam.free??1,free,damp(2.5,dt));
    camera.position.lerpVectors(cam.target,camera.position,cam.free);
    const gh=groundHeight(camera.position.x,camera.position.z)+0.6;if(camera.position.y<gh)camera.position.y=gh;camera.lookAt(cam.target)}
  if(P.mode==='foot')astro.visible=camera.position.distanceTo(cam.target)>0.9; // don't render the suit from inside the helmet
  const fov=60+(rv?Math.min(14,Math.abs(R.speed)*0.7):0);
  if(Math.abs(camera.fov-fov)>0.05){camera.fov=lerp(camera.fov,fov,damp(3,dt));camera.updateProjectionMatrix()}
}