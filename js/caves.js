'use strict';
/* =========================================================
   PROCEDURAL CAVES
   Real underground tunnel networks. Each entrance is a sinkhole with a hole
   cut in the terrain mesh; tunnels are deformed tubes with flat floors,
   collision against their shape, and content placed from the same seed for
   every player.
   ========================================================= */
const CAVE_CELL=400,HOLE_R=4.6,BOWL_R=20,BOWL_D=5;
const cave={active:false,depth:0,nets:new Map(),inId:null};
const caveLights=[0,1,2].map(()=>{const l=new THREE.PointLight(0x9fd8ff,0,36,1.4);scene.add(l);return l});
const caveMat=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,side:THREE.BackSide,roughness:1});
const shaftMat=new THREE.MeshStandardMaterial({color:'#6a4332',flatShading:true,side:THREE.BackSide,roughness:1});
const capMat=new THREE.MeshStandardMaterial({color:'#2e221d',flatShading:true,side:THREE.DoubleSide,roughness:1});
const MYST={
  cathedral:{name:'Crystal Cathedral',color:'#dff3ff',rp:45,text:'A chamber filled with metre-long gypsum (selenite) crystals. On Earth, giant crystals like these grew slowly in warm, mineral-rich water, so a find like this would point to long-lived groundwater beneath Mars.'},
  icelake:{name:'Frozen Underground Lake',color:'#8fd8ff',rp:45,text:'A smooth floor of ancient water ice fills the chamber. Cold lava tubes act as natural freezers that trap ice for a very long time: a precious resource and a frozen record of past climate.'},
  lavafall:{name:'Frozen Lava Cascade',color:'#ffb27f',rp:40,text:'A wall of glassy, ropey basalt where molten rock once poured into the tube. Bright sulfate veins show that water seeped through these cracks long after the lava cooled.'},
  carvings:{name:'The Carved Hall',color:'#6fe0c8',rp:55,text:'Smooth walls covered in glowing glyphs. Someone shaped this chamber long ago. The symbols match the ones the Tharrak use, but these are far older.'}};
