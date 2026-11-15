'use strict';
/* =========================================================
   MINING, TOOLS, LIGHTS & CONSTRUCTION DRONES
   Deposits are deterministic (same everywhere in co-op); only how much
   is left (S.depleted) is stored and synced.
   ========================================================= */
const DEP={
  iron:{item:'iron',tier:1,hard:1.0,units:[5,9],col:'#4d2a25',vein:'#c9c2d6',shape:'nodule',name:'Hematite deposit'},
  silica:{item:'silica',tier:1,hard:0.8,units:[5,9],col:'#e6d6bd',vein:'#ffffff',shape:'slab',name:'Silica deposit'},
  ice:{item:'ice',tier:1,hard:0.7,units:[4,8],col:'#cdeeff',vein:'#7fc8ff',shape:'crystal',glow:0.25,name:'Ice deposit'},
  crystal:{item:'crystal',tier:1,hard:1.3,units:[3,6],col:'#f4f8ff',vein:'#cfe6ff',shape:'crystal',glow:0.5,name:'Selenite crystals'},
  titanium:{item:'titanium',tier:1,hard:2.2,units:[4,7],col:'#4c5262',vein:'#dfe8ff',shape:'vein',name:'Titanium vein'},
  nickel:{item:'nickel',tier:2,hard:2.4,units:[3,6],col:'#55524f',vein:'#d8d4ce',shape:'nodule',metal:0.8,name:'Meteoritic nickel-iron'},
  resonite:{item:'resonite',tier:2,hard:2.0,units:[2,4],col:'#7a4cff',vein:'#f0e2ff',shape:'crystal',glow:1.2,name:'Resonant crystals'},
  alloy:{item:'alloy',tier:3,hard:2.8,units:[2,4],col:'#1f8f80',vein:'#a9fff1',shape:'shard',glow:0.8,metal:0.7,name:'Xeno alloy'},
};
const TOOL_FOR_TIER={1:'Hand Drill',2:'Core Drill',3:'Plasma Cutter'};
/* ---------- deterministic deposit descriptions ---------- */
const depDescCache=new Map();
function chunkDepDescs(cx,cz){
  const k=cx+','+cz;let out=depDescCache.get(k);if(out)return out;out=[];
  const rng=mulberry(hashI(cx,cz,SITE.seed+913)),n=1+Math.floor(rng()*3);
  for(let i=0;i<n;i++){
    const x=cx*CHUNK+8+rng()*(CHUNK-16),z=cz*CHUNK+8+rng()*(CHUNK-16),r1=rng(),r2=rng();
    if(x*x+z*z<90*90)continue;sample(x,z,TS3);let type;
    if(TS3.ice>0.5)type='ice';else if(TS3.mtn>0.15)type=r1<0.45?'titanium':'iron';
    else if(TS3.crater>0.2)type=r1<0.55?'iron':r1<0.8?'silica':'titanium';else if(TS3.dune>0.3)type='silica';else type=r1<0.55?'iron':'silica';
    const u=DEP[type].units;out.push({id:`d${cx}_${cz}_${i}`,type,x,z,max:u[0]+Math.floor(r2*(u[1]-u[0]+1))});
  }
  if(depDescCache.size>4000)depDescCache.clear();depDescCache.set(k,out);return out;
}
const FIXED_DEPS=[{id:'f0',type:'iron',x:32,z:-30,max:9},{id:'f1',type:'silica',x:-34,z:36,max:9},{id:'f2',type:'iron',x:-40,z:-22,max:8},{id:'f3',type:'silica',x:38,z:30,max:8},{id:'f4',type:'titanium',x:60,z:-56,max:6}];
function depDesc(id){
  if(typeof id!=='string')return null;
  if(id[0]==='d'){const m=/^d(-?\d+)_(-?\d+)_\d+$/.exec(id);if(!m)return null;return chunkDepDescs(+m[1],+m[2]).find(d=>d.id===id)||null}
  if(id[0]==='f')return FIXED_DEPS.find(d=>d.id===id)||null;
  if(id[0]==='x')return(S.extraDeps||[]).find(d=>d.id===id)||null;
  if(id[0]==='c')return typeof caveDepDesc==='function'?caveDepDesc(id):null;
  if(id[0]==='l'){const m=/^l(lm(-?\d+)_(-?\d+))_([0-2])$/.exec(id);if(!m)return null;const L=landmarkAt(+m[2],+m[3]);if(!L||L.type!=='ruin')return null;const a=+m[4]/3*TAU+1.6;return{id,type:'alloy',x:L.x+Math.cos(a)*6,z:L.z+Math.sin(a)*6,max:3}}
  return null;
}
const depUnits=id=>{const d=depDesc(id);if(!d)return 0;const v=S.depleted[id];return v==null?d.max:v};
/* ---------- deposit meshes ---------- */
const depMeshes=new Map(),depGroup=new THREE.Group();scene.add(depGroup);
const DEPMAT={};
function depMats(type){if(DEPMAT[type])return DEPMAT[type];const d=DEP[type];
  return DEPMAT[type]={body:new THREE.MeshStandardMaterial({color:d.col,roughness:d.metal?0.35:0.85,metalness:d.metal||0.05,flatShading:true,emissive:d.glow?d.col:'#000000',emissiveIntensity:d.glow||0}),
    vein:new THREE.MeshStandardMaterial({color:d.vein,roughness:0.3,metalness:0.4,emissive:d.vein,emissiveIntensity:(d.glow||0)*0.6+0.15,flatShading:true})}}
