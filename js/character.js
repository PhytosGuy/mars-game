'use strict';
/* =========================================================
   CHARACTER CREATOR: Bitmoji-style choices for your face, hair, body, clothes and spacesuit,
   a live 3D preview (with or without the suit), and your profile picture.
   ========================================================= */
const SKIN=['#ffe0c7','#f6cfa6','#f1c27d','#e0ac69','#c68642','#a86b3c','#8d5524','#6b3e26','#4a2c1d','#3a2218'];
const HAIRC=['#1c1412','#3b2a20','#6a4a32','#a0703c','#d8b26e','#f2e1a6','#b5462b','#8a8a8a','#f4f4f4','#e85d9a','#4f86f7','#3cb37a','#8a6cd8'];
const CLOTH=['#efebe4','#bfc4cc','#3a3a40','#1d1d22','#4f86f7','#2e5bd8','#e8553b','#ff7a2e','#f2c94c','#3cb37a','#1e5c4a','#8a6cd8','#ff8fb1','#a5623f','#6fe0c8'];
const EYEC=['#4a3020','#1c1412','#3a6ea5','#6fa8dc','#3c8a5a','#7a8a8a','#8a6a3a','#6a4a8a','#b8862b'];
const LIPC=['#b4544e','#c9736a','#9a4a46','#e3a08a','#d35a6a','#e8553b','#b8325a','#7a2a3a','#5a2a2a','#8a6cd8'];
const FRAMEC=['#1d1a1a','#6b4a2e','#c9a227','#d9d9de','#e8553b','#4f86f7','#ff8fb1','#f4f4f4','#3cb37a'];
const METALC=['#e6c35a','#d9d9de','#e8a88a','#2a2a2e','#7fd8ff','#ff8fb1'];
const MAKEC=['#8a6cd8','#4f86f7','#3cb37a','#e8553b','#ff8fb1','#c9a227','#6b4a2e','#1d1d22','#ff7a2e','#efebe4'];
const s_=(...a)=>a.map(x=>x.split(':'));
/* the creator: main pages, each with sub-pages of choices
   [page key, page name, [[sub-page key, sub-page name, [[look key, label, type, values]]]]]  (types: c colour, s choice, t on/off) */
