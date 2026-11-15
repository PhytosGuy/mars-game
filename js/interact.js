'use strict';

/* =========================================================
   INTERACTION
   ========================================================= */
const prog={scan:0,clean:0,repair:0,targetId:null};
function airlockPos(b){const a=b.rot;return{x:b.x+Math.sin(a)*6.9,z:b.z+Math.cos(a)*6.9}}
function nearAirlock(){for(const b of blds){if(b.type!=='habitat'||b.progress<1)continue;const p=airlockPos(b);if(Math.hypot(p.x-P.pos.x,p.z-P.pos.z)<3.8)return b}return null}

function updateInteraction(dt){
  const hints=[],f=focusPos();let ring=null,busy=false;game.hintLen=0;
  let np=null,nd=1e9;for(const p of nearPOIs){const d=Math.hypot(p.x-f.x,p.z-f.z);if(d<nd){nd=d;np=p}}
  game.nearPOI=np&&nd<18?np:null;
  const holdF=!!keys.KeyF&&!build.active;
  if(game.nearPOI){const p=game.nearPOI,T=POI[p.type];
    if(!S.scanned.has(p.id)){
      const need=(P.mode==='rover'?2:3.5)*(S.research.has('scanner')?0.6:1);
      hints.push(`<span class="key">F</span>Hold to scan: ${T.name}`);
      if(holdF){if(prog.targetId!==p.id){prog.targetId=p.id;prog.scan=0}prog.scan+=dt;ring={p:prog.scan/need,l:'Scanning '+T.name+'…'};busy=true;
        if(prog.scan>=need){prog.scan=0;completeScan(p)}}else prog.scan=0;
    }else if(T.sample&&!S.sampled.has(p.id))hints.push(`<span class="key">F</span>Collect sample: ${T.name}`);
    else if(p.type==='lavatube'&&!cave.active)hints.push(P.mode==='foot'?'A cave entrance: walk down into the sinkhole to explore':'Get out of the rover (<span class="key">E</span>) to explore the cave');
  }
  if(P.mode==='foot'&&typeof nearBuried==='function'){const bb=nearBuried();if(bb){hints.unshift(`<span class="key">F</span>Hold to dig out the buried ${BUILD[bb.type].name}`);
      if(holdF&&!busy){prog.dig=(prog.dig||0)+dt;ring={p:prog.dig/2.5,l:'Digging…'};busy=true;if(prog.dig>=2.5){prog.dig=0;bb.buried=0;syncBuried();giveItem(ME,'regolith',3);toast(BUILD[bb.type].name+' dug out and working again','good');puff(bb.x,groundHeight(bb.x,bb.z),bb.z,6)}}else prog.dig=0}
    const be=nearBlockedCave();if(be){hints.unshift('<span class="key">F</span>Hold to clear the rockfall');
      if(holdF&&!busy){prog.rub=(prog.rub||0)+dt;ring={p:prog.rub/4,l:'Clearing rubble…'};busy=true;if(prog.rub>=4){prog.rub=0;delete S.blockedCaves[be.id];syncRubble();giveItem(ME,'basalt',4);toast('The cave entrance is open again','good');puff(be.x,groundHeight(be.x,be.z),be.z,10)}}else prog.rub=0}}
  if(P.mode==='foot'&&nearBed()){const t=tod();hints.push(t>19.5||t<5.5?'<span class="key">F</span>Sleep until morning':'<span class="key">F</span>Camp bed (sleep after 19:30)')}
  if(P.mode==='foot'){
    let nb=null,nbd=1e9;
    for(const b of blds){if(b.progress<1)continue;const d=Math.hypot(b.x-P.pos.x,b.z-P.pos.z)-BUILD[b.type].r;
      if(d<3.5&&(b.fault||(b.type==='solar'&&b.dust>0.12))&&d<nbd){nb=b;nbd=d}}
    if(nb){
      if(nb.fault){hints.push(`<span class="key">F</span>Hold to repair: ${nb.fault.label} (1 Iron Plate)`);
        if(holdF&&!busy){prog.repair+=dt;ring={p:prog.repair/2.5,l:'Repairing…'};busy=true;if(prog.repair>=2.5){prog.repair=0;repair(nb)}}else prog.repair=0}
      else{hints.push(`<span class="key">F</span>Hold to clean solar array (${Math.round(nb.dust*100)}% dust)`);
        if(holdF&&!busy){prog.clean+=dt;ring={p:prog.clean/1.2,l:'Brushing off dust…'};busy=true;if(prog.clean>=1.2){prog.clean=0;nb.dust=0;act({a:'clean',id:nb.id});toast('Solar array cleaned','good');beep(1000,0.06)}}else prog.clean=0}
    }
    if(Math.hypot(R.pos.x-P.pos.x,R.pos.z-P.pos.z)<6){hints.push('<span class="key">E</span>Board rover');S.flags.nearRover=true}
    if(!P.inside&&nearAirlock())hints.push('<span class="key">F</span>Go inside the habitat');
    if(typeof interiorInteract==='function')interiorInteract(hints);
  }
  if(S.samples.length){const lab=blds.find(b=>b.type==='lab'&&b.progress>=1&&Math.hypot(b.x-f.x,b.z-f.z)<BUILD.lab.r+10);
    if(lab){act({a:'lab',s:S.samples.map(x=>({id:x.id,type:x.type}))});toast(`${S.samples.length} sample(s) handed to the lab for analysis`,'good');S.samples=[]}}
  if(typeof worldInteract==='function'){const r2=worldInteract(hints,holdF&&!busy,dt);if(r2)ring=r2}
  game.prompt=hints[0]||null;game.busy=ring?ring.l:null;game.hasHint=hints.length>0;
  const rg=$('#ring');
  if(ring){rg.classList.remove('hidden');$('#ringfg').style.strokeDashoffset=213.6*(1-clamp(ring.p,0,1));$('#ringlbl').textContent=ring.l}
  else if(!rg.classList.contains('hidden')){rg.classList.add('hidden');$('#ringlbl').textContent=''}
}
function pressF(){
  if(build.active)return;
  if(typeof worldPressF==='function'&&worldPressF())return;
  const p=game.nearPOI;
  if(p&&S.scanned.has(p.id)&&POI[p.type].sample&&!S.sampled.has(p.id)){tryCollect(p);return}
  if(P.inside){interiorPressF();return}
  if(P.mode==='foot'&&nearAirlock()){enterHabitat();return}
  if(P.mode==='foot'&&nearBed()){trySleep();return}
  toggleFlash();
}
function nearBed(){for(const b of blds)if(b.type==='bed'&&b.progress>=1&&Math.hypot(b.x-P.pos.x,b.z-P.pos.z)<2.2)return b;return null}
function toggleFlash(){const lit=P.flash===true||(P.flash!==false&&astro.userData.lamp.intensity>0.5);P.flash=!lit;toast(P.flash?'Flashlight on':'Flashlight off');beep(P.flash?1200:700,0.05)}
function repair(b){
  act({a:'repairBld',id:b.id});
}
function habitatCheck(){
  S.flags.habCheck=true;P.o2=100;SFX.hiss();
  card('Habitat systems check','All systems nominal',`Cabin pressure 101 kPa · O₂ 21% · CO₂ scrubbers OK · Battery ${Math.round(S.battery/S.cap*100)}% · Crew of ${S.crew} healthy. Suit oxygen topped up. Tip: come back after 19:30 to rest until morning.`,'#7fd3ff');
}
async function rest(){
  fade(true,'Resting…');await wait(700);
  let g=0;game.resting=true;while(g<200&&!(tod()>6.3&&tod()<7.6)&&!S.over){S.time+=0.1;simTick(0.1);g++}game.resting=false;
  P.o2=100;await wait(300);fade(false);
  if(!S.over)toast(`You rested until morning. Sol ${solNum()} begins.`,'good');
}
