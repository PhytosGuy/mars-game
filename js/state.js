'use strict';

/* =========================================================
   STATE
   ========================================================= */
let S=null;const blds=[];let landers=[];let staticLander=null;let bid=0;
const SAVE_KEY='mars-last-colony-save-v3',OLD_SAVE_KEY='mars-last-colony-save-v1',SAVE_VERSION=3;
const game={state:'title',paused:false,hudHidden:false,poiT:0,objT:0,hudT:0,saveT:30,introT:0,cmpT:0};
function newState(site,mode){
  const sb=mode==='sandbox';
  return{site,mode,time:7.0,res:{o2:25,water:80,food:45,mat:sb?9999:20,rp:sb?999:0},battery:40,cap:40,
    crew:4,crewList:CREW0.map(c=>({...c})),research:new Set(sb?RESEARCH.map(r=>r.id):[]),
    scanned:new Set(),sampled:new Set(),discovered:new Set(),scannedTypes:{},samples:[],labQueue:[],labProg:0,analyzed:[],log:[],
    chapter:0,mission:sb?null:0,objDone:new Set(),flags:{blasterGiven:true},settings:{difficulty:'normal',day:'normal',weather:'normal',creatures:'normal'},worldName:'',stats:{roverDist:0,walkDist:0},
    storm:{level:0,active:false,start:0,dur:0,int:1},nextStorm:7+SOL_H*1.5,nextSupply:SOL_H*2+10.5,nextFault:SOL_H*1.3,nextSPE:SOL_H*3.4,
    spe:{active:false,until:0,warned:false},crewLanderAt:null,waypoint:null,sustain:0,dose:0,zeroT:0,
    rates:{o2:0,water:0,food:0,mat:0},powerNet:0,powerProd:0,powerDemand:0,brownout:false,roverKW:0,over:false,
    inv:starterInv(sb),storage:starterStorage(sb),depleted:{},extraDeps:[],lamps:[],guests:{},ups:{},
    rep:{tharrak:0,lumari:0},lang:{tharrak:[],lumari:[]},explored:{},landmarks:{},caves:{},loot:{},lostCaches:[],requests:{}};
}
function starterInv(sb){const a=newSlots(INV_SIZE);
  const put=(i,id,n,meta)=>{a[i]=mkStack(id,n,meta)};
  put(0,'drill1',1);put(1,'blaster',1);put(2,'flare',4);put(3,'lamp',2);put(4,'o2can',2);put(5,'cell',2);put(6,'patch',2);
  if(sb){put(7,'drill2',1);put(8,'cutter',1);let i=HOTBAR;for(const id of['prod','plate','glass','circuit','brick','tiplate','alloy','resonite','titanium','iron','silica','crystal','chitin','scale','decoder'])a[i++]=mkStack(id,stackOf(id))}
  return a}
function starterStorage(sb){const a=newSlots(STORE_SIZE);if(sb)return a;
  slotsAdd(a,'plate',14);slotsAdd(a,'glass',8);slotsAdd(a,'circuit',6);slotsAdd(a,'brick',12);slotsAdd(a,'regolith',10);slotsAdd(a,'o2can',2);return a}
// the first mission is the colony setup: until it's done the rover stays parked and you stay near the base
const SETUP_R=130;
function setupDone(){if(!S||S.mode==='sandbox'||S.flags.setupDone)return true;if((S.flags&&S.flags.mdone0)||(count('solar')>=5&&count('moxie')>=1)){S.flags.setupDone=true;return true}return false}
function count(t){let n=0;for(const b of blds)if(b.type===t&&b.progress>=1)n++;return n}
/* ---------- world options chosen when the expedition was created ---------- */
const WS=()=>(S&&S.settings)||{};
const DAY_LOCK={day:12.4,night:0.6};                                     // 'always day' / 'always night' freeze the clock's time of day
const tod=()=>{const l=DAY_LOCK[WS().day];return l!=null?l:S.time%SOL_H}, solNum=()=>Math.floor(S.time/SOL_H)+1;
const dayMul=()=>({short:2,long:0.5}[WS().day]||1);                   // how fast a sol passes
const dmgMul=()=>({easy:0.5,hard:1.5}[WS().difficulty]||1);            // damage you take
const o2Diff=()=>({easy:0.7,hard:1.3}[WS().difficulty]||1);            // how fast your suit uses oxygen
function wxGap(hours){const w={off:0,rare:0.45,frequent:2.2}[WS().weather];const m=w===undefined?1:w;return m<=0?1e12:hours/m} // time until the next disaster
// the base is a safe zone: hostiles, dust devils and meteors stay out of this radius around any habitat
const SAFE_R=75;
function nearestHabDist(x,z){let d=1e9;for(const b of blds)if(b.type==='habitat')d=Math.min(d,Math.hypot(b.x-x,b.z-z));return d}
function nearestHabitat(x,z){let best=null,d=1e9;for(const b of blds)if(b.type==='habitat'){const k=Math.hypot(b.x-x,b.z-z);if(k<d){d=k;best=b}}return best}
function home(){return blds.find(b=>b.type==='habitat')||{x:0,z:0}}
function sampleCap(){return S.research.has('rovercell')?6:3}
function temperature(){const[lo,hi]=SITE.temp,k=0.5+0.5*Math.cos((tod()-14.2)/SOL_H*TAU);let T=lo+(hi-lo)*Math.pow(k,1.3);return lerp(T,(lo+hi)/2,S.storm.level*0.45)-(S.cold?S.cold.level*25:0)}
function pressure(){return 610+22*Math.sin(S.time/SOL_H*0.11)-9*Math.cos(tod()/SOL_H*TAU)+S.storm.level*14}
function windSpeed(){return 4+3*(N1(S.time*0.05,3)*0.5+0.5)+S.storm.level*24}

