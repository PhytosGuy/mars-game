'use strict';
/* =========================================================
   INSIDE THE HABITAT: a walkable room with a bunk, a desk and your journal
   The room is built once and sits high above the base (closed off from the
   outside), so the normal walker, camera and co-op all keep working.
   ========================================================= */
// a round room: a 2.4 m wall ring under a shallow dome. r: radius, wall: wall height, s: how tall the dome is (fraction of r)
const ROOM={r:7.5,wall:2.4,s:0.55,lift:320};ROOM.h=ROOM.wall+ROOM.r*ROOM.s;
const INT={g:null,x:0,y:0,z:0,props:[],desk:null,bed:null,door:null,holo:null,spin:[]};
function interiorBase(){const hb=home();return{x:hb.x,y:(hb.y||groundHeight(hb.x,hb.z))+ROOM.lift,z:hb.z}}
// height of the ceiling at distance d from the centre
const domeTop=d=>d>=ROOM.r?ROOM.wall:ROOM.wall+ROOM.s*Math.sqrt(ROOM.r*ROOM.r-d*d);
function windowTex(){
  const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
  const gr=x.createLinearGradient(0,0,0,128);gr.addColorStop(0,'#06081a');gr.addColorStop(0.55,'#1c1630');gr.addColorStop(0.8,'#6a3524');gr.addColorStop(1,'#c47a4a');x.fillStyle=gr;x.fillRect(0,0,256,128);
  const r=mulberry(77);for(let i=0;i<90;i++){x.fillStyle=`rgba(255,255,255,${0.3+r()*0.7})`;x.fillRect(r()*256,r()*80,r()<0.1?2:1,r()<0.1?2:1)}
  x.fillStyle='#4a2418';x.beginPath();x.moveTo(0,128);for(let i=0;i<=256;i+=16)x.lineTo(i,108-Math.abs(Math.sin(i*0.05))*14-r()*5);x.lineTo(256,128);x.fill();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function buildInterior(){
  if(INT.g){scene.remove(INT.g)}
  ROOM.r=[7.5,9.5,11.5][clamp((S&&S.habLv)||1,1,3)-1];ROOM.h=ROOM.wall+ROOM.r*ROOM.s;          // the dome grows as you expand your home
  const b=interiorBase(),g=new THREE.Group();g.position.set(b.x,b.y,b.z);Object.assign(INT,{x:b.x,y:b.y,z:b.z,props:[],spin:[]});
  const R=ROOM.r,W=ROOM.wall,S_=ROOM.s,TAU_=Math.PI*2,DOOR=Math.PI/2;                 // the door faces +z
  const HC=habCols(),panel=mat('#e3e7ec',{roughness:0.5,metalness:0.15,flatShading:true,side:THREE.BackSide}),
    floorM=new THREE.MeshStandardMaterial({color:HC.floor,roughness:0.3,metalness:0.55}),white=mat('#f2f4f6',{roughness:0.3,metalness:0.1}),steel=mat('#9aa3ad',{roughness:0.35,metalness:0.7}),
    dark=mat('#23272e',{roughness:0.4,metalness:0.5}),cyan=new THREE.MeshStandardMaterial({color:HC.stripe,emissive:HC.stripe,emissiveIntensity:1.8,roughness:0.4}),amber=new THREE.MeshStandardMaterial({color:HC.trim,emissive:HC.trim,emissiveIntensity:1.6,roughness:0.4}),soft=mat('#3d5a80',{roughness:0.9});
  // shell: wall ring and a faceted dome, seen from inside
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(R,R,W,36,2,true),panel);wall.position.y=W/2;g.add(wall);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(R,36,9,0,TAU_,0,Math.PI/2),panel);dome.scale.y=S_;dome.position.y=W;g.add(dome);
  // panoramic windows in the dome, looking out over a Mars dusk
  const wt=windowTex(),glass=new THREE.MeshBasicMaterial({map:wt,side:THREE.BackSide});
  for(let k=1;k<6;k++){const phi=DOOR+k*Math.PI/3,half=0.38,w=new THREE.Mesh(new THREE.SphereGeometry(R-0.2,10,5,Math.PI-phi-half,half*2,Math.PI/2-0.62,0.5),glass);w.scale.y=S_;w.position.y=W;g.add(w)}
  // glowing ribs from the floor, up the wall and over the dome to the top ring
  for(let k=0;k<6;k++){const phi=DOOR+Math.PI/6+k*Math.PI/3,cx=Math.cos(phi),cz=Math.sin(phi),rr=R-0.06,pts=[new THREE.Vector3(cx*rr,0,cz*rr),new THREE.Vector3(cx*rr,W,cz*rr)];
    for(let i=1;i<=10;i++){const th=i/10*(Math.PI/2-0.17),d=rr*Math.cos(th);pts.push(new THREE.Vector3(cx*d,W+rr*S_*Math.sin(th),cz*d))}
    const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,0.06,6,false),k%2?cyan:steel);g.add(tube)}
  const ring=(rad,y,tube,m)=>{const t=new THREE.Mesh(new THREE.TorusGeometry(rad,tube,6,64),m);t.rotation.x=Math.PI/2;t.position.y=y;g.add(t);return t};
  ring(R-0.06,W,0.07,cyan);ring(R-0.05,0.12,0.09,steel);ring(R-0.08,1.05,0.04,amber);
  const topY=W+R*S_;ring(1.25,topY-0.12,0.1,steel);const oc=new THREE.Mesh(new THREE.CircleGeometry(1.2,40),glow('#cfe9ff',0.9));oc.rotation.x=Math.PI/2;oc.position.y=topY-0.1;g.add(oc);
  ring(2.4,topY-0.45,0.05,cyan);
  // floor: dark metal with light rings
  const fl=new THREE.Mesh(new THREE.CircleGeometry(R,48),floorM);fl.rotation.x=-Math.PI/2;fl.position.y=0.01;g.add(fl);
  for(const[r0,r1,m]of[[2.1,2.16,cyan],[5.2,5.26,cyan],[R-0.5,R-0.42,amber]]){const rg=new THREE.Mesh(new THREE.RingGeometry(r0,r1,64),m);rg.rotation.x=-Math.PI/2;rg.position.y=0.025;g.add(rg)}
  // lights
  const L1=new THREE.PointLight(0xdff3ff,10,26,1.5);L1.position.set(0,topY-0.8,0);const L2=new THREE.PointLight(0xffd2a0,7,14,1.6);L2.position.set(-3.6,2.2,-3.2);const L3=new THREE.PointLight(0x7fe8ff,5,10,1.6);L3.position.set(3.8,2.2,-3.4);INT.lights=[[L1,10],[L2,7],[L3,5]];g.add(L1,L2,L3);
  INT.mats={floor:floorM,stripe:cyan,trim:amber};INT.bedCount=0;INT.extraBeds=null;INT.beds=[];
  const prop=(m,x,z,w,d)=>{g.add(m);INT.props.push({x,z,w:w/2,d:d/2});return m};
  // centre: holo table with a slowly turning Mars
  const holo=new THREE.Group();holo.position.set(0,0,0.4);holo.add(cy(0.5,0.7,0.8,24,white,0,0.4,0));holo.add(cy(0.95,0.95,0.08,32,dark,0,0.84,0));
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.95,0.03,6,48),cyan);rim.rotation.x=Math.PI/2;rim.position.y=0.88;holo.add(rim);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.85,1.1,32,1,true),new THREE.MeshBasicMaterial({color:'#5fe8ff',transparent:true,opacity:0.08,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=1.45;holo.add(beam);
  const planet=new THREE.Group();planet.position.y=1.65;planet.add(new THREE.Mesh(new THREE.SphereGeometry(0.42,24,16),new THREE.MeshBasicMaterial({color:'#e07a45',transparent:true,opacity:0.55,depthWrite:false})));
  planet.add(new THREE.Mesh(new THREE.SphereGeometry(0.44,16,10),new THREE.MeshBasicMaterial({color:'#7fe8ff',wireframe:true,transparent:true,opacity:0.35})));
  const moon=sp(0.06,glow('#d6c9b8',0.8),0.75,0.1,0,8,6);planet.add(moon);holo.add(planet);INT.holo=planet;prop(holo,0,0.4,1.9,1.9);
  // sleep pod (back-left)
  const bed=new THREE.Group();bed.position.set(-4.3,0,-4.1);bed.add(bx(2.5,0.42,1.35,white,0,0.3,0));bed.add(bx(2.6,0.06,1.45,cyan,0,0.08,0));
  bed.add(bx(2.3,0.2,1.2,mat('#dfe6ee'),0,0.6,0));bed.add(bx(1.4,0.1,1.22,soft,0.4,0.72,0));bed.add(bx(0.5,0.15,0.8,mat('#ffffff'),-0.85,0.74,0));
  const hood=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.75,0.9,20,1,true,-Math.PI/2,Math.PI),white);hood.rotation.z=Math.PI/2;hood.position.set(-0.85,0.95,0);bed.add(hood);
  bed.add(bx(0.06,0.06,1.0,amber,-1.25,1.25,0));prop(bed,-4.3,-4.1,2.6,1.45);INT.bed={x:-4.3,z:-3.4};
  // workstation with the journal and a holo screen (back-right)
  const desk=new THREE.Group();desk.position.set(4.2,0,-4.5);desk.add(bx(2.1,0.07,0.85,white,0,0.82,0));desk.add(bx(2.1,0.03,0.04,cyan,0,0.8,0.43));desk.add(bx(0.12,0.8,0.6,steel,-0.85,0.4,0));desk.add(bx(0.12,0.8,0.6,steel,0.85,0.4,0));
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.62),new THREE.MeshBasicMaterial({color:'#4fd8ff',transparent:true,opacity:0.32,side:THREE.DoubleSide,depthWrite:false}));scr.position.set(0.15,1.42,-0.2);scr.rotation.x=-0.12;desk.add(scr);
  for(let i=0;i<4;i++)desk.add(bx(0.5+((i*37)%5)*0.12,0.025,0.01,glow('#bff4ff',1.4),-0.2+((i*13)%3)*0.1,1.58-i*0.12,-0.19));
  const book=new THREE.Group();book.position.set(-0.3,0.88,0.08);book.add(bx(0.62,0.05,0.44,mat('#7a3b24'),0,0,0));book.add(bx(0.58,0.04,0.4,mat('#f6eedd'),0,0.03,0));book.rotation.y=0.2;desk.add(book);
  const chair=new THREE.Group();chair.position.set(0,0,0.85);chair.add(cy(0.05,0.25,0.45,12,steel,0,0.23,0));chair.add(cy(0.3,0.3,0.08,16,soft,0,0.5,0));chair.add(bx(0.5,0.5,0.07,soft,0,0.8,0.26));desk.add(chair);
  prop(desk,4.2,-4.5,2.1,0.85);INT.desk={x:4.2,z:-3.6,book};
  // suit lockers (left), galley (back), hydroponics (right)
  // wardrobe: walk up to it to change your look
  const wd=new THREE.Group();wd.position.set(-6.15,0,1.4);wd.rotation.y=Math.PI/2;
  wd.add(bx(1.9,2.25,0.6,white,0,1.12,0));wd.add(bx(1.7,1.95,0.05,dark,0,1.15,0.27));{const rail=cy(0.025,0.025,1.6,8,steel,0,1.95,0.12);rail.rotation.z=Math.PI/2;wd.add(rail)}
  ['#4f86f7','#ff7a2e','#3cb37a','#efebe4','#8a6cd8'].forEach((c,i)=>{const h=bx(0.3,0.72,0.07,mat(c,{roughness:0.85}),-0.62+i*0.31,1.52,0.14);h.rotation.y=0.25;wd.add(h)});
  for(const s of[-1,1]){const d=new THREE.Group();d.position.set(s*0.95,0,0.3);d.rotation.y=s*1.05;d.add(bx(0.9,2.15,0.05,white,-s*0.45,1.12,0));if(s<0)d.add(bx(0.6,1.5,0.02,new THREE.MeshStandardMaterial({color:'#cfe6ff',metalness:0.95,roughness:0.05}),0.45,1.2,0.035));wd.add(d)}
  wd.add(bx(1.92,0.06,0.62,cyan,0,2.27,0));wd.add(sp(0.05,cyan,0.7,0.4,0.33,8,6));prop(wd,-6.15,1.4,0.6,1.9);INT.wardrobe={x:-5.3,z:1.4};
  // room panel by the door: light and floor colours
  const rp=new THREE.Group();rp.position.set(1.7,0,R-0.42);rp.rotation.y=Math.PI+0.22;rp.add(bx(0.7,1.1,0.12,white,0,1.25,0));
  const scrM=new THREE.MeshStandardMaterial({color:'#0e1a22',emissive:HC.stripe,emissiveIntensity:0.35,roughness:0.2});rp.add(bx(0.56,0.62,0.02,scrM,0,1.35,0.07));INT.mats.screen=scrM;
  for(let i=0;i<3;i++)rp.add(bx(0.12,0.08,0.02,[cyan,amber,floorM][i],-0.16+i*0.16,0.9,0.07));g.add(rp);INT.panel={x:1.55,z:R-1.25};
  const gal=new THREE.Group();gal.position.set(0,0,-6.35);gal.add(bx(2.6,0.9,0.7,white,0,0.45,0));gal.add(bx(2.6,0.05,0.72,dark,0,0.92,0));gal.add(bx(0.5,0.38,0.4,dark,-0.8,1.15,0));gal.add(bx(0.3,0.05,0.01,cyan,-0.8,1.2,0.21));gal.add(bx(2.6,0.03,0.03,amber,0,0.05,0.36));prop(gal,0,-6.35,2.6,0.7);
  const pl=new THREE.Group();pl.position.set(6.2,0,1.2);pl.add(bx(0.55,1.9,2.4,white,0,0.95,0));
  for(let s=0;s<3;s++){pl.add(bx(0.5,0.03,2.3,glow('#ff6ad5',1.2),0.02,0.62+s*0.55,0));for(let i=0;i<4;i++)pl.add(sp(0.15,mat('#4fbf6a',{roughness:0.8}),0,0.47+s*0.55,-0.85+i*0.57,8,6))}prop(pl,6.2,1.2,0.55,2.4);
  // the way out: an airlock door in the front of the wall
  const door=new THREE.Group();door.position.set(0,0,R-0.12);door.add(bx(1.9,2.6,0.12,steel,0,1.3,0.04));door.add(bx(0.66,2.2,0.08,white,-0.34,1.12,-0.04));door.add(bx(0.66,2.2,0.08,white,0.34,1.12,-0.04));
  door.add(bx(0.02,2.2,0.09,dark,0,1.12,-0.05));door.add(bx(1.5,0.06,0.1,cyan,0,2.32,-0.06));door.add(sp(0.06,glow('#8fe39a',2),0.82,1.15,-0.1,8,6));g.add(door);INT.door={x:0,z:R-1.0};
  INT.galley={x:0,z:-5.6};
  // home expansions: a grow bay and spare bunks (level 2), a water recycler and workbench (level 3)
  const lv=(S&&S.habLv)||1;INT.bench=null;
  if(lv>=2){for(let i=0;i<5;i++){const a=Math.PI*0.62+i*0.2,x=Math.sin(a)*(R-1.3),z=Math.cos(a)*(R-1.3);const rk=new THREE.Group();rk.position.set(x,0,z);rk.rotation.y=a;rk.add(bx(0.5,1.7,1.0,white,0,0.85,0));
      for(let s=0;s<3;s++){rk.add(bx(0.46,0.03,0.95,new THREE.MeshStandardMaterial({color:'#ff6ad5',emissive:'#ff6ad5',emissiveIntensity:1.1}),0,0.55+s*0.5,0));for(let k=0;k<3;k++)rk.add(sp(0.13,mat('#4fbf6a',{roughness:0.8}),0.02,0.42+s*0.5,-0.3+k*0.3,8,6))}g.add(rk);INT.props.push({x,z,w:0.4,d:0.4})}
    const b2=new THREE.Group();const a2=-Math.PI*0.42,bx2=Math.sin(a2)*(R-1.6),bz2=Math.cos(a2)*(R-1.6);b2.position.set(bx2,0,bz2);b2.rotation.y=a2;b2.add(bx(2.4,0.42,1.2,white,0,0.3,0));b2.add(bx(2.2,0.2,1.1,mat('#dfe6ee'),0,0.6,0));b2.add(bx(1.3,0.1,1.12,soft,0.4,0.72,0));g.add(b2);INT.props.push({x:bx2,z:bz2,w:0.9,d:0.9})}
  if(lv>=3){const a3=Math.PI*1.12,x3=Math.sin(a3)*(R-1.4),z3=Math.cos(a3)*(R-1.4);const tank=new THREE.Group();tank.position.set(x3,0,z3);tank.add(cy(0.6,0.6,1.8,20,steel,0,0.9,0));tank.add(cy(0.62,0.62,0.12,20,cyan,0,1.2,0));tank.add(cy(0.5,0.5,0.7,20,new THREE.MeshStandardMaterial({color:'#6fb6ff',transparent:true,opacity:0.55}),0,0.6,0));g.add(tank);INT.props.push({x:x3,z:z3,w:0.6,d:0.6});
    const a4=Math.PI*1.38,x4=Math.sin(a4)*(R-1.4),z4=Math.cos(a4)*(R-1.4);const wb=new THREE.Group();wb.position.set(x4,0,z4);wb.rotation.y=a4+Math.PI;wb.add(bx(2.0,0.08,0.8,white,0,0.9,0));wb.add(bx(1.9,0.85,0.7,dark,0,0.45,0));wb.add(bx(0.4,0.3,0.3,steel,-0.6,1.1,0));wb.add(bx(0.6,0.04,0.3,amber,0.4,0.95,0));g.add(wb);INT.props.push({x:x4,z:z4,w:0.9,d:0.9});INT.bench={x:x4*0.85,z:z4*0.85}}
  buildAirlock(g);
  g.traverse(o=>{if(o.isMesh){o.castShadow=false}});
  g.visible=!!P.inside;scene.add(g);INT.g=g;
}
function enterHabitat(){
  if(P.inside||game.cine)return;P.flash=null;   // back to automatic when you come out
  if(!INT.g||Math.abs(INT.x-home().x)>1)buildInterior();applyHabCols();
  const al=airlockPos(home());P.outPos={x:al.x,y:groundHeight(al.x,al.z),z:al.z};
  fade(true,'Opening the outer hatch…');SFX.hiss();
  setTimeout(()=>{fade(false);airlockRun('in',()=>{fade(true,'');setTimeout(()=>{P.inside=true;P.mode='foot';P.pos.set(INT.x+INT.door.x,INT.y+0.05,INT.z+INT.door.z-0.6);P.vel.set(0,0,0);P.yaw=Math.PI;cam.yaw=Math.PI;cam.pitch=0.35;cam.zoom=0.7;P.lastG=undefined;P.onGround=true;game.camSnap=true;
    INT.g.visible=true;setOutfit(astro,true);if(!S.flags.habCheck)habitatCheck();fade(false)},350)})},450);
}
function exitHabitat(){
  if(!P.inside||game.cine)return;closeJournal();$('#habcol').classList.add('hidden');if(typeof closeCreator==='function')closeCreator();fade(true,'');
  setTimeout(()=>{fade(false);airlockRun('out',()=>{fade(true,'Opening the outer hatch…');SFX.hiss();setTimeout(()=>{P.inside=false;INT.g.visible=false;setOutfit(astro,false);const o=P.outPos||airlockPos(home());P.pos.set(o.x,groundHeight(o.x,o.z),o.z);P.vel.set(0,0,0);P.lastG=undefined;P.onGround=true;cam.zoom=1;game.camSnap=true;fade(false)},450)})},350);
}
/* ---------- the airlock: a short, skippable sequence each way ---------- */
function buildAirlock(g){
  const a=new THREE.Group();a.position.set(0,0,ROOM.r+40);g.add(a);
  const pm=new THREE.MeshStandardMaterial({color:'#dfe4ea',roughness:0.45,metalness:0.25,side:THREE.BackSide}),steel=mat('#9aa3ad',{roughness:0.35,metalness:0.7}),dark=mat('#23272e',{roughness:0.5,metalness:0.4});
  const room=new THREE.Mesh(new THREE.BoxGeometry(3.6,2.9,3.6),pm);room.position.y=1.45;a.add(room);
  a.add(bx(3.5,0.06,3.5,dark,0,0.03,0));for(let i=-3;i<=3;i++)a.add(bx(0.05,0.07,3.3,steel,i*0.45,0.04,0));
  const red=new THREE.MeshStandardMaterial({color:'#ff3a2f',emissive:'#ff3a2f',emissiveIntensity:2}),green=new THREE.MeshStandardMaterial({color:'#3fe07a',emissive:'#3fe07a',emissiveIntensity:0.2}),jet=new THREE.MeshStandardMaterial({color:'#5fe8ff',emissive:'#5fe8ff',emissiveIntensity:0.3});
  for(const[z,lm]of[[1.76,red],[-1.76,green]]){const h=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,0.08,32),steel);h.rotation.x=Math.PI/2;h.position.set(0,1.15,z);a.add(h);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.06,8,32),glow('#ffb35c',1.2));ring.position.set(0,1.15,z-Math.sign(z)*0.04);a.add(ring);a.add(sp(0.09,lm,0,2.25,z-Math.sign(z)*0.06,10,8))}
  a.add(bx(0.1,2.2,1.2,steel,-1.72,1.1,0));for(const z of[-0.35,0.35]){const hk=cy(0.03,0.03,0.3,6,steel,-1.58,1.9,z);hk.rotation.z=Math.PI/2;a.add(hk)}
  for(const[x,z]of[[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]])a.add(cy(0.07,0.1,0.18,10,jet,x,2.8,z));
  const L=new THREE.PointLight(0xe8f4ff,14,9,1.6);L.position.set(0,2.6,0);a.add(L);
  INT.al={g:a,red,green,jet}}
