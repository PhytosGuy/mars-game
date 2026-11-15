'use strict';
/* =========================================================
   NASA MISSION DESIGN LAB (its own page): design a real-style science mission from idea to launch.
   Built on NASA's own process:
   - the four mission segments (launch, space, ground, user) from "Design and Develop Science Missions"
   - JPL's Concept Maturity Levels (CML 1–4) and the Mission Design Lab's study stages
     (Office Hours → Concept Development → Trade Studies → Point Design)
   - objective → wavelength → instrument → optics choices, like the Webb "build it yourself" game
   - CubeSat options and phases from NASA's CubeSat 101
   - an Earth–Mars launch-window calculator (the kind of analysis GMAT does)
   - a 3D trajectory and mission timeline you can scrub (like NASA Mission Viz), with a VR view
   - Canadian Space Agency (CSA) contributions to real missions
   Every choice has a 3D model (models.js). Launched missions are saved in this browser under "My missions",
   and the game gives your colony research points for them the next time you play.
   ========================================================= */
const $ = s => document.querySelector(s), TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let AC = null;
function beep(f = 440, d = 0.2, type = 'sine', vol = 0.05) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d) } catch (e) { } }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 3200) }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ML_DEST={mars:'Mars',L2:'Sun–Earth L2 (1.5 million km from Earth)',leo:'Low Earth orbit'};
const ML_WL={radio:'Radio',radar:'Radar (microwave)',ir:'Infrared',vis:'Visible light',uv:'Ultraviolet',xray:'X-ray',particles:'Particles & fields',none:'Direct contact'};
const ML_INST={
  cam:{n:'High-resolution camera',wl:'vis',kg:65,w:60,m:40},
  imager:{n:'Miniature multispectral imager',wl:'vis',kg:1.2,w:5,m:3},
  irspec:{n:'Infrared spectrometer',wl:'ir',kg:33,w:40,m:50},
  radar:{n:'Ground-penetrating radar',wl:'radar',kg:22,w:30,m:40},
  uvspec:{n:'Ultraviolet spectrograph',wl:'uv',kg:22,w:25,m:40},
  ngims:{n:'Gas and ion mass spectrometer',wl:'particles',kg:25,w:30,m:45},
  mag:{n:'Magnetometer',wl:'particles',kg:1,w:3,m:6},
  xrf:{n:'X-ray fluorescence spectrometer (like PIXL)',wl:'xray',kg:7,w:25,m:30},
  drill:{n:'Rock drill and sample cache',wl:'none',kg:45,w:150,m:90},
  seis:{n:'Seismometer (like InSight’s SEIS)',wl:'none',kg:30,w:10,m:60},
  nircam:{n:'Near-infrared camera',wl:'ir',kg:160,w:50,m:150},
  mirs:{n:'Mid-infrared spectrograph',wl:'ir',kg:100,w:40,m:140},
  relay:{n:'Relay radio (UHF)',wl:'radio',kg:1.5,w:12,m:4},
};
const ML_OBJ={
  water:{n:'Map Mars’s ancient water and buried ice',dest:'mars',arch:['orbiter','lander','rover'],wl:['ir','radar'],need:[['irspec','radar']],real:['Mars Reconnaissance Orbiter (2005)','Mars Odyssey (2001)'],csa:''},
  atmo:{n:'Find out how Mars lost its atmosphere',dest:'mars',arch:['orbiter','cubesat6'],wl:['uv','particles'],need:[['uvspec','ngims','mag']],real:['MAVEN (2013)','ESCAPADE (2025)'],csa:''},
  life:{n:'Search rocks for signs of ancient life',dest:'mars',arch:['rover'],wl:['xray','ir','vis','none'],need:[['drill'],['xrf','irspec','cam']],real:['Perseverance (2020)','Curiosity (2011)'],csa:'Curiosity’s APXS rock-chemistry spectrometer was built by the Canadian Space Agency.'},
  quakes:{n:'Listen to marsquakes to map the planet’s core',dest:'mars',arch:['lander'],wl:['none'],need:[['seis']],real:['InSight (2018)'],csa:''},
  relay:{n:'Relay a lander’s signal home in real time',dest:'mars',arch:['cubesat6','orbiter'],wl:['radio'],need:[['relay']],real:['MarCO CubeSats (2018)','Mars Reconnaissance Orbiter'],csa:''},
  galaxies:{n:'See the first galaxies after the Big Bang',dest:'L2',arch:['telescope'],wl:['ir'],need:[['nircam']],real:['James Webb Space Telescope (2021)'],csa:'Webb’s Fine Guidance Sensor and NIRISS instrument came from the Canadian Space Agency.'},
  exo:{n:'Sniff the air of planets around other stars',dest:'L2',arch:['telescope'],wl:['ir'],need:[['mirs','nircam']],real:['James Webb Space Telescope','Spitzer (2003)'],csa:'Canada’s NIRISS on Webb studies exoplanet atmospheres.'},
  climate:{n:'Measure Earth’s changing climate from orbit',dest:'leo',arch:['cubesat3','cubesat6','orbiter'],wl:['vis','ir'],need:[['imager','irspec','cam']],real:['Landsat 9 (2021)','PACE (2024)','NASA Earth-science CubeSats'],csa:'The CSA’s RADARSAT Constellation watches Canada’s land, ice and oceans.'},
};
const ML_ARCH={
  cubesat3:{n:'3U CubeSat',kg:4,pay:1.5,w:20,m:1,risk:2,desc:'Three 10 cm cubes, about 4 kg. Cheap and quick to build, often launched as a rideshare.'},
  cubesat6:{n:'6U CubeSat',kg:12,pay:4,w:40,m:3,risk:2,desc:'Six units, about 12 kg. MarCO flew two of these to Mars in 2018.'},
  orbiter:{n:'Orbiter',kg:1100,pay:250,w:2000,m:450,risk:1,desc:'Circles the planet for years, mapping it and relaying data.'},
  lander:{n:'Stationary lander',kg:700,pay:80,w:600,m:600,risk:2,desc:'Lands in one place to listen, dig or measure for a long time.'},
  rover:{n:'Rover',kg:1025,pay:100,w:110,m:2400,risk:3,desc:'Drives to the most interesting rocks. The most capable and the most complex.'},
  telescope:{n:'Space telescope',kg:6200,pay:1000,w:2000,m:9000,risk:3,desc:'A huge mirror far from Earth’s heat and light, to see faint, distant things.'},
};
const ML_LV={
  electron:{n:'Rocket Lab Electron (small launcher)',cap:{leo:300,mars:0,L2:0}},
  f9:{n:'SpaceX Falcon 9',cap:{leo:22800,mars:4000,L2:4000}},
  atlas:{n:'ULA Atlas V 541 (launched Perseverance)',cap:{leo:18800,mars:4500,L2:4000}},
  ariane:{n:'Ariane 5 (ESA, launched Webb)',cap:{leo:20000,mars:3500,L2:6600}},
  sls:{n:'NASA Space Launch System',cap:{leo:95000,mars:27000,L2:27000}},
};
const ML_STEPS=[['intro','Start','How NASA designs missions'],['obj','CML 1','Office Hours: the science idea'],['arch','CML 2–3','Concept Development & Trade Study'],['design','CML 4','Point Design'],['seg','Segments','Launch, ground and users'],['traj','Trajectory','Launch window & flight path'],['verify','Verify','Check every requirement'],['launch','Launch','Liftoff and results']];
const ML={step:0,level:1,objs:[],arch:null,inst:[],power:'solar',optic:'med',lv:null,day:0,res:null,viz:null};
const mlDest=()=>ML.objs.length?ML_OBJ[ML.objs[0]].dest:null;
const mlMass=()=>(ML.arch?ML_ARCH[ML.arch].kg:0)+ML.inst.reduce((a,k)=>a+ML_INST[k].kg,0)+(ML.power==='rtg'?45:0)+(ML.arch==='telescope'?{small:-1500,med:0,big:1500}[ML.optic]:0);
const mlCost=()=>(ML.arch?ML_ARCH[ML.arch].m:0)+ML.inst.reduce((a,k)=>a+ML_INST[k].m,0)+(ML.power==='rtg'?80:0)+(ML.arch==='telescope'?{small:-3000,med:0,big:2500}[ML.optic]:0);
const mlPay=()=>ML.inst.reduce((a,k)=>a+ML_INST[k].kg,0);
function mlNeedsMet(o){return ML_OBJ[o].need.every(group=>group.some(k=>ML.inst.includes(k)))}
function mlCanNext(){const s=ML_STEPS[ML.step][0];
  if(s==='obj')return ML.objs.length>0;if(s==='arch')return!!ML.arch;if(s==='design')return ML.inst.length>0&&mlPay()<=ML_ARCH[ML.arch].pay;
  if(s==='seg')return!!ML.lv&&ML_LV[ML.lv].cap[mlDest()]>=mlMass();if(s==='traj')return mlDest()!=='mars'||Math.abs(mlWindowOff(ML.day))<=45;if(s==='verify')return mlChecks().every(c=>c[1]);return true}
