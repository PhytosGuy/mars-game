'use strict';
/* =========================================================
   ALIEN LIFE: species, behaviour, combat and world reactions
   The host (or single-player) simulates creatures; guests receive
   compact 'cr' snapshots and only render them.
   ========================================================= */
const SPECIES={
  tharrak:{name:'Tharrak',kind:'peaceful',sapient:true,hp:140,speed:2.2,desc:'Tall three-legged nomads who live in stone camps on the plains. Curious, proud and careful with strangers.'},
  lumari:{name:'Lumari',kind:'peaceful',sapient:true,hp:60,speed:1.6,desc:'Glowing floaters of the deep caves. They speak in light and are drawn to energy.'},
  rockback:{name:'Rockback',kind:'peaceful',hp:160,speed:1.0,desc:'Slow, shelled grazers that lick minerals from rocks. They curl up when startled.'},
  skitter:{name:'Skitter',kind:'hostile',hp:22,speed:6,dmg:4,desc:'Six-legged cave swarmers that guard their hives. They hate bright light.'},
  wyrm:{name:'Dune Wyrm',kind:'hostile',hp:150,speed:9,dmg:24,desc:'A burrowing predator of the dunes that hunts by vibration. Walk, don’t run.'},
  stalker:{name:'Night Stalker',kind:'hostile',hp:70,speed:7.5,dmg:14,desc:'A lean night hunter that circles lone astronauts in the dark. Flares drive it off.'},
  hopper:{name:'Pebblehopper',kind:'peaceful',hp:18,speed:4.2,feed:'regolith',drop:'springmoss',desc:'Small, springy grazers that bounce around the flats in little groups. Shy of running feet, but they love a mouthful of regolith.'},
  strider:{name:'Loomstrider',kind:'peaceful',hp:220,speed:1.7,feed:'ice',drop:'nectar',desc:'Towering, gentle walkers that roam the plains in small herds, sipping frost. Their back-sails ooze a sweet sap.'},
  mite:{name:'Rustmite',kind:'hostile',hp:14,speed:6.4,dmg:3,desc:'Tick-sized biters that boil out of rocky ground at anything that comes close. Flares scatter them.'},
  ravager:{name:'Ravager',kind:'hostile',hp:280,speed:3.2,dmg:22,desc:'A plated highland brute. It paws the ground, then charges in a straight line. Sidestep, then strike while it recovers.'},
};
const creatures=new Map(),crGroup=new THREE.Group();scene.add(crGroup);
/* ---------- models ---------- */
function mkTharrak(){
  const g=new THREE.Group(),skin=mat('#b49478',{roughness:0.8}),dark=mat('#7a5a44'),robe=mat('#c9864a',{roughness:0.9}),eye=mat('#ffcf6a',{emissive:'#ffb040',emissiveIntensity:2.2});
  const legs=[];for(let i=0;i<3;i++){const a=i/3*TAU,p=new THREE.Group();p.position.set(Math.cos(a)*0.32,1.7,Math.sin(a)*0.32);g.add(p);
    const up=mesh(shared('thL',()=>new THREE.CapsuleGeometry(0.09,0.9,4,8)),skin,Math.cos(a)*0.25,-0.5,Math.sin(a)*0.25);up.rotation.set(Math.sin(a)*0.35,0,-Math.cos(a)*0.35);p.add(up);
    const lo=mesh(shared('thL2',()=>new THREE.CapsuleGeometry(0.07,0.9,4,8)),dark,Math.cos(a)*0.4,-1.3,Math.sin(a)*0.4);p.add(lo);legs.push(p)}
  g.add(mesh(shared('thB',()=>new THREE.CapsuleGeometry(0.36,1.0,6,12)),skin,0,2.3,0));
  g.add(mesh(shared('thR',()=>new THREE.CylinderGeometry(0.42,0.6,0.9,10,1,true)),mat('#c9864a',{side:THREE.DoubleSide,roughness:0.9}),0,1.9,0));
  const head=new THREE.Group();head.position.y=3.15;g.add(head);
  const hd=mesh(shared('thH',()=>new THREE.ConeGeometry(0.34,0.9,10)),dark,0,0.1,-0.05);hd.rotation.x=-0.35;head.add(hd);
  for(let i=-1;i<=1;i++)head.add(sp(0.05,eye,i*0.11,-0.05,0.22,6,4));
  const arm=(s)=>{const p=new THREE.Group();p.position.set(s*0.38,2.7,0);g.add(p);p.add(mesh(shared('thA',()=>new THREE.CapsuleGeometry(0.06,1.1,4,8)),skin,0,-0.6,0));
    for(let k=-1;k<=1;k++)p.add(rot(mesh(shared('thF',()=>new THREE.CapsuleGeometry(0.025,0.18,3,6)),dark,k*0.04,-1.28,0),'z',k*0.3));return p};
  const armL=arm(1),armR=arm(-1);
  return{g,parts:{legs,head,armL,armR},h:3.4};
}
function mkLumari(){
  const g=new THREE.Group(),bellM=new THREE.MeshStandardMaterial({color:'#6fe0c8',transparent:true,opacity:0.55,emissive:'#3fd0b8',emissiveIntensity:1.2,roughness:0.2,side:THREE.DoubleSide,depthWrite:false});
  const bell=new THREE.Mesh(shared('luB',()=>new THREE.SphereGeometry(0.55,16,10,0,TAU,0,Math.PI*0.55)),bellM);g.add(bell);
  const core=new THREE.Mesh(shared('luC',()=>new THREE.SphereGeometry(0.18,10,8)),new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#c6fff2',emissiveIntensity:3}));core.position.y=0.05;g.add(core);
  const tend=[];for(let i=0;i<7;i++){const a=i/7*TAU,t=mesh(shared('luT',()=>new THREE.CylinderGeometry(0.02,0.005,1.2,4)),bellM,Math.cos(a)*0.32,-0.6,Math.sin(a)*0.32);t.castShadow=false;g.add(t);tend.push(t)}
  return{g,parts:{bell,bellM,core,tend},h:0.6};
}
function mkRockback(){
  const g=new THREE.Group(),shell=mat('#6b4a3a',{flatShading:true,roughness:0.95}),cr=mat('#d9b47a',{emissive:'#a07a40',emissiveIntensity:0.3});
  const sh=mesh(shared('rbS',()=>new THREE.DodecahedronGeometry(1,1)),shell,0,0.8,0);sh.scale.set(1.3,0.75,1.6);g.add(sh);
  for(let i=0;i<5;i++)g.add(mesh(shared('oct',()=>new THREE.OctahedronGeometry(1,0)),cr,(Math.random()-0.5)*1.4,1.35,(Math.random()-0.5)*1.8)).children;
  g.children.slice(1).forEach(c=>c.scale.setScalar(0.18));
  const head=mesh(shared('rbH',()=>new THREE.SphereGeometry(0.35,10,8)),mat('#8a6a55'),0,0.6,1.5);g.add(head);
  const legs=[];for(const[x,z]of[[0.8,0.9],[-0.8,0.9],[0.8,-0.9],[-0.8,-0.9]]){const l=cy(0.15,0.12,0.6,6,'#5a4033',x,0.3,z);g.add(l);legs.push(l)}
  return{g,parts:{head,legs,sh},h:1.6};
}
function mkSkitter(){
  const g=new THREE.Group(),body=mat('#3a2f3d',{roughness:0.5,metalness:0.2}),eye=mat('#ff5a4f',{emissive:'#ff3a2f',emissiveIntensity:2.5});
  const b=mesh(shared('skB',()=>new THREE.SphereGeometry(0.4,12,8)),body,0,0.35,0);b.scale.set(1,0.55,1.4);g.add(b);
  g.add(sp(0.06,eye,0.12,0.45,0.5,6,4));g.add(sp(0.06,eye,-0.12,0.45,0.5,6,4));
  const legs=[];for(let i=0;i<6;i++){const s=i<3?1:-1,z=((i%3)-1)*0.32,p=new THREE.Group();p.position.set(s*0.3,0.35,z);g.add(p);p.add(rot(mesh(rbox(0.5,0.05,0.05,0.02),body,s*0.25,-0.1,0),'z',s*0.5));legs.push(p)}
  return{g,parts:{legs},h:0.6};
}
function mkWyrm(){
  const g=new THREE.Group(),skin=mat('#8a6a4a',{roughness:0.85,flatShading:true}),plate=mat('#a37a52',{flatShading:true}),glowM=mat('#ffb060',{emissive:'#ff8030',emissiveIntensity:2});
  const segs=[];for(let i=0;i<11;i++){const s=1.2-i*0.07,m=mesh(shared('wyS',()=>new THREE.DodecahedronGeometry(1,1)),i%2?plate:skin,0,0,0);m.scale.setScalar(s);g.add(m);segs.push(m)}
  const mouth=new THREE.Group();segs[0].add(mouth);mouth.add(mesh(shared('wyM',()=>new THREE.CircleGeometry(0.7,12)),glowM,0,0,0.95));
  for(let i=0;i<10;i++){const a=i/10*TAU,t=mesh(shared('wyT',()=>new THREE.ConeGeometry(0.08,0.4,5)),mat('#f2efe9'),Math.cos(a)*0.62,Math.sin(a)*0.62,0.9);t.rotation.x=Math.PI/2;mouth.add(t)}
  const ripple=new THREE.Mesh(new THREE.RingGeometry(1.2,2.4,24),new THREE.MeshBasicMaterial({color:'#5e3a2e',transparent:true,opacity:0.5,side:THREE.DoubleSide,depthWrite:false}));ripple.rotation.x=-Math.PI/2;
  return{g,parts:{segs,ripple},h:2};
}
function mkStalker(){
  const g=new THREE.Group(),skin=mat('#1d1820',{roughness:0.6}),stripe=mat('#5b3a78',{emissive:'#3a2050',emissiveIntensity:0.4}),eye=mat('#e8f4ff',{emissive:'#cfe6ff',emissiveIntensity:3});
  const body=mesh(shared('stB',()=>new THREE.CapsuleGeometry(0.28,1.3,4,10)),skin,0,1.5,0);body.rotation.x=Math.PI/2;g.add(body);
  g.add(rot(mesh(rbox(0.1,0.04,1.2,0.02),stripe,0,1.78,0),'x',0));
  const neck=new THREE.Group();neck.position.set(0,1.7,0.8);g.add(neck);neck.add(rot(mesh(shared('stN',()=>new THREE.CapsuleGeometry(0.12,0.6,4,8)),skin,0,0.25,0.15),'x',0.7));
  const head=mesh(shared('stH',()=>new THREE.ConeGeometry(0.18,0.7,8)),skin,0,0.55,0.5);head.rotation.x=Math.PI/2;neck.add(head);
  neck.add(sp(0.045,eye,0.08,0.6,0.5,6,4));neck.add(sp(0.045,eye,-0.08,0.6,0.5,6,4));
  const legs=[];for(const[x,z]of[[0.25,0.55],[-0.25,0.55],[0.25,-0.55],[-0.25,-0.55]]){const p=new THREE.Group();p.position.set(x,1.4,z);g.add(p);p.add(mesh(shared('stL',()=>new THREE.CapsuleGeometry(0.06,1.2,4,6)),skin,0,-0.7,0));legs.push(p)}
  return{g,parts:{legs,neck},h:2};
}
function mkHopper(){
  const g=new THREE.Group(),skin=mat('#c9a27a',{roughness:0.85}),belly=mat('#efd9b8'),tip=mat('#8fe39a',{emissive:'#6fe08a',emissiveIntensity:1.8});
  const body=new THREE.Group();g.add(body);
  const b=mesh(shared('hpB',()=>new THREE.SphereGeometry(0.28,12,10)),skin,0,0.32,0);b.scale.set(1,0.85,1.15);body.add(b);
  body.add(mesh(shared('hpBl',()=>new THREE.SphereGeometry(0.2,10,8)),belly,0,0.27,0.12));
  const legs=[];for(const s of[1,-1]){const l=new THREE.Group();l.position.set(s*0.2,0.26,-0.1);body.add(l);const th=mesh(shared('hpL',()=>new THREE.CapsuleGeometry(0.08,0.18,4,8)),skin,0,-0.08,0.02);th.rotation.x=0.8;l.add(th);l.add(mesh(rbox(0.1,0.04,0.22,0.02),skin,0,-0.22,0.1));legs.push(l)}
  for(const s of[1,-1]){body.add(sp(0.045,mat('#1d1411'),s*0.11,0.4,0.27,6,4));const an=new THREE.Group();an.position.set(s*0.08,0.5,0.15);body.add(an);an.add(cy(0.012,0.012,0.32,4,'#8a6a55',0,0.16,0));an.add(sp(0.04,tip,0,0.33,0,6,4));an.rotation.set(-0.4,0,s*0.35)}
  return{g,parts:{body,legs},h:0.6};
}
function mkStrider(){
  const g=new THREE.Group(),skin=mat('#d8c3a5',{roughness:0.8}),dark=mat('#8a6a55'),eye=mat('#2a1d18');
  const sail=new THREE.MeshStandardMaterial({color:'#ff9f7a',emissive:'#ff7a50',emissiveIntensity:0.6,transparent:true,opacity:0.82,side:THREE.DoubleSide,roughness:0.5});
  const body=new THREE.Group();body.position.y=4.1;g.add(body);
  const tb=mesh(shared('srB',()=>new THREE.SphereGeometry(1,16,12)),skin,0,0,0);tb.scale.set(0.85,0.7,1.5);body.add(tb);
  for(let i=0;i<3;i++){const s=new THREE.Mesh(shared('srS',()=>new THREE.CircleGeometry(0.9,14,0,Math.PI)),sail);s.position.set(0,0.5,-0.7+i*0.65);s.rotation.y=Math.PI/2;s.scale.set(1,1-i*0.18,1);body.add(s)}
  const neck=new THREE.Group();neck.position.set(0,0.3,1.25);body.add(neck);const nk=mesh(shared('srN',()=>new THREE.CapsuleGeometry(0.16,1.5,4,8)),skin,0,0.8,0.3);nk.rotation.x=0.35;neck.add(nk);
  const head=new THREE.Group();head.position.set(0,1.6,0.6);neck.add(head);const hd=mesh(shared('srH',()=>new THREE.CapsuleGeometry(0.2,0.4,4,8)),skin,0,0,0.15);hd.rotation.x=Math.PI/2.2;head.add(hd);
  head.add(sp(0.05,eye,0.15,0.08,0.25,6,4));head.add(sp(0.05,eye,-0.15,0.08,0.25,6,4));
  const legs=[];for(const[x,z]of[[0.55,0.9],[-0.55,0.9],[0.55,-0.9],[-0.55,-0.9]]){const p=new THREE.Group();p.position.set(x,3.8,z);g.add(p);
    p.add(mesh(shared('srL1',()=>new THREE.CapsuleGeometry(0.11,1.7,4,8)),skin,0,-0.95,0));const kn=new THREE.Group();kn.position.y=-1.9;p.add(kn);
    kn.add(mesh(shared('srL2',()=>new THREE.CapsuleGeometry(0.08,1.6,4,8)),dark,0,-0.85,0));kn.add(mesh(shared('srF',()=>new THREE.CylinderGeometry(0.18,0.24,0.12,8)),dark,0,-1.75,0));p.userData.kn=kn;legs.push(p)}
  return{g,parts:{body,legs,neck,head},h:5.6};
}
function mkMite(){
  const g=new THREE.Group(),shell=mat('#7a3a26',{roughness:0.5,metalness:0.15,flatShading:true}),eye=mat('#ffd34d',{emissive:'#ffb000',emissiveIntensity:2.6});
  const b=mesh(shared('mtB',()=>new THREE.DodecahedronGeometry(0.22,0)),shell,0,0.2,0);b.scale.set(1.1,0.6,1.3);g.add(b);
  g.add(sp(0.035,eye,0.07,0.27,0.24,6,4));g.add(sp(0.035,eye,-0.07,0.27,0.24,6,4));
  const claws=[];for(const s of[1,-1]){const c=new THREE.Group();c.position.set(s*0.12,0.2,0.22);g.add(c);c.add(rot(mesh(rbox(0.05,0.05,0.2,0.02),shell,0,0,0.1),'y',s*0.4));claws.push(c)}
  const legs=[];for(let i=0;i<6;i++){const s=i<3?1:-1,z=((i%3)-1)*0.13,p=new THREE.Group();p.position.set(s*0.14,0.18,z);g.add(p);p.add(rot(mesh(rbox(0.22,0.03,0.03,0.01),shell,s*0.1,-0.06,0),'z',s*0.6));legs.push(p)}
  return{g,parts:{legs,claws},h:0.35};
}
function mkRavager(){
  const g=new THREE.Group(),hide=mat('#4a3a36',{roughness:0.9,flatShading:true}),plate=mat('#6d5a52',{roughness:0.7,flatShading:true}),glw=mat('#ff4a2f',{emissive:'#ff3a1f',emissiveIntensity:1.6}),horn=mat('#e6d8bf');
  const body=new THREE.Group();body.position.y=1.7;g.add(body);
  const tb=mesh(shared('rvB',()=>new THREE.DodecahedronGeometry(1,1)),hide,0,0,0);tb.scale.set(1.25,0.95,2.0);body.add(tb);
  for(let i=0;i<5;i++){const pl=mesh(shared('rvP',()=>new THREE.DodecahedronGeometry(0.6,0)),plate,0,0.8,-1.3+i*0.65);pl.scale.set(1.5,0.5,0.8);body.add(pl);body.add(mesh(shared('rvSp',()=>new THREE.ConeGeometry(0.14,0.6,5)),horn,0,1.2,-1.3+i*0.65))}
  for(let i=0;i<4;i++)body.add(rot(mesh(rbox(0.06,0.06,0.9,0.02),glw,(i%2?1:-1)*1.05,0.1-i*0.1,-0.8+i*0.5),'y',0.1));
  const head=new THREE.Group();head.position.set(0,-0.1,2.0);body.add(head);
  const hd=mesh(shared('rvH',()=>new THREE.DodecahedronGeometry(0.65,0)),plate,0,0,0.3);hd.scale.set(1.2,0.9,1.1);head.add(hd);
  for(const s of[1,-1]){const h=mesh(shared('rvHn',()=>new THREE.ConeGeometry(0.15,0.9,6)),horn,s*0.5,0.35,0.5);h.rotation.set(1.1,0,-s*0.5);head.add(h);head.add(sp(0.07,glw,s*0.28,0.15,0.85,6,4))}
  const legs=[];for(const[x,z]of[[0.85,1.2],[-0.85,1.2],[0.85,-1.2],[-0.85,-1.2]]){const p=new THREE.Group();p.position.set(x,1.4,z);g.add(p);p.add(mesh(shared('rvL',()=>new THREE.CapsuleGeometry(0.28,0.8,4,8)),hide,0,-0.6,0));p.add(mesh(rbox(0.6,0.25,0.7,0.1),plate,0,-1.25,0.05));legs.push(p)}
  return{g,parts:{body,legs,head},h:3};
}
const CR_MAKE={tharrak:mkTharrak,lumari:mkLumari,rockback:mkRockback,skitter:mkSkitter,wyrm:mkWyrm,stalker:mkStalker,hopper:mkHopper,strider:mkStrider,mite:mkMite,ravager:mkRavager};
function addCreature(id,sp,x,y,z,home){
  if(creatures.has(id))return creatures.get(id);
  if(SPECIES[sp].kind==='hostile'&&WS().creatures==='peaceful'&&net.role!=='guest')return{id,sp,target:null};   // peaceful worlds: no hostiles
  const M=CR_MAKE[sp](),c={id,sp,x,y,z,yaw:Math.random()*TAU,vx:0,vz:0,hp:SPECIES[sp].hp,state:'idle',t:Math.random()*5,home:home||{x,y,z,r:12},target:null,stun:0,cool:0,ph:Math.random()*6,mesh:M.g,parts:M.parts,h:M.h,emerge:0,mood:0,fear:0};
  M.g.traverse(o=>{if(o.isMesh)o.userData.crId=id});M.g.position.set(x,y,z);crGroup.add(M.g);if(M.parts.ripple)scene.add(M.parts.ripple);
  creatures.set(id,c);return c;
}
function removeCreature(id){const c=creatures.get(id);if(!c)return;crGroup.remove(c.mesh);if(c.parts.ripple)scene.remove(c.parts.ripple);creatures.delete(id)}
function clearCreatures(){for(const id of[...creatures.keys()])removeCreature(id)}
/* ---------- who's around (players, noise, light) ---------- */
function playerList(){
  const out=[{pid:ME,x:P.pos.x,y:P.pos.y,z:P.pos.z,rover:P.mode==='rover',yaw:cam.yaw,noise:vac.mode?1:(P.mode==='rover'?Math.min(1,Math.abs(R.speed)/8):(keys.ShiftLeft||keys.ShiftRight)&&Math.hypot(P.vel.x,P.vel.z)>5?0.7:0.15),dead:game.dead}];
  if(net.role==='host')for(const g of net.conns.values()){if(!g.ready||!g.pos)continue;const pp=net.players.get(g.token),pose=pp&&pp.t;
    out.push({pid:g.token,x:g.pos.x,y:g.pos.y,z:g.pos.z,rover:!!(pose&&pose.p[4]),yaw:pose?pose.p[3]:0,noise:pose&&pose.v?1:0.3})}
  return out;
}
function litAt(x,y,z){ // flares, lamps, base lights, daylight
  if(!cave.nets.size||y>groundHeight(x,z)-2){if(ENV.day>0.35)return 1}
  for(const s of lightSources())if(Math.hypot(s.x-x,s.z-z)<(s.flare?14:9)&&Math.abs(s.y-y)<6)return s.flare?2:1;
  for(const b of blds)if((b.type==='habitat'||b.type==='tower'||b.type==='dome')&&Math.hypot(b.x-x,b.z-z)<45)return 1;
  return 0;
}
/* ---------- spawning (host / single-player) ---------- */
function spawnTick(){
  const pl=playerList();const near=(x,z,r)=>pl.some(p=>Math.hypot(p.x-x,p.z-z)<r);
  for(const p of pl){
    for(const L of landmarksNear(p.x,p.z,420))if(L.type==='village')for(let i=0;i<5;i++){const id=`th${L.id}_${i}`;if(creatures.has(id))continue;const a=i/5*TAU+0.7,x=L.x+Math.cos(a)*6,z=L.z+Math.sin(a)*6;addCreature(id,'tharrak',x,groundHeight(x,z),z,{x:L.x,y:0,z:L.z,r:18})}
    for(const N of cave.nets.values()){const D=N.D;
      if(D.kind==='lumari')D.spots.forEach((s,i)=>{const id=`lu${D.e.id}_${i}`;if(!creatures.has(id)&&!driven(id))addCreature(id,'lumari',s.x,s.y+1.8,s.z,{x:s.x,y:s.y,z:s.z,r:10})});
      if(D.kind==='hive')for(let i=0;i<5;i++){const s=D.spots[0],id=`sk${D.e.id}_${i}`;if(!creatures.has(id)&&!driven(id))addCreature(id,'skitter',s.x+(i-2)*0.8,s.y,s.z+(i%2),{x:s.x,y:s.y,z:s.z,r:14})}}
    const gx=Math.floor(p.x/520),gz=Math.floor(p.z/520);
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const cx=(gx+i+0.5)*520,cz=(gz+j+0.5)*520;if(Math.hypot(cx-p.x,cz-p.z)>480||Math.hypot(cx,cz)<200)continue;
      const r=hash2(gx+i,gz+j,SITE.seed+61);sample(cx,cz,TS3);
      if(r<0.6&&TS3.dune<0.2&&TS3.mtn<0.1)for(let k=0;k<4;k++){const id=`rb${gx+i}_${gz+j}_${k}`;if(creatures.has(id))continue;const x=cx+k*4,z=cz+(k%2)*5;addCreature(id,'rockback',x,groundHeight(x,z),z,{x:cx,y:0,z:cz,r:40})}
      if(TS3.dune>0.35&&r<0.75){const id=`wy${gx+i}_${gz+j}`;if(!creatures.has(id)&&!driven(id))addCreature(id,'wyrm',cx,groundHeight(cx,cz),cz,{x:cx,y:0,z:cz,r:160})}}
    // ambient wildlife on a finer grid: hopper colonies, strider herds, mite nests and the odd ravager
    const G2=220,hx=Math.floor(p.x/G2),hz=Math.floor(p.z/G2),hb=home();
    for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const gx2=hx+i,gz2=hz+j,cx=(gx2+0.5)*G2+(hash2(gx2,gz2,SITE.seed+91)-0.5)*120,cz=(gz2+0.5)*G2+(hash2(gx2,gz2,SITE.seed+92)-0.5)*120;
      if(Math.hypot(cx-p.x,cz-p.z)>400)continue;const dh=Math.hypot(cx-hb.x,cz-hb.z);if(dh<60)continue;
      const r=hash2(gx2,gz2,SITE.seed+93),r2=hash2(gx2,gz2,SITE.seed+94);sample(cx,cz,TS3);const put=(id,sp,k,n,spread,hr)=>{if(creatures.has(id)||driven(id))return;const a=k/n*TAU+r2*6,x=cx+Math.cos(a)*spread*(0.4+((k*37)%10)/16),z=cz+Math.sin(a)*spread*(0.4+((k*53)%10)/16);addCreature(id,sp,x,groundHeight(x,z),z,{x:cx,y:0,z:cz,r:hr})};
      const more=WS().creatures==='lots'?2:0;
      if(r<0.36&&TS3.dune<0.45){const n=3+Math.floor(r2*3)+more;for(let k=0;k<n;k++)put(`hp${gx2}_${gz2}_${k}`,'hopper',k,n,5,16)}
      else if(r<0.56&&TS3.mtn<0.3&&TS3.dune<0.4){const n=2+Math.floor(r2*2)+(more?1:0);for(let k=0;k<n;k++)put(`sr${gx2}_${gz2}_${k}`,'strider',k,n,9,70)}
      else if(r<0.76&&dh>160&&TS3.dune<0.45){const n=3+Math.floor(r2*2)+more;for(let k=0;k<n;k++)put(`mt${gx2}_${gz2}_${k}`,'mite',k,n,2.5,10)}
      else if(r>=0.94&&dh>320&&S.mode!=='sandbox')put(`rv${gx2}_${gz2}`,'ravager',0,1,0,90)}
    // night stalkers come for lone astronauts far from base
    const t=tod(),night=t>20.2||t<5.4;
    if(night&&!p.rover&&p.y>groundHeight(p.x,p.z)-2&&Math.hypot(p.x-home().x,p.z-home().z)>140&&S.mode!=='sandbox'){
      const id='st_'+String(p.pid).slice(0,8)+'_'+solNum();if(!creatures.has(id)&&!driven(id)){const a=Math.random()*TAU,x=p.x+Math.cos(a)*80,z=p.z+Math.sin(a)*80;addCreature(id,'stalker',x,groundHeight(x,z),z,{x,y:0,z,r:300}).target=p.pid}}
  }
  for(const c of[...creatures.values()]){if(!near(c.x,c.z,520))removeCreature(c.id);else if(c.sp==='stalker'){const t=tod();if(t>5.6&&t<20)removeCreature(c.id)}}
}
const driven=id=>S.driven&&S.driven[id]&&S.time-S.driven[id]<SOL_H;
/* ---------- behaviour ---------- */
function steer(c,tx,tz,sp,dt){const dx=tx-c.x,dz=tz-c.z,d=Math.hypot(dx,dz);if(d<0.3){c.vx*=0.8;c.vz*=0.8;return d}c.vx=lerp(c.vx,dx/d*sp,damp(4,dt));c.vz=lerp(c.vz,dz/d*sp,damp(4,dt));c.yaw=lerpA(c.yaw,Math.atan2(dx,dz),damp(6,dt));return d}
function flee(c,fx,fz,sp,dt){const dx=c.x-fx,dz=c.z-fz,d=Math.hypot(dx,dz)||1;return steer(c,c.x+dx/d*10,c.z+dz/d*10,sp,dt)}
function nearestPlayer(c,pl,maxD){let best=null,bd=maxD;for(const p of pl){if(p.dead)continue;const d=Math.hypot(p.x-c.x,p.z-c.z);if(d<bd&&Math.abs(p.y-c.y)<10){bd=d;best=p}}return best?{p:best,d:bd}:null}
function damagePlayer(pid,n,cause,kb){
  if(pid===ME){hurt(n,cause);if(P.mode==='rover'){R.battery=Math.max(0,R.battery-n);R.speed*=0.3}else if(kb){P.vel.x+=kb.x;P.vel.z+=kb.z;P.vel.y=Math.max(P.vel.y,kb.y||0);P.onGround=false}}
  else sendTo(netConnOf(pid),kb?{t:'ev',k:'hurt',n,cause,kx:kb.x,kz:kb.z,ky:kb.y||0}:{t:'ev',k:'hurt',n,cause})}