function airlockUI(on){let el=$('#alov');if(!el){el=document.createElement('div');el.id='alov';el.className='hidden';el.innerHTML='<div class="alcard"><div class="alstep" id="al-step"></div><h3 id="al-t"></h3><p id="al-b"></p><div class="algauge"><i id="al-g"></i></div><div class="alrow"><span id="al-p"></span><button class="btn sm" id="al-skip">Skip <kbd>Space</kbd></button></div></div>';document.body.appendChild(el);
    el.querySelector('#al-skip').onclick=()=>{if(game.cine)game.cine.skip()}}el.classList.toggle('hidden',!on)}
addEventListener('keydown',e=>{if(game.cine&&(e.key===' '||e.key==='Enter'||e.key==='Escape')){e.preventDefault();e.stopImmediatePropagation();game.cine.skip()}},true);
function airlockRun(dir,done){
  const A=INT.al,base=new THREE.Vector3(INT.x,INT.y,INT.z+ROOM.r+40);
  const steps=dir==='in'?[
    [1.5,'Outer hatch sealed','The airlock keeps the habitat’s air in. Air pressure on Mars is only about 0.6 kPa, less than 1% of Earth’s.','p0'],
    [2.6,'Repressurising','Pumping breathable air in until the chamber matches the habitat: 101 kPa, the same as sea level on Earth.','up'],
    [2.0,'Dust shower','Air jets blow the fine, clingy regolith off your suit. Martian dust contains perchlorate salts, which are harmful to breathe.','dust'],
    [1.7,'Helmet off','Unlatch the neck ring and lift the helmet off. Underneath, astronauts wear a fabric comm cap: the “Snoopy cap”, with the radio headset built in.','helm'],
    [1.2,'Comm cap off','Off comes the skull cap with its earphones and microphones.','cap'],
    [1.4,'Suit off','Out of the suit! It goes on its rack to recharge its oxygen and battery.','pop'],
    [1.0,'Inner hatch open','Welcome home. Your journal, bunk and wardrobe are inside.','open']]:[
    [1.4,'Suit on','Step into the suit and seal it up. Its oxygen and battery were topped up on the rack.','popon'],
    [1.2,'Comm cap on','On goes the skull cap with the radio headset, so Mission Control and your crew can hear you.','capon'],
    [1.6,'Helmet on','Lower the helmet and lock the neck ring. Astronauts check every seal before each spacewalk.','helmon'],
    [2.2,'Depressurising','The air is pumped back into the habitat’s tanks so none is wasted, until the chamber matches Mars: about 0.6 kPa.','down'],
    [1.0,'Outer hatch open','Good luck out there.','out']];
  const total=steps.reduce((a,b)=>a+b[0],0);let t=0,last=-1,fin=false;
  P.inside=true;INT.g.visible=true;astro.visible=true;setOutfit(astro,dir==='out');astro.position.copy(base);astro.rotation.set(0,Math.PI*0.25,0,'YXZ');P.pos.copy(base);
  const U=astro.userData;airlockUI(true);$('#hud').classList.add('cinehide');
  // the helmet (the suit pieces on the head), the comm cap worn under it, and the rest of the suit (which puffs up and pops)
  const helm=U.suitParts.filter(m=>m.parent===U.head),body=U.suitParts.filter(m=>m.parent!==U.head),cap=U.commCap||(U.commCap=mkCommCap(U.head));
  for(const m of helm)if(m.userData.hy===undefined)m.userData.hy=m.position.y;for(const m of body)m.userData.ps=m.scale.clone();
  const helmAt=(dy,vis)=>{for(const m of helm){m.position.y=m.userData.hy+dy;m.visible=vis}};
  const bodyScale=k=>{for(const m of body)m.scale.copy(m.userData.ps).multiplyScalar(k)};
  const pop=()=>{puff(base.x,base.y+1.0,base.z,1.6,'#f4f1ea');puff(base.x+0.4,base.y+0.6,base.z-0.2,1.1,'#ffffff');SFX.hiss();beep(660,0.06,'triangle',0.06);beep(990,0.08,'triangle',0.05,0.05)};
  const tidy=suited=>{bodyScale(1);setOutfit(astro,!suited);helmAt(0,suited);cap.visible=false;cap.position.y=FY;cap.scale.setScalar(1);astro.scale.setScalar(astro.userData.hs||astro.scale.x)};
  astro.userData.hs=astro.scale.x;cap.visible=dir==='in';let popped=false;
  const end=()=>{if(fin)return;fin=true;game.cine=null;airlockUI(false);$('#hud').classList.remove('cinehide');U.armL.rotation.set(0,0,0);U.armR.rotation.set(0,0,0);tidy(dir==='out');done()};
  const cine=dt=>{t+=dt;updateEnv(dt,P.pos);if(t>=total){end();return}
    let acc=0,k=0;while(k<steps.length-1&&t>acc+steps[k][0]){acc+=steps[k][0];k++}const st=steps[k],f=clamp((t-acc)/st[0],0,1);
    if(k!==last){last=k;$('#al-step').textContent=(dir==='in'?'Entering the habitat':'Leaving the habitat')+` · ${k+1}/${steps.length}`;$('#al-t').textContent=st[1];$('#al-b').textContent=st[2];if(st[3]==='up'||st[3]==='down'||st[3]==='dust')SFX.hiss()}
    const iP=steps.findIndex(s=>s[3]==='up'||s[3]==='down'),kpa=dir==='in'?(k<iP?0.6:k===iP?0.6+f*100.4:101):(k<iP?101:k===iP?101-f*100.4:0.6);$('#al-g').style.width=(kpa/101*100)+'%';$('#al-p').textContent=`Pressure ${kpa<10?kpa.toFixed(1):Math.round(kpa)} kPa`;
    const sealed=k<steps.findIndex(s=>s[3]==='open'||s[3]==='out');A.red.emissiveIntensity=sealed?1.4+Math.sin(t*8)*0.6:0.15;A.green.emissiveIntensity=sealed?0.2:2;A.jet.emissiveIntensity=st[3]==='dust'?1.5+Math.sin(t*30):0.3;
    const tag=st[3],sm=(a,b,x)=>{const q=clamp((x-a)/(b-a),0,1);return q*q*(3-2*q)},arms=l=>{U.armL.rotation.set(-2.6*l,0,-0.35*l);U.armR.rotation.set(-2.6*l,0,0.35*l)};
    if(tag==='helm'){arms(Math.sin(Math.min(1,f*1.15)*Math.PI));helmAt(sm(0.2,0.85,f)*0.95,f<0.97)}                       // helmet lifts off, the comm cap shows underneath
    else if(tag==='cap'){helmAt(0,false);arms(Math.sin(f*Math.PI));cap.visible=f<0.92;cap.position.y=FY+sm(0.35,0.9,f)*0.3;cap.scale.setScalar(1-sm(0.6,0.95,f)*0.4)}
    else if(tag==='pop'){helmAt(0,false);cap.visible=false;arms(0.25*Math.sin(f*Math.PI));
      if(!popped){bodyScale(1+0.32*sm(0,0.5,f));if(f>=0.5){popped=true;bodyScale(1);setOutfit(astro,true);pop()}}             // the suit puffs up, then pops off
      else astro.scale.setScalar(astro.userData.hs*(1+0.06*Math.sin((f-0.5)*Math.PI*6)*(1-f)))}
    else if(tag==='popon'){if(!popped&&f>=0.35){popped=true;setOutfit(astro,false);pop()}if(popped){helmAt(0,false);cap.visible=false;bodyScale(1+0.32*(1-sm(0.35,0.9,f)))}arms(0.25*Math.sin(f*Math.PI))}
    else if(tag==='capon'){helmAt(0,false);bodyScale(1);arms(Math.sin(f*Math.PI));cap.visible=true;cap.position.y=FY+(1-sm(0.15,0.7,f))*0.3;cap.scale.setScalar(0.6+0.4*sm(0.15,0.7,f))}
    else if(tag==='helmon'){cap.visible=true;cap.position.y=FY;cap.scale.setScalar(1);arms(Math.sin(Math.min(1,f*1.1)*Math.PI));helmAt((1-sm(0.1,0.8,f))*0.95,true)}
    if(st[3]==='dust')astro.rotation.y+=dt*1.2;
    const ca=Math.PI*0.25+Math.sin(t*0.25)*0.25;camera.position.set(base.x+Math.sin(ca)*2.15,base.y+1.65,base.z+Math.cos(ca)*2.15);camera.lookAt(base.x,base.y+(['helm','cap','helmon','capon'].includes(st[3])?1.6:['pop','popon'].includes(st[3])?1.25:1.15),base.z)};
  cine.skip=()=>end();
  game.cine=cine}