function depPiece(type,r){
  const d=DEP[type],M=depMats(type),g=new THREE.Group();
  if(d.shape==='crystal'){for(let i=0;i<3;i++){const len=0.5+r()*0.8,c=mesh(shared('hexp',()=>new THREE.CylinderGeometry(0.11,0.15,1,6)),M.body,(r()-0.5)*0.3,len*0.45,(r()-0.5)*0.3);c.scale.set(1,len,1);c.rotation.set((r()-0.5)*0.8,r()*3,(r()-0.5)*0.8);g.add(c)}}
  else if(d.shape==='slab'){for(let i=0;i<2;i++){const b=mesh(rbox(0.5,0.35,0.4,0.06),i?M.vein:M.body,(r()-0.5)*0.3,0.18+i*0.22,(r()-0.5)*0.3);b.rotation.set(r()*0.6,r()*3,r()*0.6);g.add(b)}}
  else if(d.shape==='shard'){for(let i=0;i<2;i++){const s=mesh(shared('oct',()=>new THREE.OctahedronGeometry(1,0)),i?M.vein:M.body,(r()-0.5)*0.3,0.45,(r()-0.5)*0.3);s.scale.set(0.18,0.5+r()*0.3,0.18);s.rotation.set(r()*0.5,r()*3,r()*0.5);g.add(s)}}
  else{const b=mesh(shared('dode',()=>new THREE.DodecahedronGeometry(1,0)),M.body,0,0.25,0);b.scale.set(0.38,0.3,0.34);b.rotation.set(r()*3,r()*3,r()*3);g.add(b);
    for(let i=0;i<(d.shape==='vein'?3:2);i++){const v=mesh(d.shape==='vein'?rbox(0.5,0.05,0.07,0.02):shared('oct',()=>new THREE.OctahedronGeometry(1,0)),M.vein,(r()-0.5)*0.4,0.25+r()*0.18,(r()-0.5)*0.4);if(d.shape!=='vein')v.scale.setScalar(0.09);v.rotation.set(r()*3,r()*3,r()*3);g.add(v)}}
  g.traverse(c=>{if(c.isMesh)c.castShadow=true});return g;
}
function addDepMesh(desc){
  if(depMeshes.has(desc.id))return depMeshes.get(desc.id);
  const units=depUnits(desc.id);if(units<=0)return null;
  const r=mulberry(strHash(desc.id)),g=new THREE.Group(),n=Math.min(desc.max,8),pieces=[];
  for(let i=0;i<n;i++){const p=depPiece(desc.type,r),a=i/n*TAU+r()*0.5,rad=i?0.45+r()*0.5:0;p.position.set(Math.cos(a)*rad,0,Math.sin(a)*rad);p.scale.setScalar(0.8+r()*0.6);g.add(p);pieces.push(p)}
  const y=desc.y!=null?desc.y:groundHeight(desc.x,desc.z)-0.08;g.position.set(desc.x,y,desc.z);if(desc.rx)g.rotation.x=desc.rx;if(desc.rz)g.rotation.z=desc.rz;
  g.userData.depId=desc.id;depGroup.add(g);
  const D={desc,g,pieces,y};depMeshes.set(desc.id,D);showPieces(D,units);return D;
}
function removeDepMesh(id){const D=depMeshes.get(id);if(!D)return;depGroup.remove(D.g);depMeshes.delete(id)}
function showPieces(D,units){const vis=Math.ceil(units/D.desc.max*D.pieces.length);D.pieces.forEach((p,i)=>p.visible=i<vis)}
function setDepUnits(id,u){
  S.depleted[id]=Math.max(0,u);const D=depMeshes.get(id);
  if(D){if(u<=0){puff(D.desc.x,D.y+0.3,D.desc.z,1.6);removeDepMesh(id)}else showPieces(D,u)}
  if(net.role==='host')netSend({t:'dep',id,u:S.depleted[id]});
}
// chunk hooks (called from terrain.js)
function chunkDeposits(ch){ch.deps=[];if(!S)return;for(const d of chunkDepDescs(ch.cx,ch.cz)){if(addDepMesh(d))ch.deps.push(d.id)}}
function chunkDepositsDispose(ch){if(ch.deps)for(const id of ch.deps)removeDepMesh(id)}
let depTargets=[];
function updateDeposits(){
  if(!S)return;const f=focusPos();
  for(const d of FIXED_DEPS.concat(S.extraDeps||[])){const dd=Math.hypot(d.x-f.x,d.z-f.z);if(dd<320)addDepMesh(d);else if(dd>420)removeDepMesh(d.id)}
  // chunk deposits for already-built chunks (e.g. after loading a game)
  for(const ch of chunks.values())if(!ch.deps)chunkDeposits(ch);
  depTargets=[];for(const D of depMeshes.values())if(Math.hypot(D.desc.x-f.x,D.desc.z-f.z)<14)depTargets.push(D.g);
}
function clearDeposits(){for(const id of[...depMeshes.keys()])removeDepMesh(id);depDescCache.clear()}
function nearestRock(x,z,maxD){
  let best=null,bd=maxD,bc=null;
  const cx0=Math.floor((x-6)/CHUNK),cx1=Math.floor((x+6)/CHUNK),cz0=Math.floor((z-6)/CHUNK),cz1=Math.floor((z+6)/CHUNK);
  for(let i=cx0;i<=cx1;i++)for(let j=cz0;j<=cz1;j++){const c=chunks.get(i+','+j);if(!c)continue;
    for(const r of c.rocks){if(r.hp<=0)continue;const d=Math.hypot(r.p.x-x,r.p.z-z)-r.s*0.8;if(d<bd){bd=d;best=r;bc=c}}}
  return best?{r:best,c:bc}:null;
}
/* ---------- held tool models ---------- */
function toolModel(id){
  const d=ITEMS[id],g=new THREE.Group();g.userData={};
  if(!d)return g;
  if(d.tool==='drill'){
    g.add(mesh(rbox(0.2,0.3,0.24,0.07),d.c2,0,-0.08,0));g.add(mesh(rbox(0.22,0.07,0.26,0.03),d.c,0,0.02,0));
    g.add(cy(0.07,0.09,0.12,10,'#8d8781',0,-0.28,0));
    const bit=new THREE.Group();bit.position.y=-0.34;g.add(bit);
    if(id==='cutter'){const em=new THREE.MeshStandardMaterial({color:d.c,emissive:d.c,emissiveIntensity:2.5});bit.add(mesh(shared('cutTip',()=>new THREE.SphereGeometry(0.06,10,8)),em,0,-0.06,0));g.userData.glow=em}
    else{const c=mesh(shared('bitCone',()=>new THREE.ConeGeometry(0.06,0.3,10)),'#d6cfc5',0,-0.15,0);c.rotation.x=Math.PI;bit.add(c);
      for(let i=0;i<3;i++)bit.add(rot(mesh(rbox(0.13,0.02,0.02,0.005),'#8d8781',0,-0.06-i*0.07,0),'y',i*1.1))}
    g.userData.bit=bit;
  }else if(d.tool==='gun'){ // grip, body and a glowing muzzle pointing down the arm
    g.add(mesh(rbox(0.12,0.2,0.16,0.04),d.c2,0,0.02,-0.06));g.add(mesh(rbox(0.16,0.42,0.2,0.06),'#e9e3d6',0,-0.2,0.04));
    g.add(mesh(rbox(0.17,0.08,0.21,0.03),d.c,0,-0.12,0.04));g.add(cy(0.045,0.055,0.18,10,d.c2,0,-0.46,0.04));
    const em=new THREE.MeshStandardMaterial({color:d.c,emissive:d.c,emissiveIntensity:1.6});g.add(mesh(shared('gunTip',()=>new THREE.SphereGeometry(0.045,10,8)),em,0,-0.56,0.04));g.userData.glow=em;
  }else if(d.tool==='weapon'){
    g.add(cy(0.03,0.035,0.9,8,'#3a3532',0,-0.4,0));g.add(cy(0.06,0.06,0.18,10,d.c2,0,0.02,0));
    const em=new THREE.MeshStandardMaterial({color:d.c,emissive:d.c,emissiveIntensity:1.5});g.add(mesh(shared('prodTip',()=>new THREE.SphereGeometry(0.07,10,8)),em,0,-0.87,0));g.userData.glow=em;
  }else{const m=itemMesh(id);m.scale.setScalar(0.55);m.position.y=-0.1;g.add(m)}
  return g;
}
function setHeld(av,id){
  const u=av.userData;if(u.held===id)return;u.held=id;
  for(const c of[...u.tool.children])if(c!==u.tip)u.tool.remove(c);
  if(id){const m=toolModel(id);u.tool.add(m);u.heldModel=m}else u.heldModel=null;
}
function onHotbarChange(){const s=S.inv[P.hot];setHeld(astro,s?s.id:null);mine.dep=null;mine.prog=0}
/* ---------- particles: sparks & dust ---------- */
const SPN=90,spPos=new Float32Array(SPN*3),spVel=new Float32Array(SPN*3),spLife=new Float32Array(SPN);let spI=0;
const sparks=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(spPos,3)),new THREE.PointsMaterial({color:'#ffd9a0',size:0.12,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
sparks.frustumCulled=false;scene.add(sparks);
function emitSparks(p,n,col){sparks.material.color.set(col||'#ffd9a0');for(let k=0;k<n;k++){const i=spI=(spI+1)%SPN;spPos[i*3]=p.x;spPos[i*3+1]=p.y;spPos[i*3+2]=p.z;
  spVel[i*3]=(Math.random()-0.5)*4;spVel[i*3+1]=Math.random()*3+0.5;spVel[i*3+2]=(Math.random()-0.5)*4;spLife[i]=0.3+Math.random()*0.35}}
function updateSparks(dt){for(let i=0;i<SPN;i++){if(spLife[i]<=0){spPos[i*3+1]=-1e5;continue}spLife[i]-=dt;spVel[i*3+1]-=G*dt;spPos[i*3]+=spVel[i*3]*dt;spPos[i*3+1]+=spVel[i*3+1]*dt;spPos[i*3+2]+=spVel[i*3+2]*dt}
  sparks.geometry.attributes.position.needsUpdate=true}
// extracted chunks flying into your pack
const flyers=[];
function flyItem(id,from){const m=itemMesh(id);m.scale.setScalar(0.8);m.position.copy(from);scene.add(m);flyers.push({m,t:0,from:from.clone()})}
function updateFlyers(dt){for(let i=flyers.length-1;i>=0;i--){const f=flyers[i];f.t+=dt/0.42;const to=_v1.set(P.pos.x,P.pos.y+1.2,P.pos.z);
  f.m.position.lerpVectors(f.from,to,f.t*f.t);f.m.position.y+=Math.sin(f.t*Math.PI)*0.8;f.m.scale.setScalar(0.8*(1-f.t*0.6));if(f.t>=1){scene.remove(f.m);flyers.splice(i,1)}}}
/* ---------- using the held item ---------- */
const vac={mode:null,target:new THREE.Vector3(),from:new THREE.Vector3(),msg:'',blocked:false,bld:null};
const mine={dep:null,prog:0,digAcc:0,digSend:0,digX:0,digZ:0,rockKey:null,atk:0};
function canUseWorld(){return game.state==='play'&&P.mode==='foot'&&!build.active&&!game.wardrobe&&!invUI.open&&!game.dialogue&&!game.dead&&!game.paused}
function onWorldClick(){ // single-click items (consumables, flares, lamps)
  if(!canUseWorld())return false;const s=S.inv[P.hot];if(!s)return false;const d=ITEMS[s.id];
  if(d.use){useSlot(P.hot);return true}return false;
}
function updateToolUse(dt){
  const u=astro.userData;vac.mode=null;vac.msg='';vac.blocked=false;
  const holding=canUseWorld()&&mouse.drag&&mouse.btn===0;
  const s=S.inv[P.hot],d=s&&ITEMS[s.id];
  if(holding&&d&&d.tool==='drill')drillTick(dt,s,d);
  else if(holding&&d&&d.tool==='weapon')weaponTick(dt,s,d);
  else if(d&&d.tool==='gun'&&canUseWorld())gunTick(dt,s,d,holding);
  else{mine.dep=null;mine.prog=0}
  if(mine.digAcc>0&&(now-mine.digSend>0.25||!holding)){act({a:'dig',x:mine.digX,z:mine.digZ,amt:mine.digAcc});mine.digAcc=0;mine.digSend=now}
  if((game.dirtyT=(game.dirtyT||0)-dt)<=0&&dirtyChunks.size){game.dirtyT=0.12;rebuildDirtyChunks()}
  // pose & tool animation
  const hm=u.heldModel;
  if(hm&&hm.userData.glow)hm.userData.glow.emissiveIntensity=vac.mode?2.5+Math.sin(now*30):1.2;
  if(vac.mode==='shoot'){P.yaw=lerpA(P.yaw,Math.atan2(vac.target.x-P.pos.x,vac.target.z-P.pos.z),damp(14,dt));astro.rotation.y=P.yaw;const dy=vac.target.y-(P.pos.y+1.3),hd=Math.hypot(vac.target.x-P.pos.x,vac.target.z-P.pos.z);u.armR.rotation.set(-Math.PI/2-Math.atan2(dy,hd),0,0);return}
  if(!vac.mode){u.tipMat.emissiveIntensity=0.4;return}
  if(hm&&hm.userData.bit)hm.userData.bit.rotation.y+=dt*40;
  P.yaw=lerpA(P.yaw,Math.atan2(vac.target.x-P.pos.x,vac.target.z-P.pos.z),damp(8,dt));astro.rotation.y=P.yaw;
  const dy=vac.target.y-(P.pos.y+1.3),hd=Math.hypot(vac.target.x-P.pos.x,vac.target.z-P.pos.z);
  u.armR.rotation.set(-Math.PI/2-Math.atan2(dy,hd)+Math.sin(now*40)*0.03,0,0);astro.updateMatrixWorld(true);u.tip.getWorldPosition(vac.from);
}
function drillTick(dt,s,tool){
  if(s.d<=0){vac.msg=`Your ${tool.name} is broken. Repair it at a habitat (I)`;return}
  if(P.bat<=0){vac.msg='Suit battery empty. Recharge at base or use a Power Cell';return}
  raycaster.setFromCamera({x:mouse.nx,y:mouse.ny},camera);
  // 1) creatures in reach
  if(typeof creatureUnderRay==='function'){const c=creatureUnderRay(5);if(c){vac.mode='attack';vac.target.copy(c.hit);attackCreature(c.cr,tool.dmg*dt*1.6,0,dt);emitSparks(c.hit,2,'#ff9a6a');return}}
  // 2) deposits
  const hits=depTargets.length?raycaster.intersectObjects(depTargets,true):[];
  for(const h of hits){let o=h.object;while(o&&!o.userData.depId)o=o.parent;if(!o)continue;const D=depMeshes.get(o.userData.depId);if(!D)continue;
    if(Math.hypot(D.desc.x-P.pos.x,D.desc.z-P.pos.z)>5.5||Math.abs(D.y-P.pos.y)>4)continue;
    const def=DEP[D.desc.type];
    if(tool.tier<def.tier){vac.msg=`Your ${tool.name} can’t cut ${ITEMS[def.item].name}. Craft a ${TOOL_FOR_TIER[def.tier]} at a Fabricator`;vac.blocked=true;return}
    vac.mode='mine';vac.target.copy(h.point);
    if(mine.dep!==D.desc.id){mine.dep=D.desc.id;mine.prog=0}
    mine.prog+=dt*tool.speed*(typeof pipMineBoost==='function'?pipMineBoost():1)*(tech('meteoric')?1.15:1)/(def.hard*1.4);P.bat=Math.max(0,P.bat-dt*1.4*def.hard*batMult());
    D.g.position.x=D.desc.x+(Math.random()-0.5)*0.04;D.g.position.z=D.desc.z+(Math.random()-0.5)*0.04;
    if(Math.random()<0.6)emitSparks(h.point,2,def.glow?def.vein:'#ffd9a0');
    vac.msg=`Drilling ${def.name}… ${Math.round(mine.prog*100)}%`;
    if(mine.prog>=1){mine.prog=0;const ok=act({a:'mine',id:D.desc.id,slot:P.hot});if(ok){flyItem(def.item,h.point);sfx(0.15,500,1,0.09,'lowpass');emitSparks(h.point,10,def.vein)}}
    return;
  }
  mine.dep=null;
  // 3) boulders → basalt, 4) the ground → regolith
  const pt=cave.active?null:pickTerrain();
  if(!pt||Math.hypot(pt.x-P.pos.x,pt.z-P.pos.z)>4.5){vac.msg=cave.active?'Aim at an ore or crystal deposit':'Aim at rock, ore or the ground within reach';return}
  pt.y=groundHeight(pt.x,pt.z);
  const rk=nearestRock(pt.x,pt.z,1.0);
  if(rk){const r=rk.r;vac.mode='mine';vac.target.copy(r.p);vac.target.y+=r.s*0.3;
    r.hp-=dt*tool.speed/(1.0+r.s*0.7);P.bat=Math.max(0,P.bat-dt*0.8*batMult());
    const k=Math.max(0.001,r.hp);_v2.copy(r.sc).multiplyScalar(k);_m4.compose(r.p,r.q,_v2);rk.c.im.setMatrixAt(r.i,_m4);rk.c.im.instanceMatrix.needsUpdate=true;
    if(Math.random()<0.5)emitSparks(vac.target,2);vac.msg='Breaking up the boulder…';
    if(r.hp<=0&&mine.rockKey!==r.key){mine.rockKey=r.key;act({a:'rock',key:r.key,x:r.p.x,z:r.p.z,s:r.s});flyItem('basalt',r.p.clone());puff(r.p.x,r.p.y,r.p.z,r.s*1.2)}
    return}
  vac.mode='mine';vac.target.copy(pt);
  if(blds.some(b=>Math.hypot(b.x-pt.x,b.z-pt.z)<BUILD[b.type].r+4.5)){vac.blocked=true;vac.msg='Too close to a building to dig here';return}
  const amt=dt*0.8*tool.speed;mine.digAcc+=amt;mine.digX=pt.x;mine.digZ=pt.z;P.bat=Math.max(0,P.bat-dt*0.5*batMult());
  if(net.role==='guest')digAt(pt.x,pt.z,amt); // predicted locally; the host applies the authoritative dig
  if(Math.random()<0.4)emitSparks(pt,1,'#c4744a');vac.msg='Digging regolith…';
}
/* ---------- Pulse Blaster: unlimited shots, short cooldown ---------- */
const bolts=[];const boltMat=new THREE.MeshBasicMaterial({color:'#bff8f2',transparent:true,opacity:0.95,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
const boltGeo=new THREE.CylinderGeometry(0.05,0.05,1,6,1,true);boltGeo.rotateX(Math.PI/2);boltGeo.translate(0,0,0.5);
function drawBolt(f,t){const m=new THREE.Mesh(boltGeo,boltMat.clone());m.position.copy(f);m.lookAt(t);m.scale.set(1,1,f.distanceTo(t));scene.add(m);bolts.push({m,t:0});emitSparks(t,10,'#9ff0ff');emitSparks(f,3,'#e6fffb')}
function updateBolts(dt){for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.t+=dt;b.m.material.opacity=Math.max(0,0.95-b.t*7);b.m.scale.x=b.m.scale.y=1+b.t*6;if(b.t>0.14){scene.remove(b.m);b.m.material.dispose();bolts.splice(i,1)}}}
function gunTick(dt,s,tool,holding){
  const rd=clamp((now-(mine.gunT||-9))/tool.cool,0,1);game.gunReady=rd;
  if(now-(mine.gunT||-9)<0.18){vac.mode='shoot';vac.target.copy(mine.gunAt)} // keep the arm raised briefly after a shot
  if(!holding)return;
  if(rd<1){vac.msg='Blaster cooling…';return}
  raycaster.setFromCamera({x:mouse.nx,y:mouse.ny},camera);
  const c=typeof creatureUnderRay==='function'?creatureUnderRay(tool.range):null;
  let to;if(c)to=c.hit.clone();else{const pt=cave.active?null:pickTerrain();to=pt&&pt.distanceTo(P.pos)<tool.range?pt.clone():raycaster.ray.at(tool.range,new THREE.Vector3())}
  mine.gunT=now;mine.gunAt=(mine.gunAt||new THREE.Vector3()).copy(to);vac.mode='shoot';vac.target.copy(to);
  P.yaw=Math.atan2(to.x-P.pos.x,to.z-P.pos.z);astro.rotation.y=P.yaw;const u=astro.userData;u.armR.rotation.set(-Math.PI/2-Math.atan2(to.y-(P.pos.y+1.3),Math.hypot(to.x-P.pos.x,to.z-P.pos.z)),0,0);astro.updateMatrixWorld(true);
  const from=u.tip.getWorldPosition(new THREE.Vector3());drawBolt(from,to);
  sfx(0.12,2600,3,0.09,'bandpass',0,600);beep(1500,0.05,'square',0.03);
  act({a:'shoot',id:c?c.cr.id:null,slot:P.hot});
  if(net.role)netSend({t:'fx',k:'bolt',f:[from.x,from.y,from.z],to:[to.x,to.y,to.z]});
}
function actShoot(pid,a,predict,local){
  const inv=invOf(pid),s=inv&&inv[a.slot],tool=s&&ITEMS[s.id];if(!tool||tool.tool!=='gun')return false;
  if(!predict&&!local){const rl=rateOf(pid);if(now-(rl.shot||-9)<tool.cool*0.8)return false;rl.shot=now}
  if(!a.id||typeof creatures==='undefined')return true;
  const c=creatures.get(a.id);if(!c||c.gone)return false;const p=posOf(pid);if(!p||Math.hypot(p.x-c.x,p.z-c.z)>tool.range+6)return false;
  if(predict)return true;
  c.hp-=tool.dmg;c.target=pid;emitSparks(_v1.set(c.x,c.y+c.h*0.5,c.z),8,'#9ff0ff');
  if(SPECIES[c.sp].kind==='peaceful'){c.fear=30;if(SPECIES[c.sp].sapient){const k=c.sp;S.rep[k]=Math.max(-100,(S.rep[k]||0)-25);for(const o of creatures.values())if(o.sp===k)o.fear=40;
    if(local)crewSay('Geologist',`Stop shooting! That's a ${SPECIES[k].name}. They won't forget that.`)}}
  return true;
}
function weaponTick(dt,s,tool){
  if(s.d<=0){vac.msg=`Your ${tool.name} is broken`;return}
  if(typeof creatureUnderRay!=='function')return;
  raycaster.setFromCamera({x:mouse.nx,y:mouse.ny},camera);
  const c=creatureUnderRay(6);if(!c){vac.msg='Aim at a creature to use the Arc Prod';return}
  vac.mode='attack';vac.target.copy(c.hit);
  if((mine.atk-=dt)<=0){mine.atk=0.7;attackCreature(c.cr,tool.dmg,tool.stun,0,P.hot);emitSparks(c.hit,14,'#9ff0ff');sfx(0.18,3200,3,0.08);P.bat=Math.max(0,P.bat-2*batMult())}
}
/* ---------- authoritative handlers for mining actions ---------- */
const RL={};const rateOf=pid=>RL[pid||ME]||(RL[pid||ME]={mine:0,rock:0,dig:0,digBudget:1.5,reg:0});
const ACT={};ACT.shoot=actShoot;
function applyAct2(pid,a,predict,local,fail){const h=ACT[a.a];return h?h(pid,a,predict,local,fail):false}
ACT.mine=(pid,a,predict,local,fail)=>{
  const D=depDesc(a.id);if(!D)return false;const units=depUnits(a.id);if(units<=0)return fail('That deposit is used up');
  const inv=invOf(pid),s=inv[a.slot],tool=s&&ITEMS[s.id];if(!tool||tool.tool!=='drill'||s.d<=0)return false;
  const def=DEP[D.type];if(tool.tier<def.tier)return false;
  const p=posOf(pid);if(!p||Math.hypot(p.x-D.x,p.z-D.z)>7.5)return false;
  if(!predict&&!local){const rl=rateOf(pid);if(now-rl.mine<def.hard*1.4/tool.speed*0.55)return false;rl.mine=now}
  setDepUnits(a.id,units-1);
  if(!predict){s.d=Math.max(0,s.d-Math.ceil(def.hard));const bonus=tool.tier>def.tier&&Math.random()<0.3?1:0;giveItem(pid,def.item,1+bonus);
    if(local){S.stats.mined=S.stats.mined||{};S.stats.mined[def.item]=(S.stats.mined[def.item]||0)+1+bonus;if(s.d<=0)toast(tool.name+' broke! Repair it at a habitat','bad')}}
  return true;
};
ACT.rock=(pid,a,predict,local)=>{
  const p=posOf(pid);if(!p||typeof a.key!=='string'||!Number.isFinite(a.x)||Math.hypot(p.x-a.x,p.z-a.z)>8||minedRocks.has(a.key)&&!predict)return false;
  if(!predict&&!local){const rl=rateOf(pid);if(now-rl.rock<0.8)return false;rl.rock=now}
  minedRocks.add(a.key);
  if(!predict){giveItem(pid,'basalt',clamp(Math.round(1+(+a.s||1)*1.5),1,4));if(net.role==='host')netSend({t:'rock',k:a.key})}
  return true;
};
ACT.dig=(pid,a,predict,local)=>{
  const p=posOf(pid);if(!p||!Number.isFinite(a.x)||!Number.isFinite(a.z)||Math.hypot(p.x-a.x,p.z-a.z)>7)return false;
  if(predict)return true;
  const rl=rateOf(pid);rl.digBudget=Math.min(3,rl.digBudget+(now-rl.dig)*2.2);rl.dig=now;
  const amt=clamp(+a.amt||0,0,rl.digBudget);rl.digBudget-=amt;if(amt<=0)return false;
  digAt(a.x,a.z,amt);
  if(net.role==='host')netSend({t:'dig',x:a.x,z:a.z,a:amt},pid===ME?null:netConnOf(pid));
  rl.reg+=amt*1.3;let n=0;while(rl.reg>=1){rl.reg-=1;n++}if(n)giveItem(pid,'regolith',n);
  return true;
};
/* ---------- flares, lamps & the shared light pool ---------- */
const flares=[],lightPool=[0,1,2,3].map(()=>{const l=new THREE.PointLight(0xffb070,0,26,1.5);scene.add(l);return l});
const flareMat=new THREE.MeshStandardMaterial({color:'#ff6a4d',emissive:'#ff5a2d',emissiveIntensity:4});
const lampMat=new THREE.MeshStandardMaterial({color:'#fff1c2',emissive:'#ffe2a8',emissiveIntensity:3});
function throwFlare(x,y,z,vx,vy,vz,remote){
  if(x===undefined){x=P.pos.x;y=P.pos.y+1.6;z=P.pos.z;const yaw=cam.yaw;vx=Math.sin(yaw)*7;vz=Math.cos(yaw)*7;vy=4.5}
  const m=mesh(shared('flare',()=>new THREE.CylinderGeometry(0.05,0.05,0.3,6)),flareMat,x,y,z);scene.add(m);
  flares.push({m,x,y,z,vx,vy,vz,t:0,cave:cave.active?cave.id:0});
  if(!remote&&net.role)netSend({t:'flare',p:[x,y,z,vx,vy,vz]});sfx(0.6,1800,0.6,0.05,'highpass');
}
function updateFlares(dt){
  for(let i=flares.length-1;i>=0;i--){const f=flares[i];f.t+=dt;
    const fl=floorAt(f.x,f.z,f.y);if(f.y>fl+0.1){f.vy-=G*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;if(f.y<=fl+0.1){f.y=fl+0.1;f.vx*=0.2;f.vz*=0.2;f.vy=0}}
    f.m.position.set(f.x,f.y,f.z);f.m.rotation.z=1.2;if(Math.random()<0.3)emitSparks(f.m.position,1,'#ff9a50');
    if(f.t>45){scene.remove(f.m);flares.splice(i,1)}}
}
function placeLamp(){const x=P.pos.x+Math.sin(P.yaw)*1.5,z=P.pos.z+Math.cos(P.yaw)*1.5;act({a:'lampAdd',x,y:floorAt(x,z,P.pos.y+1),z})}
const lampMeshes=new Map();
function lampObj(){const g=new THREE.Group();g.add(cy(0.18,0.22,0.12,10,GREY,0,0.06,0));g.add(cy(0.04,0.04,0.7,6,'#5d5753',0,0.45,0));g.add(sp(0.13,lampMat,0,0.85,0,10,8));return g}
function syncLamps(){
  const want=new Set((S.lamps||[]).map(l=>l.id));
  for(const[id,m]of lampMeshes)if(!want.has(id)){scene.remove(m);lampMeshes.delete(id)}
  for(const l of S.lamps||[])if(!lampMeshes.has(l.id)){const m=lampObj();m.position.set(l.x,l.y,l.z);scene.add(m);lampMeshes.set(l.id,m)}
}
ACT.lampAdd=(pid,a,predict,local)=>{
  if(predict)return true;const p=posOf(pid);if(!p||!Number.isFinite(a.x)||Math.hypot(p.x-a.x,p.z-a.z)>5)return false;
  const g=local?S:S.guests[pid];if(!local){if(!(g.lampTokens>0))return false;g.lampTokens--}
  S.lamps=S.lamps||[];if(S.lamps.length>=60)S.lamps.shift();S.lamps.push({id:'L'+Date.now().toString(36)+Math.floor(Math.random()*1e4),x:+a.x,y:+a.y,z:+a.z});
  syncLamps();if(net.role==='host')netSend({t:'lamps',l:S.lamps});return true;
};
ACT.lampTake=(pid,a,predict,local)=>{
  if(predict)return true;const i=(S.lamps||[]).findIndex(l=>l.id===a.id);if(i<0)return false;const l=S.lamps[i],p=posOf(pid);if(!p||Math.hypot(p.x-l.x,p.z-l.z)>4)return false;
  S.lamps.splice(i,1);syncLamps();giveItem(pid,'lamp',1);if(net.role==='host')netSend({t:'lamps',l:S.lamps});return true;
};
function nearestLamp(){let best=null,bd=3;for(const l of S.lamps||[]){const d=Math.hypot(l.x-P.pos.x,l.z-P.pos.z);if(d<bd&&Math.abs(l.y-P.pos.y)<3){bd=d;best=l}}return best}
// every light source the creatures and the light pool care about
function lightSources(){const out=[];for(const f of flares)out.push({x:f.x,y:f.y+0.3,z:f.z,k:1.4,flare:true,col:0xff8a50});for(const l of S.lamps||[])out.push({x:l.x,y:l.y+0.9,z:l.z,k:1,col:0xffe2a8});return out}
function updateLightPool(){
  const src=lightSources(),c=camera.position;src.sort((a,b)=>((a.x-c.x)**2+(a.y-c.y)**2+(a.z-c.z)**2)-((b.x-c.x)**2+(b.y-c.y)**2+(b.z-c.z)**2));
  lightPool.forEach((l,i)=>{const s=src[i];if(s&&Math.hypot(s.x-c.x,s.z-c.z)<90){l.position.set(s.x,s.y,s.z);l.color.setHex(s.col);l.intensity=(s.flare?18:12)*(0.9+Math.random()*0.15*(s.flare?1:0))}else l.intensity=0});
}
/* ---------- construction drones ---------- */
const drones=[];
function mkDrone(){const g=new THREE.Group();g.add(mesh(rbox(0.9,0.3,0.9,0.12),WHITE,0,0,0));g.add(mesh(rbox(0.92,0.08,0.92,0.03),ORANGE,0,-0.05,0));
  for(const[x,z]of[[0.6,0.6],[-0.6,0.6],[0.6,-0.6],[-0.6,-0.6]]){g.add(cy(0.04,0.04,0.12,5,GREY,x,0.12,z));const r=mesh(shared('rotor',()=>new THREE.CylinderGeometry(0.32,0.32,0.02,12)),mat('#3a3532',{transparent:true,opacity:0.5}),x,0.2,z);g.add(r)}
  const eye=sp(0.09,glow('#6fe0c8',2.5),0,-0.2,0.3,8,6);g.add(eye);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.5,1,10,1,true),new THREE.MeshBasicMaterial({color:'#6fe0c8',transparent:true,opacity:0.3,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beam.visible=false;g.add(beam);g.userData.beam=beam;g.traverse(c=>{if(c.isMesh)c.castShadow=false});return g}
function droneBase(b){let best=null,bd=1e9;for(const h of blds)if((h.type==='habitat'||h.type==='fabricator'||h.type==='pad')&&h.progress>=1){const d=Math.hypot(h.x-b.x,h.z-b.z);if(d<bd){bd=d;best=h}}return best||b}
function updateDrones(dt){
  const pending=blds.filter(b=>b.progress<1),maxD=2+count('fabricator');
  for(const b of pending){if(b._drone||drones.length>=maxD)continue;const src=droneBase(b),g=mkDrone();g.position.set(src.x,src.y+6,src.z);scene.add(g);const d={g,b,state:'fly',x:src.x,y:src.y+6,z:src.z};b._drone=d;drones.push(d)}
  for(let i=drones.length-1;i>=0;i--){const d=drones[i],b=d.b,beam=d.g.userData.beam;
    const gone=!blds.includes(b)||b.progress>=1;
    let tx,ty,tz;if(gone){const h=droneBase(b);tx=h.x;ty=h.y+20;tz=h.z;d.state='home'}else{tx=b.x;ty=b.y+BUILD[b.type].r*0.6+5;tz=b.z}
    const dx=tx-d.x,dy=ty-d.y,dz=tz-d.z,dist=Math.hypot(dx,dy,dz);
    if(dist>1.2){const sp=Math.min(9,dist*2);d.x+=dx/dist*sp*dt;d.y+=dy/dist*sp*dt;d.z+=dz/dist*sp*dt;beam.visible=false;if(d.state==='work')d.state='fly'}
    else if(gone){scene.remove(d.g);drones.splice(i,1);if(b._drone===d)b._drone=null;continue}
    else{d.state='work';beam.visible=true;const h=ty-b.y;beam.scale.set(1,h,1);beam.position.y=-h/2;beam.material.opacity=0.2+Math.random()*0.15;
      if(net.role!=='guest'){const spd=(S.mode==='sandbox'?5:1)*(hasRole('Engineer')?1.25:1)/(costWeight(b.type)*0.18+1.5);b.progress=Math.min(1,b.progress+dt*spd);
        if(b.progress>=1){b.g.scale.set(1,1,1);toast(BUILD[b.type].name+' complete','good');beep(990,0.1);beep(1320,0.12,'sine',0.06,0.1)}}
      const e=1-Math.pow(1-b.progress,3);if(b.progress<1)b.g.scale.set(1,0.03+0.97*e,1);
      if(Math.random()<0.4)emitSparks(_v1.set(b.x+(Math.random()-0.5)*BUILD[b.type].r,b.y+e*3,b.z+(Math.random()-0.5)*BUILD[b.type].r),1,'#9ff0de')}
    d.g.position.set(d.x,d.y+Math.sin(now*3+i)*0.15,d.z);d.g.rotation.y+=dt*0.6;d.g.children.forEach(c=>{if(c.geometry&&c.geometry.type==='CylinderGeometry'&&c.position.y>0.15)c.rotation.y+=dt*30});
  }
}
function clearDrones(){for(const d of drones)scene.remove(d.g);drones.length=0}
const costWeight=t=>{const c=BUILD_COSTS[t]||{};let n=0;for(const k in c)n+=c[k]*(ITEMS[k]&&/tiplate|alloy|resonite|circuit/.test(k)?3:1);return n};