function crTick(dt){
  const pl=playerList(),storm=S.storm.level,q=typeof quake!=='undefined'&&quake.active;
  for(const c of creatures.values()){
    const S_=SPECIES[c.sp];c.t+=dt;c.cool=Math.max(0,c.cool-dt);c.ph+=dt;
    if(c.stun>0){c.stun-=dt;c.vx*=0.9;c.vz*=0.9;c.state='stunned'}
    else if(c.hp<=0){c.state='flee';c.fear=10}
    const np=nearestPlayer(c,pl,c.sp==='wyrm'?80:c.sp==='stalker'?160:c.sp==='ravager'?60:40);
    if(c.state!=='stunned')switch(c.sp){
      case'tharrak':{const rep=S.rep.tharrak||0;
        if(storm>0.55){c.state='shelter';steer(c,c.home.x,c.home.z,S_.speed,dt)}
        else if(c.fear>0||rep<-20){c.state='wary';if(np&&np.d<20)flee(c,np.p.x,np.p.z,S_.speed*1.5,dt);else steer(c,c.home.x,c.home.z,S_.speed,dt)}
        else if(c.talking){c.vx*=0.8;c.vz*=0.8;if(np)c.yaw=lerpA(c.yaw,Math.atan2(np.p.x-c.x,np.p.z-c.z),damp(4,dt))}
        else if(np&&np.d<22){c.state='curious';if(np.d>(rep>=15?4:7))steer(c,np.p.x,np.p.z,S_.speed*0.6,dt);else{c.vx*=0.8;c.vz*=0.8;c.yaw=lerpA(c.yaw,Math.atan2(np.p.x-c.x,np.p.z-c.z),damp(4,dt))}}
        else{c.state='wander';if(!c.wp||c.t>c.wt){c.t=0;c.wt=4+Math.random()*6;const a=Math.random()*TAU,r=Math.random()*c.home.r;c.wp={x:c.home.x+Math.cos(a)*r,z:c.home.z+Math.sin(a)*r}}steer(c,c.wp.x,c.wp.z,S_.speed*0.5,dt)}
        c.fear=Math.max(0,c.fear-dt*0.1);break}
      case'lumari':{const rep=S.rep.lumari||0;
        if(c.guide){c.state='guide';const d=steer(c,c.guide.x,c.guide.z,S_.speed*1.4,dt);if(d<2){c.guide=null;toast('The Lumari circles above the deposit','good')}}
        else if(c.fear>0){c.state='flee';if(np)flee(c,np.p.x,np.p.z,S_.speed*2,dt);c.fear-=dt}
        else if(np&&np.d<12&&rep>=0){c.state='curious';if(np.d>3)steer(c,np.p.x,np.p.z,S_.speed,dt);else{c.vx*=0.9;c.vz*=0.9}}
        else{c.state='drift';const a=c.ph*0.3;steer(c,c.home.x+Math.cos(a)*4,c.home.z+Math.sin(a)*4,S_.speed*0.5,dt)}
        c.y=lerp(c.y,floorAt(c.x,c.z,c.y)+1.6+Math.sin(c.ph*1.4)*0.3,damp(2,dt));break}
      case'rockback':{
        const wy=[...creatures.values()].find(o=>o.sp==='wyrm'&&o.emerge>0&&Math.hypot(o.x-c.x,o.z-c.z)<30);
        if(wy){c.state='flee';flee(c,wy.x,wy.z,S_.speed*3,dt)}
        else if(c.fear>0||np&&np.d<7&&np.p.noise>0.5||q){c.state='curl';c.vx*=0.8;c.vz*=0.8;c.fear=Math.max(0,c.fear-dt);if(!c.fear&&!(np&&np.d<7))c.fear=0}
        else{c.state='graze';if(!c.wp||c.t>c.wt){c.t=0;c.wt=6+Math.random()*8;const a=Math.random()*TAU,r=Math.random()*c.home.r;c.wp={x:c.home.x+Math.cos(a)*r,z:c.home.z+Math.sin(a)*r}}steer(c,c.wp.x,c.wp.z,S_.speed*0.6,dt)}
        break}
      case'skitter':{
        const fl=lightSources().find(s=>Math.hypot(s.x-c.x,s.z-c.z)<(s.flare?10:6));
        if(fl||c.hp<S_.hp*0.35){c.state='flee';flee(c,fl?fl.x:np?np.p.x:c.x,fl?fl.z:np?np.p.z:c.z,S_.speed,dt)}
        else{const hear=pl.find(p=>!p.dead&&p.noise>=1&&Math.hypot(p.x-c.x,p.z-c.z)<30&&Math.abs(p.y-c.y)<10);
          const intr=pl.find(p=>!p.dead&&Math.hypot(p.x-c.home.x,p.z-c.home.z)<c.home.r&&Math.abs(p.y-c.y)<8);
          const tgt=c.target&&pl.find(p=>p.pid===c.target)||hear||intr||(np&&np.d<8?np.p:null);
          if(tgt){c.target=tgt.pid;c.state='hunt';const d=steer(c,tgt.x,tgt.z,S_.speed,dt);if(d<1.6&&c.cool<=0){c.cool=1.6+Math.random()*0.8;damagePlayer(tgt.pid,S_.dmg,'creature');sfx(0.12,900,2,0.06)}
            if(Math.hypot(tgt.x-c.home.x,tgt.z-c.home.z)>45){c.target=null}}
          else{c.state='idle';const a=c.ph*0.8+c.id.length;steer(c,c.home.x+Math.cos(a)*3,c.home.z+Math.sin(a)*3,S_.speed*0.3,dt)}}
        c.y=floorAt(c.x,c.z,c.y+1);break}
      case'wyrm':{
        let tgt=null;for(const p of pl){if(p.dead)continue;sample(p.x,p.z,TS3);const d=Math.hypot(p.x-c.x,p.z-c.z);if(TS3.dune>0.25&&p.noise>=0.6&&d<75&&p.y>groundHeight(p.x,p.z)-2){tgt=p;break}}
        if(c.emerge>0){c.emerge-=dt;c.state='lunge';if(c.emerge<1.2&&!c.bit&&c.lungeAt){const p=pl.find(p=>p.pid===c.lungeAt);if(p&&Math.hypot(p.x-c.x,p.z-c.z)<5){damagePlayer(p.pid,S_.dmg,'creature');c.bit=true}}if(c.emerge<=0){c.cool=8}}
        else if(tgt&&c.cool<=0){c.state='hunt';const d=steer(c,tgt.x,tgt.z,S_.speed,dt);if(d<5){c.emerge=2.4;c.bit=false;c.lungeAt=tgt.pid;c.yaw=Math.atan2(tgt.x-c.x,tgt.z-c.z);puff(c.x,groundHeight(c.x,c.z),c.z,5);SFX.boom(0.35)}}
        else{c.state='roam';if(Math.hypot(c.x-c.home.x,c.z-c.home.z)>c.home.r)steer(c,c.home.x,c.home.z,S_.speed*0.4,dt);else{const a=c.ph*0.05;c.vx=Math.cos(a)*2;c.vz=Math.sin(a)*2}}
        c.y=groundHeight(c.x,c.z);break}
      case'hopper':{
        const run=pl.find(p=>!p.dead&&p.noise>=0.6&&Math.hypot(p.x-c.x,p.z-c.z)<14&&Math.abs(p.y-c.y)<6);
        if(c.fear>0||run){c.state='flee';const f=run||(np&&np.p);if(f)flee(c,f.x,f.z,S_.speed*1.4,dt);c.fear=Math.max(0,c.fear-dt)}
        else if(np&&np.d<9&&np.d>2.2){c.state='curious';steer(c,np.p.x,np.p.z,S_.speed*0.35,dt)}
        else if(np&&np.d<=2.2){c.state='curious';c.vx*=0.85;c.vz*=0.85;c.yaw=lerpA(c.yaw,Math.atan2(np.p.x-c.x,np.p.z-c.z),damp(5,dt))}
        else{c.state='wander';if(!c.wp||c.t>c.wt){c.t=0;c.wt=2+Math.random()*4;const a=Math.random()*TAU,r=Math.random()*c.home.r;c.wp={x:c.home.x+Math.cos(a)*r,z:c.home.z+Math.sin(a)*r}}steer(c,c.wp.x,c.wp.z,S_.speed*0.45,dt)}
        break}
      case'strider':{
        if(c.fear>0||(np&&np.p.rover&&np.d<16&&np.p.noise>0.5)){c.state='flee';if(np)flee(c,np.p.x,np.p.z,S_.speed*3,dt);c.fear=Math.max(0,c.fear-dt)}
        else if(np&&np.d<10){c.state='curious';c.vx*=0.9;c.vz*=0.9;c.yaw=lerpA(c.yaw,Math.atan2(np.p.x-c.x,np.p.z-c.z),damp(1.5,dt))}
        else{c.state='graze';if(!c.wp||c.t>c.wt){c.t=0;c.wt=8+Math.random()*8;const a=Math.random()*TAU,r=Math.random()*c.home.r;c.wp={x:c.home.x+Math.cos(a)*r,z:c.home.z+Math.sin(a)*r}}steer(c,c.wp.x,c.wp.z,S_.speed*0.6,dt)}
        break}
      case'mite':{
        const fl=lightSources().find(s=>s.flare&&Math.hypot(s.x-c.x,s.z-c.z)<9);
        if(fl||c.hp<S_.hp*0.4){c.state='flee';flee(c,fl?fl.x:np?np.p.x:c.x,fl?fl.z:np?np.p.z:c.z,S_.speed,dt)}
        else{const tgt=c.target&&pl.find(p=>p.pid===c.target&&!p.dead&&!p.rover)||(np&&np.d<12&&!np.p.rover?np.p:null);
          if(tgt){c.target=tgt.pid;c.state='hunt';const d=steer(c,tgt.x,tgt.z,S_.speed,dt);if(d<1.1&&c.cool<=0){c.cool=1.3+Math.random()*0.7;damagePlayer(tgt.pid,S_.dmg,'creature');sfx(0.08,1400,2,0.04)}
            if(Math.hypot(tgt.x-c.home.x,tgt.z-c.home.z)>32)c.target=null}
          else{c.state='idle';const a=c.ph*0.9+c.id.length;steer(c,c.home.x+Math.cos(a)*2,c.home.z+Math.sin(a)*2,S_.speed*0.25,dt)}}
        break}
      case'ravager':{
        const tgt=c.target&&pl.find(p=>p.pid===c.target&&!p.dead)||(np&&np.d<(np.p.noise>0.5?55:32)?np.p:null);
        if(c.hp<S_.hp*0.3){c.state='flee';if(tgt)flee(c,tgt.x,tgt.z,S_.speed*1.6,dt);break}
        if(!tgt){c.target=null;c.state='roam';if(!c.wp||c.t>c.wt){c.t=0;c.wt=8+Math.random()*6;const a=Math.random()*TAU,r=Math.random()*c.home.r;c.wp={x:c.home.x+Math.cos(a)*r,z:c.home.z+Math.sin(a)*r}}steer(c,c.wp.x,c.wp.z,S_.speed*0.5,dt);break}
        c.target=tgt.pid;const d=Math.hypot(tgt.x-c.x,tgt.z-c.z);if(d>75){c.target=null;break}
        if(c.state==='charge'){c.chT-=dt;c.vx=Math.sin(c.yaw)*13;c.vz=Math.cos(c.yaw)*13;
          if(!c.hitDone&&d<2.9&&Math.abs(tgt.y-c.y)<3){c.hitDone=true;damagePlayer(tgt.pid,S_.dmg,'creature',{x:Math.sin(c.yaw)*9,z:Math.cos(c.yaw)*9,y:4});SFX.boom(0.25)}
          if(c.chT<=0||c.bonk){c.state='recover';c.recT=c.bonk?3.5:2.4;c.bonk=false}}
        else if(c.state==='recover'){c.vx*=0.88;c.vz*=0.88;c.recT-=dt;if(c.recT<=0)c.state='stalk'}
        else if(c.state==='windup'){c.vx*=0.8;c.vz*=0.8;c.yaw=lerpA(c.yaw,Math.atan2(tgt.x-c.x,tgt.z-c.z),damp(6,dt));c.wT-=dt;if(c.wT<=0){c.state='charge';c.chT=clamp(d/13+0.5,0.6,2.2);c.hitDone=false}}
        else{c.state='stalk';const dd=steer(c,tgt.x,tgt.z,S_.speed,dt);if(dd<26&&c.cool<=0){c.state='windup';c.wT=1.3;c.cool=5;puff(c.x,c.y,c.z,2.5);sfx(0.5,120,1,0.12,'lowpass')}}
        break}
      case'stalker':{
        const tgt=pl.find(p=>p.pid===c.target&&!p.dead)||np&&np.p;
        const fl=lightSources().find(s=>s.flare&&Math.hypot(s.x-c.x,s.z-c.z)<16);
        if(!tgt||fl||c.hp<S_.hp*0.3||ENV.day>0.5){c.state='flee';flee(c,fl?fl.x:tgt?tgt.x:c.x,fl?fl.z:tgt?tgt.z:c.z,S_.speed,dt);if(!tgt||Math.hypot(tgt.x-c.x,tgt.z-c.z)>220)removeCreature(c.id);break}
        const d=Math.hypot(tgt.x-c.x,tgt.z-c.z),group=pl.filter(p=>!p.dead&&Math.hypot(p.x-tgt.x,p.z-tgt.z)<15).length;
        const toMe=Math.atan2(c.x-tgt.x,c.z-tgt.z),facing=Math.abs(wrapA(toMe-tgt.yaw))<1.6,lit=litAt(tgt.x,tgt.y,tgt.z);
        const keep=group>1?45:lit?32:24;
        if(c.state==='strike'){const dd=steer(c,tgt.x,tgt.z,S_.speed*1.3,dt);if(dd<2.2&&c.cool<=0){damagePlayer(tgt.pid,S_.dmg,'creature');c.cool=6;c.state='retreat';sfx(0.3,500,1,0.1,'bandpass',0,150)}else if(facing&&dd>8)c.state='circle'}
        else if(c.state==='retreat'){flee(c,tgt.x,tgt.z,S_.speed,dt);if(d>keep)c.state='circle'}
        else{c.state='circle';const a=toMe+0.5*dt,tx=tgt.x+Math.sin(a)*keep,tz=tgt.z+Math.cos(a)*keep;steer(c,tx,tz,S_.speed*0.5,dt);if(!facing&&!lit&&group<2&&c.cool<=0&&d<keep+8)c.state='strike'}
        c.y=groundHeight(c.x,c.z);break}
    }
    c.x+=c.vx*dt;c.z+=c.vz*dt;
    if(S_.kind==='hostile'&&c.y>groundHeight(c.x,c.z)-3){const hb=nearestHabitat(c.x,c.z);if(hb){const d=Math.hypot(c.x-hb.x,c.z-hb.z);if(d<SAFE_R){const k=SAFE_R/(d||1);c.x=hb.x+(c.x-hb.x)*k;c.z=hb.z+(c.z-hb.z)*k;c.target=null;c.vx*=-0.5;c.vz*=-0.5;if(c.state==='hunt'||c.state==='strike'||c.state==='charge')c.state='roam'}}} // the base is off limits
    if(c.sp==='tharrak'||c.sp==='rockback'||c.sp==='hopper'||c.sp==='strider'||c.sp==='mite'||c.sp==='ravager')c.y=floorAt(c.x,c.z,c.y+1);
    // bodies don't walk through modules or boulders (a charging ravager stuns itself on them)
    if(c.sp!=='wyrm'&&c.sp!=='lumari'&&c.y>groundHeight(c.x,c.z)-2){const rr=CR_RAD[c.sp]||0.5;let hit=false;
      for(const b of blds){const d=BUILD[b.type];if(d.solid===false||b.progress<0.05||Math.abs(b.x-c.x)>d.r+rr+3||Math.abs(b.z-c.z)>d.r+rr+3)continue;if(pushField(c,b,rr,c.y,0.45))hit=true}
      if(collideRocks(c,rr,c.sp==='strider'||c.sp==='ravager'?1.2:0.45))hit=true;
      if(hit&&c.state==='charge'){c.bonk=true;c.stun=1.5;puff(c.x,c.y+1,c.z,2);SFX.boom(0.2)}}
    if(c.hp<=0&&!c.gone){c.gone=true;onDrivenOff(c)}
    if(c.gone&&Math.hypot(c.x-c.home.x,c.z-c.home.z)>40)removeCreature(c.id);
  }
}
function onDrivenOff(c){
  S.driven=S.driven||{};S.driven[c.id]=S.time;
  const drop={skitter:['chitin',1+Math.floor(Math.random()*2)],wyrm:['scale',2],stalker:['chitin',2],mite:Math.random()<0.65?['adrenal',1]:['chitin',1],ravager:['ironhide',1]}[c.sp];
  if(drop)spawnPickup(drop[0],drop[1],null,c.x,c.y+0.6,c.z);if(c.sp==='ravager')spawnPickup('scale',2,null,c.x+1,c.y+0.6,c.z);
  if(SPECIES[c.sp].kind==='hostile')toast(`The ${SPECIES[c.sp].name} retreats`,'good');
  c.fear=20;if(c.sp==='wyrm'){c.emerge=0;removeCreature(c.id)}
}
// a player waves: peaceful aliens nearby respond
function onPlayerWave(pos,pid){for(const c of creatures.values()){const d=Math.hypot(c.x-pos.x,c.z-pos.z);if(d>20)continue;
  if(c.sp==='tharrak'){c.waveBack=2.2;if(!(S.waved&&S.waved[c.id]===solNum())){S.waved=S.waved||{};S.waved[c.id]=solNum();S.rep.tharrak=Math.min(100,(S.rep.tharrak||0)+2)}}
  if(c.sp==='lumari'){c.pulse=2}}}
