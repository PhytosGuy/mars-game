'use strict';

/* =========================================================
   MODEL KIT (low-poly, Astroneer-ish)
   ========================================================= */
const MATS={};
function mat(color,o){const k=color+(o?JSON.stringify(o):'');return MATS[k]||(MATS[k]=new THREE.MeshStandardMaterial(Object.assign({color,roughness:0.7,metalness:0.05},o)))}
function mesh(geo,m,x=0,y=0,z=0){const me=new THREE.Mesh(geo,typeof m==='string'?mat(m):m);me.position.set(x,y,z);me.castShadow=true;me.receiveShadow=true;return me}
// shared, rounded geometry (cached; never disposed)
const GEO={};
function shared(k,make){let g=GEO[k];if(!g){g=make();g.userData.shared=true;GEO[k]=g}return g}
function rbox(w,h,d,r){const rr=r===undefined?Math.min(w,h,d)*0.22:Math.min(r,Math.min(w,h,d)*0.49);
  return shared('b'+w+','+h+','+d+','+rr,()=>rr<0.012?new THREE.BoxGeometry(w,h,d):new RoundedBoxGeometry(w,h,d,2,rr))}
function rcyl(rt,rb,h,s){return shared('c'+rt+','+rb+','+h+','+s,()=>{
  const r=Math.min(h*0.25,rt*0.3,rb*0.3);if(r<0.03||rt<0.08)return new THREE.CylinderGeometry(rt,rb,h,s);
  const p=[],y0=-h/2,y1=h/2,arc=(cx,cy,a0,a1)=>{for(let i=0;i<=3;i++){const a=a0+(a1-a0)*i/3;p.push(new THREE.Vector2(cx+Math.cos(a)*r,cy+Math.sin(a)*r))}};
  p.push(new THREE.Vector2(0,y0));arc(rb-r,y0+r,-Math.PI/2,0);arc(rt-r,y1-r,0,Math.PI/2);p.push(new THREE.Vector2(0,y1));
  return new THREE.LatheGeometry(p,Math.max(s,10))})}
const bx=(w,h,d,c,x,y,z)=>mesh(rbox(w,h,d),c,x,y,z);
const cy=(rt,rb,h,s,c,x,y,z)=>mesh(rcyl(rt,rb,h,s),c,x,y,z);
const sp=(r,c,x,y,z,ws=14,hs=10)=>mesh(shared('s'+r+','+ws+','+hs,()=>new THREE.SphereGeometry(r,ws,hs)),c,x,y,z);
const rot=(m,ax,v)=>{m.rotation[ax]=v;return m};
const glow=(c,i=1.6)=>mat(c,{emissive:c,emissiveIntensity:i,roughness:0.4});
function nightMat(color,emis,k=1.6,base=0){const m=new THREE.MeshStandardMaterial({color,emissive:emis,emissiveIntensity:base,roughness:0.3,metalness:0.2});nightMats.push({m,k,base});return m}
const WHITE='#efebe4',OFF='#d6cfc5',ORANGE='#ff7a2e',DARK='#3b3532',GREY='#8d8781';
const GLASS=mat('#28305a',{roughness:0.12,metalness:0.6});

const LOOK_DEFAULT={suit:'#efebe4',accent:'#ff7a2e',visor:'#2b2f5a',pack:'#c9c3bb',boots:'#8d8781',antenna:false,lamp:true,rover:'#efebe4',
  skin:'#c68642',eyes:'round',eyeCol:'#4a3020',brows:'straight',nose:'button',mouth:'smile',freckles:false,blush:false,
  hairStyle:'short',hair:'#3b2a20',facial:'none',hat:'none',hatCol:'#ff7a2e',glasses:'none',build:'regular',height:'avg',
  top:'tee',shirt:'#4f86f7',shirt2:'#ffffff',bottoms:'pants',pants:'#3a3a40',shoes:'#efebe4'};
