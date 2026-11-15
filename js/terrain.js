'use strict';

/* =========================================================
   TERRAIN
   ========================================================= */
let SITE=SITES.jezero,N1,N2,N3,N4,landingH=0;
const TS={h:0,ice:0,dune:0,crater:0,mtn:0,terr:0,iceB:0,crys:0},TS2={...TS},TS3={...TS};
/* ---------- ice biome: a frozen plain with mountains of blue ice crystal ----------
   The site's first ice patch (SITE.ice[0]) is the biome; on the Ice-rich Plains the whole site is one.
   Each crystal mountain is a sharp, six-sided spike in the ground itself (so you can climb it and can't walk through it),
   with a crystal model on top. */
const ICE_G=72;
function iceBiomeW(x,z){if(SITE.iceWorld)return 1;let w=0;for(const b of SITE.ice.slice(0,1)){const d=Math.hypot(x-b[0],z-b[1]);w=Math.max(w,1-smooth(b[2]*0.78,b[2],d))}return w}
// the crystal spike in grid cell (gx,gz), or null
function iceSpike(gx,gz){
  const h=hash2(gx,gz,SITE.seed+911);if(h>(SITE.iceWorld?0.36:0.6))return null;
  const x=(gx+0.2+0.6*hash2(gx,gz,SITE.seed+912))*ICE_G,z=(gz+0.2+0.6*hash2(gx,gz,SITE.seed+913))*ICE_G;
  if(x*x+z*z<200*200)return null;const w=iceBiomeW(x,z);if(w<0.9)return null;
  const a=hash2(gx,gz,SITE.seed+914),b=hash2(gx,gz,SITE.seed+915);
  return{x,z,r:11+a*20,h:24+Math.pow(b,1.4)*70,rot:a*1.05}}
function iceSpikes(x,z,o){
  let v=0,c=0;const gx=Math.floor(x/ICE_G),gz=Math.floor(z/ICE_G);
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const sp=iceSpike(gx+i,gz+j);if(!sp)continue;
    const dx=x-sp.x,dz=z-sp.z,ca=Math.cos(sp.rot),sa=Math.sin(sp.rot),u=Math.abs(dx*ca-dz*sa),w=Math.abs(dx*sa+dz*ca);
    const t=Math.max(u*0.866+w*0.5,w)/sp.r;if(t>=1)continue;const hv=sp.h*Math.pow(1-t,1.15);if(hv>v)v=hv;c=Math.max(c,1-t)}
  o.crys=c;return v}