/* ---------- launch windows: real planet positions (mean longitudes from J2000) ---------- */
const mlD0=()=>(Date.now()-Date.UTC(2000,0,1,12))/864e5;
/* ---------- orbital mechanics: calculated, not guessed ----------
   Planet positions use JPL's "Approximate Positions of the Planets" mean longitudes (valid 1800–2050).
   The transfer uses Kepler's third law and the vis-viva equation with NASA fact-sheet values. */
const ORBIT={aE:1.00000261,aM:1.52371034,LE0:100.46457166,LEr:35999.37244981,LM0:-4.55343205,LMr:19140.30268499,vE:29.78,vM:24.07,yr:365.256,
  get aT(){return(this.aE+this.aM)/2},get tDays(){return 0.5*Math.pow(this.aT,1.5)*this.yr},get pM(){return Math.pow(this.aM,1.5)*this.yr},
  get phase(){return 180-this.tDays/this.pM*360},get synodic(){return 1/(1/this.yr-1/this.pM)},
  get dv1(){return this.vE*(Math.sqrt(2*this.aM/(this.aE+this.aM))-1)},get dv2(){return this.vM*(1-Math.sqrt(2*this.aE/(this.aE+this.aM)))}};
const mlLon=(d,p)=>{const T=d/36525,L=p==='E'?ORBIT.LE0+ORBIT.LEr*T:ORBIT.LM0+ORBIT.LMr*T;return((L%360)+360)%360};
const OK_='<span class="mlv" title="Calculated from physics or taken from NASA data">✓</span>',EST='<span class="mle" title="A simplified estimate for the game">≈</span>';
function mlPhase(d){return((mlLon(d,'M')-mlLon(d,'E'))%360+360)%360}         // how far Mars leads Earth
function mlBestDay(){const d0=mlD0(),need=ORBIT.phase;let best=0,bd=1e9;for(let i=0;i<820;i++){const e=Math.abs(mlPhase(d0+i)-need);if(e<bd){bd=e;best=i}}return best}
function mlWindowOff(day){const best=ML.bestDay;let off=day-best;if(off>390)off-=780;if(off<-390)off+=780;return off}
function mlChecks(){
  const c=[];for(const o of ML.objs)c.push([`Science requirement: ${ML_OBJ[o].n}`,mlNeedsMet(o)]);
  if(ML.arch)c.push([`Payload mass ${mlPay().toFixed(1)} kg fits the ${ML_ARCH[ML.arch].n} (max ${ML_ARCH[ML.arch].pay} kg)`,mlPay()<=ML_ARCH[ML.arch].pay]);
  if(ML.lv)c.push([`${ML_LV[ML.lv].n} can lift ${Math.round(mlMass())} kg to ${ML_DEST[mlDest()]}`,ML_LV[ML.lv].cap[mlDest()]>=mlMass()]);
  if(ML.arch==='rover'||ML.arch==='lander')c.push([ML.power==='rtg'?'Nuclear power (RTG) works through dust storms and winters':'Solar panels: dust storms can cut power (Opportunity was lost in a 2018 storm)',true]);
  if(mlDest()==='mars')c.push([`Launch ${Math.abs(mlWindowOff(ML.day))<=20?'inside':'near'} the Earth–Mars window`,Math.abs(mlWindowOff(ML.day))<=45]);
  return c}
/* ---------- 3D pictures for the option cards ---------- */
const TH = {
  obj: k => M3.thumb('obj:' + k, () => M3.objective(k)),
  arch: k => M3.thumb('arch:' + k, () => M3.craft(k, { power: k === 'rover' ? 'rtg' : 'solar', optic: 'big' })),
  inst: k => M3.thumb('inst:' + k, () => M3.instrument(k)),
  pow: k => M3.thumb('pow:' + k, () => M3.power(k)),
  mir: k => M3.thumb('mir:' + k, () => M3.mirror(k)),
  lv: k => M3.thumb('lv:' + k, () => M3.rocket(k)),
};
const img = src => src ? `<img class="th" src="${src}" alt="" draggable="false">` : '';
const DEST_SHORT = { mars: 'Mars', L2: 'L2', leo: 'Earth orbit' };
const ML_LV_H = { electron: 18, f9: 70, atlas: 58, ariane: 52, sls: 98 };