// One rig, two outfits: the spacesuit and your everyday clothes share the same joints, so every animation works for both.
// The visor is dark and mirrored: you can only just make out the face inside.
function mkAstronaut(){
  const g=new THREE.Group(),S_=(c,r=0.6)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
  const M={suit:S_(WHITE),accent:S_(ORANGE,0.5),pack:S_('#c9c3bb'),boots:S_(GREY,0.8),
    visor:new THREE.MeshStandardMaterial({color:'#2b2f5a',roughness:0.04,metalness:0.75,emissive:'#4a3a8a',emissiveIntensity:0.05,transparent:true,opacity:0.86,depthWrite:false}),
    skin:S_('#c68642',0.7),hair:new THREE.MeshStandardMaterial({color:'#3b2a20',roughness:0.55,map:hairTex()}),hat:S_('#ff7a2e',0.8),shirt:S_('#4f86f7',0.8),shirt2:S_('#ffffff',0.8),pants:S_('#3a3a40',0.85),shoes:S_('#efebe4',0.6),eye:S_('#4a3020',0.3)};
  const metal=mat('#6d6863',{roughness:0.4,metalness:0.5}),dark=mat('#2c2826',{roughness:0.6});
  const SUIT=[],CAS=[],UP=[],LOW=[],SHIN=[],BOOT=[],SC=[];
  const cs=(m,x,y=x,z=x)=>{m.userData.cs=new THREE.Vector3(x,y,z);SC.push(m);return m};   // how much slimmer this part is out of the suit
  const add=(m,p=g)=>{p.add(m);return m},su=m=>{SUIT.push(m);return m},ca=m=>{CAS.push(m);return m},up=m=>{UP.push(m);return m},lo=m=>{LOW.push(m);return m};
  const torso=su(add(mesh(shared('torso',()=>new THREE.CapsuleGeometry(0.3,0.42,8,16)),M.suit,0,1.13,0)));torso.scale.set(1.2,1,0.86);
  const ctorso=ca(add(mesh(shared('ctorso',bodyLathe),M.shirt,0,0,0)));ctorso.scale.set(1.25,1,0.72);                 // chest, waist and shoulders
  const pelvis=lo(add(mesh(shared('pelvis',()=>new THREE.CapsuleGeometry(0.17,0.26,6,14)),M.suit,0,0.82,0)));pelvis.rotation.z=Math.PI/2;pelvis.scale.set(1,1,0.88);
  su(add(cy(0.2,0.24,0.16,14,M.suit,0,1.48,0)));                                                // neck seal
  ca(add(cy(0.085,0.1,0.2,10,M.skin,0,1.5,0)));                                                 // neck
  const SHO=[];for(const s of[1,-1])SHO.push(cs(up(add(sp(0.135,M.suit,s*0.43,1.38,0,14,10))),0.62));                           // shoulder joints
  su(add(mesh(rbox(0.72,0.11,0.53,0.05),M.boots,0,0.95,0)));su(add(mesh(rbox(0.12,0.09,0.06,0.03),metal,0,0.95,0.27)));
  su(add(mesh(rbox(0.38,0.22,0.1,0.05),'#d9d3cb',0,1.24,0.25)));
  [['#5fe37f',-0.1],['#ffcf4a',0],['#6fb6ff',0.1]].forEach(([c,x])=>su(add(sp(0.028,glow(c,1.8),x,1.27,0.31,8,6))));
  su(add(mesh(rbox(0.36,0.05,0.11,0.02),M.accent,0,1.15,0.25)));
  su(add(sp(0.16,M.accent,0.4,1.4,0,12,10))).scale.set(1,0.75,1);su(add(sp(0.16,M.accent,-0.4,1.4,0,12,10))).scale.set(1,0.75,1);
  su(add(mesh(rbox(0.6,0.7,0.3,0.12),M.pack,0,1.18,-0.36)));su(add(mesh(rbox(0.62,0.08,0.32,0.04),M.accent,0,1.4,-0.36)));
  const tank=shared('tank',()=>new THREE.CapsuleGeometry(0.1,0.42,6,12));
  su(add(mesh(tank,'#f2efe9',0.17,1.12,-0.56)));su(add(mesh(tank,'#f2efe9',-0.17,1.12,-0.56)));su(add(mesh(rbox(0.3,0.08,0.06,0.03),dark,0,0.88,-0.52)));
  su(add(mesh(shared('neckring',()=>new THREE.TorusGeometry(0.27,0.065,10,22)),metal,0,1.5,0))).rotation.x=Math.PI/2;
  // the head pivots at the neck so it can turn to where you're looking (helmet lamp included)
  const head=new THREE.Group();head.position.set(0,1.55,0);g.add(head);const hadd=o=>{head.add(o);return o};
  // helmet shell with an opening at the front for the visor (plus brow and chin pieces)
  const gap=1.0,hg=(ps,pl,ts,tl)=>new THREE.SphereGeometry(0.44,22,18,ps,pl,ts,tl);
  for(const geo of[shared('helmA',()=>hg(Math.PI/2+gap,Math.PI*2-gap*2,0,Math.PI)),shared('helmB',()=>hg(Math.PI/2-gap,gap*2,0,0.95)),shared('helmC',()=>hg(Math.PI/2-gap,gap*2,2.25,Math.PI-2.25))]){
    const h=su(hadd(mesh(geo,M.suit,0,0.27,0)));h.scale.set(1,0.95,1)}
  const helmIn=su(hadd(mesh(shared('helmIn',()=>new THREE.SphereGeometry(0.43,18,14)),mat('#2a2830',{side:THREE.BackSide,roughness:0.9}),0,0.27,0)));helmIn.scale.set(1,0.95,1);
  const visor=su(hadd(mesh(shared('visor3',()=>new THREE.SphereGeometry(0.34,28,20)),M.visor,0,0.28,0.27)));visor.scale.set(1.1,0.8,0.7);visor.renderOrder=2;visor.castShadow=false;
  su(hadd(mesh(shared('vglint',()=>new THREE.SphereGeometry(0.05,8,6)),mat('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.5,transparent:true,opacity:0.55}),-0.16,0.38,0.5))).scale.set(0.8,0.3,0.25);
  su(hadd(sp(0.07,glow('#fff6e0',1.2),0.3,0.49,0.18,8,6)));
  const lamp=new THREE.SpotLight(0xfff6e0,0,45,0.55,0.55,1.2);lamp.position.set(0.3,0.49,0.25);lamp.target.position.set(0,-0.75,9);head.add(lamp,lamp.target);
  su(hadd(mesh(rbox(0.1,0.16,0.12,0.04),metal,0.42,0.29,0)));su(hadd(mesh(rbox(0.1,0.16,0.12,0.04),metal,-0.42,0.29,0)));
  const ant=new THREE.Group();ant.add(cy(0.015,0.015,0.5,5,GREY,0,0.25,0));ant.add(sp(0.05,M.accent,0,0.52,0,8,6));ant.position.set(0.26,0.5,-0.12);head.add(ant);ant.visible=false;
  // the face (always shown) and hair/hat (only without the helmet) are built by buildFace()
  const face=new THREE.Group();head.add(face);const hairG=new THREE.Group();head.add(hairG);hairG.visible=false;
  const topG=new THREE.Group();g.add(topG);topG.visible=false;
  // limbs
  const limb=(x,y,r,len,mat_)=>{const p=new THREE.Group();p.position.set(x,y,0);g.add(p);
    p.add(cs(up(mesh(shared('cap'+r+len,()=>new THREE.CapsuleGeometry(r,len,6,12)),mat_,0,-len/2-r*0.4,0)),0.72,1,0.72));return p};
  const armL=limb(0.43,1.38,0.11,0.34,M.suit),armR=limb(-0.43,1.38,0.11,0.34,M.suit);
  const armCl=[];for(const a of[armL,armR]){a.add(su(sp(0.13,M.accent,0,-0.6,0,12,10)));
    const hand=new THREE.Group();hand.position.set(0,-0.58,0);a.add(ca(hand));hand.add(sp(0.072,M.skin,0,0,0,12,10));hand.children[0].scale.set(0.85,1.15,0.6);
    const th=mesh(shared('thumb',()=>new THREE.CapsuleGeometry(0.022,0.05,4,8)),M.skin,a===armL?-0.05:0.05,0.01,0.03);th.rotation.z=a===armL?0.6:-0.6;hand.add(th);
    a.add(su(mesh(rbox(0.25,0.08,0.25,0.04),M.accent,0,-0.3,0)));a.add(cs(up(sp(0.115,M.suit,0,0,0,12,10)),0.7));
    const cl=new THREE.Group();a.add(ca(cl));armCl.push(cl)}
  const leg=x=>{const hip=new THREE.Group();hip.position.set(x,0.78,0);g.add(hip);
    hip.add(cs(lo(sp(0.15,M.suit,0,0,0,14,10)),0.78));
    hip.add(cs(lo(mesh(shared('thigh',()=>new THREE.CapsuleGeometry(0.135,0.2,6,12)),M.suit,0,-0.17,0)),0.8,1,0.8));
    const knee=new THREE.Group();knee.position.set(0,-0.36,0);hip.add(knee);
    const kj=cs(lo(sp(0.132,M.suit,0,0,0,14,10)),0.72);knee.add(kj);SHIN.push(kj);
    knee.add(su(sp(0.1,M.accent,0,0.02,0.1,10,8)));
    const shin=cs(lo(mesh(shared('shin',()=>new THREE.CapsuleGeometry(0.125,0.16,6,12)),M.suit,0,-0.13,0)),0.72,1,0.72);knee.add(shin);SHIN.push(shin);
    const boot=cs(mesh(rbox(0.3,0.18,0.42,0.08),M.boots,0,-0.3,0.05),0.8,0.72,0.9);BOOT.push(boot);knee.add(boot);knee.add(su(mesh(rbox(0.31,0.06,0.43,0.03),dark,0,-0.39,0.05)));
    const cl=new THREE.Group();knee.add(ca(cl));legCl.push(cl);hip.userData.knee=knee;return hip};
  const legCl=[];const legL=leg(0.16),legR=leg(-0.16);
  const tool=new THREE.Group();tool.position.set(0,-0.62,0.08);armR.add(tool);
  const tipMat=new THREE.MeshStandardMaterial({color:'#6fe0c8',emissive:'#6fe0c8',emissiveIntensity:0.4});
  const tip=new THREE.Object3D();tip.position.set(0,-0.5,0);tool.add(tip);
  for(const m of CAS)m.visible=false;
  g.userData={head,armL,armR,legL,legR,lamp,mats:M,antenna:ant,tip,tipMat,tool,held:null,suitParts:SUIT,casParts:CAS,upper:UP,lower:LOW,shins:SHIN,bootM:BOOT,face,hairG,topG,torso,pelvis,casual:false,wantAnt:false,faceSig:'',scaled:SC,shoulders:SHO,ctorso,armCl,legCl,bw:1};
  buildFace(g,LOOK_DEFAULT);return g;
}
// the torso under everyday clothes: (radius, height) from the hem up to the neck
const BODY_PROF=[[0.001,0.872],[0.198,0.878],[0.208,0.95],[0.196,1.04],[0.205,1.12],[0.232,1.22],[0.248,1.3],[0.25,1.36],[0.226,1.43],[0.155,1.48],[0.09,1.51],[0.001,1.522]];
function bodyLathe(){return new THREE.LatheGeometry(BODY_PROF.map(([r,y])=>new THREE.Vector2(r,y)),28)}
const bodyR=y=>{for(let i=1;i<BODY_PROF.length;i++){const[a,ya]=BODY_PROF[i-1],[b,yb]=BODY_PROF[i];if(y<=yb)return lerp(a,b,(y-ya)/Math.max(1e-6,yb-ya))}return 0.09};
// face, hair, hat, glasses and the style of your top: rebuilt only when those choices change
function buildFace(a,l){
  const U=a.userData,M=U.mats,F=U.face,H=U.hairG,T=U.topG;for(const grp of[F,H,T,...U.armCl,...U.legCl])while(grp.children.length)grp.remove(grp.children[0]);
  const fa=(m,x,y,z)=>{m.position.set(x,y,z);F.add(m);return m},ha=(m,x,y,z)=>{m.position.set(x,y,z);H.add(m);return m};
  const S=(r,m,ws=12,hs=10)=>new THREE.Mesh(shared('fs'+r+'_'+ws+'_'+hs,()=>new THREE.SphereGeometry(r,ws,hs)),m),B=(w,h,d,m)=>new THREE.Mesh(shared('fb'+w+'_'+h+'_'+d,()=>new THREE.BoxGeometry(w,h,d)),m);
  const shell=(r,t0,t1,m)=>new THREE.Mesh(shared('sh'+r+'_'+t0+'_'+t1,()=>new THREE.SphereGeometry(r,18,12,0,Math.PI*2,t0,t1-t0)),m);
  const arc=(r,t,ang,m)=>new THREE.Mesh(shared('arc'+r+'_'+t+'_'+ang,()=>new THREE.TorusGeometry(r,t,6,16,ang)),m);
  const white=mat('#fbfaf7',{roughness:0.25}),lipM=mat('#b4544e',{roughness:0.45}),mouthIn=mat('#4a1717',{roughness:0.8}),frame=mat('#1d1a1a',{roughness:0.4}),lash=mat('#1a1210',{roughness:0.6}),
    shade=mat('#000000',{transparent:true,opacity:0.16,depthWrite:false}),pupil=mat('#0b0908',{roughness:0.2}),spark=mat('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.9}),Y=0.27;
  // head, jaw and chin, cheeks, ears
  fa(S(0.25,M.skin,24,18),0,Y,0).scale.set(1,1.08,1);
  fa(S(0.2,M.skin,24,18),0,Y-0.075,0.02).scale.set(1.08,0.88,1);
  for(const s of[-1,1]){
    fa(S(0.055,M.skin,10,8),s*0.245,Y+0.005,-0.01).scale.set(0.42,1,0.82);fa(S(0.03,shade,8,6),s*0.262,Y+0.005,0.0).scale.set(0.3,0.75,0.6)}
  // eyes: white, iris, pupil, a sparkle of light, lashes and brows
  const es={round:[1,1],almond:[1.3,0.72],wide:[1.15,1.2],sleepy:[1.1,0.62]}[l.eyes]||[1,1],ex=0.088,ey=Y+0.03;
  for(const s of[-1,1]){
    fa(S(0.047,white,14,10),s*ex,ey,0.208).scale.set(es[0],es[1],0.5);
    fa(S(0.028,M.eye,12,10),s*ex,ey-0.002,0.226).scale.set(1,Math.min(1,es[1]*1.05),0.42);
    fa(S(0.014,pupil,8,6),s*ex,ey-0.002,0.234).scale.set(1,Math.min(1,es[1]*1.05),0.4);
    fa(S(0.0075,spark,6,4),s*ex-0.01,ey+0.012,0.239);
    const up=fa(arc(0.047,0.0065,Math.PI,lash),s*ex,ey,0.214);up.scale.set(es[0],es[1]*0.98,1);
    if(l.eyes==='sleepy'){const lid=fa(new THREE.Mesh(shared('lid2',()=>new THREE.SphereGeometry(0.05,12,6,0,Math.PI*2,0,Math.PI/2)),M.skin),s*ex,ey-0.002,0.21);lid.scale.set(es[0],0.9,0.55)}
    if(l.eyes==='almond'){const c=fa(B(0.016,0.005,0.01,lash),s*(ex+0.06),ey+0.006,0.21);c.rotation.z=s*0.4}
    if(l.brows!=='none'){const b=fa(new THREE.Mesh(shared('brow'+(l.brows==='thick'?1:0),()=>new THREE.CapsuleGeometry(l.brows==='thick'?0.016:0.01,0.07,4,8)),M.hair),s*ex,Y+0.105,0.222);
      b.rotation.z=Math.PI/2+(l.brows==='arched'?s*0.3:l.brows==='angry'?-s*0.32:s*0.06)}}
  // nose: bridge, tip and nostrils
  const nw=l.nose==='wide'?1.5:1;
  fa(new THREE.Mesh(shared('nbridge',()=>new THREE.CapsuleGeometry(0.016,0.06,4,8)),M.skin),0,Y+0.005,0.235).rotation.x=-0.3;
  if(l.nose==='pointy'){const n=fa(new THREE.Mesh(shared('nosec2',()=>new THREE.ConeGeometry(0.026,0.07,10)),M.skin),0,Y-0.03,0.258);n.rotation.x=Math.PI/2}
  else fa(S(0.027,M.skin,10,8),0,Y-0.032,0.25).scale.set(nw,0.85,0.9);
  for(const s of[-1,1]){fa(S(0.017,M.skin,8,6),s*0.024*nw,Y-0.04,0.236);fa(S(0.007,mouthIn,6,4),s*0.014*nw,Y-0.05,0.248).scale.set(1,0.6,0.6)}
  // mouth and lips
  const my=Y-0.098;
  if(l.mouth==='neutral'){fa(new THREE.Mesh(shared('lipn',()=>new THREE.CapsuleGeometry(0.009,0.06,4,8)),lipM),0,my+0.006,0.228).rotation.z=Math.PI/2;fa(new THREE.Mesh(shared('lipn2',()=>new THREE.CapsuleGeometry(0.012,0.05,4,8)),lipM),0,my-0.012,0.225).rotation.z=Math.PI/2}
  else if(l.mouth==='grin'){const o=fa(new THREE.Mesh(shared('grin2',()=>new THREE.CircleGeometry(0.05,16,Math.PI,Math.PI)),mouthIn),0,my+0.012,0.229);o.scale.set(1.1,0.75,1);
    fa(B(0.085,0.016,0.006,white),0,my+0.004,0.231);const ll=fa(arc(0.052,0.009,Math.PI,lipM),0,my+0.012,0.228);ll.rotation.z=Math.PI;ll.scale.set(1.1,0.78,1);fa(B(0.11,0.008,0.008,lipM),0,my+0.013,0.229)}
  else{const sm=l.mouth==='smirk';const up=fa(arc(0.046,0.007,Math.PI,lipM),sm?0.012:0,my+0.03,0.226);up.rotation.z=Math.PI+(sm?0.3:0);
    const lo=fa(arc(0.036,0.011,Math.PI*0.8,lipM),sm?0.014:0,my+0.03,0.224);lo.rotation.z=Math.PI+Math.PI*0.1+(sm?0.3:0)}
  if(l.freckles)for(const s of[-1,1])for(let i=0;i<5;i++)fa(S(0.006,mat('#8a5a3a'),5,4),s*(0.085+i*0.017),Y-0.03+(i%2)*0.013,0.218);
  if(l.blush)for(const s of[-1,1])fa(S(0.035,mat('#ff7a8a',{transparent:true,opacity:0.4,depthWrite:false}),8,6),s*0.12,Y-0.05,0.2).scale.set(1,0.6,0.4);
  // glasses
  if(l.glasses==='round'||l.glasses==='square'){for(const s of[-1,1]){const r=l.glasses==='round'?fa(new THREE.Mesh(shared('gl',()=>new THREE.TorusGeometry(0.055,0.009,6,20)),frame),s*ex,ey,0.25):fa(new THREE.Mesh(shared('gls',()=>new THREE.TorusGeometry(0.06,0.009,4,4)),frame),s*ex,ey,0.25);if(l.glasses==='square')r.rotation.z=Math.PI/4;
      fa(new THREE.Mesh(shared('glarm',()=>new THREE.BoxGeometry(0.008,0.008,0.22)),frame),s*0.15,ey+0.01,0.14)}fa(B(0.05,0.008,0.008,frame),0,ey+0.012,0.256)}
  else if(l.glasses==='shades'){fa(B(0.3,0.065,0.025,mat('#111318',{roughness:0.08,metalness:0.7})),0,ey+0.004,0.245);for(const s of[-1,1])fa(new THREE.Mesh(shared('glarm',()=>new THREE.BoxGeometry(0.008,0.008,0.22)),frame),s*0.15,ey+0.01,0.14)}
  // facial hair
  if(l.facial==='beard'){const b=fa(shell(0.258,2.08,2.9,M.hair),0,Y,0.012);b.scale.set(1.04,1.12,1.04);for(const sd of[-1,1]){const sb=fa(S(0.05,M.hair,8,6),sd*0.215,Y-0.06,0.08);sb.scale.set(0.5,1.5,0.8)}fa(S(0.06,M.hair,10,8),0,Y-0.2,0.16).scale.set(1.3,0.8,0.8)}
  else if(l.facial==='goatee'){fa(S(0.04,M.hair,10,8),0,Y-0.19,0.19).scale.set(1.1,1.3,0.7)}
  else if(l.facial==='stubble'){const b=fa(shell(0.256,1.8,2.7,mat(l.hair,{transparent:true,opacity:0.3,depthWrite:false})),0,Y,0);b.scale.set(1,1.08,1)}
  if(l.facial==='mustache'||l.facial==='beard'){for(const s of[-1,1]){const m=fa(new THREE.Mesh(shared('must',()=>new THREE.CapsuleGeometry(0.014,0.045,4,8)),M.hair),s*0.03,my+0.045,0.235);m.rotation.z=Math.PI/2+s*0.35}}
  // hair (and hat), only seen without the helmet
  if(l.hairStyle!=='bald')H.add(new THREE.Mesh(hairGeometry(l.hairStyle,Y,l.hat!=='none'),M.hair));
  if(l.hat==='beanie'){const h=ha(shell(0.285,0,1.25,M.hat),0,Y,0);h.scale.set(1,1.12,1);ha(new THREE.Mesh(shared('rim',()=>new THREE.TorusGeometry(0.27,0.03,6,20)),M.hat),0,Y+0.09,0).rotation.x=Math.PI/2}
  else if(l.hat==='cap'){ha(shell(0.282,0,1.2,M.hat),0,Y,0).scale.set(1,1.1,1);ha(B(0.3,0.025,0.2,M.hat),0,Y+0.12,0.3).rotation.x=0.15}
  else if(l.hat==='headset'){ha(new THREE.Mesh(shared('hband',()=>new THREE.TorusGeometry(0.27,0.02,6,18,Math.PI)),frame),0,Y+0.02,0);for(const s of[-1,1])ha(S(0.06,frame,8,6),s*0.26,Y,0)}
  // everyday clothes: details are curved panels that hug the body (children of the shaped torso), so they blend in
  {if(!U.cdeco){U.cdeco=new THREE.Group();U.ctorso.add(U.cdeco)}const D_=U.cdeco;while(D_.children.length)D_.remove(D_.children[0]);
    const T_=U.topG,ta=(m,x,y,z)=>{m.position.set(x,y,z);T_.add(m);return m};
    // a smooth panel following the torso between heights y0..y1, centred on angle a (0 = front) and wa wide, raised by `off`
    const panel=(y0,y1,a,wa,off,m)=>{const key=`bp${y0}_${y1}_${a}_${wa}_${off}`;const g=shared(key,()=>{const pts=[];for(let i=0;i<=10;i++){const y=lerp(y0,y1,i/10),edge=Math.sin(i/10*Math.PI);pts.push(new THREE.Vector2(bodyR(y)+off*(0.35+0.65*Math.pow(edge,0.3)),y))}
        return new THREE.LatheGeometry(pts,Math.max(6,Math.round(wa*24)),a-wa,wa*2)});const p=new THREE.Mesh(g,m);D_.add(p);return p};
    const ring=(rad,tube,m,y,sx=1.25,sz=0.72)=>{const t=new THREE.Mesh(shared('ring'+rad+'_'+tube,()=>new THREE.TorusGeometry(rad,tube,10,40)),m);t.rotation.x=Math.PI/2;t.scale.set(sx,sz,1);return ta(t,0,y,0)};
    const dk=mat('#1d1a1a',{roughness:0.6}),metalB=mat('#c9c3bb',{roughness:0.3,metalness:0.8}),M2=M.shirt2,top=l.top;
    panel(0.874,0.905,0,Math.PI,0.012,M.shirt);                                                // rolled hem all the way round
    if(top==='tee'){ring(0.09,0.018,M2,1.495,1.1,0.85);panel(1.2,1.34,0,0.36,0.004,M2);panel(1.245,1.295,0,0.24,0.007,M.shirt)}
    else if(top==='hoodie'){const hood=new THREE.Mesh(shared('hood3',()=>new THREE.TorusGeometry(0.16,0.07,14,28)),M.shirt);hood.rotation.x=Math.PI/2+0.55;hood.scale.set(1.05,1,0.9);ta(hood,0,1.47,-0.08);
      panel(0.95,1.09,0,0.62,0.018,M.shirt);panel(1.08,1.095,0,0.6,0.02,M2);panel(0.874,0.92,0,Math.PI,0.016,M2);
      for(const s of[-1,1]){const cd=new THREE.Mesh(shared('cord2',()=>new THREE.CapsuleGeometry(0.006,0.11,4,6)),M2);ta(cd,s*0.045,1.37,bodyR(1.37)*0.72+0.012)}}
    else if(top==='jacket'){panel(0.9,1.43,0,0.19,0.004,M2);for(const s of[-1,1]){panel(1.27,1.46,s*0.3,0.12,0.016,M.shirt);panel(0.93,1.44,s*0.2,0.012,0.01,dk);panel(0.98,1.03,s*0.62,0.14,0.012,M.shirt)}ring(0.095,0.024,M.shirt,1.48,1.15,0.9)}
    else if(top==='flight'){panel(0.9,1.46,0,0.022,0.007,M2);ring(0.095,0.022,M.shirt,1.48,1.15,0.9);panel(0.95,1.0,0,Math.PI,0.012,M.pants);panel(1.27,1.33,-0.42,0.14,0.006,M2);
      const patch=new THREE.Mesh(shared('patch3',()=>new THREE.SphereGeometry(0.05,16,10,0,Math.PI*2,0,0.5)),mat('#2e5bd8'));patch.rotation.x=Math.PI/2;ta(patch,0.12,1.3,bodyR(1.3)*0.72-0.035)}
    // trousers: a rolled waistband with a belt and buckle
    ring(0.188,0.024,M.pants,0.9,1.0,0.82);ring(0.19,0.013,dk,0.9,1.02,0.84);const bk=new THREE.Mesh(shared('buckle',()=>rbox(0.05,0.035,0.014,0.006)),metalB);ta(bk,0,0.9,0.158);
    // sleeves: short sleeves show the forearm; long sleeves get rolled cuffs
    for(const cl of U.armCl){if(top==='tee'){const fore=new THREE.Mesh(shared('fore',()=>new THREE.CapsuleGeometry(0.083,0.2,8,16)),M.skin);fore.position.set(0,-0.38,0);cl.add(fore);
        const hem=new THREE.Mesh(shared('slhem2',()=>new THREE.TorusGeometry(0.087,0.016,10,24)),M.shirt);hem.rotation.x=Math.PI/2;hem.position.set(0,-0.25,0);cl.add(hem)}
      else{const cuff=new THREE.Mesh(shared('cuff2',()=>new THREE.TorusGeometry(0.08,0.02,10,24)),top==='hoodie'?M2:M.shirt);cuff.rotation.x=Math.PI/2;cuff.position.set(0,-0.47,0);cl.add(cuff)}}
    // shoes: rounded soles and toe caps; trouser or shorts hems
    for(const cl of U.legCl){const sole=new THREE.Mesh(shared('sole2',()=>rbox(0.25,0.04,0.41,0.018)),mat('#f4f1ea',{roughness:0.7}));sole.position.set(0,-0.37,0.05);cl.add(sole);
      const toe=new THREE.Mesh(shared('toe2',()=>new THREE.SphereGeometry(0.1,16,10,0,Math.PI*2,0,Math.PI/2)),mat('#f4f1ea',{roughness:0.7}));toe.scale.set(1.15,0.5,0.9);toe.position.set(0,-0.35,0.17);cl.add(toe);
      const lace=new THREE.Mesh(shared('lace2',()=>new THREE.CapsuleGeometry(0.008,0.07,4,6)),M2);lace.rotation.z=Math.PI/2;lace.position.set(0,-0.226,0.12);cl.add(lace);
      const hm=new THREE.Mesh(shared('pantHem2',()=>new THREE.TorusGeometry(0.095,0.018,10,24)),M.pants);hm.rotation.x=Math.PI/2;
      if(U.shorts||l.bottoms==='shorts'){hm.position.set(0,0.06,0);hm.scale.set(1.12,1.12,1)}else hm.position.set(0,-0.2,0);cl.add(hm)}}
}
/* ---------- hair: real-looking hair built from tapered locks and curls ----------
   Every style is a scalp cap with a natural hairline plus locks that follow a combing direction
   over the head, all merged into one mesh. A strand texture gives the fine lines of hair. */
let HAIR_TEX=null;
function hairTex(){if(HAIR_TEX)return HAIR_TEX;const c=document.createElement('canvas');c.width=64;c.height=256;const x=c.getContext('2d');
  x.fillStyle='#d8d8d8';x.fillRect(0,0,64,256);const r=mulberry(91);
  for(let i=0;i<260;i++){const v=150+Math.floor(r()*105),w=0.6+r()*1.6;x.strokeStyle=`rgba(${v},${v},${v},${0.35+r()*0.5})`;x.lineWidth=w;const x0=r()*64;x.beginPath();x.moveTo(x0,0);x.bezierCurveTo(x0+(r()-0.5)*8,85,x0+(r()-0.5)*8,170,x0+(r()-0.5)*6,256);x.stroke()}
  HAIR_TEX=new THREE.CanvasTexture(c);HAIR_TEX.wrapS=HAIR_TEX.wrapT=THREE.RepeatWrapping;HAIR_TEX.colorSpace=THREE.SRGBColorSpace;return HAIR_TEX}
const HR={x:0.262,y:0.283,z:0.262};                                       // scalp ellipsoid (just over the skin)
const hairMax=phi=>lerp(1.02,2.4,Math.pow((1-Math.cos(phi))/2,0.85));                     // hairline: forehead at the front, nape at the back
function scalp(th,ph,Y,out=0){const d=new THREE.Vector3(Math.sin(th)*Math.sin(ph),Math.cos(th),Math.sin(th)*Math.cos(ph));
  const p=new THREE.Vector3(d.x*(HR.x+out),Y+d.y*(HR.y+out),d.z*(HR.z+out)),n=new THREE.Vector3(d.x/HR.x,d.y/HR.y,d.z/HR.z).normalize();return{p,n}}
// one lock: a tapered clump growing along +y, bending toward -z (into the head) so it hugs the scalp
function lockGeo(len,rad,bend,curl,seg=8,flat=1.9){
  const pts=[];for(let i=0;i<=6;i++){const t=i/6;pts.push(new THREE.Vector3(curl?Math.sin(t*Math.PI*2)*curl*len:0,len*t,-bend*t*t*len))}
  const curve=new THREE.CatmullRomCurve3(pts),g=new THREE.TubeGeometry(curve,seg,rad,6,false),pos=g.attributes.position,c=new THREE.Vector3();
  for(let i=0;i<=seg;i++){curve.getPointAt(i/seg,c);const k=Math.max(0.1,1-Math.pow(i/seg,1.3)*0.9);for(let j=0;j<=6;j++){const v=i*7+j;pos.setXYZ(v,c.x+(pos.getX(v)-c.x)*k*flat,c.y+(pos.getY(v)-c.y)*k,c.z+(pos.getZ(v)-c.z)*k*0.45)}}
  g.computeVertexNormals();return g}
const _hb=new THREE.Matrix4(),_hx=new THREE.Vector3(),_hy=new THREE.Vector3();
// put a geometry on the scalp at p, pointing along `flow` (projected onto the scalp), lying against normal n
function placeOn(geo,p,n,flow,sink=0.012){_hy.copy(flow).addScaledVector(n,-flow.dot(n));if(_hy.lengthSq()<1e-5){_hy.set(0,0,-1);_hy.addScaledVector(n,-_hy.dot(n))}_hy.normalize();_hx.crossVectors(_hy,n).normalize();
  _hb.makeBasis(_hx,_hy,n);_hb.setPosition(p.x-n.x*sink,p.y-n.y*sink,p.z-n.z*sink);const g=geo.clone();g.applyMatrix4(_hb);return g}
function hairCap(Y,r0=0.258){const g=new THREE.SphereGeometry(1,44,30),pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),th=Math.acos(clamp(y,-1,1)),ph=Math.atan2(x,z);const hm=hairMax(ph),k=th<=hm?r0:th<=hm+0.3?lerp(r0,0.243,(th-hm)/0.3):0.243;
    pos.setXYZ(i,x*k,Y+y*k*1.08,z*k)}g.computeVertexNormals();return g}
// Hair as one smooth, sculpted shape per style: a shell over the scalp that thickens, sweeps, curls or falls
// (a smooth hairline that tapers into the skin, no layered pieces), plus a few rounded extras (ponytail, bun, braids).
const HAIR_STYLE={buzz:{t:0.005},short:{t:0.026,top:0.03,hl:0.07},side:{t:0.028,top:0.02,hl:0.1,side:0.04},long:{t:0.03,top:0.015,hl:0.09,hang:0.46},
  ponytail:{t:0.013,top:0.006},bun:{t:0.013,top:0.006},curly:{t:0.038,top:0.025,hl:0.05,curl:0.024},mohawk:{t:0.004,ridge:0.13},braids:{t:0.012,top:0.006},afro:{afro:1}};
function hairGeometry(style,Y,hatOn){
  return shared('hair3_'+style+(hatOn?'_hat':''),()=>{
    const H=HAIR_STYLE[style]||{t:0.02},parts=[],nz=makeNoise(31),ss=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
    const g=new THREE.SphereGeometry(1,96,72),pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),th=Math.acos(clamp(y,-1,1)),ph=Math.atan2(x,z),front=Math.max(0,Math.cos(ph));
      let hm=hairMax(ph)+(H.hl||0)*ss(0.3,1,front);if(hatOn)hm=Math.max(hm,0);
      let inside=ss(hm+0.07,hm-0.05,th);                                                   // 1 = hair, 0 = bare skin, smooth in between
      let t=(H.t||0)+(H.top||0)*Math.max(0,y)+(H.side||0)*Math.max(0,x)*ss(-0.4,0.6,y);
      if(H.curl)t+=H.curl*(0.45+0.55*nz(x*8+z*3.1,y*8-z*2.7))*ss(-0.2,0.5,y+0.4);
      if(H.ridge)t+=H.ridge*Math.exp(-(x*x)/0.0085)*ss(1.75,0.55,th)*(0.85+0.15*nz(z*18,y*18));
      t*=0.3+0.7*ss(hm,hm-0.28,th);                                                    // thinner towards the hairline, so the edge is soft
      if(H.afro)t=0.11+0.05*nz(x*6+z*2,y*6-z*3)+0.025*nz(x*15,y*15+z*9);
      let r=0.252+t,px=x*r,py=Y+y*r*1.08,pz=z*r;
      if(H.afro){const fy=z>0.45&&y<0.42?1-0.45*ss(0.45,0.75,z)*ss(0.42,0.12,y):1;px*=1.25;pz*=1.22*fy;py=Y+0.07+y*r*1.15*fy;inside=th<hm+0.25||z<0.2?1:inside}
      // long hair falls from the hairline down the back and sides as one smooth curtain
      if(H.hang){const back=ss(0.38,-0.15,Math.cos(ph)),k=ss(1.15,Math.PI*0.95,th)*back;
        if(k>0){const fall=(th-1.15)/(Math.PI-1.15),hr=0.27+0.035*Math.sin(fall*Math.PI);px=lerp(px,Math.sin(ph)*hr,k);pz=lerp(pz,Math.cos(ph)*hr-0.02,k);py=lerp(py,Y+0.04-fall*H.hang,k);inside=Math.max(inside,ss(0.0,0.25,k)*back)}}
      if(hatOn)t=Math.min(t,0.02);
      // bare skin: tuck the shell just under the scalp so the edge melts into the head
      const hx=x*0.243,hy=Y+y*0.243*1.08,hz=z*0.243;pos.setXYZ(i,lerp(hx,px,inside),lerp(hy,py,inside),lerp(hz,pz,inside))}
    g.computeVertexNormals();parts.push(g);
    if(style==='ponytail'){const tie=new THREE.Vector3(0,Y+0.07,-0.265);
      const tail=new THREE.LatheGeometry([[0.001,0],[0.05,0.015],[0.078,0.07],[0.082,0.16],[0.068,0.28],[0.045,0.38],[0.018,0.44],[0.001,0.46]].map(([r,y])=>new THREE.Vector2(r,y)),24);
      tail.rotateX(-2.62);tail.translate(tie.x,tie.y,tie.z);parts.push(tail);const band=new THREE.TorusGeometry(0.045,0.016,10,24);band.rotateX(-2.62+Math.PI/2);band.translate(tie.x,tie.y-0.015,tie.z-0.01);parts.push(band)}
    if(style==='bun'){const b=new THREE.SphereGeometry(0.105,28,20);b.scale(1,0.85,1);b.translate(0,Y+0.27,-0.1);parts.push(b);const tw=new THREE.TorusGeometry(0.09,0.03,12,32);tw.rotateX(Math.PI/2+0.3);tw.translate(0,Y+0.235,-0.11);parts.push(tw)}
    if(style==='braids')for(const s of[-1,1]){const root=new THREE.Vector3(s*0.19,Y-0.03,-0.12);
      for(let i=0;i<11;i++){const e=new THREE.SphereGeometry(0.044-i*0.0018,14,10);e.scale(1,1.4,0.85);e.rotateZ(i%2?0.45:-0.45);e.translate(root.x+s*0.008*i,root.y-0.045*i,root.z-0.018*i);parts.push(e)}
      const tip=new THREE.SphereGeometry(0.03,12,8);tip.scale(1,1.6,1);tip.translate(root.x+s*0.09,root.y-0.52,root.z-0.2);parts.push(tip)}
    const geo=typeof mergeGeometries==='function'&&parts.length>1?mergeGeometries(parts,false):null;return geo||parts[0]})}
const FACE_KEYS=['eyes','brows','nose','mouth','freckles','blush','glasses','facial','hairStyle','hat','top','bottoms'];
function setOutfit(a,cas){const U=a.userData,M=U.mats;U.casual=!!cas;for(const m of U.suitParts)m.visible=!cas;for(const m of U.casParts)m.visible=!!cas;
  for(const m of U.upper)m.material=cas?M.shirt:M.suit;for(const m of U.lower)m.material=cas?M.pants:M.suit;
  if(cas&&U.shorts)for(const m of U.shins)m.material=M.skin;for(const m of U.bootM)m.material=cas?M.shoes:M.boots;
  U.hairG.visible=!!cas;U.topG.visible=!!cas;U.antenna.visible=!cas&&U.wantAnt;
  // out of the suit: a slimmer, body-shaped figure with arms and legs closer in
  for(const m of U.scaled){const bs=m.userData.bs||(m.userData.bs=m.scale.clone());m.scale.copy(bs);if(cas)m.scale.multiply(m.userData.cs)}
  const ax=cas?0.355:0.43,lx=cas?0.125:0.16;U.armL.position.x=ax;U.armR.position.x=-ax;U.legL.position.x=lx;U.legR.position.x=-lx;for(const sh of U.shoulders)sh.position.x=Math.sign(sh.position.x)*ax;
  const bw=U.bw||1;U.pelvis.scale.set(cas?0.8:1,(cas?0.86:1)*bw,0.88*(cas?0.82:1));U.ctorso.scale.set(1.25*bw,1,0.72*(0.92+0.08*bw))}
// apply a look (colours, face, body shape and outfit) to any astronaut model
function dressModel(a,l){const U=a.userData,M=U.mats;
  M.suit.color.set(l.suit);M.accent.color.set(l.accent);M.visor.color.set(l.visor);M.visor.emissive.set(l.visor);M.pack.color.set(l.pack);M.boots.color.set(l.boots);
  M.skin.color.set(l.skin);M.hair.color.set(l.hair);M.hat.color.set(l.hatCol);M.shirt.color.set(l.shirt);M.shirt2.color.set(l.shirt2);M.pants.color.set(l.pants);M.shoes.color.set(l.shoes);M.eye.color.set(l.eyeCol);
  const sig=FACE_KEYS.map(k=>l[k]).join('|');if(U.faceSig!==sig){buildFace(a,l);U.faceSig=sig}
  const bw={slim:0.9,regular:1,broad:1.12}[l.build]||1;U.bw=bw;U.torso.scale.set(1.2*bw,1,0.86*(0.95+bw*0.05));
  a.scale.setScalar({short:0.94,avg:1,tall:1.06}[l.height]||1);
  U.shorts=l.bottoms==='shorts';U.wantAnt=!!l.antenna;setOutfit(a,U.casual)}
function mkRover(){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const paint=new THREE.MeshStandardMaterial({color:WHITE,roughness:0.55});
  const a=m=>{body.add(m);return m};
  a(mesh(rbox(2.3,0.5,3.9,0.2),paint,0,1.05,0));a(bx(2.34,0.12,3.94,ORANGE,0,0.93,0));
  a(mesh(rbox(2.1,1.05,1.7,0.3),paint,0,1.78,0.9));a(mesh(rbox(1.84,0.52,0.1,0.05),GLASS,0,1.9,1.72));
  a(mesh(rbox(0.08,0.45,1.2,0.04),GLASS,1.04,1.9,0.9));a(mesh(rbox(0.08,0.45,1.2,0.04),GLASS,-1.04,1.9,0.9));
  a(bx(2.0,0.08,1.8,mat('#25397a',{roughness:0.35,metalness:0.5}),0,1.33,-0.95));
  a(cy(0.05,0.05,1.1,6,OFF,-0.75,1.85,-1.55));a(bx(0.5,0.22,0.26,WHITE,-0.75,2.45,-1.55));
  a(sp(0.05,DARK,-0.86,2.45,-1.42,8,6));a(sp(0.05,DARK,-0.64,2.45,-1.42,8,6));
  a(cy(0.04,0.04,0.5,5,OFF,0.75,1.6,-1.6));a(cy(0.35,0.05,0.12,10,WHITE,0.75,1.88,-1.6));
  const hl=nightMat('#fff6e0','#fff1cc',2.5,0.3);a(mesh(rbox(0.34,0.14,0.06),hl,0.72,1.12,1.96));a(mesh(rbox(0.34,0.14,0.06),hl,-0.72,1.12,1.96));
  a(bx(0.12,0.12,2.9,GREY,1.2,0.82,0));a(bx(0.12,0.12,2.9,GREY,-1.2,0.82,0));
  const wheels=[],tire=shared('tire2',()=>new THREE.CylinderGeometry(0.52,0.52,0.46,22));
  for(const z of[1.35,0,-1.35])for(const x of[1.38,-1.38]){
    const piv=new THREE.Group();piv.position.set(x,0.5,z);body.add(piv);
    const spin=new THREE.Group();piv.add(spin);
    const t=mesh(tire,'#3a3532');t.rotation.z=Math.PI/2;spin.add(t);
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2,tr=bx(0.48,0.07,0.1,DARK,0,Math.cos(a)*0.53,Math.sin(a)*0.53);tr.rotation.x=a;spin.add(tr)}   // chunky treads
    const hub=cy(0.26,0.26,0.5,10,'#b9b2aa',0,0,0);hub.rotation.z=Math.PI/2;spin.add(hub);
    spin.add(rot(bx(0.36,0.08,0.3,DARK,0,0,0),'x',0));
    wheels.push({piv,spin,front:z>1});
  }
  const lamp=new THREE.SpotLight(0xfff1dd,0,70,0.6,0.5,1.0);lamp.position.set(0,1.3,2.1);lamp.target.position.set(0,0,14);body.add(lamp,lamp.target);
  g.userData={body,wheels,lamp,paint};return g;
}
function mkLander(){
  const g=new THREE.Group();
  g.add(cy(1.25,2.0,2.4,10,WHITE,0,2.6,0));g.add(cy(2.15,2.15,0.35,10,DARK,0,1.3,0));g.add(cy(0.6,1.25,0.8,10,OFF,0,4.2,0));
  g.add(cy(1.66,1.7,0.26,10,ORANGE,0,2.3,0));g.add(bx(0.9,1.1,0.1,GLASS,0,2.8,1.62));
  for(let i=0;i<4;i++){const a=i/4*TAU+Math.PI/4;const leg=bx(0.15,1.9,0.15,OFF,Math.cos(a)*1.9,0.85,Math.sin(a)*1.9);leg.rotation.set(Math.sin(a)*0.35,0,-Math.cos(a)*0.35);g.add(leg);
    g.add(cy(0.38,0.38,0.08,8,GREY,Math.cos(a)*2.2,0.04,Math.sin(a)*2.2))}
  const fm=new THREE.MeshBasicMaterial({color:'#ffb066',transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false});
  const flame=new THREE.Mesh(new THREE.ConeGeometry(1.0,4.5,10,1,true),fm);flame.rotation.x=Math.PI;flame.position.y=-1.2;flame.visible=false;g.add(flame);
  // open crew hatch and stairs (the ones you walk down after landing)
  const steel=mat('#9aa3ad',{roughness:0.35,metalness:0.7}),hz=-1.62;
  const hole=new THREE.Mesh(new THREE.PlaneGeometry(0.8,1.6),mat('#15181d',{roughness:0.9}));hole.position.set(0,2.77,hz-0.02);hole.rotation.y=Math.PI;g.add(hole);
  for(const s of[-1,1])g.add(bx(0.08,1.7,0.12,OFF,s*0.45,2.8,hz-0.04));g.add(bx(0.98,0.1,0.14,ORANGE,0,3.66,hz-0.04));
  const door=bx(0.8,1.6,0.06,OFF,0.85,2.77,hz-0.08);g.add(door);
  g.add(bx(1.0,0.06,0.45,steel,0,1.97,hz-0.24));
  for(let i=0;i<10;i++)g.add(bx(0.86,0.05,0.3,steel,0,1.78-i*0.2,-(2.15+i*0.3)));
  for(const s of[-1,1]){const len=Math.hypot(2.0,3.0),rl=cy(0.025,0.025,len,6,OFF,s*0.46,1.4,-3.5);rl.rotation.x=Math.atan2(3.0,2.0);g.add(rl)}
  g.userData={flame};return g;
}

