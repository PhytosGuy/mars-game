'use strict';
/* =========================================================
   ITEMS, INVENTORY & CRAFTING
   One action entry point (act → applyAct) so single-player,
   host and guests share the same validated rules.
   ========================================================= */
const ITEMS={
  // raw resources
  regolith:{name:'Regolith',stack:64,icon:'pile',c:'#c4744a',c2:'#8f4a2c',desc:'Loose Martian soil, dug from the ground with any drill.'},
  basalt:{name:'Basalt',stack:64,icon:'rock',c:'#4f3d38',c2:'#2c2220',desc:'Dense volcanic rock from boulders.'},
  iron:{name:'Hematite Ore',stack:64,icon:'ore',c:'#6e3a33',c2:'#c9c2d6',desc:'Iron-oxide ore from dark, metallic nodules. Smelt into Iron Plates at base.'},
  silica:{name:'Silica',stack:64,icon:'ore',c:'#e6d8bf',c2:'#ffffff',desc:'Bright silicon-dioxide deposits. Melt into Glass at base.'},
  ice:{name:'Water Ice',stack:32,icon:'crystal',c:'#bfe9ff',c2:'#6ab8ff',desc:'Frozen water. Put it in colony storage and press “Melt ice” for +6 L water each.'},
  crystal:{name:'Selenite Crystal',stack:16,icon:'crystal',c:'#f2f6ff',c2:'#b9d4ff',desc:'Gypsum crystal grown by ancient groundwater, found in caves.'},
  titanium:{name:'Titanium Ore',stack:64,icon:'ore',c:'#7d8698',c2:'#e3ecff',desc:'Ilmenite-rich rock from mountain veins and deep caves. Hard to cut.'},
  nickel:{name:'Nickel-Iron',stack:32,icon:'nugget',c:'#8f8c88',c2:'#e9e4dc',desc:'Metal from meteorites. Needs a Core Drill.'},
  alloy:{name:'Xeno Alloy',stack:16,icon:'shard',c:'#2fb8a6',c2:'#a9fff1',desc:'A metal no human made, found at ancient structures. Needs a Plasma Cutter.'},
  resonite:{name:'Resonant Crystal',stack:8,icon:'crystal',c:'#a77bff',c2:'#f0e2ff',desc:'A humming crystal from Lumari caves. Stores energy.'},
  chitin:{name:'Skitter Chitin',stack:32,icon:'shard',c:'#3a2f3d',c2:'#ff5a4f',desc:'Shed shell plates left by a retreating Skitter. Light and very tough.'},
  scale:{name:'Wyrm Scale',stack:16,icon:'shard',c:'#a37a52',c2:'#ffd9a0',desc:'A scale shed by a Dune Wyrm. Heat-resistant.'},
  // processed
  brick:{name:'Regolith Brick',stack:64,icon:'brick',c:'#b0623c',c2:'#7a3f24',desc:'Sintered regolith: the colony’s basic building block.'},
  plate:{name:'Iron Plate',stack:64,icon:'plate',c:'#a9a29b',c2:'#6f6a64',desc:'Basic structural metal.'},
  glass:{name:'Glass Pane',stack:64,icon:'pane',c:'#9fd8ff',c2:'#ffffff',desc:'Melted silica, for windows, greenhouses and solar cells.'},
  circuit:{name:'Circuit Board',stack:32,icon:'chip',c:'#2f8f5a',c2:'#ffd34d',desc:'Electronics for machines and tools.'},
  tiplate:{name:'Titanium Plate',stack:32,icon:'plate',c:'#c9d2e6',c2:'#8a94aa',desc:'Light, strong plate for advanced structures and tools.'},
  // consumables
  o2can:{name:'Oxygen Canister',stack:8,icon:'canister',c:'#7fd3ff',c2:'#2b5f8a',use:'o2',desc:'Use to refill 50% suit oxygen.'},
  cell:{name:'Power Cell',stack:8,icon:'cell',c:'#ffd34d',c2:'#3a3532',use:'battery',desc:'Use to recharge 60% suit battery. Lumari value these highly.'},
  patch:{name:'Suit Patch Kit',stack:8,icon:'kit',c:'#ff8fb1',c2:'#ffffff',use:'heal',desc:'Use to repair 40% suit integrity.'},
  flare:{name:'Flare',stack:16,icon:'flare',c:'#ff6a4d',c2:'#ffd34d',use:'flare',desc:'Throw a bright flare. Lights caves and scares off Stalkers and Skitters.'},
  lamp:{name:'Field Lamp',stack:8,icon:'lamp',c:'#fff1c2',c2:'#5d5753',use:'lamp',desc:'Place a lasting light on the ground.'},
  // boosts dropped by creatures (use for a timed effect)
  springmoss:{name:'Springmoss',stack:8,icon:'moss',c:'#8fe39a',c2:'#e9ffd0',use:'buff',buff:'jump',dur:60,desc:'Springy moss a Pebblehopper leaves behind. Use: jump far higher and land safely for 60 s.'},
  nectar:{name:'Strider Nectar',stack:8,icon:'vial',c:'#ffb07a',c2:'#fff1c2',use:'buff',buff:'speed',dur:60,desc:'Sweet sap from a Loomstrider’s back sails. Use: move 40% faster for 60 s and refill 15% oxygen.'},
  adrenal:{name:'Mite Adrenal',stack:8,icon:'vial',c:'#ff6a4d',c2:'#ffd34d',use:'buff',buff:'stam',dur:45,desc:'A gland from a Rustmite. Use: unlimited stamina for sprinting and climbing for 45 s.'},
  ironhide:{name:'Ironhide Salve',stack:4,icon:'jar',c:'#7d8698',c2:'#ff5a4f',use:'buff',buff:'armor',dur:90,desc:'Rendered from a Ravager’s plates. Use: take half damage for 90 s.'},
  // tools (stack 1, durability)
  drill1:{name:'Hand Drill',stack:1,icon:'drill',c:'#ff7a2e',c2:'#5d5753',tool:'drill',tier:1,speed:1,dur:260,dmg:9,desc:'Cuts regolith, basalt, hematite, silica, ice, titanium and crystals.'},
  drill2:{name:'Core Drill',stack:1,icon:'drill',c:'#5fb7e3',c2:'#c9d2e6',tool:'drill',tier:2,speed:1.7,dur:520,dmg:13,desc:'Faster, and cuts nickel-iron and resonant crystals.'},
  cutter:{name:'Plasma Cutter',stack:1,icon:'cutter',c:'#6fe0c8',c2:'#1d1411',tool:'drill',tier:3,speed:2.6,dur:900,dmg:18,desc:'Slices anything, including xeno alloy.'},
  blaster:{name:'Pulse Blaster',stack:1,icon:'blaster',c:'#7fe6dc',c2:'#3a3532',tool:'gun',dmg:16,cool:0.6,range:46,desc:'Standard-issue sidearm. Unlimited charge, but it needs a moment to cool between shots. Hold left mouse to fire where you aim. Hurting peaceful creatures angers them.'},
  prod:{name:'Arc Prod',stack:1,icon:'prod',c:'#9ff0ff',c2:'#3a3532',tool:'weapon',dur:220,dmg:34,stun:2.5,desc:'An electric arc that stuns and drives off hostile creatures.'},
  decoder:{name:'Xeno Decoder',stack:1,icon:'decoder',c:'#2fb8a6',c2:'#ffd34d',tool:'passive',desc:'While carried, suggests meanings for alien words you don’t know yet.'},
  // permanent suit upgrades (use to install)
  u_armor:{name:'Chitin Suit Plating',stack:1,icon:'kit',c:'#3a2f3d',c2:'#6fe0c8',use:'upgrade',desc:'Install: +50 maximum suit integrity.'},
  u_tank:{name:'Extended O₂ Tanks',stack:1,icon:'canister',c:'#c9d2e6',c2:'#7fd3ff',use:'upgrade',desc:'Install: oxygen lasts 60% longer.'},
  u_battery:{name:'Resonite Battery',stack:1,icon:'cell',c:'#a77bff',c2:'#ffd34d',use:'upgrade',desc:'Install: +60% suit battery capacity.'},
  u_jets:{name:'Thruster Pack',stack:1,icon:'jets',c:'#ff7a2e',c2:'#c9d2e6',use:'upgrade',desc:'Install: hold Space in mid-air to fly upward using battery.'},
  // discoveries
  tablet:{name:'Glyph Tablet',stack:16,icon:'tablet',c:'#3d3a44',c2:'#6fe0c8',use:'study',desc:'Carved alien glyphs. Use to study them and learn words of a language.'},
  datapad:{name:'Old Datapad',stack:16,icon:'datapad',c:'#5d5753',c2:'#7fd3ff',use:'read',desc:'Logs left by an earlier expedition. Use to read them.'},
  fragment:{name:'Meteorite Fragment',stack:16,icon:'nugget',c:'#4a4744',c2:'#cfd6e6',desc:'A piece of a meteorite. Analyse 3 in the Science Lab panel for research points.'},
  artifact:{name:'Ancient Artifact',stack:8,icon:'shard',c:'#d7b46a',c2:'#6fe0c8',desc:'A small device from the ancient builders. Unlocks Xeno Engineering research.'},
};
const RECIPES=[
  {id:'brick',out:['brick',1],in:{regolith:3},st:'base'},
  {id:'plate',out:['plate',1],in:{iron:2},st:'base'},
  {id:'glass',out:['glass',1],in:{silica:2},st:'base'},
  {id:'circuit',out:['circuit',1],in:{plate:1,glass:1},st:'base'},
  {id:'tiplate',out:['tiplate',1],in:{titanium:2},st:'fab'},
  {id:'flare',out:['flare',3],in:{silica:1,regolith:2},st:'suit'},
  {id:'o2can',out:['o2can',1],in:{plate:1},colony:{o2:3},st:'base'},
  {id:'cell',out:['cell',2],in:{plate:1,circuit:1},st:'base'},
  {id:'patch',out:['patch',2],in:{plate:1,glass:1},st:'base'},
  {id:'lamp',out:['lamp',2],in:{plate:1,glass:1},st:'base'},
  {id:'drill2',out:['drill2',1],in:{tiplate:4,circuit:3},st:'fab'},
  {id:'prod',out:['prod',1],in:{plate:3,circuit:2,cell:1},st:'fab'},
  {id:'decoder',out:['decoder',1],in:{alloy:2,circuit:2,crystal:2},st:'fab'},
  {id:'cutter',out:['cutter',1],in:{alloy:4,circuit:4,resonite:1},st:'fab'},
  {id:'u_armor',out:['u_armor',1],in:{chitin:6,tiplate:2},st:'fab'},
  {id:'u_tank',out:['u_tank',1],in:{tiplate:3,glass:2},st:'fab'},
  {id:'u_battery',out:['u_battery',1],in:{cell:3,resonite:1},st:'fab'},
  {id:'u_jets',out:['u_jets',1],in:{tiplate:4,circuit:3,scale:2},st:'fab'},
];
const STATION_NAME={suit:'Anywhere',base:'At a habitat',fab:'At a Fabricator'};
// what each structure costs to build
const BUILD_COSTS={
  solar:{plate:2,glass:2},battery:{plate:3,circuit:1},moxie:{plate:4,circuit:2},drill:{plate:5,circuit:2},greenhouse:{glass:6,brick:4},
  lab:{brick:6,plate:3,circuit:2},regolith:{plate:4,brick:2},comms:{plate:3,circuit:2},charger:{plate:2,circuit:1},weather:{plate:2,circuit:1},
  reactor:{tiplate:4,plate:6,circuit:4},pad:{brick:16},habitat:{brick:14,plate:8,glass:4},beacon:{basalt:2},
  fabricator:{plate:6,circuit:3,glass:2},seismo:{plate:3,circuit:3},
  atmo:{tiplate:4,plate:6,circuit:3},dome:{glass:20,tiplate:6,brick:10},tower:{tiplate:12,glass:12,brick:16,alloy:2},
  fusion:{tiplate:10,circuit:8,resonite:2},spaceport:{brick:30,tiplate:10,circuit:6},
};
const INV_SIZE=36,HOTBAR=9,STORE_SIZE=54;
const ME='local';
const newSlots=n=>new Array(n).fill(null);
const stackOf=id=>(ITEMS[id]&&ITEMS[id].stack)||64;
let uidN=1;const newUid=()=>Date.now().toString(36)+(uidN++).toString(36);
function mkStack(id,n,meta){const s={id,n};const d=ITEMS[id];if(d&&d.dur){s.d=meta&&meta.d!=null?meta.d:d.dur;s.u=(meta&&meta.u)||newUid()}return s}

