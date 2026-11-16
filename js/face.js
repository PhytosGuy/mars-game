'use strict';
/* =========================================================
   CHARACTER FEATURES: every feature is one smooth mesh, never a pile of overlapping shapes
   - the head is one sculpted surface: skull, jaw, nose, ears and eyelids blend into each other
     (face shape, nose and ears are choices)
   - the face (eyes, brows, mouth, freckles, blush, make-up, stubble, face paint) is painted onto one thin
     layer that follows that surface exactly, like skin
   - facial hair is one shell grown out of the skin; glasses are one frame plus one pair of lenses;
     each hat and each piece of jewellery is one mesh
   Also: the everyday clothes (tops, bottoms, shoes) built from panels that hug the body.
   ========================================================= */
const FY=0.27,FW=0.56;                         // head centre above the neck pivot; width of the painted face layer (m)
const fshade=(h,k)=>{const n=parseInt(h.slice(1),16),f=v=>Math.round(clamp(v*k,0,255)).toString(16).padStart(2,'0');return'#'+f(n>>16&255)+f(n>>8&255)+f(n&255)};
// merge parts into one geometry (mixing indexed and non-indexed parts)
const mergeAll=P=>P.length?mergeGeometries(P.map(g=>g.index?g.toNonIndexed():g),false):null;
const fss=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};

/* ---------- the sculpted head ---------- */
// ellipsoids as [cx,cy,cz, rx,ry,rz] around the head centre (x right, y up, z forward)
const FACE_SHAPES={
  oval:{cr:[0,0,0,0.25,0.27,0.25],jaw:[0,-0.075,0.02,0.216,0.176,0.2],p:2},
  round:{cr:[0,0,0,0.255,0.265,0.25],jaw:[0,-0.06,0.02,0.236,0.182,0.205],p:2},
  square:{cr:[0,0,0,0.25,0.27,0.25],jaw:[0,-0.08,0.015,0.22,0.172,0.2],p:3.2},
  heart:{cr:[0,0,0,0.258,0.27,0.25],jaw:[0,-0.088,0.032,0.17,0.168,0.18],p:2},
  long:{cr:[0,0.01,0,0.24,0.285,0.25],jaw:[0,-0.1,0.02,0.2,0.182,0.196],p:2}};
const NOSES={
  button:[[0,0,0.222,0.013,0.045,0.02],[0,-0.035,0.242,0.026,0.023,0.028]],
  small:[[0,0,0.222,0.012,0.04,0.018],[0,-0.034,0.238,0.019,0.017,0.021]],
  wide:[[0,0,0.222,0.015,0.045,0.02],[0,-0.036,0.24,0.04,0.024,0.027],[0.03,-0.043,0.225,0.018,0.015,0.017],[-0.03,-0.043,0.225,0.018,0.015,0.017]],
  pointy:[[0,0,0.226,0.012,0.045,0.022],[0,-0.03,0.25,0.02,0.028,0.038]],
  snub:[[0,0,0.22,0.012,0.04,0.018],[0,-0.026,0.24,0.023,0.02,0.025]],
  roman:[[0,0.004,0.234,0.014,0.05,0.025],[0,-0.036,0.246,0.024,0.026,0.031]]};
const NOSE_WINGS=[[0.022,-0.043,0.225,0.014,0.013,0.015],[-0.022,-0.043,0.225,0.014,0.013,0.015]];
const EARS={round:[[0.243,0,-0.01,0.022,0.055,0.042]],small:[[0.24,0,-0.01,0.018,0.044,0.034]],big:[[0.25,0,-0.012,0.028,0.068,0.05]],
  pointed:[[0.243,-0.005,-0.01,0.021,0.05,0.04],[0.255,0.062,-0.034,0.012,0.036,0.018]]};
const LIDS=[[0.088,0.03,0.214,0.05,0.034,0.022],[-0.088,0.03,0.214,0.05,0.034,0.022]];
function ellD(x,y,z,e,p){const qx=Math.abs((x-e[0])/e[3]),qy=Math.abs((y-e[1])/e[4]),qz=Math.abs((z-e[2])/e[5]);
  const q=p===2||!p?Math.sqrt(qx*qx+qy*qy+qz*qz):Math.pow(qx**p+qy**p+qz**p,1/p);return(q-1)*Math.min(e[3],e[4],e[5])}
const smin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*0.25};
function headSpec(l){const shape=FACE_SHAPES[l.faceShape]?l.faceShape:'oval',nose=NOSES[l.nose]?l.nose:'button',ears=EARS[l.ears]?l.ears:'round';return{shape,nose,ears,k:shape+'_'+nose+'_'+ears}}
function headField(sp){const F=FACE_SHAPES[sp.shape],N=[...NOSES[sp.nose],...(sp.nose==='wide'?[]:NOSE_WINGS)],E=EARS[sp.ears].flatMap(e=>[e,[-e[0],e[1],e[2],e[3],e[4],e[5]]]);
  return(x,y,z)=>{let d=smin(ellD(x,y,z,F.cr,2),ellD(x,y,z,F.jaw,F.p),0.06);
    for(const e of LIDS)d=smin(d,ellD(x,y,z,e,2),0.02);
    for(const e of N)d=smin(d,ellD(x,y,z,e,2),0.022);
    for(const e of E)d=smin(d,ellD(x,y,z,e,2),0.018);
    return d}}
// distance from the head centre to the outermost surface along a direction (marching in from outside, then bisecting)
function headRadius(sp){const f=headField(sp);return(dx,dy,dz)=>{let t=0.34;
  while(t>0.05){const t2=t-0.006;if(f(dx*t2,dy*t2,dz*t2)<0){let a=t2,b=t;for(let i=0;i<14;i++){const m=(a+b)/2;if(f(dx*m,dy*m,dz*m)<0)a=m;else b=m}return(a+b)/2}t=t2}
  return 0.2}}
// a sphere grid pushed out onto the head surface (+off), its seam turned to the back of the head
function headSurface(sp,geo,off,each){const R=headRadius(sp),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),l=Math.hypot(x,y,z)||1,dx=x/l,dy=y/l,dz=z/l,r=R(dx,dy,dz);
    const o=each?each(i,dx*r,dy*r,dz*r,r):off;p.setXYZ(i,dx*(r+o),dy*(r+o),dz*(r+o))}
  geo.computeVertexNormals();return geo}