/* ---------- feeding friendly creatures (they leave a boost behind) ---------- */
function nearestFeedable(){let best=null,bd=1e9;for(const c of creatures.values()){const S_=SPECIES[c.sp];if(!S_.feed||c.gone||c.state==='flee')continue;const d=Math.hypot(c.x-P.pos.x,c.z-P.pos.z);if(d<(c.sp==='strider'?5.5:3)&&d<bd&&Math.abs(c.y-P.pos.y)<4){bd=d;best=c}}return best}
const fedRecently=c=>S.fed&&S.fed[c.id]&&S.time-S.fed[c.id]<SOL_H*0.5;
function feedHint(hints){if(P.mode!=='foot'||game.dialogue)return;const c=nearestFeedable();if(!c)return;const S_=SPECIES[c.sp];
  hints.unshift(fedRecently(c)?`The ${S_.name} looks full`:`<span class="key">F</span>Feed the ${S_.name} 1 ${ITEMS[S_.feed].name} (you have ${slotsCount(S.inv,S_.feed)})`)}
function feedPressF(){if(P.mode!=='foot'||game.dialogue)return false;const c=nearestFeedable();if(!c)return false;act({a:'feed',id:c.id});return true}
ACT.feed=(pid,a,predict,local,fail)=>{
  const c=creatures.get(a.id);if(!c||c.gone)return false;const S_=SPECIES[c.sp];if(!S_.feed)return false;
  const p=posOf(pid);if(!p||Math.hypot(p.x-c.x,p.z-c.z)>(c.sp==='strider'?6.5:4))return false;
  if(fedRecently(c))return fail(`This ${S_.name} isn’t hungry yet`);
  const inv=invOf(pid),sb=S.mode==='sandbox';if(!sb&&slotsCount(inv,S_.feed)<1)return fail(`You need 1 ${ITEMS[S_.feed].name} to feed it`);
  if(!sb)slotsTake(inv,S_.feed,1);
  if(!predict){S.fed=S.fed||{};S.fed[c.id]=S.time;const n=c.sp==='strider'?1+(Math.random()<0.5?1:0):1;
    spawnPickup(S_.drop,n,null,c.x+Math.sin(c.yaw)*1.2,c.y+(c.sp==='strider'?2.2:0.7),c.z+Math.cos(c.yaw)*1.2);c.fear=0;c.happy=3;
    if(local){toast(`The ${S_.name} gobbles it up and leaves something behind`,'good');sfx(0.3,900,2,0.05,'bandpass',0,1400)}
    if(net.role==='host')net.snapDirty=true}
  if(local)refreshInvUI();else netInvDirty(pid);
  return true;
};
/* ---------- combat ---------- */
const crPick=[];
function creatureUnderRay(maxD){
  crPick.length=0;for(const c of creatures.values())if(c.mesh.visible&&!c.gone)crPick.push(c.mesh);if(!crPick.length)return null;
  const hit=raycaster.intersectObjects(crPick,true)[0];if(!hit)return null;let o=hit.object;while(o&&!o.userData.crId)o=o.parent;const c=o&&creatures.get(o.userData.crId);
  if(!c||Math.hypot(c.x-P.pos.x,c.z-P.pos.z)>maxD)return null;return{cr:c,hit:hit.point};
}
function attackCreature(c,dmg,stun,cont,slot){if(cont)return;act({a:'hit',id:c.id,slot:slot!=null?slot:P.hot})}
ACT.hit=(pid,a,predict,local)=>{
  const c=creatures.get(a.id);if(!c||c.gone)return false;const inv=invOf(pid),s=inv&&inv[a.slot],tool=s&&ITEMS[s.id];
  if(!tool||!(tool.tool==='drill'||tool.tool==='weapon')||s.d<=0)return false;const p=posOf(pid);if(!p||Math.hypot(p.x-c.x,p.z-c.z)>7)return false;
  if(predict)return true;const rl=rateOf(pid);if(now-(rl.hit||0)<0.35)return false;rl.hit=now;
  const dmg=tool.tool==='weapon'?tool.dmg:tool.dmg*0.65;c.hp-=dmg;if(tool.stun)c.stun=tool.stun;s.d=Math.max(0,s.d-1);
  c.target=pid;emitSparks(_v1.set(c.x,c.y+c.h*0.5,c.z),8,'#ff9a6a');
  if(SPECIES[c.sp].kind==='peaceful'){c.fear=30;if(SPECIES[c.sp].sapient){const k=c.sp;S.rep[k]=Math.max(-100,(S.rep[k]||0)-25);if(typeof amem==='function')amem(k).hurt++;for(const o of creatures.values())if(o.sp===k)o.fear=40;
    if(local)crewSay('Geologist',`Stop! You’re hurting a ${SPECIES[k].name}. They won’t forget that.`)}}
  return true;
};
/* ---------- rendering & animation (host and guests) ---------- */
function animCreatures(dt){
  for(const c of creatures.values()){
    const g=c.mesh,P_=c.parts,sp=Math.hypot(c.vx,c.vz);c.ap=(c.ap||0)+dt*(2+sp*2.2);
    g.position.set(c.rx??c.x,c.ry??c.y,c.rz??c.z);g.rotation.y=c.ryaw??c.yaw;
    if(c.sp!=='wyrm'){const far=Math.hypot(g.position.x-camera.position.x,g.position.z-camera.position.z)>260;g.visible=!far;if(far)continue}
    c.ap2=(c.ap2||0)+dt*sp*1.3;
    if(c.sp==='tharrak'){P_.legs.forEach((l,i)=>l.rotation.x=Math.sin(c.ap+i*2.1)*0.35*Math.min(1,sp));P_.head.rotation.y=Math.sin(c.ph*0.4)*0.4;
      if(c.waveBack>0||c.state==='curious'&&c.talking){c.waveBack=Math.max(0,(c.waveBack||0)-dt);P_.armL.rotation.z=2.4+Math.sin(c.ph*9)*0.4}else P_.armL.rotation.z=lerp(P_.armL.rotation.z,0.1,damp(4,dt));
      P_.armR.rotation.x=c.gesture?Math.sin(c.ph*3)*0.8-1:Math.sin(c.ap)*0.2}
    else if(c.sp==='lumari'){const pulse=(c.pulse=Math.max(0,(c.pulse||0)-dt));P_.bellM.emissiveIntensity=1+Math.sin(c.ph*2.5)*0.4+pulse*1.5;P_.bell.scale.y=1+Math.sin(c.ph*2.5)*0.12;
      P_.tend.forEach((t,i)=>{t.rotation.x=Math.sin(c.ph*2+i)*0.3;t.rotation.z=Math.cos(c.ph*1.7+i)*0.3});const fear=c.state==='flee';P_.bellM.emissive.set(fear?'#ff6a5a':c.state==='guide'?'#ffe28a':'#3fd0b8')}
    else if(c.sp==='rockback'){const curl=c.state==='curl';P_.head.visible=!curl;P_.legs.forEach((l,i)=>{l.visible=!curl;l.rotation.x=Math.sin(c.ap+i*1.6)*0.3*Math.min(1,sp)});P_.sh.position.y=curl?0.55:0.8}
    else if(c.sp==='hopper'){const mv=Math.min(1,sp/1.2),hop=Math.abs(Math.sin(c.ap*1.6));P_.body.position.y=hop*0.4*mv+(c.state==='curious'?Math.abs(Math.sin(c.ph*3))*0.05:0);P_.legs.forEach(l=>l.rotation.x=-hop*0.9*mv);P_.body.rotation.x=-(hop-0.5)*0.3*mv}
    else if(c.sp==='strider'){const mv=Math.min(1,sp/1.2);P_.legs.forEach((l,i)=>{const ph=c.ap2+(i===0||i===3?0:Math.PI);l.rotation.x=Math.sin(ph)*0.32*mv;l.userData.kn.rotation.x=Math.max(0,-Math.cos(ph))*0.6*mv});
      P_.body.position.y=4.1+Math.abs(Math.cos(c.ap2))*0.12*mv;P_.neck.rotation.x=lerp(P_.neck.rotation.x,c.state==='curious'?0.75:c.state==='graze'&&sp<0.3?1.2:0.1,damp(1.5,dt));P_.head.rotation.y=Math.sin(c.ph*0.5)*0.4}
    else if(c.sp==='mite'){P_.legs.forEach((l,i)=>l.rotation.y=Math.sin(c.ap*4+i*1.3)*0.6*Math.min(1,sp+0.3));P_.claws.forEach((cl,i)=>cl.rotation.y=(i?-1:1)*(0.2+Math.abs(Math.sin(c.ph*(c.state==='hunt'?14:3)))*0.4))}
    else if(c.sp==='ravager'){const mv=Math.min(1,sp/3);P_.legs.forEach((l,i)=>l.rotation.x=Math.sin(c.ap2*(c.state==='charge'?0.7:1)+(i===0||i===3?0:Math.PI))*0.5*mv);
      const wind=c.state==='windup';P_.head.rotation.x=lerp(P_.head.rotation.x,wind||c.state==='charge'?0.45:c.state==='recover'?-0.2:0,damp(6,dt));
      P_.body.position.y=1.7+(wind?Math.sin(c.ph*30)*0.05:0)+(c.state==='recover'?-0.15:0);if(wind&&Math.random()<0.2)emitSparks(_v1.set(g.position.x,g.position.y+0.2,g.position.z),2,'#c4744a')}
    else if(c.sp==='skitter'){P_.legs.forEach((l,i)=>l.rotation.y=Math.sin(c.ap*3+i*1.2)*0.5*Math.min(1,sp+0.2))}
    else if(c.sp==='stalker'){P_.legs.forEach((l,i)=>l.rotation.x=Math.sin(c.ap*1.3+(i%2?Math.PI:0)+(i>1?Math.PI/2:0))*0.5*Math.min(1,sp/3));P_.neck.rotation.x=c.state==='circle'?0.4:0;g.position.y-=c.state==='circle'?0.3:0}
    else if(c.sp==='wyrm'){const e=c.emerge>0?Math.sin(clamp(1-(c.emerge/2.4),0,1)*Math.PI):0;g.visible=e>0.02;
      P_.segs.forEach((s,i)=>{const k=i/P_.segs.length;s.position.set(0,-6+e*(9*(1-k))+Math.sin(k*3)*e*2,-i*1.1+e*2)});
      const rp=P_.ripple;rp.visible=!g.visible||e<0.3;rp.position.set(g.position.x,g.position.y+0.15,g.position.z);rp.rotation.z+=dt;rp.material.opacity=0.35+0.2*Math.sin(c.ph*6);if(Math.random()<0.2&&Math.hypot(c.vx,c.vz)>1)emitSparks(_v1.set(g.position.x,g.position.y+0.2,g.position.z),1,'#c4744a')}
  }
}
/* ---------- host → guest creature sync ---------- */
const ST_CODE=['idle','wander','curious','wary','shelter','flee','drift','guide','graze','curl','hunt','roam','lunge','circle','strike','retreat','stunned','charge','windup','recover','stalk'];
function creatureSnap(){const out=[];for(const c of creatures.values()){let near=false;for(const g of net.conns.values())if(g.pos&&Math.hypot(g.pos.x-c.x,g.pos.z-c.z)<480){near=true;break}if(!near)continue;
  out.push([c.id,c.sp,+c.x.toFixed(2),+c.y.toFixed(2),+c.z.toFixed(2),+c.yaw.toFixed(2),Math.max(0,ST_CODE.indexOf(c.state)),Math.round(c.hp),+(c.emerge||0).toFixed(2),+Math.hypot(c.vx,c.vz).toFixed(2)])}return{t:'cr',l:out}}
