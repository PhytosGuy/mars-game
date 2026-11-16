'use strict';

/* =========================================================
   COLONY PANEL
   ========================================================= */
let colTab='overview';
function togglePanel(id){if(id==='colony'){openMenu('colony');return}if(id==='mapov'&&cave.active){toast('No map signal underground');return}const el=$('#'+id),open=el.classList.contains('hidden');closePanels();if(open){el.classList.remove('hidden');if(id==='mapov')drawMap()}}
function closePanels(keepInv){$('#mapov').classList.add('hidden');if(game.wardrobe)closeWardrobe();if(!keepInv&&typeof invUI!=='undefined'&&invUI.open)openInventory(false)}
function activity(c,i){
  const t=tod();if(t<6||t>22.5)return'Sleeping';if(t<7.2)return'Breakfast and daily briefing';if(t>12&&t<13)return'Lunch with the crew';
  if(t>18.5&&t<20)return'Dinner, then a delayed call with Earth';if(t>=20)return i%2?'Exercise (2 h a day against bone loss)':'Recreation: films and games';
  return({Engineer:'Maintaining life support',Geologist:S.labQueue.length?'Analysing rock samples':'Planning geology traverses',Botanist:count('greenhouse')?'Tending greenhouse crops':'Preparing seed trials',
    'Medical Specialist':'Crew health checks','Robotics Specialist':'Servicing the rover','Planetary Scientist':'Reviewing orbital imagery'})[c.role]||'Working';
}
function renderColony(){
  $('#col-sub').textContent=`· Sol ${solNum()}, ${fmtTime()} · ${SITE.name}`;
  let h='';
  if(colTab==='overview'){
    const row=(n,stock,r,unit)=>{const sl=r<0?(parseFloat(stock)/(-r*SOL_H)).toFixed(1)+' sols left':'Stable';return`<tr><td>${n}</td><td>${stock}</td><td class="${r>=0?'pos':'neg'}">${rateStr(r,' '+unit)}</td><td>${sl}</td></tr>`};
    h+=`<div class="grid2"><div><h3>Life support</h3><table class="rt"><tr><th>Resource</th><th>Stock</th><th>Net</th><th>Outlook</th></tr>
      ${row('Oxygen',S.res.o2.toFixed(1)+' kg',S.rates.o2,'kg')}${row('Water',Math.round(S.res.water)+' L',S.rates.water,'L')}${row('Food',S.res.food.toFixed(1)+' kg',S.rates.food,'kg')}</table>
      <h3>Power grid</h3><table class="rt"><tr><td>Generation</td><td>${S.powerProd.toFixed(1)} kW</td></tr><tr><td>Demand</td><td>${S.powerDemand.toFixed(1)} kW</td></tr>
      <tr><td>Battery</td><td>${S.battery.toFixed(0)} / ${S.cap.toFixed(0)} kWh</td></tr><tr><td>Status</td><td class="${S.brownout?'neg':'pos'}">${S.brownout?'Shortage: shedding load':'Nominal'}</td></tr></table>
      <p class="sub" style="margin-top:10px;line-height:1.6;text-transform:none;letter-spacing:0">Crew of ${S.crew} uses about ${(0.84*S.crew).toFixed(1)} kg O₂, ${(1.8*S.crew).toFixed(1)} kg food and ${(4*S.crew*(S.research.has('recycling')?0.5:1)).toFixed(0)} L water (after recycling) per sol. Next supply lander: sol ${Math.floor(S.nextSupply/SOL_H)+1}.</p></div>
      <div><h3>Modules</h3><table class="rt"><tr><th>Module</th><th>#</th><th>Power</th><th>Status</th><th></th></tr>`;
    for(const t of BUILD_ORDER){const list=blds.filter(b=>b.type===t);if(!list.length)continue;const d=BUILD[t];
      const off=list.some(b=>!b.on),f=list.filter(b=>b.fault).length,up=list.filter(b=>b.progress>=1&&d.power>0&&b.on&&!b.powered).length,bld=list.filter(b=>b.progress<1).length;
      const st=[f?`<span class="neg">${f} fault</span>`:'',up?`<span class="neg">${up} unpowered</span>`:'',bld?`${bld} building`:''].filter(Boolean).join(', ')||'<span class="pos">OK</span>';
      h+=`<tr><td>${d.name}</td><td>${list.length}</td><td>${d.power?d.power+' kW':(t==='solar'?'+2.5 kW peak':t==='reactor'?'+10 kW':'–')}</td><td>${st}</td><td>${d.power>0&&t!=='habitat'?`<span class="tog ${off?'off':''}" data-toggle="${t}">${off?'OFF':'ON'}</span>`:''}</td></tr>`}
    h+=`</table></div></div>`;
  }else if(colTab==='research'){
    h+=`<div class="sec">From your discoveries</div><p class="sub" style="text-transform:none;letter-spacing:0;font-size:13px">Exploring and doing science on Mars unlocks practical technology on its own.</p><div class="rgrid">${Object.entries(DISCO_TECH).map(([k,T])=>`<div class="rcard ${tech(k)?'done':''}">${thumbImg('d:'+k)}<div class="sub">Discovery</div><h4>${T.name}</h4><p>${T.effect}</p>${tech(k)?'<span class="pos" style="font-size:12px;font-weight:600">✓ In use</span>':`<span class="sub" style="text-transform:none">🔍 Unlock by ${T.from}</span>`}</div>`).join('')}</div><div class="sec">Research projects</div>`;
    h+=`<p class="sub" style="text-transform:none;letter-spacing:0;font-size:13px">Research points: <b style="color:#c69bff">${Math.floor(S.res.rp)}</b>. Earn them by scanning points of interest and analysing samples in a lab.</p><div class="rgrid">`;
    for(const r of RESEARCH){const done=S.research.has(r.id),ok=!r.req||r.req();
      h+=`<div class="rcard ${done?'done':''}">${thumbImg('r:'+r.id)}<div class="sub">${r.branch}</div><h4>${r.name}</h4><p>${r.desc}</p>`+
        (done?'<span class="pos" style="font-size:12px;font-weight:600">✓ Complete</span>':ok?`<button class="btn sm" data-res="${r.id}" ${S.res.rp<r.cost?'disabled':''}>Research · ${r.cost} RP</button>`:`<span class="sub" style="text-transform:none">🔒 ${r.reqText}</span>`)+`</div>`}
    h+='</div>';
  }else if(colTab==='crew'){
    h+=`<table class="rt"><tr><th>Name</th><th>Specialty</th><th>Bonus</th><th>Right now</th></tr>${S.crewList.map((c,i)=>`<tr><td>${c.name}</td><td>${thumbImg('c:'+c.role)}${c.role}</td><td>${c.bonus}</td><td>${activity(c,i)}</td></tr>`).join('')}</table>
      <p class="sub" style="margin-top:12px;text-transform:none;letter-spacing:0;line-height:1.6">Crew wellbeing stays high when life support is stable. Running out of power or supplies puts the mission at risk. Your EVA radiation dose so far: ${S.dose.toFixed(2)} mSv (Curiosity measured about 0.64 mSv per day on the surface).</p>`;
  }else if(colTab==='log'){
    h+=S.log.length?`<div class="log">${S.log.map(l=>`<div class="sub">Sol ${l.sol} · ${l.sub}</div><b>${l.title}</b><p>${l.body}</p>`).join('')}</div>`:'<p class="sub">No reports yet. Scan a point of interest to get started.</p>';
    const fs=(S.facts||[]).filter(i=>NASA_FACTS[i]);h+=`<h3>NASA facts collected · ${fs.length}/${NASA_FACTS.length}</h3>`+(fs.length?`<div class="log">${fs.map(i=>`<p>${esc(NASA_FACTS[i][1])}</p>`).join('')}</div>`:'<p class="sub">Mission Control shares real NASA observations over the radio as you explore.</p>');
  }else{
    const facts=[['Sol length','24 h 39 min 35 s (24.66 h)','Drives the day–night cycle and solar power'],['Gravity','3.72 m/s² (38% of Earth)','Floaty jumps and rover physics'],
      ['Surface pressure','~610 Pa (0.6% of Earth)','Shown in the HUD; varies daily and with storms'],['Temperatures',`${SITE.temp[0]} °C to ${SITE.temp[1]} °C at this site`,'Based on rover weather stations such as Perseverance’s MEDA'],
      ['Surface radiation','~0.64 mSv/day (Curiosity RAD)','Tracked as your EVA dose'],['MOXIE','Made up to ~12 g O₂/hour on Perseverance','Oxygen Units are a scaled-up version'],
      ['Buried ice','Detected by MRO SHARAD radar at mid-latitudes','Ice signatures and Ice Drill placement'],['Perchlorates','Found by Phoenix (2008)','Salt crust science; water purification'],
      ['Dust devils','Cleaned the solar panels of Spirit and Opportunity','Dust devils can clean your panels too'],['Blue sunsets','Fine dust scatters blue light near the Sun','The sky turns blue around the setting Sun'],
      ['Phobos','Orbits faster than Mars spins, so it rises in the west','Watch it cross the night sky'],['Kilopower','NASA fission demo (KRUSTY, 2018)','Fission Power Unit'],
      ['Crew needs','~0.84 kg O₂ and ~1.8 kg food per person per day','Colony consumption rates'],['Water recovery','The ISS recycles about 98% of its water','Water Recovery System research']];
    h+=`<table class="rt"><tr><th>Fact</th><th>Value</th><th>Used in game for</th></tr>${facts.map(f=>`<tr><td>${f[0]}</td><td>${f[1]}</td><td>${f[2]}</td></tr>`).join('')}</table>
    <p class="sub" style="margin-top:12px;text-transform:none;letter-spacing:0;line-height:1.6">${SITE.inspired} The terrain is procedurally generated in that spirit; it does not reproduce real elevation data. Sources: NASA Mars 2020, MSL Curiosity, InSight, MRO and Phoenix mission results. No discovery of life on Mars is presented as fact.</p>`;
  }
  $('#col-body').innerHTML=h;
}
// (colony pages live in the Tab menu; clicks are handled in inventory-ui.js)

