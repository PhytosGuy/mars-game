'use strict';
/* =========================================================
   OPEN WORLD: landmarks, discovery, regions, fog of war, loot,
   suit damage, death & lost caches
   ========================================================= */
const LM_CELL=520,LM_TYPES=[['wreck',0.24],['outpost',0.22],['ruin',0.22],['village',0.14],['spire',0.18]];
const LM_INFO={wreck:{icon:'✈',label:'Crash site'},outpost:{icon:'▣',label:'Abandoned station'},ruin:{icon:'◬',label:'Ancient ruin'},village:{icon:'⌂',label:'Tharrak camp'},spire:{icon:'▲',label:'Mesa'},cave:{icon:'◉',label:'Cave'}};
const SHIP_NAMES=['Kestrel','Meridian','Pathway','Halcyon','Tern','Vesper','Corvid','Lantern','Wayfarer','Solace'];
const GREEK=['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Theta','Kappa','Sigma','Omega'];
const RUIN_NAMES=['Silent Spires','Glass Circle','Watcher’s Ring','Hollow Crown','Sunken Gate','Seven Stones'];
const VILLAGE_NAMES=['Oru-Tah','Kesh Varn','Thal Imm','Ashka','Veyr-Om','Duun Sal'];
const lmMemo=new Map();
function landmarkAt(gx,gz){
  const k=gx+','+gz;if(lmMemo.has(k))return lmMemo.get(k);let L=null;
  const r=hash2(gx,gz,SITE.seed+777);
  if(r<0.42){const x=(gx+0.25+0.5*hash2(gx,gz,SITE.seed+778))*LM_CELL,z=(gz+0.25+0.5*hash2(gx,gz,SITE.seed+779))*LM_CELL;
    if(x*x+z*z>270*270&&!(SITE.lava&&Math.hypot(SITE.lava[0]-x,SITE.lava[1]-z)<120)){
      let q=hash2(gx,gz,SITE.seed+780),type='wreck';for(const[t,w]of LM_TYPES){if((q-=w)<0){type=t;break}}
      const n=hashI(gx,gz,SITE.seed+781);
      const name=type==='wreck'?`Wreck of the ${SHIP_NAMES[n%SHIP_NAMES.length]}`:type==='outpost'?`Station ${GREEK[n%GREEK.length]}`:type==='ruin'?`The ${RUIN_NAMES[n%RUIN_NAMES.length]}`:type==='village'?`${VILLAGE_NAMES[n%VILLAGE_NAMES.length]} camp`:`${['Red','Lonely','Broken','Tall','Watch'][n%5]} Mesa`;
      L={id:'lm'+gx+'_'+gz,type,x,z,name,seed:n}}}
  lmMemo.set(k,L);return L;
}
function landmarksNear(x,z,r){const out=[];for(let i=Math.floor((x-r)/LM_CELL);i<=Math.floor((x+r)/LM_CELL);i++)for(let j=Math.floor((z-r)/LM_CELL);j<=Math.floor((z+r)/LM_CELL);j++){const L=landmarkAt(i,j);if(L&&Math.hypot(L.x-x,L.z-z)<r)out.push(L)}return out}
// mesas are part of the terrain itself (terrain.js calls this)
function spireH(x,z){let h=0;for(const L of landmarksNear(x,z,30))if(L.type==='spire'){const d=Math.hypot(L.x-x,L.z-z);h=Math.max(h,(26+(L.seed%14))*(1-smooth(6,14,d)))}return h}
/* ---------- landmark models ---------- */
function mkWreck(r){
  const g=new THREE.Group(),hull=mat('#c8ccd2',{metalness:0.6,roughness:0.4}),burnt=mat('#2a2220',{roughness:1});
  const body=cy(2.4,2.4,14,16,hull,0,1.5,0);body.rotation.set(Math.PI/2,0,0.15);g.add(body);
  g.add(rot(cy(2.45,2.45,0.6,16,ORANGE,0,1.6,-3),'x',Math.PI/2));
  const nose=mesh(new THREE.ConeGeometry(2.4,4,16),hull,0,1.3,9);nose.rotation.x=Math.PI/2+0.2;g.add(nose);
  for(const s of[-1,1]){const w=bx(7,0.12,3,mat('#25397a',{metalness:0.5,roughness:0.3}),s*6.5,0.4+r()*0.6,-2+r()*3);w.rotation.set(r()*0.5,r()*0.6,s*0.3+r()*0.3);g.add(w)}
  for(let i=0;i<9;i++){const d=bx(0.6+r()*1.4,0.15+r()*0.4,0.6+r()*1.4,i%2?hull:burnt,(r()-0.5)*16,0.2,-10-r()*16);d.rotation.set(r(),r()*3,r());g.add(d)}
  const furrow=bx(5,0.05,22,burnt,0,0.05,-16);furrow.receiveShadow=true;g.add(furrow);
  g.userData.solids=[...[-6,-3.6,-1.2,1.2,3.6,6].map(z=>[0,z,2.4,4]),[0,9,1.7,3.4]];return g}
