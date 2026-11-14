'use strict';
/* ---------- city growth: futuristic structures, tiers, colonists ---------- */
const TIERS=[{name:'Outpost',pop:0},{name:'Settlement',pop:8},{name:'Town',pop:20},{name:'City',pop:50},{name:'Metropolis',pop:120}];
function colonyTier(){let t=0;for(let i=0;i<TIERS.length;i++)if(S.crew>=TIERS[i].pop)t=i;return t}
Object.assign(BUILD,{
  atmo:{name:'Atmosphere Processor',cost:110,r:5,power:6,prio:9,res:'atmo',desc:'Pulls CO₂ and water vapour straight from the air. +48 kg O₂ and +48 L water per sol.'},
  dome:{name:'Geodesic Dome',cost:120,r:11,power:3,prio:10,res:'domes',house:10,desc:'A glass park under a dome. Homes for 10 colonists, +30 kg food/sol.'},
  tower:{name:'Arcology Tower',cost:180,r:6,power:5,prio:10,res:'arcology',house:24,desc:'A shielded skyscraper: homes for 24 colonists and hydroponic floors (+22 kg food/sol).'},
  fusion:{name:'Fusion Reactor',cost:160,r:6.5,power:0,res:'fusion',desc:'Compact fusion: 60 kW, day and night, in any weather.'},
  spaceport:{name:'Spaceport',cost:220,r:15,power:4,prio:5,res:'spaceport',solid:false,desc:'Starships bring colonists from Earth much faster.'},
});
BUILD.habitat.house=4;
BUILD_ORDER.splice(BUILD_ORDER.indexOf('beacon'),0,'atmo','dome','tower','fusion','spaceport');
while(BKEYS.length<BUILD_ORDER.length)BKEYS.push('');
RESEARCH.push(
  {id:'atmo',name:'Atmospheric Harvesting',branch:'Future',cost:45,req:()=>S.research.has('moxie2'),reqText:'Needs Improved Electrolysis',desc:'Unlocks the Atmosphere Processor.'},
  {id:'domes',name:'Geodesic Domes',branch:'Future',cost:50,req:()=>colonyTier()>=1||S.mode==='sandbox',reqText:'Grow to a Settlement (8 colonists)',desc:'Unlocks the Geodesic Dome.'},
  {id:'fusion',name:'Compact Fusion',branch:'Future',cost:70,req:()=>S.research.has('reactor'),reqText:'Needs Fission Surface Power',desc:'Unlocks the Fusion Reactor.'},
  {id:'arcology',name:'Arcology Towers',branch:'Future',cost:90,req:()=>S.research.has('domes')&&(colonyTier()>=2||S.mode==='sandbox'),reqText:'Domes, and grow to a Town (20)',desc:'Unlocks the Arcology Tower.'},
  {id:'spaceport',name:'Interplanetary Spaceport',branch:'Future',cost:80,req:()=>S.research.has('landingpad')&&(colonyTier()>=2||S.mode==='sandbox'),reqText:'Landing Pad, and grow to a Town (20)',desc:'Unlocks the Spaceport.'});