// floor and walls of the room (used by the walker while you're inside)
function interiorCollide(pos,rad){
  let x=pos.x-INT.x,z=pos.z-INT.z;const d0=Math.hypot(x,z),lim=ROOM.r-0.25-rad;if(d0>lim){x*=lim/d0;z*=lim/d0}
  for(const p of INT.props){const cx=clamp(x,p.x-p.w,p.x+p.w),cz=clamp(z,p.z-p.d,p.z+p.d),dx=x-cx,dz=z-cz,d=Math.hypot(dx,dz);
    if(d<rad){if(d>1e-4){x=cx+dx/d*rad;z=cz+dz/d*rad}else{const e=[x-(p.x-p.w),(p.x+p.w)-x,z-(p.z-p.d),(p.z+p.d)-z],m=Math.min(...e),k=e.indexOf(m);if(k===0)x=p.x-p.w-rad;else if(k===1)x=p.x+p.w+rad;else if(k===2)z=p.z-p.d-rad;else z=p.z+p.d+rad}}}
  pos.x=INT.x+x;pos.z=INT.z+z;
}
function interiorCamera(){const c=camera.position;let x=c.x-INT.x,z=c.z-INT.z;const d=Math.hypot(x,z),lim=ROOM.r-0.45;if(d>lim){x*=lim/d;z*=lim/d}
  c.x=INT.x+x;c.z=INT.z+z;c.y=clamp(c.y,INT.y+0.5,INT.y+domeTop(Math.min(d,lim)+0.3)-0.3);camera.lookAt(cam.target)}