/* =========================================================
   BUILDINGS
   ========================================================= */
function footY(x,z,r){let m=groundHeight(x,z);for(let i=0;i<6;i++){const a=i/6*TAU;m=Math.min(m,groundHeight(x+Math.cos(a)*r*0.6,z+Math.sin(a)*r*0.6))}return m-0.05}
function nearestGrid(x,z,exclude){let best=null,bd=1e9;for(const b of blds){if(b===exclude||BUILD[b.type].remote)continue;const d=Math.hypot(b.x-x,b.z-z);if(d<bd){bd=d;best=b}}return best?{b:best,d:bd}:null}
const cableMat=new THREE.MeshStandardMaterial({color:'#2e2622',roughness:0.8});
function mkCable(x1,z1,x2,z2){
  const pts=[];const n=Math.max(4,Math.ceil(Math.hypot(x2-x1,z2-z1)/3));
  for(let i=0;i<=n;i++){const t=i/n,x=lerp(x1,x2,t),z=lerp(z1,z2,t);pts.push(new THREE.Vector3(x,groundHeight(x,z)+0.15,z))}
  const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),n*2,0.07,4,false),cableMat);m.receiveShadow=true;scene.add(m);return m;
}
function addBuilding(type,x,z,rot,progress,opts={}){
  const d=BUILD[type],g=MAKERS[type]();
  const y=footY(x,z,d.r);g.position.set(x,y,z);g.rotation.y=rot;
  if(d.solid!==false&&type!=='beacon'&&type!=='weather'){const f=cy(d.r*0.72,d.r*0.78,4,8,'#6b4a3a',0,-2.0,0);f.castShadow=false;g.add(f)}
  scene.add(g);
  const b={id:opts.id||++bid,type,x,z,rot,y,g,progress,dust:opts.dust||0,on:opts.on!==false,powered:true,fault:opts.fault||null,cable:null,fm:null,buried:opts.buried||0};
  if(progress<1)g.scale.set(1,0.03,1);
  if(!d.remote){const p=nearestGrid(x,z,b);if(p&&p.d<90)b.cable=mkCable(p.b.x,p.b.z,x,z)}
  if(typeof clearRocksUnder==='function')clearRocksUnder(b);           // no boulders poking through the floor
  if(opts.id)bid=Math.max(bid,opts.id);
  if(b.fault)addFaultMarker(b);
  blds.push(b);return b;
}
function disposeObj(o){o.traverse(c=>{if(c.geometry&&c.geometry!==rockGeo&&!c.geometry.userData.shared)c.geometry.dispose()})}
function removeBuilding(b){
  scene.remove(b.g);disposeObj(b.g);
  if(b.cable){scene.remove(b.cable);b.cable.geometry.dispose()}
  if(b.fm){scene.remove(b.fm)}
  blds.splice(blds.indexOf(b),1);
}
const faultGeo=new THREE.OctahedronGeometry(0.7,0),faultMat=new THREE.MeshBasicMaterial({color:'#ff4a3d',fog:false});
function addFaultMarker(b){const m=new THREE.Mesh(faultGeo,faultMat);m.position.set(b.x,b.y+7,b.z);scene.add(m);b.fm=m}
function clearAll(){
  if(typeof resetExpansion==='function')resetExpansion();
  while(blds.length)removeBuilding(blds[0]);
  for(const l of landers){scene.remove(l.g);disposeObj(l.g)}landers=[];
  if(staticLander){scene.remove(staticLander);disposeObj(staticLander);staticLander=null}
  resetPOIs();
  if(typeof clearDeposits==='function'){clearDeposits();clearDrones();for(const id of[...pickups.keys()])removePickup(id);for(const f of flares)scene.remove(f.m);flares.length=0}
  if(typeof lampMeshes!=='undefined'){for(const m of lampMeshes.values())scene.remove(m);lampMeshes.clear()}
}
function updateBuildingsFX(dt){
  const t=now;
  for(const b of blds){
    const u=b.g.userData;
    if(b.progress<1)continue; // construction drones handle unfinished structures
    const active=b.powered&&b.on&&!(b.fault&&b.fault.kind==='jam');
    if(u.blink)for(let i=0;i<u.blink.length;i++)u.blink[i].visible=active&&((t*1.3+i*0.13+b.id*0.37)%1)<0.55;
    if(u.spin&&active)for(const s of u.spin)s.o.rotation.y+=dt*s.s;
    if(u.pivot){
      const sd=ENV.sunDir;
      if(sd.y>0.02&&!b.fault&&!S.stowed){_v1.set(sd.x,Math.max(sd.y,0.3),sd.z).normalize()}else _v1.set(0,1,0);
      _q.setFromUnitVectors(_v2.set(0,1,0),_v1);
      const inv=new THREE.Quaternion().setFromAxisAngle(_v2,-b.rot);
      u.pivot.quaternion.slerp(inv.multiply(_q),damp(1.5,dt));
      u.pmat.color.setRGB(lerp(0.018,0.42,b.dust),lerp(0.04,0.22,b.dust),lerp(0.2,0.12,b.dust));
    }
    if(b.fm){b.fm.rotation.y+=dt*2;b.fm.position.y=b.y+7+Math.sin(t*3)*0.3}
  }
}