function mkOutpost(r){
  const g=new THREE.Group(),wall=mat('#d9d2c7'),dust=mat('#b07a55');
  g.add(bx(6,3,4,wall,0,1.5,0));g.add(bx(6.05,0.4,4.05,dust,0,3,0));g.add(bx(1.2,2,0.1,mat('#1d1411'),0,1,2.02));
  g.add(bx(4,2.6,3.4,wall,7,1.3,1));g.add(bx(2.4,0.6,0.1,mat('#2a3050'),7,1.6,2.72));
  const ant=cy(0.12,0.2,8,6,OFF,-5,1,3);ant.rotation.z=1.2;g.add(ant);
  const pan=bx(3.6,0.08,2.2,mat('#6a5040',{roughness:0.9}),-2,0.8,6);pan.rotation.x=0.4;g.add(pan);
  for(let i=0;i<6;i++)g.add(cy(0.06,0.06,1.4,5,GREY,-8+i*3.4,0.7,-5));
  g.userData.solids=[[-2,0,2.1,3.3],[0,0,2.1,3.3],[2,0,2.1,3.3],[6,1,1.8,2.7],[8,1,1.8,2.7]];return g}
function mkRuin(r){
  const g=new THREE.Group(),st=mat('#2a2630',{roughness:0.55}),gl=mat('#6fe0c8',{emissive:'#6fe0c8',emissiveIntensity:1.4});
  for(let i=0;i<6;i++){const a=i/6*TAU,h=7+r()*5,m=mesh(rbox(1.8,h,1.2,0.25),st,Math.cos(a)*9,h/2-0.5,Math.sin(a)*9);m.rotation.y=-a;m.rotation.z=(r()-0.5)*0.15;g.add(m);
    for(let k=0;k<3;k++)g.add(rot(mesh(rbox(0.9,0.1,0.06,0.03),gl,Math.cos(a)*9-Math.sin(a)*0.62,1.5+k*1.6,Math.sin(a)*9+Math.cos(a)*0.62),'y',-a))}
  const ob=mesh(rbox(1.6,9,1.6,0.3),st,0,4,0);g.add(ob);g.userData.core=mesh(shared('core',()=>new THREE.OctahedronGeometry(0.9,0)),gl,0,10,0);g.add(g.userData.core);
  g.add(cy(4,4.4,0.5,24,st,0,0.1,0));
  g.userData.solids=[[0,0,1.0,9],...[0,1,2,3,4,5].map(i=>{const a=i/6*TAU;return[Math.cos(a)*9,Math.sin(a)*9,1.1,9]})];return g}
function mkVillage(r){
  const g=new THREE.Group(),sol=[[0,0,1.7,0.6]];g.userData.solids=sol;const st=mat('#8a6a55',{roughness:0.9}),cloth=mat('#c9864a'),gl=mat('#ffb060',{emissive:'#ff9030',emissiveIntensity:2});
  for(let i=0;i<5;i++){const a=i/5*TAU+r()*0.3,d=9+r()*3,x=Math.cos(a)*d,z=Math.sin(a)*d;
    sol.push([x,z,2.5,3]);const hut=mesh(new THREE.SphereGeometry(2.6,12,8,0,TAU,0,Math.PI/2),st,x,0,z);hut.scale.y=1.2;g.add(hut);g.add(rot(bx(1.2,1.6,0.3,mat('#1d1411'),x+Math.cos(a+Math.PI)*2.4,0.8,z+Math.sin(a+Math.PI)*2.4),'y',-a+Math.PI/2));
    g.add(cy(0.08,0.08,4,5,'#5a4033',x+Math.cos(a)*3,2,z+Math.sin(a)*3));g.add(bx(1.2,0.8,0.05,cloth,x+Math.cos(a)*3.5,3.5,z+Math.sin(a)*3))}
  g.add(cy(1.4,1.8,0.6,10,st,0,0.3,0));g.add(mesh(shared('oct',()=>new THREE.OctahedronGeometry(1,0)),gl,0,1.5,0));g.userData.core=g.children[g.children.length-1];return g}