/* ---------- pure slot operations ---------- */
function slotsAdd(slots,id,n,meta,from=0){
  if(!ITEMS[id]||n<=0)return n;const lim=stackOf(id);
  if(lim>1)for(let i=from;i<slots.length&&n>0;i++){const s=slots[i];if(s&&s.id===id&&s.n<lim){const k=Math.min(n,lim-s.n);s.n+=k;n-=k}}
  for(let i=from;i<slots.length&&n>0;i++)if(!slots[i]){const k=Math.min(n,lim);slots[i]=mkStack(id,k,meta);n-=k}
  return n;
}
function slotsCount(slots,id){let n=0;for(const s of slots)if(s&&s.id===id)n+=s.n;return n}
function slotsTake(slots,id,n){
  for(let i=slots.length-1;i>=0&&n>0;i--){const s=slots[i];if(s&&s.id===id){const k=Math.min(n,s.n);s.n-=k;n-=k;if(s.n<=0)slots[i]=null}}
  return n;
}
function slotsFree(slots,id,n){let room=0;const lim=stackOf(id);for(const s of slots){if(!s)room+=lim;else if(s.id===id&&lim>1)room+=lim-s.n}return room>=n}
function cleanSlots(arr,size){const out=newSlots(size);if(Array.isArray(arr))for(let i=0;i<size;i++){const s=arr[i];
  if(s&&ITEMS[s.id]&&Number.isFinite(s.n)&&s.n>0){out[i]={id:s.id,n:Math.min(Math.floor(s.n),stackOf(s.id))};if(ITEMS[s.id].dur){out[i].d=clamp(+s.d||0,0,ITEMS[s.id].dur);out[i].u=String(s.u||newUid()).slice(0,24)}}}return out}