/* ---------- entrances (no terrain sampling here: used by the terrain itself) ---------- */
const entMemo=new Map();
function cellEntrance(gx,gz){
  const k=gx+','+gz;if(entMemo.has(k))return entMemo.get(k);let e=null;
  if(hash2(gx,gz,SITE.seed+501)<0.64){const x=(gx+0.2+0.6*hash2(gx,gz,SITE.seed+502))*CAVE_CELL,z=(gz+0.2+0.6*hash2(gx,gz,SITE.seed+503))*CAVE_CELL;
    if(x*x+z*z>240*240)e={id:'cv'+gx+'_'+gz,x,z}}
  entMemo.set(k,e);return e;
}
function fixedEntrances(){return SITE&&SITE.lava?[{id:'cvL',x:SITE.lava[0],z:SITE.lava[1],story:true}]:[]}
function entrancesNear(x,z,r){
  const out=fixedEntrances().filter(e=>Math.hypot(e.x-x,e.z-z)<r);
  for(let i=Math.floor((x-r)/CAVE_CELL);i<=Math.floor((x+r)/CAVE_CELL);i++)for(let j=Math.floor((z-r)/CAVE_CELL);j<=Math.floor((z+r)/CAVE_CELL);j++){
    const e=cellEntrance(i,j);if(e&&Math.hypot(e.x-x,e.z-z)<r&&!fixedEntrances().some(o=>Math.hypot(o.x-e.x,o.z-e.z)<200))out.push(e)} // order-independent, so terrain holes and cave meshes always agree
  return out;
}
// terrain hooks: the sinkhole bowl and the hole in the mesh
function caveBowl(x,z){let d0=0;for(const e of entrancesNear(x,z,BOWL_R)){const d=Math.hypot(e.x-x,e.z-z);d0=Math.max(d0,BOWL_D*(1-smooth(0,BOWL_R,d)))}return d0}
function inHole(x,z){for(const e of entrancesNear(x,z,HOLE_R+1))if(Math.hypot(e.x-x,e.z-z)<HOLE_R)return true;return false}
// skylight POIs so entrances can be scanned (and the story's lava tube is one of them)
function caveEntrancePOIs(x,z,range){return entrancesNear(x,z,range).map(e=>({id:e.story?'s_lava':'e'+e.id,type:'lavatube',x:e.x+HOLE_R+5,z:e.z,cave:e.id}))}
/* ---------- deterministic cave layout ---------- */
const caveCache=new Map();
function caveData(e){
  let D=caveCache.get(e.id);if(D)return D;
  const r=mulberry(strHash(e.id)),tubes=[];
  const tH=(x,z)=>groundHeight(x,z);
  const R0=4.4,top=tH(e.x,e.z)+R0*0.55;let dir=r()*TAU;
  const mk=(pts,base,chambers)=>{const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal'),a1=r()*6,a2=r()*6,len=curve.getLength();
    const rad=u=>{let v=base+0.9*Math.sin(u*len*0.09+a1)+0.5*Math.sin(u*len*0.23+a2);for(const[c,w,amp]of chambers)v+=amp*Math.exp(-(((u-c)/w)**2));return Math.max(2.4,v)};
    return{curve,rad,len}};
  // main tunnel: a steep ramp from the sinkhole, then a winding descent
  // the tunnel starts a little behind the sinkhole, so there's solid floor under the whole opening
  const pts=[new THREE.Vector3(e.x-Math.cos(dir)*6.5,top+0.6,e.z-Math.sin(dir)*6.5),new THREE.Vector3(e.x,top,e.z)];let x=e.x,z=e.z,y=top;
  for(let i=0;i<2;i++){x+=Math.cos(dir)*12;z+=Math.sin(dir)*12;y-=7.5;pts.push(new THREE.Vector3(x,y,z))}
  const n=10+Math.floor(r()*6);
  for(let i=0;i<n;i++){dir+=(r()-0.5)*1.0;const len=14+r()*10;x+=Math.cos(dir)*len;z+=Math.sin(dir)*len;const g=tH(x,z);y=clamp(y+(r()-0.78)*10,g-80,g-14);pts.push(new THREE.Vector3(x,y,z))}
  const main=mk(pts,4.6,[[0.5,0.05,3.2],[0.97,0.06,8]]);main.start=true;tubes.push(main);
  // side branches: narrow passages that end in chambers
  const nb=1+Math.floor(r()*3);
  for(let b=0;b<nb;b++){const u0=0.3+r()*0.5,p0=main.curve.getPointAt(u0),t0=main.curve.getTangentAt(u0);let bd=Math.atan2(t0.z,t0.x)+(r()<0.5?1:-1)*(0.8+r()*0.7);
    const bp=[p0.clone()];let bx=p0.x,bz=p0.z,by=p0.y;const m=4+Math.floor(r()*4);
    for(let i=0;i<m;i++){bd+=(r()-0.5)*0.9;const l=11+r()*8;bx+=Math.cos(bd)*l;bz+=Math.sin(bd)*l;const g=tH(bx,bz);by=clamp(by+(r()-0.74)*9,g-85,g-12);bp.push(new THREE.Vector3(bx,by,bz))}
    tubes.push(mk(bp,3.1,[[0.96,0.08,5+r()*3]]))}
  // samples for collision, lighting and placement (about 1 m apart)
  const samples=[];
  tubes.forEach((t,ti)=>{const ns=Math.ceil(t.len);t.s0=samples.length;for(let k=0;k<=ns;k++){const u=k/ns,p=t.curve.getPointAt(u),rr=t.rad(u);samples.push({x:p.x,y:p.y,z:p.z,rr,fy:p.y-rr*0.55,u,t:ti})}t.s1=samples.length});
  const grid=new Map(),gk=(x,z)=>Math.floor(x/8)+','+Math.floor(z/8);
  samples.forEach((s,i)=>{const k=gk(s.x,s.z);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i)});
  // content
  const kind=r()<0.4?'lumari':r()<0.6?'hive':'quiet';
  const pick=(ti,u0,u1)=>{const t=tubes[ti],k=t.s0+Math.floor((u0+r()*(u1-u0))*(t.s1-t.s0-1)),s=samples[k];return s};
  const side=(s,f)=>{const a=r()*TAU;return{x:s.x+Math.cos(a)*s.rr*f,z:s.z+Math.sin(a)*s.rr*f}};
  const deps=[],wt=kind==='lumari'?[['crystal',3],['resonite',3],['ice',2],['titanium',2],['iron',1]]:[['iron',3],['titanium',3],['crystal',2],['ice',2],['silica',1]];
  const wsum=wt.reduce((a,b)=>a+b[1],0);const nd=9+Math.floor(r()*6);
  for(let i=0;i<nd;i++){const ti=Math.floor(r()*tubes.length),s=pick(ti,ti?0.15:0.18,0.95),p=side(s,0.5);let q=r()*wsum,type=wt[0][0];for(const[t,w]of wt){if((q-=w)<0){type=t;break}}
    const u=DEP[type].units;deps.push({id:`c${e.id}_${i}`,type,x:p.x,y:s.fy-0.05,z:p.z,max:u[0]+Math.floor(r()*(u[1]-u[0]+1)),cave:e.id})}
  const ms=samples[main.s1-6];
  const myst=e.story?'cathedral':['cathedral','icelake','lavafall','carvings'][Math.floor(r()*4)];
  const loot=r()<0.45?(()=>{const s=pick(0,0.3,0.8),p=side(s,0.45);return{id:'L'+e.id,x:p.x,y:s.fy,z:p.z,table:'cave'}})():null;
  const spots=[];for(let i=0;i<4;i++){const ti=i%tubes.length,s=pick(ti,0.3,0.98);spots.push({x:s.x,y:s.fy,z:s.z})}
  const unstable=[];for(let i=0;i<2;i++){const s=pick(0,0.25,0.9);unstable.push({x:s.x,y:s.y,z:s.z,r:s.rr})}
  // the deepest point of the cave: if it's deep enough, a crystal grotto with a vault of rare finds
  let deep=null,dd=0;for(const s of samples){const d=tH(s.x,s.z)-s.fy;if(d>dd){dd=d;deep=s}}
  const vault=dd>30&&deep?{id:'V'+e.id,x:deep.x,y:deep.fy,z:deep.z,table:'deep',depth:Math.round(dd)}:null;
  D={e,tubes,samples,grid,gk,kind,deps,myst,mystAt:{x:ms.x,y:ms.fy,z:ms.z},loot,spots,unstable,vault};
  caveCache.set(e.id,D);if(caveCache.size>40)caveCache.delete(caveCache.keys().next().value);
  return D;
}
function caveDepDesc(id){const m=/^c(cv.*)_(\d+)$/.exec(id);if(!m)return null;const eid=m[1];
  const e=eid==='cvL'?fixedEntrances()[0]:(()=>{const mm=/^cv(-?\d+)_(-?\d+)$/.exec(eid);return mm?cellEntrance(+mm[1],+mm[2]):null})();
  if(!e)return null;return caveData(e).deps.find(d=>d.id===id)||null}