function mkSpireTop(){const g=new THREE.Group();g.add(cy(0.05,0.07,2.6,5,OFF,0,1.3,0));const b=sp(0.2,glow('#6fe0c8',2.5),0,2.7,0,8,6);g.add(b);g.userData.blink=[b];return g}
function mkCrate(){const g=new THREE.Group();g.add(mesh(rbox(1.3,0.8,0.9,0.1),'#5d5753',0,0.4,0));g.add(mesh(rbox(1.34,0.12,0.94,0.04),ORANGE,0,0.62,0));
  const lid=mesh(rbox(1.32,0.16,0.92,0.06),'#6d6763',0,0.88,0);g.add(lid);const l=sp(0.07,glow('#6fe0c8',2),0.5,0.5,0.46,6,4);g.add(l);g.userData={lid,light:l};return g}
const LM_MAKERS={wreck:mkWreck,outpost:mkOutpost,ruin:mkRuin,village:mkVillage,spire:mkSpireTop};
const lmMeshes=new Map();
// collision circles in world space (from each model's local solids, plus a ruin's pylons)
function lmSolids(g,L){const out=[],th=g.rotation.y,cs=Math.cos(th),sn=Math.sin(th),gy=g.position.y;
  for(const[lx,lz,r,h]of g.userData.solids||[])out.push({x:L.x+lx*cs+lz*sn,z:L.z-lx*sn+lz*cs,r,top:gy+h});
  if(L.type==='ruin')for(const py of pylonsOf(L))out.push({x:py.x,z:py.z,r:0.55,top:groundHeight(py.x,py.z)+2.6,pylon:true});
  return out}
/* ---------- loot ---------- */
const lootSpots=new Map();
const LOOT={
  wreck:r=>({plate:3+Math.floor(r()*4),circuit:2+Math.floor(r()*3),cell:1+Math.floor(r()*2),glass:2,datapad:1,...(r()<0.12?{drill2:1}:{})}),
  outpost:r=>({o2can:2,cell:2,patch:2,circuit:2+Math.floor(r()*2),datapad:1,...(r()<0.25?{prod:1}:{})}),
  ruin:r=>({tablet:1+Math.floor(r()*2),alloy:1}),
  shrine:r=>({artifact:1,resonite:2,alloy:3,tablet:2}),
  spire:r=>({o2can:1,cell:1,flare:3,tablet:1}),
  cave:r=>({titanium:3,crystal:2,cell:1,datapad:1,...(r()<0.15?{u_tank:1}:{})}),
  deep:r=>({resonite:2+Math.floor(r()*2),alloy:2,crystal:3,cell:2,artifact:1,...({0:{u_battery:1},1:{u_jets:1},2:{u_armor:1},3:{drill2:1}})[Math.floor(r()*4)]}),   // the deep vault's rare finds
};
function lootSpotsFor(L){const y=groundHeight(L.x,L.z);
  if(L.type==='wreck')return[{id:'L'+L.id,x:L.x+3,z:L.z+3,table:'wreck'}];
  if(L.type==='outpost')return[{id:'L'+L.id,x:L.x+2,z:L.z+3.5,table:'outpost'}];
  if(L.type==='ruin')return[{id:'L'+L.id,x:L.x+3,z:L.z-3,table:'ruin'},{id:'S'+L.id,x:L.x,z:L.z+2.5,table:'shrine',locked:true}];
  if(L.type==='spire')return[{id:'L'+L.id,x:L.x+1.5,z:L.z,table:'spire',y:y}];
  return[]}
function lootDesc(id){
  if(typeof id!=='string')return null;
  if(id.startsWith('Lcv')){const eid=id.slice(1);const e=eid==='cvL'?fixedEntrances()[0]:(()=>{const m=/^cv(-?\d+)_(-?\d+)$/.exec(eid);return m?cellEntrance(+m[1],+m[2]):null})();return e?caveData(e).loot:null}
  const m=/^[LS](lm(-?\d+)_(-?\d+))$/.exec(id);if(!m)return null;const L=landmarkAt(+m[2],+m[3]);if(!L)return null;return lootSpotsFor(L).find(s=>s.id===id)||null;
}
function addLootSpot(s){if(lootSpots.has(s.id)||S.loot[s.id])return;const g=mkCrate();if(s.table==='shrine'){g.visible=false}
  g.position.set(s.x,s.y!=null?s.y:groundHeight(s.x,s.z),s.z);scene.add(g);lootSpots.set(s.id,{...s,g})}
