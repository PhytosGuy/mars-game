'use strict';

/* =========================================================
   UI: TOASTS, CARDS, HUD, COMPASS
   ========================================================= */
/* on touch screens, keyboard keys in hints become the on-screen button names (F → Interact) */
const TOUCH_KEYS={F:'Interact',Space:'Jump',B:'Build',M:'Map',Tab:'Menu',Enter:'Chat'};
function keyText(s){
  if(typeof s!=='string'||!document.body.classList.contains('touch')||!/F|key|Space|Tab/.test(s))return s;
  return s.replace(/Press (<span class="key">)/g,'Tap $1').replace(/<span class="key">([^<]+)<\/span>/g,(m,k)=>TOUCH_KEYS[k]?`<span class="key">${TOUCH_KEYS[k]}</span>`:m)
    .replace(/\[F\]/g,'[Interact]').replace(/\b(press|Press|tap|Tap) F\b/g,(m,v)=>(v[0]==='p'||v[0]==='t'?'tap':'Tap')+' Interact').replace(/\b(hold|Hold) F\b/g,'$1 Interact').replace(/\bF to\b/g,'Interact to')}
function toast(text,kind=''){
  if(game.state!=='play'&&game.state!=='intro')return;text=keyText(text);
  const c=$('#toasts');if([...c.children].some(e=>e.textContent===text&&!e.classList.contains('out')))return;
  const el=document.createElement('div');el.className='toast '+kind;el.textContent=text;c.appendChild(el);
  while(c.children.length>1)c.firstChild.remove();
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),700)},4000);
}
function card(title,sub,body,color='#6fe0c8'){
  S.log.unshift({title,sub,body,sol:solNum(),t:tod()});if(S.log.length>60)S.log.pop();
  if(game.state!=='play')return;
  const el=document.createElement('div');el.className='scard';
  el.innerHTML=keyText(`<h4><i style="background:${color}"></i>${title}</h4><div class="s">${sub}</div><p>${body}</p>`);
  el.onclick=()=>{if(document.body.classList.contains('touch')&&!el.classList.contains('open'))el.classList.add('open');else el.remove()};
  const c=$('#cards');c.appendChild(el);while(c.children.length>1)c.firstChild.remove();
  setTimeout(()=>{el.style.opacity=0;setTimeout(()=>el.remove(),700)},20000);
}
function fmtTime(){const t=tod(),h=Math.floor(t),m=Math.floor((t-h)*60);return pad2(h)+':'+pad2(m)}
const setHTML=(id,h)=>{const e=document.getElementById(id);h=keyText(h);if(e&&e.innerHTML!==h)e.innerHTML=h};
const setTxt=(id,v)=>{const e=document.getElementById(id);if(e&&e.textContent!==v)e.textContent=v};
function rateStr(r,unit){const v=r*SOL_H;return(v>=0?'+':'')+v.toFixed(1)+unit+'/sol'}

/* ---------- collapsible panels (remembered per browser) ---------- */
const UI=(()=>{try{return JSON.parse(localStorage.getItem('mlc-ui'))||{}}catch(e){return{}}})();
const isCollapsed=id=>UI[id]!==false;
function setCollapsed(id,c){UI[id]=c;$('#'+id).classList.toggle('collapsed',c);try{localStorage.setItem('mlc-ui',JSON.stringify(UI))}catch(e){}}
function applyUIState(){for(const id of['journal','status'])$('#'+id).classList.toggle('collapsed',isCollapsed(id))}
$('#journal').addEventListener('click',()=>setCollapsed('journal',!isCollapsed('journal')));
$('#s-vital').addEventListener('click',()=>setCollapsed('status',!isCollapsed('status')));
$('#s-main').addEventListener('click',()=>setCollapsed('status',!isCollapsed('status')));