const CREATOR=[
  ['face','Face',[
    ['shape','Shape',[['faceShape','Face shape','s',s_('oval:Oval','round:Round','square:Square','heart:Heart','long:Long')],['skin','Skin tone','c',SKIN],['ears','Ears','s',s_('round:Round','small:Small','big:Big','pointed:Pointed')]]],
    ['eyes','Eyes',[['eyes','Eye shape','s',s_('round:Round','almond:Almond','wide:Wide','big:Big','sleepy:Sleepy','hooded:Hooded','cat:Cat-eye','narrow:Narrow','happy:Happy')],['eyeCol','Eye colour','c',EYEC],['lashes','Lashes','s',s_('none:None','natural:Natural','long:Long','bold:Bold')]]],
    ['brows','Brows',[['brows','Eyebrows','s',s_('straight:Straight','arched:Arched','rounded:Rounded','thick:Thick','bushy:Bushy','thin:Thin','angry:Serious','raised:Raised','none:None')]]],
    ['nose','Nose',[['nose','Nose','s',s_('button:Button','small:Small','snub:Snub','wide:Wide','pointy:Pointed','roman:Roman')]]],
    ['mouth','Mouth',[['mouth','Expression','s',s_('smile:Smile','grin:Grin','laugh:Laugh','calm:Calm','smirk:Smirk','neutral:Neutral','pout:Pout','surprised:Surprised','tongue:Tongue out','frown:Frown')],['lipCol','Lip colour','c',LIPC]]],
    ['details','Details',[['freckles','Freckles','t'],['blush','Rosy cheeks','t'],['mole','Beauty mark','s',s_('none:None','cheek:Cheek','lip:Lip','eye:By the eye')],
      ['shadow','Eyeshadow','s',s_('none:None','soft:Soft','bold:Bold')],['shadowCol','Eyeshadow colour','c',MAKEC],['paint','Face paint','s',s_('none:None','stripes:Stripes','star:Star','heart:Heart','dots:Dots','mars:Mars')],['paintCol','Face paint colour','c',MAKEC]]]]],
  ['hair','Hair',[
    ['style','Style',[['hairStyle','Hairstyle','s',s_('short:Short','buzz:Buzz cut','fade:Fade','pixie:Pixie','side:Side swoop','slick:Slicked back','undercut:Undercut','spiky:Spiky','curly:Curly','afro:Afro','shaggy:Shaggy','bob:Bob','long:Long','wavy:Wavy','ponytail:Ponytail','pigtails:Pigtails','bun:Bun','topknot:Top knot','spacebuns:Space buns','braids:Braids','mohawk:Mohawk','bald:Bald')]]],
    ['colour','Colour',[['hair','Hair colour','c',HAIRC]]],
    ['facial','Facial hair',[['facial','Facial hair','s',s_('none:None','stubble:Stubble','mustache:Moustache','handlebar:Handlebar','goatee:Goatee','soulpatch:Soul patch','chinstrap:Chinstrap','sideburns:Sideburns','beard:Beard','fullbeard:Full beard')]]]]],
  ['body','Body',[['build','Build',[['build','Build','s',s_('slim:Slim','regular:Regular','broad:Broad')],['height','Height','s',s_('short:Shorter','avg:Average','tall:Taller')]]]]],
  ['clothing','Clothing',[
    ['tops','Tops',[['top','Top','s',s_('tee:T-shirt','longsleeve:Long sleeve','tank:Tank top','polo:Polo','hoodie:Hoodie','ziphoodie:Zip hoodie','sweater:Sweater','jacket:Jacket','bomber:Bomber','puffer:Puffer','flight:Flight suit')],['shirt','Main colour','c',CLOTH],['shirt2','Detail colour','c',CLOTH]]],
    ['bottoms','Bottoms',[['bottoms','Bottoms','s',s_('pants:Trousers','joggers:Joggers','shorts:Shorts')],['pants','Colour','c',CLOTH]]],
    ['shoes','Shoes',[['shoeStyle','Shoes','s',s_('sneakers:Sneakers','hightops:High-tops','boots:Boots','slipons:Slip-ons')],['shoes','Colour','c',CLOTH]]]]],
  ['acc','Accessories',[
    ['glasses','Glasses',[['glasses','Frames','s',s_('none:None','round:Round','oval:Oval','square:Square','rect:Rectangle','cat:Cat-eye','aviator:Aviator','hex:Hexagon','visor:Sport visor')],['lens','Lenses','s',s_('clear:Clear','dark:Dark','mirror:Mirrored','rose:Rose','blue:Blue','amber:Amber','green:Green')],['glassCol','Frame colour','c',FRAMEC]]],
    ['hats','Headwear',[['hat','Headwear','s',s_('none:None','beanie:Beanie','bobble:Bobble hat','cap:Cap','backcap:Cap backwards','bucket:Bucket hat','beret:Beret','cowboy:Cowboy hat','headband:Headband','bandana:Bandana','headset:Headset')],['hatCol','Colour','c',CLOTH]]],
    ['jewel','Jewellery',[['earrings','Earrings','s',s_('none:None','studs:Studs','hoops:Hoops','drops:Drops','gems:Gems')],['necklace','Necklace','s',s_('none:None','chain:Chain','pendant:Pendant','tag:Dog tag','pearls:Pearls')],['jewelCol','Metal','c',METALC]]]]],
  ['suit','Spacesuit',[['colours','Colours',WOPTS.filter(o=>o[0]!=='rover').map(([k,l,c])=>[k,l,'c',c])],['helmet','Helmet',[['antenna','Helmet antenna','t']]]]],
  ['rover','Rover',[['paint','Paint',[['rover','Rover paint','c',WOPTS.find(o=>o[0]==='rover')[2]]]]]],
];
const CR_OPTS=CREATOR.flatMap(([,,subs])=>subs.flatMap(sb=>sb[2]));
const LOOK_RULES={lamp:'t'};for(const o of CR_OPTS)LOOK_RULES[o[0]]=o[2]==='s'?new Set(o[3].map(v=>v[0])):o[2];
// keep only valid choices (looks also arrive from other players and saved profiles)
function cleanLook(l){const o={...LOOK_DEFAULT};if(!l||typeof l!=='object')return o;
  if(l.glasses==='shades'&&!l.lens)l={...l,glasses:'aviator',lens:'dark'};                        // older saved looks
  for(const k in LOOK_DEFAULT){const v=l[k],r=LOOK_RULES[k];if(v===undefined)continue;
    if(r==='c'){if(typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))o[k]=v}else if(r==='t')o[k]=!!v;else if(r instanceof Set&&r.has(v))o[k]=v}
  return o}