function craters(x,z,o){
  const CR=230;let h=0,c=0;
  const cx=Math.floor(x/CR),cz=Math.floor(z/CR);
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
    const gx=cx+i,gz=cz+j;
    if(hash2(gx,gz,SITE.seed)>SITE.craters)continue;
    const px=(gx+0.15+0.7*hash2(gx,gz,SITE.seed+1))*CR,pz=(gz+0.15+0.7*hash2(gx,gz,SITE.seed+2))*CR;
    if(px*px+pz*pz<210*210)continue;
    const rr=hash2(gx,gz,SITE.seed+3),R=14+rr*rr*72;
    const dx=x-px,dz=z-pz,d=Math.sqrt(dx*dx+dz*dz)/R;
    if(d>2.4)continue;
    const depth=R*0.22,rim=R*0.07;let v;
    if(d<1){v=-depth*(1-d*d)+rim*d*d*d*d;v=Math.max(v,-depth*0.72);c=Math.max(c,1-d)}
    else v=rim*Math.exp(-(d-1)*3.2);
    h+=v;
  }
  o.crater=c;return h;
}
function rawSample(x,z,o){
  o.terr=0;o.mtn=0;
  let h=fbm(N1,x*0.0022,z*0.0022,4)*SITE.hills;
  // mountain ranges on every site (sites with big ranges keep them): ridged peaks up to ~170 m
  const dO=Math.hypot(x,z),mm=smooth(-0.25,0.45,N2(x*0.0007+31,z*0.0007-17))*Math.max(SITE.mtn,0.6)*(SITE.rangesFar?smooth(SITE.rangesFar-350,SITE.rangesFar,dO):1);
  let mt=0;
  if(mm>0.001){const r=ridged(N2,x*0.0024,z*0.0024);const rr=Math.max(0,r-0.3)/0.7;mt=rr*mm;h+=rr*rr*170*mm+smooth(0.2,0.9,rr)*N1(x*0.012,z*0.012)*6*mm}
  const dm=smooth(0.15,0.55,N3(x*0.0011-50,z*0.0011+20))*SITE.dunes;
  if(dm>0.001){const u=x*0.8+z*0.6+N1(x*0.01,z*0.01)*12;const s=0.5+0.5*Math.sin(u*0.11);h+=s*s*s*7*dm}
  h+=craters(x,z,o);
  if(SITE.rim){const d=dO,R=SITE.rim[0],W=SITE.rim[2]||190;h+=SITE.rim[1]*Math.exp(-(((d-R)/W)**2))*(0.75+0.25*N2(x*0.004,z*0.004))+(d>R?SITE.rim[1]*0.45*smooth(R,R+700,d):0)}
  for(const f of SITE.features){
    const d2=((x-f.x)**2+(z-f.z)**2)/(f.r*f.r);
    if(d2<4){
      const g=Math.exp(-d2*2.2),t=Math.sqrt(d2);let fh;
      if(f.cone){fh=f.h*Math.pow(Math.max(0,1-t),1.25)+f.h*0.1*Math.exp(-t*t*2);fh*=0.9+0.1*N3(x*0.012,z*0.012);if(f.caldera&&t<0.16){fh-=(0.16-t)/0.16*f.h*0.22}h+=fh;continue}
      if(f.peak){if(t>=1)continue;fh=f.h*Math.pow(1-t,1.7)*(0.85+0.3*Math.max(0,ridged(N1,x*0.02,z*0.02)));h+=fh;o.mtn=Math.max(o.mtn,(1-t)*0.9);continue}
      fh=f.h*g*(0.88+0.12*N3(x*0.01,z*0.01));
      if(f.terrace){const k=fh/f.terrace,fl=Math.floor(k);fh=(fl+smooth(0,0.4,k-fl))*f.terrace;o.terr=Math.max(o.terr,g)}
      if(f.caldera&&d2<0.07)fh-=(0.07-d2)/0.07*70;
      h+=fh;
    }
  }
  h+=N4(x*0.045,z*0.045)*0.9+N4(x*0.11+7,z*0.11)*0.3;
  let ice=smooth(SITE.iceTh,SITE.iceTh+0.18,N4(x*0.0013-200,z*0.0013+80)*0.5+0.5);
  for(const b of SITE.ice){const d=Math.hypot(x-b[0],z-b[1]);ice=Math.max(ice,1-smooth(b[2]*0.45,b[2],d))}
  // inside the ice biome the ground flattens into a frozen plain, then the crystal mountains rise out of it
  const ib=iceBiomeW(x,z);let dmo=dm,mto=Math.max(mt,o.mtn||0);o.crys=0;
  if(ib>0){const base=fbm(N1,x*0.0016,z*0.0016,2)*4;h=lerp(h,base+(SITE.iceWorld?0:Math.min(h,base+20)*0.3),ib*0.9);dmo*=1-ib;mto*=1-ib;o.crater*=1-ib;h+=iceSpikes(x,z,o)*ib;ice=Math.max(ice,ib)}
  o.h=h;o.ice=ice;o.dune=dmo;o.mtn=mto;o.iceB=ib;
}
function sample(x,z,o){
  rawSample(x,z,o);
  const d=Math.hypot(x,z),f=smooth(55,170,d);
  if(f<1){o.h=lerp(landingH,o.h,f);o.crater*=f;o.dune*=f;o.mtn*=f;o.crys*=f}
  if(typeof caveBowl==='function')o.h-=caveBowl(x,z);
  if(typeof spireH==='function')o.h+=spireH(x,z);
}
const hCache=new Map();
const digMap=new Map();      // grid point -> height change from vacuum digging
const minedRocks=new Set();  // rocks vacuumed up
const dirtyChunks=new Set();
const gkey=(gx,gz)=>(gx+60000)*131072+(gz+60000);
function H(x,z){
  const gx=Math.round(x/CELL),gz=Math.round(z/CELL),k=gkey(gx,gz);
  let v=hCache.get(k);
  if(v===undefined){sample(gx*CELL,gz*CELL,TS2);v=TS2.h;if(hCache.size>90000)hCache.clear();hCache.set(k,v)}
  const d=digMap.get(k);return d?v+d:v;
}
// lower the ground around (x,z); returns how much soil was removed
function digAt(x,z,amt){
  const RR=4.6;let moved=0;
  for(let gx=Math.floor((x-RR)/CELL);gx<=Math.ceil((x+RR)/CELL);gx++)for(let gz=Math.floor((z-RR)/CELL);gz<=Math.ceil((z+RR)/CELL);gz++){
    const px=gx*CELL,pz=gz*CELL,d=Math.hypot(px-x,pz-z);if(d>RR)continue;
    const k=gkey(gx,gz),cur=digMap.get(k)||0,nd=Math.max(-6,cur-amt*(1-d/RR));if(nd>=cur)continue;
    moved+=cur-nd;digMap.set(k,nd);
    for(const ox of[-CELL,CELL])for(const oz of[-CELL,CELL])dirtyChunks.add(Math.floor((px+ox)/CHUNK)+','+Math.floor((pz+oz)/CHUNK));
  }
  return moved;
}
function rebuildDirtyChunks(){
  for(const k of dirtyChunks){const c=chunks.get(k);if(c){disposeChunk(c);chunks.set(k,buildChunk(c.cx,c.cz))}}
  dirtyChunks.clear();
}
// height matching the rendered triangle mesh exactly
function groundHeight(x,z){
  const gx=Math.floor(x/CELL),gz=Math.floor(z/CELL),u=x/CELL-gx,v=z/CELL-gz,x0=gx*CELL,z0=gz*CELL;
  const h10=H(x0+CELL,z0),h01=H(x0,z0+CELL);
  if(u+v<=1){const h00=H(x0,z0);return h00+(h10-h00)*u+(h01-h00)*v}
  const h11=H(x0+CELL,z0+CELL);return h11+(h01-h11)*(1-u)+(h10-h11)*(1-v);
}

