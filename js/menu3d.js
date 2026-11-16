'use strict';
/* =========================================================
   3D IN THE TAB MENU
   - a slowly turning model at the top of the Mission Lab page (an orbiter over Mars) and the Colony page (the habitat)
   - a small 3D icon beside every mission, research project and crew member (rendered once, then cached as an image)
   - the "Press Tab to see…" hint that drops down under the compass, so players find what the menu has to offer
   ========================================================= */

/* ---------- models made just for the menu ---------- */
function mkSatellite(){const g=new THREE.Group(),foil=mat('#d9a43a',{metalness:0.75,roughness:0.35}),cell=mat('#24346e',{metalness:0.5,roughness:0.25,emissive:'#0d1a40',emissiveIntensity:0.4});
  g.add(bx(1,1.1,1,foil,0,0,0));g.add(bx(1.06,0.12,1.06,GREY,0,0.6,0));g.add(cy(0.18,0.3,0.3,10,GREY,0,-0.7,0));
  for(const s of[-1,1]){g.add(rot(cy(0.04,0.04,0.7,6,GREY,s*0.85,0,0),'z',Math.PI/2));const p=new THREE.Group();p.position.x=s*2.05;
    for(let i=0;i<3;i++)p.add(bx(0.62,0.04,0.9,cell,(i-1)*0.66,0,0));p.add(bx(2.0,0.05,0.05,OFF,0,0.03,0));g.add(p)}
  const dish=mesh(new THREE.SphereGeometry(0.62,20,8,0,TAU,0,Math.PI*0.32),mat(WHITE,{side:THREE.DoubleSide}),0,1.28,0);dish.rotation.x=Math.PI;g.add(dish);
  g.add(cy(0.025,0.025,0.5,6,GREY,0,0.95,0));g.add(sp(0.06,glow('#6fe0c8',2),0,1.22,0,8,6));return g}
function mkWrench(){const g=new THREE.Group(),m=mat('#b8bcc2',{metalness:0.8,roughness:0.3});
  g.add(bx(0.22,1.5,0.1,m,0,0,0));g.add(bx(0.26,0.5,0.12,ORANGE,0,-0.45,0));
  const head=mesh(new THREE.TorusGeometry(0.26,0.09,8,18,Math.PI*1.45),m,0,0.92,0);head.rotation.z=-Math.PI*0.22;g.add(head);
  g.rotation.z=-0.7;return g}
function mkGeoKit(){const g=new THREE.Group();
  const rock=mesh(shared('ico',()=>new THREE.IcosahedronGeometry(1,0)),mat('#a4603c',{flatShading:true}),0.35,0.3,0);rock.scale.set(0.55,0.38,0.5);rock.rotation.set(0.4,0.6,0.2);g.add(rock);
  const h=new THREE.Group();h.add(cy(0.05,0.05,1.3,8,'#7a4a2a',0,0.65,0));h.add(bx(0.7,0.16,0.16,GREY,0.12,1.3,0));h.add(rot(cy(0.02,0.08,0.22,6,GREY,-0.33,1.3,0),'z',Math.PI/2));
  h.position.set(-0.4,0,0.2);h.rotation.z=0.45;g.add(h);return g}
function mkPlantPot(){const g=new THREE.Group(),leaf=mat('#5fbf5a',{roughness:0.6}),leaf2=mat('#8fdc6a',{roughness:0.6});
  g.add(cy(0.38,0.28,0.5,14,ORANGE,0,0.25,0));g.add(cy(0.36,0.36,0.05,14,'#4a2c1e',0,0.48,0));g.add(cy(0.03,0.04,0.5,6,'#4c8c3a',0,0.72,0));
  for(let i=0;i<6;i++){const a=i/6*TAU,l=sp(0.22,i%2?leaf:leaf2,Math.cos(a)*0.22,0.72+(i%3)*0.12,Math.sin(a)*0.22,10,6);l.scale.set(1.3,0.45,0.7);l.rotation.y=-a;l.rotation.z=0.4;g.add(l)}
  g.add(sp(0.16,leaf,0,1.02,0,10,6));return g}