function getAlerts(){
  const al=[];
  if(S.spe.active)al.push(['Solar particle event: take shelter','bad']);
  if(S.brownout)al.push(['Power shortage: some systems are off','bad']);
  for(const[k,n]of[['o2','Oxygen'],['water','Water'],['food','Food']]){const r=S.rates[k];if(r<0){const sl=S.res[k]/(-r*SOL_H);if(sl<1.5)al.push([`${n} runs out in ${sl.toFixed(1)} sols`,'bad'])}}
  const nf=blds.filter(b=>b.fault);if(nf.length)al.push([`${nf[0].fault.label} at ${BUILD[nf[0].type].name}${nf.length>1?` (+${nf.length-1} more)`:''}`,'bad']);
  if(S.storm.active)al.push(['Dust storm: solar output down '+Math.round(S.storm.level*75)+'%','']);
  else if(S.flags.stormWarned)al.push(['Dust storm on the way','']);
  if(R.battery/R.maxBat<0.15)al.push(['Rover battery low','']);
  const sol=blds.filter(b=>b.type==='solar');if(sol.length&&sol.reduce((a,b)=>a+b.dust,0)/sol.length>0.4)al.push(['Solar panels are dusty (clean with F)','']);
  return al;
}
function updateHUD(){
  setHTML('clock',`Sol ${solNum()} · ${fmtTime()}<span>${SITE.name}${S.mode==='sandbox'?' · sandbox':''}</span>`);
  // the single most important warning sits under the guide
  const al=getAlerts(),nb=al.filter(a=>a[1]==='bad').length;
  // vitals line
  const bar=(p,c)=>`<span class="mini"><i style="width:${clamp(p,0,100)}%;background:${c}"></i></span>`;
  const vb=(l,v,c)=>`<div class="vbar"><span>${l}</span><i><i style="width:${clamp(v,0,100)}%;background:${c}"></i></i></div>`;
  // suit integrity as diamond cells (20 points each), then oxygen and battery
  const mh=maxHP();
  const hpP=P.hp/mh*100;
  setHTML('vitals2',`<div class="hpbig${hpP<30?' low':''}"><span class="hpico">♥</span><div class="hpcol"><div class="hptop"><b>Health</b><em>${Math.ceil(P.hp)} / ${mh}</em></div><i><i style="width:${clamp(hpP,0,100)}%"></i></i></div></div>`+vb('Oxygen',P.o2,P.o2<25?'var(--bad)':'#7fd3ff')+vb('Battery',P.bat,P.bat<20?'var(--bad)':'#ffd34d')+(S.mode==='sandbox'?'':vb('Food',P.food,P.food<20?'var(--bad)':'#9fe07a')+vb('Water',P.water,P.water<20?'var(--bad)':'#6fb6ff'))+
    (renderCrew(),'')+`<div class="vbar col"><span>Colony O₂</span><em class="${S.rates.o2<0&&S.res.o2/(-S.rates.o2*SOL_H)<1.5?'neg':''}">${S.res.o2.toFixed(1)} kg</em></div>`);
  if(P.mode==='foot'){setHTML('s-vital',cave.active?`Underground · ${Math.round(cave.depth)} m deep`:esc(curRegion?curRegion.name:SITE.name))}
  else{const bp=R.battery/R.maxBat*100;setHTML('s-vital',`Rover ${bar(bp,bp<15?'var(--bad)':bp<35?'var(--warn)':'#ffd34d')} ${Math.round(bp)}% · ${Math.round(Math.hypot(R.vx||0,R.vz||0)*3.6)} km/h${R.air?' · airborne':R.upside?' · flipped':''}${R.cruise?' · cruise':''}${S.roverKW>0?' · charging':''}`)}
  const low=k=>S.rates[k]<0&&S.res[k]/(-S.rates[k]*SOL_H)<1.5?' class="neg"':'';
  const col=isCollapsed('status');
  setHTML('s-main',`<span><em>Power</em><b${S.brownout?' class="neg"':''}>${Math.round(S.battery/S.cap*100)}%</b></span><span><em>O₂</em><b${low('o2')}>${S.res.o2.toFixed(1)} kg</b></span>`+
    `<span><em>Water</em><b${low('water')}>${Math.round(S.res.water)} L</b></span><span><em>Food</em><b${low('food')}>${S.res.food.toFixed(1)} kg</b></span>`+
    `<span><em>Research</em><b>${Math.floor(S.res.rp)}</b></span>${nb?`<span class="neg">⚠ ${nb}</span>`:''}<span class="chev">▾</span>`);
  if(!col){
    const row=(a,b,c='')=>`<div class="row"><span>${a}</span><span class="${c}">${b}</span></div>`,pc=r=>r>=0?'pos':'neg';
    setHTML('s-more',row('Power',`${S.powerNet>=0?'+':''}${S.powerNet.toFixed(1)} kW · ${Math.round(S.battery)}/${Math.round(S.cap)} kWh`,pc(S.powerNet))+
      row('Oxygen',rateStr(S.rates.o2,' kg'),pc(S.rates.o2))+row('Water',rateStr(S.rates.water,' L'),pc(S.rates.water))+row('Food',rateStr(S.rates.food,' kg'),pc(S.rates.food))+
      (S.rates.mat>0?row('Materials',rateStr(S.rates.mat,'')):'')+
      row('Weather',`${Math.round(temperature())} °C · ${Math.round(pressure())} Pa · wind ${Math.round(windSpeed())} m/s`)+
      row('Radiation dose',S.dose.toFixed(2)+' mSv')+row('Sample cache',`${S.samples.length}/${sampleCap()}${S.labQueue.length?` · ${S.labQueue.length} in the lab`:''}`)+
      al.map(a=>`<div class="al ${a[1]}">${a[0]}</div>`).join(''));
  }
  // journal
  let head,items=[];
  const mi=S.mission;
  if(mi==null||!CHAPTERS[mi])head=S.mode==='sandbox'?`Pop. ${S.crew} · <b>${TIERS[colonyTier()].name}</b>`:'No mission tracked · <span class="key">Tab</span> Missions';
  else{const ch=CHAPTERS[mi];items=ch.objs.map(o=>[o.text,S.objDone.has(mi+':'+o.id)]);
    head=`<span class="mlabel">Mission</span> <b>${ch.title}</b> · ${items.filter(i=>i[1]).length}/${items.length}`}
  setHTML('j-head',head+(items.length?' <span class="chev">▾</span>':''));
  let cur=false;setHTML('j-list',items.map(([t,d])=>{const c=!d&&!cur;if(c)cur=true;return`<li class="${d?'done':c?'cur':''}">${t}</li>`}).join(''));
  // the next task, always shown big, with progress (it flashes when you finish one)
  {const nx=items.find(i=>!i[1]),dn=items.filter(i=>i[1]).length,el=$('#j-cur');
    game.nextTask=nx?{text:nx[0],dn,n:items.length}:null;if(el)el.classList.add('hidden');
    {const gEl=$('#guide');if(gEl&&game.jDone!==undefined&&dn>game.jDone){gEl.classList.remove('flash');void gEl.offsetWidth;gEl.classList.add('flash');beep(880,0.08);beep(1320,0.12,'sine',0.06,0.09)}game.jDone=dn}}
  // wardrobe hanger at base
  $('#hanger').classList.toggle('hidden',!(P.mode==='foot'&&nearHab(P.pos,12)&&$('#wardrobe').classList.contains('hidden')));
  if(invUI.open&&(game.colT=(game.colT||0)+1)%4===0){if(invUI.mtab==='inv')renderPlayerCard();else if(invUI.mtab==='colony'||invUI.mtab==='crew')renderColony()}
  // blaster reticle with its cooldown ring
  {const rt=$('#reticle'),gs=S.inv[P.hot],gun=gs&&ITEMS[gs.id]&&ITEMS[gs.id].tool==='gun'&&canUseWorld()&&!game.hudHidden;rt.classList.toggle('hidden',!gun);
   if(gun){const gd=ITEMS[gs.id],rd=clamp((now-(mine.gunT||-9))/gd.cool,0,1);rt.style.left=mouse.x+'px';rt.style.top=mouse.y+'px';$('#retfg').style.strokeDashoffset=106.8*(1-rd);rt.classList.toggle('ready',rd>=1)}}
}
function updateCompass(){
  const W=$('#compass').clientWidth,half=W/2,fov=Math.PI*0.62,f=focusPos();let h='';
  const xOf=b=>half+wrapA(cam.yaw-b)/(fov/2)*half;
  for(let deg=0;deg<360;deg+=15){const b=Math.PI-deg*Math.PI/180,x=xOf(b);if(x<-10||x>W+10)continue;
    if(deg%90===0)h+=`<div class="cd ${deg===0?'n':''}" style="left:${x}px">${'NESW'[deg/90]}</div>`;
    else h+=`<div class="tk" style="left:${x}px"></div>`}
  const items=[],hm=home();
  items.push([hm.x,hm.z,'#ffffff','Base']);
  if(P.mode==='foot')items.push([R.pos.x,R.pos.z,'#ff9147','Rover']);
  if(S.waypoint)items.push([S.waypoint.x,S.waypoint.z,'#6fe0c8','Waypoint']);
  for(const w of S.pwp||[])items.push([w.x,w.z,w.col,w.name]);
  for(const c of S.lostCaches)if(cacheMeshes.has(c.id))items.push([c.x,c.z,'#ff6b5e','Your body']);
  for(const b of blds)if(b.type==='beacon')items.push([b.x,b.z,'#ffb06a','']);
  for(const p of nearPOIs)if(S.discovered.has(p.id)&&!poiDone(p))items.push([p.x,p.z,POI[p.type].color,'']);
  for(const[x,z,c,l]of items){const d=Math.hypot(x-f.x,z-f.z);if(d<8)continue;const px=xOf(Math.atan2(x-f.x,z-f.z));if(px<0||px>W)continue;
    h+=`<div class="mk" style="left:${px}px;color:${c}"><i style="background:${c}"></i>${l}</div>`}
  const g=game.guide;
  if(g&&g.x!==undefined){const px=clamp(xOf(Math.atan2(g.x-f.x,g.z-f.z)),8,W-8);h+=`<div class="mk goal" style="left:${px}px">▼</div>`}
  $('#cmp').innerHTML=h;
}

/* =========================================================
   GUIDE: one arrow that always points at the next thing to do
   ========================================================= */