/* ---------- players' inventories ---------- */
// S.inv = your inventory; the host also keeps S.guests[token] = {inv, name} for co-op players
function invOf(pid){if(!pid||pid===ME)return S.inv;const g=S.guests&&S.guests[pid];return g?g.inv:null}
function posOf(pid){if(!pid||pid===ME)return cave.active?P.pos:focusPos();const g=typeof netPlayerPos==='function'?netPlayerPos(pid):null;return g}
function nearBase(pid,extra=0){const p=posOf(pid);if(!p)return false;for(const b of blds)if((b.type==='habitat'||b.type==='fabricator')&&b.progress>=1&&Math.hypot(b.x-p.x,b.z-p.z)<BUILD[b.type].r+12+extra&&Math.abs((p.y||0)-b.y)<12)return true;return false}
function nearFab(pid){const p=posOf(pid);if(!p)return false;return blds.some(b=>b.type==='fabricator'&&b.progress>=1&&Math.hypot(b.x-p.x,b.z-p.z)<BUILD.fabricator.r+10)}
function stationOK(st,pid){return st==='suit'||(st==='base'&&nearBase(pid))||(st==='fab'&&nearFab(pid))||(S.mode==='sandbox'&&st!=='fab'?nearBase(pid):false)}
function haveAll(pid,costs,useStore){const inv=invOf(pid);for(const id in costs){let have=slotsCount(inv,id);if(useStore)have+=slotsCount(S.storage,id);if(have<costs[id])return false}return true}
function payAll(pid,costs,useStore){const inv=invOf(pid);for(const id in costs){let left=slotsTake(inv,id,costs[id]);if(left>0&&useStore)slotsTake(S.storage,id,left)}}
function missingText(pid,costs,useStore){const inv=invOf(pid),m=[];for(const id in costs){const have=slotsCount(inv,id)+(useStore?slotsCount(S.storage,id):0);if(have<costs[id])m.push(`${costs[id]-have} ${ITEMS[id].name}`)}return m.join(', ')}
// give items to a player; overflow goes to colony storage near base, otherwise drops at their feet
function giveItem(pid,id,n,meta){
  const inv=invOf(pid);if(!inv)return 0;let left=slotsAdd(inv,id,n,meta,0);
  if(left>0&&nearBase(pid))left=slotsAdd(S.storage,id,left,meta);
  if(left>0){const p=posOf(pid);spawnPickup(id,left,meta,p.x,(p.y||0)+1,p.z)}
  if(pid===ME||!pid){invChanged(id,n)}else netInvDirty(pid);
  return n;
}
function storeItems(costs,mult=1){for(const id in costs){const n=Math.floor(costs[id]*mult);if(n>0){const left=slotsAdd(S.storage,id,n);if(left>0)spawnPickup(id,left,null,home().x+4,home().y+1,home().z+8)}}if(typeof refreshInvUI==='function')refreshInvUI()}