function mkMedKit(){const g=new THREE.Group(),red=mat('#e8453b');
  g.add(bx(1.1,0.78,0.42,WHITE,0,0.39,0));g.add(bx(1.12,0.08,0.44,red,0,0.66,0));g.add(bx(0.4,0.07,0.1,GREY,0,0.84,0));
  g.add(bx(0.14,0.42,0.03,red,0,0.36,0.22));g.add(bx(0.42,0.14,0.03,red,0,0.36,0.22));return g}
function mkTelescope(){const g=new THREE.Group();
  for(let i=0;i<3;i++){const a=i/3*TAU,l=cy(0.03,0.03,1.1,6,GREY,Math.cos(a)*0.28,0.5,Math.sin(a)*0.28);l.rotation.set(Math.sin(a)*0.28,0,-Math.cos(a)*0.28);g.add(l)}
  const t=new THREE.Group();t.position.y=1.05;t.rotation.z=0.75;t.add(cy(0.17,0.13,1.2,14,WHITE,0,0,0));t.add(cy(0.19,0.19,0.12,14,ORANGE,0,0.55,0));t.add(cy(0.07,0.07,0.25,8,DARK,0,-0.66,0));g.add(t);return g}
function mkDroplet(){const g=new THREE.Group(),w=mat('#5aa8ff',{metalness:0.1,roughness:0.15,emissive:'#123a6a',emissiveIntensity:0.5});
  g.add(sp(0.5,w,0,0.5,0,18,12));const c=mesh(new THREE.ConeGeometry(0.43,0.7,18,1,true),w,0,1.1,0);g.add(c);g.add(rot(mesh(new THREE.TorusGeometry(0.62,0.05,6,24),mat(OFF)),'x',Math.PI/2));return g}
function mkMarsGlobe(){const g=new THREE.Group(),r=mulberry(4);g.add(sp(1,mat('#c1592c',{roughness:0.9}),0,0,0,32,22));
  for(let i=0;i<9;i++){const a=r()*TAU,b=(r()-0.5)*2.2,m=sp(0.28+r()*0.25,mat('#8a3a1c',{roughness:0.95}),Math.cos(a)*Math.cos(b)*0.82,Math.sin(b)*0.82,Math.sin(a)*Math.cos(b)*0.82,12,8);m.scale.set(1,0.5,1);m.lookAt(0,0,0);g.add(m)}
  const cap=sp(0.42,mat('#f4f1ea',{roughness:0.6}),0,0.86,0,16,8);cap.scale.set(1,0.35,1);g.add(cap);g.rotation.z=0.42;return g}
function mkMoon(){const g=new THREE.Group(),geo=new THREE.IcosahedronGeometry(1,3),p=geo.attributes.position,nz=makeNoise(9);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+0.12*nz(x*2+z,y*2-z);p.setXYZ(i,x*k*1.35,y*k*0.95,z*k)}geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo,mat('#7a7068',{roughness:0.95,flatShading:true})));for(const[x,y,z,r]of[[0.5,0.3,0.78,0.22],[-0.6,-0.2,0.72,0.16],[0.1,-0.5,0.85,0.12]]){const c=cy(r,r*0.8,0.06,12,'#5a524c',x,y,z);c.lookAt(x*2,y*2,z*2);c.rotateX(Math.PI/2);g.add(c)}return g}
function mkHeli(){const g=new THREE.Group(),blade=mat('#2c2826',{roughness:0.5});g.add(bx(0.5,0.4,0.5,mat('#d9d3cb',{roughness:0.5}),0,0.55,0));g.add(bx(0.3,0.06,0.2,mat('#25397a',{metalness:0.5,roughness:0.3}),0,1.62,0));
  g.add(cy(0.03,0.03,0.9,8,GREY,0,1.15,0));for(const y of[1.0,1.3]){const b=bx(1.9,0.03,0.12,blade,0,y,0);b.rotation.y=y>1.1?0.9:-0.4;g.add(b)}
  for(let i=0;i<4;i++){const a=i/4*TAU+0.78,l=cy(0.02,0.02,0.7,6,GREY,Math.cos(a)*0.4,0.18,Math.sin(a)*0.4);l.rotation.set(Math.sin(a)*0.5,0,-Math.cos(a)*0.5);g.add(l)}return g}
