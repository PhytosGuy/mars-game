'use strict';
/* =========================================================
   CHARACTER CREATOR: Bitmoji-style choices for your face, hair, body, clothes and spacesuit,
   a live 3D preview (with or without the suit), and your profile picture.
   ========================================================= */
const SKIN=['#ffe0c7','#f6cfa6','#f1c27d','#e0ac69','#c68642','#a86b3c','#8d5524','#6b3e26','#4a2c1d','#3a2218'];
const HAIRC=['#1c1412','#3b2a20','#6a4a32','#a0703c','#d8b26e','#f2e1a6','#b5462b','#8a8a8a','#f4f4f4','#e85d9a','#4f86f7','#3cb37a','#8a6cd8'];
const CLOTH=['#efebe4','#bfc4cc','#3a3a40','#1d1d22','#4f86f7','#2e5bd8','#e8553b','#ff7a2e','#f2c94c','#3cb37a','#1e5c4a','#8a6cd8','#ff8fb1','#a5623f','#6fe0c8'];
const EYEC=['#4a3020','#1c1412','#3a6ea5','#3c8a5a','#7a8a8a','#8a6a3a','#6a4a8a'];
const s_=(...a)=>a.map(x=>x.split(':'));
const CREATOR=[
  ['face','Face',[['skin','Skin tone','c',SKIN],['eyes','Eyes','s',s_('round:Round','almond:Almond','wide:Wide','sleepy:Sleepy')],['eyeCol','Eye colour','c',EYEC],
    ['brows','Eyebrows','s',s_('straight:Straight','arched:Arched','thick:Thick','angry:Serious','none:None')],['nose','Nose','s',s_('button:Button','wide:Wide','pointy:Pointed')],
    ['mouth','Mouth','s',s_('smile:Smile','grin:Grin','smirk:Smirk','neutral:Neutral')],['freckles','Freckles','t'],['blush','Rosy cheeks','t']]],
  ['hair','Hair',[['hairStyle','Hairstyle','s',s_('short:Short','buzz:Buzz cut','side:Side swoop','curly:Curly','afro:Afro','long:Long','ponytail:Ponytail','bun:Bun','braids:Braids','mohawk:Mohawk','bald:Bald')],
    ['hair','Hair colour','c',HAIRC],['facial','Facial hair','s',s_('none:None','stubble:Stubble','mustache:Moustache','goatee:Goatee','beard:Beard')],
    ['hat','Headwear','s',s_('none:None','beanie:Beanie','cap:Cap','headset:Headset')],['hatCol','Headwear colour','c',CLOTH]]],
  ['body','Body',[['build','Build','s',s_('slim:Slim','regular:Regular','broad:Broad')],['height','Height','s',s_('short:Shorter','avg:Average','tall:Taller')],
    ['glasses','Glasses','s',s_('none:None','round:Round','square:Square','shades:Sunglasses')]]],
  ['clothes','Clothes',[['top','Top','s',s_('tee:T-shirt','hoodie:Hoodie','jacket:Jacket','flight:Flight suit')],['shirt','Top colour','c',CLOTH],['shirt2','Detail colour','c',CLOTH],
    ['bottoms','Bottoms','s',s_('pants:Trousers','shorts:Shorts')],['pants','Bottoms colour','c',CLOTH],['shoes','Shoes','c',CLOTH]]],
  ['suit','Spacesuit',[...WOPTS.filter(o=>o[0]!=='rover').map(([k,l,c])=>[k,l,'c',c]),['antenna','Helmet antenna','t']]],
  ['rover','Rover',[['rover','Rover paint','c',WOPTS.find(o=>o[0]==='rover')[2]]]],
];
const LOOK_RULES={lamp:'t'};for(const[,,opts]of CREATOR)for(const o of opts)LOOK_RULES[o[0]]=o[2]==='s'?new Set(o[3].map(v=>v[0])):o[2];
// keep only valid choices (looks also arrive from other players and saved profiles)
function cleanLook(l){const o={...LOOK_DEFAULT};if(!l||typeof l!=='object')return o;
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
    const key=new THREE.DirectionalLight(0xfff2e2,2.6);key.position.set(3,5,4);const rim=new THREE.DirectionalLight(0xffb27a,1.6);rim.position.set(-4,3,-4);sc.add(key,rim);
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
const CR={tab:'face',prev:null};
function openCreator(){
  $('#creator').classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();
  CR.prev=CR.prev||makePreview('#cr-prev','#cr-cv','creator');renderCreator();CR.prev.start();
}
function closeCreator(){if($('#creator').classList.contains('hidden'))return;$('#creator').classList.add('hidden');saveLook()}
function renderCreator(){
  const cat=CREATOR.find(c=>c[0]===CR.tab)||CREATOR[0];
  $('#cr-tabs').innerHTML=CREATOR.map(([k,l])=>`<button data-ct="${k}" class="${k===CR.tab?'on':''}">${l}</button>`).join('');
  $('#cr-opts').innerHTML=cat[2].map(([k,l,type,vals])=>{
    if(type==='c')return`<div class="crrow"><div class="sub">${l}</div><div class="sw">${vals.map(c=>`<button data-lk="${k}" data-v="${c}" style="background:${c}" class="${LOOK[k]===c?'on':''}" aria-label="${c}"></button>`).join('')}</div></div>`;
    if(type==='t')return`<div class="crrow"><div class="sub">${l}</div><div class="opt"><button data-lt="${k}" data-v="1" class="${LOOK[k]?'on':''}">On</button><button data-lt="${k}" data-v="0" class="${LOOK[k]?'':'on'}">Off</button></div></div>`;
    return`<div class="crrow"><div class="sub">${l}</div><div class="chips">${vals.map(([v,n])=>`<button data-ls="${k}" data-v="${v}" class="${LOOK[k]===v?'on':''}">${n}</button>`).join('')}</div></div>`}).join('');
  const cas=['face','hair','body','clothes'].includes(CR.tab);if(CR.prev){CR.prev.casual=CR.tab==='suit'||CR.tab==='rover'?false:CR.tab==='clothes'||CR.tab==='hair'?true:CR.prev.casual;CR.prev.frame(CR.tab==='face'||CR.tab==='hair');CR.prev.mode=CR.tab==='rover'?'rover':'astro';CR.prev.look()}
  document.querySelectorAll('#creator [data-cm]').forEach(b=>b.classList.toggle('on',(b.dataset.cm==='casual')===!!(CR.prev&&CR.prev.casual)));
  $('#cr-pfp').src=pfpURL(LOOK)||'';void cas;
}
function setLook(k,v){LOOK[k]=v;LOOK=cleanLook(LOOK);applyLook();if(CR.prev)CR.prev.look();if(typeof ACCP!=='undefined'&&ACCP)ACCP.look();renderCreator()}
$('#creator').addEventListener('click',e=>{
  const t=e.target,ct=t.closest('[data-ct]'),c=t.closest('[data-lk]'),s=t.closest('[data-ls]'),tg=t.closest('[data-lt]'),cm=t.closest('[data-cm]');
  if(ct){CR.tab=ct.dataset.ct;renderCreator();return}
  if(c){setLook(c.dataset.lk,c.dataset.v);return}if(s){setLook(s.dataset.ls,s.dataset.v);return}if(tg){setLook(tg.dataset.lt,tg.dataset.v==='1');return}
  if(cm){CR.prev.casual=cm.dataset.cm==='casual';CR.prev.look();renderCreator();return}
  if(t.id==='cr-rand'){const r=Math.random;const pick=a=>a[Math.floor(r()*a.length)];
    for(const[,,opts]of CREATOR)for(const[k,,type,vals]of opts){if(k==='rover')continue;LOOK[k]=type==='c'?pick(vals):type==='t'?r()<0.3:pick(vals)[0]}
    LOOK=cleanLook(LOOK);applyLook();CR.prev.look();renderCreator();return}
  if(t.id==='cr-reset'){LOOK={...LOOK_DEFAULT};applyLook();CR.prev.look();renderCreator();return}
  if(t.id==='cr-done'||t.id==='cr-x')closeCreator();
});
LOOK=cleanLook(LOOK);applyLook();