/* ---------- meshes (built when you are near, disposed when far) ---------- */
function buildCaveMesh(D){
  const g=new THREE.Group(),nz=makeNoise(strHash(D.e.id)+3),deep=D.kind==='lumari'?[0.1,0.16,0.18]:[0.15,0.11,0.1];
  for(const t of D.tubes){
    const TS_=Math.ceil(t.len/1.1),RS=14,geo=new THREE.TubeGeometry(t.curve,TS_,1,RS,false),pos=geo.attributes.position,col=new Float32Array(pos.count*3);
    for(let j=0;j<=TS_;j++){const u=j/TS_,P0=t.curve.getPointAt(u),rr=t.rad(u),fy=P0.y-rr*0.55;
      for(let k=0;k<=RS;k++){const i=j*(RS+1)+k;_v1.set(pos.getX(i),pos.getY(i),pos.getZ(i)).sub(P0);
        const n=nz(pos.getX(i)*0.22+pos.getY(i)*0.1,pos.getZ(i)*0.22-pos.getY(i)*0.13);
        _v1.multiplyScalar(rr*(1+0.17*n));let yy=P0.y+_v1.y;const floor=yy<=fy+0.3;if(yy<fy)yy=fy+n*0.12;
        pos.setXYZ(i,P0.x+_v1.x,yy,P0.z+_v1.z);
        const band=0.5+0.5*Math.sin(yy*2.1+n*2),v=0.85+n*0.25;
        col[i*3]=(floor?0.4:deep[0]+band*0.1)*v;col[i*3+1]=(floor?0.21:deep[1]+band*0.05)*v;col[i*3+2]=(floor?0.13:deep[2]+band*0.05)*v}}
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    if(t.start){ // open the tunnel where it breaks through the ground
      const idx=geo.index.array,keep=[];
      for(let i=0;i<idx.length;i+=3){let above=0;for(let k=0;k<3;k++){const v=idx[i+k];if(pos.getY(v)>groundHeight(pos.getX(v),pos.getZ(v))-0.4)above++}if(above<3)keep.push(idx[i],idx[i+1],idx[i+2])}
      geo.setIndex(keep)}
    geo.computeVertexNormals();g.add(new THREE.Mesh(geo,caveMat));
    const ue=1,c=t.curve.getPointAt(ue),cap=new THREE.Mesh(new THREE.CircleGeometry(t.rad(ue)*1.35,20),capMat);cap.position.copy(c);cap.lookAt(_v1.copy(c).add(t.curve.getTangentAt(ue)));g.add(cap);
  }
  // a rock shaft lines the sinkhole all the way down to the tunnel floor (open on the side the tunnel leads off)
  {const t0=D.tubes[0],dir=Math.atan2(t0.curve.getPointAt(0.12).x-D.e.x,t0.curve.getPointAt(0.12).z-D.e.z),gTop=groundHeight(D.e.x+HOLE_R,D.e.z)+0.4,s0=D.samples[t0.s0+8]||D.samples[t0.s0],floorY=Math.min(s0.fy,D.samples[t0.s0].fy)-1;
   const h=Math.max(2,gTop-floorY),gap=1.15;
   const back=new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R+0.25,HOLE_R+0.05,h,28,4,true,dir+gap,TAU-gap*2),shaftMat);back.position.set(D.e.x,gTop-h/2,D.e.z);g.add(back);
   const lip=new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R+0.25,HOLE_R+0.2,2.2,12,1,true,dir-gap,gap*2),shaftMat);lip.position.set(D.e.x,gTop-1.1,D.e.z);g.add(lip);
   const cap=new THREE.Mesh(new THREE.CircleGeometry(t0.rad(0)*1.3,20),capMat);const c0=t0.curve.getPointAt(0);cap.position.copy(c0);cap.lookAt(_v1.copy(c0).sub(t0.curve.getTangentAt(0)));g.add(cap)}
  // rocks ringing the sinkhole hide the edge of the cut
  const r=mulberry(strHash(D.e.id)+9);
  for(let i=0;i<16;i++){const a=i/16*TAU+r()*0.2,d=HOLE_R+0.6+r()*1.2,x=D.e.x+Math.cos(a)*d,z=D.e.z+Math.sin(a)*d,s=0.8+r()*1.3;
    const m=mesh(rockGeo,mat('#4a3027',{flatShading:true}),x,groundHeight(x,z)-0.2,z);m.scale.set(s*1.3,s,s*1.2);m.rotation.set(r()*3,r()*3,r()*3);g.add(m)}
  // the deep chamber's discovery
  const M_=MYST[D.myst],mp=D.mystAt,mg=mkMystery(D.myst,r,7);mg.position.set(mp.x,mp.y,mp.z);g.add(mg);
  // glowing details
  if(D.kind==='lumari')for(const s of D.spots){const f=mkGlowFungus(r);f.position.set(s.x,s.y,s.z);g.add(f)}
  if(D.kind==='hive'){const s=D.spots[0],h=mkHive(r);h.position.set(s.x,s.y,s.z);g.add(h)}
  for(const u of D.unstable){const c=mkCracks(r);c.position.set(u.x,u.y+u.r*0.7,u.z);g.add(c)}
  // the deep vault: a grotto of glowing crystals around a cache of rare finds
  if(D.vault){const v=D.vault,vg=new THREE.Group();vg.position.set(v.x,v.y,v.z);const cm=mat('#9ff0ff',{emissive:'#5fd8ff',emissiveIntensity:1.5,roughness:0.15,transparent:true,opacity:0.9});
    for(let i=0;i<14;i++){const a=i/14*TAU+r()*0.3,d=1.8+r()*1.6,L=0.8+r()*2.2,c=mesh(shared('vcry',()=>new THREE.CylinderGeometry(0.0,0.22,1,6)),cm,Math.cos(a)*d,L/2,Math.sin(a)*d);c.scale.set(1,L,1);c.rotation.set((r()-0.5)*0.6,r()*3,(r()-0.5)*0.6);vg.add(c)}
    const vl=new THREE.PointLight(0x7fe8ff,12,16,1.4);vl.position.y=1.5;vg.add(vl);g.add(vg)}
  g.userData.mystColor=M_.color;
  return g;
}
function mkMystery(type,r,rr){
  const g=new THREE.Group();
  if(type==='cathedral'){const m=mat('#d8ecff',{roughness:0.15,transparent:true,opacity:0.88,emissive:'#9fcfff',emissiveIntensity:0.45});
    for(let i=0;i<16;i++){const L=5+r()*9,b=mesh(rbox(0.7,L,0.7,0.12),m,(r()-0.5)*rr*1.1,L*0.3,(r()-0.5)*rr*1.1);b.rotation.set((r()-0.5)*1.6,r()*3,(r()-0.5)*1.6);g.add(b)}}
  else if(type==='icelake'){g.add(cy(rr*0.75,rr*0.75,0.25,32,mat('#9fd8ff',{roughness:0.04,metalness:0.3,emissive:'#3a8acc',emissiveIntensity:0.6}),0,0.12,0));
    const m=mat('#d6f1ff',{transparent:true,opacity:0.8,roughness:0.1,emissive:'#6ab8ff',emissiveIntensity:0.5});
    for(let i=0;i<7;i++){const a=r()*TAU,d=rr*(0.3+r()*0.4);g.add(cy(0.4+r()*0.5,0.8+r()*0.6,3+r()*5,8,m,Math.cos(a)*d,2,Math.sin(a)*d))}}
  else if(type==='lavafall'){const ob=mat('#141012',{roughness:0.12,metalness:0.4}),vein=mat('#ffcf6a',{emissive:'#ffb040',emissiveIntensity:2.2});
    for(let i=0;i<10;i++){const s=mesh(shared('ico',()=>new THREE.IcosahedronGeometry(1,0)),ob,(r()-0.5)*rr,1+r()*3,(r()-0.5)*rr);s.scale.set(1.5+r()*2,1+r()*2.5,1.5+r()*2);g.add(s)}
    for(let i=0;i<8;i++){const v=mesh(rbox(0.12,3+r()*4,0.12,0.04),vein,(r()-0.5)*rr,2+r()*3,(r()-0.5)*rr);v.rotation.set(r()*2,r()*3,r()*2);g.add(v)}}
  else{const st=mat('#2a2630',{roughness:0.6}),gl=mat('#6fe0c8',{emissive:'#6fe0c8',emissiveIntensity:1.6});
    for(let i=0;i<6;i++){const a=i/6*TAU,p=mesh(rbox(1.2,5,0.8,0.2),st,Math.cos(a)*rr*0.6,2.5,Math.sin(a)*rr*0.6);p.rotation.y=-a;g.add(p);
      for(let k=0;k<4;k++)g.add(rot(mesh(rbox(0.5,0.08,0.05,0.02),gl,Math.cos(a)*rr*0.6-Math.sin(a)*0.42,1.2+k*0.9,Math.sin(a)*rr*0.6+Math.cos(a)*0.42),'y',-a))}
    g.add(cy(1.4,1.6,0.6,12,st,0,0.3,0));g.add(sp(0.5,gl,0,1.3,0,14,10))}
  return g;
}
function mkGlowFungus(r){const g=new THREE.Group(),m=mat('#6fe0c8',{emissive:'#3fd0b8',emissiveIntensity:1.4});
  for(let i=0;i<7;i++){const x=(r()-0.5)*3,z=(r()-0.5)*3,h=0.3+r()*0.8;g.add(cy(0.04,0.06,h,5,'#c9d8d0',x,h/2,z));const c=mesh(shared('cap',()=>new THREE.SphereGeometry(0.3,10,6,0,TAU,0,Math.PI/2)),m,x,h,z);c.scale.setScalar(0.6+r()*0.8);g.add(c)}return g}