function mkArch(){const g=new THREE.Group(),m=mat('#7a4632',{flatShading:true,roughness:0.95});const a=new THREE.Mesh(new THREE.TorusGeometry(1,0.42,6,10,Math.PI),m);a.scale.set(1,1.05,0.9);g.add(a);
  g.add(cy(1.5,1.6,0.16,10,'#5a3428',0,-0.05,0));const dark=new THREE.Mesh(new THREE.CircleGeometry(0.62,16,0,Math.PI),mat('#1a0e0a'));dark.position.z=-0.05;g.add(dark);return g}
const itemModel=id=>()=>iconModel(ITEMS[id]);
const MISC_MODELS={hab:()=>MAKERS.habitat(),dome:()=>mkDome(),lander:()=>mkLander(),crate:()=>mkCrate(),datapad:itemModel('datapad'),tablet:itemModel('tablet'),astro:()=>mkAstronaut(),
  sat:mkSatellite,globe:mkMarsGlobe,moon:mkMoon,heli:mkHeli,arch:mkArch,weather:()=>MAKERS.weather(),seismo:()=>MAKERS.seismo(),comms:()=>MAKERS.comms(),solar:()=>MAKERS.solar(),
  moxie:()=>MAKERS.moxie(),rover:()=>mkRover(),water:mkDroplet,lab:()=>MAKERS.lab(),med:mkMedKit,ruin:()=>LM_MAKERS.ruin(mulberry(3))};
// which model goes with a logbook report (worked out from its title, since reports only keep their text)
const poiByName=n=>Object.keys(POI).find(k=>POI[k].name===n);
function logKey(l){const t=String(l.title||''),s=String(l.sub||'');let k;
  if(/Scan complete/.test(s)&&(k=poiByName(t)))return'p:'+k;
  if(t.startsWith('Lab report: ')&&(k=poiByName(t.slice(12))))return'p:'+k;
  if(t==='Discovery → Technology'&&(k=Object.keys(DISCO_TECH).find(x=>DISCO_TECH[x].name===s)))return'd:'+k;
  if(t.startsWith('First contact: ')&&typeof SPECIES!=='undefined'&&(k=Object.keys(SPECIES).find(x=>SPECIES[x].name===t.slice(15))))return'a:'+k;
  const ci=CHAPTERS.findIndex(c=>t.endsWith(c.title)||s.endsWith(c.title));if(ci>=0&&/Mission/.test(t+s))return'm:'+ci;
  if(/Major discovery/.test(s))return'd:crystal';
  if(/colony is now/.test(t))return'x:dome';if(/systems check/i.test(t))return'x:hab';if(/crew arrived/i.test(t))return'x:lander';
  if(/shrine/i.test(t))return'x:ruin';if(/Supplies recovered|Loot/.test(t+s))return'x:crate';if(/Recovered log/.test(t))return'x:datapad';if(/Glyph tablet/.test(t))return'x:tablet';
  if(/made it back/.test(t))return'x:astro';if(/Survival|Sandbox/.test(t))return'x:lander';
  return'x:sat'}
// and one for each NASA fact, from its topic (and a few key words for the general ones)
function factKey(f){const c=f[0],t=String(f[1]);
  if(c==='general'){if(/Perseverance|Curiosity|rover/i.test(t))return'x:rover';if(/Odyssey|HiRISE|Reconnaissance|orbit/i.test(t))return'x:sat';if(/Radio|signal/i.test(t))return'x:comms';
    if(/Sunlight|solar/i.test(t))return'x:solar';if(/Jezero|lake|Sharp|layer/i.test(t))return'p:sediment';if(/microphone|sound/i.test(t))return'x:weather';return'x:globe'}
  return{rover:'x:rover',dust:'p:sand',sky:'x:weather',cold:'d:ice',night:'x:moon',moon:'x:moon',ice:'p:ice',water:'x:water',oxygen:'x:moxie',flight:'x:heli',radiation:'x:med',quake:'x:seismo',cave:'x:arch',life:'p:organics'}[c]||'x:globe'}