const ACCENT='#ff8a3d'; // guide arrow & beacon match the UI accent
const guideArrow=(()=>{
  const s=new THREE.Shape();s.moveTo(0,1.3);s.lineTo(1,0.15);s.lineTo(0.38,0.15);s.lineTo(0.38,-1);s.lineTo(-0.38,-1);s.lineTo(-0.38,0.15);s.lineTo(-1,0.15);s.closePath();
  const geo=new THREE.ShapeGeometry(s);geo.rotateX(Math.PI/2);
  const g=new THREE.Group();
  const back=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#2a1206',transparent:true,opacity:0.45,side:THREE.DoubleSide,depthTest:false,fog:false}));back.scale.setScalar(1.18);back.renderOrder=998;
  const front=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:ACCENT,transparent:true,opacity:0.95,side:THREE.DoubleSide,depthTest:false,fog:false}));front.renderOrder=999;front.position.y=0.01;
  g.add(back,front);g.visible=false;scene.add(g);return g;
})();
const guideBeacon=(()=>{
  const g=new THREE.Group();
  const cone=new THREE.Mesh(new THREE.ConeGeometry(0.55,1.1,16),new THREE.MeshBasicMaterial({color:ACCENT,fog:false}));cone.rotation.x=Math.PI;g.add(cone);
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.92,1,48),new THREE.MeshBasicMaterial({color:ACCENT,transparent:true,opacity:0.7,side:THREE.DoubleSide,depthWrite:false,fog:false}));ring.rotation.x=-Math.PI/2;g.add(ring);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,80,6,1,true),new THREE.MeshBasicMaterial({color:ACCENT,transparent:true,opacity:0.25,depthWrite:false,blending:THREE.AdditiveBlending}));beam.position.y=40;g.add(beam);
  g.userData={cone,ring,beam};g.visible=false;scene.add(g);return g;
})();
function placeReason(t,x,z,loose,auth){
  const def=BUILD[t];
  if(!loose&&!auth&&S.mode!=='sandbox'&&!haveAll(ME,BUILD_COSTS[t]||{},nearBase(ME,40)))return'Missing: '+missingText(ME,BUILD_COSTS[t]||{},nearBase(ME,40));
  let mn=1e9,mx=-1e9;for(let i=0;i<7;i++){const a=i/6*TAU,r=i?def.r*0.8:0,h=groundHeight(x+Math.cos(a)*r,z+Math.sin(a)*r);mn=Math.min(mn,h);mx=Math.max(mx,h)}
  if(mx-mn>(def.maxSlope||Math.max(1.6,def.r*0.55)))return'Ground too steep here';
  for(const b of blds)if(Math.hypot(b.x-x,b.z-z)<BUILD[b.type].r+def.r+(loose?2:0.4))return'Too close to '+BUILD[b.type].name;
  if(!loose&&!auth&&Math.hypot(R.pos.x-x,R.pos.z-z)<def.r+2.4)return'The rover is in the way';
  if(!loose&&!auth&&P.mode==='foot'&&Math.hypot(P.pos.x-x,P.pos.z-z)<def.r+0.6)return'You are standing there';
  if(staticLander&&Math.hypot(staticLander.position.x-x,staticLander.position.z-z)<def.r+(loose?5:2.6))return'Too close to the lander';
  if(loose&&Math.hypot(R.pos.x-x,R.pos.z-z)<def.r+4)return'Rover parked there';
  if(!def.remote){const gr=nearestGrid(x,z,null);if(!gr||gr.d>BUILD[gr.b.type].r+def.r+38)return'Out of grid range: build within ~40 m of the colony'}
  if(def.needsIce){sample(x,z,TS3);if(TS3.ice<0.35)return'No ice here: Ice Drills go in the ice biome (the frozen plain with blue crystal mountains)'}
  if(t==='reactor'&&blds.some(b=>b.type==='habitat'&&Math.hypot(b.x-x,b.z-z)<30))return'Must be at least 30 m from habitats';
  return'';
}
function spotFor(t){
  const c=game.spot;if(c&&c.t===t&&(now-c.at<4||!placeReason(t,c.x,c.z,true))){c.at=now;return c}
  const hm=home();let cx=hm.x,cz=hm.z,r0=BUILD.habitat.r+BUILD[t].r+3,r1=60;
  if(t==='drill'){const ice=storyPOIs.find(p=>p.type==='ice');cx=ice.x;cz=ice.z;r0=12;r1=70}
  else if(t==='weather'){cx=hm.x+264;cz=hm.z+198;r0=0;r1=80}
  else if(t==='reactor'){r0=34;r1=80}else if(t==='pad'){r0=26;r1=90}
  for(let r=r0;r<=r1;r+=3){const n=Math.max(1,Math.round(r*TAU/6));for(let i=0;i<n;i++){const a=i/n*TAU+r*0.37,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
    if(!placeReason(t,x,z,true)){game.spot={t,x,z,at:now,r:BUILD[t].r};return game.spot}}}
  return null;
}
function researchStep(id){const r=RESEARCH.find(r=>r.id===id);
  if(S.res.rp<r.cost)return poiGuide(`Earn research points for ${r.name} (${Math.floor(S.res.rp)}/${r.cost})`);
  return{text:`Research ${r.name} (<span class="key">Tab</span> menu → Research)`}}
function buildGuide(t,label){
  const d=BUILD[t];if(d.res&&!S.research.has(d.res))return researchStep(d.res);
  if(S.mode!=='sandbox'&&!haveAll(ME,BUILD_COSTS[t]||{},true))return gatherGuide(BUILD_COSTS[t]||{},d.name);
  const s=spotFor(t);if(!s)return{text:`Press <span class="key">B</span> and build a ${d.name}`};
  return{x:s.x,z:s.z,r:d.r,text:label||'Build a '+d.name+' here',near:`Press <span class="key">B</span>, pick ${d.name}, click the ring`,build:t};
}
// what to do when you can't afford something: points at the next step (craft or mine)
const MAKE_FROM={plate:['iron',2],glass:['silica',2],brick:['regolith',3],tiplate:['titanium',2]};
const FIND_HINT={alloy:'Find xeno alloy at ancient alien structures (Plasma Cutter needed)',resonite:'Resonant crystals grow in deep caves where the Lumari live',chitin:'Skitters drop chitin when driven off; they nest in caves',
  scale:'Dune Wyrms shed scales when driven off; they hunt in the dunes',nickel:'Nickel-iron comes from meteorite impact sites',crystal:'Selenite crystals grow inside caves',ice:'Look for frosty, ice-rich ground'};
function nearestDeposit(type){const f=focusPos();let best=null,bd=1e9;
  const look=d=>{if(d.type!==type||depUnits(d.id)<=0)return;const dd=Math.hypot(d.x-f.x,d.z-f.z);if(dd<bd){bd=dd;best=d}};
  FIXED_DEPS.forEach(look);(S.extraDeps||[]).forEach(look);
  const cx=Math.floor(f.x/CHUNK),cz=Math.floor(f.z/CHUNK);for(let i=-4;i<=4;i++)for(let j=-4;j<=4;j++)chunkDepDescs(cx+i,cz+j).forEach(look);
  return best}