function mkHive(r){const g=new THREE.Group(),m=mat('#3a2f3d',{roughness:0.6}),gl=mat('#ff5a4f',{emissive:'#ff3a2f',emissiveIntensity:1.2});
  for(let i=0;i<8;i++){const s=mesh(shared('dode',()=>new THREE.DodecahedronGeometry(1,0)),m,(r()-0.5)*4,0.4+r()*1.4,(r()-0.5)*4);s.scale.set(0.8+r(),0.5+r()*0.6,0.8+r());g.add(s)}
  for(let i=0;i<5;i++)g.add(sp(0.12,gl,(r()-0.5)*3,0.6+r(),(r()-0.5)*3,8,6));return g}
function mkCracks(r){const g=new THREE.Group(),m=mat('#140d0a',{roughness:1});for(let i=0;i<6;i++){const b=mesh(rbox(0.06,0.04,1.5+r()*2,0.02),m,(r()-0.5)*3,0,(r()-0.5)*3);b.rotation.y=r()*3;g.add(b)}return g}
/* ---------- queries used by physics, camera and lighting ---------- */
function activeNets(){return cave.nets}
function caveQuery(x,z,y){
  let best=null,bs=1e9,bd=0;
  for(const N of cave.nets.values()){const D=N.D,k0=Math.floor(x/8),k1=Math.floor(z/8);
    for(let i=k0-1;i<=k0+1;i++)for(let j=k1-1;j<=k1+1;j++){const arr=D.grid.get(i+','+j);if(!arr)continue;
      for(const si of arr){const s=D.samples[si],d=Math.hypot(s.x-x,s.z-z);if(d>s.rr*1.1)continue;
        const vy=y==null?0:Math.abs((y+1)-(s.fy+s.rr*0.5)),score=d/s.rr+vy*0.15;if(score<bs){bs=score;best=s;bd=d}}}}
  return best?{s:best,d:bd}:null;
}
function underground(x,z,y){return y<groundHeight(x,z)-1.2||inHole(x,z)}
function caveNear(pos){if(!cave.nets.size)return false;const c=caveQuery(pos.x,pos.z,pos.y);return!!c&&pos.y<c.s.y+c.s.rr&&pos.y>c.s.fy-3&&underground(pos.x,pos.z,pos.y)}
function floorAt(x,z,y){
  const tH=groundHeight(x,z);if(!cave.nets.size)return tH;if(y==null)y=tH;
  const hole=inHole(x,z);if(!hole&&y>tH-1.2)return tH;
  const c=caveQuery(x,z,y);if(c&&c.d<c.s.rr*0.95)return c.s.fy;
  return hole?tH-30:tH;
}
function caveCeil(x,z,y){if(!cave.nets.size||!underground(x,z,y))return Infinity;const c=caveQuery(x,z,y);return c?c.s.y+c.s.rr*0.72:Infinity}
function caveCollide(pos){
  // inside a sinkhole you can't walk out through its walls into empty space
  for(const e of entrancesNear(pos.x,pos.z,HOLE_R+3)){const d=Math.hypot(pos.x-e.x,pos.z-e.z);if(d<HOLE_R-0.45||d>HOLE_R+2.5)continue;if(pos.y>groundHeight(pos.x,pos.z)-1)continue;
    const c=caveQuery(pos.x,pos.z,pos.y);if(c&&c.d<c.s.rr*0.8)continue;const k=(HOLE_R-0.45)/d;pos.x=e.x+(pos.x-e.x)*k;pos.z=e.z+(pos.z-e.z)*k}
  if(!underground(pos.x,pos.z,pos.y)||inHole(pos.x,pos.z))return;const c=caveQuery(pos.x,pos.z,pos.y);
  if(!c){let best=null,bd=1e9;for(const N of cave.nets.values())for(const s of N.D.samples){const d=Math.hypot(s.x-pos.x,s.z-pos.z)+Math.abs(s.fy-pos.y)*0.5;if(d<bd){bd=d;best=s}}if(best&&bd<30){pos.x=best.x;pos.z=best.z;pos.y=Math.max(pos.y,best.fy)}return}
  const s=c.s,m=s.rr*0.8;if(c.d>m&&c.d>0.001){pos.x=s.x+(pos.x-s.x)/c.d*m;pos.z=s.z+(pos.z-s.z)/c.d*m}
}
function caveCamClamp(){
  for(let i=0;i<10;i++){const p=camera.position;if(!underground(p.x,p.z,p.y))break;const c=caveQuery(p.x,p.z,p.y);
    if(c&&c.d<c.s.rr*0.8&&p.y<c.s.y+c.s.rr*0.7&&p.y>c.s.fy+0.6)break;camera.position.lerp(cam.target,0.3)}
  camera.lookAt(cam.target);
}
/* ---------- streaming, lighting & discoveries ---------- */
function updateCaves(dt){
  if(!S)return;const f=focusPos();
  if((cave.scanT=(cave.scanT||0)-dt)<=0){cave.scanT=1;
    const want=new Set();
    for(const e of entrancesNear(f.x,f.z,460)){want.add(e.id);if(!cave.nets.has(e.id)){const D=caveData(e),g=buildCaveMesh(D);scene.add(g);cave.nets.set(e.id,{D,g});
      for(const d of D.deps)addDepMesh(d);if(D.loot&&typeof addLootSpot==='function')addLootSpot(D.loot);if(D.vault&&typeof addLootSpot==='function')addLootSpot(D.vault)}}
    for(const[id,N]of cave.nets)if(!want.has(id)&&!entrancesNear(f.x,f.z,640).some(e=>e.id===id)){scene.remove(N.g);disposeObj(N.g);for(const d of N.D.deps)removeDepMesh(d.id);if(N.D.loot&&typeof removeLootSpot==='function')removeLootSpot(N.D.loot.id);if(N.D.vault&&typeof removeLootSpot==='function')removeLootSpot(N.D.vault.id);cave.nets.delete(id)}
  }
  const p=P.mode==='foot'?P.pos:R.pos,tH=groundHeight(p.x,p.z);
  cave.depth=Math.max(0,tH-p.y);const was=cave.active;cave.active=P.mode==='foot'&&cave.nets.size>0&&cave.depth>2&&!!caveQuery(p.x,p.z,p.y);
  if(cave.active){const c=caveQuery(p.x,p.z,p.y);for(const[id,N]of cave.nets)if(N.D.samples.includes(c.s)){cave.inId=id;break}}
  if(cave.active&&!was){if(!S.caves[cave.inId]){S.caves[cave.inId]={seen:true};radio(crewName('Geologist'),'You’re underground. No sunlight, and the rock blocks most radiation. Watch your oxygen, and mark the way back with lamps.','crew')}sfx(1,300,0.5,0.06,'lowpass')}
  // light the nearest glowing features
  const c=camera.position,feats=[];
  for(const N of cave.nets.values()){const D=N.D;feats.push({x:D.mystAt.x,y:D.mystAt.y+5,z:D.mystAt.z,col:N.g.userData.mystColor,k:30});
    if(D.kind==='lumari')for(const s of D.spots)feats.push({x:s.x,y:s.y+2,z:s.z,col:'#3fd0b8',k:14});
    if(D.kind==='hive')feats.push({x:D.spots[0].x,y:D.spots[0].y+1.5,z:D.spots[0].z,col:'#ff4a3d',k:10})}
  feats.sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y,a.z-c.z)-Math.hypot(b.x-c.x,b.y-c.y,b.z-c.z));
  caveLights.forEach((l,i)=>{const s=feats[i];if(s&&Math.hypot(s.x-c.x,s.z-c.z)<70&&cave.depth>1){l.position.set(s.x,s.y,s.z);l.color.set(s.col);l.intensity=s.k}else l.intensity=0});
}
// darkness grows as you descend (applied after updateEnv each frame)
function caveEnv(){
  const k=smooth(1,9,cave.depth)*(P.mode==='foot'?1:0);
  $('#compass').style.visibility=k>0.8?'hidden':'';
  stormPts.visible=k<0.5;
  if(k<=0)return;
  sun.intensity*=1-k;hemi.intensity=lerp(hemi.intensity,0.55,k);hemi.color.lerp(_c3.setRGB(0.28,0.32,0.42),k);hemi.groundColor.lerp(_c3.setRGB(0.09,0.06,0.05),k);
  scene.fog.color.lerp(_c3.setRGB(0.008,0.006,0.006),k);scene.fog.near=lerp(scene.fog.near,10,k);scene.fog.far=lerp(scene.fog.far,90,k);
  renderer.toneMappingExposure=lerp(renderer.toneMappingExposure,1.15,k);
  for(const d of devils)if(k>0.5)d.pts.visible=false;
}
function nearMystery(){for(const N of cave.nets.values()){const m=N.D.mystAt;if(Math.hypot(m.x-P.pos.x,m.z-P.pos.z)<10&&Math.abs(m.y-P.pos.y)<6)return N}return null}
function studyMystery(N){if(typeof unlockTech==='function')unlockTech('crystal');
  S.caves[N.D.e.id]=S.caves[N.D.e.id]||{};if(S.caves[N.D.e.id].myst)return;S.caves[N.D.e.id].myst=true;
  const M_=MYST[N.D.myst];S.flags.caveMystery=true;S.discoveries=(S.discoveries||0)+1;act({a:'discover',id:N.D.e.id,kind:'cave'});
  if(N.D.myst==='carvings'&&typeof learnWords==='function')learnWords('tharrak',4);
  card(M_.name,`Major discovery · +${M_.rp} RP`,M_.text,M_.color);SFX.radio();beep(1200,0.08);beep(1600,0.1,'sine',0.06,0.09);
}
function clearCaves(){for(const N of cave.nets.values()){scene.remove(N.g);disposeObj(N.g)}cave.nets.clear();entMemo.clear();caveCache.clear();cave.active=false;cave.depth=0;caveLights.forEach(l=>l.intensity=0)}
function resetExpansion(){clearCaves();if(typeof clearWorld==='function'){clearWorld();clearCreatures()}if(typeof closeDialogue==='function'&&game.dialogue)closeDialogue();while(npcs.length)npcGroup.remove(npcs.pop().g);for(const m of meteors)scene.remove(m.g);meteors.length=0;game.shake=0}
CHAPTERS[3].objs.splice(1,0,{id:'cave',text:'Explore inside a lava tube and find what lies at its end',check:()=>S.flags.caveMystery});
GUIDES.cave=()=>{const e=fixedEntrances()[0];if(!e)return null;const f=focusPos();
  if(cave.active){const N=cave.nets.get('cvL')||[...cave.nets.values()][0];if(N){const m=N.D.mystAt;return{x:m.x,z:m.z,r:6,text:'Follow the tunnel down to the deep chamber',near:'Hold <span class="key">F</span> to study it'}}}
  return{x:e.x,z:e.z,r:HOLE_R+2,text:'Walk down into the lava tube',near:P.mode==='foot'?'Walk into the opening':'Get out of the rover first (<span class="key">E</span>)'}};