function poiThumb(type){const g=mkPOIModel(type,11),u=g.userData;for(const k of['marker','ring','beam'])if(u[k])u[k].visible=false;
  // fitModel measures everything, hidden or not, so take the markers out
  for(const k of['marker','ring','beam'])if(u[k])g.remove(u[k]);return g}

// which model goes with which mission, research project, discovery and crew role
const MISSION_MODELS=[()=>mkLander(),()=>MAKERS.moxie(),()=>mkRover(),()=>MAKERS.drill(),()=>MAKERS.greenhouse(),()=>mkDome()];
const RESEARCH_MODELS={icedrill:()=>MAKERS.drill(),greenhouse:()=>MAKERS.greenhouse(),dustcoat:()=>MAKERS.solar(),batteries:()=>MAKERS.battery(),rovercell:()=>MAKERS.charger(),
  roverspeed:()=>mkRover(),scanner:mkSatellite,moxie2:()=>MAKERS.moxie(),recycling:mkDroplet,landingpad:()=>MAKERS.pad(),hab2:()=>MAKERS.habitat(),reactor:()=>MAKERS.reactor(),
  xenoling:()=>CR_MAKE.lumari().g,atmo:()=>mkAtmo(),domes:()=>mkDome(),fusion:()=>mkFusion(),arcology:()=>mkTower(),spaceport:()=>mkSpaceport()};
const DISCO_MODELS={perchlorate:'salt',ice:'ice',clay:'clay',dust:'sand',basalt:'basalt',organics:'organics',sediment:'sediment',lavatube:'ejecta',meteoric:'meteorite'};
function mkCrystalCluster(){const g=new THREE.Group(),m=mat('#b48cff',{emissive:'#5a2fa8',emissiveIntensity:0.6,roughness:0.2,metalness:0.1,flatShading:true});
  [[0,0,1.6,0.42,0],[0.45,0.1,1.0,0.28,0.5],[-0.4,0.15,1.1,0.3,-0.45],[0.15,-0.4,0.8,0.24,0.3]].forEach(([x,z,h,w,t])=>{const c=new THREE.Mesh(crystalGeo,m);c.scale.set(w,h,w);c.position.set(x,0,z);c.rotation.set(z*0.5,0,-t*0.6);g.add(c)});
  g.add(rot(cy(0.9,1.0,0.16,9,'#5a4a44',0,0,0),'y',0.3));return g}
const CREW_MODELS={Engineer:mkWrench,Geologist:mkGeoKit,Botanist:mkPlantPot,'Medical Specialist':mkMedKit,'Robotics Specialist':()=>mkRover(),'Planetary Scientist':mkTelescope};
function thumbMaker(key){const i=key.indexOf(':'),k=key.slice(0,i),v=key.slice(i+1);
  if(k==='m')return MISSION_MODELS[+v];if(k==='r')return RESEARCH_MODELS[v]||(()=>MAKERS.lab());
  if(k==='p')return POI[v]?()=>poiThumb(v):null;if(k==='a')return CR_MAKE[v]?()=>CR_MAKE[v]().g:null;if(k==='x')return MISC_MODELS[v]||null;
  if(k==='d')return v==='crystal'?mkCrystalCluster:v==='xeno'?()=>CR_MAKE.lumari().g:DISCO_MODELS[v]?()=>poiThumb(DISCO_MODELS[v]):null;if(k==='c')return CREW_MODELS[v]||mkWrench;return null}
const noLights=m=>{m.traverse(o=>{if(o.isLight)o.intensity=0});return m};

/* ---------- small cached icons: a few are drawn per frame so opening a page never stalls ---------- */
const TH={url:{},queue:[],busy:false};
const TH_BLANK='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
function thumbURL(key){if(key in TH.url)return TH.url[key]||TH_BLANK;if(!TH.queue.includes(key))TH.queue.push(key);if(!TH.busy){TH.busy=true;setTimeout(thumbWork,16)}return TH_BLANK}
const thumbImg=(key,cls='')=>`<img class="th3 ${cls}" data-th="${key}" src="${thumbURL(key)}" alt="" draggable="false">`;
function thumbWork(){const t0=performance.now();
  while(TH.queue.length&&performance.now()-t0<14){const k=TH.queue.shift();let u='';
    try{const f=thumbMaker(k);if(f)u=icon3DShot(noLights(f()),1.3)||''}catch(e){u=''}
    TH.url[k]=u;if(u)document.querySelectorAll(`img[data-th="${k}"]`).forEach(im=>{im.src=u})}
  if(TH.queue.length)setTimeout(thumbWork,16);else TH.busy=false}