function gatherGuide(cost,forName){
  const have=id=>slotsCount(S.inv,id)+slotsCount(S.storage,id);
  for(const id in cost){const need=cost[id];if(have(id)>=need)continue;const missing=need-have(id);
    const mk=MAKE_FROM[id];
    if(id==='circuit'){if(have('plate')>=1&&have('glass')>=1)return{text:`Craft Circuit Boards at the habitat (press <span class="key">I</span>) for the ${forName}`};
      return gatherGuide({plate:missing,glass:missing},forName)}
    if(mk){const raw=mk[0],per=mk[1];
      if(have(raw)>=per)return nearBase(ME)?{text:`Press <span class="key">I</span> and craft ${ITEMS[id].name} (${have(id)}/${need})`}:{x:home().x,z:home().z,r:8,text:`Take your ${ITEMS[raw].name} back to base to craft ${ITEMS[id].name}`,near:`Press <span class="key">I</span> to craft`};
      if(raw==='regolith')return{text:`Select your drill and hold <span class="key">left mouse</span> on the ground to dig regolith (${have(raw)}/${per*missing})`};
      const d=nearestDeposit(raw);
      if(d)return{x:d.x,z:d.z,r:2,text:`Mine ${ITEMS[raw].name} for ${ITEMS[id].name} (${have(raw)}/${per*missing})`,near:`Select your drill (<span class="key">1</span>) and hold <span class="key">left mouse</span> on the deposit`};
      return{text:`Explore to find ${ITEMS[raw].name} deposits`}}
    if(FIND_HINT[id])return{text:FIND_HINT[id]+` (${have(id)}/${need})`};
    return{text:`You need ${missing} more ${ITEMS[id].name}`};
  }
  return null;
}function poiGuide(text,needSample){
  const f=focusPos();let best=null,bd=1e9;
  for(const p of nearPOIs){if(poiDone(p)||(POI[p.type].hidden&&!S.discovered.has(p.id)))continue;if(needSample&&(!POI[p.type].sample||S.sampled.has(p.id)))continue;
    const d=Math.hypot(p.x-f.x,p.z-f.z)*(S.discovered.has(p.id)?1:1.6);if(d<bd){bd=d;best=p}}
  if(!best)return{text:'Explore further out to find new sites'};
  const scanned=S.scanned.has(best.id);
  return{x:best.x,z:best.z,r:7.2,text,near:scanned?'Press <span class="key">F</span> to collect the sample':'Hold <span class="key">F</span> to scan it'};
}
function labGuide(text){const lab=blds.find(b=>b.type==='lab'&&b.progress>=1);if(!lab)return buildGuide('lab','Build a Science Lab to analyse samples');
  return{x:lab.x,z:lab.z,r:BUILD.lab.r+2,text,near:'Handing over samples…'}}
function storyGuide(id,text){
  const p=storyPOIs.find(p=>p.id===id);if(!p)return poiGuide(text);
  if(S.samples.some(s=>s.id===id))return labGuide('Take the sample to the lab');
  if(S.sampled.has(id)||(S.scanned.has(id)&&!POI[p.type].sample))return{text:'Waiting for lab results…'};
  return{x:p.x,z:p.z,r:7.2,text,near:S.scanned.has(id)?'Press <span class="key">F</span> to collect the sample':'Hold <span class="key">F</span> to scan it'};
}
const GUIDES={
  rover:()=>({x:R.pos.x,z:R.pos.z,r:3,text:'Walk over to the rover',near:'Press <span class="key">E</span> to get in'}),
  hab:()=>{const a=airlockPos(home());return{x:a.x,z:a.z,r:1.6,text:'Go to the habitat door',near:'Press <span class="key">F</span> for a systems check'}},
  solar:()=>buildGuide('solar',`Build ${Math.max(1,5-count('solar'))} more Solar Array${5-count('solar')>1?'s':''}`),
  comms:()=>buildGuide('comms','Build a Comms Antenna'),
  moxie:()=>buildGuide('moxie','Build an Oxygen Unit'),
  ice:()=>storyGuide('s_ice','Go to the ice biome: scan the ice signature'),
  drill:()=>buildGuide('drill','Build the Ice Drill in the ice biome'),
  gh:()=>buildGuide('greenhouse','Build a Greenhouse'),
  pos:()=>S.brownout?buildGuide('solar','Add Solar Arrays: power is short'):S.rates.o2<=0?buildGuide('moxie','Build another Oxygen Unit'):buildGuide('drill','Build another Ice Drill'),
  lab:()=>buildGuide('lab','Build a Science Lab'),
  samples:()=>S.samples.length&&(S.samples.length>=sampleCap()||count('lab'))?labGuide(`Bring ${S.samples.length} sample${S.samples.length>1?'s':''} to the lab`):poiGuide(`Collect rock samples (${S.analyzed.length+S.labQueue.length+S.samples.length}/3)`,true),
  wx:()=>buildGuide('weather','Drive out and build a Weather Station here'),
  drive:()=>{const g=poiGuide(`Drive and explore: ${Math.max(0,(3000-S.stats.roverDist)/1000).toFixed(1)} km to go`);if(P.mode==='foot')return{x:R.pos.x,z:R.pos.z,r:3,text:'Get in the rover for a long drive',near:'Press <span class="key">E</span> to get in'};return g},
  tube:()=>storyGuide('s_lava','Investigate the lava tube'),
  org1:()=>storyGuide('s_org1','Sample the organic-bearing mudstone'),
  org2:()=>storyGuide('s_org2','Repeat the test at a second mudstone site'),
  pad:()=>buildGuide('pad','Build a Landing Pad'),
  hab2:()=>buildGuide('habitat','Build a second Habitat'),
  crew:()=>{const p=blds.find(b=>b.type==='pad');return p?{x:p.x,z:p.z,r:9,text:'Meet the crew lander at the pad'}:{text:'Wait for the crew lander'}},
  gh2:()=>buildGuide('greenhouse','Build a second Greenhouse'),
  r8:()=>{const r=RESEARCH.find(r=>!S.research.has(r.id)&&(!r.req||r.req()));return r?researchStep(r.id):{text:'Complete research projects'}},
  reactor:()=>buildGuide('reactor','Build the Fission Power Unit'),
  sustain:()=>({text:`Keep O₂, water and food in surplus for a full sol (${Math.round(S.sustain/SOL_H*100)}%)`}),
};
function computeGuide(){
  const f=focusPos(),foot=P.mode==='foot',dist=g=>Math.hypot(g.x-f.x,g.z-f.z);
  if(foot&&P.o2<30){const al=airlockPos(home()),dr=Math.hypot(R.pos.x-f.x,R.pos.z-f.z),dh=Math.hypot(al.x-f.x,al.z-f.z);
    return dr<dh?{x:R.pos.x,z:R.pos.z,r:3,text:'Low oxygen: get back to the rover',near:'Press <span class="key">E</span> to get in'}:{x:al.x,z:al.z,r:1.6,text:'Low oxygen: get back to the habitat'}}
  // dangerous weather: head for cover first
  if(foot&&!sheltered(P.pos)&&((S.spe&&S.spe.active)||S.storm.level>0.72)){const al=airlockPos(home()),dr=Math.hypot(R.pos.x-f.x,R.pos.z-f.z),dh=Math.hypot(al.x-f.x,al.z-f.z);const what=S.spe&&S.spe.active?'Solar storm':'Severe dust storm';
    return dr<dh?{x:R.pos.x,z:R.pos.z,r:3,text:what+'! Take cover in the rover',near:'Press <span class="key">E</span> to get in'}:{x:al.x,z:al.z,r:1.6,text:what+'! Get inside the habitat'}}
  const fb=blds.find(b=>b.fault);if(fb)return{x:fb.x,z:fb.z,r:BUILD[fb.type].r+2,text:`Fix the ${BUILD[fb.type].name}: ${fb.fault.label.toLowerCase()}`,near:'Hold <span class="key">F</span> to repair it'};
  for(const[k,t,fix]of[['o2','Oxygen','moxie'],['water','Water','drill'],['food','Food','greenhouse']]){const r=S.rates[k];if(r<0&&S.res[k]/(-r*SOL_H)<1){const g=buildGuide(fix,`Low on ${t.toLowerCase()}: build a ${BUILD[fix].name}`);if(g)return g}}
  if(S.brownout)return buildGuide('solar','Power is short: build a Solar Array');
  if(S.samples.length>=sampleCap()&&count('lab'))return labGuide('Sample cache full: take it to the lab');
  let g=null;
  const mi=S.mission;if(mi!=null&&CHAPTERS[mi]){const o=CHAPTERS[mi].objs.find(o=>!S.objDone.has(mi+':'+o.id));if(o){g=(GUIDES[o.id]||(()=>({text:o.text})))();if(g)g.task=true}}
  if(!g&&S.waypoint)g={x:S.waypoint.x,z:S.waypoint.z,r:3,text:'Head to your waypoint'};
  if(!g)return null; // nothing tracked: no arrow, just explore
  if(g.x!==undefined&&foot&&dist(g)>180&&Math.hypot(R.pos.x-f.x,R.pos.z-f.z)>6)g={x:R.pos.x,z:R.pos.z,r:3,text:'It’s far: take the rover',task:g.task,near:'Press <span class="key">E</span> to get in'};
  return g;
}
// ONE instruction on screen at a time. Priority: build mode > action in progress > nearby action > the current task.
const _swv=new THREE.Vector3();
function updateGuide(dt){
  const g=game.guide,f=focusPos(),has=g&&g.x!==undefined&&!game.hudHidden&&!build.active;
  let d=0,close=false,a=0;
  if(has){
    const dx=g.x-f.x,dz=g.z-f.z;a=Math.atan2(dx,dz);d=Math.hypot(dx,dz);
    const rv=P.mode==='rover',off=rv?8:2.8;close=d<(g.r||2)+(rv?6:2.5);
    guideArrow.visible=!close&&OPT.guide!==false;
    const ax=f.x+Math.sin(a)*off,az=f.z+Math.cos(a)*off;
    guideArrow.position.set(ax,floorAt(ax,az)+0.4+Math.sin(now*4)*0.1,az);guideArrow.rotation.y=a;guideArrow.scale.setScalar(rv?1.1:0.7);
    const gy=floorAt(g.x,g.z),u=guideBeacon.userData;guideBeacon.visible=OPT.guide!==false;guideBeacon.position.set(g.x,gy,g.z);
    const k=cave.active?1:clamp(d/40,1,8);u.cone.scale.setScalar(k);u.cone.position.y=2.6*k+Math.sin(now*3)*0.4*k;
    u.ring.scale.setScalar(g.r||2);u.ring.position.y=0.3;u.ring.material.opacity=0.5+0.3*Math.sin(now*4);u.beam.visible=d>40&&!cave.active;
  }else guideArrow.visible=guideBeacon.visible=false;
  let text='',showArrow=false,dist='',cls='',task=false;
  if(build.active){text=build.line;cls='build'}
  else if(game.busy){text=game.busy}
  else if(vac.mode||vac.msg){text=esc(vac.msg||'Working…')}
  else if(game.dialogue){text=''}
  else if(game.prompt){text=game.prompt}
  else if(g){
    if(close&&g.near)text=g.near;
    else{text=g.text;if(has){showArrow=true;dist=fmtDist(d)}}
    task=!!(g.task&&game.nextTask);
  }
  // one box at the top: the next task's label and progress sit around the instruction for it
  const gEl=$('#guide'),fl=gEl.classList.contains('flash');gEl.className=(text?'':'none ')+cls+(task?' task':'')+(fl?' flash':'');
  if(task){const nt=game.nextTask;setTxt('g-label',`Next task · ${nt.dn+1} of ${nt.n}`);$('#g-bar').firstChild.style.width=(nt.n?nt.dn/nt.n*100:0)+'%'}
  $('#g-arrow').style.display=showArrow?'':'none';
  if(showArrow)$('#g-arrow').style.transform=`rotate(${wrapA(cam.yaw-a)}rad)`;
  setHTML('g-text',text);setTxt('g-dist',dist);drawMinimap(dt);
  // stamina wheel beside the astronaut (only when it isn't full)
  const sw=$('#stamwheel');if(P.mode==='foot'&&P.stam<99.5&&!game.hudHidden){_swv.set(P.pos.x,P.pos.y+1.4,P.pos.z).project(camera);sw.style.left=((_swv.x*0.5+0.5)*innerWidth+46)+'px';sw.style.top=((-_swv.y*0.5+0.5)*innerHeight-22)+'px';
    sw.classList.add('show');const fg=$('#stamfg');fg.style.strokeDashoffset=106.8*(1-P.stam/100);fg.style.stroke=P.stam<25?'#ff6b5e':P.climbing?'#ffd25e':'#8fe39a'}else sw.classList.remove('show');
}