function renderML() {
  const st = ML_STEPS[ML.step][0], el = $('#mlbody');
  $('#mlsteps').innerHTML = ML_STEPS.map(([k, l, d], i) => `<div class="mls ${i < ML.step ? 'done' : i === ML.step ? 'on' : ''}"><i>${i + 1}</i><b>${l}</b><span>${d}</span></div>`).join('');
  let h = '';
  if (st === 'intro') {
    h = `<div class="mlintro"><h2>Design a science mission, the NASA way</h2>
    <p>Every NASA mission starts as an idea and grows into a spacecraft through careful steps. JPL measures this with <b>Concept Maturity Levels</b> (CML): a mission goes from a rough idea (CML 1) to a detailed point design (CML 4) before it can become a real project. Goddard’s <b>Mission Design Lab</b> helps teams through the same stages: Office Hours, Concept Development, Trade Studies and Point Design.</p>
    <div class="segs">${[['Launch segment', 'The rocket and launch services that put the mission in space.'], ['Space segment', 'The spacecraft and instruments: orbiters, landers, rovers, telescopes or CubeSats.'], ['Ground segment', 'Antennas and mission control: NASA’s Deep Space Network talks to spacecraft across the solar system.'], ['User segment', 'The scientists and the public who use the data, kept in NASA archives for everyone.']].map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</div>
    <p class="sub">${OK_} means a value is calculated from physics or comes from NASA data. ${EST} means it’s a simplified estimate for the game. Every choice you make appears as a 3D model on the right.</p><div class="sub">Pick your challenge</div><div class="chips">${[1, 2, 3].map(l => `<button data-lvl="${l}" class="${ML.level === l ? 'on' : ''}">Level ${l}: ${l} science objective${l > 1 ? 's' : ''}</button>`).join('')}</div></div>`
  }
  else if (st === 'obj') {
    const d = mlDest(); h = `<h3>CML 1 · Office Hours: what do you want to discover?</h3><p class="sub">Choose up to ${ML.level}. A mission can only go to one destination, so some goals can’t share a spacecraft.</p><div class="mlcards">${Object.entries(ML_OBJ).map(([k, o]) => {
      const on = ML.objs.includes(k), bad = !on && ((d && o.dest !== d) || ML.objs.length >= ML.level);
      return `<button class="mlcard ${on ? 'on' : ''}" data-obj="${k}" ${bad ? 'disabled' : ''}>${img(TH.obj(k))}<b>${o.n}</b><span>Destination: ${ML_DEST[o.dest]}</span><span>Sees in: ${o.wl.map(w => ML_WL[w]).join(', ')}</span>${bad && d && o.dest !== d ? '<em>Different destination</em>' : ''}</button>`
    }).join('')}</div>`
  }
  else if (st === 'arch') {
    const ok = Object.keys(ML_ARCH).filter(a => ML.objs.every(o => ML_OBJ[o].arch.includes(a)));
    h = `<h3>CML 2–3 · Concept Development and Trade Study</h3><p class="sub">Is it feasible, and which kind of spacecraft is best? Compare the options: engineers weigh mass, power, cost and risk. ${EST} Figures are rounded estimates loosely based on real missions of each type.</p>
    <div class="mlcards">${Object.entries(ML_ARCH).map(([k, a]) => {
      const can = ok.includes(k);
      return `<button class="mlcard ${ML.arch === k ? 'on' : ''}" data-arch="${k}" ${can ? '' : 'disabled'}>${img(TH.arch(k))}<b>${a.n}</b><span>${a.desc}</span>
        <div class="kv"><span>Mass ≈ <b>${a.kg.toLocaleString()} kg</b></span><span>Payload ≈ <b>${a.pay} kg</b></span><span>Power ≈ <b>${a.w.toLocaleString()} W</b></span><span>Cost ≈ <b>$${a.m.toLocaleString()}M</b></span><span>Risk <b>${['', 'Low', 'Medium', 'High'][a.risk]}</b></span></div>${can ? '' : '<em>Can’t do this science</em>'}</button>`
    }).join('')}</div>
    ${ML.arch && ML.arch.startsWith('cubesat') ? `<div class="mlnote"><b>CubeSat 101.</b> A CubeSat is built from 10 cm “units” (1U). Teams go through the same phases as big missions: a concept of operations (ConOps), design, building and testing, then integration into a deployer that rides along with a bigger launch, and finally operations. NASA’s CubeSat Launch Initiative gives university and school teams free rides to space.</div>` : ''}`
  }
  else if (st === 'design') {
    const A = ML_ARCH[ML.arch], wls = new Set(ML.objs.flatMap(o => ML_OBJ[o].wl));
    h = `<h3>CML 4 · Point Design: instruments, optics and power</h3><p class="sub">Your goals need these kinds of light (or contact): ${[...wls].map(w => ML_WL[w]).join(', ')}. Instruments that can’t see them are unavailable. Each one you pick is mounted on your spacecraft.</p>
    <div class="mlbud"><span>Payload ${mlPay().toFixed(1)} / ${A.pay} kg</span><i><i style="width:${Math.min(100, mlPay() / A.pay * 100)}%;background:${mlPay() > A.pay ? '#ff6a4d' : '#7fe6a0'}"></i></i></div>
    <div class="mlcards">${Object.entries(ML_INST).map(([k, I]) => {
      const on = ML.inst.includes(k), can = wls.has(I.wl), tooBig = !on && mlPay() + I.kg > A.pay;
      return `<button class="mlcard ${on ? 'on' : ''}" data-inst="${k}" ${!can || tooBig ? 'disabled' : ''}>${img(TH.inst(k))}<b>${I.n}</b><span>${ML_WL[I.wl]} · ${I.kg} kg · ${I.w} W · $${I.m}M</span>${!can ? '<em>Wrong kind of light</em>' : tooBig ? '<em>Too heavy</em>' : ''}</button>`
    }).join('')}</div>
    ${ML.arch === 'telescope' ? `<div class="sub">Primary mirror</div><div class="mlcards small">${[['small', '2.4 m (Hubble-size)'], ['med', '4 m'], ['big', '6.5 m segmented (Webb-size)']].map(([k, l]) => `<button class="mlcard ${ML.optic === k ? 'on' : ''}" data-optic="${k}">${img(TH.mir(k))}<b>${l}</b></button>`).join('')}</div><p class="sub">A bigger mirror collects more light to see fainter, farther objects, but it is heavier and costs more. Webb’s mirror folds up to fit in its rocket.</p>` : ''}
    <div class="sub">Power</div><div class="mlcards small">${[['solar', 'Solar panels', 'Free energy from the Sun, but dust and darkness cut it.'], ['rtg', 'Radioisotope generator (RTG)', 'Heat from plutonium makes power day and night, like Curiosity and Perseverance.']].map(([k, l, d]) => `<button class="mlcard ${ML.power === k ? 'on' : ''}" data-pow="${k}" ${k === 'rtg' && ML.arch !== 'rover' && ML.arch !== 'lander' ? 'disabled' : ''}>${img(TH.pow(k))}<b>${l}</b><span>${d}</span></button>`).join('')}</div>`
  }
  else if (st === 'seg') {
    const d = mlDest(), m = mlMass();
    h = `<h3>Mission segments</h3><p class="sub">Choose the <b>launch segment</b>: a rocket that can lift <b>${Math.round(m).toLocaleString()} kg</b> to ${ML_DEST[d]}. ${EST} Capacities are approximate public figures. Your spacecraft is shown inside the rocket’s nose fairing.</p>
      <div class="mlcards rockets">${Object.entries(ML_LV).map(([k, L]) => { const cap = L.cap[d]; return `<button class="mlcard ${ML.lv === k ? 'on' : ''}" data-lv="${k}" ${cap < m ? 'disabled' : ''}>${img(TH.lv(k))}<b>${L.n}</b><span>${ML_LV_H[k]} m tall · up to ${cap.toLocaleString()} kg</span>${cap < m ? '<em>Can’t lift your spacecraft there</em>' : ''}</button>` }).join('')}</div>
      <div class="segs">
      <div><b>Space segment</b><span>${ML_ARCH[ML.arch].n} with ${ML.inst.map(k => ML_INST[k].n).join(', ')}.</span></div>
      <div><b>Ground segment</b><span>${d === 'leo' ? 'NASA’s Near Space Network: ground stations around the world talk to satellites in Earth orbit.' : 'NASA’s Deep Space Network: giant antennas in Goldstone (USA), Madrid (Spain) and Canberra (Australia), 120° apart so one can always see your spacecraft.'}</span></div>
      <div><b>User segment</b><span>${d === 'mars' ? 'Planetary scientists worldwide. Data goes to NASA’s Planetary Data System, free for anyone.' : d === 'L2' ? 'Astronomers who win observing time. Data goes to the public MAST archive.' : 'Climate scientists, farmers and emergency teams. Data goes to NASA Earthdata, free for everyone.'}</span></div></div>`
  }
  else if (st === 'traj') {
    const d = mlDest();
    h = `<h3>Trajectory and timeline</h3><p class="sub">The solar system view shows your flight path. Drag the sliders to pick a launch date and play the mission timeline.</p><div class="mltraj"><div class="mlside">
      ${d === 'mars' ? `<p>Earth and Mars line up for an efficient trip (a <b>Hohmann transfer</b>) only once every <b>26 months</b>, when Mars is about <b>44°</b> ahead of Earth. Mission planners use software like NASA’s <b>GMAT</b> to find these launch windows.</p>
        <table class="mlnums"><tr><td>Transfer time</td><td>${ORBIT.tDays.toFixed(0)} days ${OK_}</td></tr><tr><td>Mars must lead Earth by</td><td>${ORBIT.phase.toFixed(1)}° ${OK_}</td></tr><tr><td>Windows repeat every</td><td>${ORBIT.synodic.toFixed(0)} days (≈26 months) ${OK_}</td></tr>
        <tr><td>Δv to leave Earth’s orbit around the Sun</td><td>${ORBIT.dv1.toFixed(2)} km/s ${OK_}</td></tr><tr><td>Δv to match Mars’s orbit</td><td>${ORBIT.dv2.toFixed(2)} km/s ${OK_}</td></tr><tr><td>Launch energy C3</td><td>${(ORBIT.dv1 * ORBIT.dv1).toFixed(1)} km²/s² ${OK_}</td></tr></table>
        <p class="sub">${OK_} Hohmann transfer, from Kepler’s third law and the vis-viva equation. Real missions fly slightly different, faster or slower paths (Perseverance took 203 days).</p>
        <div class="sub">Launch date</div><input type="range" id="ml-day" min="0" max="780" value="${ML.day}"><div id="ml-dayl"></div>` : d === 'L2' ? `<p>Your telescope cruises about <b>30 days</b> to the Sun–Earth <b>L2</b> point, 1.5 million km away, where Earth, the Moon and the Sun stay behind its sunshield.</p>` : `<p>In low Earth orbit you circle the planet about every <b>92 minutes</b>, 400–700 km up. Launch can happen almost any day.</p>`}
      <div class="sub">Mission timeline</div><input type="range" id="ml-t" min="0" max="1000" value="0"><div id="ml-ev" class="mlev"></div></div></div>`
  }
  else if (st === 'verify') { h = `<h3>Verification: does the design meet every requirement?</h3><p class="sub">Before launch, every requirement is checked by analysis and testing, from shaking the spacecraft on a vibration table to baking it in a thermal-vacuum chamber.</p><ul class="mlchk">${mlChecks().map(([t, ok]) => `<li class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} ${t}</li>`).join('')}</ul><div class="mlsum"><span>Total mass <b>${Math.round(mlMass()).toLocaleString()} kg</b></span><span>Cost <b>$${Math.round(mlCost()).toLocaleString()}M</b></span><span>Maturity <b>CML 4</b></span></div>` }
  else if (st === 'launch') {
    if (!ML.name) ML.name = mlDefaultName();
    h = ML.res ? mlResults() : `<div class="mllaunch"><h3>Ready for launch</h3><p class="sub">${ML_LV[ML.lv].n} carrying your ${ML_ARCH[ML.arch].n}.</p>
      <label class="mlname">Mission name<input id="ml-name" maxlength="48" value="${esc(ML.name)}" autocomplete="off"></label>
      <button class="btn primary bigbtn" id="ml-go">Launch!</button><p class="sub">Your mission is saved in <b>My missions</b> after launch.</p></div>`
  }
  el.innerHTML = h; el.scrollTop = 0;
  $('#ml-back').disabled = ML.step === 0 || !!ML.flying; $('#ml-next').classList.toggle('hidden', st === 'launch'); $('#ml-next').disabled = !mlCanNext(); $('#ml-next').textContent = st === 'verify' ? 'Go for launch' : 'Next';
  // on the trajectory step the big view becomes the solar system with your flight path
  const tv = $('#mlviz'), onT = st === 'traj'; tv.classList.toggle('hidden', !onT); $('#v3d').style.visibility = onT ? 'hidden' : '';
  if (onT) { if (!$('#mlcv')) tv.innerHTML = '<canvas id="mlcv"></canvas><button class="btn sm hidden" id="ml-vr">View in VR</button>'; mlVizStart() } else mlVizStop();
  mlView(); saveDraft();
}