const TC={dust:new THREE.Color('#d48a55'),rust:new THREE.Color('#b0532c'),deep:new THREE.Color('#843820'),basalt:new THREE.Color('#4e2c24'),
  sand:new THREE.Color('#5e3a2e'),frost:new THREE.Color('#e8d3c6'),iceSheet:new THREE.Color('#e4edf2'),iceBlue:new THREE.Color('#6eaee6'),iceDeep:new THREE.Color('#3f78c0'),crater:new THREE.Color('#9a4527'),layerA:new THREE.Color('#d6a072'),layerB:new THREE.Color('#9c5636'),dug:new THREE.Color('#6e321d')};
const _tc=new THREE.Color();
function terrainColor(x,z,s,slope,out){
  const n=N4(x*0.02+3,z*0.02)*0.5+0.5,n2=N3(x*0.006,z*0.006)*0.5+0.5;
  out.copy(TC.rust).lerp(TC.dust,clamp(n2*0.9+n*0.3-0.15,0,1));
  if(s.crater>0)out.lerp(TC.crater,clamp(s.crater*1.5,0,0.6));
  if(s.terr>0.02){const band=0.5+0.5*Math.sin(s.h*1.3);_tc.copy(TC.layerB).lerp(TC.layerA,band);out.lerp(_tc,clamp(s.terr*1.2,0,0.85))}
  if(slope>0.35){const k=smooth(0.35,1.1,slope),band=0.5+0.5*Math.sin(s.h*0.9+n*2);_tc.copy(TC.deep).lerp(TC.layerB,band*0.6);out.lerp(_tc,k*0.85)}
  if(s.mtn>0.1)out.lerp(TC.basalt,smooth(0.1,0.6,s.mtn)*0.7);
  if(s.dune>0.05)out.lerp(TC.sand,smooth(0.05,0.5,s.dune)*0.75);
  if(SITE.dark)out.lerp(TC.basalt,SITE.dark*0.6);
  if(s.ice>0.35&&slope<0.6)out.lerp(TC.frost,smooth(0.35,1,s.ice)*0.42*(1-slope));
  if(s.iceB>0.01){out.lerp(TC.iceSheet,s.iceB*0.82);if(s.crys>0.01){_tc.copy(TC.iceBlue).lerp(TC.iceDeep,smooth(0.3,1,s.crys)*0.6);out.lerp(_tc,smooth(0,0.18,s.crys)*s.iceB)}}
  const v=0.92+n*0.16;out.r*=v;out.g*=v;out.b*=v;
}

