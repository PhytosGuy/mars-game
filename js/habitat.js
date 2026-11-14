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
  const b=interiorBase(),g=new THREE.Group();g.position.set(b.x,b.y,b.z);Object.assign(INT,{x:b.x,y:b.y,z:b.z,props:[],spin:[]});
  const R=ROOM.r,W=ROOM.wall,S_=ROOM.s,TAU_=Math.PI*2,DOOR=Math.PI/2;                 // the door faces +z
  const panel=mat('#c9d0d8',{roughness:0.5,metalness:0.2,flatShading:true,side:THREE.BackSide}),
    floorM=mat('#2f343c',{roughness:0.3,metalness:0.55}),white=mat('#f2f4f6',{roughness:0.3,metalness:0.1}),steel=mat('#9aa3ad',{roughness:0.35,metalness:0.7}),
    dark=mat('#23272e',{roughness:0.4,metalness:0.5}),cyan=glow('#5fe8ff',1.8),amber=glow('#ffb35c',1.6),soft=mat('#3d5a80',{roughness:0.9});
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
  const L1=new THREE.PointLight(0xdff3ff,20,26,1.5);L1.position.set(0,topY-0.8,0);const L2=new THREE.PointLight(0xffd2a0,14,14,1.6);L2.position.set(-3.6,2.2,-3.2);const L3=new THREE.PointLight(0x7fe8ff,10,10,1.6);L3.position.set(3.8,2.2,-3.4);g.add(L1,L2,L3);
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
  const lk=new THREE.Group();lk.position.set(-6.25,0,1.4);lk.rotation.y=0;for(let i=0;i<3;i++){lk.add(bx(0.6,2.1,0.58,white,0,1.05,i*0.62-0.62));lk.add(bx(0.04,1.6,0.04,i===1?amber:cyan,0.31,1.1,i*0.62-0.62))}prop(lk,-6.25,1.4,0.6,1.9);
  const gal=new THREE.Group();gal.position.set(0,0,-6.35);gal.add(bx(2.6,0.9,0.7,white,0,0.45,0));gal.add(bx(2.6,0.05,0.72,dark,0,0.92,0));gal.add(bx(0.5,0.38,0.4,dark,-0.8,1.15,0));gal.add(bx(0.3,0.05,0.01,cyan,-0.8,1.2,0.21));gal.add(bx(2.6,0.03,0.03,amber,0,0.05,0.36));prop(gal,0,-6.35,2.6,0.7);
  const pl=new THREE.Group();pl.position.set(6.2,0,1.2);pl.add(bx(0.55,1.9,2.4,white,0,0.95,0));
  for(let s=0;s<3;s++){pl.add(bx(0.5,0.03,2.3,glow('#ff6ad5',1.2),0.02,0.62+s*0.55,0));for(let i=0;i<4;i++)pl.add(sp(0.15,mat('#4fbf6a',{roughness:0.8}),0,0.47+s*0.55,-0.85+i*0.57,8,6))}prop(pl,6.2,1.2,0.55,2.4);
  // the way out: an airlock door in the front of the wall
  const door=new THREE.Group();door.position.set(0,0,R-0.12);door.add(bx(1.9,2.6,0.12,steel,0,1.3,0.04));door.add(bx(0.66,2.2,0.08,white,-0.34,1.12,-0.04));door.add(bx(0.66,2.2,0.08,white,0.34,1.12,-0.04));
  door.add(bx(0.02,2.2,0.09,dark,0,1.12,-0.05));door.add(bx(1.5,0.06,0.1,cyan,0,2.32,-0.06));door.add(sp(0.06,glow('#8fe39a',2),0.82,1.15,-0.1,8,6));g.add(door);INT.door={x:0,z:R-1.0};
  g.traverse(o=>{if(o.isMesh){o.castShadow=false}});
  g.visible=!!P.inside;scene.add(g);INT.g=g;
}
function enterHabitat(){
  if(P.inside||net.role==='guest'&&false)return;
  if(!INT.g||Math.abs(INT.x-home().x)>1)buildInterior();
  const al=airlockPos(home());P.outPos={x:al.x,y:groundHeight(al.x,al.z),z:al.z};
  fade(true,'Cycling the airlock…');SFX.hiss();
  setTimeout(()=>{P.inside=true;P.mode='foot';P.pos.set(INT.x+INT.door.x,INT.y+0.05,INT.z+INT.door.z-0.6);P.vel.set(0,0,0);P.yaw=Math.PI;cam.yaw=Math.PI;cam.pitch=0.35;cam.zoom=0.7;P.lastG=undefined;P.onGround=true;game.camSnap=true;
    INT.g.visible=true;if(!S.flags.habCheck)habitatCheck();fade(false)},500);
}
function exitHabitat(){
  if(!P.inside)return;fade(true,'Cycling the airlock…');SFX.hiss();
  setTimeout(()=>{P.inside=false;INT.g.visible=false;const o=P.outPos||airlockPos(home());P.pos.set(o.x,groundHeight(o.x,o.z),o.z);P.vel.set(0,0,0);P.lastG=undefined;P.onGround=true;cam.zoom=1;game.camSnap=true;closeJournal();fade(false)},500);
}
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
  if(dDesk<1.7){if(!INT.nearDesk){INT.nearDesk=true;openJournal()}hints.unshift('<span class="key">F</span>Open your journal')}else if(dDesk>2.6)INT.nearDesk=false;
  if(dBed<2.2){const t=tod(),night=t>19.5||t<5.5;hints.unshift(night?'<span class="key">F</span>Sleep until morning':'<span class="key">F</span>Rest (you can only sleep through the night)')}
  if(dDoor<1.5)hints.unshift('<span class="key">F</span>Go outside');
  if(INT.desk.book)INT.desk.book.rotation.y=0.2+Math.sin(now*0.8)*0.02;
  if(INT.holo){INT.holo.rotation.y=now*0.35;INT.holo.position.y=1.65+Math.sin(now*1.3)*0.04}
}
function interiorPressF(){
  if(!P.inside)return false;const lx=P.pos.x-INT.x,lz=P.pos.z-INT.z;
  if(Math.hypot(lx-INT.door.x,lz-INT.door.z)<1.5){exitHabitat();return true}
  if(Math.hypot(lx-INT.desk.x,lz-INT.desk.z)<1.7){openJournal();return true}
  if(Math.hypot(lx-INT.bed.x,lz-INT.bed.z)<2.2){const t=tod();if((t>19.5||t<5.5)&&!net.role)rest();else toast(net.role?'Sleeping through the night isn’t available in co-op':'It’s daytime: come back after 19:30 to sleep');return true}
  return true}
