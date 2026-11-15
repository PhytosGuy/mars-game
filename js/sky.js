'use strict';

/* =========================================================
   SKY, SUN, STARS, MOONS
   ========================================================= */
const skyU={sunDir:{value:new THREE.Vector3(0,1,0)},zen:{value:new THREE.Color()},hor:{value:new THREE.Color()},fogc:{value:new THREE.Color()},
  blue:{value:new THREE.Color('#6f93c9')},day:{value:1},sunsetK:{value:0},tm:{value:0},cloudK:{value:1}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(1500,32,16),new THREE.ShaderMaterial({
  uniforms:skyU,side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false,
  vertexShader:`varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;}`,
  fragmentShader:`uniform vec3 sunDir,zen,hor,fogc,blue;uniform float day,sunsetK,tm,cloudK;varying vec3 vD;
  float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.0,a=0.55;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(17.1,9.2);a*=0.5;}return v;}
  void main(){vec3 d=normalize(vD);float h=d.y;float sd=max(dot(d,sunDir),0.0);
    vec3 c=mix(hor,zen,pow(clamp(h,0.0,1.0),0.55));
    float g=pow(sd,6.0);
    c=mix(c,blue,clamp(g*sunsetK*1.15+pow(sd,40.0)*0.3*day,0.0,1.0));
    float up=step(-0.06,sunDir.y);
    c+=vec3(1.0,0.95,0.85)*(smoothstep(0.9993,0.9996,sd)*5.0+pow(sd,180.0)*0.7)*up*max(day,0.25);
    // thin, wispy water-ice clouds (seen by Curiosity and Perseverance), painted in soft layers
    if(h>0.0){vec2 cp=d.xz/(h+0.12)*1.4+vec2(tm*0.012,tm*0.004);float n=fbm(cp*vec2(1.0,2.6));float cl=smoothstep(0.52,0.8,n)*smoothstep(0.0,0.25,h)*cloudK;
      vec3 cc=mix(hor*1.15,vec3(1.0,0.97,0.94),0.45+0.35*pow(sd,3.0))*(0.35+0.65*day);c=mix(c,cc,cl*0.6);}
    c=mix(fogc,c,smoothstep(-0.02,0.14,h));
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`}));
sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);

const stars=(()=>{const n=2200,p=new Float32Array(n*3),c=new Float32Array(n*3),r=mulberry(99);
  for(let i=0;i<n;i++){const u=r()*2-1,a=r()*TAU,s=Math.sqrt(1-u*u);p[i*3]=Math.cos(a)*s*1300;p[i*3+1]=u*1300;p[i*3+2]=Math.sin(a)*s*1300;
    const b=0.4+r()*0.6;c[i*3]=b;c[i*3+1]=b*(0.9+r()*0.1);c[i*3+2]=b*(0.85+r()*0.25)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));
  const s=new THREE.Points(g,new THREE.PointsMaterial({size:1.7,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:0,depthWrite:false,fog:false}));
  s.frustumCulled=false;s.renderOrder=-9;scene.add(s);return s})();
// Earth: a bright blue "evening star" low in the western sky
const earthDot=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array([-1100,280,380]),3)),
  new THREE.PointsMaterial({size:4.5,sizeAttenuation:false,color:'#9fc8ff',transparent:true,opacity:0,depthWrite:false,fog:false}));
earthDot.frustumCulled=false;stars.add(earthDot);
function lumpy(seed,detail){const g=new THREE.IcosahedronGeometry(1,detail),p=g.attributes.position,r=mulberry(seed);const ks={};
  for(let i=0;i<p.count;i++){const key=p.getX(i).toFixed(3)+p.getY(i).toFixed(3)+p.getZ(i).toFixed(3);if(!(key in ks))ks[key]=0.8+r()*0.35;const k=ks[key];p.setXYZ(i,p.getX(i)*k*1.25,p.getY(i)*k,p.getZ(i)*k)}
  g.computeVertexNormals();return g}