function removeLootSpot(id){const s=lootSpots.get(id);if(s){scene.remove(s.g);lootSpots.delete(id)}}
ACT.loot=(pid,a,predict,local,fail)=>{
  const s=lootDesc(a.id);if(!s||S.loot[a.id])return false;const p=posOf(pid),sy=s.y!=null?s.y:groundHeight(s.x,s.z);
  if(!p||Math.hypot(p.x-s.x,p.z-s.z)>4||Math.abs((p.y||sy)-sy)>5)return false;
  if(s.table==='shrine'&&!(S.shrines&&S.shrines[a.id.slice(1)]>=3))return fail('The shrine is sealed');
  if(predict)return true;
  S.loot[a.id]=true;const items=LOOT[s.table](mulberry(strHash(a.id)));for(const id in items)giveItem(pid,id,items[id]);
  if(s.table==='spire')revealArea(s.x,s.z,750);
  if(local){const list=Object.entries(items).map(([id,n])=>`${n} × ${ITEMS[id].name}`).join(', ');card(s.table==='shrine'?'The shrine opens':'Supplies recovered','Loot',list+(s.table==='spire'?'. From up here you can survey the land: your map is updated.':''),s.table==='shrine'?'#6fe0c8':'#ffd36f')}
  removeLootSpot(a.id);if(net.role==='host')net.snapDirty=true;return true;
};
/* ---------- ancient shrines: touch the three pylons ---------- */
function pylonsOf(L){return[0,1,2].map(i=>{const a=i/3*TAU+0.5;return{id:L.id+'_p'+i,x:L.x+Math.cos(a)*15,z:L.z+Math.sin(a)*15}})}
function mkPylon(){const g=new THREE.Group();g.add(mesh(rbox(0.9,2.4,0.9,0.2),'#2a2630',0,1.2,0));const c=new THREE.MeshStandardMaterial({color:'#3a3a44',emissive:'#6fe0c8',emissiveIntensity:0.1});
  g.add(mesh(shared('oct',()=>new THREE.OctahedronGeometry(1,0)),c,0,3,0));g.children[1].scale.setScalar(0.45);g.userData.c=c;return g}
ACT.pylon=(pid,a,predict)=>{
  const m=/^(lm(-?\d+)_(-?\d+))_p([0-2])$/.exec(a.id);if(!m)return false;const L=landmarkAt(+m[2],+m[3]);if(!L||L.type!=='ruin')return false;
  const py=pylonsOf(L)[+m[4]],p=posOf(pid);if(!p||Math.hypot(p.x-py.x,p.z-py.z)>4)return false;
  S.pylons=S.pylons||{};if(S.pylons[a.id])return false;if(predict)return true;
  S.pylons[a.id]=true;S.shrines=S.shrines||{};S.shrines[L.id]=(S.shrines[L.id]||0)+1;
  if(S.shrines[L.id]>=3){toast('The ancient shrine hums and opens!','good');sfx(2.5,200,0.6,0.12,'lowpass',0,900)}else toast(`Pylon awakened (${S.shrines[L.id]}/3)`,'good');
  if(net.role==='host')net.snapDirty=true;return true;
};
/* ---------- discovery ---------- */
function losClear(x0,y0,z0,x1,y1,z1){const d=Math.hypot(x1-x0,z1-z0),n=Math.ceil(d/15);for(let i=1;i<n;i++){const t=i/n,x=lerp(x0,x1,t),z=lerp(z0,z1,t),y=lerp(y0,y1,t);if(groundHeight(x,z)>y)return false}return true}
function revealArea(x,z,r){for(let i=Math.floor((x-r)/64);i<=Math.floor((x+r)/64);i++)for(let j=Math.floor((z-r)/64);j<=Math.floor((z+r)/64);j++)if(Math.hypot(i*64+32-x,j*64+32-z)<r)S.explored[i+','+j]=1;
  for(const L of landmarksNear(x,z,r)){S.landmarks[L.id]=S.landmarks[L.id]||{};S.landmarks[L.id].seen=true}if(typeof mapC0!=='undefined')mapC0=null}