/* ---------- buildings ---------- */
function mkHabitat(){
  const g=new THREE.Group();
  g.add(cy(5.2,5.4,1.2,14,OFF,0,0.6,0));
  const dome=mesh(new THREE.SphereGeometry(5,14,7,0,TAU,0,Math.PI/2),WHITE,0,1.2,0);dome.scale.y=0.78;g.add(dome);
  g.add(cy(5.25,5.25,0.28,14,ORANGE,0,1.25,0));
  g.add(bx(2.3,2.5,2.6,WHITE,0,1.25,5.6));g.add(bx(1.2,1.8,0.1,ORANGE,0,1.1,6.92));g.add(bx(2.4,0.2,2.7,ORANGE,0,2.55,5.6));
  const wm=nightMat('#2a3050','#ffcf8a',1.8,0.05);
  for(let k=0;k<6;k++){const a=k/6*TAU+0.52;const w=bx(1.0,0.45,0.15,wm,Math.sin(a)*5.3,0.75,Math.cos(a)*5.3);w.rotation.y=a;g.add(w)}
  for(let k=0;k<4;k++){const a=k/4*TAU+0.3;const w=bx(0.9,0.5,0.12,wm,Math.sin(a)*3.6,3.4,Math.cos(a)*3.6);w.rotation.set(-0.6,a,0,'YXZ');g.add(w)}
  g.add(cy(0.08,0.08,2.2,6,OFF,0,5.0,0));
  const bl=sp(0.14,glow('#ff3b30',2),0,6.15,0,6,4);g.add(bl);
  for(let k=0;k<7;k++){const a=k/7*TAU+2.2;g.add(rot(bx(1.1,0.5,0.7,'#a5623f',Math.sin(a)*6.1,0.25,Math.cos(a)*6.1),'y',a))}
  g.userData={blink:[bl],airlock:[0,6.9]};return g;
}
function mkSolar(){
  const g=new THREE.Group();g.add(cy(0.12,0.16,1.5,6,OFF,0,0.75,0));g.add(cy(0.5,0.6,0.2,6,GREY,0,0.1,0));
  const piv=new THREE.Group();piv.position.y=1.55;g.add(piv);
  const pm=new THREE.MeshStandardMaterial({color:'#24387a',roughness:0.32,metalness:0.55,flatShading:true});
  piv.add(mesh(new THREE.BoxGeometry(4.2,0.08,2.4),pm));
  piv.add(bx(4.3,0.1,0.12,OFF,0,-0.01,1.22));piv.add(bx(4.3,0.1,0.12,OFF,0,-0.01,-1.22));
  for(let i=-1;i<=1;i++)piv.add(bx(0.04,0.1,2.4,'#aeb9d6',i*1.4,0.005,0));
  g.userData={pivot:piv,pmat:pm};return g;
}
function mkBattery(){const g=new THREE.Group();g.add(bx(2.4,1.3,1.6,OFF,0,0.65,0));g.add(bx(2.42,0.16,1.62,ORANGE,0,1.0,0));
  for(let i=0;i<3;i++)g.add(bx(0.18,0.18,0.05,glow('#5fe37f',1.4),-0.5+i*0.5,0.55,0.82));
  g.add(cy(0.08,0.08,0.3,6,GREY,0.8,1.45,0));g.add(cy(0.08,0.08,0.3,6,GREY,-0.8,1.45,0));return g}
