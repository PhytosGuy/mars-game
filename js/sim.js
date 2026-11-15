'use strict';

/* =========================================================
   SIMULATION (resources, power, events)
   ========================================================= */
function simTick(h){
  if(h<=0)return;
  const s=S,sunY=sunVec(tod(),_v1).y,sunF=Math.pow(clamp(sunY/0.88,0,1),0.8),storm=s.storm.level,T=temperature();
  let prod=0,cap=0;const cons=[];
  for(const b of blds){
    if(b.progress<1){b.powered=false;continue}
    const jam=b.fault&&b.fault.kind==='jam';
    if(b.type==='solar'&&!jam)prod+=2.5*sunF*(1-0.8*b.dust)*(1-0.75*storm);
    if(b.type==='reactor')prod+=10;
    if(b.type==='fusion')prod+=60;
    if(b.type==='tower')cap+=40;
    if(b.type==='battery'&&!jam)cap+=30;
    if(b.type==='habitat')cap+=20;
    let p=BUILD[b.type].power;if(b.type==='habitat'&&T<-60)p+=0.6;
    if(p>0&&b.on&&!jam){b._p=p;cons.push(b)}else b.powered=!jam&&b.on;
  }
  if(s.research.has('batteries'))cap*=1.6;
  s.cap=Math.max(cap,1);
  let demand=s.roverKW;for(const b of cons){demand+=b._p;b.powered=true}
  let net=prod-demand;s.brownout=false;
  if(net<0&&s.battery+net*h<=0){
    s.brownout=true;
    demand-=s.roverKW;s.roverKW=0;s.roverChargeBlocked=true;
    cons.sort((a,b)=>(BUILD[a.type].prio||0)-(BUILD[b.type].prio||0));
    const avail=prod+s.battery/h;
    for(const b of cons){if(demand<=avail)break;b.powered=false;demand-=b._p}
    net=prod-demand;
  }else s.roverChargeBlocked=false;
  s.battery=clamp(s.battery+net*h,0,s.cap);
  s.powerNet=net;s.powerProd=prod;s.powerDemand=demand;
  // resources (per game hour)
  let o2=0,water=0,food=0,mat=0;
  const habOK=blds.some(b=>b.type==='habitat'&&b.progress>=1&&b.powered);
  for(const b of cons){if(!b.powered||(b.buried||0)>0.5)continue;          // buried by a storm: dig it out first
    if(b.type==='moxie')o2+=0.25*(s.research.has('moxie2')?1.8:1);
    else if(b.type==='drill')water+=1.6*(tech('ice')?1.25:1);
    else if(b.type==='greenhouse'&&s.res.water>0){water-=0.3;food+=0.2*(hasRole('Botanist')?1.15:1)*(tech('perchlorate')?1.15:1);if(tech('organics'))o2+=0.03}
    else if(b.type==='regolith')mat+=2.2*(tech('clay')?1.25:1);
    else if(b.type==='atmo'){o2+=2;water+=2}
    else if(b.type==='dome')food+=1.2;
    else if(b.type==='tower')food+=0.9;
  }
  if(habOK&&(s.habLv||1)>=2)food+=0.1;if(habOK&&(s.habLv||1)>=3)water+=0.5;   // the expanded habitat's grow bay and water recycler
  o2-=0.034*s.crew*(habOK?1:1.6);
  water-=0.162*s.crew*(s.research.has('recycling')?0.5:1)*(tech('sediment')?0.9:1);
  food-=0.073*s.crew;
  for(const b of blds)if(b.fault&&b.fault.kind==='leak'){if(b.fault.res==='o2')o2-=b.fault.rate;else water-=b.fault.rate}
  s.res.o2=Math.max(0,s.res.o2+o2*h);s.res.water=Math.max(0,s.res.water+water*h);s.res.food=Math.max(0,s.res.food+food*h);s.brickAcc=(s.brickAcc||0)+mat*h*0.5;while(s.brickAcc>=1){s.brickAcc-=1;slotsAdd(S.storage,'brick',1)}
  s.rates={o2,water,food,mat};
  // dust
  const dk=(s.research.has('dustcoat')?0.4:1)*(tech('dust')?0.7:1)*(1+storm*8)*0.06/SOL_H;
  for(const b of blds)if(b.type==='solar')b.dust=Math.min(1,b.dust+dk*h);
  // lab analysis
  const labs=blds.filter(b=>b.type==='lab'&&b.progress>=1&&b.powered).length;
  if(labs&&s.labQueue.length){s.labProg+=h*labs/1.2;if(s.labProg>=1){s.labProg=0;completeAnalysis(s.labQueue.shift())}}
  // sustainability tracking (chapter 6)
  if(o2>=0&&water>=0&&food>=0&&!s.brownout){s.sustain+=h;if(s.sustain>=SOL_H&&!s.flags.sustained){s.flags.sustained=true}}else s.sustain=0;
  // radiation (Curiosity RAD measured ~0.64 mSv/day at the surface)
  if(cave.active){}
  else if(P.mode==='foot'&&!nearHab(P.pos,9))s.dose+=h*(0.026+(s.spe.active?6:0))*(tech('lavatube')?0.75:1);
  else if(P.mode==='rover'&&s.spe.active)s.dose+=h*1.2;
  simEvents(h);cityTick(h);
  // failure
  if(s.mode==='survival'&&!s.over){
    if(s.res.o2<=0||s.res.water<=0||s.res.food<=0){s.zeroT+=h;if(s.zeroT>2)gameOver()}else s.zeroT=0;
  }
}
function simEvents(h){
  const s=S;
  // dust storms
  if(!s.storm.active){
    if(count('weather')&&!s.flags.stormWarned&&s.time>=s.nextStorm-4){s.flags.stormWarned=true;toast('Weather station: dust storm expected within ~4 hours. Prepare power reserves.','warn');beep(660,0.15,'square',0.05)}
    if(s.time>=s.nextStorm){s.storm.active=true;s.storm.start=s.time;s.storm.dur=6+Math.random()*8;s.storm.int=0.55+Math.random()*0.45;
      toast('Dust storm rolling in: solar output will drop','warn');beep(520,0.25,'square',0.05)}
    s.storm.level=Math.max(0,s.storm.level-h*0.5);
  }else{
    const el=s.time-s.storm.start,d=s.storm.dur;
    s.storm.level=smooth(0,1.5,el)*(1-smooth(d-1.5,d,el))*s.storm.int;
    if(el>d){s.storm.active=false;if(typeof stormAftermath==='function')stormAftermath(s.storm.int);s.storm.level=0;s.nextStorm=s.time+wxGap(SOL_H*(1.3+Math.random()*2.2));s.flags.stormWarned=false;toast('The dust storm has passed. Check your solar panels.','good')}
  }
  // supply landers
  if(s.time>=s.nextSupply){
    if(count('comms')){spawnLander(false);s.nextSupply+=SOL_H*3}
    else{if(!s.flags.noCommsWarn){toast('A supply lander couldn’t get landing clearance. Build a Comms Antenna!','warn');s.flags.noCommsWarn=true}s.nextSupply+=SOL_H*0.5}
  }
  if(s.crewLanderAt&&s.time>=s.crewLanderAt){s.crewLanderAt=null;spawnLander(true)}
  // equipment faults
  if(s.time>=s.nextFault){
    s.nextFault=s.time+SOL_H*(2.5+Math.random()*2.5)*(hasRole('Engineer')?1.3:1);
    const cand=blds.filter(b=>b.progress>=1&&!b.fault&&FAULTS[b.type]);
    if(cand.length){const b=cand[Math.floor(Math.random()*cand.length)],opts=FAULTS[b.type];b.fault={...opts[Math.floor(Math.random()*opts.length)]};
      addFaultMarker(b);toast(`Fault: ${b.fault.label} at ${BUILD[b.type].name}. Go and repair it on foot [F].`,'bad');beep(440,0.2,'square',0.06);beep(330,0.25,'square',0.06,0.22)}
  }
  // solar particle events
  if(!s.spe.active){
    if(!s.spe.warned&&s.time>=s.nextSPE-2.5){s.spe.warned=true;if(count('comms')||count('weather'))toast('Space weather alert: solar particle event in ~2.5 h. Shelter in the rover or habitat when it hits.','warn')}
    if(s.time>=s.nextSPE){s.spe.active=true;s.spe.until=s.time+1.6;toast('Solar particle event in progress: radiation elevated outdoors!','bad');beep(880,0.3,'sawtooth',0.04)}
  }else if(s.time>=s.spe.until){s.spe.active=false;s.spe.warned=false;s.nextSPE=s.time+wxGap(SOL_H*(3+Math.random()*3));toast('Solar particle event over.','good')}
}
function nearHab(p,extra){for(const b of blds)if(b.type==='habitat'&&b.progress>=1&&Math.hypot(p.x-b.x,p.z-b.z)<BUILD.habitat.r+extra)return b;return null}