const terrainMat=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:false,roughness:0.97,metalness:0}); // smooth, rolling hills
const rockGeo=new THREE.DodecahedronGeometry(1,0);
{const p=rockGeo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+0.28*Math.sin(x*12.9+y*78.2+z*37.7);p.setXYZ(i,x*k,y*k*0.8,z*k)}rockGeo.computeVertexNormals()}
const rockMat=new THREE.MeshStandardMaterial({color:'#ffffff',flatShading:true,roughness:0.9});
const terrainGroup=new THREE.Group();scene.add(terrainGroup);
const chunks=new Map();
const _col=new THREE.Color(),_m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_e=new THREE.Euler();

function buildChunk(cx,cz){
  const n=NSEG+1,ox=cx*CHUNK,oz=cz*CHUNK,W=n+2;
  const hg=new Float32Array(W*W);
  for(let j=-1;j<=n;j++)for(let i=-1;i<=n;i++)hg[(j+1)*W+i+1]=H(ox+i*CELL,oz+j*CELL);
  const pos=new Float32Array(n*n*3),col=new Float32Array(n*n*3),nrm=new Float32Array(n*n*3);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const x=ox+i*CELL,z=oz+j*CELL,k=j*n+i,id=(j+1)*W+i+1;
    sample(x,z,TS);
    const slope=Math.hypot(hg[id+1]-hg[id-1],hg[id+W]-hg[id-W])/(2*CELL);
    pos[k*3]=i*CELL;pos[k*3+1]=hg[id];pos[k*3+2]=j*CELL;
    // normals from the height field itself, so neighbouring chunks shade seamlessly
    {const nx=-(hg[id+1]-hg[id-1])/(2*CELL),nz=-(hg[id+W]-hg[id-W])/(2*CELL),nl=Math.hypot(nx,1,nz);nrm[k*3]=nx/nl;nrm[k*3+1]=1/nl;nrm[k*3+2]=nz/nl}
    terrainColor(x,z,TS,slope,_col);
    const dg=digMap.get(gkey(cx*NSEG+i,cz*NSEG+j));if(dg<-0.1)_col.lerp(TC.dug,smooth(0.1,1.5,-dg)*0.75);
    col[k*3]=_col.r;col[k*3+1]=_col.g;col[k*3+2]=_col.b;
  }
  const idx=new Uint16Array(NSEG*NSEG*6);let q=0;
  const holes=typeof entrancesNear==='function'?entrancesNear(ox+CHUNK/2,oz+CHUNK/2,CHUNK):[];
  const isHole=(px,pz)=>holes.length&&holes.some(e=>Math.hypot(e.x-px,e.z-pz)<HOLE_R);
  for(let j=0;j<NSEG;j++)for(let i=0;i<NSEG;i++){const a=j*n+i,b=a+1,c=a+n,d=a+n+1,x0=ox+i*CELL,z0=oz+j*CELL;
    if(!isHole(x0+CELL*0.33,z0+CELL*0.33)){idx[q++]=a;idx[q++]=c;idx[q++]=b}
    if(!isHole(x0+CELL*0.67,z0+CELL*0.67)){idx[q++]=b;idx[q++]=c;idx[q++]=d}}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.setIndex(new THREE.BufferAttribute(idx,1));
  geo.setAttribute('normal',new THREE.BufferAttribute(nrm,3));geo.computeBoundingSphere();
  const mesh=new THREE.Mesh(geo,terrainMat);mesh.position.set(ox,0,oz);mesh.receiveShadow=true;
  terrainGroup.add(mesh);
  // rocks
  const rng=mulberry(hashI(cx,cz,SITE.seed+77));
  const want=16+Math.floor(rng()*16);
  const im=new THREE.InstancedMesh(rockGeo,rockMat,want);let used=0;const rocks=[];
  for(let r=0;r<want;r++){
    const x=ox+rng()*CHUNK,z=oz+rng()*CHUNK;
    const a=rng(),b=rng(),c=rng(),dd=rng();
    if(x*x+z*z<75*75)continue;
    const rk=cx+','+cz+','+r;if(minedRocks.has(rk))continue;
    sample(x,z,TS);
    if(TS.dune>0.35&&a<0.85)continue;
    let s=0.25+Math.pow(b,3)*2.4+TS.mtn*1.5;
    if(typeof blds!=='undefined'&&blds.some(B=>{const r=BUILD[B.type].r+s*0.5;return Math.abs(B.x-x)<r&&Math.abs(B.z-z)<r&&Math.hypot(B.x-x,B.z-z)<r}))continue; // never inside a module
    _q.setFromEuler(_e.set(a*6,c*6,dd*6));
    _v1.set(x,groundHeight(x,z)-s*0.25,z);
    _v2.set(s*(0.8+a*0.5),s*(0.6+c*0.4),s*(0.8+dd*0.4));
    _m4.compose(_v1,_q,_v2);im.setMatrixAt(used,_m4);
    rocks.push({key:rk,i:used,s,p:_v1.clone(),q:_q.clone(),sc:_v2.clone(),hp:1});
    const sh=0.35+b*0.35+(SITE.dark?-0.12:0);
    _col.setRGB(sh*0.95,sh*0.55,sh*0.42);im.setColorAt(used,_col);used++;
  }
  im.count=used;im.castShadow=true;im.receiveShadow=true;
  if(im.instanceColor)im.instanceColor.needsUpdate=true;
  terrainGroup.add(im);
  const ch={cx,cz,mesh,im,rocks,cr:crystalsFor(ox,oz)};if(ch.cr)terrainGroup.add(ch.cr);if(typeof chunkDeposits==='function')chunkDeposits(ch);return ch;
}
function disposeChunk(c){if(c.cr){terrainGroup.remove(c.cr);c.cr.dispose()}if(typeof chunkDepositsDispose==='function')chunkDepositsDispose(c);terrainGroup.remove(c.mesh);terrainGroup.remove(c.im);c.mesh.geometry.dispose();c.im.dispose()}
function updateChunks(px,pz,budget){
  const ccx=Math.floor(px/CHUNK),ccz=Math.floor(pz/CHUNK),need=[];
  for(let i=-VIEW;i<=VIEW;i++)for(let j=-VIEW;j<=VIEW;j++){
    const d=i*i+j*j;if(d>VIEW*VIEW+2)continue;
    const k=(ccx+i)+','+(ccz+j);if(!chunks.has(k))need.push([d,ccx+i,ccz+j,k]);
  }
  need.sort((a,b)=>a[0]-b[0]);
  for(let q=0;q<Math.min(budget,need.length);q++){const[,x,z,k]=need[q];chunks.set(k,buildChunk(x,z))}
  for(const[k,c]of chunks)if((c.cx-ccx)**2+(c.cz-ccz)**2>(VIEW+2)**2){disposeChunk(c);chunks.delete(k)}
}
// six-sided crystal with a pointed tip, and the clusters that crown each ice spike
const crystalGeo=new THREE.LatheGeometry([new THREE.Vector2(0.001,0),new THREE.Vector2(1,0.02),new THREE.Vector2(1,0.74),new THREE.Vector2(0.001,1)],6);
const crystalMat=new THREE.MeshStandardMaterial({color:'#7ec3f2',emissive:'#1f5fa8',emissiveIntensity:0.55,roughness:0.1,metalness:0.08,flatShading:true});
function crystalsFor(ox,oz){
  if(!SITE.iceWorld&&!SITE.ice.length)return null;const list=[];
  for(let gx=Math.floor(ox/ICE_G)-1;gx<=Math.floor((ox+CHUNK)/ICE_G);gx++)for(let gz=Math.floor(oz/ICE_G)-1;gz<=Math.floor((oz+CHUNK)/ICE_G);gz++){
    const sp=iceSpike(gx,gz);if(sp&&sp.x>=ox&&sp.x<ox+CHUNK&&sp.z>=oz&&sp.z<oz+CHUNK)list.push(sp)}
  if(!list.length)return null;const im=new THREE.InstancedMesh(crystalGeo,crystalMat,list.length*5);let n=0;
  for(const sp of list){const rng=mulberry(hashI(Math.round(sp.x),Math.round(sp.z),SITE.seed+5)),g=groundHeight(sp.x,sp.z)-sp.h;
    for(let k=0;k<5;k++){const main=k===0,a=rng()*TAU,off=main?0:sp.r*(0.25+rng()*0.3),hh=main?sp.h*1.08:sp.h*(0.35+rng()*0.35),rr=main?sp.r*0.36:sp.r*(0.12+rng()*0.1);
      const px=sp.x+Math.cos(a)*off,pz=sp.z+Math.sin(a)*off,base=main?g+sp.h*0.02:groundHeight(px,pz)-hh*0.15;
      _q.setFromEuler(_e.set(main?0:Math.cos(a)*0.45,sp.rot+k,main?0:Math.sin(a)*0.45));_v1.set(px,base,pz);_v2.set(rr,hh,rr);_m4.compose(_v1,_q,_v2);im.setMatrixAt(n++,_m4)}}
  im.count=n;im.castShadow=true;im.receiveShadow=true;return im}
function initSite(key){
  SITE=SITES[key];
  if(SITE.peakRing&&!SITE._peaks){const P=SITE.peakRing,r=mulberry(SITE.seed+3);for(let i=0;i<P.n;i++){const a=i/P.n*TAU+(r()-0.5)*0.35,d=P.r0+r()*(P.r1-P.r0);SITE.features.push({x:Math.cos(a)*d,z:Math.sin(a)*d,r:55+r()*40,h:85+r()*80,peak:true})}SITE._peaks=true}
  N1=makeNoise(SITE.seed);N2=makeNoise(SITE.seed+101);N3=makeNoise(SITE.seed+202);N4=makeNoise(SITE.seed+303);
  rawSample(0,0,TS);landingH=TS.h;
  hCache.clear();digMap.clear();minedRocks.clear();dirtyChunks.clear();
  for(const c of chunks.values())disposeChunk(c);
  chunks.clear();
  if(typeof resetPOIs==='function')resetPOIs();
}
