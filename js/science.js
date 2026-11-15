'use strict';

/* =========================================================
   POINTS OF INTEREST & SCIENCE
   ========================================================= */
const poiMemo=new Map(),poiMeshes=new Map();let storyPOIs=[];
function resetPOIs(){for(const g of poiMeshes.values()){scene.remove(g);disposeObj(g)}poiMeshes.clear();poiMemo.clear();
  if(!SITE)return;
  storyPOIs=[{id:'s_sed',type:'sediment',x:170,z:140},{id:'s_bas',type:'basalt',x:-190,z:110},
    {id:'s_ice',type:'ice',x:SITE.ice[0][0],z:SITE.ice[0][1]},
    {id:'s_org1',type:'organics',x:SITE.org[0][0],z:SITE.org[0][1]},{id:'s_org2',type:'organics',x:SITE.org[1][0],z:SITE.org[1][1]}];
}
const PCELL=260;
function poiAtCell(gx,gz){
  const k=gx+','+gz;if(poiMemo.has(k))return poiMemo.get(k);
  let p=null;const sd=SITE.seed+11;
  if(hash2(gx,gz,sd)<0.5){
    const x=(gx+0.2+0.6*hash2(gx,gz,sd+1))*PCELL,z=(gz+0.2+0.6*hash2(gx,gz,sd+2))*PCELL,r=hash2(gx,gz,sd+3);
    if(x*x+z*z>130*130&&!storyPOIs.some(s=>Math.hypot(s.x-x,s.z-z)<90)){
      sample(x,z,TS3);let type;
      if(TS3.ice>0.5)type='ice';
      else if(TS3.crater>0.2)type=r<0.5?'ejecta':'sediment';
      else if(TS3.dune>0.3)type='sand';
      else if(TS3.mtn>0.15)type='basalt';
      else{const opts=['basalt','clay','salt','sediment','ejecta','clay'];type=opts[Math.floor(r*opts.length)];if((type==='clay'||type==='sediment')&&hash2(gx,gz,sd+4)<0.12)type='organics'}
      if(hash2(gx,gz,sd+5)<0.09)type='meteorite';
      p={id:'c'+k,type,x,z};
    }
  }
  poiMemo.set(k,p);return p;
}
function poisNear(x,z,range){
  const out=[];for(const p of storyPOIs)if(Math.hypot(p.x-x,p.z-z)<range)out.push(p);
  if(typeof caveEntrancePOIs==='function')out.push(...caveEntrancePOIs(x,z,range));
  if(S&&S.extraPOIs)for(const p of S.extraPOIs)if(Math.hypot(p.x-x,p.z-z)<range)out.push(p);
  const c0x=Math.floor((x-range)/PCELL),c1x=Math.floor((x+range)/PCELL),c0z=Math.floor((z-range)/PCELL),c1z=Math.floor((z+range)/PCELL);
  for(let i=c0x;i<=c1x;i++)for(let j=c0z;j<=c1z;j++){const p=poiAtCell(i,j);if(p&&Math.hypot(p.x-x,p.z-z)<range)out.push(p)}
  return out;
}
const discoverRange=()=>S.research.has('scanner')?800:400;
let nearPOIs=[];
function updatePOIs(focus){
  nearPOIs=poisNear(focus.x,focus.z,1300);
  const keep=new Set();
  for(const p of nearPOIs){
    const d=Math.hypot(p.x-focus.x,p.z-focus.z);
    if(d<(POI[p.type].hidden?45:discoverRange())&&!S.discovered.has(p.id)){S.discovered.add(p.id);if(POI[p.type].hidden)toast('Hidden discovery: '+POI[p.type].name+'!','good')}
    if(d<480){keep.add(p.id);if(!poiMeshes.has(p.id)){const g=mkPOIModel(p.type,hashI(Math.round(p.x),Math.round(p.z),5));g.position.set(p.x,groundHeight(p.x,p.z)-0.1,p.z);scene.add(g);poiMeshes.set(p.id,g)}}
  }
  for(const[id,g]of poiMeshes)if(!keep.has(id)&&!nearPOIs.some(p=>p.id===id&&Math.hypot(p.x-focus.x,p.z-focus.z)<560)){scene.remove(g);disposeObj(g);poiMeshes.delete(id)}
  for(const p of nearPOIs){const g=poiMeshes.get(p.id);if(g)styleMarker(p,g)}
}
function poiDone(p){return S.scanned.has(p.id)&&(!POI[p.type].sample||S.sampled.has(p.id))}
function styleMarker(p,g){const u=g.userData,done=poiDone(p),sc=S.scanned.has(p.id);
  u.marker.material.color.set(done?'#8a8a8a':sc?'#ffffff':POI[p.type].color);const hid=POI[p.type].hidden&&!S.discovered.has(p.id);u.beam.visible=!done&&!hid;u.ring.visible=!done&&!hid;u.marker.visible=!hid}
