'use strict';
/* =========================================================
   UTILITIES
   ========================================================= */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
const TAU=Math.PI*2;
const wrapA=a=>{a=(a+Math.PI)%TAU;if(a<0)a+=TAU;return a-Math.PI};
const lerpA=(a,b,t)=>a+wrapA(b-a)*t;
const damp=(k,dt)=>1-Math.exp(-k*dt);
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashI(x,z,s){let h=(Math.imul(x|0,374761393)+Math.imul(z|0,668265263)+Math.imul(s|0,1442695041))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return h>>>0}
const hash2=(x,z,s)=>hashI(x,z,s)/4294967296;
function strHash(s){let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDist=d=>d<1000?Math.round(d)+' m':(d/1000).toFixed(1)+' km';
const pad2=n=>String(n).padStart(2,'0');

function makeNoise(seed){
  const rnd=mulberry(seed),p=new Uint8Array(256);
  for(let i=0;i<256;i++)p[i]=i;
  for(let i=255;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=p[i];p[i]=p[j];p[j]=t}
  const perm=new Uint8Array(512);for(let i=0;i<512;i++)perm[i]=p[i&255];
  const gx=[1,-1,1,-1,1,-1,0,0],gy=[1,1,-1,-1,0,0,1,-1];
  const F2=0.5*(Math.sqrt(3)-1),G2=(3-Math.sqrt(3))/6;
  return(xin,yin)=>{
    const s=(xin+yin)*F2,i=Math.floor(xin+s),j=Math.floor(yin+s),t=(i+j)*G2;
    const x0=xin-(i-t),y0=yin-(j-t),i1=x0>y0?1:0,j1=x0>y0?0:1;
    const x1=x0-i1+G2,y1=y0-j1+G2,x2=x0-1+2*G2,y2=y0-1+2*G2,ii=i&255,jj=j&255;
    let n=0,q,g;
    q=0.5-x0*x0-y0*y0;if(q>0){g=perm[ii+perm[jj]]&7;q*=q;n+=q*q*(gx[g]*x0+gy[g]*y0)}
    q=0.5-x1*x1-y1*y1;if(q>0){g=perm[ii+i1+perm[jj+j1]]&7;q*=q;n+=q*q*(gx[g]*x1+gy[g]*y1)}
    q=0.5-x2*x2-y2*y2;if(q>0){g=perm[ii+1+perm[jj+1]]&7;q*=q;n+=q*q*(gx[g]*x2+gy[g]*y2)}
    return 70*n;
  };
}
function fbm(n,x,z,o){let s=0,a=1,f=1,t=0;for(let i=0;i<o;i++){s+=n(x*f,z*f)*a;t+=a;a*=0.5;f*=2.03}return s/t}
function ridged(n,x,z){let s=0,a=1,f=1,t=0;for(let i=0;i<3;i++){s+=(1-Math.abs(n(x*f,z*f)))*a;t+=a;a*=0.5;f*=2.1}return s/t}

/* =========================================================
   CONSTANTS & LANDING SITES
   ========================================================= */
const SOL_H=24.66;            // a sol = 24 h 37 min
const SOL_REAL=480;           // real seconds per sol
const HPS=SOL_H/SOL_REAL;     // game hours per real second
const G=3.721;                // Mars surface gravity m/s²
const CHUNK=96,NSEG=24,CELL=4,VIEW=6;

const SITES={
  jezero:{name:'Jezero-type Delta',inspired:'Inspired by Jezero Crater (18.4°N, 77.5°E), where Perseverance explores an ancient river delta.',seed:1821,
    hills:13,mtn:0.35,dunes:0.3,craters:0.42,iceTh:0.8,ice:[[430,-330,130]],rim:[1250,75],
    features:[{x:-380,z:-430,r:270,h:24,terrace:2.4}],temp:[-83,-18],
    pros:'Rich ancient-lake geology',cons:'Uneven ground, scarce ice',meters:{build:2,water:1,science:3},
    lava:[-820,640],org:[[-330,-360],[760,430]]},
  utopia:{name:'Ice-rich Plains',inspired:'Inspired by Utopia & Arcadia Planitia, where MRO’s SHARAD radar found thick buried ice.',seed:4407,
    hills:7,mtn:0.08,dunes:0.2,craters:0.6,iceTh:0.48,ice:[[210,170,180]],rim:null,features:[],temp:[-98,-32],
    pros:'Abundant subsurface ice',cons:'Colder nights, fewer outcrops',meters:{build:3,water:3,science:1},
    lava:[-900,-520],org:[[560,-520],[-640,780]]},
  gale:{name:'Crater Basin',inspired:'Inspired by Gale Crater & Mount Sharp, home of the Curiosity rover since 2012.',seed:2012,
    hills:16,mtn:0.45,dunes:0.6,craters:0.4,iceTh:0.79,ice:[[-380,260,120]],rim:[1700,110],
    features:[{x:0,z:-1080,r:520,h:210,terrace:6}],temp:[-90,-10],
    pros:'Exposed rock layers',cons:'Slopes and active dunes',meters:{build:2,water:2,science:3},
    lava:[860,-420],org:[[300,-560],[-700,-380]]},
  tharsis:{name:'Volcanic Highlands',inspired:'Inspired by the Tharsis region and the lava-tube skylights seen on Arsia Mons.',seed:7777,
    hills:28,mtn:1.0,dunes:0.1,craters:0.3,iceTh:0.82,ice:[[-450,-300,125]],rim:null,
    features:[{x:950,z:320,r:620,h:270,terrace:0,caldera:true}],temp:[-95,-25],dark:0.35,
    pros:'Lava tubes, volcanic geology',cons:'Rough building ground',meters:{build:1,water:1,science:3},
    lava:[520,-380],org:[[-560,520],[700,700]]},
  elysium:{name:'Rocky Plains',inspired:'Inspired by Elysium Planitia, the flat plain where the InSight lander studied marsquakes.',seed:3141,
    hills:5,mtn:0.05,dunes:0.15,craters:0.5,iceTh:0.9,ice:[[620,-520,130]],rim:null,features:[],temp:[-95,-20],
    pros:'Flat, easy construction',cons:'Water ice is far away',meters:{build:3,water:1,science:2},
    lava:[-760,700],org:[[480,560],[-820,-500]]},
};

/* =========================================================
   RENDERER / SCENE
   ========================================================= */
const canvas=$('#game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.3,2400);
scene.fog=new THREE.Fog(0xc08060,80,560);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});

const sun=new THREE.DirectionalLight(0xfff0e0,2.6);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
{const c=sun.shadow.camera;c.left=-70;c.right=70;c.top=70;c.bottom=-70;c.near=1;c.far=600}
sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.05;
scene.add(sun,sun.target);
const hemi=new THREE.HemisphereLight(0xd8a070,0x5a2a18,0.7);scene.add(hemi);
/* ---------- player settings (this device): volume, sensitivity, look, controls ---------- */
const OPT=Object.assign({music:0.7,sfx:0.9,sens:1,paint:true,guide:true,touch:'auto'},(()=>{try{return JSON.parse(localStorage.getItem('mlc-opts'))||{}}catch(e){return{}}})());
function saveOpts(){try{localStorage.setItem('mlc-opts',JSON.stringify(OPT))}catch(e){}}