/* ---------- the action layer ---------- */
// Every gameplay change that touches items goes through here. Guests send the same action to the host,
// which re-runs it against its authoritative copy and replies with the result.
function act(a){
  if(net.role==='guest'){const r=applyAct(ME,a,true);netSend({t:'act',...a});return r}
  return applyAct(ME,a,false);
}
function slotRef(pid,c,i){const arr=c==='sto'?S.storage:invOf(pid);if(!arr||!Number.isInteger(i)||i<0||i>=arr.length)return null;return arr}
function applyAct(pid,a,predict){
  const local=!pid||pid===ME,inv=invOf(pid);if(!inv||!a||typeof a.a!=='string')return false;
  const fail=m=>{if(local&&m&&!predict)toast(m,'warn');return false};
  switch(a.a){
    case'move':{ // move n items between slots (merge, or swap whole stacks)
      const s=a.src||{},d=a.dst||{};if((s.c==='sto'||d.c==='sto')&&!nearBase(pid))return fail('Colony storage is only reachable at base');
      const A=slotRef(pid,s.c,s.i),B=slotRef(pid,d.c,d.i);if(!A||!B||(A===B&&s.i===d.i))return false;
      const x=A[s.i];if(!x)return false;const n=clamp(Math.floor(a.n||x.n),1,x.n),y=B[d.i];
      if(!y){B[d.i]=n===x.n?x:{...x,n};if(n===x.n)A[s.i]=null;else{x.n-=n;if(B[d.i].u)B[d.i].u=newUid()}}
      else if(y.id===x.id&&stackOf(x.id)>1){const k=Math.min(n,stackOf(x.id)-y.n);if(k<=0)return false;y.n+=k;x.n-=k;if(x.n<=0)A[s.i]=null}
      else if(n===x.n){A[s.i]=y;B[d.i]=x}else return false;
      break}
    case'quick':{ // shift-click: send a stack to the other container (or between hotbar and backpack)
      const s=a.src||{},A=slotRef(pid,s.c,s.i);if(!A||!A[s.i])return false;if(s.c==='sto'&&!nearBase(pid))return false;
      const x=A[s.i];A[s.i]=null;let left;
      if(s.c==='sto')left=addRange(inv,x,0,INV_SIZE);
      else if(a.toStore&&nearBase(pid))left=addRange(S.storage,x,0,STORE_SIZE);
      else left=s.i<HOTBAR?addRange(inv,x,HOTBAR,INV_SIZE):addRange(inv,x,0,HOTBAR);
      if(left>0){x.n=left;A[s.i]=x}break}
    case'drop':{const s=a.src||{},A=slotRef(pid,s.c,s.i);if(!A||!A[s.i])return false;if(s.c==='sto'&&!nearBase(pid))return false;
      const x=A[s.i],n=clamp(Math.floor(a.n||x.n),1,x.n);x.n-=n;if(x.n<=0)A[s.i]=null;if(predict&&local)net.dropT=now;
      if(!predict){const p=posOf(pid),fw=a.fw||[0,1];const pk=spawnPickup(x.id,n,x,p.x+fw[0]*1.6,(p.y||0)+1.2,p.z+fw[1]*1.6);if(pk&&local)pk.hold=true}break}
    case'pickup':{if(predict)return true;const pk=pickups.get(a.id);if(!pk)return false;const p=posOf(pid);if(!p||Math.hypot(pk.x-p.x,pk.z-p.z)>4)return false;
      const took=pk.n,left=slotsAdd(inv,pk.it,pk.n,pk.meta);if(left===took)return fail('Inventory full');
      if(left>0){pk.n=left;netPickupUpdate(pk)}else removePickup(pk.id);if(local)invChanged(pk.it,took-left);else netInvDirty(pid);break}
    case'craft':{const r=RECIPES.find(r=>r.id===a.r);if(!r)return false;
      if(!stationOK(r.st,pid))return fail(r.st==='fab'?'You need to be at a Fabricator':'You need to be at a habitat');
      const times=clamp(Math.floor(a.n||1),1,64);let done=0;
      for(let k=0;k<times;k++){const sb=S.mode==='sandbox';const useSto=nearBase(pid);
        if(!sb&&!haveAll(pid,r.in,useSto)){if(!done)return fail('Missing: '+missingText(pid,r.in,useSto));break}
        if(r.colony&&!sb){let ok=true;for(const k2 in r.colony)if((S.res[k2]||0)<r.colony[k2])ok=false;if(!ok){if(!done)return fail('The colony is low on oxygen');break}for(const k2 in r.colony)S.res[k2]-=r.colony[k2]}
        if(!sb)payAll(pid,r.in,useSto);
        if(!slotsFree(inv,r.out[0],r.out[1])&&!predict){const p=posOf(pid);spawnPickup(r.out[0],r.out[1],null,p.x,(p.y||0)+1,p.z)}else slotsAdd(inv,r.out[0],r.out[1]);
        done++;}
      if(!predict){S.stats.crafted=S.stats.crafted||{};S.stats.crafted[r.out[0]]=(S.stats.crafted[r.out[0]]||0)+done*r.out[1]}
      if(local&&!predict){toast(`Crafted ${done*r.out[1]} × ${ITEMS[r.out[0]].name}`,'good');sfxCraft();invChanged(r.out[0],done*r.out[1])}
      break}
    case'use':{const i=a.i,x=inv[i];if(!Number.isInteger(i)||!x)return false;const d=ITEMS[x.id];if(!d.use)return false;
      if(d.use==='upgrade'){const ups=playerUps(pid);if(ups[x.id])return fail('Already installed');ups[x.id]=true}
      if(d.use==='lamp'||d.use==='flare'){if(predict)break}
      x.n--;if(x.n<=0)inv[i]=null;
      if(!predict){if(local)useEffect(x.id,a);else netUsed(pid,x.id,a)}break}
    case'repairTool':{const x=inv[a.i];if(!x||!ITEMS[x.id].dur)return false;if(!nearBase(pid))return fail('Repair tools at a habitat');
      const cost={plate:Math.max(1,Math.ceil((1-x.d/ITEMS[x.id].dur)*3))};if(S.mode!=='sandbox'){if(!haveAll(pid,cost,true))return fail('Need '+missingText(pid,cost,true));payAll(pid,cost,true)}
      x.d=ITEMS[x.id].dur;if(local&&!predict)toast(ITEMS[x.id].name+' repaired','good');break}
    case'melt':{if(!nearBase(pid))return false;const n=slotsCount(S.storage,'ice');if(!n)return fail('No ice in storage');slotsTake(S.storage,'ice',n);S.res.water+=n*6;if(local&&!predict)toast(`Melted ${n} ice: +${n*6} L water`,'good');break}
    default:return typeof applyAct2==='function'?applyAct2(pid,a,predict,local,fail):false;
  }
  if(local&&typeof refreshInvUI==='function')refreshInvUI();
  if(!local)netInvDirty(pid);
  return true;
}
function addRange(arr,x,a,b){const lim=stackOf(x.id);let n=x.n;
  if(lim>1)for(let i=a;i<b&&n>0;i++){const s=arr[i];if(s&&s.id===x.id&&s.n<lim){const k=Math.min(n,lim-s.n);s.n+=k;n-=k}}
  for(let i=a;i<b&&n>0;i++)if(!arr[i]){arr[i]={...x,n:Math.min(n,lim)};n-=arr[i].n}
  return n;
}
function playerUps(pid){if(!pid||pid===ME){S.ups=S.ups||{};return S.ups}const g=S.guests[pid];g.ups=g.ups||{};return g.ups}
// local effects of using an item (runs on the player who used it)
function useEffect(id,a){
  const d=ITEMS[id];
  switch(d.use){
    case'o2':P.o2=Math.min(100,P.o2+50);toast('Suit oxygen refilled','good');sfx(0.5,2400,0.8,0.05,'bandpass',0,600);break;
    case'battery':P.bat=Math.min(100,P.bat+60);toast('Suit battery recharged','good');beep(880,0.08);beep(1320,0.1,'sine',0.05,0.08);break;
    case'heal':P.hp=Math.min(maxHP(),P.hp+40);toast('Suit integrity repaired','good');break;
    case'upgrade':toast(`${d.name} installed!`,'good');SFX.radio();break;
    case'flare':throwFlare();break;
    case'lamp':placeLamp();break;
    case'study':studyTablet();break;
    case'read':readDatapad();break;
    case'buff':applyBuff(d.buff,d.dur);if(id==='nectar')P.o2=Math.min(100,P.o2+15);break;
  }
  if(typeof refreshInvUI==='function')refreshInvUI();
}
/* ---------- timed boosts (local to each player) ---------- */
const BUFFS={speed:{name:'Speed',item:'nectar',col:'#ffb07a'},jump:{name:'Jump',item:'springmoss',col:'#8fe39a'},stam:{name:'Stamina',item:'adrenal',col:'#ffd34d'},armor:{name:'Armour',item:'ironhide',col:'#9fb3d6'}};
function buffOn(k){return!!(P.buffs&&P.buffs[k]>0)}
function applyBuff(k,dur){if(!BUFFS[k])return;P.buffs=P.buffs||{};P.buffs[k]=Math.max(P.buffs[k]||0,dur);toast(` boost for ${dur} s`,'good');sfx(0.4,1600,1.2,0.06,'bandpass',0,2400);renderBuffs(true)}
function tickBuffs(dt){if(!P.buffs)return;let any=false,ended=null;for(const k in P.buffs){if(P.buffs[k]>0){P.buffs[k]-=dt;if(P.buffs[k]<=0){P.buffs[k]=0;ended=k}else any=true}}if(ended)toast(BUFFS[ended].name+' boost wore off');renderBuffs(false)}
let buffSig='';
function renderBuffs(force){const el=$('#buffs');if(!el)return;const list=P.buffs?Object.keys(P.buffs).filter(k=>P.buffs[k]>0):[];
  const sig=list.map(k=>k+Math.ceil(P.buffs[k])).join();if(!force&&sig===buffSig)return;buffSig=sig;
  el.innerHTML=list.map(k=>{const s=Math.ceil(P.buffs[k]);return`<div class="bf${s<=8?' low':''}" style="--bc:${BUFFS[k].col}"><img src="${iconURL(BUFFS[k].item)}" alt="">${BUFFS[k].name} ${s}s</div>`}).join('')}
