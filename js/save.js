'use strict';
/* =========================================================
   SAVE / LOAD (versioned, validated, with a backup slot)
   ========================================================= */
const BACKUP_KEY=SAVE_KEY+'-backup';
/* ---------- expeditions: every world has its own save slot (plus a backup) and a line in the list ---------- */
const WORLDS_KEY='mlc-worlds',wKey=id=>'mlc-world-'+id;
let curWorld=null;
function worldsList(){try{const l=JSON.parse(localStorage.getItem(WORLDS_KEY));return Array.isArray(l)?l.filter(w=>w&&typeof w.id==='string'):[]}catch(e){return[]}}
function saveWorldsList(l){try{localStorage.setItem(WORLDS_KEY,JSON.stringify(l))}catch(e){}}
const newWorldId=()=>Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);
function worldMeta(d,id,name){const s=d.S||{};return{id,name:String(name||s.worldName||'Expedition').slice(0,28),site:d.site,mode:d.mode==='sandbox'?'sandbox':'survival',created:d.created||d.saved||Date.now(),played:d.saved||Date.now(),
  sol:Math.floor((+s.time||0)/SOL_H)+1,missions:+s.chapter||0,settings:s.settings||{difficulty:'normal',day:'normal',weather:'normal',creatures:'normal'}}}
function upsertWorld(meta){const l=worldsList(),i=l.findIndex(w=>w.id===meta.id);if(i>=0)l[i]=Object.assign(l[i],meta);else l.unshift(meta);saveWorldsList(l)}
function deleteWorld(id){try{localStorage.removeItem(wKey(id));localStorage.removeItem(wKey(id)+'-b')}catch(e){}saveWorldsList(worldsList().filter(w=>w.id!==id));if(curWorld===id)curWorld=null}
// one-time: turn the old single save into the first expedition in the list
(function migrateSaves(){try{if(localStorage.getItem(WORLDS_KEY))return;const l=[];
  for(const k of[SAVE_KEY,SAVE_KEY+'-backup',OLD_SAVE_KEY]){const raw=localStorage.getItem(k);if(!raw)continue;let d;try{d=JSON.parse(raw)}catch(e){continue}if(!validSave(d))continue;
    const id=newWorldId();localStorage.setItem(wKey(id),raw);l.push(worldMeta(d,id,'My expedition'));break}
  saveWorldsList(l)}catch(e){}})();
