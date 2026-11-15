'use strict';
/* =========================================================
   PIP, YOUR ROBOT COMPANION: a small hover drone that follows you and helps with basic tasks.
   - fetches items lying nearby and brings them to you
   - helps you drill (a cutting beam that speeds mining up by 35%)
   - lights the way at night and in caves
   - warns you about hostile creatures, low oxygen and broken modules
   Switch Pip off in Settings. Pip is local to each player.
   ========================================================= */
const _pa=new THREE.Vector3(),_pb=new THREE.Vector3(),_pc=new THREE.Vector3();
const PIP={g:null,pos:new THREE.Vector3(),vel:new THREE.Vector3(),task:null,taskT:0,say:{},light:null,beam:null,eye:null,ring:null};
function mkPip(){
  const g=new THREE.Group();
  const shell=mat('#eef1f4',{roughness:0.3,metalness:0.2}),acc=mat('#ff7a2e',{roughness:0.4}),dark=mat('#23272e',{roughness:0.4,metalness:0.5});
  g.add(sp(0.22,shell,0,0,0,18,14));const band=new THREE.Mesh(new THREE.TorusGeometry(0.225,0.025,8,24),acc);band.rotation.x=Math.PI/2;g.add(band);
  const face=sp(0.13,dark,0,0.02,0.15,14,10);face.scale.set(1.3,0.8,0.5);g.add(face);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(0.045,10,8),new THREE.MeshStandardMaterial({color:'#5fe8ff',emissive:'#5fe8ff',emissiveIntensity:2}));eye.position.set(0,0.03,0.21);g.add(eye);
  for(const s of[-1,1]){const arm=bx(0.16,0.03,0.05,dark,s*0.3,0,0);g.add(arm);const rot=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,0.01,14),new THREE.MeshBasicMaterial({color:'#cfd6de',transparent:true,opacity:0.35,depthWrite:false}));rot.position.set(s*0.38,0.04,0);g.add(rot)}
  g.add(cy(0.008,0.008,0.18,5,dark,0.06,0.28,-0.04));g.add(sp(0.025,acc,0.06,0.38,-0.04,8,6));
  const light=new THREE.PointLight(0xdff3ff,0,16,1.6);light.position.set(0,-0.1,0.1);g.add(light);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1,6,1,true),new THREE.MeshBasicMaterial({color:'#7fe8ff',transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,depthWrite:false}));beam.visible=false;
  g.traverse(o=>{if(o.isMesh)o.castShadow=false});
  scene.add(g);scene.add(beam);Object.assign(PIP,{g,light,beam,eye:eye.material,ring:band});g.visible=false;return g}
