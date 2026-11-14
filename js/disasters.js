'use strict';
/* =========================================================
   DISASTERS & ENVIRONMENTAL SIMULATION
   Storms and solar particle events are scheduled in sim.js; quakes, cold
   snaps and meteors here. The host simulates, guests get 'ev' events + snaps.
   ========================================================= */
POI.meteorite={name:'Iron Meteorite',color:'#cfd6e6',rp:22,sample:true,hidden:true,
  scan:'A dense, metallic boulder with a pitted, shiny surface: an iron-nickel meteorite. Rovers have found several on Mars, such as Opportunity’s “Heat Shield Rock” and Curiosity’s “Lebanon”.',
  lab:'Iron and nickel with interlocking crystal patterns that only form when metal cools over millions of years: a fragment of a shattered asteroid core.'};
const quake={active:false,t:0,dur:0,mag:0,epi:{x:0,z:0},warn:0};
/* ---------- helpers used elsewhere ---------- */
function windVec(){const a=S?(S.storm.dir!=null?S.storm.dir:0.7):0.7;return{x:Math.cos(a),z:Math.sin(a)}}
function sheltered(p){return cave.depth>2||P.mode==='rover'||!!nearHab(p,4)}
function coldFactor(){return 1+(S&&S.cold?S.cold.level*0.5:0)}
function envPush(p,dt){
  if(typeof devilPushPlayer==='function')devilPushPlayer(p,dt);
  // storm wind comes in gusts: strong enough to stagger you and push you off course
  const st=S.storm.level;if(st>0.3&&!sheltered(p.pos||p)){const w=windVec(),gust=1+0.8*Math.sin(now*1.3+Math.sin(now*0.37)*3),k=(st-0.3)*7.5*gust;p.vel.x+=w.x*k*dt;p.vel.z+=w.z*k*dt}
  if(quake.active&&p.onGround){const k=quakeLocal();p.vel.x+=(Math.random()-0.5)*k*24*dt;p.vel.z+=(Math.random()-0.5)*k*24*dt;if(Math.random()<k*dt*2.5){p.vel.y+=1.6}}
}
function quakeLocal(){if(!quake.active)return 0;const f=focusPos(),d=Math.hypot(f.x-quake.epi.x,f.z-quake.epi.z);const env=Math.sin(Math.PI*clamp(quake.t/quake.dur,0,1));return clamp((quake.mag-2)/3,0.15,1)*env*clamp(1-d/3000,0.3,1)}
function nextDisaster(){if(!S)return null;const c=[{type:'storm',at:S.nextStorm},{type:'solar',at:S.nextSPE},{type:'quake',at:S.nextQuake||1e9},{type:'cold',at:S.nextCold||1e9}].filter(e=>e.at>S.time).sort((a,b)=>a.at-b.at)[0];return c?{type:c.type,in:c.at-S.time}:null}
function forecastText(){
  if(S.storm.active)return`A ${S.storm.int>0.85?'severe':'moderate'} dust storm is on us. Stow the solar arrays from the colony panel and stay sheltered.`;
  const n=nextDisaster();if(!n)return'Clear skies.';const h=n.in;
  const when=h<4?`within ${Math.max(1,Math.round(h))} hours`:h<SOL_H?'later today':`in about ${(h/SOL_H).toFixed(1)} sols`;
  if(n.type==='storm')return count('weather')?`Weather station shows a dust storm forming, arriving ${when}. Charge the batteries.`:'Without a weather station I can’t see storms coming. Build one!';
  if(n.type==='solar')return count('comms')?`Space-weather relay predicts a solar particle event ${when}.`:'No comms link, so no space-weather alerts.';
  if(n.type==='cold')return count('weather')?`A cold front arrives ${when}. Heating will draw more power.`:'Temperatures look stable, as far as I can tell.';
  return'Skies look clear for now.';
}
/* ---------- meteors ---------- */
const meteors=[],metGeo=new THREE.SphereGeometry(1,12,8),trailGeo=new THREE.ConeGeometry(1,1,12,1,true);trailGeo.translate(0,0.5,0);
function spawnMeteor(x,z,id,small){
  const f=focusPos();
  if(x===undefined){const nearBase=Math.random()<0.25,c=nearBase?home():f,a=Math.random()*TAU,d=nearBase?25+Math.random()*40:90+Math.random()*260;
    x=c.x+Math.cos(a)*d;z=c.z+Math.sin(a)*d;id='m'+Math.floor(S.time*100)+Math.floor(Math.random()*99)}
  const gy=groundHeight(x,z),a=Math.random()*TAU;
  const start=new THREE.Vector3(x+Math.cos(a)*700,gy+600,z+Math.sin(a)*700),end=new THREE.Vector3(x,gy,z);
  const head=new THREE.Mesh(metGeo,new THREE.MeshStandardMaterial({color:'#ffd2a0',emissive:'#ffb070',emissiveIntensity:4}));head.scale.setScalar(small?1:2.2);
  const trail=new THREE.Mesh(trailGeo,new THREE.MeshBasicMaterial({color:'#ff9a50',transparent:true,opacity:0.75,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  trail.quaternion.setFromUnitVectors(_v2.set(0,1,0),_v1.subVectors(start,end).normalize());trail.scale.set(small?0.8:1.8,small?40:80,small?0.8:1.8);
  const g=new THREE.Group();g.add(head,trail);g.position.copy(start);scene.add(g);
  // a pulsing warning ring marks where it will hit, so you can run
  const ring=new THREE.Mesh(new THREE.RingGeometry(small?5:9,small?6:10.5,40),new THREE.MeshBasicMaterial({color:'#ff4a3d',transparent:true,opacity:0.6,side:THREE.DoubleSide,depthWrite:false,fog:false}));
  ring.rotation.x=-Math.PI/2;ring.position.set(x,gy+0.3,z);scene.add(ring);
  meteors.push({g,start,end,t:0,id,x,z,small:!!small,ring});
  if(net.role==='host')netSend({t:'meteor',x,z,id,big:small?1:0});
}
function updateMeteors(dt){
  for(let i=meteors.length-1;i>=0;i--){
    const m=meteors[i];m.t+=dt;const k=Math.min(1,m.t/3.2);m.g.position.lerpVectors(m.start,m.end,k);
    if(m.ring){m.ring.material.opacity=0.35+0.35*Math.sin(m.t*14);m.ring.scale.setScalar(1.15-k*0.3)}
    if(k<1)continue;
    meteors.splice(i,1);scene.remove(m.g);m.g.traverse(c=>c.material&&c.material.dispose());if(m.ring){scene.remove(m.ring);m.ring.material.dispose();m.ring.geometry.dispose()}
    meteorShock(m);
    const f=focusPos(),d=Math.hypot(m.x-f.x,m.z-f.z),gy=groundHeight(m.x,m.z),sz=m.small?0.5:1;
    puff(m.x,gy,m.z,26*sz);puffs[puffs.length-1].m.material.color.set('#ffb070');puff(m.x,gy+2,m.z,16*sz);
    for(let j=0;j<(m.small?1:4);j++)digAt(m.x+(j%2?2.5:-2.5)*sz,m.z+(j<2?2.5:-2.5)*sz,2.2*sz);rebuildDirtyChunks();
    if(cave.depth<2){SFX.boom(clamp(1-d/700,0.15,1)*sz);game.shake=Math.max(game.shake||0,clamp(1-d/450,0,1)*1.3*sz);gradePass.uniforms.flash.value=0.3*clamp(1-d/600,0,1)*sz}
    if(net.role!=='guest'){
      for(const b of blds)if(!b.fault&&Math.hypot(b.x-m.x,b.z-m.z)<BUILD[b.type].r+10*sz&&b.type!=='beacon'){b.fault={kind:'jam',label:'Impact damage'};addFaultMarker(b)}
      for(const p of playerList())if(!p.dead&&Math.hypot(p.x-m.x,p.z-m.z)<8*sz)damagePlayer(p.pid,40*sz,'rock');
      if(!m.small){S.extraPOIs=S.extraPOIs||[];if(!S.extraPOIs.some(p=>p.id===m.id))S.extraPOIs.push({id:m.id,type:'meteorite',x:m.x,z:m.z});
        S.extraDeps=S.extraDeps||[];S.extraDeps.push({id:'x'+m.id,type:'nickel',x:m.x+3,z:m.z-2,max:5});if(S.extraDeps.length>40)S.extraDeps.shift()}
      net.snapDirty=true}
    if(!m.small){S.discovered.add(m.id);game.poiT=0;toast(`Meteor impact ${fmtDist(d)} to the ${compassWord(m.x-f.x,m.z-f.z)}! The crater exposed nickel-iron.`,'warn')}
  }
  if(game.shake>0||quake.active){const s=(game.shake||0)+quakeLocal()*1.7;camera.position.x+=(Math.random()-0.5)*s;camera.position.y+=(Math.random()-0.5)*s;game.shake=Math.max(0,(game.shake||0)-dt*1.4)}
}
// the blast wave: anyone close is thrown back (and knocked flat if very close)
function meteorShock(m){
  if(game.dead||cave.depth>=2)return;const sz=m.small?0.6:1,R0=32*sz;
  if(P.mode==='foot'){const pd=Math.hypot(P.pos.x-m.x,P.pos.z-m.z);if(pd>=R0)return;const k=1-pd/R0,dx=(P.pos.x-m.x)/(pd||1),dz=(P.pos.z-m.z)/(pd||1);
    P.vel.x+=dx*17*k;P.vel.z+=dz*17*k;P.vel.y=Math.max(P.vel.y,3+6*k);P.onGround=false;
    if(k>0.35&&!P.ragdoll){startRagdoll(4+12*k,null);P.ragdoll.dmg=6+24*k;toast('The blast wave throws you off your feet!','bad')}else hurt(3+10*k,'rock');}
  else{const rd=Math.hypot(R.pos.x-m.x,R.pos.z-m.z);if(rd<R0){const k=1-rd/R0;R.vy=Math.max(R.vy,4+6*k);R.air=true;R.speed*=0.5;hurt(4+12*k,'rock');toast('The blast wave lifts the rover!','bad')}}
}
// boulders shaken loose from slopes during a quake
function surfaceRock(x,z){const gy=groundHeight(x,z),m=mesh(rockGeo,mat('#5a3a2c',{flatShading:true}),x,gy+18,z);m.scale.setScalar(0.6+Math.random()*0.7);scene.add(m);falling.push({m,vy:-3,x,z,fy:gy});sfx(0.4,240,0.8,0.06,'lowpass')}
/* ---------- marsquakes ---------- */
function startQuake(mag,epi,dur){
  quake.active=true;quake.t=0;quake.dur=dur;quake.mag=mag;quake.epi=epi;game.shake=0;
  radio(crewName('Engineer'),`Marsquake! Magnitude ${mag.toFixed(1)}. Brace yourself!`,'crew');SFX.boom(0.6);
  if(net.role!=='guest'){
    const f=focusPos();
    // structures nearer the epicentre may crack
    for(const b of blds){if(b.fault||b.progress<1||!FAULTS[b.type])continue;const d=Math.hypot(b.x-epi.x,b.z-epi.z),p=clamp((mag-2.5)/3,0,1)*clamp(1-d/2500,0.2,1)*0.35;
      if(Math.random()<p){b.fault={...FAULTS[b.type][0],label:'Quake damage: '+FAULTS[b.type][0].label.toLowerCase()};addFaultMarker(b)}}
    // a fissure opens and exposes titanium
    const a=Math.random()*TAU,cx=f.x+Math.cos(a)*(60+Math.random()*120),cz=f.z+Math.sin(a)*(60+Math.random()*120),dir=Math.random()*TAU;
    if(Math.hypot(cx-home().x,cz-home().z)>60){for(let i=-6;i<=6;i++)digAt(cx+Math.cos(dir)*i*3,cz+Math.sin(dir)*i*3,1.4);rebuildDirtyChunks();
      S.extraDeps=S.extraDeps||[];for(let k=0;k<2;k++)S.extraDeps.push({id:'xq'+Math.floor(S.time*100)+k,type:'titanium',x:cx+Math.cos(dir)*(k?8:-8),z:cz+Math.sin(dir)*(k?8:-8),max:6});
      S.extraPOIs=S.extraPOIs||[];setTimeout(()=>toast(`The quake tore open a fissure ${compassWord(cx-f.x,cz-f.z)} of you, exposing titanium veins`,'good'),dur*1000)}
    for(const c of creatures.values()){if(c.sp==='skitter'){const pl=playerList();const t=nearestPlayer(c,pl,60);if(t)c.target=t.p.pid}if(c.sp==='tharrak'||c.sp==='rockback')c.fear=Math.max(c.fear,6)}
    if(net.role==='host')netSend({t:'ev',k:'quake',mag,epi,dur});
  }
}
function quakeTick(dt){
  if(!quake.active)return;quake.t+=dt;
  const k=quakeLocal();
  // rockfall in caves, boulders tumbling down slopes on the surface
  if(cave.depth>3&&Math.random()<dt*k*1.6)rockfall(P.pos.x+(Math.random()-0.5)*8,P.pos.z+(Math.random()-0.5)*8);
  if(cave.depth<2&&k>0.25&&Math.random()<dt*k*1.2){sample(P.pos.x,P.pos.z,TS3);const steep=Math.abs(groundHeight(P.pos.x+6,P.pos.z)-groundHeight(P.pos.x-6,P.pos.z))+Math.abs(groundHeight(P.pos.x,P.pos.z+6)-groundHeight(P.pos.x,P.pos.z-6));
    if(TS3.mtn>0.08||steep>4)surfaceRock(P.pos.x+(Math.random()-0.5)*14,P.pos.z+(Math.random()-0.5)*14)}
  // strong shaking can throw you to the ground
  if(k>0.45&&P.mode==='foot'&&!P.ragdoll&&P.onGround&&!game.dead&&Math.random()<dt*k*0.35){P.vel.x+=(Math.random()-0.5)*6;P.vel.z+=(Math.random()-0.5)*6;P.vel.y=3;P.onGround=false;startRagdoll(5,null);P.ragdoll.dmg=4;toast('The ground heaves and throws you down!','bad')}
  if(quake.t>=quake.dur){quake.active=false;radio(crewName('Engineer'),'Shaking has stopped. Check the colony for damage.','crew')}
}
const falling=[];
function rockfall(x,z){const c=caveQuery(x,z,P.pos.y);if(!c)return;const y=c.s.y+c.s.rr*0.65,m=mesh(rockGeo,mat('#3a2a24',{flatShading:true}),x,y,z);m.scale.setScalar(0.5+Math.random()*0.6);scene.add(m);falling.push({m,vy:0,x,z,fy:c.s.fy});sfx(0.4,300,0.8,0.08,'lowpass')}
function updateFalling(dt){for(let i=falling.length-1;i>=0;i--){const r=falling[i];r.vy-=G*dt;r.m.position.y+=r.vy*dt;r.m.rotation.x+=dt*3;
  if(r.m.position.y<=r.fy+0.3){if(Math.hypot(P.pos.x-r.x,P.pos.z-r.z)<1.6&&Math.abs(P.pos.y-r.fy)<2.5)hurt(18,'rock');puff(r.x,r.fy,r.z,1.5);r.t=(r.t||0)+dt;if(r.t>6){scene.remove(r.m);falling.splice(i,1)}}}}
/* ---------- scheduler & storm consequences (host) ---------- */
function disasterTick(dt,h){
  if(!S)return;
  if(net.role!=='guest'){
    if(S.nextQuake==null)S.nextQuake=S.time+wxGap(SOL_H*(2+Math.random()*2.5));
    if(S.nextCold==null)S.nextCold=S.time+wxGap(SOL_H*(2.5+Math.random()*3));
    if(S.nextShower==null)S.nextShower=S.time+wxGap(SOL_H*(3+Math.random()*3));
    // seismometer: P-waves arrive a few seconds early
    if(!quake.active&&S.time>=S.nextQuake-6*HPS&&!quake.warned){quake.warned=true;if(count('seismo')){toast('Seismometer: P-waves detected! Shaking in a few seconds','bad');beep(1200,0.1,'square',0.06);beep(1200,0.1,'square',0.06,0.2)}}
    if(!quake.active&&S.time>=S.nextQuake&&!game.resting){quake.warned=false;S.nextQuake=S.time+wxGap(SOL_H*(2+Math.random()*3));const f=focusPos(),a=Math.random()*TAU;
      startQuake(2.5+Math.random()*2.7,{x:f.x+Math.cos(a)*800,z:f.z+Math.sin(a)*800},8+Math.random()*10)}
    // cold snaps
    S.cold=S.cold||{level:0,until:0};
    if(S.time>=S.nextCold&&!S.cold.on){S.cold.on=true;S.cold.until=S.time+6+Math.random()*8;S.nextCold=S.time+wxGap(SOL_H*(3+Math.random()*3));toast('A cold front is moving in: temperatures are dropping fast','warn');crewSay('Engineer','Cold snap! The heaters will pull extra power, and water lines may freeze. Keep the batteries topped up.')}
    if(S.cold.on){S.cold.level=Math.min(1,S.cold.level+h*0.4);if(S.time>=S.cold.until)S.cold.on=false;
      if(Math.random()<h*0.05){const d=blds.find(b=>b.type==='drill'&&!b.fault&&b.progress>=1);if(d){d.fault={kind:'jam',label:'Frozen water line'};addFaultMarker(d);toast('A drill’s water line has frozen','bad')}}}
    else S.cold.level=Math.max(0,S.cold.level-h*0.3);
    // meteor showers
    if(S.time>=S.nextShower&&!game.resting){S.nextShower=S.time+wxGap(SOL_H*(3+Math.random()*4));toast('Meteor shower! Watch the sky, and stay clear of impacts','warn');const f=focusPos();
      for(let i=0;i<6;i++)setTimeout(()=>{if(!S)return;const p=focusPos(),near=i===2||i===4,r=near?8+Math.random()*18:(Math.random()-0.5)*500,a=Math.random()*TAU; // some land close: watch for the red rings
        spawnMeteor(near?p.x+Math.cos(a)*r:f.x+r,near?p.z+Math.sin(a)*r:f.z+(Math.random()-0.5)*500,'ms'+Math.floor(Math.random()*1e6),true)},i*2500+Math.random()*1500)}
    // storm consequences
    const st=S.storm.level;
    if(S.storm.active&&S.storm.dir==null)S.storm.dir=Math.random()*TAU;if(!S.storm.active)S.storm.dir=null;
    if(st>0.7){
      if(!S.stowed&&Math.random()<h*st*0.25){const b=blds.find(b=>b.type==='solar'&&!b.fault&&b.progress>=1);if(b){b.fault={kind:'jam',label:'Storm-damaged panel'};addFaultMarker(b);toast('The storm damaged a solar array. Stow the panels!','bad')}}
      if(Math.random()<dt*st*0.12){const tall=blds.filter(b=>['comms','weather','tower','atmo'].includes(b.type)&&b.progress>=1);const b=tall[Math.floor(Math.random()*tall.length)];
        if(b){staticArc(b.x,b.y+8,b.z);if(net.role==='host')netSend({t:'ev',k:'arc',x:b.x,y:b.y+8,z:b.z});if(!b.fault&&Math.random()<0.3){b.fault={kind:'jam',label:'Static discharge damage'};addFaultMarker(b)}}}
    }
  }
  // exposure for you (each player handles their own suit)
  const st=S.storm.level,exposed=P.mode==='foot'&&!sheltered(P.pos)&&!game.dead;
  // dust storm: grit shreds the suit, clogs the oxygen filters, and big gusts knock you flat
  if(st>0.5&&exposed){if((game.abrT=(game.abrT||0)-dt)<=0){game.abrT=1;hurt((st-0.45)*4.5,'storm')}P.o2-=dt*st*0.25;
    crewOnce('dustout'+solNum(),'Engineer','You’re out in the storm! The grit is shredding your suit and clogging the O₂ filters. Get to the habitat, the rover or a cave.',2);
    if(st>0.8&&!P.ragdoll&&P.onGround&&Math.random()<dt*(st-0.7)*0.5){const w=windVec();P.vel.x+=w.x*9;P.vel.z+=w.z*9;P.vel.y=3;P.onGround=false;startRagdoll(9,null);P.ragdoll.dmg=6;toast('A gust knocks you off your feet!','bad')}}
  // solar particle event: radiation hurts anywhere without cover (the rover blocks some of it)
  const speOn=S.spe&&S.spe.active,shelter=cave.depth>2||!!nearHab(P.pos,4),radEx=speOn&&!shelter&&!game.dead?(P.mode==='rover'?0.4:1):0;
  if(radEx>0){P.bat=Math.max(0,P.bat-dt*1.6*radEx);S.dose+=dt*0.01*radEx;if((game.radT=(game.radT||0)-dt)<=0){game.radT=1;hurt(1.5*radEx,'radiation')}$('#hud').classList.add('glitch');
    crewOnce('speout'+solNum(),'Medical Specialist','Solar particle event! Radiation is spiking. Get underground or into the habitat, now.',2)}else $('#hud').classList.remove('glitch');
  // cold snap: heaters drain the battery; once it's flat the cold bites
  const cl=S.cold?S.cold.level:0,coldEx=cl>0.2&&exposed;
  if(coldEx){P.bat=Math.max(0,P.bat-dt*0.8*cl);if(P.bat<=0&&(game.coldT=(game.coldT||0)-dt)<=0){game.coldT=1;hurt(2*cl,'cold')}
    crewOnce('coldout'+solNum(),'Engineer','It’s brutally cold out there. Your suit heaters are eating the battery. Bring Power Cells or head inside.',2)}
  // screen effects so you feel it
  const fx=$('#envfx');if(fx){const inRover=P.mode==='rover';const dust=cave.active?0:st<0.3?0:(st-0.3)/0.7*(exposed?1:inRover?0.45:0.15);
    fx.children[0].style.opacity=dust*0.9;fx.children[1].style.opacity=exposed?dust:dust*0.3;fx.children[2].style.opacity=coldEx?Math.min(0.9,cl*0.9):0;fx.children[3].style.opacity=radEx>0?0.55+0.35*radEx:0}
  quakeTick(dt);updateFalling(dt);
}
function staticArc(x,y,z){const pts=[];let px=x,py=y+30,pz=z;for(let i=0;i<9;i++){pts.push(new THREE.Vector3(px,py,pz));px+=(Math.random()-0.5)*4;py-=30/8;pz+=(Math.random()-0.5)*4}pts.push(new THREE.Vector3(x,y,z));
  const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#cfe6ff'}));scene.add(l);setTimeout(()=>scene.remove(l),180);
  const d=Math.hypot(x-P.pos.x,z-P.pos.z);if(d<400){sfx(0.35,2400,0.6,0.12*clamp(1-d/400,0.1,1),'highpass');gradePass.uniforms.flash.value=0.15*clamp(1-d/300,0,1)}}
/* ---------- sync ---------- */
function disasterSnap(){return{q:quake.active?{mag:quake.mag,epi:quake.epi,dur:quake.dur,t:quake.t}:null,cold:S.cold?S.cold.level:0,nq:S.nextQuake,nc:S.nextCold}}
function applyDisasterSnap(d){if(!d)return;S.cold=S.cold||{level:0};S.cold.level=num(d.cold,0,1);S.nextQuake=d.nq;S.nextCold=d.nc;
  if(d.q&&!quake.active){quake.active=true;quake.mag=d.q.mag;quake.epi=d.q.epi;quake.dur=d.q.dur;quake.t=d.q.t}}
function onWorldEvent(d){
  if(d.k==='hurt'){hurt(num(d.n,0,100),str(d.cause,16));if(isNum(d.kx)&&isNum(d.kz)&&P.mode==='foot'){P.vel.x+=clamp(d.kx,-14,14);P.vel.z+=clamp(d.kz,-14,14);P.vel.y=Math.max(P.vel.y,num(d.ky,0,8,0));P.onGround=false}}
  else if(d.k==='quake'&&isNum(d.mag)&&d.epi)startQuake(d.mag,{x:num(d.epi.x,-1e6,1e6),z:num(d.epi.z,-1e6,1e6)},num(d.dur,1,30,10));
  else if(d.k==='arc'&&isNum(d.x))staticArc(d.x,num(d.y,-5000,5000),num(d.z,-1e6,1e6));
}