/* =========================================================
   WARDROBE (at base)
   ========================================================= */
let LOOK=(()=>{try{return Object.assign({},LOOK_DEFAULT,JSON.parse(localStorage.getItem('mlc-look'))||{})}catch(e){return{...LOOK_DEFAULT}}})();
const WOPTS=[['suit','Suit',['#efebe4','#f2c94c','#4f86f7','#e8553b','#3cb37a','#8a6cd8','#ff8fb1','#3a3a40']],
  ['accent','Stripes and gloves',['#ff7a2e','#6fe0c8','#ffd34d','#e8553b','#4f86f7','#ffffff','#2e2e33']],
  ['visor','Visor',['#2b2f5a','#c9a227','#1e5c4a','#7a1e2b','#111111','#6fa8ff']],
  ['pack','Backpack',['#c9c3bb','#efebe4','#ff7a2e','#4f86f7','#3a3a40','#3cb37a']],
  ['boots','Boots and belt',['#8d8781','#3a3532','#efebe4','#a5623f','#4f86f7']],
  ['rover','Rover paint',['#efebe4','#ffd34d','#e8553b','#4f86f7','#3cb37a','#3a3a40','#ff8fb1']]];
function applyLook(){dressModel(astro,LOOK);setOutfit(astro,!!(typeof P!=='undefined'&&P.inside));rover.userData.paint.color.set(LOOK.rover);syncLampLook()}
function syncLampLook(){}
function renderWardrobe(){
  $('#w-body').innerHTML=WOPTS.map(([k,l,cols])=>`<div class="wrow"><div class="sub">${l}</div><div class="sw">${cols.map(c=>`<button data-k="${k}" data-v="${c}" style="background:${c}" class="${LOOK[k]===c?'on':''}" title="${c}"></button>`).join('')}</div></div>`).join('')+
    `<div class="wrow"><div class="sub">Extras</div><div class="opt"><button data-t="antenna" class="${LOOK.antenna?'on':''}">Helmet antenna</button><button data-t="lamp" class="${LOOK.lamp?'on':''}">Helmet lamp</button></div></div>`;
}
function openWardrobe(){if(typeof openCreator==='function'){closePanels();openCreator();return}
  closePanels();$('#wardrobe').classList.remove('hidden');game.wardrobe={yaw:cam.yaw,pitch:cam.pitch,zoom:cam.zoom};
  const hb=nearHab(P.pos,14)||home();P.yaw=Math.atan2(P.pos.x-hb.x,P.pos.z-hb.z);astro.rotation.set(0,P.yaw,0,'YXZ');
  cam.yaw=P.yaw+Math.PI+0.35;cam.pitch=0.12;cam.zoom=0.42;renderWardrobe();
}
function closeWardrobe(){
  if(!game.wardrobe)return;$('#wardrobe').classList.add('hidden');const w=game.wardrobe;cam.yaw=w.yaw;cam.pitch=w.pitch;cam.zoom=w.zoom;game.wardrobe=null;
  try{localStorage.setItem('mlc-look',JSON.stringify(LOOK))}catch(e){}
}
$('#hanger').addEventListener('click',openWardrobe);
$('#w-done').addEventListener('click',closeWardrobe);
$('#w-reset').addEventListener('click',()=>{LOOK={...LOOK_DEFAULT};applyLook();renderWardrobe()});
$('#wardrobe').addEventListener('click',e=>{
  const s=e.target.closest('[data-k]'),t=e.target.closest('[data-t]');
  if(s){LOOK[s.dataset.k]=s.dataset.v;applyLook();renderWardrobe();beep(900,0.04)}
  if(t){LOOK[t.dataset.t]=!LOOK[t.dataset.t];applyLook();renderWardrobe();beep(900,0.04)}
  if(e.target.closest('[data-close]'))closeWardrobe();
});
applyLook();
/* ---------- minimap (top-left): heading-up, terrain around you plus everything nearby ---------- */
const MM={R:210,N:72,cx:1e9,cz:1e9,off:null,t:0,show:110};          // R covers the corners of the square map as it turns
// inside the square map, and pulling a point onto its edge
const mmIn=(px,py,h,m)=>Math.abs(px-h)<=h-m&&Math.abs(py-h)<=h-m;
const mmEdge=(px,py,h,m)=>{const dx=px-h,dy=py-h,k=Math.max(Math.abs(dx),Math.abs(dy))/(h-m);return k>1?[h+dx/k,h+dy/k]:[px,py]};
function mmTerrain(cx,cz){
  const N=MM.N,step=MM.R*2/N,hs=new Float32Array(N*N),cols=new Float32Array(N*N*3);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=cx-MM.R+(i+0.5)*step,z=cz-MM.R+(j+0.5)*step,k=j*N+i;sample(x,z,TS3);hs[k]=TS3.h;terrainColor(x,z,TS3,0.15,_col);cols[k*3]=_col.r;cols[k*3+1]=_col.g;cols[k*3+2]=_col.b}
  const off=MM.off||(MM.off=document.createElement('canvas'));off.width=off.height=N;const x=off.getContext('2d'),img=x.createImageData(N,N);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i,dx=hs[j*N+Math.min(N-1,i+1)]-hs[j*N+Math.max(0,i-1)],dz=hs[Math.min(N-1,j+1)*N+i]-hs[Math.max(0,j-1)*N+i],sh=clamp(1+(-dx-dz)*0.04,0.5,1.45);
    img.data[k*4]=Math.pow(cols[k*3],1/2.2)*255*sh;img.data[k*4+1]=Math.pow(cols[k*3+1],1/2.2)*255*sh;img.data[k*4+2]=Math.pow(cols[k*3+2],1/2.2)*255*sh;img.data[k*4+3]=255}
  x.putImageData(img,0,0);MM.cx=cx;MM.cz=cz;
}
function drawMinimap(dt){
  const cv=$('#mmc');if(!cv||!S||game.hudHidden)return;if((MM.t-=dt)>0)return;MM.t=0.05;
  const c=cv.getContext('2d'),W=cv.width,h=W/2,f=focusPos(),s=h/MM.show,cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);
  const toS=(x,z)=>{const dx=x-f.x,dz=z-f.z;return[h+(dx*cy-dz*sy)*s,h-(dx*sy+dz*cy)*s]};
  c.setTransform(1,0,0,1,0,0);
  const lbl=$('#mmlabel');
  if(P.inside||cave.active){c.fillStyle=P.inside?'#3b2f28':'#1a110d';c.fillRect(0,0,W,W);lbl.textContent=P.inside?'Inside the habitat':`Underground · ${Math.round(cave.depth)} m`;
    c.translate(h,h);c.rotate(wrapA(P.yaw-cam.yaw));c.fillStyle='#fff';c.beginPath();c.moveTo(0,-12);c.lineTo(8,9);c.lineTo(0,4);c.lineTo(-8,9);c.closePath();c.fill();return}
  lbl.textContent='';
  if(Math.hypot(f.x-MM.cx,f.z-MM.cz)>45)mmTerrain(f.x,f.z);
  c.fillStyle='#2a150d';c.fillRect(0,0,W,W);
  c.setTransform(cy*s,-sy*s,-sy*s,-cy*s,h,h);c.imageSmoothingEnabled=true;c.drawImage(MM.off,MM.cx-MM.R-f.x,MM.cz-MM.R-f.z,MM.R*2,MM.R*2);
  // gridlines every 50 m (brighter every 250 m), turning with the map
  {const G=50,R0=MM.show*1.5;c.lineWidth=1/s;for(let gx=Math.ceil((f.x-R0)/G)*G;gx<f.x+R0;gx+=G){c.strokeStyle=gx%250===0?'rgba(255,255,255,.22)':'rgba(255,255,255,.09)';c.beginPath();c.moveTo(gx-f.x,-R0);c.lineTo(gx-f.x,R0);c.stroke()}
    for(let gz=Math.ceil((f.z-R0)/G)*G;gz<f.z+R0;gz+=G){c.strokeStyle=gz%250===0?'rgba(255,255,255,.22)':'rgba(255,255,255,.09)';c.beginPath();c.moveTo(-R0,gz-f.z);c.lineTo(R0,gz-f.z);c.stroke()}}
  c.setTransform(1,0,0,1,0,0);
  const dot=(x,z,r,col,stroke)=>{const[px,py]=toS(x,z);if(!mmIn(px,py,h,2))return;c.fillStyle=col;c.beginPath();c.arc(px,py,r,0,TAU);c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke()}};
  c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1;c.beginPath();c.arc(h,h,h*0.5,0,TAU);c.stroke();
  for(const b of blds){const[px,py]=toS(b.x,b.z);if(!mmIn(px,py,h,0))continue;const r=Math.max(3,BUILD[b.type].r*s*0.8);c.fillStyle=b.type==='habitat'?'#ffffff':b.fault?'#ff6b5e':'rgba(255,255,255,.75)';c.fillRect(px-r/2,py-r/2,r,r)}
  if(typeof meteors!=='undefined')for(const m of meteors){const[px,py]=toS(m.x,m.z);c.strokeStyle='#ff4a3d';c.lineWidth=2;c.beginPath();c.arc(px,py,7+Math.sin(now*12)*2,0,TAU);c.stroke()}
  if(typeof devils!=='undefined')for(const d of devils)if(d.alive&&(d.op||0)>0.2)dot(d.x,d.z,devilReach(d)*s*0.5,'rgba(196,138,94,.45)');
  for(const p of nearPOIs)if(S.discovered.has(p.id)&&!poiDone(p))dot(p.x,p.z,3.2,POI[p.type].color,'#000');
  if(typeof creatures!=='undefined')for(const cr of creatures.values())if(!cr.gone&&Math.abs(cr.x-f.x)<MM.show&&Math.abs(cr.z-f.z)<MM.show)dot(cr.x,cr.z,2.4,SPECIES[cr.sp].kind==='hostile'?'#ff5a4f':'#8fe39a');
  if(typeof pings!=='undefined')for(const p of pings)dot(p.x,p.z,4,'#ffd25e');
  for(const w of S.pwp||[]){const[px,py]=mmEdge(...toS(w.x,w.z),h,7);c.save();c.translate(px,py);c.rotate(Math.PI/4);c.fillStyle=w.col;c.fillRect(-4.5,-4.5,9,9);c.strokeStyle='#000';c.lineWidth=1.5;c.strokeRect(-4.5,-4.5,9,9);c.restore()}
  for(const lc of S.lostCaches)if(cacheMeshes.has(lc.id)){const[px,py]=mmEdge(...toS(lc.x,lc.z),h,7);c.strokeStyle='#ff6b5e';c.lineWidth=3;c.beginPath();c.moveTo(px-5,py-5);c.lineTo(px+5,py+5);c.moveTo(px+5,py-5);c.lineTo(px-5,py+5);c.stroke()}
  if(P.mode==='foot')dot(R.pos.x,R.pos.z,4,'#ff8a3d','#000');
  for(const rp of net.players.values()){const q=rp.t&&rp.t.p;if(!q)continue;const[px,py]=mmEdge(...toS(q[4]?q[5]:q[0],q[4]?q[7]:q[2]),h,14),im=rp.lookS&&pfpImage(rp.lookS);
    c.save();c.beginPath();c.arc(px,py,13,0,TAU);c.fillStyle='#7fd3ff';c.fill();if(im&&im.complete&&im.naturalWidth){c.clip();c.drawImage(im,px-12,py-12,24,24)}c.restore();c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(px,py,13,0,TAU);c.stroke()}
  const g=game.guide;if(g&&g.x!==undefined&&OPT.guide!==false){const[px,py]=mmEdge(...toS(g.x,g.z),h,8);c.strokeStyle='#ff8a3d';c.lineWidth=2.5;c.beginPath();c.arc(px,py,6,0,TAU);c.stroke()}
  // north marker on the rim, and you in the middle facing your way
  {const[nx,ny]=toS(f.x,f.z-1000),[px,py]=mmEdge(nx,ny,h,11);c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.arc(px,py,8,0,TAU);c.fill();c.fillStyle='#ff8a3d';c.font='800 11px Nunito Sans';c.textAlign='center';c.textBaseline='middle';c.fillText('N',px,py+0.5)}
  c.save();c.translate(h,h);c.rotate(wrapA((P.mode==='rover'?R.yaw:P.yaw)-cam.yaw));c.fillStyle='#fff';c.strokeStyle='#000';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-9);c.lineTo(6,7);c.lineTo(0,3);c.lineTo(-6,7);c.closePath();c.fill();c.stroke();c.restore();
}
/* ---------- your crewmates online: profile picture, name, health and oxygen ---------- */
const PFPIMG=new Map();
function pfpImage(lookS){let im=PFPIMG.get(lookS);if(!im){im=new Image();let l={};try{l=JSON.parse(lookS)}catch(e){}im.src=pfpURL(l)||'';PFPIMG.set(lookS,im);if(PFPIMG.size>40)PFPIMG.delete(PFPIMG.keys().next().value)}return im}
let crewSig='';
function renderCrew(force){
  const el=$('#crewhud');if(!el)return;const list=[...net.players.values()].filter(p=>p.t);
  const sig=list.map(p=>p.id+(p.lookS||'').length+Math.round((p.t.hp||0)/2)+Math.round((p.t.o2||0)/4)+(p.t.in||0)).join('|');if(!force&&sig===crewSig)return;crewSig=sig;
  el.innerHTML=list.map(p=>{const mh=p.t.mh||100,hp=clamp((p.t.hp||0)/mh*100,0,100),o2=clamp(p.t.o2??100,0,100);let l={};try{l=JSON.parse(p.lookS||'{}')}catch(e){}
    return`<div class="crew${hp<30?' low':''}">${pfpImg(l)}<div class="cinfo"><b>${esc(p.name||'Crewmate')}${p.t.in?' <small>· in the habitat</small>':''}</b><span class="cb hp"><i style="width:${hp}%"></i></span><span class="cb o2"><i style="width:${o2}%"></i></span></div></div>`}).join('');
  el.classList.toggle('hidden',!list.length)}