/* ---------- depth zones: the deeper you go, the rarer the finds ---------- */
const DEPTH_ZONES=[[18,'The Lava Tubes','Ancient lava carved these tunnels billions of years ago. Lava tubes could shelter future explorers from radiation.'],
  [32,'The Deep Caverns','Rare crystals grow down here. Somewhere at the bottom of a cave this deep there is a vault of rare finds.'],
  [50,'The Abyss','Few have come this deep. The rock is warm, and the crystals glow on their own.']];
function updateDepthZones(){if(!S)return;const d=cave.active?cave.depth:0;S.stats.deepest=Math.max(S.stats.deepest||0,Math.round(d));
  let z=-1;for(let i=0;i<DEPTH_ZONES.length;i++)if(d>=DEPTH_ZONES[i][0])z=i;
  if(z>(cave.zone??-1)){const Z=DEPTH_ZONES[z];if(typeof banner==='function')banner(Z[1],`${Math.round(d)} m below the surface`);else toast(Z[1],'good');radio('Mission Control',Z[2],'sys')}
  cave.zone=cave.active?Math.max(z,cave.zone??-1):-1;
  if(cave.active&&typeof pipSay==='function')for(const N of cave.nets.values()){const v=N.D.vault;if(v&&!S.loot[v.id]&&Math.hypot(v.x-P.pos.x,v.z-P.pos.z)<30)pipSay('vault','I’m picking up a strong energy signature nearby: something valuable is down here!',120)}}
setInterval(()=>{if(game.state==='play')updateDepthZones()},700);