function mkMoxie(){const g=new THREE.Group();g.add(bx(2.6,1.5,2.0,WHITE,0,0.75,0));g.add(bx(2.62,0.14,2.02,'#5fb7e3',0,1.2,0));
  g.add(cy(0.45,0.45,2.0,10,'#c9ccd1',1.0,1.0,-1.5));g.add(cy(0.45,0.45,2.0,10,'#c9ccd1',-1.0,1.0,-1.5));
  g.add(sp(0.45,'#c9ccd1',1.0,2.0,-1.5,10,6));g.add(sp(0.45,'#c9ccd1',-1.0,2.0,-1.5,10,6));
  g.add(cy(0.3,0.3,0.6,8,DARK,0,1.8,0.3));const bl=sp(0.1,glow('#5fe3c9',2.2),0.9,1.6,0.9,6,4);g.add(bl);
  g.userData={blink:[bl]};return g}
function mkDrill(){const g=new THREE.Group();
  for(let i=0;i<3;i++){const a=i/3*TAU;const l=cy(0.1,0.12,5,5,OFF,Math.cos(a)*0.9,2.3,Math.sin(a)*0.9);l.rotation.set(Math.sin(a)*0.2,0,-Math.cos(a)*0.2);g.add(l)}
  g.add(bx(0.8,0.8,0.8,ORANGE,0,4.6,0));
  const spin=new THREE.Group();g.add(spin);spin.add(cy(0.12,0.12,4.2,6,GREY,0,2.4,0));spin.add(cy(0.3,0.05,0.6,6,DARK,0,0.4,0));
  for(let i=0;i<4;i++)spin.add(rot(bx(0.06,0.3,0.4,DARK,0,1.2+i*0.8,0),'y',i*0.8));
  g.add(cy(0.8,0.8,1.6,10,WHITE,2.0,0.8,0));g.add(cy(0.82,0.82,0.3,10,'#4f9dff',2.0,1.0,0));
  g.add(bx(1.4,0.5,0.9,OFF,-1.6,0.25,0));
  g.userData={spin:[{o:spin,s:4}]};return g}