/* ---------- the colony's habitat as a hologram blueprint: see-through cyan panels with glowing edges, floating over a projector grid ---------- */
const HOLO_FILL=new THREE.MeshBasicMaterial({color:0x37d6ff,transparent:true,opacity:0.11,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
const HOLO_EDGE=new THREE.LineBasicMaterial({color:0x8ff0ff,transparent:true,opacity:0.85,depthWrite:false,blending:THREE.AdditiveBlending});
const HOLO_WIRE=new THREE.LineBasicMaterial({color:0x5fe2ff,transparent:true,opacity:0.22,depthWrite:false,blending:THREE.AdditiveBlending});
function holoize(m){const list=[];m.traverse(o=>{if(o.isMesh)list.push(o)});
  for(const o of list){o.material=HOLO_FILL;o.castShadow=o.receiveShadow=false;const e=new THREE.EdgesGeometry(o.geometry,28);o.add(new THREE.LineSegments(e,HOLO_EDGE));
    // smooth parts (the dome) have no sharp edges, so they get a light wireframe to read as a blueprint
    if(e.attributes.position.count<40&&o.geometry.attributes.position.count>60)o.add(new THREE.LineSegments(new THREE.WireframeGeometry(o.geometry),HOLO_WIRE))}
  m.traverse(o=>{if(o.isPoints||o.isSprite)o.visible=false});return m}
function mkHoloBase(){const g=new THREE.Group(),add={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide};
  const grid=new THREE.PolarGridHelper(2,12,5,64,0x37d6ff,0x37d6ff);grid.material.transparent=true;grid.material.opacity=0.32;grid.material.depthWrite=false;g.add(grid);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.94,2.04,72),new THREE.MeshBasicMaterial({color:0x8ff0ff,opacity:0.8,...add}));ring.rotation.x=-Math.PI/2;g.add(ring);
  const glowD=new THREE.Mesh(new THREE.CircleGeometry(2,48),new THREE.MeshBasicMaterial({color:0x37d6ff,opacity:0.08,...add}));glowD.rotation.x=-Math.PI/2;g.add(glowD);
  // a scan line sweeps up and down through the model
  const scan=new THREE.Mesh(new THREE.RingGeometry(0,1.75,48),new THREE.MeshBasicMaterial({color:0x8ff0ff,opacity:0.07,...add}));scan.rotation.x=-Math.PI/2;g.add(scan);
  const scanE=new THREE.Mesh(new THREE.RingGeometry(1.7,1.75,48),new THREE.MeshBasicMaterial({color:0xbff8ff,opacity:0.6,...add}));scanE.rotation.x=-Math.PI/2;g.add(scanE);
  g.userData={scan,scanE};return g}