function saveLook(){try{localStorage.setItem('mlc-look',JSON.stringify(LOOK))}catch(e){}
  clearTimeout(saveLook.t);saveLook.t=setTimeout(()=>{if(typeof ACC!=='undefined'&&ACC.sb&&ACC.user)ACC.sb.from('profiles').update({look:LOOK}).eq('id',ACC.user.id).then(()=>{})},800);
  if(typeof netLookChanged==='function')netLookChanged();if(typeof renderAcctBtn==='function')renderAcctBtn();if(typeof renderCrew==='function')renderCrew(true)}
/* ---------- profile pictures: your suited astronaut, face visible through the visor ---------- */
const PFP={cache:new Map(),a:null,cam:null};
const shadeHex=(h,k)=>{const n=parseInt(h.slice(1),16);const f=v=>Math.round(clamp(v*k,0,255)).toString(16).padStart(2,'0');return'#'+f(n>>16&255)+f(n>>8&255)+f(n&255)};
function pfpURL(look){
  look=cleanLook(look);const key=JSON.stringify(look);if(PFP.cache.has(key))return PFP.cache.get(key);let url='';
  try{if(!ICON3D.r)icon3D('regolith');
    if(!PFP.a){PFP.a=mkAstronaut();PFP.a.traverse(o=>{if(o.isSpotLight)o.intensity=0});PFP.cam=new THREE.PerspectiveCamera(27,1,0.1,20)}
    dressModel(PFP.a,look);setOutfit(PFP.a,false);const hs=PFP.a.scale.y;PFP.cam.position.set(0.55,1.86*hs,2.5);PFP.cam.lookAt(0,1.68*hs,0);
    ICON3D.sc.add(PFP.a);ICON3D.r.render(ICON3D.sc,PFP.cam);ICON3D.sc.remove(PFP.a);
    const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
    const g=x.createRadialGradient(64,44,8,64,64,72);g.addColorStop(0,shadeHex(look.accent,1.15));g.addColorStop(1,shadeHex(look.accent,0.4));
    x.beginPath();x.arc(64,64,63,0,TAU);x.fillStyle=g;x.fill();x.save();x.clip();x.drawImage(ICON3D.cv,0,0);x.restore();url=c.toDataURL();
  }catch(e){url=''}
  if(PFP.cache.size>48)PFP.cache.delete(PFP.cache.keys().next().value);PFP.cache.set(key,url);return url}
