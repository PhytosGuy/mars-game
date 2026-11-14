'use strict';
/* =========================================================
   INSIDE THE HABITAT: a walkable room with a bunk, a desk and your journal
   The room is built once and sits high above the base (closed off from the
   outside), so the normal walker, camera and co-op all keep working.
   ========================================================= */
const ROOM={hx:7,hz:5,h:3.4,lift:320};                                   // half-width, half-depth, height; how far above the base it sits
const INT={g:null,x:0,y:0,z:0,props:[],desk:null,bed:null,door:null};
function interiorBase(){const hb=home();return{x:hb.x,y:(hb.y||groundHeight(hb.x,hb.z))+ROOM.lift,z:hb.z}}
function buildInterior(){
  if(INT.g){scene.remove(INT.g)}
  const b=interiorBase(),g=new THREE.Group();g.position.set(b.x,b.y,b.z);Object.assign(INT,{x:b.x,y:b.y,z:b.z,props:[]});
  const wallM=mat('#e9e3d8',{roughness:0.85,side:THREE.BackSide}),floorM=mat('#8d7a6a',{roughness:0.9}),trim=mat('#ff8a3d',{roughness:0.6}),dark=mat('#3a3532'),soft=mat('#5f87b8',{roughness:1}),wood=mat('#b98b5e',{roughness:0.8});
  // shell: floor, walls and ceiling seen from inside
  const shell=new THREE.Mesh(new THREE.BoxGeometry(ROOM.hx*2,ROOM.h,ROOM.hz*2),wallM);shell.position.y=ROOM.h/2;shell.receiveShadow=true;g.add(shell);
  g.add(bx(ROOM.hx*2-0.05,0.08,ROOM.hz*2-0.05,floorM,0,0.02,0));g.add(bx(ROOM.hx*2,0.12,0.1,trim,0,1.1,-ROOM.hz+0.05));g.add(bx(ROOM.hx*2,0.12,0.1,trim,0,1.1,ROOM.hz-0.05));
  for(let i=-2;i<=2;i++){const l=sp(0.14,glow('#fff2d6',1.1),i*2.8,ROOM.h-0.12,0,10,8);l.scale.set(2.4,0.35,1.2);g.add(l)}
  const L1=new THREE.PointLight(0xffe2b8,22,22,1.6);L1.position.set(-3,ROOM.h-0.5,0);const L2=new THREE.PointLight(0xffe2b8,22,22,1.6);L2.position.set(3.5,ROOM.h-0.5,0);g.add(L1,L2);
  const prop=(m,x,z,w,d)=>{g.add(m);INT.props.push({x,z,w:w/2,d:d/2});return m};
  // bunk (back-left), with pillow and blanket
  const bed=new THREE.Group();bed.position.set(-5.3,0,-3.4);bed.add(bx(2.4,0.45,1.3,dark,0,0.25,0));bed.add(bx(2.3,0.22,1.2,mat('#efe9df'),0,0.58,0));bed.add(bx(1.5,0.12,1.22,soft,0.35,0.72,0));bed.add(bx(0.5,0.16,0.8,mat('#ffffff'),-0.85,0.74,0));prop(bed,-5.3,-3.4,2.4,1.3);INT.bed={x:-5.3,z:-3.4};
  // desk with the journal and a lamp (back-right)
  const desk=new THREE.Group();desk.position.set(4.6,0,-4.1);desk.add(bx(2,0.08,0.9,wood,0,0.82,0));for(const sx of[-0.9,0.9])for(const sz of[-0.38,0.38])desk.add(cy(0.04,0.04,0.8,6,dark,sx,0.4,sz));
  const book=new THREE.Group();book.position.set(-0.1,0.88,0.05);book.add(bx(0.62,0.05,0.44,mat('#7a3b24'),0,0,0));book.add(bx(0.58,0.04,0.4,mat('#f6eedd'),0,0.03,0));book.rotation.y=0.2;desk.add(book);
  desk.add(cy(0.08,0.12,0.06,10,dark,0.7,0.88,-0.2));desk.add(cy(0.02,0.02,0.45,6,dark,0.7,1.1,-0.2));desk.add(sp(0.09,glow('#ffd9a0',2.4),0.7,1.34,-0.15,10,8));
  const chair=new THREE.Group();chair.position.set(0,0,0.85);chair.add(bx(0.5,0.06,0.5,soft,0,0.48,0));chair.add(bx(0.5,0.55,0.06,soft,0,0.78,0.24));desk.add(chair);
  prop(desk,4.6,-4.1,2,0.9);INT.desk={x:4.6,z:-3.3,book};
  // lockers, galley, table, plants
  const lk=new THREE.Group();lk.position.set(-6.6,0,1.8);for(let i=0;i<3;i++){lk.add(bx(0.55,2.1,0.55,mat(['#c9c3bb','#ff8a3d','#c9c3bb'][i]),0,1.05,i*0.6-0.6))}prop(lk,-6.6,1.8,0.6,1.8);
  const gal=new THREE.Group();gal.position.set(1,0,-4.55);gal.add(bx(2.6,0.9,0.7,mat('#d6d0c6'),0,0.45,0));gal.add(bx(2.6,0.05,0.72,dark,0,0.92,0));gal.add(bx(0.5,0.35,0.4,mat('#2a2f3a'),-0.8,1.15,0));prop(gal,1,-4.55,2.6,0.7);
  const tab=new THREE.Group();tab.position.set(0.5,0,1.2);tab.add(cy(0.7,0.7,0.06,18,mat('#d6d0c6'),0,0.75,0));tab.add(cy(0.07,0.1,0.75,8,dark,0,0.37,0));for(const a of[0,2.1,4.2]){tab.add(cy(0.24,0.24,0.06,12,soft,Math.cos(a)*1.05,0.45,Math.sin(a)*1.05))}prop(tab,0.5,1.2,1.5,1.5);
  const pl=new THREE.Group();pl.position.set(6.55,0,1.2);pl.add(bx(0.5,1.8,2.4,mat('#bfb8ad'),0,0.9,0));for(let i=0;i<6;i++)pl.add(sp(0.18,mat('#5fae5f',{roughness:0.9}),0.05,0.5+Math.floor(i/2)*0.55,(i%2?0.5:-0.5),8,6));prop(pl,6.55,1.2,0.5,2.4);
  // the way out: a lit airlock door on the front wall
  const door=new THREE.Group();door.position.set(0,0,ROOM.hz-0.06);door.add(bx(1.4,2.3,0.08,mat('#8d8781'),0,1.15,0));door.add(bx(1.6,0.08,0.12,glow('#7fe6dc',1.6),0,2.35,0));door.add(sp(0.06,glow('#8fe39a',2),0.55,1.1,0.05,8,6));g.add(door);INT.door={x:0,z:ROOM.hz-0.8};
  g.traverse(o=>{if(o.isMesh){o.castShadow=false}});
  scene.add(g);INT.g=g;
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
  const lx=pos.x-INT.x,lz=pos.z-INT.z;let x=clamp(lx,-ROOM.hx+rad,ROOM.hx-rad),z=clamp(lz,-ROOM.hz+rad,ROOM.hz-rad);
  for(const p of INT.props){const cx=clamp(x,p.x-p.w,p.x+p.w),cz=clamp(z,p.z-p.d,p.z+p.d),dx=x-cx,dz=z-cz,d=Math.hypot(dx,dz);
    if(d<rad){if(d>1e-4){x=cx+dx/d*rad;z=cz+dz/d*rad}else{const e=[x-(p.x-p.w),(p.x+p.w)-x,z-(p.z-p.d),(p.z+p.d)-z],m=Math.min(...e),k=e.indexOf(m);if(k===0)x=p.x-p.w-rad;else if(k===1)x=p.x+p.w+rad;else if(k===2)z=p.z-p.d-rad;else z=p.z+p.d+rad}}}
  pos.x=INT.x+x;pos.z=INT.z+z;
}
function interiorCamera(){const c=camera.position;c.x=clamp(c.x,INT.x-ROOM.hx+0.35,INT.x+ROOM.hx-0.35);c.z=clamp(c.z,INT.z-ROOM.hz+0.35,INT.z+ROOM.hz-0.35);c.y=clamp(c.y,INT.y+0.5,INT.y+ROOM.h-0.25);camera.lookAt(cam.target)}
// prompts and the auto-opening journal
function interiorInteract(hints){
  if(!P.inside)return;const lx=P.pos.x-INT.x,lz=P.pos.z-INT.z;
  const dDesk=Math.hypot(lx-INT.desk.x,lz-INT.desk.z),dBed=Math.hypot(lx-INT.bed.x,lz-INT.bed.z),dDoor=Math.hypot(lx-INT.door.x,lz-INT.door.z);
  if(dDesk<1.7){if(!INT.nearDesk){INT.nearDesk=true;openJournal()}hints.unshift('<span class="key">F</span>Open your journal')}else if(dDesk>2.6)INT.nearDesk=false;
  if(dBed<2.2){const t=tod(),night=t>19.5||t<5.5;hints.unshift(night?'<span class="key">F</span>Sleep until morning':'<span class="key">F</span>Rest (you can only sleep through the night)')}
  if(dDoor<1.5)hints.unshift('<span class="key">F</span>Go outside');
  if(INT.desk.book)INT.desk.book.rotation.y=0.2+Math.sin(now*0.8)*0.02;
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