/* ---------- the journal: write anything; it's saved with this expedition ---------- */
function journalText(){return typeof S.journal==='string'?S.journal:''}
function openJournal(){
  if(!S)return;const ov=$('#journalov');ov.classList.remove('hidden');const ta=$('#jtext');ta.value=journalText();
  $('#jtitle').textContent=(S.worldName||'Expedition')+' · journal';$('#jmeta').textContent=`Sol ${solNum()}, ${fmtTime()}`;game.typing=true;setTimeout(()=>ta.focus(),50);
}
function closeJournal(){const ov=$('#journalov');if(ov.classList.contains('hidden'))return;S.journal=$('#jtext').value.slice(0,20000);ov.classList.add('hidden');game.typing=false;for(const k in keys)keys[k]=false;$('#jtext').blur()}
$('#jtext').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')closeJournal()});
$('#jtext').addEventListener('input',e=>{if(S)S.journal=e.target.value.slice(0,20000)});
$('#jdate').addEventListener('click',()=>{const ta=$('#jtext');const stamp=(ta.value&&!ta.value.endsWith('\n')?'\n\n':'')+`Sol ${solNum()}, ${fmtTime()}: `;ta.value+=stamp;S.journal=ta.value;ta.focus();ta.selectionStart=ta.selectionEnd=ta.value.length});
$('#jclose').addEventListener('click',closeJournal);