const headGeo=sp=>shared('fhead_'+sp.k,()=>{const g=new THREE.SphereGeometry(1,80,60);g.rotateY(-Math.PI/2);return headSurface(sp,g,0)});
// the painted layer: the front of the same surface, 1.3 mm out, mapped flat (u,v) from (x,y)
const faceLayerGeo=sp=>shared('fdecal_'+sp.k,()=>{const g=new THREE.SphereGeometry(1,72,64,Math.PI/2-1.25,2.5,0.5,2.08);headSurface(sp,g,0.0013);
  const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,0.5+p.getX(i)/FW,0.5+p.getY(i)/FW);return g});

/* ---------- the painted face ---------- */
const EYE_SHAPES={round:{w:0.041,hu:0.034,hl:0.03,t:0},almond:{w:0.049,hu:0.026,hl:0.017,t:0.006},wide:{w:0.046,hu:0.04,hl:0.034,t:0},
  sleepy:{w:0.044,hu:0.017,hl:0.022,t:-0.002,flat:1},cat:{w:0.05,hu:0.027,hl:0.015,t:0.014,wing:1},hooded:{w:0.045,hu:0.022,hl:0.022,t:0.002,crease:1},
  narrow:{w:0.046,hu:0.015,hl:0.011,t:0.003},big:{w:0.047,hu:0.046,hl:0.038,t:0,big:1},happy:{w:0.042,hu:0.02,hl:0,t:0,closed:1}};
const BROW_SHAPES={straight:[0.004,0,0.013,0.007,0],arched:[0.017,-0.006,0.011,0.0055,0],thick:[0.006,0,0.022,0.014,0],angry:[0.002,0.022,0.014,0.008,-0.012],
  thin:[0.01,0,0.006,0.0035,0],bushy:[0.006,0.002,0.02,0.012,0,1],rounded:[0.02,-0.002,0.012,0.009,0],raised:[0.012,0.002,0.011,0.007,0.012]};