ACT.discover=(pid,a,predict)=>{
  if(predict)return true;const p=posOf(pid);if(!p)return false;
  if(a.kind==='landmark'){const L=landmarksNear(p.x,p.z,60).find(l=>l.id===a.id);if(!L)return false;S.landmarks[L.id]=S.landmarks[L.id]||{};if(S.landmarks[L.id].visited)return false;S.landmarks[L.id].visited=S.landmarks[L.id].seen=true;S.res.rp+=6;return true}
  if(a.kind==='cave'){const e=entrancesNear(p.x,p.z,800).find(e=>e.id===a.id);if(!e)return false;S.caves[a.id]=S.caves[a.id]||{};if(S.caves[a.id].rp)return false;S.caves[a.id].rp=true;const D=caveData(e);S.res.rp+=MYST[D.myst].rp;S.flags.caveMystery=true;return true}
  return false;
};
let curRegion=null;
const ADJ=['Rust','Ochre','Crimson','Ashen','Whispering','Shattered','Silent','Copper','Ember','Hollow','Iron','Pale'];
function regionAt(x,z){const gx=Math.floor(x/700),gz=Math.floor(z/700),cx=(gx+0.5)*700,cz=(gz+0.5)*700;sample(cx,cz,TS3);
  const n=hashI(gx,gz,SITE.seed+31),noun=TS3.ice>0.5?'Frost Flats':TS3.mtn>0.12?['Ridges','Highlands'][n%2]:TS3.crater>0.15?'Craterlands':TS3.dune>0.25?['Dunes','Sand Sea'][n%2]:['Plains','Expanse','Flats'][n%3];
  return{id:gx+','+gz,name:(Math.hypot(cx,cz)<500?SITE.name.split(' ')[0]+' ':ADJ[n%ADJ.length]+' ')+noun}}