/* ---------- the turning model at the top of a page (drag to turn it) ---------- */
const HERO={r:null,sc:null,cam:null,kind:null,model:null,on:false,yaw:0.6,spin:true,drag:null,extra:{}};
function heroInit(){if(HERO.r)return true;const box=$('#hero3d');if(!box)return false;
  try{HERO.r=new THREE.WebGLRenderer({canvas:$('#hero-cv'),antialias:true,alpha:true})}catch(e){box.remove();return false}
  const r=HERO.r;r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.15;r.setPixelRatio(Math.min(2,devicePixelRatio||1));
  const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(0xfff0e0,0x6a3828,1.5));const key=new THREE.DirectionalLight(0xfff2e2,2.6);key.position.set(3,5,4);
  const rim=new THREE.DirectionalLight(0xffb27a,1.5);rim.position.set(-4,3,-4);sc.add(key,rim);
  // Mars below the orbiter, and a patch of ground under the habitat
  const mars=new THREE.Mesh(new THREE.SphereGeometry(9,48,32),new THREE.MeshStandardMaterial({color:'#b5532a',roughness:0.95}));mars.position.set(0,-10.6,-2);sc.add(mars);
  const ground=new THREE.Group();const disc=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.6,0.16,48),new THREE.MeshStandardMaterial({color:'#8a4a30',roughness:0.95}));disc.position.y=-0.08;ground.add(disc);
  const rr=mulberry(9);for(let i=0;i<9;i++){const a=rr()*TAU,d=2.2+rr()*1.1,m=new THREE.Mesh(shared('ico',()=>new THREE.IcosahedronGeometry(1,0)),mat('#6e3a26',{flatShading:true}));m.scale.setScalar(0.08+rr()*0.14);m.position.set(Math.cos(a)*d,0.04,Math.sin(a)*d);ground.add(m)}
  sc.add(ground);const holo=mkHoloBase();sc.add(holo);
  const sv=[];const sr=mulberry(5);for(let i=0;i<220;i++){const a=sr()*TAU,e=sr()*1.2-0.1;sv.push(Math.cos(a)*40*Math.cos(e),Math.sin(e)*40,Math.sin(a)*40*Math.cos(e)-20)}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sv,3));const stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.12,sizeAttenuation:true}));sc.add(stars);
  HERO.extra={mars,ground,stars,holo};HERO.sc=sc;HERO.cam=new THREE.PerspectiveCamera(30,2,0.1,120);
  box.addEventListener('pointerdown',e=>{HERO.drag={x:e.clientX,yaw:HERO.yaw};HERO.spin=false;box.setPointerCapture(e.pointerId)});
  box.addEventListener('pointermove',e=>{if(HERO.drag)HERO.yaw=HERO.drag.yaw+(e.clientX-HERO.drag.x)*0.012});
  const up=()=>{if(HERO.drag){HERO.drag=null;setTimeout(()=>{if(!HERO.drag)HERO.spin=true},2500)}};box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);
  return true}
function heroShow(kind){const box=$('#hero3d');if(!box)return;
  $('#pane-col').classList.toggle('holo',kind==='hab');
  if(!kind){box.classList.add('hidden');box.style.cssText='';$('#col-body').style.minHeight='';return}
  if(!heroInit())return;box.classList.remove('hidden');
  if(HERO.kind!==kind){if(HERO.model)HERO.sc.remove(HERO.model);
    let m;try{m=noLights(kind==='sat'?mkSatellite():MAKERS.habitat())}catch(e){m=new THREE.Group()}
    fitModel(m,kind==='sat'?2.3:2.9);if(kind==='hab'){const b=new THREE.Box3().setFromObject(m);HERO.baseY=-b.min.y;HERO.topY=b.max.y-b.min.y;holoize(m)}
    HERO.model=m;HERO.sc.add(m);HERO.kind=kind;HERO.yaw=0.6;box.style.cssText='';$('#col-body').style.minHeight='';
    $('#hero-cap').textContent=kind==='sat'?'Mars orbiter · relays your science to Earth':'Habitat blueprint';
    const {mars,ground,stars}=HERO.extra;mars.visible=stars.visible=kind==='sat';ground.visible=false;HERO.extra.holo.visible=kind==='hab';box.dataset.kind=kind;HERO.r.toneMapping=kind==='hab'?THREE.NoToneMapping:THREE.ACESFilmicToneMapping}
  if(!HERO.on){HERO.on=true;requestAnimationFrame(heroLoop)}}