function hasSave(){return worldsList().length>0}
function serializeData(){
  const pp=P.pos;
  const s={...S,research:[...S.research],scanned:[...S.scanned],sampled:[...S.sampled],discovered:[...S.discovered],objDone:[...S.objDone]};
  delete s.radioLog;
  return{v:SAVE_VERSION,saved:Date.now(),site:S.site,mode:S.mode,S:s,dig:[...digMap].map(([k,v])=>[k,Math.round(v*100)/100]),mined:[...minedRocks],
    blds:blds.map(b=>({id:b.id,t:b.type,x:b.x,z:b.z,r:b.rot,p:b.progress,d:b.dust,on:b.on,f:b.fault})),
    P:{x:pp.x,y:pp.y,z:pp.z,mode:P.mode,o2:P.o2,hp:P.hp,bat:P.bat,yaw:P.yaw,hot:P.hot},R:{x:R.pos.x,z:R.pos.z,yaw:R.yaw,bat:R.battery},cam:cam.yaw};
}
function saveGame(silent){
  if(!S||S.over||game.state!=='play'||net.role==='guest'||game.dead)return;
  if(!curWorld)curWorld=newWorldId();
  try{const data=serializeData(),json=JSON.stringify(data),k=wKey(curWorld),prev=localStorage.getItem(k);if(prev)localStorage.setItem(k+'-b',prev);localStorage.setItem(k,json);
    const old=worldsList().find(w=>w.id===curWorld);upsertWorld(Object.assign(worldMeta(data,curWorld,S.worldName),{created:old?old.created:Date.now()}));if(!silent)toast('Game saved','good')}
  catch(e){if(!silent)toast('Could not save: browser storage is full or unavailable','warn')}
}
function loadGame(id){
  if(!id)return false;
  for(const key of[wKey(id),wKey(id)+'-b']){let data=null;try{data=JSON.parse(localStorage.getItem(key))}catch(e){data=null}
    if(data&&validSave(data)){if(key!==wKey(id))toast('The latest save was damaged: restored the backup','warn');if(loadFromData(data)){curWorld=id;const m=worldsList().find(w=>w.id===id);if(m&&!S.worldName)S.worldName=m.name;return true}}}
  return false;
}
function validSave(d){return d&&typeof d==='object'&&SITES[d.site]&&d.S&&typeof d.S==='object'&&Array.isArray(d.blds)&&d.P&&Number.isFinite(d.P.x)&&Number.isFinite(d.P.z)}
const fin=(v,d,a=-1e9,b=1e9)=>Number.isFinite(v)?clamp(v,a,b):d;
function loadFromData(data){
  if(!validSave(data))return false;
  try{
    clearAll();initSite(data.site);
    for(const e of Array.isArray(data.dig)?data.dig:[])if(Array.isArray(e)&&Number.isFinite(e[0])&&Number.isFinite(e[1]))digMap.set(e[0],clamp(e[1],-6,0));
    for(const k of Array.isArray(data.mined)?data.mined:[])if(typeof k==='string')minedRocks.add(k);
    const mode=data.mode==='sandbox'?'sandbox':'survival';/* older saves called survival 'story' */const base=newState(data.site,mode),d=data.S;
    S=Object.assign(base,d);S.mode=mode;
    {const ok={difficulty:['easy','normal','hard'],day:['short','normal','long','day','night'],weather:['off','rare','normal','frequent'],creatures:['peaceful','normal','lots']},src=d.settings&&typeof d.settings==='object'?d.settings:{};
     S.settings={};for(const k in ok)S.settings[k]=ok[k].includes(src[k])?src[k]:'normal';S.worldName=typeof d.worldName==='string'?d.worldName.slice(0,28):''}
    for(const k of['research','scanned','sampled','discovered','objDone'])S[k]=new Set(Array.isArray(d[k])?d[k]:[]);
    for(const k of['o2','water','food','rp'])S.res[k]=fin(S.res[k],base.res[k],0);
    S.time=fin(S.time,7,0);S.chapter=fin(S.chapter,0,0,CHAPTERS.length);S.crew=fin(S.crew,4,0,100000);
    // v1 saves had a single “materials” number: turn it into storage items
    if(!Array.isArray(d.inv)){S.inv=starterInv(mode==='sandbox');S.storage=starterStorage(mode==='sandbox');const m=fin(d.res&&d.res.mat,0,0,1e6);if(m>0&&mode!=='sandbox')storeItems({plate:Math.round(m/6),brick:Math.round(m/6),glass:Math.round(m/10),circuit:Math.round(m/12)})}
    else{S.inv=cleanSlots(d.inv,INV_SIZE);S.storage=cleanSlots(d.storage,STORE_SIZE)}
    if(!S.flags.blasterGiven){S.flags.blasterGiven=true;if(!S.inv.some(s=>s&&s.id==='blaster')&&!S.storage.some(s=>s&&s.id==='blaster'))slotsAdd(S.inv,'blaster',1)}
    for(const k of['depleted','landmarks','caves','loot','explored','guests','ups','requests'])if(!S[k]||typeof S[k]!=='object'||Array.isArray(S[k]))S[k]=base[k];
    for(const k in S.guests){const g=S.guests[k];if(!g||typeof g!=='object')delete S.guests[k];else{g.inv=cleanSlots(g.inv,INV_SIZE);g.name=String(g.name||'Crewmate').slice(0,20)}}
    for(const k of['extraDeps','extraPOIs','lamps','lostCaches','facts'])if(!Array.isArray(S[k]))S[k]=[];S.facts=S.facts.filter(i=>Number.isInteger(i)&&NASA_FACTS[i]);
    S.rep={tharrak:fin(S.rep&&S.rep.tharrak,0,-100,100),lumari:fin(S.rep&&S.rep.lumari,0,-100,100)};
    S.lang={tharrak:Array.isArray(S.lang&&S.lang.tharrak)?S.lang.tharrak.filter(w=>WORDS.includes(w)):[],lumari:Array.isArray(S.lang&&S.lang.lumari)?S.lang.lumari.filter(w=>WORDS.includes(w)):[]};
    // missions: older saves completed chapters in order, so mark those done and track the next one
    for(let i=0;i<S.chapter&&i<CHAPTERS.length;i++)S.flags['mdone'+i]=true;
    if(!('mission' in d))S.mission=S.chapter<CHAPTERS.length&&mode!=='sandbox'?S.chapter:null;
    if(S.mission!==null&&!(Number.isInteger(S.mission)&&CHAPTERS[S.mission]))S.mission=null;
    if(S.mission!=null&&S.flags['mdone'+S.mission]){const nx=CHAPTERS.findIndex((_,j)=>!S.flags['mdone'+j]);S.mission=nx>=0?nx:null}
    S.over=false;S.storm=S.storm&&typeof S.storm==='object'?S.storm:base.storm;
    bid=0;for(const b of data.blds)if(b&&BUILD[b.t]&&Number.isFinite(b.x)&&Number.isFinite(b.z))addBuilding(b.t,b.x,b.z,fin(b.r,0),fin(b.p,1,0,1),{id:b.id,dust:fin(b.d,0,0,1),on:b.on!==false,fault:b.f||null});
    if(!blds.some(b=>b.type==='habitat'))addBuilding('habitat',0,0,0,1);
    spawnStaticLander();
    const p=data.P;P.mode=p.mode==='rover'?'rover':'foot';P.o2=fin(p.o2,100,0,100);P.hp=fin(p.hp,100,1,200);P.bat=fin(p.bat,100,0,100);P.yaw=fin(p.yaw,0);P.hot=fin(p.hot,0,0,8)|0;
    P.pos.set(p.x,0,p.z);P.pos.y=Number.isFinite(p.y)?p.y:groundHeight(p.x,p.z);P.vel.set(0,0,0);P.lastG=undefined;
    const r=data.R||{};R.pos.set(fin(r.x,-6),0,fin(r.z,17));R.pos.y=groundHeight(R.pos.x,R.pos.z);R.yaw=fin(r.yaw,0);R.battery=fin(r.bat,100,0,175);R.speed=0;R.visY=R.pos.y;R.lastG=R.pos.y;
    cam.yaw=fin(data.cam,0);
    // make sure caves exist under a player who saved underground
    updateCaves(1);if(P.pos.y<groundHeight(P.pos.x,P.pos.z)-2&&!caveQuery(P.pos.x,P.pos.z,P.pos.y))P.pos.y=groundHeight(P.pos.x,P.pos.z);
    return true;
  }catch(e){console.error(e);return false}
}
addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveGame(true)});
addEventListener('beforeunload',()=>saveGame(true));