function animatePOIs(dt){for(const g of poiMeshes.values()){const m=g.userData.marker;m.rotation.y+=dt*1.5;m.position.y=g.userData.top+3.5+Math.sin(now*2+g.position.x)*0.25}}
function completeScan(p){
  const T=POI[p.type],first=!S.flags.iceFound;
  let gain=Math.round(T.rp*0.4*(hasRole('Planetary Scientist')?1.15:1)),text=T.scan;
  const res=act({a:'scan',id:p.id,type:p.type});if(res===false)return;if(typeof res==='number')gain=res;if(SCAN_TECH[p.type])unlockTech(SCAN_TECH[p.type]);
  if(net.role==='guest'){S.scanned.add(p.id)}
  if(p.type==='lavatube'){gain=T.rp;const r=mulberry(hashI(p.x|0,p.z|0,9));const L=Math.round(140+r()*320),Tc=Math.round(50+r()*25);
    text+=` The robot maps ${L} m of tunnel. The temperature holds steady near −${Tc} °C, and the rock overhead would block most surface radiation. A promising site for future shelters.`;}
  if(p.type==='ice'&&first)text+=' Ice-rich ground is now highlighted on your map.';
  if(p.type==='lavatube')text+=' Look for the way down: lava tubes like this one are explorable caves.';
  card(T.name,'Scan complete · +'+gain+' RP',text,T.color);beep(1200,0.08);beep(1600,0.1,'sine',0.06,0.09);
  if(T.sample)tryCollect(p);
  const g=poiMeshes.get(p.id);if(g)styleMarker(p,g);
}
function tryCollect(p){
  if(S.sampled.has(p.id))return;
  if(S.samples.length>=sampleCap()){toast('Sample cache full. Deliver your samples to a Science Lab.','warn');return}
  if(act({a:'sampled',id:p.id})===false)return;S.samples.push({type:p.type,id:p.id});S.sampled.add(p.id);
  toast(`Sample sealed: ${POI[p.type].name} (${S.samples.length}/${sampleCap()})`,'good');
  const g=poiMeshes.get(p.id);if(g)styleMarker(p,g);
}
function completeAnalysis(smp){
  const T=POI[smp.type];let gain=Math.round(T.rp*(hasRole('Geologist')?1.25:1)),text=T.lab;
  S.analyzed.push(smp);if(LAB_TECH[smp.type])unlockTech(LAB_TECH[smp.type]);
  if(smp.type==='organics'){
    const n=new Set(S.analyzed.filter(a=>a.type==='organics').map(a=>a.id)).size;
    text=n<2?'Organic molecules detected. Curiosity and Perseverance have found organics on Mars too, but organics can also form without life (from meteorites or water–rock chemistry). This is a clue, not proof.'
      :'A second site shows a similar organic signal. Consistent results are exciting, but non-biological explanations remain. Confirming past life would need many independent lines of evidence, strict contamination control and analysis in laboratories on Earth.';
  }
  S.res.rp+=gain;card('Lab report: '+T.name,'Analysis complete · +'+gain+' RP',text,'#c69bff');
}
function devilCleaning(d){
  for(const b of blds)if(b.type==='solar'&&b.dust>0.1&&!d.cleaned.has(b.id)&&Math.hypot(b.x-d.x,b.z-d.z)<9*(d.size||1)){
    d.cleaned.add(b.id);b.dust*=0.25;toast('A dust devil just swept a solar array clean, like the “cleaning events” that kept Spirit and Opportunity running!','good');
  }
}