function heroLoop(){const box=$('#hero3d');
  if(!invUI.open||!box||box.classList.contains('hidden')){HERO.on=false;return}requestAnimationFrame(heroLoop);
  const cv=HERO.r.domElement,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;const pr=HERO.r.getPixelRatio();
  if(cv.width!==Math.round(w*pr)||cv.height!==Math.round(h*pr)){HERO.r.setSize(w,h,false);HERO.cam.aspect=w/h;HERO.cam.updateProjectionMatrix()}
  const t=performance.now()/1000;if(HERO.spin)HERO.yaw+=0.005;const m=HERO.model,sat=HERO.kind==='sat';
  m.rotation.y=HERO.yaw;
  if(sat){m.position.y=0.25+Math.sin(t*1.2)*0.08;m.rotation.z=Math.sin(t*0.7)*0.08;m.rotation.x=0.18;HERO.extra.mars.rotation.y=t*0.02;HERO.cam.position.set(0,0.75,4.6);HERO.cam.lookAt(0,0.15,0)}
  else{const hb=HERO.extra.holo,u=hb.userData,lift=0.32+Math.sin(t*1.3)*0.07;m.position.y=HERO.baseY+lift;hb.rotation.y=-t*0.15;
    const sy=lift+(0.5+0.5*Math.sin(t*0.9))*HERO.topY;u.scan.position.y=u.scanE.position.y=sy;HOLO_FILL.opacity=0.1+0.025*Math.sin(t*11)*Math.sin(t*2.3);
    HERO.cam.position.set(0,2.5,7.1);HERO.cam.lookAt(0,1.0,0);holoPlace(box)}
  HERO.r.render(HERO.sc,HERO.cam)}
// on wide screens the blueprint sits in the right-hand column, just under the Modules table, so it's in view without scrolling
// (on phones it is a banner at the top of the page, set in CSS)
function holoPlace(box){const pane=$('#pane-col'),col=document.querySelector('#col-body .grid2>div:last-child'),body=$('#col-body');
  if(innerWidth<=700||!col){if(box.style.top)box.style.cssText='';body.style.minHeight='';return}
  const pr=pane.getBoundingClientRect(),cr=col.getBoundingClientRect(),tb=col.querySelector('table'),top=Math.round((tb?tb.getBoundingClientRect().bottom:cr.top)-pr.top+4);
  const s=box.style;s.top=top+'px';s.left=Math.round(cr.left-pr.left)+'px';s.width=Math.round(cr.width)+'px';s.right='auto';s.bottom='auto';
  body.style.minHeight=Math.max(0,top+box.offsetHeight-(body.offsetTop||0))+'px'}

/* ---------- "Press Tab to see…": a short hint drops down under the compass now and then, for pages you haven't opened yet ---------- */
const TAB_HINTS=[['missions','every mission and its rewards'],['mlab','the NASA Mission Lab: design your own mission'],['research','new technology to research'],['colony','your colony’s life support and power'],
  ['crew','your crew and what they’re doing'],['data','the real NASA data behind the game'],['log','your science reports and NASA facts'],['journal','your expedition journal'],['stats','your expedition stats']];
const tabHint={t:30,show:0,i:0,cur:null};
function markTabSeen(t){if(!t)return;const s=OPT.seenTabs||(OPT.seenTabs=[]);if(!s.includes(t)){s.push(t);saveOpts()}
  if(tabHint.cur===t)hideTabHint()}
function hideTabHint(){tabHint.show=0;const el=$('#tabhint');if(el)el.classList.remove('show')}
function tabHintTick(dt){const el=$('#tabhint');if(!el)return;
  const busy=invUI.open||!!game.dialogue||build.active||game.hudHidden||game.cine||(typeof tour!=='undefined'&&tour.on)||!$('#pause').classList.contains('hidden');
  if(tabHint.show>0){tabHint.show-=dt;if(tabHint.show<=0||busy)hideTabHint();return}
  if(busy||(tabHint.t-=dt)>0)return;
  const seen=OPT.seenTabs||[],left=TAB_HINTS.filter(h=>!seen.includes(h[0]));if(!left.length){tabHint.t=1e9;return}
  const h=left[tabHint.i++%left.length];tabHint.cur=h[0];tabHint.t=80;tabHint.show=8;
  const touch=document.body.classList.contains('touch');
  {const host=touch?$('#hud'):$('#top');if(host&&el.parentNode!==host)host.appendChild(el)}   // phones: the top column is narrow, so it sits above the joystick instead
  $('#th-text').innerHTML=`${touch?'Tap <span class="key">⋯</span>':'Press <span class="key">Tab</span>'} to see <b>${h[1]}</b>`;
  el.classList.add('show')}
$('#tabhint').addEventListener('click',()=>{const t=tabHint.cur;hideTabHint();if(t&&game.state==='play')openMenu(t)});