const moonMat=new THREE.MeshStandardMaterial({color:'#8a7a6c',flatShading:true,roughness:1,fog:false});
const phobos=new THREE.Mesh(lumpy(3,1),moonMat);phobos.scale.setScalar(9);scene.add(phobos);
const deimos=new THREE.Mesh(lumpy(8,1),moonMat);deimos.scale.setScalar(4);scene.add(deimos);

const ENV={sunDir:new THREE.Vector3(0,1,0),day:1,night:0,storm:0};
const C_DH=new THREE.Color('#dba574'),C_DZ=new THREE.Color('#a87a5c'),C_NH=new THREE.Color('#2a2236'),C_NZ=new THREE.Color('#06070e'),
  C_ST=new THREE.Color('#b06e44'),C_SET=new THREE.Color('#caa18a'),_c1=new THREE.Color(),_c2=new THREE.Color(),_c3=new THREE.Color(),_c4=new THREE.Color();
const nightMats=[];  // materials that glow at night: {m, k}
function sunVec(tod,out){const a=(tod-6.1)/12.4*Math.PI;return out.set(Math.cos(a),Math.sin(a)*0.88,0.32).normalize()}
function moonDir(a,tilt,out){return out.set(Math.cos(a),Math.sin(a)*0.8,tilt).normalize()}
let titleTime=16.9;
function updateEnv(dt,focus){
  const time=S?S.time:titleTime,tod=S&&DAY_LOCK[WS().day]!=null?DAY_LOCK[WS().day]:time%SOL_H;
  sunVec(tod,ENV.sunDir);
  const sy=ENV.sunDir.y,day=smooth(-0.14,0.12,sy);ENV.day=day;ENV.night=1-day;
  const st=S?S.storm.level:0;ENV.storm=st;
  const hor=_c1.copy(C_NH).lerp(C_DH,day),zen=_c2.copy(C_NZ).lerp(C_DZ,day);
  const sunset=(1-smooth(0.02,0.35,sy))*smooth(-0.16,0.0,sy);
  hor.lerp(C_SET,sunset*0.35);
  if(st>0){const sc=_c3.copy(C_ST).multiplyScalar(0.2+0.8*day);hor.lerp(sc,st*0.9);zen.lerp(sc,st*0.95)}
  skyU.hor.value.copy(hor);skyU.zen.value.copy(zen);skyU.sunDir.value.copy(ENV.sunDir);
  skyU.sunsetK.value=sunset*(1-st);skyU.day.value=day*(1-st*0.85);
  // aerial perspective: distant hills fade into a soft, bright haze
  const fogC=_c4.copy(hor).lerp(_c3.setRGB(0.98,0.86,0.76),0.18*day).multiplyScalar(0.98);scene.fog.color.copy(fogC);skyU.fogc.value.copy(fogC);
  skyU.tm.value=time*60;skyU.cloudK.value=1-st;
  scene.fog.near=lerp(50,6,st);scene.fog.far=lerp(VIEW*CHUNK-40,120,st);
  sun.intensity=smooth(-0.03,0.25,sy)*(1-0.7*st)*2.8;
  const w=smooth(0,0.4,sy);sun.color.setRGB(1,lerp(0.62,0.93,w),lerp(0.42,0.84,w));
  hemi.intensity=0.5+0.65*day*(1-0.25*st);
  // soft, cool fill light so shadows read lavender rather than black (a painterly look)
  hemi.color.copy(hor).lerp(_c3.setRGB(0.55,0.58,0.82),0.3*day+0.35*(1-day));
  hemi.groundColor.setRGB(lerp(0.05,0.34,day),lerp(0.03,0.2,day),lerp(0.05,0.2,day));
  renderer.toneMappingExposure=lerp(1.55,1.08,day);
  const so=smooth(0.25,0.95,1-day)*(1-st);stars.material.opacity=so;earthDot.material.opacity=so*smooth(0.3,0.6,1-day);
  stars.rotation.y=time*0.004;
  sky.position.copy(camera.position);stars.position.copy(camera.position);
  // Phobos rises in the west ~ every 11 h, Deimos crawls east->west over ~5 sols
  moonDir(Math.PI-((time/11.1)%1)*TAU,0.45,_v1);phobos.position.copy(camera.position).addScaledVector(_v1,1150);phobos.rotation.y=time*0.3;
  moonDir(((time/132)%1)*TAU+1.3,-0.2,_v1);deimos.position.copy(camera.position).addScaledVector(_v1,1180);
  const f=focus||camera.position;
  sun.position.set(f.x+ENV.sunDir.x*250,f.y+ENV.sunDir.y*250,f.z+ENV.sunDir.z*250);sun.target.position.set(f.x,f.y,f.z);
  if(typeof P!=='undefined'&&P.inside){sun.intensity=0;hemi.intensity=0.55;hemi.color.setRGB(1,0.93,0.84);hemi.groundColor.setRGB(0.4,0.33,0.28);renderer.toneMappingExposure=1.05} // indoor light only
  const nk=smooth(0.3,0.8,ENV.night+st*0.6);
  for(const n of nightMats)n.m.emissiveIntensity=n.base+n.k*nk;
}