const maxHP=()=>100+((S.ups&&S.ups.u_armor)?50:0);
const o2Mult=()=>(S.ups&&S.ups.u_tank)?1/1.6:1;
const batMult=()=>(S.ups&&S.ups.u_battery)?1/1.6:1;

/* ---------- world pickups (dropped items) ---------- */
const pickups=new Map();let pickN=1;
const pickGroup=new THREE.Group();scene.add(pickGroup);
// a pickup: id = unique pickup id, it = item id
function spawnPickup(it,n,meta,x,y,z,forcedId){
  if(!ITEMS[it]||!(n>0))return null;
  const id=forcedId||('pk'+(pickN++)+'_'+Math.floor(Math.random()*1e6).toString(36));
  const m=itemMesh(it);m.position.set(x,y,z);pickGroup.add(m);
  const pk={id,it,n,meta:meta&&meta.d!=null?{d:meta.d,u:meta.u}:null,x,y,z,vy:2,t:0,m};pickups.set(id,pk);
  if(net.role==='host')netSend({t:'pk+',p:{id,it,n,meta:pk.meta,x,y,z}});
  return pk;
}
function removePickup(id){const pk=pickups.get(id);if(!pk)return;pickGroup.remove(pk.m);pickups.delete(id);if(net.role==='host')netSend({t:'pk-',id})}
function itemMesh(id){
  const d=ITEMS[id],g=new THREE.Group();
  const geo=d.icon==='crystal'||d.icon==='shard'?shared('ico',()=>new THREE.IcosahedronGeometry(1,0)):d.tool?rbox(0.5,0.18,0.18):d.icon==='plate'||d.icon==='pane'||d.icon==='brick'?rbox(0.5,0.12,0.36):shared('dode',()=>new THREE.DodecahedronGeometry(1,0));
  const m=new THREE.Mesh(geo,mat(d.c,{emissive:d.c,emissiveIntensity:0.25,flatShading:true}));m.scale.setScalar(geo.type==='IcosahedronGeometry'||geo.type==='DodecahedronGeometry'?0.22:1);m.castShadow=true;g.add(m);return g;
}
function updatePickups(dt){
  for(const pk of pickups.values()){
    pk.t+=dt;const fl=floorAt(pk.x,pk.z,pk.y);
    if(pk.y>fl+0.35){pk.vy-=G*dt;pk.y+=pk.vy*dt;if(pk.y<fl+0.35){pk.y=fl+0.35;pk.vy=0}}
    if(S&&S.storm.level>0.5&&!cave.active&&pk.y<=fl+0.4){const w=windVec();pk.x+=w.x*dt*0.6*S.storm.level;pk.z+=w.z*dt*0.6*S.storm.level}
    pk.m.position.set(pk.x,pk.y+Math.sin(pk.t*2.5)*0.08,pk.z);pk.m.rotation.y+=dt*1.6;
    if(pk.hold&&Math.hypot(pk.x-P.pos.x,pk.z-P.pos.z)>3.5)pk.hold=false; // things you drop stay put until you walk away
    if(!pk.hold&&game.state==='play'&&P.mode==='foot'&&!game.dead&&Math.hypot(pk.x-P.pos.x,pk.z-P.pos.z)<1.8&&Math.abs(pk.y-P.pos.y)<2.5&&(pk.cool=(pk.cool||0)-dt)<=0){
      pk.cool=0.6;if(slotsFree(S.inv,pk.it,1)){if(net.role==='guest'){netSend({t:'act',a:'pickup',id:pk.id})}else applyAct(ME,{a:'pickup',id:pk.id})}}
  }
}