$('#hudfold').addEventListener('click',()=>{document.body.classList.toggle('hudmin');OPT.hudFull=!document.body.classList.contains('hudmin');saveOpts();layoutLeft()});

/* ---------- coordinates under the minimap: Mars latitude/longitude, local grid and elevation ---------- */
// real landing-site coordinates (centre of each site), and roughly how high or low the ground there sits (MOLA, metres)
const SITE_GEO={jezero:{lat:18.44,lon:77.45,elev:-2600},utopia:{lat:46.7,lon:117.5,elev:-4100},gale:{lat:-5.4,lon:137.8,elev:-4500},tharsis:{lat:-8.4,lon:240.9,elev:6500},elysium:{lat:4.5,lon:135.6,elev:-2600}};
const MARS_M_PER_DEG=3389500*Math.PI/180;        // Mars' mean radius 3,389.5 km
function marsCoords(x,z){const g=SITE_GEO[S&&S.site]||SITE_GEO.jezero,lat=g.lat+(-z)/MARS_M_PER_DEG,lon=g.lon+x/(MARS_M_PER_DEG*Math.cos(g.lat*Math.PI/180));
  return{lat,lon:((lon%360)+360)%360,east:Math.round(x),north:Math.round(-z),elev:Math.round(g.elev+groundHeight(x,z))}}