/* =========================================================
   MAP
   ========================================================= */
const mapC=$('#mapc'),mctx=mapC.getContext('2d'),mapOff=document.createElement('canvas');mapOff.width=mapOff.height=180;
const MAP_R=1400;let mapC0=null;
function renderMapTerrain(){
  const N=180,step=MAP_R*2/N,hs=new Float32Array(N*N),cols=new Float32Array(N*N*3),ices=new Float32Array(N*N);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=mapC0.x-MAP_R+(i+0.5)*step,z=mapC0.z-MAP_R+(j+0.5)*step,k=j*N+i;
    sample(x,z,TS3);hs[k]=TS3.h;ices[k]=TS3.ice;terrainColor(x,z,TS3,0.15,_col);cols[k*3]=_col.r;cols[k*3+1]=_col.g;cols[k*3+2]=_col.b}
  const octx=mapOff.getContext('2d'),img=octx.createImageData(N,N);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i,dx=hs[j*N+Math.min(N-1,i+1)]-hs[j*N+Math.max(0,i-1)],dz=hs[Math.min(N-1,j+1)*N+i]-hs[Math.max(0,j-1)*N+i];
    const sh=clamp(1+(-dx-dz)*0.03,0.45,1.5);let r=Math.pow(cols[k*3],1/2.2)*255*sh,g=Math.pow(cols[k*3+1],1/2.2)*255*sh,b=Math.pow(cols[k*3+2],1/2.2)*255*sh;
    if(S.flags.iceFound&&ices[k]>0.4){const t=0.5*smooth(0.4,0.8,ices[k]);r=lerp(r,110,t);g=lerp(g,190,t);b=lerp(b,255,t)}
    img.data[k*4]=r;img.data[k*4+1]=g;img.data[k*4+2]=b;img.data[k*4+3]=255}
  octx.putImageData(img,0,0);
}
const w2m=(x,z)=>[(x-(mapC0.x-MAP_R))/(2*MAP_R)*720,(z-(mapC0.z-MAP_R))/(2*MAP_R)*720];
function drawMap(){
  const f=focusPos();
  if(!mapC0||Math.hypot(mapC0.x-f.x,mapC0.z-f.z)>250||mapC0.ice!==!!S.flags.iceFound){mapC0={x:f.x,z:f.z,ice:!!S.flags.iceFound};renderMapTerrain()}
  const c=mctx;c.imageSmoothingEnabled=true;c.drawImage(mapOff,0,0,720,720);
  // gridlines every 100 m, labelled every 500 m (east and north of the landing site)
  c.lineWidth=1;c.font='600 10px Nunito Sans';c.fillStyle='rgba(255,255,255,.6)';
  for(let g=Math.ceil((mapC0.x-MAP_R)/100)*100;g<mapC0.x+MAP_R;g+=100){const[x]=w2m(g,0),major=g%500===0;c.strokeStyle=major?'rgba(255,255,255,.2)':'rgba(255,255,255,.07)';c.beginPath();c.moveTo(x,0);c.lineTo(x,720);c.stroke();if(major){c.textAlign='center';c.fillText(`E${g>=0?'+':''}${g}`,x,712)}}
  for(let g=Math.ceil((mapC0.z-MAP_R)/100)*100;g<mapC0.z+MAP_R;g+=100){const[,y]=w2m(0,g),major=g%500===0;c.strokeStyle=major?'rgba(255,255,255,.2)':'rgba(255,255,255,.07)';c.beginPath();c.moveTo(0,y);c.lineTo(720,y);c.stroke();if(major){c.textAlign='left';c.fillText(`N${-g>=0?'+':''}${-g}`,4,y-3)}}
  for(const b of blds){const[x,y]=w2m(b.x,b.z);c.fillStyle=b.type==='beacon'?'#ffb06a':b.fault?'#ff4a3d':'#fff';const s=b.type==='habitat'?6:b.type==='beacon'?3:3.5;
    if(b.type==='beacon'){c.beginPath();c.moveTo(x,y-5);c.lineTo(x+4,y+3);c.lineTo(x-4,y+3);c.fill()}else c.fillRect(x-s/2,y-s/2,s,s)}
  for(const p of poisNear(mapC0.x,mapC0.z,MAP_R*1.42)){if(!S.discovered.has(p.id))continue;const[x,y]=w2m(p.x,p.z);c.save();c.translate(x,y);c.rotate(Math.PI/4);
    c.fillStyle=poiDone(p)?'#777':POI[p.type].color;c.fillRect(-4,-4,8,8);c.strokeStyle='#000';c.lineWidth=1;c.strokeRect(-4,-4,8,8);c.restore()}
  // fog of war: only ground you (or your crew) have seen is drawn
  c.fillStyle='rgba(14,9,8,0.82)';const FC=64,cs=FC/(2*MAP_R)*720;
  for(let i=Math.floor((mapC0.x-MAP_R)/FC);i*FC<mapC0.x+MAP_R;i++)for(let j=Math.floor((mapC0.z-MAP_R)/FC);j*FC<mapC0.z+MAP_R;j++)if(!S.explored[i+','+j]){const[x,y]=w2m(i*FC,j*FC);c.fillRect(Math.floor(x),Math.floor(y),Math.ceil(cs)+1,Math.ceil(cs)+1)}
  for(const b of blds){if(b.type!=='habitat'&&b.type!=='beacon')continue;const[x,y]=w2m(b.x,b.z);c.fillStyle=b.type==='habitat'?'#fff':'#ffb06a';c.fillRect(x-3,y-3,6,6)}
  c.font='600 11px Nunito Sans';c.textAlign='center';
  for(const L of landmarksNear(mapC0.x,mapC0.z,MAP_R*1.42)){const st=S.landmarks[L.id];if(!st||!st.seen)continue;const[x,y]=w2m(L.x,L.z),info=LM_INFO[L.type];
    c.fillStyle=st.visited?info.color||'#f0d9a8':'rgba(0,0,0,.5)';c.strokeStyle=info.color||'#f0d9a8';c.lineWidth=2;c.beginPath();c.arc(x,y,6,0,TAU);c.fill();c.stroke();
    if(st.visited){c.fillStyle='rgba(255,255,255,.9)';c.fillText(L.name,x,y-11)}else{c.fillStyle='rgba(255,255,255,.55)';c.fillText('?',x,y+4)}}
  for(const e of entrancesNear(mapC0.x,mapC0.z,MAP_R*1.42)){const known=S.caves[e.id]||(S.knownCaves&&S.knownCaves[e.id])||S.explored[Math.floor(e.x/64)+','+Math.floor(e.z/64)];if(!known)continue;
    const[x,y]=w2m(e.x,e.z);c.fillStyle='#120c0a';c.strokeStyle='#d9a066';c.lineWidth=2;c.beginPath();c.ellipse(x,y,7,4.5,0,0,TAU);c.fill();c.stroke()}
  for(const lc of S.lostCaches){const[x,y]=w2m(lc.x,lc.z);c.strokeStyle='#ff6b5e';c.lineWidth=2.5;c.beginPath();c.moveTo(x-5,y-5);c.lineTo(x+5,y+5);c.moveTo(x+5,y-5);c.lineTo(x-5,y+5);c.stroke()}
  for(const p of pings){const[x,y]=w2m(p.x,p.z);c.strokeStyle='#ffd25e';c.lineWidth=2;c.beginPath();c.arc(x,y,7,0,TAU);c.stroke()}
  for(const rp of net.players.values()){if(!rp.a)continue;const dr=rp.t&&rp.t.p&&rp.t.p[4],[x,y]=dr?w2m(rp.rv.position.x,rp.rv.position.z):w2m(rp.a.position.x,rp.a.position.z),im=rp.lookS&&pfpImage(rp.lookS);c.save();c.beginPath();c.arc(x,y,14,0,TAU);c.fillStyle='#8fe3ff';c.fill();if(im&&im.complete&&im.naturalWidth){c.clip();c.drawImage(im,x-13,y-13,26,26)}c.restore();c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(x,y,14,0,TAU);c.stroke();c.fillStyle='#cfefff';c.fillText(rp.name||'',x,y-19)}
  c.textAlign='left';
  c.font='700 11px Nunito Sans';c.textAlign='center';for(const w of S.pwp||[]){const[x,y]=w2m(w.x,w.z);c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle=w.col;c.fillRect(-6,-6,12,12);c.strokeStyle='#000';c.lineWidth=1.5;c.strokeRect(-6,-6,12,12);c.restore();
    c.fillStyle='rgba(0,0,0,.55)';const tw=c.measureText(w.name).width+8;c.fillRect(x-tw/2,y-25,tw,14);c.fillStyle='#fff';c.fillText(w.name,x,y-14)}c.textAlign='left';
  if(S.waypoint){const[x,y]=w2m(S.waypoint.x,S.waypoint.z);c.strokeStyle='#5fe3c9';c.lineWidth=2.5;c.beginPath();c.arc(x,y,9,0,TAU);c.stroke();c.beginPath();c.arc(x,y,2,0,TAU);c.stroke()}
  {const[x,y]=w2m(R.pos.x,R.pos.z);c.fillStyle='#ff8a3d';c.beginPath();c.arc(x,y,5,0,TAU);c.fill()}
  {const[x,y]=w2m(f.x,f.z),yaw=P.mode==='foot'?P.yaw:R.yaw;c.save();c.translate(x,y);c.rotate(-yaw+Math.PI);c.fillStyle='#fff';c.strokeStyle='#000';c.lineWidth=1.5;
    c.beginPath();c.moveTo(0,-9);c.lineTo(6,7);c.lineTo(0,3);c.lineTo(-6,7);c.closePath();c.fill();c.stroke();c.restore()}
  // grid labels on top, so they're readable over unexplored ground too
  c.font='700 10px Nunito Sans';c.fillStyle='rgba(255,255,255,.75)';
  for(let g=Math.ceil((mapC0.x-MAP_R)/500)*500;g<mapC0.x+MAP_R;g+=500){const[x]=w2m(g,0);c.textAlign='center';c.fillText(`E${g>=0?'+':''}${g}`,x,684)}
  for(let g=Math.ceil((mapC0.z-MAP_R)/500)*500;g<mapC0.z+MAP_R;g+=500){const[,y]=w2m(0,g);c.textAlign='left';c.fillText(`N${-g>=0?'+':''}${-g}`,4,y-3)}c.textAlign='left';
  c.fillStyle='rgba(0,0,0,.45)';c.fillRect(10,690,130,20);c.fillStyle='#fff';c.fillRect(20,700,72,3);c.font='11px Nunito Sans';c.fillText('500 m',98,705);
  c.fillText('N ↑',690,24);
  $('#maplegend').innerHTML='<span style="color:#ffd34d">◆ Public waypoints</span><span>▲ You</span><span style="color:#ff8a3d">● Rover</span><span>■ Modules</span><span style="color:#5fe3c9">◆ Points of interest</span><span style="color:#f0d9a8">● Landmarks (? = unvisited)</span><span style="color:#d9a066">⬭ Caves</span><span style="color:#ff6b5e">✕ Lost gear</span><span style="color:#8fe3ff">● Crew</span><span style="opacity:.7">Dark = unexplored</span><span style="color:#5fe3c9">◎ Waypoint</span>'+(S.flags.iceFound?'<span style="color:#8fd8ff">Blue: ice-rich ground</span>':'');
}
function mapEvt(e){const r=mapC.getBoundingClientRect();return{x:mapC0.x-MAP_R+(e.clientX-r.left)/r.width*2*MAP_R,z:mapC0.z-MAP_R+(e.clientY-r.top)/r.height*2*MAP_R}}
let wpMode='me',wpAt=null;
$('#wpmode').addEventListener('click',e=>{const b=e.target.closest('[data-wpm]');if(!b)return;wpMode=b.dataset.wpm;document.querySelectorAll('#wpmode button').forEach(x=>x.classList.toggle('on',x===b));
  $('#maphint').textContent=wpMode==='pub'?'Click: add a public waypoint everyone can see · Click yours again to remove it':'Click: set your waypoint · Right-click: clear'});