/* ---------- landers ---------- */
function spawnLander(crew,n,fx,fz){
  const port=blds.find(b=>b.type==='spaceport'&&b.progress>=1),pad=port||blds.find(b=>b.type==='pad'&&b.progress>=1),hm=home();
  let x,z;
  if(fx!==undefined){x=fx;z=fz}else if(pad){x=pad.x-(port?5:0);z=pad.z}else{const a=Math.random()*TAU;x=hm.x+Math.cos(a)*34;z=hm.z+Math.sin(a)*34;
    for(let i=0;i<10&&blds.some(b=>Math.hypot(b.x-x,b.z-z)<BUILD[b.type].r+5);i++){const a2=Math.random()*TAU;x=hm.x+Math.cos(a2)*(36+i*4);z=hm.z+Math.sin(a2)*(36+i*4)}}
  const g=mkLander();g.scale.setScalar(crew?1:0.75);const gy=groundHeight(x,z)+(pad?0.3:0);
  g.position.set(x,gy+280,z);scene.add(g);
  landers.push({g,x,z,gy,t:0,crew,n:n||2,pad:!!pad,done:false});if(net.role==='host')netSend({t:'lander',crew,n,x,z});
  while(landers.length>5){const l=landers.shift();scene.remove(l.g);disposeObj(l.g)}
  toast(crew?(n>2?`Colony ship with ${n} colonists on final approach!`:'Crew lander on final approach!'):'Supply lander inbound','good');
}
function updateLanders(dt){
  for(const l of landers){
    if(l.t>=60)continue;l.t+=dt;
    const D=9,e=Math.min(1,l.t/D);
    l.g.position.y=l.gy+280*Math.pow(1-e,3);
    const fl=l.g.userData.flame;fl.visible=e<1;fl.scale.set(1,0.7+Math.random()*0.5,1);
    if(e>=1&&!l.done){l.done=true;puff(l.x,l.gy,l.z,12);beep(180,0.4,'sine',0.08);deliver(l)}
  }
  for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.t+=dt;const k=p.t/2.2;p.m.scale.set(p.s*(0.3+k),p.s*0.25*(0.3+k),p.s*(0.3+k));p.m.material.opacity=0.45*(1-k);if(k>=1){scene.remove(p.m);p.m.material.dispose();puffs.splice(i,1)}}
}
const puffs=[],puffGeo=new THREE.SphereGeometry(1,10,6);
function puff(x,y,z,s,col){const m=new THREE.Mesh(puffGeo,new THREE.MeshBasicMaterial({color:col||'#c99068',transparent:true,opacity:0.45,depthWrite:false}));m.position.set(x,y,z);scene.add(m);puffs.push({m,s,t:0})}
function deliver(l){
  const k=l.pad?1.6:1;
  if(net.role==='guest')return;
  if(l.crew){const n=l.n||2;S.crew+=n;
    if(!S.flags.specialists){S.flags.specialists=true;for(const c of CREW_NEW)if(!S.crewList.some(x=>x.name===c.name))S.crewList.push({...c});
      card('New crew arrived','Crew +'+n,`${CREW_NEW.map(c=>c.name+' ('+c.role+')').join(' and ')} have joined the colony.`,'#ffd36f')}
    else toast(`${n} new colonists have arrived. Population: ${S.crew}`,'good');
    return}
  const f=Math.round(30*k),w=Math.round(20*k),m=Math.round(45*k),o=Math.round(6*k);
  S.res.food+=f;S.res.water+=w;S.res.o2+=o;storeItems({plate:Math.round(6*k),glass:Math.round(4*k),circuit:Math.round(3*k),brick:Math.round(6*k),o2can:Math.round(2*k),cell:1});
  toast(`Supply delivered: +${f} kg food, +${w} L water, +${o} kg O₂, plus plates, glass, circuits and bricks in colony storage`,'good');void m;
}