/* =========================================================
   WEATHER FX: dust devils (twisting funnels with real wind forces) + storm particles
   ========================================================= */
const dustMat=new THREE.PointsMaterial({color:'#c48a5e',size:1.5,transparent:true,opacity:0.3,depthWrite:false});
const DEVIL_H=75,DEVIL_N=1500,DEVIL_BASE=260;
// soft, round dust puffs instead of square points
const puffTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.45,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
// the swirling dust shell: scrolling streaky noise on an open funnel
const funnelMat=()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,uniforms:{t:{value:0},op:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float t,op;varying vec2 vUv;
    float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float v=0.0,a=0.55;for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.1+vec2(3.1,7.7);a*=0.5;}return v;}
    void main(){float u=vUv.x,v=vUv.y;vec2 q=vec2(u*10.0+v*4.0-t*1.8,v*7.0-t*0.9);float n=fbm(q),s=fbm(q*vec2(0.5,3.0)+t*0.3);
      float a=smoothstep(0.32,0.8,n*0.7+s*0.4)*op*smoothstep(0.0,0.06,v)*(1.0-smoothstep(0.7,1.0,v));
      vec3 c=mix(vec3(0.62,0.31,0.13),vec3(0.98,0.6,0.3),n);gl_FragColor=vec4(c,a*0.72);}`});
const funnelGeo=(()=>{const pts=[];for(let i=0;i<=24;i++){const h=i/24*DEVIL_H;pts.push(new THREE.Vector2(1.2+h*0.16+Math.pow(h/DEVIL_H,3)*8,h))}return new THREE.LatheGeometry(pts,40)})();
const devils=[];
for(let d=0;d<3;d++){
  const r=mulberry(400+d),n=DEVIL_N+DEVIL_BASE,p=new Float32Array(n*3),col=new Float32Array(n*3),prm=new Float32Array(n*4);
  for(let i=0;i<n;i++){const base=i>=DEVIL_N,h=base?r()*3.5:Math.pow(r(),1.3)*DEVIL_H,rad=base?2+r()*9:0.6+h*0.12+r()*1.8+Math.pow(h/DEVIL_H,3)*7;
    prm[i*4]=h;prm[i*4+1]=rad;prm[i*4+2]=r()*TAU;prm[i*4+3]=0.7+r()*0.6;
    const k=base?0.6:0.6+0.4*(h/DEVIL_H);col[i*3]=0.78*k+0.2;col[i*3+1]=0.42*k+0.1;col[i*3+2]=0.18*k+0.04}   // orange Martian dust
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.PointsMaterial({size:3.4,map:puffTex,vertexColors:true,transparent:true,opacity:0,depthWrite:false});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;
  const funnel=new THREE.Mesh(funnelGeo,funnelMat());funnel.frustumCulled=false;
  const grp=new THREE.Group();grp.add(pts,funnel);scene.add(grp);grp.visible=false;
  devils.push({pts:grp,cloud:pts,funnel,prm,x:0,z:0,vx:0,vz:0,life:0,max:1,alive:false,wait:d*14+6,size:1,t:r()*10,op:0});
}
const stormPts=(()=>{const n=1600,p=new Float32Array(n*3);for(let i=0;i<n;i++){p[i*3]=(Math.random()-0.5)*140;p[i*3+1]=Math.random()*45;p[i*3+2]=(Math.random()-0.5)*140}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const s=new THREE.Points(g,new THREE.PointsMaterial({color:'#d39a6a',size:0.35,transparent:true,opacity:0,depthWrite:false}));s.frustumCulled=false;scene.add(s);return s})();
// strength of a devil at a point: k (0..1 within its reach), plus the swirl and pull directions
const devilReach=d=>22*d.size,devilCore=d=>4.2*d.size;
function devilAt(d,x,z){const dx=x-d.x,dz=z-d.z,dist=Math.hypot(dx,dz),R0=devilReach(d);if(!d.alive||(d.op||0)<0.15||dist>=R0)return null;
  const nx=dx/(dist||1),nz=dz/(dist||1);return{k:(1-dist/R0)*d.op,dist,nx,nz,tx:-nz,tz:nx}}
function updateWeatherFX(dt,focus){
  const guest=typeof net!=='undefined'&&net.role==='guest';
  for(const d of devils){
    if(!d.alive){d.pts.visible=false;if(guest)continue;d.wait-=dt;
      if(d.wait<=0&&ENV.day>0.55){const a=Math.random()*TAU,r=70+Math.random()*170,stormy=ENV.storm>0.3;
        d.x=focus.x+Math.cos(a)*r;d.z=focus.z+Math.sin(a)*r;
        const toP=Math.atan2(focus.z-d.z,focus.x-d.x)+(Math.random()-0.5)*0.9,sp=3+Math.random()*4;d.vx=Math.cos(toP)*sp;d.vz=Math.sin(toP)*sp; // drift across your path
        d.life=0;d.max=40+Math.random()*50;d.size=(stormy?1.05:0.7)+Math.random()*0.45;d.alive=true;d.cleaned=new Set()}
      continue}
    d.life+=dt;d.t+=dt;if(!guest&&S){const hb=nearestHabitat(d.x,d.z);if(hb){const dx=d.x-hb.x,dz=d.z-hb.z,dd=Math.hypot(dx,dz);if(dd<SAFE_R+40){const sp=Math.hypot(d.vx,d.vz)||3;d.vx=dx/dd*sp;d.vz=dz/dd*sp;if(dd<SAFE_R+15){d.x=hb.x+dx/dd*(SAFE_R+15);d.z=hb.z+dz/dd*(SAFE_R+15)}}}} // dust devils veer away from the base
    if(!guest){d.x+=d.vx*dt;d.z+=d.vz*dt;const w=Math.sin(d.t*0.3)*0.6;d.vx+=-d.vz*w*dt*0.2;d.vz+=d.vx*w*dt*0.2}
    d.op=smooth(0,5,d.life)*(1-smooth(d.max-6,d.max,d.life));
    const gy=groundHeight(d.x,d.z),S_=d.size;d.pts.visible=true;d.pts.position.set(d.x,gy-1,d.z);d.pts.scale.set(S_,S_,S_);
    d.cloud.material.opacity=0.5*d.op*(0.6+0.4*ENV.day);d.funnel.material.uniforms.op.value=d.op;d.funnel.material.uniforms.t.value=d.t;
    d.funnel.rotation.y=-d.t*2.2;d.funnel.rotation.z=Math.sin(d.t*0.7)*0.06;d.funnel.rotation.x=Math.cos(d.t*0.5)*0.05;
    // twist every particle: faster near the ground, the column sways as it goes up
    const arr=d.cloud.geometry.attributes.position.array,prm=d.prm,n=arr.length/3;
    for(let i=0;i<n;i++){const h=prm[i*4],rad=prm[i*4+1]*(1+0.15*Math.sin(d.t*3+h*0.2)),a=prm[i*4+2]+d.t*prm[i*4+3]*(i>=DEVIL_N?4.2:3.2-h/DEVIL_H*1.8),sway=Math.sin(d.t*0.7+h*0.04)*h*0.07;
      arr[i*3]=Math.cos(a)*rad+sway;arr[i*3+1]=i>=DEVIL_N?h+Math.abs(Math.sin(d.t*5+i))*1.5:h;arr[i*3+2]=Math.sin(a)*rad+sway*0.5}
    d.cloud.geometry.attributes.position.needsUpdate=true;
    if(S&&Math.random()<dt*3*d.op)puff(d.x+(Math.random()-0.5)*6*S_,gy,d.z+(Math.random()-0.5)*6*S_,2.5*S_);
    // rumble and shake when it's close
    const fd=Math.hypot(focus.x-d.x,focus.z-d.z);if(fd<70&&S){const k=(1-fd/70)*d.op;if(Math.random()<dt*4)sfx(0.6,160+Math.random()*120,0.6,0.07*k,'lowpass');game.shake=Math.max(game.shake||0,k*0.4)}
    if(S&&!guest)devilCleaning(d);
    if(!guest&&d.life>d.max){d.alive=false;d.wait=12+Math.random()*30}
  }
  if(typeof net!=='undefined'&&net.role==='host'&&(game.dvT=(game.dvT||0)-dt)<=0){game.dvT=0.4;netSend({t:'dv',l:devils.map(d=>d.alive?[+d.x.toFixed(1),+d.z.toFixed(1),+d.vx.toFixed(2),+d.vz.toFixed(2),+d.life.toFixed(1),+d.max.toFixed(1),+d.size.toFixed(2)]:0)})}
  const p=stormPts.geometry.attributes.position,arr=p.array,ws=8+ENV.storm*40;
  for(let i=0;i<arr.length;i+=3){arr[i]+=ws*dt;arr[i+2]+=ws*0.3*dt;if(arr[i]>70)arr[i]-=140;if(arr[i+2]>70)arr[i+2]-=140}
  p.needsUpdate=true;stormPts.position.set(camera.position.x,camera.position.y-20,camera.position.z);
  stormPts.material.opacity=0.04+ENV.storm*0.75;
  updateStormWall(dt);
}
const stormWall=(()=>{const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,uniforms:{t:{value:0},op:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float t,op;varying vec2 vUv;float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float v=0.0,a=0.55;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return v;}
    void main(){vec2 q=vec2(vUv.x*14.0-t*0.05,vUv.y*3.0-t*0.03);float n=fbm(q+fbm(q*1.7+t*0.04));
      float top=1.0-smoothstep(0.55+0.3*n,0.98,vUv.y),side=smoothstep(0.0,0.12,vUv.x)*smoothstep(1.0,0.88,vUv.x);
      vec3 c=mix(vec3(0.5,0.24,0.1),vec3(0.92,0.55,0.28),n);gl_FragColor=vec4(c,clamp(op*top*side*(0.55+0.6*n),0.0,1.0));}`});
  const w=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,48,1,true,-0.9,1.8),m);w.frustumCulled=false;w.visible=false;scene.add(w);return w})();