// prompts and the auto-opening journal
function interiorInteract(hints){
  if(!P.inside)return;const lx=P.pos.x-INT.x,lz=P.pos.z-INT.z;
  const dDesk=Math.hypot(lx-INT.desk.x,lz-INT.desk.z),dBed=Math.hypot(lx-INT.bed.x,lz-INT.bed.z),dDoor=Math.hypot(lx-INT.door.x,lz-INT.door.z);
  if(dDesk<1.7)hints.unshift('<span class="key">E</span>Open your journal');
  if(dBed<2.2||INT.beds.some(b=>Math.hypot(lx-b.x,lz-b.z)<1.8)){const t=tod(),night=t>19.5||t<5.5;hints.unshift(night?'<span class="key">F</span>Sleep until morning':'<span class="key">F</span>Rest (you can only sleep through the night)')}
  if(dDoor<1.5)hints.unshift('<span class="key">F</span>Go outside');
  if(Math.hypot(lx-INT.galley.x,lz-INT.galley.z)<1.6)hints.unshift('<span class="key">F</span>Eat and drink (uses colony food and water)');
  if(INT.bench&&Math.hypot(lx-INT.bench.x,lz-INT.bench.z)<1.8)hints.unshift('<span class="key">F</span>Workbench: craft fabricator items at home');
  const dW=Math.hypot(lx-INT.wardrobe.x,lz-INT.wardrobe.z);if(dW<1.5)hints.unshift('<span class="key">F</span>Change your look');
  if(Math.hypot(lx,lz-0.4)<2.0)hints.unshift('<span class="key">F</span>Open the holo-map');
  if(Math.hypot(lx-INT.panel.x,lz-INT.panel.z)<1.2)hints.unshift('<span class="key">F</span>Room colours');
  if(INT.desk.book)INT.desk.book.rotation.y=0.2+Math.sin(now*0.8)*0.02;
  if(INT.lights){const k=1-0.4*(ENV.night||0);INT.lights.forEach(([l,b])=>l.intensity=b*k)}
  ensureBeds();
  if(INT.holo){INT.holo.rotation.y=now*0.35;INT.holo.position.y=1.65+Math.sin(now*1.3)*0.04}
}
function interiorPressF(){
  if(!P.inside)return false;const lx=P.pos.x-INT.x,lz=P.pos.z-INT.z;
  if(Math.hypot(lx-INT.door.x,lz-INT.door.z)<1.5){exitHabitat();return true}
  if(Math.hypot(lx-INT.bed.x,lz-INT.bed.z)<2.2||INT.beds.some(b=>Math.hypot(lx-b.x,lz-b.z)<1.8)){trySleep();return true}
  if(Math.hypot(lx-INT.galley.x,lz-INT.galley.z)<1.6){eatMeal();return true}
  if(INT.bench&&Math.hypot(lx-INT.bench.x,lz-INT.bench.z)<1.8){openMenu('inv');invUI.tab='craft';refreshInvUI();return true}
  if(Math.hypot(lx-INT.wardrobe.x,lz-INT.wardrobe.z)<1.5){openCreator();return true}
  if(Math.hypot(lx-INT.panel.x,lz-INT.panel.z)<1.2){openHabCols();return true}
  if(Math.hypot(lx,lz-0.4)<2.0){togglePanel('mapov');return true}
  return true}