const hexA=(h,a)=>{const n=parseInt(h.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
function paintFace(l){
  const N=1024,cv=document.createElement('canvas');cv.width=cv.height=N;const c=cv.getContext('2d');
  c.setTransform(N/FW,0,0,-N/FW,N/2,N/2);c.lineCap='round';c.lineJoin='round';           // draw in metres, y up, (0,0) = head centre
  const r=mulberry(7),skinDark=fshade(l.skin,0.62),dark='#1a1210';
  const ell=(x,y,rx,ry,fill,rot=0)=>{c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fillStyle=fill;c.fill()};
  const glowAt=(x,y,rad,col,a)=>{const g=c.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,hexA(col,a));g.addColorStop(1,hexA(col,0));c.fillStyle=g;c.fillRect(x-rad,y-rad,rad*2,rad*2)};
  // stubble: a fine shadow of hair where a beard grows
  if(l.facial==='stubble'){for(let i=0;i<5200;i++){const x=(r()-0.5)*0.36,y=-0.02-r()*0.24,m=fhMask('beard',x,y,0.2).m;if(r()<m*0.9)ell(x,y,0.0011+r()*0.0008,0.0011+r()*0.0008,hexA(l.hair,0.45))}}
  if(l.blush)for(const s of[-1,1])glowAt(s*0.115,-0.05,0.042,'#ff6f7f',0.38);
  // eyeshadow
  if(l.shadow&&l.shadow!=='none'){const E=EYE_SHAPES[l.eyes]||EYE_SHAPES.round;for(const s of[-1,1]){c.save();c.translate(s*0.088,0.04);c.scale(1,0.6);glowAt(0,0,E.w*1.25,l.shadowCol,l.shadow==='bold'?0.85:0.5);c.restore()}}
  // nose shading and nostrils
  glowAt(0,-0.058,0.03,fshade(l.skin,0.55),0.18);for(const s of[-1,1])ell(s*0.0125,-0.052,0.0058,0.0034,hexA('#2a1410',0.5),s*0.35);
  // face paint
  if(l.paint&&l.paint!=='none'){const pc=l.paintCol;c.strokeStyle=pc;c.fillStyle=pc;
    if(l.paint==='stripes')for(const s of[-1,1])for(const o of[0,-0.02]){c.lineWidth=0.0075;c.beginPath();c.moveTo(s*0.085,-0.025+o);c.lineTo(s*0.155,-0.05+o);c.stroke()}
    else if(l.paint==='star'){c.beginPath();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,rr=i%2?0.009:0.022;c.lineTo(0.125+Math.cos(a)*rr,-0.005+Math.sin(a)*rr)}c.closePath();c.fill()}
    else if(l.paint==='heart'){const x=-0.118,y=-0.05,k=0.017;c.beginPath();c.moveTo(x,y-k);c.bezierCurveTo(x-k*1.6,y+k*0.2,x-k*0.6,y+k*1.3,x,y+k*0.5);c.bezierCurveTo(x+k*0.6,y+k*1.3,x+k*1.6,y+k*0.2,x,y-k);c.fill()}
    else if(l.paint==='dots')for(const s of[-1,1])for(const k of[0,1,2])ell(s*(0.07+k*0.02),-0.022-k*0.004,0.0042,0.0042,pc);
    else if(l.paint==='mars'){ell(0.12,-0.045,0.019,0.019,pc);c.lineWidth=0.0035;c.strokeStyle=fshade(pc,1.5);c.beginPath();c.ellipse(0.12,-0.045,0.033,0.009,-0.35,0,TAU);c.stroke()}}
  // mouth
  paintMouth(c,l);
  // eyes
  const E=EYE_SHAPES[l.eyes]||EYE_SHAPES.round,lash=l.lashes||'natural';
  for(const s of[-1,1]){const cx=s*0.088,cy=0.03,P=(u,v)=>[cx+s*u,cy+v];
    const up=[P(-E.w,0),P(-E.w*0.55,E.hu*(E.flat?1.1:1.33)),P(E.w*0.45,E.hu*(E.flat?1.1:1.3)+E.t),P(E.w,E.t)];
    const at=t=>{const m=1-t;return[0,1].map(k=>m*m*m*up[0][k]+3*m*m*t*up[1][k]+3*m*t*t*up[2][k]+t*t*t*up[3][k])};
    if(E.crease||!E.closed){c.lineWidth=E.crease?0.0022:0.0014;c.strokeStyle=hexA(skinDark,E.crease?0.55:0.3);c.beginPath();c.moveTo(...P(-E.w*0.8,E.hu*0.75+0.011));c.quadraticCurveTo(...P(0,E.hu*1.28+0.013),...P(E.w*0.9,E.hu*0.75+E.t+0.011));c.stroke()}
    if(E.closed){c.lineWidth=0.0048;c.strokeStyle=dark;c.beginPath();c.moveTo(...P(-E.w,-0.004));c.quadraticCurveTo(...P(0,0.024),...P(E.w,-0.004+E.t));c.stroke();continue}
    c.beginPath();c.moveTo(...up[0]);c.bezierCurveTo(...up[1],...up[2],...up[3]);c.bezierCurveTo(...P(E.w*0.5,-E.hl*1.3+E.t*0.4),...P(-E.w*0.5,-E.hl*1.3),...up[0]);c.closePath();
    c.fillStyle='#fbfaf7';c.fill();c.save();c.clip();
    const ir=E.big?0.026:0.021,iy=cy+(E.hu-E.hl)*0.3-0.001,g=c.createRadialGradient(cx,iy,ir*0.2,cx,iy,ir);
    g.addColorStop(0,fshade(l.eyeCol,1.35));g.addColorStop(0.75,l.eyeCol);g.addColorStop(1,fshade(l.eyeCol,0.45));ell(cx,iy,ir,ir,g);
    ell(cx,iy,ir*0.45,ir*0.45,'#070505');ell(cx-0.007,iy+0.009,ir*0.24,ir*0.24,'rgba(255,255,255,.95)');ell(cx+0.006,iy-0.006,ir*0.1,ir*0.1,'rgba(255,255,255,.8)');
    const sh=c.createLinearGradient(0,cy+E.hu,0,cy);sh.addColorStop(0,'rgba(40,20,10,.35)');sh.addColorStop(1,'rgba(40,20,10,0)');c.fillStyle=sh;c.fillRect(cx-0.06,cy-0.05,0.12,0.1);c.restore();
    // lash line, lower lid, flicks and a winged liner
    c.strokeStyle=lash==='none'?hexA(skinDark,0.8):dark;c.lineWidth={none:0.0018,natural:0.0036,long:0.0042,bold:0.0058}[lash]||0.0036;
    c.beginPath();c.moveTo(...up[0]);c.bezierCurveTo(...up[1],...up[2],...up[3]);c.stroke();
    c.lineWidth=0.0014;c.strokeStyle=hexA(skinDark,0.45);c.beginPath();c.moveTo(...up[3]);c.bezierCurveTo(...P(E.w*0.5,-E.hl*1.3+E.t*0.4),...P(-E.w*0.5,-E.hl*1.3),...up[0]);c.stroke();
    if(lash==='long'||lash==='bold'){c.strokeStyle=dark;c.lineWidth=0.0022;for(const t of[0.62,0.78,0.92]){const[x,y]=at(t);c.beginPath();c.moveTo(x,y);c.lineTo(x+s*0.006,y+0.008);c.stroke()}}
    if(E.wing||lash==='bold'){c.fillStyle=dark;c.beginPath();c.moveTo(...P(E.w*0.7,E.hu*0.6+E.t));c.lineTo(...P(E.w+0.016,E.t+0.012));c.lineTo(...P(E.w-0.002,E.t-0.002));c.closePath();c.fill()}}
  // brows
  const B=BROW_SHAPES[l.brows];if(B){const[arch,lift,ti,to,dy,bushy]=B,bc=fshade(l.hair,0.85);
    for(const s of[-1,1]){const i0=[s*0.034,0.097+dy],o0=[s*0.136,0.1+lift+dy],m0=[(i0[0]+o0[0])/2+s*0.01,Math.max(i0[1],o0[1])+arch*2];
      const pt=t=>{const m=1-t;return[m*m*i0[0]+2*m*t*m0[0]+t*t*o0[0],m*m*i0[1]+2*m*t*m0[1]+t*t*o0[1]]},A=[],Bt=[];
      for(let i=0;i<=20;i++){const t=i/20,[x,y]=pt(t),[x2,y2]=pt(Math.min(1,t+0.01)),[x1,y1]=pt(Math.max(0,t-0.01)),tx=x2-x1,ty=y2-y1,tl=Math.hypot(tx,ty)||1,nx=-ty/tl,ny=tx/tl;
        const th=lerp(ti,to,t)*(t>0.85?lerp(1,0.35,(t-0.85)/0.15):1)*(t<0.08?lerp(0.75,1,t/0.08):1)/2;A.push([x+nx*th,y+ny*th]);Bt.push([x-nx*th,y-ny*th])}
      c.beginPath();A.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));Bt.reverse().forEach(p=>c.lineTo(...p));c.closePath();c.fillStyle=bc;c.fill();
      if(bushy){c.strokeStyle=bc;c.lineWidth=0.0012;for(let i=0;i<70;i++){const t=r(),[x,y]=pt(t);c.beginPath();c.moveTo(x+(r()-0.5)*0.008,y+(r()-0.5)*0.012);c.lineTo(x+s*(0.005+r()*0.006),y+0.004+r()*0.006);c.stroke()}}}}
  // freckles and a beauty mark
  if(l.freckles){for(const s of[-1,1])for(let i=0;i<16;i++){const a=r()*TAU,d=Math.sqrt(r());ell(s*0.088+Math.cos(a)*d*0.05,-0.035+Math.sin(a)*d*0.024,0.0016+r()*0.001,0.0016+r()*0.001,'rgba(138,90,58,.75)')}
    for(let i=0;i<7;i++)ell((r()-0.5)*0.04,-0.005-r()*0.02,0.0014,0.0014,'rgba(138,90,58,.7)')}
  const mole={cheek:[0.075,-0.062],lip:[0.034,-0.08],eye:[0.13,0.002]}[l.mole];if(mole)ell(mole[0],mole[1],0.0032,0.003,'#3a2418');
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function paintMouth(c,l){
  const L=l.lipCol||'#b4544e',Ld=fshade(L,0.85),line='#5a2420',inside='#4a1717',my=-0.098,m=l.mouth;
  const lips=(lx,ly,rx,ry,midY,lowY,upY)=>{                            // corners, mouth line dip, lower lip depth, cupid's bow height
    c.beginPath();c.moveTo(lx,ly);c.bezierCurveTo(lx*0.6,upY,lx*0.3,upY+0.004,0,upY-0.002);c.bezierCurveTo(rx*0.3,upY+0.004,rx*0.6,upY,rx,ry);c.quadraticCurveTo(0,midY,lx,ly);c.fillStyle=Ld;c.fill();
    c.beginPath();c.moveTo(lx,ly);c.quadraticCurveTo(0,midY,rx,ry);c.quadraticCurveTo(0,lowY,lx,ly);c.fillStyle=L;c.fill();
    c.beginPath();c.ellipse(0,(midY+lowY)/2-0.002,0.012,0.003,0,0,TAU);c.fillStyle='rgba(255,255,255,.22)';c.fill();
    c.lineWidth=0.0026;c.strokeStyle=line;c.beginPath();c.moveTo(lx,ly);c.quadraticCurveTo(0,midY,rx,ry);c.stroke()};
  const open=(w,cy,dep,teeth,tongue)=>{c.beginPath();c.moveTo(-w,cy);c.quadraticCurveTo(0,cy-0.008,w,cy);c.quadraticCurveTo(0,cy-dep,-w,cy);c.closePath();c.fillStyle=inside;c.fill();
    c.save();c.clip();if(teeth){c.fillStyle='#fbfaf7';c.fillRect(-w,cy-0.016,w*2,0.016)}if(tongue)ell2(c,0,cy-dep*0.78,w*0.5,dep*0.3,'#e0707a');c.restore();
    c.lineWidth=0.0075;c.strokeStyle=L;c.beginPath();c.moveTo(-w,cy);c.quadraticCurveTo(0,cy-dep,w,cy);c.stroke();c.lineWidth=0.0045;c.beginPath();c.moveTo(-w,cy);c.quadraticCurveTo(0,cy-0.008,w,cy);c.stroke()};
  if(m==='grin')open(0.046,my+0.01,0.05,true,true);
  else if(m==='laugh')open(0.05,my+0.013,0.066,true,true);
  else if(m==='surprised'){ell2(c,0,my-0.006,0.016,0.021,inside);c.lineWidth=0.007;c.strokeStyle=L;c.beginPath();c.ellipse(0,my-0.006,0.017,0.022,0,0,TAU);c.stroke()}
  else if(m==='pout')lips(-0.026,my-0.002,0.026,my-0.002,my-0.006,my-0.03,my+0.016);
  else if(m==='neutral')lips(-0.042,my+0.001,0.042,my+0.001,my-0.002,my-0.018,my+0.012);
  else if(m==='smirk')lips(-0.04,my,0.046,my+0.014,my-0.008,my-0.022,my+0.014);
  else if(m==='frown')lips(-0.042,my-0.01,0.042,my-0.01,my+0.004,my-0.024,my+0.014);
  else if(m==='calm')lips(-0.042,my+0.006,0.042,my+0.006,my-0.006,my-0.021,my+0.014);
  else{lips(-0.044,my+0.01,0.044,my+0.01,my-0.014,my-0.03,my+0.017);
    if(m==='tongue'){c.beginPath();c.moveTo(-0.012,my-0.01);c.quadraticCurveTo(-0.014,my-0.04,0,my-0.042);c.quadraticCurveTo(0.014,my-0.04,0.012,my-0.01);c.fillStyle='#e0707a';c.fill();
      c.lineWidth=0.0012;c.strokeStyle='rgba(120,30,40,.6)';c.beginPath();c.moveTo(0,my-0.015);c.lineTo(0,my-0.033);c.stroke()}}}