/* ---------- the big 3D view follows what you are choosing ---------- */
let VIEW = null;
function mlView() {
  if (!VIEW) return; const st = ML_STEPS[ML.step][0];
  const ck = () => 'craft:' + [ML.arch, ML.inst.join('+'), ML.power, ML.optic].join('|'), craft = () => M3.craft(ML.arch, { inst: ML.inst, power: ML.power, optic: ML.optic });
  let key, make, cap;
  const objView = () => { const o = ML.objs[ML.objs.length - 1]; if (o) { key = 'obj:' + o; make = () => M3.objective(o); cap = `<b>${ML_OBJ[o].n}</b><span>Destination: ${ML_DEST[ML_OBJ[o].dest]}</span>` } else { key = 'dest:mars'; make = () => M3.dest('mars'); cap = '<b>Mars</b><span>6,779 km across, about half the size of Earth</span>' } };
  const craftView = () => { key = ck(); make = craft; cap = `<b>${ML_ARCH[ML.arch].n}</b><span>${Math.round(mlMass()).toLocaleString()} kg · $${Math.round(mlCost()).toLocaleString()}M${ML.inst.length ? ' · ' + ML.inst.length + ' instrument' + (ML.inst.length > 1 ? 's' : '') : ''}</span>` };
  if (st === 'intro' || st === 'obj') objView();
  else if (st === 'arch' && !ML.arch) objView();
  else if (st === 'seg' && ML.lv || st === 'launch' && !ML.res) { const pad = st === 'launch'; key = 'lv:' + ML.lv + ':' + ck() + (pad ? ':pad' : ''); make = () => M3.rocket(ML.lv, craft(), !pad); cap = `<b>${ML_LV[ML.lv].n}</b><span>${ML_LV_H[ML.lv]} m tall${pad ? ' · on the launch pad' : ' · your spacecraft inside the fairing'}</span>` }
  else if (ML.arch) craftView(); else objView();
  if (st === 'traj') { const d = mlDest(); cap = d === 'mars' ? '<b>Earth to Mars</b><span>Hohmann transfer · about ' + ORBIT.tDays.toFixed(0) + ' days</span>' : d === 'L2' ? '<b>Earth to L2</b><span>About 30 days to 1.5 million km away</span>' : '<b>Low Earth orbit</b><span>Once around the planet every 92 minutes</span>' }
  VIEW.show(key, make); $('#vcap').innerHTML = cap;
}