/* ---------- the journal: write anything; it's saved with this expedition ---------- */
// Pages are stored in one string, split by form-feed characters, so older journals still load as page 1.
const JSEP='\f',JMAX_PAGES=200;
function journalText(){return typeof S.journal==='string'?S.journal:''}
function jPages(){const p=journalText().split(JSEP);return p.length?p:['']}
function jSave(p){const q=p.slice();while(q.length>1&&!q[q.length-1])q.pop();S.journal=q.join(JSEP).slice(0,20000)}
const JB={cur:null};
// an open book: two facing pages (one on narrow screens), arrows to turn pages, text flows onto the next page
function mountBook(root,o={}){
  root.innerHTML=`<div class="book${o.compact?' compact':''}">
    <div class="bk-cover"><div class="bk-page left"><div class="bk-head"></div><textarea class="bk-ta" spellcheck="true" placeholder="Write anything: plans, discoveries, notes for your crew…"></textarea><div class="bk-num"></div></div>
      <div class="bk-spine"></div>
      <div class="bk-page right"><div class="bk-head"></div><textarea class="bk-ta" spellcheck="true"></textarea><div class="bk-num"></div></div>
      <textarea class="bk-ta bk-measure" tabindex="-1" aria-hidden="true"></textarea></div>
    <div class="bk-bar"><button class="bk-arrow" data-b="prev" title="Previous page">◀</button><button class="btn sm" data-b="date">Add today’s date</button>${o.onClose?'<button class="btn sm primary" data-b="close">Done</button>':''}<button class="bk-arrow" data-b="next" title="Next page">▶</button></div></div>`;
  const B={root,spread:0,pages:jPages(),focus:0},tas=[...root.querySelectorAll('.bk-page .bk-ta')],nums=[...root.querySelectorAll('.bk-num')],heads=[...root.querySelectorAll('.bk-head')],meas=root.querySelector('.bk-measure');
  const per=()=>root.querySelector('.bk-page.right').offsetParent===null?1:2;
  // split text into what fits on one page and the rest
  const fitSplit=t=>{meas.style.width=tas[0].clientWidth+'px';meas.style.height=tas[0].clientHeight+'px';meas.value=t;if(meas.scrollHeight<=meas.clientHeight+1)return[t,''];
    let lo=0,hi=t.length;while(lo<hi){const mid=(lo+hi+1)>>1;meas.value=t.slice(0,mid);if(meas.scrollHeight<=meas.clientHeight+1)lo=mid;else hi=mid-1}
    let cut=lo;const sp=t.lastIndexOf(' ',lo),nl=t.lastIndexOf('\n',lo),b=Math.max(sp,nl);if(b>lo*0.6)cut=b+1;return[t.slice(0,cut),t.slice(cut)]};
  const reflow=k=>{let i=k,guard=0;while(i<B.pages.length&&guard++<JMAX_PAGES){const[a,rest]=fitSplit(B.pages[i]||'');if(!rest)break;B.pages[i]=a;if(i+1>=JMAX_PAGES)break;B.pages[i+1]=rest+(B.pages[i+1]?(rest.endsWith('\n')?'':' ')+B.pages[i+1]:'');i++}};
  const show=()=>{const n=per(),last=Math.max(B.pages.length-1,0);B.spread=clamp(B.spread,0,Math.floor(Math.min(JMAX_PAGES-1,last+1)/n));const total=Math.max(B.pages.length,B.spread*n+n);
    tas.forEach((ta,i)=>{const k=B.spread*n+i;ta.dataset.k=k;ta.value=B.pages[k]||'';nums[i].textContent=`Page ${k+1} of ${total}`;heads[i].textContent=k===0?(o.title||'Journal'):''});
    root.querySelector('[data-b=prev]').disabled=B.spread===0};
  tas.forEach((ta,i)=>{
    ta.addEventListener('focus',()=>{B.focus=i;game.typing=true});ta.addEventListener('blur',()=>{if(!o.onClose)game.typing=false});
    ta.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){if(o.onClose)o.onClose();else ta.blur();return}
      // Backspace at the very start of a page jumps to the end of the previous one
      if(e.key==='Backspace'&&ta.selectionStart===0&&ta.selectionEnd===0&&+ta.dataset.k>0){e.preventDefault();go(+ta.dataset.k-1,true)}});
    ta.addEventListener('input',()=>{const k=+ta.dataset.k,atEnd=ta.selectionStart>=ta.value.length;while(B.pages.length<=k)B.pages.push('');B.pages[k]=ta.value;
      const before=B.pages[k];reflow(k);jSave(B.pages);
      if(B.pages[k]!==before){const caret=Math.min(ta.selectionStart,B.pages[k].length);show();if(atEnd)go(k+1,true);else{const t=tas.find(x=>+x.dataset.k===k);t.focus();t.selectionStart=t.selectionEnd=caret}}});
  });
  // show page k and put the caret in it (at the end, or the start)
  function go(k,end){const n=per();k=clamp(k,0,JMAX_PAGES-1);while(B.pages.length<=k)B.pages.push('');B.spread=Math.floor(k/n);show();const t=tas.find(x=>+x.dataset.k===k)||tas[0];t.focus();const p=end?t.value.length:0;t.selectionStart=t.selectionEnd=p}
  root.querySelector('.bk-bar').addEventListener('mousedown',e=>{const b=e.target.closest('[data-b]');if(!b)return;e.preventDefault();const n=per();
    if(b.dataset.b==='prev'){B.spread=Math.max(0,B.spread-1);show();sfx(0.05,700,2,0.05)}
    else if(b.dataset.b==='next'){if((B.spread+1)*n<JMAX_PAGES){B.spread++;while(B.pages.length<B.spread*n+1)B.pages.push('');show();sfx(0.05,760,2,0.05)}}
    else if(b.dataset.b==='date'){const ta=tas[B.focus]||tas[0],k=+ta.dataset.k;const v=B.pages[k]||'';B.pages[k]=v+(v&&!v.endsWith('\n')?'\n\n':'')+`Sol ${solNum()}, ${fmtTime()}: `;reflow(k);jSave(B.pages);
      let j=k;while(j+1<B.pages.length&&B.pages[j+1])j++;go(j,true)}
    else if(b.dataset.b==='close'&&o.onClose)o.onClose()});
  addEventListener('resize',()=>{if(root.isConnected)show()});
  // open on the last page that has writing
  let lastW=0;B.pages.forEach((p,i)=>{if(p.trim())lastW=i});B.spread=Math.floor(lastW/per());show();
  if(o.focus)setTimeout(()=>go(lastW,true),60);
  return B}