const pipOn=()=>OPT.companion!==false&&game.state==='play'&&!game.landing&&!game.cine;
function pipSay(key,msg,gap=25){if(now-(PIP.say[key]||-1e9)<gap)return;PIP.say[key]=now;radio('Pip',msg,'pip')}
// mining helper: used by mining.js to speed up drilling when Pip is helping
function pipMineBoost(){return pipOn()&&PIP.task==='mine'?1.35:1}
function updatePip(dt){
  if(!PIP.g)mkPip();const g=PIP.g;
  if(!pipOn()||P.mode==='rover'){g.visible=false;PIP.beam.visible=false;if(P.mode==='rover')PIP.pos.copy(R.pos).add(_pa.set(0,3,0));return}
  if(!g.visible){g.visible=true;PIP.pos.copy(P.pos).add(_pa.set(0.8,2,0.8));pipSay('hi','Pip online! I’ll fetch things, help you drill and keep watch.',1e9)}
  // choose a task
  PIP.taskT-=dt;let target=null;PIP.beam.visible=false;
  const mining=vac.mode==='mine';
  if(mining){PIP.task='mine';const t=vac.target;target=_pb.set(t.x+0.9,t.y+1.4,t.z+0.9);
    PIP.beam.visible=true;const a=PIP.pos,b=vac.target,len=a.distanceTo(b);PIP.beam.position.copy(a).lerp(b,0.5);PIP.beam.scale.set(1,len,1);PIP.beam.lookAt(b);PIP.beam.rotateX(Math.PI/2)}
  else{
    if(PIP.task==='fetch'&&PIP.pk&&!pickups.has(PIP.pk.id))PIP.task=null;
    if(PIP.task!=='fetch'&&PIP.taskT<=0){PIP.taskT=1.2;PIP.task=null;let best=null,bd=14;
      for(const pk of pickups.values()){if(pk.hold)continue;const d=Math.hypot(pk.x-P.pos.x,pk.z-P.pos.z);if(d>2.2&&d<bd&&slotsFree(S.inv,pk.it,1)){bd=d;best=pk}}
      if(best){PIP.task='fetch';PIP.pk=best;PIP.carry=false}}
    if(PIP.task==='fetch'){const pk=PIP.pk;
      if(!PIP.carry){target=_pb.set(pk.x,pk.y+0.6,pk.z);if(PIP.pos.distanceTo(target)<0.9)PIP.carry=true}
      else{target=_pb.set(P.pos.x,P.pos.y+1.4,P.pos.z);pk.x=PIP.pos.x;pk.z=PIP.pos.z;pk.y=Math.max(pk.y,PIP.pos.y-0.5);pk.vy=0;if(Math.hypot(pk.x-P.pos.x,pk.z-P.pos.z)<1.6){PIP.task=null;pipSay('fetch','Here you go!',40)}}}
  }
  if(!target){const side=P.yaw+2.3;target=_pb.set(P.pos.x+Math.sin(side)*1.1,P.pos.y+2.0+Math.sin(now*1.7)*0.12,P.pos.z+Math.cos(side)*1.1)}
  if(P.inside)target.y=Math.min(target.y,INT.y+2.6);
  // fly there smoothly, bobbing
  const k=damp(PIP.task?3.5:2.2,dt);PIP.pos.lerp(target,k);const fl=floorAt(PIP.pos.x,PIP.pos.z,PIP.pos.y);if(!P.inside&&PIP.pos.y<fl+0.8)PIP.pos.y=fl+0.8;
  if(P.inside){const dx=PIP.pos.x-INT.x,dz=PIP.pos.z-INT.z,d=Math.hypot(dx,dz),lim=ROOM.r-0.7;if(d>lim){PIP.pos.x=INT.x+dx/d*lim;PIP.pos.z=INT.z+dz/d*lim}}
  else{let up=0;while(up<12&&camBlocked(PIP.pos.x,PIP.pos.y-0.3,PIP.pos.z)){PIP.pos.y+=0.5;up++}}   // rise over modules, rocks and the rover
  g.position.copy(PIP.pos);g.position.y+=Math.sin(now*3.1)*0.04;
  const look=PIP.task==='mine'?vac.target:PIP.task==='fetch'&&!PIP.carry&&PIP.pk?_pc.set(PIP.pk.x,PIP.pk.y,PIP.pk.z):_pc.set(P.pos.x,P.pos.y+1.6,P.pos.z);
  g.rotation.y=lerpA(g.rotation.y,Math.atan2(look.x-PIP.pos.x,look.z-PIP.pos.z),damp(4,dt));g.rotation.z=Math.sin(now*1.3)*0.08;
  // light the way when it's dark
  PIP.light.intensity=smooth(0.35,0.85,ENV.night+(cave.active?1:0)+ENV.storm*0.5)*(cave.active?18:10);
  // keep watch
  let threat=null,td=35;if(typeof creatures!=='undefined')for(const c of creatures.values()){if(c.gone||SPECIES[c.sp].kind!=='hostile')continue;const d=Math.hypot(c.x-P.pos.x,c.z-P.pos.z);if(d<td){td=d;threat=c}}
  const alert=!!threat;PIP.eye.color.set(alert?'#ff5a4f':'#5fe8ff');PIP.eye.emissive.copy(PIP.eye.color);PIP.eye.emissiveIntensity=alert?1.5+Math.sin(now*10):2;
  if(threat)pipSay('threat',`Careful! Something hostile ${Math.round(td)} m to the ${compassWord(threat.x-P.pos.x,threat.z-P.pos.z)}.`,30);
  if(P.o2<25&&!P.inside)pipSay('o2','Your oxygen is getting low. The habitat, the rover or an oxygen canister will refill it.',45);
  if(P.hp<30)pipSay('hp','Your suit is badly damaged. A suit patch kit or the habitat will fix it.',45);
  if(typeof blds!=='undefined'&&!P.inside)for(const b of blds)if(b.fault&&Math.hypot(b.x-P.pos.x,b.z-P.pos.z)<25){pipSay('fault',`The ${BUILD[b.type].name} needs a repair: hold F next to it.`,90);break}
}