// how close the storm front is: on the horizon before it arrives, sweeping over you as it builds
function updateStormWall(dt){if(!S||cave.active||(typeof P!=='undefined'&&P.inside)){stormWall.visible=false;return}
  const s=S.storm,ahead=!s.active?S.nextStorm-S.time:-1;let dist=-1,op=0;
  if(!s.active&&ahead>=0&&ahead<3){dist=lerp(380,900,ahead/3);op=smooth(3,1.5,ahead)}
  else if(s.active&&s.level<0.55){dist=lerp(380,30,s.level/0.55);op=1-smooth(0.45,0.55,s.level)}
  if(dist<0||op<0.02){stormWall.visible=false;return}
  const wv=typeof windVec==='function'?windVec():{x:1,z:0},wa=Math.atan2(-wv.x,-wv.z),cp=camera.position;stormWall.visible=true;   // the front comes from upwind
  stormWall.position.set(cp.x,groundHeight(cp.x,cp.z)+120,cp.z);
  stormWall.scale.set(dist,300,dist);stormWall.rotation.y=wa;stormWall.material.uniforms.t.value+=dt*(4+s.level*20);stormWall.material.uniforms.op.value=op*0.95}
// guests mirror the host's devils
function onDevilSnap(d){if(!Array.isArray(d.l))return;d.l.slice(0,devils.length).forEach((a,i)=>{const v=devils[i];
  if(!Array.isArray(a)||a.length!==7||!a.every(isNum)){v.alive=false;return}
  if(!v.alive){v.alive=true;v.cleaned=new Set()}v.x=a[0];v.z=a[1];v.vx=a[2];v.vz=a[3];v.life=a[4];v.max=a[5];v.size=clamp(a[6],0.5,2.5)})}