const fmtLat=v=>`${Math.abs(v).toFixed(4)}°${v>=0?'N':'S'}`,fmtLon=v=>`${(v>180?360-v:v).toFixed(4)}°${v>180?'W':'E'}`;
function updateCoords(){const el=$('#mmcoord');if(!el||!S)return;const f=focusPos();
  if(P.inside){el.textContent='Inside the habitat';return}const c=marsCoords(f.x,f.z);
  el.innerHTML=`<b>${fmtLat(c.lat)} ${fmtLon(c.lon)}</b><span>E ${c.east>=0?'+':''}${c.east} · N ${c.north>=0?'+':''}${c.north} · ${c.elev.toLocaleString()} m</span>`}
setInterval(()=>{if(game.state==='play')updateCoords()},250);

/* ---------- left side of the screen: stack the map, coordinates, stats, crew, boosts and radio so nothing overlaps ---------- */
function mmSize(){const t=document.body.classList.contains('touch'),def=t?(innerHeight<500?100:128):190;return clamp(+((t?OPT.mmSizeT:OPT.mmSize)||def),90,Math.min(340,innerHeight*0.45))}
function layoutLeft(){
  if(game.state!=='play')return;if(document.body.classList.contains('touch')&&OPT.hudFull!==true)document.body.classList.add('hudmin');const t=document.body.classList.contains('touch'),sz=mmSize(),mm=$('#minimap'),gr=$('#mmgrip'),co=$('#mmcoord');
  mm.style.width=mm.style.height=sz+'px';const L=parseFloat(getComputedStyle(mm).left)||16,T=parseFloat(getComputedStyle(mm).top)||14;
  gr.style.left=(L+sz-18)+'px';gr.style.top=(T+sz-18)+'px';co.style.width=sz+'px';co.style.left=L+'px';
  let y=T+sz+4;const put=(el,gap=6)=>{if(!el||el.classList.contains('hidden')||!el.offsetHeight)return;el.style.setProperty('top',y+'px','important');el.style.setProperty('left',L+'px','important');y+=el.offsetHeight+gap};
  {const cd=$('#cards');if(!t&&cd.style.top){for(const k of['left','right','bottom','top','width'])cd.style.removeProperty(k);cd.style.maxHeight='';cd.style.overflowY=''}}
  put(co);put($('#vitals2'),8);if(!t){put($('#crewhud'),8)}put($('#buffs'),8);put($('#netinfo'),8);
  if(t){const hf=$('#hudfold');hf.style.setProperty('left',(L+sz+8)+'px','important');hf.style.setProperty('top',(T+40)+'px','important');const ch=$('#crewhud');ch.style.setProperty('left',(L+sz+44)+'px','important');ch.style.setProperty('top',(T+36)+'px','important');
    {const tp=$('#top'),cb=$('#chatbtn'),pb=$('#t-pause');if(tp&&cb&&pb){const gl=cb.getBoundingClientRect().right+8,gr2=pb.getBoundingClientRect().left-8;
      if(gr2-gl>=200){for(const[k,v]of[['left',gl+'px'],['width',Math.min(420,gr2-gl)+'px'],['top',T+'px'],['transform','none']])tp.style.setProperty(k,v,'important')}else for(const k of['left','width','top','transform'])tp.style.removeProperty(k)}}
    const ts=$('#toasts'),jr=$('#journal');if(ts){let xr=L+sz;for(const id of['#vitals2','#mmcoord','#buffs','#netinfo']){const e=$(id);if(e&&e.offsetHeight)xr=Math.max(xr,e.getBoundingClientRect().right)}const x0=xr+12,x1=(jr&&jr.offsetHeight?jr.getBoundingClientRect().left:innerWidth)-8;ts.style.setProperty('left',x0+'px','important');ts.style.setProperty('width',Math.max(160,x1-x0)+'px','important');ts.style.setProperty('transform','none','important');{const tpb=$('#top').offsetHeight?$('#top').getBoundingClientRect().bottom+6:0;ts.style.setProperty('top',Math.max(T+86,tpb)+'px','important')}
      const tb=ts.children.length?ts.getBoundingClientRect().bottom+8:0,cd=$('#cards'),ct=Math.max(T+96,tb);cd.style.setProperty('left',x0+'px','important');cd.style.setProperty('right','auto','important');cd.style.setProperty('bottom','auto','important');cd.style.setProperty('top',ct+'px','important');cd.style.setProperty('width',Math.max(160,Math.min(420,x1-x0))+'px','important');cd.style.maxHeight=Math.max(80,innerHeight-ct-70)+'px';cd.style.overflowY='auto'}}
  {const py=layoutPortrait(L,T,sz,y);if(py)y=py}
  if(!t)fitDesktop(L,sz);
  const jh=$('#joyhint');if(jh&&t){const jr=jh.getBoundingClientRect();jh.style.visibility=jr.top<y+4?'hidden':''}
  const rf=$('#radiofeed');if(rf){rf.style.setProperty('top',(y+4)+'px','important');rf.style.maxHeight=Math.max(0,innerHeight-y-130)+'px';rf.style.overflow='hidden'}}