function housing(){let n=0;for(const b of blds)if(b.progress>=1&&BUILD[b.type].house)n+=BUILD[b.type].house;return n}
function cityTick(h){
  const s=S;
  // meteors
  if(s.nextMeteor===undefined)s.nextMeteor=s.time+SOL_H*1.8;
  if(s.time>=s.nextMeteor){s.nextMeteor=s.time+SOL_H*(1.6+Math.random()*2.4);if(!game.resting)spawnMeteor()}
  // immigration once the campaign's crew chapter is reached (always in sandbox)
  if((s.mode==='sandbox'||s.chapter>=5)&&count('comms')){
    const room=housing()-s.crew;
    if(room>0&&s.time>=(s.nextImmig||0)&&s.res.food>10&&s.res.o2>8&&s.res.water>15&&s.rates.food>-0.2){
      const n=Math.min(room,2+count('pad')*2+count('spaceport')*10);
      spawnLander(true,n);s.nextImmig=s.time+SOL_H*(count('spaceport')?0.35:0.8);
    }
  }
  // tier ups
  const t=colonyTier();
  if(t>(s.tier||0)){s.tier=t;const T=TIERS[t],rp=20*t;storeItems({tiplate:4*t,circuit:3*t,glass:6*t,brick:8*t});s.res.rp+=rp;
    card(`Your colony is now a ${T.name}!`,`Population ${s.crew} · reward: titanium plates, circuits, glass and bricks in colony storage, +${rp} RP`,
      t<TIERS.length-1?`Next milestone: a ${TIERS[t+1].name} at ${TIERS[t+1].pop} colonists. New futuristic tech may be ready in the Research tab.`:'Humanity has a true city on Mars. Keep exploring: the planet is endless.','#ffd36f');SFX.radio()}
}
function cityGuide(){
  const t=colonyTier();if(t>=TIERS.length-1)return null;
  const next=TIERS[t+1];
  if(!count('comms'))return buildGuide('comms','Build a Comms Antenna so colonists can come');
  for(const id of['domes','arcology','spaceport','atmo','fusion']){const r=RESEARCH.find(r=>r.id===id);if(!S.research.has(id)&&(!r.req||r.req())&&S.res.rp>=r.cost)return researchStep(id)}
  if(housing()<=S.crew){const t2=S.research.has('arcology')?'tower':S.research.has('domes')?'dome':'habitat';
    if(t2==='habitat'&&!S.research.has('hab2'))return researchStep('hab2');
    return buildGuide(t2,`Build homes for new colonists: a ${BUILD[t2].name}`)}
  if(S.rates.food<0)return buildGuide(S.research.has('domes')?'dome':'greenhouse','Grow more food for the colony');
  return{text:`Grow to a ${next.name}: ${S.crew}/${next.pop} colonists (ships arrive with room and supplies)`};
}
/* models */
function mkDome(){
  const g=new THREE.Group();
  g.add(cy(11,11.4,0.7,32,OFF,0,0.35,0));g.add(cy(11.05,11.05,0.3,32,ORANGE,0,0.75,0));
  g.add(cy(10.4,10.4,0.2,32,'#6f8a4c',0,0.85,0));
  const glass=new THREE.MeshStandardMaterial({color:'#d6eef4',transparent:true,opacity:0.16,roughness:0.05,metalness:0.2,side:THREE.DoubleSide,depthWrite:false});
  const shell=new THREE.Mesh(new THREE.SphereGeometry(10.6,32,16,0,TAU,0,Math.PI/2),glass);shell.position.y=0.8;g.add(shell);
  const eg=new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(10.65,2)),ep=eg.attributes.position.array,keep=[];
  for(let i=0;i<ep.length;i+=6)if(Math.max(ep[i+1],ep[i+4])>0.1)keep.push(...ep.slice(i,i+6));
  const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(keep,3));
  const fr=new THREE.LineSegments(fg,new THREE.LineBasicMaterial({color:'#efe9e0',transparent:true,opacity:0.75}));fr.position.y=0.8;g.add(fr);
  const r=mulberry(77);
  for(let i=0;i<10;i++){const a=r()*TAU,d=2+r()*7,x=Math.cos(a)*d,z=Math.sin(a)*d;g.add(cy(0.15,0.2,1.6,6,'#6b4a3a',x,1.7,z));g.add(sp(1.1+r()*0.7,i%3?'#4caf50':'#3d9a52',x,3.1+r()*0.6,z,10,8))}
  g.add(cy(2.6,2.6,0.08,20,mat('#4f9dff',{roughness:0.1,metalness:0.3}),-3,0.96,3));
  const lampM=nightMat('#fff3d0','#ffe2a8',2.6,0.2);
  for(let i=0;i<6;i++){const a=i/6*TAU;g.add(cy(0.06,0.06,2.2,5,GREY,Math.cos(a)*8.5,1.9,Math.sin(a)*8.5));g.add(sp(0.2,lampM,Math.cos(a)*8.5,3.1,Math.sin(a)*8.5,8,6))}
  const bl=sp(0.25,glow('#ff3b30',2.5),0,11.6,0,6,4);g.add(bl);g.add(cy(0.08,0.08,1.2,5,OFF,0,11,0));
  g.userData={blink:[bl]};return g;
}
function mkTower(){
  const g=new THREE.Group();g.add(cy(6,6.4,2,16,OFF,0,1,0));
  const win=nightMat('#3a4560','#ffd9a0',1.1,0.06);let y=2;
  for(let i=0;i<9;i++){const r=4.6-i*0.22;g.add(cy(r,r+0.1,2.6,16,i%3===2?ORANGE:WHITE,0,y+1.3,0));
    const band=new THREE.Mesh(new THREE.CylinderGeometry(r+0.05,r+0.05,1.1,16,1,true),win);band.position.y=y+1.4;g.add(band);y+=2.8}
  g.add(cy(2.5,3.2,1.5,16,OFF,0,y+0.75,0));g.add(mesh(new THREE.ConeGeometry(0.5,6,8),OFF,0,y+4.5,0));
  const bl=sp(0.25,glow('#ff3b30',2.5),0,y+7.6,0,6,4);g.add(bl);
  g.userData={blink:[bl]};return g;
}
function mkFusion(){
  const g=new THREE.Group();g.add(cy(6.2,6.5,1.2,24,GREY,0,0.6,0));g.add(cy(1,1,5,16,OFF,0,3.5,0));
  const pm=new THREE.MeshStandardMaterial({color:'#7fe8ff',emissive:'#5fd8ff',emissiveIntensity:3.5});
  const plasma=new THREE.Mesh(new THREE.TorusGeometry(3.6,0.32,10,56),pm);plasma.rotation.x=Math.PI/2;plasma.position.y=3;g.add(plasma);
  for(let i=0;i<8;i++){const a=i/8*TAU,c=mesh(rbox(0.6,2.2,2.2,0.3),'#c9ccd1',Math.cos(a)*3.6,3,Math.sin(a)*3.6);c.rotation.y=-a;g.add(c)}
  const spin=new THREE.Group();spin.position.y=3;g.add(spin);
  for(let i=0;i<6;i++){const a=i/6*TAU;spin.add(sp(0.22,pm,Math.cos(a)*3.6,0,Math.sin(a)*3.6,8,6))}
  g.add(cy(1.2,1.7,5,16,WHITE,4.6,2.5,-3.2));g.add(cy(1.2,1.7,5,16,WHITE,-4.6,2.5,-3.2));
  g.userData={spin:[{o:spin,s:3}]};return g;
}
function mkAtmo(){
  const g=new THREE.Group();g.add(bx(6,1.6,6,OFF,0,0.8,0));g.add(bx(6.05,0.25,6.05,'#5fb7e3',0,1.4,0));
  g.add(cy(1.3,2,11,16,WHITE,0,6.5,0));g.add(cy(1.45,1.45,0.5,16,ORANGE,0,10.5,0));
  g.add(cy(1.3,1.3,0.7,16,GREY,2,1.95,2));const spin=new THREE.Group();spin.position.set(2,2.35,2);g.add(spin);
  for(let i=0;i<4;i++){const b=bx(1.1,0.05,0.3,DARK,0,0,0);b.rotation.y=i/4*Math.PI;spin.add(b)}
  g.add(cy(0.8,0.8,3,12,'#c9ccd1',-2.2,2.6,-2.2));g.add(sp(0.8,'#c9ccd1',-2.2,4.1,-2.2,12,8));
  g.userData={spin:[{o:spin,s:9}]};return g;
}
function mkSpaceport(){
  const g=new THREE.Group();g.add(cy(15,15.5,0.5,40,'#5d5753',0,0.25,0));
  g.add(rot(mesh(new THREE.RingGeometry(9.6,10.4,48),mat('#ffcf4a',{side:THREE.DoubleSide}),0,0.53,0),'x',-Math.PI/2));
  const bls=[];for(let i=0;i<12;i++){const a=i/12*TAU,b=sp(0.2,glow('#6fe0c8',2.2),Math.cos(a)*14.4,0.6,Math.sin(a)*14.4,6,4);g.add(b);bls.push(b)}
  const win=nightMat('#3a4560','#bfe6ff',2.2,0.1);
  g.add(cy(1.2,1.6,9,12,OFF,10,4.5,10));g.add(cy(2.3,1.9,1.6,12,win,10,9.8,10));g.add(cy(2.4,2.4,0.3,12,ORANGE,10,10.7,10));
  const steel=mat('#c8ccd2',{metalness:0.75,roughness:0.28});
  g.add(cy(1.8,1.8,14,20,steel,-7,8.6,-6));g.add(mesh(new THREE.ConeGeometry(1.8,4.5,20),steel,-7,17.85,-6));
  for(let i=0;i<3;i++){const a=i/3*TAU,f=bx(0.15,3,1.6,DARK,-7+Math.cos(a)*1.9,2.8,-6+Math.sin(a)*1.9);f.rotation.y=-a;g.add(f)}
  g.add(cy(1.85,1.85,0.8,20,win,-7,13.5,-6));
  g.userData={blink:bls};return g;
}
Object.assign(MAKERS,{dome:mkDome,tower:mkTower,fusion:mkFusion,atmo:mkAtmo,spaceport:mkSpaceport});
/* colonists walking around the city */
const npcs=[],npcGroup=new THREE.Group();scene.add(npcGroup);
const NPC_SUITS=['#efebe4','#f2c94c','#4f86f7','#e8553b','#3cb37a','#8a6cd8','#ff8fb1'];
function mkNPC(i){
  const g=new THREE.Group(),suit=NPC_SUITS[i%NPC_SUITS.length];
  g.add(mesh(shared('npcBody',()=>new THREE.CapsuleGeometry(0.28,0.6,4,10)),suit,0,0.75,0));
  g.add(mesh(shared('npcHead',()=>new THREE.SphereGeometry(0.3,12,10)),suit,0,1.45,0));
  const v=mesh(shared('npcVisor',()=>new THREE.SphereGeometry(0.24,12,10)),mat('#2b2f5a',{roughness:0.1,metalness:0.4}),0,1.46,0.12);v.scale.set(1,0.75,0.75);g.add(v);
  g.add(mesh(rbox(0.4,0.5,0.22),'#c9c3bb',0,0.85,-0.3));
  g.traverse(c=>{if(c.isMesh)c.castShadow=false});
  return{g,x:0,z:0,tx:0,tz:0,wait:Math.random()*5,ph:Math.random()*6};
}
function updateNPCs(dt){
  const want=Math.min(28,Math.max(0,S.crew-4)),hm=home(),f=focusPos();
  while(npcs.length<want){const n=mkNPC(npcs.length);n.x=n.tx=hm.x+(Math.random()-0.5)*16;n.z=n.tz=hm.z+(Math.random()-0.5)*16;npcGroup.add(n.g);npcs.push(n)}
  while(npcs.length>want){const n=npcs.pop();npcGroup.remove(n.g)}
  const near=!cave.active&&Math.hypot(f.x-hm.x,f.z-hm.z)<350;npcGroup.visible=near;if(!near||!npcs.length)return;
  const t=tod(),night=t>20.5||t<6,spots=blds.filter(b=>b.progress>=1&&b.type!=='beacon'&&Math.hypot(b.x-hm.x,b.z-hm.z)<180);
  for(const n of npcs){
    n.g.visible=!night;if(night)continue;
    const dx=n.tx-n.x,dz=n.tz-n.z,d=Math.hypot(dx,dz);
    if(d<0.6){n.wait-=dt;if(n.wait<=0&&spots.length){const b=spots[Math.floor(Math.random()*spots.length)],a=Math.random()*TAU,r=BUILD[b.type].r+1.5+Math.random()*2.5;n.tx=b.x+Math.cos(a)*r;n.tz=b.z+Math.sin(a)*r;n.wait=2+Math.random()*7}}
    else{n.x+=dx/d*1.5*dt;n.z+=dz/d*1.5*dt;n.g.rotation.y=Math.atan2(dx,dz);n.ph+=dt*7}
    n.g.position.set(n.x,groundHeight(n.x,n.z)+(d>=0.6?Math.abs(Math.sin(n.ph))*0.12:0),n.z);
  }
}