const pfpImg=(look,cls='pfp')=>{const u=pfpURL(look);return u?`<img class="${cls}" src="${u}" alt="">`:`<span class="${cls} nopfp"></span>`};
/* ---------- a live 3D preview you can drag to turn ---------- */
const NO_ROVER={userData:{paint:{color:{set(){}}}}};
function makePreview(boxSel,cvSel,overId){
  const P_={r:null,sc:null,cam:null,a:null,yaw:0.5,spin:true,drag:null,on:false,casual:false};
  P_.init=()=>{if(P_.r)return true;const cv=$(cvSel);if(!cv)return false;
    try{P_.r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){$(boxSel).style.display='none';return false}
    P_.r.outputColorSpace=THREE.SRGBColorSpace;P_.r.toneMapping=THREE.ACESFilmicToneMapping;P_.r.toneMappingExposure=1.15;P_.r.setPixelRatio(Math.min(2,devicePixelRatio||1));
    const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(0xfff0e0,0x7a4030,1.6));
    const key=new THREE.DirectionalLight(0xfff2e2,2.2);key.position.set(3,5,4);const rim=new THREE.DirectionalLight(0xffb27a,1.6);rim.position.set(-4,3,-4);
    const fill=new THREE.DirectionalLight(0xffeee2,1.1);fill.position.set(-1.5,1.2,5);sc.add(key,rim,fill);   // a soft front fill so faces aren't half in shadow
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1,0.12,40),new THREE.MeshStandardMaterial({color:'#8a4a30',roughness:0.9}));pad.position.y=-0.06;sc.add(pad);
    const a=mkAstronaut();sc.add(a);a.traverse(o=>{if(o.isSpotLight)o.intensity=0});P_.a=a;P_.sc=sc;P_.pad=pad;
    const rv=mkRover();rv.traverse(o=>{if(o.isSpotLight)o.intensity=0});rv.visible=false;sc.add(rv);P_.rv=rv;
    P_.cam=new THREE.PerspectiveCamera(28,1,0.1,50);P_.cam.position.set(0,1.25,5.4);P_.cam.lookAt(0,1.0,0);
    const box=$(boxSel);
    box.addEventListener('pointerdown',e=>{P_.drag={x:e.clientX,yaw:P_.yaw};P_.spin=false;box.setPointerCapture(e.pointerId)});
    box.addEventListener('pointermove',e=>{if(P_.drag)P_.yaw=P_.drag.yaw+(e.clientX-P_.drag.x)*0.012});
    const up=()=>{P_.drag=null};box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);return true};
  P_.look=()=>{if(!P_.a)return;dressModel(P_.a,LOOK);setOutfit(P_.a,P_.casual);P_.rv.userData.paint.color.set(LOOK.rover)};
  // zoom in on the face for face and hair choices
  P_.frame=close=>{P_.close=close};
  const loop=()=>{if(!P_.on)return;if($('#'+overId).classList.contains('hidden')){P_.on=false;return}requestAnimationFrame(loop);
    const cv=P_.r.domElement,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;
    if(cv.width!==Math.round(w*P_.r.getPixelRatio())||cv.height!==Math.round(h*P_.r.getPixelRatio())){P_.r.setSize(w,h,false);P_.cam.aspect=w/h;P_.cam.updateProjectionMatrix()}
    const t=performance.now()/1000;if(P_.spin&&!P_.drag)P_.yaw+=0.006;const isR=P_.mode==='rover';P_.a.visible=!isR;P_.rv.visible=isR;P_.pad.scale.setScalar(isR?3.2:1);
    P_.a.rotation.y=P_.yaw;P_.a.position.y=Math.sin(t*1.6)*0.015;P_.rv.rotation.y=P_.yaw;
    const tz=isR?10.5:P_.close?2.1:5.4,ty=isR?3.4:P_.close?1.72:1.25,ly=isR?1.1:P_.close?1.68:1.0;P_.cam.position.z+=(tz-P_.cam.position.z)*0.12;P_.cam.position.y+=(ty-P_.cam.position.y)*0.12;P_.cam.lookAt(0,P_.cam.position.y-(ty-ly),0);
    P_.r.render(P_.sc,P_.cam)};
  P_.start=()=>{if(!P_.init())return;P_.look();P_.spin=true;if(!P_.on){P_.on=true;requestAnimationFrame(loop)}};
  return P_}