function ell2(c,x,y,rx,ry,f){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=f;c.fill()}

/* ---------- facial hair: one shell grown out of the skin ---------- */
function fhMask(style,x,y,z){const ax=Math.abs(x),len=Math.hypot(x,y,z)||1,front=z/len;
  const mouth=1-fss(0.9,1.25,Math.hypot(x/0.052,(y+0.1)/0.03));
  const yb=-0.066+Math.max(0,ax-0.065)*0.55,jaw=fss(yb+0.008,yb-0.016,y)*fss(-0.09,-0.03,z);
  const side=fss(0.15,0.19,ax)*fss(0.045,0.005,y)*fss(-0.075,-0.03,z)*fss(0.13,0.08,z);
  const ycm=-0.071-1.2*x*x,must=fss(0.011,0.005,Math.abs(y-ycm))*fss(0.064,0.05,ax)*fss(0.1,0.16,z);
  const ych=-0.071+Math.max(0,ax-0.04)*0.9,handle=fss(0.009-Math.max(0,ax-0.05)*0.12,0.003,Math.abs(y-ych))*fss(0.095,0.082,ax)*fss(0.1,0.16,z);
  const chin=1-fss(0.85,1.15,Math.hypot(x/0.045,(y+0.19)/0.052)),ring=fss(1.6,1.3,Math.hypot(x/0.052,(y+0.1)/0.036))*fss(0.06,0.045,ax)*fss(0.4,0.6,front);
  switch(style){
    case'beard':return{m:Math.max(Math.max(jaw,side)*(1-mouth),must),t:0.017};
    case'fullbeard':return{m:Math.max(Math.max(jaw,side)*(1-mouth),must),t:0.032};
    case'goatee':return{m:Math.max(chin,ring*(1-mouth),must),t:0.014};
    case'mustache':return{m:must,t:0.011};
    case'handlebar':return{m:handle,t:0.011};
    case'soulpatch':return{m:1-fss(0.8,1.2,Math.hypot(x/0.012,(y+0.136)/0.015)),t:0.009};
    case'chinstrap':return{m:Math.max(jaw*fss(0.74,0.56,front),side),t:0.012};
    case'sideburns':return{m:side,t:0.012}}
  return{m:0,t:0}}