function banner(title,sub){const b=$('#banner');b.innerHTML=`<div class="bt">${esc(title)}</div>${sub?`<div class="bs">${esc(sub)}</div>`:''}`;b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
function worldTick(dt){
  if(!S)return;const f=focusPos();
  if((game.worldT=(game.worldT||0)-dt)<=0){game.worldT=0.5;
    // explored cells (fog of war)
    for(let i=Math.floor((f.x-140)/64);i<=Math.floor((f.x+140)/64);i++)for(let j=Math.floor((f.z-140)/64);j<=Math.floor((f.z+140)/64);j++)if(Math.hypot(i*64+32-f.x,j*64+32-f.z)<150)S.explored[i+','+j]=1;
    const eye=new THREE.Vector3(f.x,f.y+1.8,f.z);
    for(const L of landmarksNear(f.x,f.z,700)){
      const st=S.landmarks[L.id]||(S.landmarks[L.id]={}),d=Math.hypot(L.x-f.x,L.z-f.z),ly=groundHeight(L.x,L.z)+(L.type==='spire'?2:6);
      if(!st.seen&&!cave.active&&d<340&&(d<60||losClear(eye.x,eye.y,eye.z,L.x,ly,L.z))){st.seen=true;if(d>60)toast(`You spot something in the distance: ${LM_INFO[L.type].label.toLowerCase()}`)}
      if(!st.visited&&d<(L.type==='spire'?10:28)&&Math.abs(f.y-groundHeight(L.x,L.z))<(L.type==='spire'?4:30)){act({a:'discover',id:L.id,kind:'landmark'});st.visited=st.seen=true;banner(L.name,'Discovered · '+LM_INFO[L.type].label);SFX.radio();
        crewSay('Planetary Scientist',{wreck:'A crash site! Salvage anything you can. There may be a log aboard.',outpost:'An abandoned station. I wonder what happened to the crew. Check their terminals and lockers.',ruin:'Those structures aren’t natural. Look for the three pylons around it.',village:'Tharrak homes. Be respectful: wave (V) before you get close.',spire:'Nice climb! Get the survey cache up there and look around.'}[L.type])}
      // stream meshes
      if(d<520&&!lmMeshes.has(L.id)){const g=LM_MAKERS[L.type](mulberry(L.seed));g.position.set(L.x,groundHeight(L.x,L.z)-(L.type==='wreck'?0.6:0.1),L.z);g.rotation.y=(L.seed%628)/100;scene.add(g);
        const extra=[];if(L.type==='ruin')for(const py of pylonsOf(L)){const m=mkPylon();m.position.set(py.x,groundHeight(py.x,py.z),py.z);m.userData.id=py.id;scene.add(m);extra.push(m)}
        lmMeshes.set(L.id,{g,extra,L,solids:lmSolids(g,L),fb:{g,x:L.x,z:L.z,y:g.position.y,rot:g.rotation.y,progress:1,type:'_lm'}});for(const s of lootSpotsFor(L))addLootSpot(s);
        if(L.type==='ruin')for(let k=0;k<3;k++){const a=k/3*TAU+1.6;const dd={id:`l${L.id}_${k}`,type:'alloy',x:L.x+Math.cos(a)*6,z:L.z+Math.sin(a)*6,max:3};addDepMesh(dd)}}
      else if(d>650&&lmMeshes.has(L.id)){const M=lmMeshes.get(L.id);scene.remove(M.g);for(const e of M.extra)scene.remove(e);lmMeshes.delete(L.id);for(const s of lootSpotsFor(L))removeLootSpot(s.id);for(let k=0;k<3;k++)removeDepMesh(`l${L.id}_${k}`)}
    }
    // region banners
    const rg=regionAt(f.x,f.z);if(!curRegion||curRegion.id!==rg.id){const first=!(S.regions||(S.regions={}))[rg.id];S.regions[rg.id]=1;if(curRegion&&first&&!cave.active&&!P.inside)banner(rg.name,'');curRegion=rg}
    for(const[id,s]of lootSpots){if(S.loot[id])removeLootSpot(id);else if(s.table==='shrine'){const lid=id.slice(1);s.g.visible=!!(S.shrines&&S.shrines[lid]>=3)}}
    syncCaches();crewContext();
  }
  for(const M of lmMeshes.values()){if(M.g.userData.core){M.g.userData.core.rotation.y+=dt;M.g.userData.core.position.y=(M.L.type==='ruin'?10:1.5)+Math.sin(now*1.5)*0.3}
    for(const e of M.extra){const on=S.pylons&&S.pylons[e.userData.id];e.userData.c.emissiveIntensity=on?2.2:0.1+0.1*Math.sin(now*3)}
    if(M.g.userData.blink)M.g.userData.blink[0].visible=(now%1.4)<0.7}
  if(P.mode==='rover')P.bat=Math.min(100,P.bat+dt*5);
}
/* ---------- datapads & tablets ---------- */
const LOGS=[
  'Day 14. Dust got into the drill bearings again. We switched to the spare and kept coring. The ice is closer than the orbital maps said.',
  'Something walked past the habitat last night. Three legs, taller than the airlock. It stopped, looked at the window, and left. Nobody believes me.',
  'The glyphs on the old stones change in the evening light. Kenji thinks they’re a calendar. I think they’re a warning.',
  'Supply drop missed by four kilometres. We followed the beacon through the dunes and the ground moved under the rover. We didn’t stop to look.',
  'Down in the tube the walls glow blue where the floaters gather. They don’t seem to mind us. One followed me all the way to the surface.',
  'Last entry. We’re evacuating to orbit. The station is yours if you want it: the seals are good, the solar arrays just need cleaning.'];
function readDatapad(){
  const i=(S.logsRead=(S.logsRead||0))%LOGS.length;S.logsRead++;
  const f=focusPos();let tgt=null,bd=1e9;
  for(const L of landmarksNear(f.x,f.z,1500)){const st=S.landmarks[L.id];if(st&&st.seen)continue;const d=Math.hypot(L.x-f.x,L.z-f.z);if(d<bd){bd=d;tgt=L}}
  let extra='';if(tgt){revealArea(tgt.x,tgt.z,120);extra=` The log includes coordinates: a ${LM_INFO[tgt.type].label.toLowerCase()} ${fmtDist(bd)} to the ${compassWord(tgt.x-f.x,tgt.z-f.z)} is now on your map.`}
  card('Recovered log','Datapad',LOGS[i]+extra,'#7fd3ff');
}
function studyTablet(){const n=typeof learnWords==='function'?learnWords('tharrak',3):0;card('Glyph tablet','Language',n?`You work out ${n} new words of the Tharrak language. Their speech will make more sense now.`:'You already know every word on this tablet.','#6fe0c8')}
function exploreHint(){const f=focusPos();let best=null,bd=1e9;for(const L of landmarksNear(f.x,f.z,1600)){const st=S.landmarks[L.id];if(st&&st.visited)continue;const d=Math.hypot(L.x-f.x,L.z-f.z);if(d<bd){bd=d;best=L}}
  if(!best)return'Nothing new nearby on our scans. Push further out.';const st=S.landmarks[best.id];
  return st&&st.seen?`You spotted a ${LM_INFO[best.type].label.toLowerCase()} about ${fmtDist(bd)} ${compassWord(best.x-f.x,best.z-f.z)} of you. Go take a look.`:`Orbital imagery hints at something ${compassWord(best.x-f.x,best.z-f.z)} of you, roughly ${fmtDist(Math.round(bd/100)*100)} away. Climb high ground and look.`}
/* ---------- suit damage, death & lost caches ---------- */
function hurt(n,cause){
  if(game.dead||game.state!=='play'||n<=0)return;if(S.ups&&S.ups.u_armor)n*=0.8;if(buffOn('armor'))n*=0.5;n*=dmgMul();P.hp=Math.max(0,P.hp-n);
  const h=$('#hurtfx');h.classList.remove('on');void h.offsetWidth;h.classList.add('on');sfx(0.25,220,0.8,0.12,'lowpass');
  if(P.hp<=0)die(cause);
}
const DEATH={thirst:'You ran out of water.',hunger:'You went too long without food.',oxygen:'Your suit ran out of oxygen.',fall:'You fell too far.',creature:'Hostile creatures overwhelmed you.',storm:'The storm shredded your suit.',rock:'Falling rock crushed your suit.',crash:'The crash was too much for your suit.',cold:'The cold froze your suit’s systems.',radiation:'The radiation dose was too high.'};
async function die(cause){
  if(game.dead)return;game.dead=true;mouse.drag=false;
  act({a:'die',x:P.pos.x,y:P.pos.y,z:P.pos.z});syncCaches();
  fade(true,(DEATH[cause]||'Suit failure.')+' The crew brings you home…');await wait(1800);
  const hb=home(),a=hb.rot||0;P.mode='foot';astro.visible=true;P.pos.set(hb.x+Math.sin(a)*8.5,0,hb.z+Math.cos(a)*8.5);P.pos.y=groundHeight(P.pos.x,P.pos.z);P.vel.set(0,0,0);P.lastG=undefined;
  P.hp=maxHP()*0.7;P.o2=100;P.food=Math.max(P.food,60);P.water=Math.max(P.water,60);P.ragdoll=null;if(typeof outfitFor==='function')outfitFor(false);P.inside=false;if(INT.g)INT.g.visible=false;astro.rotation.set(0,0,0);P.buffs={};renderBuffs(true);P.bat=Math.max(P.bat,60);P.stam=100;game.camSnap=true;game.dead=false;refreshInvUI();onHotbarChange();
  if(net.role!=='guest'||P.mode==='rover')roverHome();
  fade(false);card('You made it back','Your body','Your suit and everything in your backpack are still where you fell, and the rover has been driven back to base. Follow the red “Your body” marker on the compass and press F at your body to collect your things.','#ff6b5e');
}
ACT.die=(pid,a,predict)=>{
  if(predict)return true;const inv=invOf(pid),items=[];if(!inv)return false;
  for(let i=0;i<inv.length;i++){const s=inv[i];if(s&&!ITEMS[s.id].dur){items.push(s);inv[i]=null}}
  {const p=posOf(pid)||{x:a.x,y:a.y,z:a.z};S.lostCaches=S.lostCaches.filter(c=>!(c.owner===(pid||ME)&&!c.items.length));S.lostCaches.push({id:'lc'+Date.now().toString(36)+Math.floor(Math.random()*1e4),owner:pid||ME,x:p.x,y:p.y,z:p.z,items});if(S.lostCaches.length>8)S.lostCaches.shift()}
  if(net.role==='host')net.snapDirty=true;return true;
};
ACT.cacheTake=(pid,a,predict)=>{
  const i=S.lostCaches.findIndex(c=>c.id===a.id);if(i<0)return false;const c=S.lostCaches[i],p=posOf(pid);
  if(c.owner!==(pid||ME)||!p||Math.hypot(p.x-c.x,p.z-c.z)>4)return false;if(predict)return true;
  S.lostCaches.splice(i,1);for(const s of c.items)giveItem(pid,s.id,s.n,s);if(pid===ME||!pid)toast(c.items.length?'You collected your belongings':'You recovered your suit','good');if(net.role==='host')net.snapDirty=true;return true;
};
const cacheMeshes=new Map();
function syncCaches(){const mine=S.lostCaches.filter(c=>c.owner===(net.role==='guest'?net.token:ME)||net.role!=='guest'&&c.owner===ME),ids=new Set(mine.map(c=>c.id));
  for(const[id,m]of cacheMeshes)if(!ids.has(id)){scene.remove(m);cacheMeshes.delete(id)}
  for(const c of mine)if(!cacheMeshes.has(c.id)){const g=new THREE.Group();
    // your body, lying where you fell, in your own suit colours
    const body=mkAstronaut();applyLookTo(body,NO_ROVER,LOOK);body.traverse(o=>{if(o.isSpotLight)o.intensity=0});body.rotation.set(-Math.PI/2,0,(c.id.charCodeAt(3)%7)*0.6,'YXZ');body.position.y=0.42;g.add(body);
    g.add(sp(0.2,glow('#ff6b5e',1.8),0,2.1,0,10,8));const b=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,40,6,1,true),new THREE.MeshBasicMaterial({color:'#ff9147',transparent:true,opacity:0.3,blending:THREE.AdditiveBlending,depthWrite:false}));b.position.y=20;g.add(b);g.position.set(c.x,c.y,c.z);scene.add(g);cacheMeshes.set(c.id,g)}}