/* desktop: the guide, messages and story cards keep their usual places, and only move when the window is narrow
   enough that they would run into the map, the task card or the clock */
function fitDesktop(L,sz){
  const hit=(a,b)=>a.left<b.right-2&&b.left<a.right-2&&a.top<b.bottom-2&&b.top<a.bottom-2,rc=e=>e.getBoundingClientRect();
  let xr=L+sz;for(const id of['#minimap','#mmcoord']){const e=$(id);if(e&&e.offsetHeight)xr=Math.max(xr,rc(e).right)}
  const jr=$('#journal'),jl=jr&&jr.offsetHeight?rc(jr).left:innerWidth,gl=xr+12,gw=jl-8-gl,mm=rc($('#minimap'));
  let below=0;
  for(const id of['#top','#toasts']){const e=$(id);if(!e)continue;for(const k of['left','width','transform','top'])e.style.removeProperty(k);if(!e.offsetHeight)continue;
    const r=rc(e);if(hit(r,mm)||(jr&&jr.offsetHeight&&hit(r,rc(jr)))||(below&&r.top<below)){e.style.setProperty('left',gl+'px','important');e.style.setProperty('width',Math.max(180,gw)+'px','important');e.style.setProperty('transform','none','important');if(below&&rc(e).top<below)e.style.setProperty('top',below+'px','important')}
    below=rc(e).bottom+6}
  const cd=$('#cards'),ck=$('#clock');if(cd&&ck){cd.style.removeProperty('bottom');if(cd.offsetHeight&&ck.offsetHeight&&hit(rc(cd),rc(ck)))cd.style.setProperty('bottom',(innerHeight-rc(ck).top+8)+'px','important')}}
/* phone held upright: map top left, buttons top right, then the guide, task card, messages and story cards stacked down
   the screen; the hotbar shrinks to fit and the jump, use and run buttons sit above it */
const PORT_IDS=['#chatbtn','#hudfold','#crewhud','#top','#journal','#hotbar','#toasts','#cards'];
// move the bottom-right touch buttons up by dy pixels (0 puts them back)
function liftTouchButtons(dy){if(typeof TBTNS==='undefined')return;for(const[id,,,pos]of TBTNS){const e=document.getElementById(id);if(e&&pos.bottom&&parseFloat(pos.bottom)<200)e.style.bottom=(parseFloat(pos.bottom)+Math.max(0,dy))+'px'}}
function layoutPortrait(L,T,sz,y){
  const on=document.body.classList.contains('touch')&&innerHeight>innerWidth*1.1;document.body.classList.toggle('portrait',on);
  if(!on){if(layoutPortrait.on){layoutPortrait.on=false;for(const s of PORT_IDS){const e=$(s);if(e)for(const k of['left','right','top','bottom','width','transform','transform-origin'])e.style.removeProperty(k)}liftTouchButtons(0)}return 0}
  layoutPortrait.on=true;const W=innerWidth,set=(e,o)=>{if(e)for(const k in o)e.style.setProperty(k,o[k],'important')},x0=L+sz+8;
  const cb=$('#chatbtn');set(cb,{left:x0+'px',top:'58px',right:'auto',bottom:'auto'});
  const hf=$('#hudfold');set(hf,{left:(x0+cb.offsetWidth+6)+'px',top:'60px'});
  const tp=$('#top');set(tp,{left:x0+'px',top:'100px',width:(W-x0-12)+'px',transform:'none'});
  let cy2=tp.offsetHeight?tp.getBoundingClientRect().bottom+6:100;const ch=$('#crewhud');set(ch,{left:x0+'px',top:cy2+'px'});if(ch&&ch.offsetHeight)cy2+=ch.offsetHeight+6;
  let yy=Math.max(y,cy2)+4;
  const jr=$('#journal');set(jr,{left:L+'px',right:'auto',top:yy+'px',width:(W-2*L)+'px'});if(jr&&jr.offsetHeight)yy+=jr.offsetHeight+8;
  const ts=$('#toasts');set(ts,{left:L+'px',width:(W-2*L)+'px',transform:'none',top:yy+'px'});if(ts.children.length)yy=ts.getBoundingClientRect().bottom+8;
  const cd=$('#cards');set(cd,{left:L+'px',width:(W-2*L)+'px',top:yy+'px',right:'auto',bottom:'auto'});cd.style.maxHeight=Math.max(80,innerHeight*0.3)+'px';if(cd.children.length)yy=cd.getBoundingClientRect().bottom+8;
  const hb=$('#hotbar');set(hb,{left:'50%',transform:'translateX(-50%)','transform-origin':'50% 100%'});const k=Math.min(1,(W-12)/hb.offsetWidth);set(hb,{transform:`translateX(-50%) scale(${k.toFixed(3)})`});
  const lift=innerHeight-hb.getBoundingClientRect().top+8;
  liftTouchButtons(lift-14);
  return yy}
setInterval(layoutLeft,300);addEventListener('resize',layoutLeft);
// drag the corner of the minimap to resize it
{let drag=null;const gr=$('#mmgrip');
  gr.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();gr.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,s:mmSize()}});
  gr.addEventListener('pointermove',e=>{if(!drag)return;const ns=clamp(drag.s+Math.max(e.clientX-drag.x,e.clientY-drag.y),90,Math.min(340,innerHeight*0.45));if(document.body.classList.contains('touch'))OPT.mmSizeT=ns;else OPT.mmSize=ns;layoutLeft()});
  const end=()=>{if(drag){drag=null;saveOpts()}};gr.addEventListener('pointerup',end);gr.addEventListener('pointercancel',end)}
