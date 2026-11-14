'use strict';
/* =========================================================
   COLONY ACTIONS (authoritative on the host / in single-player)
   ========================================================= */
const FLAG_WHITELIST=new Set(['nearRover','habCheck']);
function poiById(id,p){return poisNear(p.x,p.z,60).find(q=>q.id===id)||null}
ACT.place=(pid,a,predict,local,fail)=>{
  const def=BUILD[a.type];if(!def||!Number.isFinite(a.x)||!Number.isFinite(a.z))return false;
  if(def.res&&!S.research.has(def.res))return fail('Research needed first');
  const cost=BUILD_COSTS[a.type]||{},sb=S.mode==='sandbox',useSto=nearBase(pid,40);
  if(!sb&&!haveAll(pid,cost,useSto))return fail('Missing: '+missingText(pid,cost,useSto));
  if(!predict){
    const p=posOf(pid);if(!p||Math.hypot(p.x-a.x,p.z-a.z)>60)return fail('Too far away to build there');
    const reason=placeReason(a.type,a.x,a.z,false,true);if(reason)return fail(reason);
    if(!sb)payAll(pid,cost,useSto);addBuilding(a.type,a.x,a.z,+a.r||0,0);S.stats.built=(S.stats.built||0)+1;
  }else if(!sb)payAll(pid,cost,useSto);
  return true;
};
ACT.recycle=(pid,a,predict,local,fail)=>{
  const b=blds.find(b=>b.id===a.id);if(!b)return false;
  if(b.type==='habitat'&&count('habitat')<=1)return fail('You can’t recycle your only habitat');
  const p=posOf(pid);if(!p||Math.hypot(p.x-b.x,p.z-b.z)>60)return fail('Too far away');
  if(predict)return true;
  storeItems(BUILD_COSTS[b.type]||{},b.progress>=1?0.5:1);puff(b.x,b.y,b.z,BUILD[b.type].r);removeBuilding(b);return true;
};
ACT.repairBld=(pid,a,predict,local,fail)=>{
  const b=blds.find(b=>b.id===a.id);if(!b||!b.fault)return false;const p=posOf(pid);if(!p||Math.hypot(p.x-b.x,p.z-b.z)>BUILD[b.type].r+6)return false;
  const cost={plate:1},sb=S.mode==='sandbox';if(!sb&&!haveAll(pid,cost,true))return fail('Repairs need 1 Iron Plate');
  if(!sb)payAll(pid,cost,true);if(predict)return true;
  b.fault=null;if(b.fm){scene.remove(b.fm);b.fm=null}
  if(local){toast(BUILD[b.type].name+' repaired','good');beep(880,0.08);beep(1320,0.1,'sine',0.06,0.09)}return true;
};
ACT.clean=(pid,a,predict)=>{const b=blds.find(b=>b.id===a.id);const p=posOf(pid);if(!b||!p||Math.hypot(p.x-b.x,p.z-b.z)>BUILD[b.type].r+6)return false;if(!predict)b.dust=0;return true};
ACT.research=(pid,a,predict,local,fail)=>{
  const r=RESEARCH.find(r=>r.id===a.id);if(!r||S.research.has(r.id))return false;if(r.req&&!r.req())return fail(r.reqText);
  if(S.res.rp<r.cost)return fail('Not enough research points');if(predict)return true;
  S.res.rp-=r.cost;S.research.add(r.id);toast(`${local?'':(netName(pid)+' ')}Research complete: ${r.name}`,'good');beep(1046,0.1);beep(1568,0.15,'sine',0.06,0.1);
  if(typeof renderBuildBar==='function')renderBuildBar();return true;
};
ACT.scan=(pid,a,predict)=>{
  const p=posOf(pid);if(!p||S.scanned.has(a.id))return false;const q=poiById(a.id,p);if(!q||Math.hypot(q.x-p.x,q.z-p.z)>25)return false;
  if(predict)return true;
  const T=POI[q.type];S.scanned.add(q.id);S.scannedTypes[q.type]=(S.scannedTypes[q.type]||0)+1;
  const gain=q.type==='lavatube'?T.rp:Math.round(T.rp*0.4*(hasRole('Planetary Scientist')?1.15:1));S.res.rp+=gain;
  if(q.type==='ice')S.flags.iceFound=true;return gain;
};
ACT.sampled=(pid,a,predict)=>{const p=posOf(pid);if(!p||S.sampled.has(a.id))return false;const q=poiById(a.id,p);if(!q||!POI[q.type].sample||Math.hypot(q.x-p.x,q.z-p.z)>25)return false;if(!predict)S.sampled.add(q.id);return true};
ACT.lab=(pid,a,predict)=>{
  if(!Array.isArray(a.s)||a.s.length>6)return false;const p=posOf(pid);
  if(!p||!blds.some(b=>b.type==='lab'&&b.progress>=1&&Math.hypot(b.x-p.x,b.z-p.z)<BUILD.lab.r+12))return false;
  if(predict)return true;
  for(const smp of a.s){if(!smp||!S.sampled.has(smp.id)||!POI[smp.type]||S.analyzed.some(x=>x.id===smp.id)||S.labQueue.some(x=>x.id===smp.id))continue;S.labQueue.push({id:String(smp.id),type:smp.type})}
  return true;
};
ACT.flags=(pid,a)=>{if(!a.f||typeof a.f!=='object')return false;for(const k in a.f)if(FLAG_WHITELIST.has(k)&&a.f[k]===true)S.flags[k]=true;return true};
ACT.stow=(pid,a,predict)=>{if(!nearBase(pid,60))return false;if(!predict){S.stowed=!!a.on;toast(S.stowed?'Solar arrays stowed: protected from storms, but making no power':'Solar arrays deployed','good')}return true};