// after a death the rover is driven back and parked beside the base
function roverHome(){const hb=home(),a=(hb.rot||0)+0.9;R.pos.set(hb.x+Math.sin(a)*16,0,hb.z+Math.cos(a)*16);R.pos.y=groundHeight(R.pos.x,R.pos.z);
  Object.assign(R,{speed:0,vy:0,vx:0,vz:0,wp:0,wr:0,wy:0,air:false,upside:false,upT:0,pitch:0,roll:0,cruise:false,cruiseV:0,visY:R.pos.y,lastG:R.pos.y,yaw:a+Math.PI/2})}
/* ---------- F-key interactions for world objects ---------- */
const wprog={id:null,t:0};
function worldInteract(hints,holdF,dt){
  if(P.mode!=='foot')return null;let ring=null;const p=P.pos;
  const hold=(id,need,label,fn)=>{if(holdF){if(wprog.id!==id){wprog.id=id;wprog.t=0}wprog.t+=dt;ring={p:wprog.t/need,l:label};if(wprog.t>=need){wprog.t=0;wprog.id=null;fn()}}else if(wprog.id===id)wprog.t=0};
  const N=typeof nearMystery==='function'?nearMystery():null;
  if(N&&!(S.caves[N.D.e.id]&&S.caves[N.D.e.id].myst)){hints.unshift(`<span class="key">F</span>Hold to study the ${MYST[N.D.myst].name}`);hold('myst',3,'Studying…',()=>studyMystery(N))}
  for(const s of lootSpots.values()){if(!s.g.visible)continue;const sy=s.g.position.y;if(Math.hypot(s.x-p.x,s.z-p.z)<2.6&&Math.abs(sy-p.y)<3){hints.unshift('<span class="key">F</span>Hold to open the supply crate');hold(s.id,1.2,'Opening…',()=>{act({a:'loot',id:s.id});sfx(0.4,800,1,0.06,'bandpass',0,300)});break}}
  for(const M of lmMeshes.values())for(const e of M.extra){const id=e.userData.id;if(S.pylons&&S.pylons[id])continue;if(Math.hypot(e.position.x-p.x,e.position.z-p.z)<3){hints.unshift('<span class="key">F</span>Hold to touch the pylon');hold(id,1.5,'The pylon responds…',()=>act({a:'pylon',id}))}}
  for(const c of S.lostCaches)if(cacheMeshes.has(c.id)&&Math.hypot(c.x-p.x,c.z-p.z)<2.5)hints.unshift((c.items.length?'<span class="key">F</span>Collect your belongings from your body':'<span class="key">F</span>Recover your suit'));
  if(nearestLamp())hints.push('<span class="key">F</span>Pick up the lamp');
  if(typeof alienInteract==='function'){const r2=alienInteract(hints,holdF,dt);if(r2)ring=r2}
  if(typeof feedHint==='function')feedHint(hints);
  return ring;
}
function worldPressF(){
  if(P.mode!=='foot')return false;
  for(const c of S.lostCaches)if(cacheMeshes.has(c.id)&&Math.hypot(c.x-P.pos.x,c.z-P.pos.z)<2.5){act({a:'cacheTake',id:c.id});return true}
  if(typeof alienPressF==='function'&&alienPressF())return true;
  if(typeof feedPressF==='function'&&feedPressF())return true;
  const l=nearestLamp();if(l){act({a:'lampTake',id:l.id});return true}
  return false;
}
function clearWorld(){for(const M of lmMeshes.values()){scene.remove(M.g);for(const e of M.extra)scene.remove(e)}lmMeshes.clear();for(const id of[...lootSpots.keys()])removeLootSpot(id);for(const m of cacheMeshes.values())scene.remove(m);cacheMeshes.clear();lmMemo.clear();curRegion=null}