const FACIAL_3D=new Set(['beard','fullbeard','goatee','mustache','handlebar','soulpatch','chinstrap','sideburns']);
const facialGeo=(sp,style)=>shared('ffh_'+sp.k+'_'+style,()=>{const g=new THREE.SphereGeometry(1,110,84,Math.PI/2-1.8,3.6,1.3,1.65),nz=makeNoise(57);
  return headSurface(sp,g,0,(i,x,y,z)=>{const{m,t}=fhMask(style,x,y,z),k=fss(0,0.6,m);return-0.003+(0.003+t*(0.9+0.16*nz(x*38,y*38+z*26)))*k})});

/* ---------- glasses: one frame (rims, bridge, arms) and one pair of lenses ---------- */
function lensOutline(st){const pts=[];for(let i=0;i<48;i++){const a=i/48*TAU,cs=Math.cos(a),sn=Math.sin(a);let x,y;
  const sup=(p,rx,ry)=>{const k=Math.pow(Math.abs(cs)**p+Math.abs(sn)**p,-1/p);return[rx*cs*k,ry*sn*k]};
  if(st==='round'){x=0.047*cs;y=0.045*sn}else if(st==='oval'){x=0.057*cs;y=0.039*sn}
  else if(st==='square')[x,y]=sup(4,0.055,0.045);else if(st==='rect')[x,y]=sup(6,0.061,0.033);
  else if(st==='cat'){[x,y]=sup(3,0.057,0.04);if(cs>0&&sn>0)y+=0.03*cs*sn}
  else if(st==='aviator'){x=0.056*cs;y=sn>0?0.033*sn:0.053*sn;if(sn<0&&cs<0)x+=0.012*sn*cs}
  else if(st==='hex'){const seg=Math.PI/3,aa=((a+seg/2)%seg)-seg/2,rr=0.05*Math.cos(seg/2)/Math.cos(aa);x=rr*cs;y=rr*sn*0.88}
  else{x=0.05*cs;y=0.04*sn}pts.push([x,y])}return pts}
const glassZ=x=>0.268-1.1*x*x;
const GLASS_CACHE={};
const glassesGeo=st=>GLASS_CACHE[st]||(GLASS_CACHE[st]=(()=>{const fr=[],ln=[],V=(x,y,z)=>new THREE.Vector3(x,y,z),tube=(pts,r,closed)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,closed),closed?72:24,r,6,closed);
  const thick=st==='rect'||st==='square'?0.0065:0.0052;
  if(st==='visor'){const O=[];for(let i=0;i<64;i++){const a=i/64*TAU,cs=Math.cos(a),sn=Math.sin(a),k=Math.pow(Math.abs(cs)**4+Math.abs(sn)**4,-0.25);O.push([0.15*cs*k,0.036+0.036*sn*k])}
    fr.push(tube(O.filter(p=>p[1]>0.05).map(([x,y])=>V(x,y,glassZ(x)+0.002)),0.006,false));const sh=new THREE.ShapeGeometry(new THREE.Shape(O.map(([x,y])=>new THREE.Vector2(x,y))));
    const p=sh.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,glassZ(x)-0.001)}sh.computeVertexNormals();ln.push(sh)}
  else for(const s of[-1,1]){const cx=s*0.09,cy=0.03,O=lensOutline(st).map(([u,v])=>[cx+s*u,cy+v]);
    fr.push(tube(O.map(([x,y])=>V(x,y,glassZ(x))),thick,true));
    const sh=new THREE.ShapeGeometry(new THREE.Shape(lensOutline(st).map(([u,v])=>new THREE.Vector2(cx+s*u,cy+v))));
    const p=sh.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,glassZ(p.getX(i))-0.0015);sh.computeVertexNormals();ln.push(sh)}
  fr.push(tube([V(-0.043,0.052,glassZ(0.043)),V(0,0.058,0.27),V(0.043,0.052,glassZ(0.043))],0.0048,false));
  for(const s of[-1,1])fr.push(tube([V(s*0.143,0.05,glassZ(0.143)),V(s*0.2,0.052,0.17),V(s*0.258,0.048,0.03),V(s*0.262,0.035,-0.04),V(s*0.25,0.0,-0.08)],0.0042,false));
  const frame=mergeAll(fr),lens=mergeAll(ln);frame.userData.shared=lens.userData.shared=true;return{frame,lens}})());
const LENS={clear:['#cfe6ff',0.16,0.1],dark:['#14161c',0.86,0.3],mirror:['#9fb8e0',0.92,0.95],rose:['#ff8fa8',0.45,0.2],blue:['#6fa8ff',0.45,0.2],amber:['#ffb347',0.5,0.2],green:['#4fbf7a',0.5,0.2]};