function onCreatureSnap(d){
  if(!Array.isArray(d.l))return;const seen=new Set();
  for(const a of d.l){if(!Array.isArray(a)||!SPECIES[a[1]]||typeof a[0]!=='string')continue;seen.add(a[0]);let c=creatures.get(a[0]);if(!c)c=addCreature(a[0],a[1],a[2],a[3],a[4]);
    c.tx=a[2];c.ty=a[3];c.tz=a[4];c.tyaw=a[5];c.state=ST_CODE[a[6]]||'idle';c.hp=a[7];c.emerge=a[8];const v=a[9];c.vx=Math.sin(a[5])*v;c.vz=Math.cos(a[5])*v}
  for(const id of[...creatures.keys()])if(!seen.has(id))removeCreature(id);
}
function guestCreatureTick(dt){for(const c of creatures.values()){if(c.tx==null)continue;const k=damp(8,dt);c.x=lerp(c.x,c.tx,k);c.y=lerp(c.y,c.ty,k);c.z=lerp(c.z,c.tz,k);c.yaw=lerpA(c.yaw,c.tyaw,k);c.ph+=dt}}
function aliensTick(dt){
  if(!S)return;
  if(net.role==='guest')guestCreatureTick(dt);
  else{if((game.spawnT=(game.spawnT||0)-dt)<=0){game.spawnT=1.5;spawnTick()}crTick(dt);if(net.role==='host'&&(game.crT=(game.crT||0)-dt)<=0){game.crT=0.16;netSend(creatureSnap())}}
  animCreatures(dt);
}