function mkGreenhouse(){const g=new THREE.Group();
  g.add(bx(8.2,0.45,4.8,OFF,0,0.22,0));
  const gm=new THREE.MeshStandardMaterial({color:'#cfe9de',transparent:true,opacity:0.32,roughness:0.08,metalness:0.1,side:THREE.DoubleSide,depthWrite:false});
  const t=new THREE.Mesh(new THREE.CylinderGeometry(2.3,2.3,8,12,1,true,0,Math.PI),gm);t.rotation.z=Math.PI/2;t.position.y=0.45;g.add(t);
  for(let i=0;i<5;i++){const r=bx(0.12,0.12,4.6,OFF,-4+i*2,0.45,0);g.add(r)}
  const ribGeo=new THREE.TorusGeometry(2.32,0.07,4,12,Math.PI);
  for(let i=0;i<5;i++){const r=mesh(ribGeo,OFF,-4+i*2,0.45,0);r.rotation.y=Math.PI/2;g.add(r)}
  g.add(rot(mesh(new THREE.CircleGeometry(2.3,12,0,Math.PI),gm,4,0.45,0),'y',Math.PI/2));
  g.add(rot(mesh(new THREE.CircleGeometry(2.3,12,0,Math.PI),gm,-4,0.45,0),'y',-Math.PI/2));
  for(const z of[-1.3,0,1.3]){g.add(bx(7,0.4,0.7,'#6b4a3a',0,0.65,z));for(let i=0;i<9;i++)g.add(sp(0.32,'#58b85a',-3.3+i*0.82,1.0,z,6,4))}
  const led=nightMat('#ff9be8','#ff4fd8',2.2,0.5);g.add(bx(7.6,0.06,0.12,led,0,2.55,0.6));g.add(bx(7.6,0.06,0.12,led,0,2.55,-0.6));
  return g}