/* ---------- headwear: one mesh each ---------- */
const HAT_COVERS=new Set(['beanie','bobble','cap','backcap','bucket','beret','bandana','cowboy']);
const hatGeo=k=>shared('fhat_'+k,()=>{const P=[],Y=FY,lathe=pts=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),40);
  const shell=(r,t1,sy)=>{const g=new THREE.SphereGeometry(r,40,20,0,TAU,0,t1);g.scale(1,sy,1);g.translate(0,Y,0);return g};
  if(k==='beanie'||k==='bobble'){P.push(shell(0.286,1.3,1.12));const cf=new THREE.TorusGeometry(0.274,0.032,12,48);cf.rotateX(Math.PI/2);cf.translate(0,Y+0.085,0);P.push(cf);
    if(k==='bobble'){const b=new THREE.SphereGeometry(0.065,20,14);b.scale(1,0.9,1);b.translate(0,Y+0.345,0);P.push(b)}}
  else if(k==='cap'||k==='backcap'){P.push(shell(0.283,1.25,1.1));const br=new THREE.CylinderGeometry(0.17,0.17,0.016,40,1,false,-Math.PI/2,Math.PI);br.scale(1,1,1.05);br.rotateX(0.12);br.translate(0,Y+0.095,0.2);P.push(br);
    const bt=new THREE.SphereGeometry(0.022,12,8);bt.translate(0,Y+0.31,0);P.push(bt);if(k==='backcap')P.forEach(g=>g.rotateY(Math.PI))}
  else if(k==='bucket'){const g=lathe([[0.001,0.245],[0.17,0.245],[0.235,0.2],[0.265,0.11],[0.272,0.02],[0.36,-0.04],[0.366,-0.05],[0.262,0.004],[0.255,0.11],[0.225,0.19],[0.16,0.235],[0.001,0.237]]);g.translate(0,Y+0.09,0);P.push(g)}
  else if(k==='beret'){const g=new THREE.SphereGeometry(0.3,40,18);g.scale(1,0.3,1);g.rotateZ(0.22);g.translate(0.035,Y+0.215,-0.02);P.push(g);const st=new THREE.CylinderGeometry(0.01,0.014,0.03,8);st.translate(0.02,Y+0.31,-0.02);P.push(st)}
  else if(k==='headband'){const g=new THREE.TorusGeometry(0.252,0.022,12,56);g.rotateX(Math.PI/2-0.28);g.translate(0,Y+0.1,-0.01);P.push(g)}
  else if(k==='bandana'){P.push(shell(0.279,1.15,1.1));for(const s of[-1,1]){const kn=new THREE.SphereGeometry(0.034,14,10);kn.translate(s*0.03,Y+0.04,-0.27);P.push(kn);
      const tl=new THREE.ConeGeometry(0.03,0.12,10);tl.rotateX(-2.6);tl.rotateZ(s*0.3);tl.translate(s*0.045,Y-0.02,-0.3);P.push(tl)}}
  else if(k==='headset'){const b=new THREE.TorusGeometry(0.272,0.018,10,32,Math.PI);b.translate(0,Y+0.0,0);P.push(b);
    for(const s of[-1,1]){const cup=new THREE.CylinderGeometry(0.068,0.068,0.055,24);cup.rotateZ(Math.PI/2);cup.translate(s*0.272,Y,0);P.push(cup)}
    P.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.29,Y-0.02,0.03),new THREE.Vector3(0.24,Y-0.1,0.16),new THREE.Vector3(0.09,Y-0.1,0.25)]),20,0.008,6,false));
    const mic=new THREE.SphereGeometry(0.02,12,8);mic.translate(0.08,Y-0.1,0.255);P.push(mic)}
  else if(k==='cowboy'){const g=lathe([[0.001,0.21],[0.16,0.215],[0.235,0.19],[0.262,0.03],[0.265,0.0],[0.4,-0.005],[0.46,0.05],[0.47,0.058],[0.44,0.03],[0.4,0.008],[0.262,0.012],[0.25,0.15],[0.2,0.2],[0.001,0.2]]);g.translate(0,Y+0.1,0);P.push(g)}
  return mergeAll(P)});

/* ---------- jewellery: one mesh each ---------- */
const earringGeo=(k,ears)=>shared('fear_'+k+'_'+ears,()=>{const P=[],ex=(EARS[ears]||EARS.round)[0],x0=ex[0]+ex[3]*0.6,y0=ex[1]-ex[4]*0.92;
  for(const s of[-1,1]){const x=s*x0;
    if(k==='studs'){const g=new THREE.SphereGeometry(0.008,12,8);g.translate(x,y0,ex[2]+0.012);P.push(g)}
    else if(k==='hoops'){const g=new THREE.TorusGeometry(0.02,0.0032,8,28);g.rotateY(Math.PI/2);g.translate(x+s*0.002,y0-0.018,ex[2]+0.008);P.push(g)}
    else if(k==='drops'){const a=new THREE.CylinderGeometry(0.0018,0.0018,0.022,6);a.translate(x,y0-0.011,ex[2]+0.01);P.push(a);const d=new THREE.SphereGeometry(0.011,14,10);d.scale(1,1.35,1);d.translate(x,y0-0.03,ex[2]+0.01);P.push(d)}
    else if(k==='gems'){const g=new THREE.OctahedronGeometry(0.011,0);g.translate(x,y0,ex[2]+0.012);P.push(g)}}
  return mergeAll(P)});
const necklaceGeo=k=>shared('fneck_'+k,()=>{const pts=[];for(let i=0;i<64;i++){const a=i/64*TAU,y=1.445-0.045*Math.pow(Math.max(0,Math.cos(a)),2),r=bodyR(y)+0.008;pts.push(new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r))}
  const P=[];if(k==='pearls')for(let i=0;i<64;i+=2){const g=new THREE.SphereGeometry(0.0095,10,8);g.translate(pts[i].x,pts[i].y,pts[i].z);P.push(g)}
  else P.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),96,0.0035,6,true));
  if(k==='pendant'){const p=pts[0],g=new THREE.OctahedronGeometry(0.02,0);g.scale(0.8,1.2,0.4);g.translate(p.x,p.y-0.028,p.z+0.006);P.push(g)}
  if(k==='tag'){const p=pts[0],g=new THREE.CylinderGeometry(0.016,0.016,0.004,20);g.rotateX(Math.PI/2);g.scale(1,1.4,1);g.translate(p.x,p.y-0.026,p.z+0.004);P.push(g)}
  return mergeAll(P)});

/* ---------- build every feature for a look (only when those choices change) ---------- */
const FACE_KEYS=['faceShape','nose','ears','glassCol','jewelCol','skin','eyes','eyeCol','lashes','brows','mouth','lipCol','freckles','blush','mole','shadow','shadowCol','paint','paintCol','hair',
  'facial','glasses','lens','hat','earrings','necklace','hairStyle','top','bottoms','shoeStyle'];