/* ---------- the creator window ---------- */
const CR={tab:'face',sub:{},prev:null,pick:null};
function openCreator(){
  $('#creator').classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();
  CR.prev=CR.prev||makePreview('#cr-prev','#cr-cv','creator');renderCreator();CR.prev.start();
}
function closeCreator(){if($('#creator').classList.contains('hidden'))return;$('#creator').classList.add('hidden');CR.pick=null;saveLook()}
const isHex=v=>/^#[0-9a-f]{6}$/i.test(v);
function renderCreator(){
  const cat=CREATOR.find(c=>c[0]===CR.tab)||CREATOR[0],subs=cat[2],sk=CR.sub[cat[0]]||subs[0][0],sub=subs.find(s=>s[0]===sk)||subs[0];
  $('#cr-tabs').innerHTML=CREATOR.map(([k,l])=>`<button data-ct="${k}" class="${k===cat[0]?'on':''}">${l}</button>`).join('');
  $('#cr-subs').innerHTML=subs.length>1?subs.map(([k,l])=>`<button data-cs="${k}" class="${k===sub[0]?'on':''}">${l}</button>`).join(''):'';$('#cr-subs').classList.toggle('hidden',subs.length<2);
  $('#cr-opts').innerHTML=sub[2].map(([k,l,type,vals])=>{
    if(type==='c'){const custom=!vals.includes(LOOK[k]);
      return`<div class="crrow"><div class="sub">${l}</div><div class="sw">${vals.map(c=>`<button data-lk="${k}" data-v="${c}" style="background:${c}" class="${LOOK[k]===c?'on':''}" aria-label="${c}"></button>`).join('')}`+
        `<button class="swpick${custom?' on':''}${CR.pick===k?' open':''}" data-pick="${k}" style="--cur:${LOOK[k]}" title="Pick any colour" aria-label="Pick any colour"></button></div>`+
        (CR.pick===k?`<div class="picker"><canvas class="spec" width="320" height="130" data-spec="${k}" aria-label="Colour spectrum"></canvas><canvas class="spec grey" width="320" height="16" data-spec="${k}" aria-label="Greys"></canvas><div class="pkrow"><i style="background:${LOOK[k]}"></i><b>${LOOK[k].toUpperCase()}</b><span class="sub">Drag across the spectrum</span></div></div>`:'')+`</div>`}
    if(type==='t')return`<div class="crrow"><div class="sub">${l}</div><div class="opt"><button data-lt="${k}" data-v="1" class="${LOOK[k]?'on':''}">On</button><button data-lt="${k}" data-v="0" class="${LOOK[k]?'':'on'}">Off</button></div></div>`;
    return`<div class="crrow"><div class="sub">${l}</div><div class="chips">${vals.map(([v,n])=>`<button data-ls="${k}" data-v="${v}" class="${LOOK[k]===v?'on':''}">${n}</button>`).join('')}</div></div>`}).join('');
  document.querySelectorAll('#cr-opts canvas.spec').forEach(drawSpectrum);
  if(CR.prev){const t=CR.tab;CR.prev.casual=t==='suit'||t==='rover'?false:t==='face'?CR.prev.casual:true;CR.prev.frame(t==='face'||t==='hair'||(t==='acc'&&sub[0]!=='jewel'));CR.prev.mode=t==='rover'?'rover':'astro';CR.prev.look()}
  document.querySelectorAll('#creator [data-cm]').forEach(b=>b.classList.toggle('on',(b.dataset.cm==='casual')===!!(CR.prev&&CR.prev.casual)));
  $('#cr-pfp').src=pfpURL(LOOK)||'';
}
// the colour spectrum: every hue across, light at the top and dark at the bottom (plus a strip of greys)
function drawSpectrum(cv){const x=cv.getContext('2d'),w=cv.width,h=cv.height;
  if(cv.classList.contains('grey')){const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#000000');x.fillStyle=g;x.fillRect(0,0,w,h);return}
  const g=x.createLinearGradient(0,0,w,0);for(let i=0;i<=12;i++)g.addColorStop(i/12,`hsl(${i*30},100%,50%)`);x.fillStyle=g;x.fillRect(0,0,w,h);
  const v=x.createLinearGradient(0,0,0,h);v.addColorStop(0,'rgba(255,255,255,1)');v.addColorStop(0.08,'rgba(255,255,255,.85)');v.addColorStop(0.5,'rgba(255,255,255,0)');v.addColorStop(0.5,'rgba(0,0,0,0)');v.addColorStop(0.95,'rgba(0,0,0,.9)');v.addColorStop(1,'rgba(0,0,0,1)');x.fillStyle=v;x.fillRect(0,0,w,h)}
function specPick(cv,e){const r=cv.getBoundingClientRect(),px=clamp(Math.floor((e.clientX-r.left)/r.width*cv.width),0,cv.width-1),py=clamp(Math.floor((e.clientY-r.top)/r.height*cv.height),0,cv.height-1);
  const d=cv.getContext('2d').getImageData(px,py,1,1).data;return'#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('')}
// live while dragging: recolour the model and the readout without rebuilding the page
let specDrag=null,specRAF=0;
function specSet(k,hex){LOOK[k]=hex;const row=document.querySelector('#cr-opts .picker .pkrow');if(row){row.querySelector('i').style.background=hex;row.querySelector('b').textContent=hex.toUpperCase()}
  const sw=document.querySelector(`#cr-opts [data-pick="${k}"]`);if(sw)sw.style.setProperty('--cur',hex);
  if(!specRAF)specRAF=requestAnimationFrame(()=>{specRAF=0;LOOK=cleanLook(LOOK);applyLook();if(CR.prev)CR.prev.look()})}
$('#creator').addEventListener('pointerdown',e=>{const cv=e.target.closest('canvas.spec');if(!cv)return;e.preventDefault();specDrag=cv;cv.setPointerCapture(e.pointerId);specSet(cv.dataset.spec,specPick(cv,e))});
$('#creator').addEventListener('pointermove',e=>{if(specDrag)specSet(specDrag.dataset.spec,specPick(specDrag,e))});
const specEnd=()=>{if(!specDrag)return;specDrag=null;LOOK=cleanLook(LOOK);applyLook();if(CR.prev)CR.prev.look();if(typeof ACCP!=='undefined'&&ACCP)ACCP.look();renderCreator()};
$('#creator').addEventListener('pointerup',specEnd);$('#creator').addEventListener('pointercancel',specEnd);
function setLook(k,v){LOOK[k]=v;LOOK=cleanLook(LOOK);applyLook();if(CR.prev)CR.prev.look();if(typeof ACCP!=='undefined'&&ACCP)ACCP.look();renderCreator()}
$('#creator').addEventListener('click',e=>{
  const t=e.target;if(t.closest('canvas.spec'))return;
  const ct=t.closest('[data-ct]'),cs=t.closest('[data-cs]'),c=t.closest('[data-lk]'),s=t.closest('[data-ls]'),tg=t.closest('[data-lt]'),cm=t.closest('[data-cm]'),pk=t.closest('[data-pick]');
  if(ct){CR.tab=ct.dataset.ct;CR.pick=null;renderCreator();return}
  if(cs){CR.sub[CR.tab]=cs.dataset.cs;CR.pick=null;renderCreator();return}
  if(pk){CR.pick=CR.pick===pk.dataset.pick?null:pk.dataset.pick;renderCreator();return}
  if(c){setLook(c.dataset.lk,c.dataset.v);return}if(s){setLook(s.dataset.ls,s.dataset.v);return}if(tg){setLook(tg.dataset.lt,tg.dataset.v==='1');return}
  if(cm){CR.prev.casual=cm.dataset.cm==='casual';CR.prev.look();renderCreator();return}
  if(t.id==='cr-rand'){const r=Math.random;const pick=a=>a[Math.floor(r()*a.length)];
    for(const[k,,type,vals]of CR_OPTS){if(k==='rover')continue;LOOK[k]=type==='c'?pick(vals):type==='t'?r()<0.3:pick(vals)[0]}
    for(const k of['glasses','hat','earrings','necklace','paint','mole','shadow'])if(r()<0.55)LOOK[k]='none';   // keep most randomised looks uncluttered
    LOOK=cleanLook(LOOK);applyLook();CR.prev.look();renderCreator();return}
  if(t.id==='cr-reset'){LOOK={...LOOK_DEFAULT};applyLook();CR.prev.look();renderCreator();return}
  if(t.id==='cr-done'||t.id==='cr-x')closeCreator();
});
LOOK=cleanLook(LOOK);applyLook();