mapC.addEventListener('click',e=>{const p=mapEvt(e),r=mapC.getBoundingClientRect(),k=2*MAP_R/r.width;
  if(wpMode==='pub'){const hit=(S.pwp||[]).find(w=>Math.hypot(w.x-p.x,w.z-p.z)<14*k);
    if(hit){if(hit.by===myPid()||net.role!=='guest'){act({a:'pwpDel',id:hit.id});toast('Public waypoint removed');setTimeout(drawMap,100)}else toast(`“${hit.name}” was placed by ${hit.who}`);return}
    wpAt=p;$('#wpname').classList.remove('hidden');const i=$('#wpn-in');i.value='';i.focus();return}
  S.waypoint=p;drawMap();toast('Waypoint set: it shows on your compass','good')});
function addPublicWp(){const n=$('#wpn-in').value.trim().slice(0,24);if(!wpAt)return;act({a:'pwpAdd',x:wpAt.x,z:wpAt.z,name:n||'Waypoint',who:net.name||'Crewmate'});wpAt=null;$('#wpname').classList.add('hidden');toast('Public waypoint added: everyone in the colony can see it','good');setTimeout(drawMap,150)}
$('#wpn-ok').addEventListener('click',addPublicWp);$('#wpn-x').addEventListener('click',()=>{wpAt=null;$('#wpname').classList.add('hidden')});
$('#wpn-in').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')addPublicWp();if(e.key==='Escape'){wpAt=null;$('#wpname').classList.add('hidden')}});
mapC.addEventListener('contextmenu',e=>{e.preventDefault();S.waypoint=null;drawMap()});
$('#mapov').addEventListener('click',e=>{if(e.target.id==='mapov'||e.target.closest('[data-close]'))closePanels()});