function mkLab(){const g=new THREE.Group();g.add(bx(5.2,2.6,4,WHITE,0,1.3,0));g.add(bx(5.22,0.3,4.02,'#c69bff',0,2.3,0));
  const wm=nightMat('#2a3050','#bfe6ff',1.6,0.05);g.add(bx(3.4,0.7,0.1,wm,0,1.4,2.02));g.add(bx(0.1,0.7,2,wm,2.62,1.4,0));
  g.add(cy(0.08,0.08,1.2,6,OFF,1.4,3.2,-1));const dish=mesh(new THREE.SphereGeometry(0.9,10,5,0,TAU,0,1.0),mat(WHITE,{side:THREE.DoubleSide}),1.4,3.6,-1);dish.rotation.x=Math.PI*0.75;g.add(dish);
  g.add(bx(1.4,0.9,1.0,OFF,-1.6,3.05,0));g.add(bx(1.1,1.8,0.1,ORANGE,-1.5,0.9,2.02));return g}
function mkRegolith(){const g=new THREE.Group();
  const h=mesh(new THREE.ConeGeometry(1.6,2,8,1,true),mat(OFF,{side:THREE.DoubleSide}),0,2.8,0);h.rotation.x=Math.PI;g.add(h);
  for(let i=0;i<4;i++){const a=i/4*TAU+0.78;g.add(cy(0.09,0.09,2.4,5,GREY,Math.cos(a)*1.1,1.2,Math.sin(a)*1.1))}
  g.add(bx(1.2,1.2,1.2,ORANGE,0,1.2,0));const c=bx(0.7,0.2,3.2,DARK,0,0.9,-2.1);c.rotation.x=-0.35;g.add(c);
  g.add(bx(1.6,0.6,1.2,'#b9805a',0,0.3,-3.6));return g}