/* ---------- item icons (drawn once, cached) ---------- */
const ICONS={};
function iconURL(id){
  if(ICONS[id])return ICONS[id];
  const d=ITEMS[id]||{icon:'rock',c:'#888',c2:'#444'},cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d'),c=d.c,c2=d.c2,r=mulberry(id.length*97+id.charCodeAt(0));
  x.lineJoin='round';x.lineWidth=3;x.strokeStyle='rgba(20,10,6,.85)';
  const poly=(pts,fill)=>{x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fillStyle=fill;x.fill();x.stroke()};
  const shade=(col,k)=>{const n=parseInt(col.slice(1),16);let R=(n>>16)&255,Gc=(n>>8)&255,B=n&255;R=clamp(R*k,0,255);Gc=clamp(Gc*k,0,255);B=clamp(B*k,0,255);return`rgb(${R|0},${Gc|0},${B|0})`};
  switch(d.icon){
    case'pile':poly([[8,50],[18,30],[30,22],[44,26],[56,40],[58,52]],c);for(let i=0;i<14;i++){x.fillStyle=i%2?c2:shade(c,1.25);x.fillRect(14+r()*38,30+r()*18,3,3)}break;
    case'rock':poly([[10,44],[16,22],[34,12],[52,20],[56,40],[40,54],[18,54]],c);poly([[16,22],[34,12],[40,26],[22,32]],shade(c,1.3));break;
    case'ore':poly([[10,44],[14,22],[32,10],[52,18],[56,42],[38,56],[18,54]],c);poly([[14,22],[32,10],[38,24],[20,30]],shade(c,1.25));
      for(let i=0;i<6;i++){const px=18+r()*30,py=22+r()*26;poly([[px,py-5],[px+5,py],[px,py+5],[px-5,py]],c2)}break;
    case'crystal':for(const[ox,h,w]of[[22,40,9],[34,50,11],[46,34,8]]){poly([[ox-w,58],[ox-w,58-h+8],[ox,58-h],[ox+w,58-h+8],[ox+w,58]],c);poly([[ox,58-h],[ox+w,58-h+8],[ox+w,58],[ox,58]],shade(c2,1))}break;
    case'nugget':poly([[14,40],[20,22],[38,16],[52,26],[50,46],[32,54]],c);poly([[20,22],[38,16],[34,30]],c2);break;
    case'shard':poly([[30,6],[46,30],[36,58],[18,36]],c);poly([[30,6],[46,30],[32,32]],c2);break;
    case'brick':poly([[8,26],[40,18],[56,28],[24,36]],shade(c,1.25));poly([[8,26],[24,36],[24,50],[8,40]],c);poly([[24,36],[56,28],[56,42],[24,50]],c2);break;
    case'plate':poly([[6,30],[38,18],[58,30],[26,42]],shade(c,1.2));poly([[6,30],[26,42],[26,48],[6,36]],c2);poly([[26,42],[58,30],[58,36],[26,48]],c);break;
    case'pane':poly([[10,14],[54,14],[54,52],[10,52]],c);x.strokeStyle='rgba(255,255,255,.8)';x.beginPath();x.moveTo(18,22);x.lineTo(30,22);x.moveTo(18,28);x.lineTo(24,28);x.stroke();break;
    case'chip':poly([[12,14],[52,14],[52,50],[12,50]],c);x.fillStyle=c2;for(let i=0;i<5;i++){x.fillRect(16+i*7,8,3,6);x.fillRect(16+i*7,50,3,6)}x.fillStyle='#1d1411';x.fillRect(24,24,16,16);break;
    case'canister':poly([[20,14],[44,14],[46,56],[18,56]],c);poly([[26,6],[38,6],[38,14],[26,14]],c2);x.fillStyle='rgba(255,255,255,.7)';x.fillRect(24,22,4,26);break;
    case'cell':poly([[16,16],[48,16],[48,56],[16,56]],c2);poly([[16,16],[48,16],[48,28],[16,28]],c);poly([[26,8],[38,8],[38,16],[26,16]],'#c9c3bb');x.fillStyle=c;x.fillRect(28,34,8,14);x.fillRect(25,38,14,6);break;
    case'kit':poly([[10,18],[54,18],[54,52],[10,52]],c);x.fillStyle=c2;x.fillRect(28,24,8,22);x.fillRect(21,31,22,8);break;
    case'flare':poly([[26,22],[38,22],[38,58],[26,58]],c);poly([[32,4],[42,20],[22,20]],c2);break;
    case'lamp':poly([[20,46],[44,46],[48,58],[16,58]],c2);poly([[22,20],[42,20],[44,46],[20,46]],c);x.fillStyle='rgba(255,240,200,.9)';x.beginPath();x.arc(32,32,7,0,TAU);x.fill();break;
    case'drill':poly([[8,24],[34,24],[38,34],[34,44],[8,44]],c);poly([[14,44],[26,44],[24,58],[12,58]],c2);poly([[38,28],[58,34],[38,40]],'#d6cfc5');break;
    case'cutter':poly([[8,26],[38,22],[42,34],[38,46],[8,42]],c2);poly([[42,30],[60,34],[42,38]],c);x.fillStyle=c;x.fillRect(12,30,18,6);break;
    case'blaster':poly([[8,24],[44,22],[50,28],[44,34],[22,34],[18,52],[8,52],[10,34]],c2);poly([[44,24],[58,26],[58,32],[44,32]],c);x.fillStyle=c;x.fillRect(14,27,22,3);x.beginPath();x.arc(54,29,3,0,TAU);x.fill();break;
    case'prod':poly([[8,50],[44,14],[50,20],[14,56]],c2);poly([[44,6],[58,20],[50,26],[38,12]],c);break;
    case'decoder':poly([[14,12],[50,12],[50,52],[14,52]],c);poly([[20,18],[44,18],[44,36],[20,36]],'#1d1411');x.strokeStyle=c2;x.beginPath();x.moveTo(24,30);x.lineTo(30,22);x.lineTo(34,30);x.lineTo(40,24);x.stroke();break;
    case'jets':poly([[14,12],[30,12],[30,46],[14,46]],c2);poly([[34,12],[50,12],[50,46],[34,46]],c2);poly([[16,46],[28,46],[22,60]],c);poly([[36,46],[48,46],[42,60]],c);break;
    case'tablet':poly([[12,10],[52,14],[50,56],[10,52]],c);x.strokeStyle=c2;x.lineWidth=2.5;x.beginPath();x.moveTo(20,22);x.lineTo(28,30);x.lineTo(20,38);x.moveTo(34,20);x.lineTo(42,20);x.lineTo(38,30);x.moveTo(32,40);x.arc(38,42,5,0,Math.PI*1.5);x.stroke();break;
    case'moss':for(let i=0;i<7;i++){const ox=14+r()*36,oy=24+r()*24,rr=7+r()*7;x.beginPath();x.arc(ox,oy,rr,0,TAU);x.fillStyle=i%2?c:shade(c,0.8);x.fill();x.stroke()}x.fillStyle=c2;for(let i=0;i<6;i++){x.beginPath();x.arc(16+r()*32,20+r()*26,2.2,0,TAU);x.fill()}break;
    case'vial':poly([[24,8],[40,8],[40,18],[48,30],[48,54],[16,54],[16,30],[24,18]],'rgba(255,255,255,.35)');poly([[17,34],[47,34],[47,53],[17,53]],c);x.fillStyle=c2;x.beginPath();x.arc(26,42,3,0,TAU);x.arc(37,46,2,0,TAU);x.fill();poly([[22,4],[42,4],[42,10],[22,10]],'#5d5753');break;
    case'jar':poly([[14,20],[50,20],[52,56],[12,56]],c);poly([[12,12],[52,12],[52,20],[12,20]],'#3a3532');x.fillStyle=c2;x.fillRect(18,32,28,10);break;
    case'datapad':poly([[14,8],[50,8],[50,56],[14,56]],c);poly([[18,12],[46,12],[46,46],[18,46]],c2);break;
    default:poly([[12,12],[52,12],[52,52],[12,52]],c);
  }
  return ICONS[id]=cv.toDataURL();
}
