'use strict';

/* =========================================================
   BUILD MODE
   ========================================================= */
const build={active:false,mode:'build',type:null,ghost:null,rot:0,valid:false,reason:'',pt:null,hover:null,hl:null,line:''};
const ghostOK=new THREE.MeshBasicMaterial({color:'#6fe0c8',transparent:true,opacity:0.45,depthWrite:false});
const ghostBad=new THREE.MeshBasicMaterial({color:'#ff5a4f',transparent:true,opacity:0.45,depthWrite:false});
const recycleMat=new THREE.MeshStandardMaterial({color:'#ff4a3d',emissive:'#ff2a1d',emissiveIntensity:0.55,roughness:0.6,transparent:true,opacity:0.9});
const BKEYS=['1','2','3','4','5','6','7','8','9','0','-','=','[',']'];
const KEYMAP={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Digit5:4,Digit6:5,Digit7:6,Digit8:7,Digit9:8,Digit0:9,Minus:10,Equal:11,BracketLeft:12,BracketRight:13};
const isUnlocked=t=>{const r=BUILD[t].res;return!r||S.research.has(r)};
function toggleBuild(on){
  build.active=on===undefined?!build.active:on;
  if(!build.active){selectBuild(null);highlight(null);build.mode='build'}
  $('#buildbar').classList.toggle('hidden',!build.active);
  renderBuildBar();
}
function setBuildMode(m){build.mode=m;selectBuild(null);highlight(null);renderBuildBar()}
function renderBuildBar(){
  if(!S)return;
  const tabs=`<div class="bmodes"><button class="${build.mode==='build'?'on':''}" data-m="build">Build</button><button class="${build.mode==='recycle'?'on':''}" data-m="recycle">Recycle <span class="key">X</span></button></div>`;
  const useSto=nearBase(ME,40),sb=S.mode==='sandbox';
  const cards=build.mode!=='build'?'<div class="bnote">Point at a building and click to recycle it. Half its materials go back to colony storage.</div>':
    `<div class="bcards">${BUILD_ORDER.map((t,i)=>{const d=BUILD[t],u=isUnlocked(t),cost=BUILD_COSTS[t]||{},afford=sb||haveAll(ME,cost,useSto);
      const ci=Object.entries(cost).map(([id,n])=>{const have=slotsCount(S.inv,id)+(useSto?slotsCount(S.storage,id):0);return`<span class="ci${have>=n||sb?'':' miss'}" title="${esc(ITEMS[id].name)}"><img src="${iconURL(id)}" alt="">${n}</span>`}).join('');
      return`<div class="bcard ${build.type===t?'sel':''} ${u?'':'lock'} ${u&&!afford?'poor':''} ${game.guide&&game.guide.build===t?'tip':''}" data-b="${t}" title="${esc(d.desc)}"><span class="num">${BKEYS[i]}</span><div class="n">${d.name}</div><div class="c">${u?ci:'Needs research'}</div></div>`}).join('')}</div>`;
  const h=tabs+cards;if($('#buildbar').innerHTML!==h)$('#buildbar').innerHTML=h;
}
function selectBuild(t){
  if(build.ghost){scene.remove(build.ghost);disposeObj(build.ghost);build.ghost=null}
  build.type=null;
  if(t){
    if(!isUnlocked(t)){const r=RESEARCH.find(r=>r.id===BUILD[t].res);toast(`Needs research first: ${r.name} (Tab menu → Research)`,'warn');renderBuildBar();return}
    build.type=t;const g=MAKERS[t]();const ms=[];
    g.traverse(c=>{if(c.isMesh){c.castShadow=false;c.receiveShadow=false;c.material=ghostOK;ms.push(c)}if(c.isLight)c.intensity=0});
    g.userData.ms=ms;g.userData.ok=true;scene.add(g);build.ghost=g;
  }
  renderBuildBar();
}
// paint a building red while it's targeted for recycling
function highlight(b){
  if(build.hl===b)return;
  const paint=(o,on)=>o&&o.traverse(c=>{if(!c.isMesh)return;if(on){if(!c.userData.om)c.userData.om=c.material;c.material=recycleMat}else if(c.userData.om){c.material=c.userData.om;c.userData.om=null}});
  if(build.hl){paint(build.hl.g,false);paint(build.hl.cable,false)}
  build.hl=b;
  if(b){paint(b.g,true);paint(b.cable,true)}
}
const raycaster=new THREE.Raycaster();
function pickTerrain(){
  raycaster.setFromCamera({x:mouse.nx,y:mouse.ny},camera);const o=raycaster.ray.origin,d=raycaster.ray.direction;
  let t=0,prev=0;
  for(let i=0;i<220;i++){t+=1.5;const x=o.x+d.x*t,y=o.y+d.y*t,z=o.z+d.z*t;
    if(y<groundHeight(x,z)){let a=prev,b=t;for(let k=0;k<8;k++){const m=(a+b)/2;if(o.y+d.y*m<groundHeight(o.x+d.x*m,o.z+d.z*m))b=m;else a=m}
      const tt=(a+b)/2;return new THREE.Vector3(o.x+d.x*tt,0,o.z+d.z*tt)}
    prev=t}
  return null;
}
function pickBuilding(){
  raycaster.setFromCamera({x:mouse.nx,y:mouse.ny},camera);
  const hit=raycaster.intersectObjects(blds.map(b=>b.g),true)[0];
  if(hit){let o=hit.object;while(o.parent&&o.parent!==scene)o=o.parent;const b=blds.find(b=>b.g===o);if(b)return b}
  const pt=pickTerrain();if(pt)for(const b of blds)if(Math.hypot(b.x-pt.x,b.z-pt.z)<BUILD[b.type].r+0.8)return b;
  return null;
}
function updateBuild(){
  const f=focusPos();build.hover=null;
  if(build.mode==='recycle'){
    const b=pickBuilding();build.hover=b;highlight(b);
    build.line=b?`Click to recycle the <b>${BUILD[b.type].name}</b> (half its materials return to storage)`:'Point at a building to recycle it';
    return;
  }
  if(!build.type){build.line='Choose something to build';return}
  const pt=pickTerrain(),g=build.ghost;if(!pt){g.visible=false;build.line='Point at the ground';return}
  g.visible=true;
  const dx=pt.x-f.x,dz=pt.z-f.z,dd=Math.hypot(dx,dz),MAXD=40;if(dd>MAXD){pt.x=f.x+dx/dd*MAXD;pt.z=f.z+dz/dd*MAXD}
  const t=build.type,def=BUILD[t],reason=placeReason(t,pt.x,pt.z,false);
  build.valid=!reason;build.reason=reason;build.pt=pt;
  g.position.set(pt.x,footY(pt.x,pt.z,def.r),pt.z);g.rotation.y=build.rot;
  if(g.userData.ok!==build.valid){g.userData.ok=build.valid;for(const m of g.userData.ms)m.material=build.valid?ghostOK:ghostBad}
  build.line=reason?`<span class="bad">${reason}</span>`:`Click to place the <b>${def.name}</b> · <span class="key">R</span>rotate`;
}
function placeBuild(){
  if(!build.type||!build.pt)return;
  if(!build.valid){toast(build.reason,'warn');beep(200,0.12,'square',0.05);return}
  const t=build.type;
  if(act({a:'place',type:t,x:build.pt.x,z:build.pt.z,r:build.rot})===false)return;
  beep(600,0.06);beep(900,0.08,'sine',0.06,0.07);refreshInvUI();
  if(S.mode!=='sandbox'&&!haveAll(ME,BUILD_COSTS[t]||{},nearBase(ME,40)))selectBuild(null);else renderBuildBar();
}
function recycle(b){
  if(!b)return;
  highlight(null);
  if(act({a:'recycle',id:b.id})===false)return;beep(400,0.1);renderBuildBar();
}