function mkComms(){const g=new THREE.Group();g.add(cy(0.14,0.28,7,6,OFF,0,3.5,0));
  for(let i=1;i<6;i++)g.add(bx(0.7-i*0.07,0.05,0.05,GREY,0,i*1.2,0));
  const dm=mat(WHITE,{side:THREE.DoubleSide});const d=mesh(new THREE.SphereGeometry(1.8,12,6,0,TAU,0,0.85),dm,0,6.6,0.6);d.rotation.x=-0.9;g.add(d);
  g.add(rot(cy(0.04,0.04,1.4,4,GREY,0,6.9,1.1),'x',0.6));
  const bl=sp(0.13,glow('#ff3b30',2.2),0,7.1,0,6,4);g.add(bl);g.add(bx(1.2,0.8,0.9,OFF,0.9,0.4,0));
  g.userData={blink:[bl]};return g}
function mkCharger(){const g=new THREE.Group();g.add(cy(2.1,2.2,0.16,14,'#5f5853',0,0.08,0));
  g.add(rot(mesh(new THREE.RingGeometry(1.6,1.8,20),mat('#ffcf4a',{side:THREE.DoubleSide}),0,0.17,0),'x',-Math.PI/2));
  g.add(bx(0.4,1.4,0.4,OFF,0,0.7,-2.4));const bl=bx(0.25,0.25,0.05,glow('#5fe37f',2),0,1.2,-2.18);g.add(bl);g.userData={blink:[bl]};return g}
function mkWeather(){const g=new THREE.Group();g.add(cy(0.05,0.07,3.2,5,OFF,0,1.6,0));g.add(bx(0.5,0.4,0.4,WHITE,0,0.8,0));
  g.add(bx(1.4,0.05,0.05,GREY,0,2.6,0));const spin=new THREE.Group();spin.position.set(0,3.3,0);g.add(spin);
  for(let i=0;i<3;i++){const a=i/3*TAU;spin.add(rot(bx(0.5,0.03,0.03,GREY,Math.cos(a)*0.25,0,Math.sin(a)*0.25),'y',-a));spin.add(sp(0.1,ORANGE,Math.cos(a)*0.5,0,Math.sin(a)*0.5,6,4))}
  g.add(rot(bx(0.7,0.04,0.5,mat('#25397a',{metalness:0.5}),0,1.1,0.3),'x',-0.5));
  g.userData={spin:[{o:spin,s:5}]};return g}
function mkReactor(){const g=new THREE.Group();g.add(cy(1.4,1.6,0.6,10,GREY,0,0.3,0));g.add(cy(0.7,0.7,2.2,10,'#ffcf4a',0,1.6,0));
  g.add(cy(0.72,0.72,0.2,10,DARK,0,1.6,0));
  const rm=mat('#bdb6ad',{side:THREE.DoubleSide,metalness:0.4});const c=mesh(new THREE.ConeGeometry(2.4,4,10,1,true),rm,0,4.7,0);g.add(c);
  for(let i=0;i<10;i++){const a=i/10*TAU;const f=bx(0.05,3.6,1.1,'#9f988f',Math.cos(a)*1.4,4.6,Math.sin(a)*1.4);f.rotation.y=-a;f.rotation.z=Math.cos(a)*0.0;g.add(f)}
  const bl=sp(0.12,glow('#6fb6ff',2.5),0,7.0,0,6,4);g.add(bl);g.userData={blink:[bl]};return g}