function buildFace(a,l){
  const U=a.userData,M=U.mats,F=U.face,H=U.hairG,T=U.topG;for(const grp of[F,H,T,...U.armCl,...U.legCl])while(grp.children.length)grp.remove(grp.children[0]);
  const X=U.fx||(U.fx={decal:new THREE.MeshStandardMaterial({transparent:true,depthWrite:false,roughness:0.55,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
    frame:new THREE.MeshStandardMaterial({color:'#1d1a1a',roughness:0.35,metalness:0.4}),lens:new THREE.MeshStandardMaterial({transparent:true,depthWrite:false,roughness:0.05,side:THREE.DoubleSide}),
    jewel:new THREE.MeshStandardMaterial({color:'#e6c35a',roughness:0.22,metalness:0.95}),fh:new THREE.MeshStandardMaterial({roughness:0.6})});
  const put=(grp,geo,m)=>{if(!geo)return null;const o=new THREE.Mesh(geo,m);o.position.y=FY;o.castShadow=true;grp.add(o);return o};
  const sp=headSpec(l);
  // the head and its painted face
  put(F,headGeo(sp),M.skin);
  if(X.decal.map)X.decal.map.dispose();X.decal.map=paintFace(l);X.decal.needsUpdate=true;const dl=put(F,faceLayerGeo(sp),X.decal);dl.castShadow=false;dl.renderOrder=1;
  // facial hair
  if(FACIAL_3D.has(l.facial)){X.fh.color.set(l.hair);X.fh.map=hairTex();put(F,facialGeo(sp,l.facial),X.fh)}
  // glasses
  if(l.glasses&&l.glasses!=='none'){const G=glassesGeo(l.glasses),ln=LENS[l.lens]||LENS.clear;X.frame.color.set(l.glassCol);put(F,G.frame,X.frame);
    X.lens.color.set(ln[0]);X.lens.opacity=ln[1];X.lens.metalness=ln[2];const lm=put(F,G.lens,X.lens);if(lm){lm.castShadow=false;lm.renderOrder=1}}
  // earrings
  if(l.earrings&&l.earrings!=='none'){X.jewel.color.set(l.jewelCol);put(F,earringGeo(l.earrings,sp.ears),X.jewel)}
  // hair and headwear (only seen without the helmet)
  if(l.hairStyle!=='bald')H.add(new THREE.Mesh(hairGeometry(l.hairStyle,FY,HAT_COVERS.has(l.hat)),M.hair));
  if(l.hat&&l.hat!=='none'){const hg=hatGeo(l.hat);if(hg){const o=new THREE.Mesh(hg,M.hat);o.castShadow=true;H.add(o)}}
  buildClothes(a,l)}

/* ---------- everyday clothes: details are curved panels that hug the body, so they blend in ---------- */
const SLEEVELESS=new Set(['tank']),SHORT_SLEEVE=new Set(['tee','polo','tank']);
function buildClothes(a,l){const U=a.userData,M=U.mats,X=U.fx;
  if(!U.cdeco){U.cdeco=new THREE.Group();U.ctorso.add(U.cdeco)}const D_=U.cdeco;while(D_.children.length)D_.remove(D_.children[0]);
  const T_=U.topG,ta=(m,x,y,z)=>{m.position.set(x,y,z);T_.add(m);return m};
  // a smooth panel following the torso between heights y0..y1, centred on angle a (0 = front) and wa wide, raised by `off`
  const panel=(y0,y1,a,wa,off,m)=>{const key=`bp${y0}_${y1}_${a}_${wa}_${off}`;const g=shared(key,()=>{const pts=[];for(let i=0;i<=10;i++){const y=lerp(y0,y1,i/10),edge=Math.sin(i/10*Math.PI);pts.push(new THREE.Vector2(bodyR(y)+off*(0.35+0.65*Math.pow(edge,0.3)),y))}
      return new THREE.LatheGeometry(pts,Math.max(6,Math.round(wa*24)),a-wa,wa*2)});const p=new THREE.Mesh(g,m);D_.add(p);return p};
  const ring=(rad,tube,m,y,sx=1.25,sz=0.72)=>{const t=new THREE.Mesh(shared('ring'+rad+'_'+tube,()=>new THREE.TorusGeometry(rad,tube,10,40)),m);t.rotation.x=Math.PI/2;t.scale.set(sx,sz,1);return ta(t,0,y,0)};
  const dk=mat('#1d1a1a',{roughness:0.6}),metalB=mat('#c9c3bb',{roughness:0.3,metalness:0.8}),M2=M.shirt2,top=l.top;
  const zip=()=>{panel(0.9,1.44,0,0.022,0.014,metalB)},hood=()=>{const h=new THREE.Mesh(shared('hood3',()=>new THREE.TorusGeometry(0.16,0.07,14,28)),M.shirt);h.rotation.x=Math.PI/2+0.55;h.scale.set(1.05,1,0.9);ta(h,0,1.47,-0.08)};
  U.sleeveless=SLEEVELESS.has(top);
  panel(0.874,0.905,0,Math.PI,0.012,M.shirt);                                                 // rolled hem all the way round
  if(top==='tee'){ring(0.09,0.018,M2,1.495,1.1,0.85);panel(1.2,1.34,0,0.36,0.01,M2);panel(1.245,1.295,0,0.24,0.016,M.shirt)}
  else if(top==='longsleeve'){ring(0.09,0.016,M.shirt,1.495,1.1,0.85);panel(1.18,1.2,0,Math.PI,0.012,M2)}
  else if(top==='tank'){ring(0.13,0.014,M.shirt,1.46,1.25,0.8);for(const s of[-1,1])panel(1.36,1.47,s*1.25,0.22,0.012,M.shirt);panel(1.25,1.33,0,0.3,0.012,M2)}
  else if(top==='polo'){ring(0.092,0.02,M.shirt,1.49,1.12,0.86);for(const s of[-1,1])panel(1.42,1.48,s*0.22,0.16,0.022,M2);panel(1.33,1.45,0,0.045,0.014,M2);
    for(const y of[1.36,1.41]){const b=new THREE.Mesh(shared('pbtn',()=>new THREE.SphereGeometry(0.008,8,6)),metalB);ta(b,0,y,bodyR(y)*0.72+0.016)}}
  else if(top==='hoodie'){hood();panel(0.95,1.09,0,0.62,0.018,M.shirt);panel(1.08,1.095,0,0.6,0.02,M2);panel(0.874,0.92,0,Math.PI,0.016,M2);
    for(const s of[-1,1]){const cd=new THREE.Mesh(shared('cord2',()=>new THREE.CapsuleGeometry(0.006,0.11,4,6)),M2);ta(cd,s*0.045,1.37,bodyR(1.37)*0.72+0.012)}}
  else if(top==='ziphoodie'){hood();zip();panel(0.874,0.92,0,Math.PI,0.016,M2);for(const s of[-1,1])panel(0.96,1.08,s*0.42,0.2,0.016,M.shirt)}
  else if(top==='sweater'){ring(0.092,0.024,M2,1.49,1.12,0.86);panel(0.874,0.93,0,Math.PI,0.018,M2);panel(1.2,1.27,0,Math.PI,0.014,M2);panel(1.29,1.31,0,Math.PI,0.012,M2)}
  else if(top==='jacket'){panel(0.9,1.43,0,0.19,0.01,M2);for(const s of[-1,1]){panel(1.27,1.46,s*0.3,0.12,0.016,M.shirt);panel(0.93,1.44,s*0.2,0.012,0.016,dk);panel(0.98,1.03,s*0.62,0.14,0.012,M.shirt)}ring(0.095,0.024,M.shirt,1.48,1.15,0.9)}
  else if(top==='bomber'){ring(0.096,0.026,M2,1.48,1.15,0.9);panel(0.874,0.94,0,Math.PI,0.02,M2);zip();const pt=new THREE.Mesh(shared('bpatch',()=>new THREE.SphereGeometry(0.035,14,8,0,Math.PI*2,0,0.5)),M2);pt.rotation.x=Math.PI/2;ta(pt,-0.13,1.3,bodyR(1.3)*0.72-0.02)}
  else if(top==='puffer'){for(let i=0;i<5;i++){const y0=0.9+i*0.11;panel(y0,y0+0.1,0,Math.PI,0.028,M.shirt)}ring(0.105,0.04,M.shirt,1.47,1.15,0.9);zip()}
  else if(top==='flight'){panel(0.9,1.46,0,0.022,0.012,M2);ring(0.095,0.022,M.shirt,1.48,1.15,0.9);panel(0.95,1.0,0,Math.PI,0.012,M.pants);panel(1.27,1.33,-0.42,0.14,0.012,M2);
    const patch=new THREE.Mesh(shared('patch3',()=>new THREE.SphereGeometry(0.05,16,10,0,Math.PI*2,0,0.5)),mat('#2e5bd8'));patch.rotation.x=Math.PI/2;ta(patch,0.12,1.3,bodyR(1.3)*0.72-0.035)}
  // necklace (follows the chest, so it scales with your build)
  if(l.necklace&&l.necklace!=='none'){const n=new THREE.Mesh(necklaceGeo(l.necklace),X.jewel);X.jewel.color.set(l.jewelCol);D_.add(n)}
  // trousers: a rolled waistband with a belt and buckle
  ring(0.188,0.024,M.pants,0.9,1.0,0.82);ring(0.19,0.013,dk,0.9,1.02,0.84);const bk=new THREE.Mesh(shared('buckle',()=>rbox(0.05,0.035,0.014,0.006)),metalB);ta(bk,0,0.9,0.158);
  // sleeves: short sleeves show the forearm; long sleeves get rolled cuffs
  for(const cl of U.armCl){
    if(SHORT_SLEEVE.has(top)&&!U.sleeveless){const fore=new THREE.Mesh(shared('fore',()=>new THREE.CapsuleGeometry(0.083,0.2,8,16)),M.skin);fore.position.set(0,-0.38,0);cl.add(fore);
      const hem=new THREE.Mesh(shared('slhem2',()=>new THREE.TorusGeometry(0.087,0.016,10,24)),M.shirt);hem.rotation.x=Math.PI/2;hem.position.set(0,-0.25,0);cl.add(hem)}
    else if(!U.sleeveless){const cuff=new THREE.Mesh(shared('cuff2',()=>new THREE.TorusGeometry(0.08,top==='puffer'||top==='bomber'||top==='sweater'?0.026:0.02,10,24)),top==='hoodie'||top==='bomber'||top==='sweater'?M2:M.shirt);cuff.rotation.x=Math.PI/2;cuff.position.set(0,-0.47,0);cl.add(cuff)}}
  // shoes and trouser hems
  const shoe=l.shoeStyle||'sneakers',sole=shoe==='boots'?mat('#3a3330',{roughness:0.8}):mat('#f4f1ea',{roughness:0.7});
  for(const cl of U.legCl){const so=new THREE.Mesh(shared('sole2',()=>rbox(0.25,0.04,0.41,0.018)),sole);so.position.set(0,-0.37,0.05);cl.add(so);
    const toe=new THREE.Mesh(shared('toe2',()=>new THREE.SphereGeometry(0.1,16,10,0,Math.PI*2,0,Math.PI/2)),sole);toe.scale.set(1.15,0.5,0.9);toe.position.set(0,-0.35,0.17);cl.add(toe);
    if(shoe!=='slipons'){const lace=new THREE.Mesh(shared('lace2',()=>new THREE.CapsuleGeometry(0.008,0.07,4,6)),M2);lace.rotation.z=Math.PI/2;lace.position.set(0,-0.226,0.12);cl.add(lace)}
    if(shoe==='boots'||shoe==='hightops'){const col=new THREE.Mesh(shared('bootcol',()=>new THREE.CylinderGeometry(0.105,0.1,shoe==='boots'?0.2:0.12,20,1,true)),M.shoes);col.position.set(0,shoe==='boots'?-0.16:-0.2,0);cl.add(col);
      const rim=new THREE.Mesh(shared('bootrim',()=>new THREE.TorusGeometry(0.104,0.012,8,24)),shoe==='boots'?M.shoes:M2);rim.rotation.x=Math.PI/2;rim.position.set(0,shoe==='boots'?-0.06:-0.14,0);cl.add(rim)}
    const hm=new THREE.Mesh(shared('pantHem2',()=>new THREE.TorusGeometry(0.095,0.018,10,24)),M.pants);hm.rotation.x=Math.PI/2;
    if(l.bottoms==='shorts'){hm.position.set(0,0.06,0);hm.scale.set(1.12,1.12,1)}
    else if(l.bottoms==='joggers'){hm.position.set(0,-0.2,0);hm.scale.set(0.92,0.92,1.6)}
    else hm.position.set(0,-0.2,0);
    if(!(shoe==='boots'&&l.bottoms!=='shorts'))cl.add(hm)}}