/* ---------- saving ---------- */
const SKEY = 'mlc_missions', DKEY = 'mlc_draft';
function loadMissions() { try { const a = JSON.parse(localStorage.getItem(SKEY) || '[]'); return Array.isArray(a) ? a : [] } catch (e) { return [] } }
function storeMissions(a) { try { localStorage.setItem(SKEY, JSON.stringify(a)) } catch (e) { toast('Could not save: browser storage is full or blocked') } updateCount() }
function updateCount() { $('#mycount').textContent = loadMissions().length }
const DRAFT_KEYS = ['step', 'level', 'objs', 'arch', 'inst', 'power', 'optic', 'lv', 'day', 'dayPicked', 'bestDay', 'name'];
function saveDraft() { if (ML.res) { try { localStorage.removeItem(DKEY) } catch (e) { } return } const d = {}; DRAFT_KEYS.forEach(k => d[k] = ML[k]); try { localStorage.setItem(DKEY, JSON.stringify(d)) } catch (e) { } }
function loadDraft() { try { const d = JSON.parse(localStorage.getItem(DKEY) || 'null'); if (d && typeof d.step === 'number' && d.step > 0) { DRAFT_KEYS.forEach(k => { if (d[k] !== undefined) ML[k] = d[k] }); ML.step = Math.min(ML.step, ML_STEPS.length - 1); return true } } catch (e) { } return false }
function mlDefaultName() { const n = loadMissions().length + 1; return `Mission ${n}: ${ML_ARCH[ML.arch].n} to ${DEST_SHORT[mlDest()]}` }
function saveMission() {
  const r = ML.res, list = loadMissions(), id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rec = { id, name: (ML.name || mlDefaultName()).slice(0, 48), t: Date.now(), level: ML.level, objs: ML.objs.slice(), arch: ML.arch, inst: ML.inst.slice(), power: ML.power, optic: ML.optic, lv: ML.lv, day: ML.day,
    launch: new Date(Date.now() + ML.day * 864e5).toISOString().slice(0, 10), score: r.score, rp: r.rp, mass: Math.round(mlMass()), cost: Math.round(mlCost()), met: ML.objs.filter(mlNeedsMet).length, claimed: false };
  list.unshift(rec); storeMissions(list.slice(0, 100)); r.id = id; return rec
}
function openMission(id, copy) {
  const m = loadMissions().find(x => x.id === id); if (!m) return;
  Object.assign(ML, { level: m.level || 1, objs: m.objs.slice(), arch: m.arch, inst: m.inst.slice(), power: m.power, optic: m.optic, lv: m.lv, day: m.day || 0, dayPicked: true, bestDay: undefined, flying: false });
  if (copy) { Object.assign(ML, { step: 3, res: null, name: ('Copy of ' + m.name).slice(0, 48) }) }
  else { Object.assign(ML, { step: ML_STEPS.length - 1, res: { score: m.score, rp: m.rp, id: m.id, saved: true, claimed: m.claimed }, name: m.name }) }
  ML.bestDay = mlBestDay(); closeMy(); renderML()
}
function renderMy() {
  const list = loadMissions(), b = $('#mymbody');
  if (!list.length) { b.innerHTML = `<div class="empty"><p>No missions yet.</p><p class="sub">Design a mission and launch it: it will be saved here, with its 3D model and score.</p></div>`; return }
  b.innerHTML = `<div class="mycards">${list.map(m => { const pic = M3.thumb('m:' + m.id, () => M3.craft(m.arch, { inst: m.inst, power: m.power, optic: m.optic }));
    return `<article class="mycard"><div class="pic">${img(pic)}<span class="score ${m.score >= 90 ? 'good' : m.score >= 60 ? 'warn' : 'bad'}">${m.score}</span></div>
    <div class="info"><b>${esc(m.name)}</b><small>${new Date(m.t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · ${ML_ARCH[m.arch] ? ML_ARCH[m.arch].n : m.arch} · ${ML_LV[m.lv] ? ML_LV[m.lv].n.split(' (')[0] : ''}</small>
    <span>${m.objs.map(o => ML_OBJ[o] ? ML_OBJ[o].n : o).join(' · ')}</span><span class="kv2">${m.mass.toLocaleString()} kg · $${m.cost.toLocaleString()}M · ${m.met}/${m.objs.length} goals met${m.claimed ? ' · research points added to your colony' : ''}</span>
    <div class="row"><button class="btn sm" data-view="${m.id}">View report</button><button class="btn sm" data-copy="${m.id}">Edit a copy</button><button class="btn sm ghost" data-del="${m.id}">Delete</button></div></div></article>` }).join('')}</div>`
}
function openMy() { renderMy(); $('#mym').classList.remove('hidden') }
function closeMy() { $('#mym').classList.add('hidden') }

function mlResults() {
  const r = ML.res; return `<div class="mlres"><h2>${r.score >= 90 ? 'Mission success!' : r.score >= 60 ? 'Partial success' : 'The mission struggled'}</h2><div class="bigscore"><span class="ring">${r.score}</span><small>/100 science return ${EST}</small></div>
  <p class="saved">✓ ${r.saved ? 'Saved' : 'Saved as'} “${esc(ML.name)}” in <a href="#" data-open-my>My missions</a></p>
  <p class="sub">${EST} The score is a game estimate based on your choices, risk and timing. ${OK_} marks values calculated from physics or taken from NASA data.</p>
  <ul class="mlchk">${ML.objs.map(o => `<li class="${mlNeedsMet(o) ? 'ok' : 'bad'}">${mlNeedsMet(o) ? '✓' : '✗'} ${ML_OBJ[o].n}</li>`).join('')}</ul>
  <div class="sub">Real NASA missions like yours</div><ul class="mlreal">${[...new Set(ML.objs.flatMap(o => ML_OBJ[o].real))].map(m => `<li>${m}</li>`).join('')}</ul>
  ${ML.objs.some(o => ML_OBJ[o].csa) ? `<div class="mlnote"><b>Canada’s part (CSA).</b> ${ML.objs.map(o => ML_OBJ[o].csa).filter(Boolean).join(' ')}</div>` : `<div class="mlnote"><b>Partners.</b> Big missions are often international: the Canadian Space Agency built Webb’s guidance sensor, Curiosity’s APXS spectrometer and the Canadarm robot arms.</div>`}
  ${r.rp ? `<p class="good">${r.claimed ? `Your colony received <b>${r.rp} research points</b> for this design.` : `Your colony gets <b>${r.rp} research points</b> for this design the next time you play the game.`}</p>` : ''}
  <div class="btns"><button class="btn" id="ml-again">Design another mission</button><button class="btn primary" data-open-my>My missions</button></div>
  <details class="mlsrc"><summary>NASA and CSA resources behind this lab</summary><ul>
  <li><a href="https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf" target="_blank" rel="noopener">Design and Develop Science Missions (NASA)</a></li>
  <li><a href="https://software.nasa.gov/software/GSC-19468-1" target="_blank" rel="noopener">General Mission Analysis Tool (GMAT)</a></li>
  <li><a href="https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299" target="_blank" rel="noopener">Concept Maturity Levels (JPL)</a></li>
  <li><a href="https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/" target="_blank" rel="noopener">Mission Design Lab (Goddard)</a></li>
  <li><a href="https://nasa.github.io/mission-viz/" target="_blank" rel="noopener">NASA Mission Viz</a></li>
  <li><a href="https://science.nasa.gov/mission/webb/game-build-it-yourself/" target="_blank" rel="noopener">Webb: build it yourself</a></li>
  <li><a href="https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf" target="_blank" rel="noopener">CubeSat 101 (NASA CSLI)</a></li>
  <li><a href="https://www.spaceappschallenge.org/2023/challenges/visualize-a-space-mission-using-virtual-reality/" target="_blank" rel="noopener">Visualize a Space Mission Using VR (Space Apps 2023)</a></li>
  <li><a href="https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp" target="_blank" rel="noopener">CSA digital games and activities</a></li></ul>
  <div class="sub" style="margin-top:8px">Scientific data used here ${OK_}</div><ul>
  <li><a href="https://ssd.jpl.nasa.gov/planets/approx_pos.html" target="_blank" rel="noopener">JPL: Approximate Positions of the Planets</a> (planet positions and launch windows)</li>
  <li><a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html" target="_blank" rel="noopener">NASA Mars Fact Sheet</a> and <a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html" target="_blank" rel="noopener">Earth Fact Sheet</a> (orbits, speeds, gravity)</li>
  <li><a href="https://science.nasa.gov/mission/mars-2020-perseverance/" target="_blank" rel="noopener">NASA Mars 2020 Perseverance</a> (launch vehicle, cruise time, parachute)</li>
  <li><a href="https://www.nasa.gov/communicating-with-missions/dsn/" target="_blank" rel="noopener">NASA Deep Space Network</a> and <a href="https://pds.nasa.gov/" target="_blank" rel="noopener">Planetary Data System</a></li></ul>
  <p class="sub">${EST} Spacecraft masses, instrument specs, costs and rocket capacities are rounded public figures, simplified for the game.</p></details></div>`}
/* ---------- 3D trajectory view (with optional VR) ---------- */
function mlVizStart(){
  const cv=$('#mlcv');if(!cv||ML.viz)return;let r;try{r=new THREE.WebGLRenderer({canvas:cv,antialias:true})}catch(e){return}
  r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.xr.enabled=true;const sc=new THREE.Scene();sc.background=new THREE.Color('#05060c');
  const cam=new THREE.PerspectiveCamera(45,1,0.1,500),d=mlDest(),V={r,sc,cam,ang:0.6,t:0,on:true,objs:{}};ML.viz=V;
  sc.add(new THREE.AmbientLight(0xffffff,0.35));const sun=new THREE.PointLight(0xfff2d0,3,0,0);sc.add(sun);
  const stars=new THREE.BufferGeometry(),sp=[];for(let i=0;i<900;i++){const v=new THREE.Vector3().randomDirection().multiplyScalar(150+Math.random()*80);sp.push(v.x,v.y,v.z)}stars.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));sc.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0xffffff,size:0.6})));
  const ring=(rad,col,cx=0)=>{const g=new THREE.BufferGeometry().setFromPoints(Array.from({length:129},(_,i)=>new THREE.Vector3(cx+Math.cos(i/128*TAU)*rad,0,Math.sin(i/128*TAU)*rad)));const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.6}));sc.add(l);return l};
  const ball=(rad,col,emi)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(rad,24,16),new THREE.MeshStandardMaterial({color:col,emissive:emi?col:0,emissiveIntensity:emi?1.2:0}));sc.add(m);return m};
  const craft=ball(0.35,'#ffffff',true);V.objs.craft=craft;
  if(d==='leo'){const e=ball(6,'#3a7bd5');e.material.emissive.set('#0a2a5a');e.material.emissiveIntensity=0.4;ring(8,'#7fe6dc');sun.position.set(80,20,40);cam.position.set(0,9,18);V.mode='leo'}
  else{ball(2.2,'#ffcc55',true);ring(10,'#4f86f7');V.objs.earth=ball(0.6,'#4f86f7');
    if(d==='mars'){ring(15.2,'#e8553b');V.objs.mars=ball(0.45,'#e8553b');cam.position.set(0,26,24);V.mode='mars'}
    else{V.objs.l2=ball(0.15,'#7fe6dc',true);cam.position.set(0,18,22);V.mode='L2'}}
  const path=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#ffb35c'}));sc.add(path);V.path=path;
  if(navigator.xr&&navigator.xr.isSessionSupported)navigator.xr.isSessionSupported('immersive-vr').then(ok=>{const b=$('#ml-vr');if(ok&&b){b.classList.remove('hidden');b.onclick=async()=>{try{const s=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor']});r.xr.setSession(s);sc.scale.setScalar(0.08);sc.position.set(0,1.2,-2.2)}catch(e){toast('Could not start VR on this device','warn')}}}}).catch(()=>{});
  r.setAnimationLoop(()=>mlVizFrame(V));mlVizInputs()}
function mlVizInputs(){const day=$('#ml-day'),t=$('#ml-t');if(day)day.oninput=()=>{ML.day=+day.value;mlVizLabels();$('#ml-next').disabled=!mlCanNext()};if(t)t.oninput=()=>{ML.viz&&(ML.viz.t=+t.value/1000);mlVizLabels()};mlVizLabels()}
function mlVizLabels(){const d=mlDest(),dl=$('#ml-dayl'),ev=$('#ml-ev');
  if(dl){const off=mlWindowOff(ML.day),date=new Date(Date.now()+ML.day*864e5);dl.innerHTML=`${date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})} · Mars is ${Math.round(mlPhase(mlD0()+ML.day))}° ahead of Earth (needed: ${ORBIT.phase.toFixed(1)}°) <b class="${Math.abs(off)<=20?'good':Math.abs(off)<=45?'warn':'bad'}">${Math.abs(off)<=20?'Launch window open':Math.abs(off)<=45?'Edge of the window: needs extra fuel':'Window closed: Mars won’t be there'}</b>`}
  if(ev){const T=ML.viz?ML.viz.t:0,list=d==='mars'?[[0,'Launch'],[0.06,'Trajectory correction 1'],[0.5,'Cruise: about 7 months'],[0.86,'Approach'],[0.9,ML.arch==='orbiter'||ML.arch.startsWith('cubesat')?'Orbit insertion':'Entry, descent and landing'],[0.95,'Science operations'],[1,'Extended mission']]:d==='L2'?[[0,'Launch'],[0.1,'Sunshield and mirror unfold'],[0.6,'Arrive at L2 (about 30 days)'],[0.8,'Commissioning'],[1,'Science operations']]:[[0,'Launch'],[0.15,'Deploy from rocket'],[0.4,'Detumble and first contact'],[0.7,'Commissioning'],[1,'Science operations']];
    ev.innerHTML=list.map(([f,l])=>`<span class="${T>=f-0.001?'on':''}">${l}</span>`).join('')}}
function mlVizFrame(V){if(!V.on)return;const r=V.r,cv=r.domElement,w=cv.clientWidth,h=cv.clientHeight;if(w&&h&&(cv.width!==Math.round(w*r.getPixelRatio()))){r.setSize(w,h,false);V.cam.aspect=w/h;V.cam.updateProjectionMatrix()}
  const d0=mlD0()+ML.day,T=V.t,o=V.objs,pts=[];
  if(V.mode==='mars'){const tr=259,dd=d0+T*tr,eL=mlLon(dd,'E')*Math.PI/180,mL=mlLon(dd,'M')*Math.PI/180;o.earth.position.set(Math.cos(eL)*10,0,-Math.sin(eL)*10);o.mars.position.set(Math.cos(mL)*15.2,0,-Math.sin(mL)*15.2);
    const l0=mlLon(d0,'E')*Math.PI/180,a=12.6,e=(15.2-10)/(15.2+10);for(let i=0;i<=64;i++){const th=i/64*Math.PI,rr=a*(1-e*e)/(1+e*Math.cos(th+Math.PI));pts.push(new THREE.Vector3(Math.cos(l0+th)*rr,0,-Math.sin(l0+th)*rr))}
    const th=T*Math.PI,rr=a*(1-e*e)/(1+e*Math.cos(th+Math.PI));o.craft.position.set(Math.cos(l0+th)*rr,0,-Math.sin(l0+th)*rr)}
  else if(V.mode==='L2'){const eL=0.8,ex=Math.cos(eL)*10,ez=-Math.sin(eL)*10;o.earth.position.set(ex,0,ez);o.l2.position.set(Math.cos(eL)*11.5,0,-Math.sin(eL)*11.5);
    for(let i=0;i<=40;i++){const f=i/40;pts.push(new THREE.Vector3(ex+(o.l2.position.x-ex)*f,Math.sin(f*Math.PI)*0.6,ez+(o.l2.position.z-ez)*f))}const p=pts[Math.round(clamp(T/0.6,0,1)*40)];o.craft.position.copy(p);if(T>0.6){const a=(T-0.6)*30;o.craft.position.x+=Math.cos(a)*0.3;o.craft.position.y+=Math.sin(a)*0.3}}
  else{for(let i=0;i<=64;i++)pts.push(new THREE.Vector3(Math.cos(i/64*TAU)*8,Math.sin(i/64*TAU)*1.5,Math.sin(i/64*TAU)*8));const a=T*TAU*3;o.craft.position.set(Math.cos(a)*8,Math.sin(a)*1.5,Math.sin(a)*8)}
  V.path.geometry.setFromPoints(pts);
  if(!r.xr.isPresenting){V.ang+=0.0015;const R_=V.mode==='leo'?20:30;V.cam.position.set(Math.cos(V.ang)*R_,V.mode==='leo'?9:20,Math.sin(V.ang)*R_);V.cam.lookAt(0,0,0)}
  r.render(V.sc,V.cam)}
function mlVizStop(){const V=ML.viz;if(!V)return;V.on=false;V.r.setAnimationLoop(null);try{if(V.r.xr.getSession())V.r.xr.getSession().end()}catch(e){}V.r.dispose();try{V.r.forceContextLoss()}catch(e){}ML.viz=null;const tv=$('#mlviz');if(tv)tv.innerHTML=''}

/* ---------- launch: the rocket lifts off in 3D, then the mission is scored and saved ---------- */
function mlLaunch() {
  ML.flying = true; $('#ml-back').disabled = true; beep(90, 2.6, 'sawtooth', 0.05); setTimeout(() => beep(60, 2, 'triangle', 0.04), 300);
  const finish = () => {
    const met = ML.objs.filter(mlNeedsMet).length, base = met / ML.objs.length * 100, riskPen = ML_ARCH[ML.arch].risk * 3 + (ML.power === 'solar' && ML.arch === 'rover' ? 6 : 0) + (mlDest() === 'mars' ? Math.max(0, Math.abs(mlWindowOff(ML.day)) - 20) * 0.4 : 0);
    const score = Math.round(clamp(base - riskPen + (ML.arch === 'telescope' && ML.optic === 'big' ? 6 : 0) + Math.random() * 4, 0, 100));
    ML.res = { score, rp: Math.round(score / 4) }; ML.flying = false; saveMission(); beep(660, 0.25, 'sine', 0.06); renderML();
  };
  if (VIEW) VIEW.launchNow(finish); else setTimeout(finish, 2200);
}

/* ---------- clicks ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-open-my]')) { e.preventDefault(); openMy(); return }
  if (t.closest('#mybtn')) { openMy(); return }
  if (t.closest('#mym-x') || t === $('#mym')) { closeMy(); return }
  const vw = t.closest('[data-view]'), cp = t.closest('[data-copy]'), dl = t.closest('[data-del]');
  if (vw) { openMission(vw.dataset.view, false); return }
  if (cp) { openMission(cp.dataset.copy, true); return }
  if (dl) { const m = loadMissions().find(x => x.id === dl.dataset.del); if (m && confirm(`Delete “${m.name}”? This can’t be undone.`)) { storeMissions(loadMissions().filter(x => x.id !== m.id)); renderMy() } return }
  if (!t.closest('#lab')) return; if (ML.flying) return;
  const lv = t.closest('[data-lvl]'), ob = t.closest('[data-obj]'), ar = t.closest('[data-arch]'), ins = t.closest('[data-inst]'), op = t.closest('[data-optic]'), pw = t.closest('[data-pow]'), lvb = t.closest('[data-lv]');
  if (lv) { ML.level = +lv.dataset.lvl; ML.objs = ML.objs.slice(0, ML.level); renderML(); return }
  if (ob) { const k = ob.dataset.obj; ML.objs = ML.objs.includes(k) ? ML.objs.filter(x => x !== k) : [...ML.objs, k]; ML.arch = null; ML.inst = []; ML.lv = null; ML.name = ''; renderML(); return }
  if (ar) { ML.arch = ar.dataset.arch; ML.inst = []; ML.lv = null; ML.name = ''; if (ML.arch !== 'rover' && ML.arch !== 'lander') ML.power = 'solar'; renderML(); return }
  if (ins) { const k = ins.dataset.inst; ML.inst = ML.inst.includes(k) ? ML.inst.filter(x => x !== k) : [...ML.inst, k]; ML.lv = null; renderML(); return }
  if (op) { ML.optic = op.dataset.optic; ML.lv = null; renderML(); return } if (pw) { ML.power = pw.dataset.pow; ML.lv = null; renderML(); return }
  if (lvb) { ML.lv = lvb.dataset.lv; renderML(); return }
  if (t.id === 'ml-next' && mlCanNext()) { if (ML_STEPS[ML.step][0] === 'seg' && ML.bestDay === undefined) ML.bestDay = mlBestDay(); if (ML_STEPS[ML.step + 1] && ML_STEPS[ML.step + 1][0] === 'traj' && !ML.dayPicked) { ML.bestDay = mlBestDay(); ML.day = ML.bestDay; ML.dayPicked = true } ML.step = Math.min(ML_STEPS.length - 1, ML.step + 1); renderML(); return }
  if (t.id === 'ml-back') { ML.step = Math.max(0, ML.step - 1); ML.res = null; renderML(); return }
  if (t.id === 'ml-go') { t.disabled = true; const n = $('#ml-name'); if (n) ML.name = n.value.trim() || mlDefaultName(); mlLaunch(); return }
  if (t.id === 'ml-again') { Object.assign(ML, { step: 1, objs: [], arch: null, inst: [], lv: null, res: null, dayPicked: false, bestDay: undefined, name: '' }); renderML(); return }
});
document.addEventListener('input', e => { if (e.target.id === 'ml-name') { ML.name = e.target.value; saveDraft() } });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#mym').classList.contains('hidden')) closeMy() });
// back to the game: close this tab if the game opened it, otherwise go to the game's home screen
$('#back').addEventListener('click', e => { if (window.opener && !window.opener.closed) { e.preventDefault(); window.close() } });
addEventListener('storage', e => { if (e.key === SKEY) updateCount() });

/* ---------- start ---------- */
(function init() {
  try { VIEW = M3.viewer($('#v3d')) } catch (e) { $('#stage').classList.add('nogl') }
  const resumed = loadDraft(); updateCount(); renderML();
  if (resumed) toast('Welcome back: your unfinished mission was restored.');
  if (/[?&]my\b/.test(location.search)) openMy();
})();
