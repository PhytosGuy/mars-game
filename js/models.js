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

const LOOK_DEFAULT={suit:'#efebe4',accent:'#ff7a2e',visor:'#2b2f5a',pack:'#c9c3bb',boots:'#8d8781',antenna:false,lamp:true,rover:'#efebe4'};
function mkAstronaut(){
  const g=new THREE.Group(),S_=(c,r=0.6)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
  const M={suit:S_(WHITE),accent:S_(ORANGE,0.5),pack:S_('#c9c3bb'),boots:S_(GREY,0.8),
    visor:new THREE.MeshStandardMaterial({color:'#2b2f5a',roughness:0.12,metalness:0.35,emissive:'#4a3a8a',emissiveIntensity:0.25})};
  const metal=mat('#6d6863',{roughness:0.4,metalness:0.5}),dark=mat('#2c2826',{roughness:0.6});
  const add=(m,p=g)=>{p.add(m);return m};
  // one continuous suit: a rounded torso that flows into the pelvis, with ball joints at the shoulders, hips and knees
  const torso=add(mesh(shared('torso',()=>new THREE.CapsuleGeometry(0.3,0.42,8,16)),M.suit,0,1.13,0));torso.scale.set(1.2,1,0.86);
  const pelvis=add(mesh(shared('pelvis',()=>new THREE.CapsuleGeometry(0.17,0.26,6,14)),M.suit,0,0.82,0));pelvis.rotation.z=Math.PI/2;pelvis.scale.set(1,1,0.88);
  add(cy(0.2,0.24,0.16,14,M.suit,0,1.48,0));                                                    // neck seal
  for(const s of[1,-1])add(sp(0.135,M.suit,s*0.43,1.38,0,14,10));                                // shoulder joints
  add(mesh(rbox(0.72,0.11,0.53,0.05),M.boots,0,0.95,0));
  add(mesh(rbox(0.12,0.09,0.06,0.03),metal,0,0.95,0.27));
  // chest control unit with status lights
  add(mesh(rbox(0.38,0.22,0.1,0.05),'#d9d3cb',0,1.24,0.25));
  [['#5fe37f',-0.1],['#ffcf4a',0],['#6fb6ff',0.1]].forEach(([c,x])=>add(sp(0.028,glow(c,1.8),x,1.27,0.31,8,6)));
  add(mesh(rbox(0.36,0.05,0.11,0.02),M.accent,0,1.15,0.25));
  // shoulder pads
  add(sp(0.16,M.accent,0.4,1.4,0,12,10)).scale.set(1,0.75,1);add(sp(0.16,M.accent,-0.4,1.4,0,12,10)).scale.set(1,0.75,1);
  // backpack with two oxygen tanks
  add(mesh(rbox(0.6,0.7,0.3,0.12),M.pack,0,1.18,-0.36));
  add(mesh(rbox(0.62,0.08,0.32,0.04),M.accent,0,1.4,-0.36));
  const tank=shared('tank',()=>new THREE.CapsuleGeometry(0.1,0.42,6,12));
  add(mesh(tank,'#f2efe9',0.17,1.12,-0.56));add(mesh(tank,'#f2efe9',-0.17,1.12,-0.56));
  add(mesh(rbox(0.3,0.08,0.06,0.03),dark,0,0.88,-0.52));
  // helmet: big round shell, wide visor with a coloured rim
  add(mesh(shared('neckring',()=>new THREE.TorusGeometry(0.27,0.065,10,22)),metal,0,1.5,0)).rotation.x=Math.PI/2;
  // the head pivots at the neck so it can turn to where you're looking (helmet lamp included)
  const head=new THREE.Group();head.position.set(0,1.55,0);g.add(head);const hadd=o=>{head.add(o);return o};
  const helm=hadd(sp(0.44,M.suit,0,0.27,0,22,18));helm.scale.set(1,0.95,1);
  const visor=hadd(mesh(shared('visor3',()=>new THREE.SphereGeometry(0.34,28,20)),M.visor,0,0.28,0.27));visor.scale.set(1.1,0.8,0.7);
  hadd(mesh(shared('vglint',()=>new THREE.SphereGeometry(0.05,8,6)),mat('#ffffff',{emissive:'#ffffff',emissiveIntensity:0.8}),-0.15,0.37,0.5)).scale.set(1.4,0.7,0.4);
  hadd(sp(0.07,glow('#fff6e0',1.2),0.3,0.49,0.18,8,6));                 // helmet lamp
  const lamp=new THREE.SpotLight(0xfff6e0,0,45,0.55,0.55,1.2);lamp.position.set(0.3,0.49,0.25);lamp.target.position.set(0,-0.75,9);head.add(lamp,lamp.target);
  hadd(mesh(rbox(0.1,0.16,0.12,0.04),metal,0.42,0.29,0));hadd(mesh(rbox(0.1,0.16,0.12,0.04),metal,-0.42,0.29,0)); // ear pods
  const ant=new THREE.Group();ant.add(cy(0.015,0.015,0.5,5,GREY,0,0.25,0));ant.add(sp(0.05,M.accent,0,0.52,0,8,6));ant.position.set(0.26,0.5,-0.12);head.add(ant);ant.visible=false;
  // limbs
  const limb=(x,y,r,len,mat_)=>{const p=new THREE.Group();p.position.set(x,y,0);g.add(p);
    p.add(mesh(shared('cap'+r+len,()=>new THREE.CapsuleGeometry(r,len,6,12)),mat_,0,-len/2-r*0.4,0));return p};
  const armL=limb(0.43,1.38,0.11,0.34,M.suit),armR=limb(-0.43,1.38,0.11,0.34,M.suit);
  for(const a of[armL,armR]){a.add(sp(0.13,M.accent,0,-0.6,0,12,10));a.add(mesh(rbox(0.25,0.08,0.25,0.04),M.accent,0,-0.3,0));a.add(sp(0.115,M.suit,0,0,0,12,10))}
  // legs: hip joint → thigh → knee joint → shin and boot, so the walk cycle can bend the knees
  const leg=x=>{const hip=new THREE.Group();hip.position.set(x,0.78,0);g.add(hip);
    hip.add(sp(0.15,M.suit,0,0,0,14,10));                                                         // hip joint
    hip.add(mesh(shared('thigh',()=>new THREE.CapsuleGeometry(0.135,0.2,6,12)),M.suit,0,-0.17,0));
    const knee=new THREE.Group();knee.position.set(0,-0.36,0);hip.add(knee);
    knee.add(sp(0.132,M.suit,0,0,0,14,10));                                                       // knee joint (no gap when it bends)
    knee.add(sp(0.1,M.accent,0,0.02,0.1,10,8));
    knee.add(mesh(shared('shin',()=>new THREE.CapsuleGeometry(0.125,0.16,6,12)),M.suit,0,-0.13,0));
    knee.add(mesh(rbox(0.3,0.18,0.42,0.08),M.boots,0,-0.3,0.05));knee.add(mesh(rbox(0.31,0.06,0.43,0.03),dark,0,-0.39,0.05));
    hip.userData.knee=knee;return hip};
  const legL=leg(0.16),legR=leg(-0.16);
  // hand-held tool holder (points along the arm); mining.js fills it with the selected hotbar item
  const tool=new THREE.Group();tool.position.set(0,-0.62,0.08);armR.add(tool);
  const tipMat=new THREE.MeshStandardMaterial({color:'#6fe0c8',emissive:'#6fe0c8',emissiveIntensity:0.4});
  const tip=new THREE.Object3D();tip.position.set(0,-0.5,0);tool.add(tip);
  g.userData={head,armL,armR,legL,legR,lamp,mats:M,antenna:ant,tip,tipMat,tool,held:null};return g;
}
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
  const wheels=[],tire=shared('tire',()=>new THREE.TorusGeometry(0.36,0.15,10,18));
  for(const z of[1.35,0,-1.35])for(const x of[1.38,-1.38]){
    const piv=new THREE.Group();piv.position.set(x,0.5,z);body.add(piv);
    const spin=new THREE.Group();piv.add(spin);
    const t=mesh(tire,'#3a3532');t.rotation.y=Math.PI/2;spin.add(t);
    const hub=cy(0.24,0.24,0.34,10,'#b9b2aa',0,0,0);hub.rotation.z=Math.PI/2;spin.add(hub);
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
  comms:mkComms,charger:mkCharger,weather:mkWeather,reactor:mkReactor,pad:mkPad,beacon:mkBeacon};

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