/* ---------- discoveries become technology: what you find out on Mars makes the colony better ---------- */
const DISCO_TECH={
  perchlorate:{name:'Perchlorate Scrubbers',from:'scanning a Perchlorate Salt Crust',effect:'Greenhouses grow 15% more food: the toxic salts are washed out of the soil first.',fact:'Phoenix found perchlorates in Martian soil in 2008. Some bacteria can break them down, releasing oxygen.'},
  ice:{name:'Ice Prospecting',from:'scanning a Subsurface Ice Signature',effect:'Ice Drills pump 25% more water.',fact:'Radar on Mars Reconnaissance Orbiter mapped thick buried ice sheets in the mid-latitudes.'},
  clay:{name:'Clay Ceramics',from:'analysing a Hydrated Clay sample',effect:'Regolith Processors make 25% more building material.',fact:'Clays form only in water, so they are a key clue to Mars’ wetter past.'},
  dust:{name:'Electrostatic Dust Shields',from:'scanning Dark Basaltic Dune Sand',effect:'Solar panels collect dust 30% more slowly.',fact:'Dust ended the Opportunity and InSight missions by covering their solar panels.'},
  basalt:{name:'Basalt Fibre Armour',from:'scanning Basalt Boulders or Impact Ejecta',effect:'+15 maximum suit integrity.',fact:'Basalt fibre is strong and heat-resistant, and can be spun from volcanic rock like Mars’ crust.'},
  organics:{name:'Bioregenerative Life Support',from:'analysing an Organic-bearing Mudstone sample',effect:'Each greenhouse also adds oxygen to the colony’s air.',fact:'Curiosity and Perseverance have found organic molecules preserved in ancient Martian mudstone.'},
  sediment:{name:'Aquifer Models',from:'analysing a Layered Sedimentary sample',effect:'The colony uses 10% less water.',fact:'Layered rocks at Jezero and Gale crater were laid down in lakes over 3 billion years ago.'},
  lavatube:{name:'Regolith Shielding',from:'scanning a Lava Tube Skylight',effect:'Your suit takes 25% less radiation outside.',fact:'Lava tubes and thick regolith could shield explorers from cosmic radiation.'},
  crystal:{name:'Crystal Lattice Batteries',from:'studying a cave’s hidden discovery',effect:'Your suit battery drains 20% more slowly.',fact:'Giant gypsum crystals grow slowly in mineral-rich water, like those in Mexico’s Naica cave.'},
  meteoric:{name:'Meteoric Alloy Bits',from:'collecting meteorite nickel-iron',effect:'All drills cut 15% faster.',fact:'Curiosity found an iron-nickel meteorite on Mars nicknamed “Egg Rock”.'},
  xeno:{name:'Xenolinguistics',from:'making first contact',effect:'You learn alien words faster.',fact:'Real scientists study how we might decode a language with no shared reference points.'},
};
const SCAN_TECH={salt:'perchlorate',ice:'ice',sand:'dust',basalt:'basalt',ejecta:'basalt',lavatube:'lavatube'},LAB_TECH={clay:'clay',organics:'organics',sediment:'sediment'};
const tech=id=>!!(S&&S.tech&&S.tech[id]);
function unlockTech(id){if(!S||!DISCO_TECH[id]||tech(id))return;S.tech=S.tech||{};S.tech[id]=true;const T=DISCO_TECH[id];
  setTimeout(()=>card('Discovery → Technology',T.name,`From ${T.from}: ${T.effect} ${T.fact}`,'#c69bff'),900);if(net.role==='host')net.snapDirty=true}