function openJournal(){
  if(!S)return;$('#journalov').classList.remove('hidden');game.typing=true;
  JB.cur=mountBook($('#jbookroot'),{title:(S.worldName||'Expedition')+' · Sol '+solNum(),onClose:closeJournal,focus:true});
}
function closeJournal(){const ov=$('#journalov');if(ov.classList.contains('hidden'))return;if(JB.cur)jSave(JB.cur.pages);ov.classList.add('hidden');game.typing=false;for(const k in keys)keys[k]=false;if(document.activeElement)document.activeElement.blur();JB.cur=null}
$('#journalov').addEventListener('mousedown',e=>{if(e.target.id==='journalov')closeJournal()});

/* ---------- sleeping (alone, or together in co-op) ---------- */
function trySleep(){const t=tod();if(!(t>19.5||t<5.5)){toast('It’s daytime: come back after 19:30 to sleep');return}
  if(!net.role){rest();return}if(typeof netSleep==='function')netSleep(true)}
/* ---------- habitat colours (the walls stay white) ---------- */
const HAB_DEF={floor:'#2f343c',stripe:'#5fe8ff',trim:'#ffb35c'};
const HAB_OPTS=[['floor','Floor',['#2f343c','#4a4f58','#6b5a4a','#8a6a4a','#c9c3bb','#1f3a4a','#3a2f4a','#2f4a3a']],['stripe','Light strips',['#5fe8ff','#7fe6a0','#ff8fd0','#b28cff','#ffd34d','#ffffff','#ff6a4d','#4f86f7']],['trim','Trim lights',['#ffb35c','#ff6a4d','#5fe8ff','#ffd34d','#7fe6a0','#ff8fd0','#ffffff','#b28cff']]];
function habCols(){const c={...HAB_DEF};const h=typeof S!=='undefined'&&S&&S.habCol;if(h&&typeof h==='object')for(const k in HAB_DEF)if(typeof h[k]==='string'&&/^#[0-9a-f]{6}$/i.test(h[k]))c[k]=h[k];return c}
function applyHabCols(){if(!INT.mats)return;const c=habCols();INT.mats.floor.color.set(c.floor);for(const k of['stripe','trim']){INT.mats[k].color.set(c[k]);INT.mats[k].emissive.set(c[k])}if(INT.mats.screen)INT.mats.screen.emissive.set(c.stripe)}
function openHabCols(){const c=habCols();$('#habcolbody').innerHTML=HAB_OPTS.map(([k,l,v])=>`<div class="crrow"><div class="sub">${l}</div><div class="sw">${v.map(x=>`<button data-hc="${k}" data-v="${x}" style="background:${x}" class="${c[k]===x?'on':''}"></button>`).join('')}</div></div>`).join('')+'<p class="sub">The walls stay white so the dome stays bright.</p>'+habExpandHTML();$('#habcol').classList.remove('hidden')}
$('#habcol').addEventListener('click',e=>{const b=e.target.closest('[data-hc]');if(b){S.habCol={...habCols(),[b.dataset.hc]:b.dataset.v};applyHabCols();openHabCols();if(net.role==='host')net.snapDirty=true;return}
  if(e.target.id==='hc-expand'){habExpand();return}
  if(e.target.id==='hc-reset'){S.habCol={...HAB_DEF};applyHabCols();openHabCols();return}if(e.target.id==='hc-x'||e.target.id==='hc-done'||e.target.id==='habcol')$('#habcol').classList.add('hidden')});

/* ---------- eating, and expanding your home ---------- */
function eatMeal(){if(S.mode!=='sandbox'&&(S.res.food<0.6||S.res.water<2)){toast('The colony is out of food or water: grow more in a greenhouse or drill for ice','bad');return}
  if(S.mode!=='sandbox'){S.res.food-=0.6;S.res.water-=2}P.food=100;P.water=100;toast('You eat a hot meal and drink your fill','good');sfx(0.3,600,1,0.06,'bandpass')}
const HAB_LV=[null,null,{cost:{brick:20,plate:10,glass:6},gain:'A bigger dome, a hydroponic grow bay (+2.4 kg food per sol) and spare bunks'},{cost:{brick:30,tiplate:6,glass:10,circuit:4},gain:'An even bigger dome, a water recycler (+12 L water per sol) and a workbench for fabricator crafting at home'}];
function habExpandHTML(){const lv=S.habLv||1;if(lv>=3)return'<div class="sec">Your home</div><p class="sub">Fully expanded: grow bay, water recycler and workbench.</p>';const nx=HAB_LV[lv+1],cost=Object.entries(nx.cost).map(([k,n])=>`${n} ${ITEMS[k].name}`).join(', ');
  return`<div class="sec">Expand your home (level ${lv} → ${lv+1})</div><p class="sub">${nx.gain}.<br>Costs ${cost} (from your pack and colony storage).</p><button class="btn primary" id="hc-expand">Expand the habitat</button>`}
function habExpand(){const lv=S.habLv||1;if(lv>=3)return;const nx=HAB_LV[lv+1];
  if(S.mode!=='sandbox'){if(!haveAll(ME,nx.cost,true)){toast('Missing: '+missingText(ME,nx.cost,true),'warn');return}payAll(ME,nx.cost,true)}
  S.habLv=lv+1;buildInterior();applyHabCols();INT.g.visible=!!P.inside;fade(true,'Expanding the habitat…');setTimeout(()=>fade(false),700);toast(`Habitat expanded to level ${S.habLv}!`,'good');openHabCols();if(net.role==='host')net.snapDirty=true}

/* ---------- E at the desk opens your journal ---------- */
function interiorPressE(){if(!P.inside)return false;const lx=P.pos.x-INT.x,lz=P.pos.z-INT.z;if(Math.hypot(lx-INT.desk.x,lz-INT.desk.z)<1.7){openJournal();return true}return false}
/* ---------- one bed for each person in the colony (you plus everyone who joined) ---------- */
const EXTRA_BEDS=[[-5.8,-1.6,Math.PI/2],[5.9,-1.4,Math.PI/2],[-3.6,4.6,0.25]];
function ensureBeds(){if(!INT.g)return;const need=clamp(1+(typeof net!=='undefined'?net.players.size:0),1,4);if(INT.bedCount===need)return;INT.bedCount=need;
  if(INT.extraBeds){INT.g.remove(INT.extraBeds);INT.props=INT.props.filter(p=>!p.bed)}const grp=new THREE.Group();INT.g.add(grp);INT.extraBeds=grp;INT.beds=[];
  const white=mat('#f2f4f6',{roughness:0.3,metalness:0.1}),blankets=['#8a6cd8','#3cb37a','#e8553b'];
  for(let i=0;i<need-1;i++){const[x,z,r]=EXTRA_BEDS[i],b=new THREE.Group();b.position.set(x,0,z);b.rotation.y=r;
    b.add(bx(2.5,0.42,1.3,white,0,0.3,0));b.add(bx(2.3,0.2,1.18,mat('#dfe6ee'),0,0.6,0));b.add(bx(1.4,0.1,1.2,mat(blankets[i],{roughness:0.9}),0.4,0.72,0));b.add(bx(0.5,0.15,0.8,mat('#ffffff'),-0.85,0.74,0));
    b.traverse(o=>{if(o.isMesh)o.castShadow=false});grp.add(b);const c=Math.abs(Math.cos(r)),sn=Math.abs(Math.sin(r));INT.props.push({x,z,w:(2.5*c+1.3*sn)/2,d:(2.5*sn+1.3*c)/2,bed:true});INT.beds.push({x,z})}
  grp.traverse(o=>o.layers.set(0))}

// the fabric comm cap ("Snoopy cap") worn under the helmet: a snug skull cap with ear cups and a microphone
function mkCommCap(head){const P=[],shell=new THREE.SphereGeometry(0.266,36,18,0,TAU,0,1.78);shell.scale(1,1.09,1.02);P.push(shell);
  for(const s of[-1,1]){const cup=new THREE.CylinderGeometry(0.062,0.062,0.04,24);cup.rotateZ(Math.PI/2);cup.translate(s*0.272,-0.005,-0.005);P.push(cup);
    const mic=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(s*0.285,-0.03,0.02),new THREE.Vector3(s*0.25,-0.09,0.14),new THREE.Vector3(s*0.14,-0.105,0.21)]),14,0.007,6,false);P.push(mic)}
  const strap=new THREE.TorusGeometry(0.2,0.012,6,32,Math.PI);strap.rotateY(Math.PI/2);strap.rotateX(Math.PI);strap.translate(0,-0.08,0.02);P.push(strap);
  const g=new THREE.Group(),capM=new THREE.MeshStandardMaterial({color:'#ece6da',roughness:0.85}),darkM=new THREE.MeshStandardMaterial({color:'#4a3426',roughness:0.7});
  const top=new THREE.Mesh(mergeAll([P[0]]),capM),rest=new THREE.Mesh(mergeAll(P.slice(1)),darkM);g.add(top,rest);
  const band=new THREE.Mesh(new THREE.SphereGeometry(0.268,36,8,0,TAU,0.9,0.34),darkM);band.scale.set(1,1.09,1.02);g.add(band);
  g.position.y=FY;g.visible=false;head.add(g);return g}