function mkPad(){const g=new THREE.Group();g.add(cy(9,9.3,0.3,24,'#6d6560',0,0.15,0));
  g.add(rot(mesh(new THREE.RingGeometry(6.6,7.2,32),mat('#ffcf4a',{side:THREE.DoubleSide}),0,0.31,0),'x',-Math.PI/2));
  g.add(bx(0.6,0.02,4,'#ffcf4a',-1.2,0.32,0));g.add(bx(0.6,0.02,4,'#ffcf4a',1.2,0.32,0));g.add(bx(1.8,0.02,0.6,'#ffcf4a',0,0.32,0));
  const bls=[];for(let i=0;i<8;i++){const a=i/8*TAU;const b=sp(0.15,glow('#5fe3c9',2),Math.cos(a)*8.6,0.4,Math.sin(a)*8.6,6,4);g.add(b);bls.push(b)}
  g.userData={blink:bls};return g}
function mkBeacon(){const g=new THREE.Group();g.add(cy(0.3,0.4,0.2,6,GREY,0,0.1,0));g.add(cy(0.05,0.07,2.2,5,OFF,0,1.2,0));
  const b=sp(0.22,glow('#ff8a3d',2.5),0,2.4,0,8,6);g.add(b);g.userData={blink:[b]};return g}
function mkFabricator(){const g=new THREE.Group();g.add(bx(4.4,2.2,3.6,WHITE,0,1.1,0));g.add(bx(4.42,0.25,3.62,'#ffcf4a',0,1.9,0));
  const win=nightMat('#2a3050','#9ff0de',1.6,0.1);g.add(bx(2.6,0.8,0.1,win,0,1.3,1.82));
  g.add(cy(0.5,0.6,1.6,10,OFF,1.5,2.9,-0.8));g.add(cy(0.62,0.62,0.18,10,ORANGE,1.5,3.7,-0.8));
  const arm=new THREE.Group();arm.position.set(-1.2,2.25,0.4);g.add(arm);arm.add(cy(0.12,0.12,1.2,8,GREY,0,0.6,0));arm.add(rot(bx(1.4,0.15,0.15,ORANGE,0.6,1.2,0),'z',0.4));
  const bl=sp(0.1,glow('#6fe0c8',2.2),1.9,2.1,1.6,6,4);g.add(bl);g.userData={blink:[bl],spin:[{o:arm,s:0.8}]};return g}
function mkSeismo(){const g=new THREE.Group();g.add(cy(0.9,1.1,0.25,12,GREY,0,0.12,0));const dome=mesh(new THREE.SphereGeometry(0.7,16,10,0,TAU,0,Math.PI/2),WHITE,0,0.25,0);g.add(dome);
  g.add(cy(0.85,0.85,0.08,16,ORANGE,0,0.3,0));g.add(bx(0.4,0.3,0.3,OFF,1.1,0.15,0));const bl=sp(0.07,glow('#5fe37f',2),1.1,0.4,0,6,4);g.add(bl);g.userData={blink:[bl]};return g}
const MAKERS={fabricator:mkFabricator,seismo:mkSeismo,habitat:mkHabitat,solar:mkSolar,battery:mkBattery,moxie:mkMoxie,drill:mkDrill,greenhouse:mkGreenhouse,lab:mkLab,regolith:mkRegolith,
  comms:mkComms,charger:mkCharger,weather:mkWeather,reactor:mkReactor,pad:mkPad,beacon:mkBeacon,bed:mkBed};
function mkBed(){const g=new THREE.Group();for(const x of[-0.9,0.9])for(const z of[-0.35,0.35])g.add(cy(0.03,0.03,0.42,6,GREY,x,0.21,z));
  g.add(bx(2.0,0.08,0.82,mat('#9aa3ad',{metalness:0.5}),0,0.44,0));g.add(bx(1.9,0.12,0.74,mat('#e9e3d8'),0,0.53,0));g.add(bx(1.2,0.06,0.76,mat('#c9a227',{metalness:0.6,roughness:0.3}),0.3,0.61,0));g.add(bx(0.4,0.12,0.6,mat('#ffffff'),-0.7,0.63,0));return g}

/* ---------- points of interest ---------- */
function mkPOIModel(type,seed){
  const g=new THREE.Group(),r=mulberry(seed);let top=2;
  const rock=(s,c,x,y,z)=>{const m=mesh(rockGeo,mat(c,{flatShading:true}),x,y,z);m.scale.set(s*(0.8+r()*0.5),s*(0.6+r()*0.5),s*(0.8+r()*0.5));m.rotation.set(r()*6,r()*6,r()*6);g.add(m);return m};
  if(type==='sediment'||type==='organics'){
    const cols=type==='sediment'?['#d6a072','#a4603c','#e3b98e','#8f4f30']:['#7d746a','#9a8f80','#6a625a','#a89c8c'];
    let y=0;for(let i=0;i<7;i++){const w=7-i*0.75,d=4.5-i*0.45,hh=0.45+r()*0.3;const b=bx(w,hh,d,cols[i%4],(r()-0.5)*0.6,y+hh/2,(r()-0.5)*0.6);b.rotation.y=r()*0.2;g.add(b);y+=hh}
    top=y;
    if(type==='organics')for(let i=0;i<3;i++){const h=cy(0.25,0.25,0.06,10,'#d9d2c8',-1.5+i*1.4,1.2,2.0);h.rotation.x=Math.PI/2;g.add(h)}
  }else if(type==='clay'){const m=sp(4,'#b9a48f',0,-1.6,0,10,6);m.scale.y=0.5;g.add(m);for(let i=0;i<5;i++)rock(0.6+r()*0.6,'#8f8a76',(r()-0.5)*6,0.4,(r()-0.5)*6);top=1}
  else if(type==='basalt'){for(let i=0;i<6;i++)rock(0.9+r()*1.6,'#3d2a26',(r()-0.5)*7,0.5,(r()-0.5)*7);top=2.5}
  else if(type==='ice'){const f=cy(5,5.5,0.1,12,'#f1ebe6',0,0.05,0);g.add(f);
    const im=mat('#dff4ff',{emissive:'#7fc6ff',emissiveIntensity:0.25,roughness:0.15,metalness:0.1});
    for(let i=0;i<6;i++){const m=mesh(new THREE.IcosahedronGeometry(0.6+r()*0.9,0),im,(r()-0.5)*6,0.1,(r()-0.5)*6);m.rotation.set(r()*3,r()*3,r()*3);g.add(m)}top=1.2}
  else if(type==='salt'){for(let i=0;i<7;i++){const c=cy(0.8+r()*1.8,1+r()*1.8,0.08,7,'#f3ece4',(r()-0.5)*8,0.06,(r()-0.5)*8);c.rotation.y=r()*3;g.add(c)}top=0.5}
  else if(type==='ejecta'){for(let i=0;i<9;i++){const b=bx(0.6+r()*1.6,0.5+r()*1.2,0.6+r()*1.6,['#7a4632','#5a3a30','#b0704a'][i%3],(r()-0.5)*10,0.3,(r()-0.5)*10);b.rotation.set(r(),r()*3,r());g.add(b)}top=1.6}
  else if(type==='sand'){for(let i=0;i<5;i++){const b=sp(2.2,'#4a3028',(i-2)*1.7,-0.5,(r()-0.5)*1.5,8,4);b.scale.set(0.4,0.45,1.6);g.add(b)}top=0.8}
  else if(type==='meteorite'){g.add(cy(3.2,3.6,0.12,16,'#5a3424',0,0.06,0));const m=mesh(shared('ico',()=>new THREE.IcosahedronGeometry(1,0)),mat('#4a4744',{metalness:0.75,roughness:0.32}),0,0.5,0);m.scale.set(1.3,0.9,1.1);m.rotation.set(r(),r()*3,r());g.add(m);top=1.2}
  else if(type==='lavatube'){
    top=0.5}
  const mm=new THREE.MeshBasicMaterial({color:POI[type].color,fog:false});
  const marker=new THREE.Mesh(new THREE.OctahedronGeometry(0.6,0),mm);marker.position.y=top+3.5;g.add(marker);
  const ring=new THREE.Mesh(new THREE.RingGeometry(7,7.4,40),new THREE.MeshBasicMaterial({color:POI[type].color,transparent:true,opacity:0.45,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=0.4;g.add(ring);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,60,5,1,true),new THREE.MeshBasicMaterial({color:POI[type].color,transparent:true,opacity:0.22,depthWrite:false,blending:THREE.AdditiveBlending}));
  beam.position.y=top+34;g.add(beam);
  g.userData={marker,ring,beam,top};return g;
}