/* ---------- the wind inside a devil ---------- */
// you: swirled around and pulled in; in the core you're lifted off your feet and flung out
function devilPushPlayer(p,dt){
  if(p!==P||game.dead||cave.depth>=2)return;
  for(const d of devils){const f=devilAt(d,P.pos.x,P.pos.z);if(!f)continue;const s=d.size,tang=8*f.k*s,pull=3.5*f.k*s;
    P.vel.x+=(f.tx*tang-f.nx*pull)*dt;P.vel.z+=(f.tz*tang-f.nz*pull)*dt;
    if(f.dist<devilCore(d)){
      if(!P.ragdoll){P.vel.y=Math.max(P.vel.y,2.4+1.2*s);P.onGround=false;startRagdoll(5,null);P.ragdoll.dmg=2+2*s;toast('The dust devil sweeps you off your feet!','bad')}
      else if(P.pos.y-groundHeight(P.pos.x,P.pos.z)<2.2*s)P.vel.y=Math.min(P.vel.y+6*s*dt,2.4*s);   // carried up several metres, then flung out
      if((game.devT=(game.devT||0)-dt)<=0){game.devT=1.2;hurt(0.8+0.5*s,'storm')}
    }}}
// the rover: shoved sideways, spun, and (in the core) lifted right off the ground
function devilPushRover(dt){
  if(cave.active)return;
  for(const d of devils){const f=devilAt(d,R.pos.x,R.pos.z);if(!f)continue;const s=d.size;
    R.pos.x+=(f.tx*3-f.nx*1.2)*f.k*s*dt;R.pos.z+=(f.tz*3-f.nz*1.2)*f.k*s*dt;R.yaw+=f.k*0.8*s*dt;
    if(f.dist<devilCore(d)*1.3&&R.pos.y-groundHeight(R.pos.x,R.pos.z)<1.5*s){R.vy=Math.max(R.vy,1.5*s);R.air=true;R.speed*=0.97;if(P.mode==='rover'&&(game.devR=(game.devR||0)-dt)<=0){game.devR=3;toast('The dust devil lifts the rover!','bad')}}}}
// creatures and dropped items get dragged around too
function devilPushThings(dt){
  if(!S||cave.active)return;
  if(typeof creatures!=='undefined'&&net.role!=='guest')for(const c of creatures.values()){if(c.sp==='wyrm'||c.sp==='lumari'||c.sp==='strider')continue;
    for(const d of devils){const f=devilAt(d,c.x,c.z);if(!f)continue;const light=['hopper','mite','skitter'].includes(c.sp)?1.6:c.sp==='ravager'||c.sp==='rockback'?0.35:0.8;
      c.x+=(f.tx*8-f.nx*3)*f.k*d.size*light*dt;c.z+=(f.tz*8-f.nz*3)*f.k*d.size*light*dt;if(f.k>0.5&&light>1)c.fear=Math.max(c.fear||0,3)}}
  if(typeof pickups!=='undefined')for(const pk of pickups.values())for(const d of devils){const f=devilAt(d,pk.x,pk.z);if(!f)continue;
    pk.x+=(f.tx*10-f.nx*4)*f.k*d.size*dt;pk.z+=(f.tz*10-f.nz*4)*f.k*d.size*dt;if(f.dist<devilCore(d)){pk.vy=Math.max(pk.vy,4*d.size);pk.y+=0.05}}
}

