'use strict';
/* ---------- cinematic post-processing ---------- */
/* cel shading for every lit material: light falls into soft bands, plus a gentle rim of light on silhouettes */
{const k='lights_physical_pars_fragment',src=THREE.ShaderChunk[k],from='vec3 irradiance = dotNL * directLight.color;';
  if(src&&src.includes(from))THREE.ShaderChunk[k]=src.replace(from,'float toonNL = smoothstep( 0.0, 0.08, dotNL ) * 0.55 + smoothstep( 0.42, 0.5, dotNL ) * 0.45;\n\tfloat toonRim = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), 4.0 ) * smoothstep( 0.0, 0.2, dotNL ) * 0.35;\n\tvec3 irradiance = ( toonNL + toonRim ) * directLight.color;');
  else console.warn('Cel shading: shader chunk not found, using standard lighting')}
const GFX={q:(()=>{try{const v=localStorage.getItem('mlc-gfx');return v==='fast'?'low':v||'auto'}catch(e){return'auto'}})(),scale:1,post:true,ema:1/60,t:0};
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloomPass=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.35,0.5,0.92);composer.addPass(bloomPass);
// painterly brush pass (a 4-sector Kuwahara filter): flattens small detail into soft strokes, like a painted landscape
const paintPass=new ShaderPass({uniforms:{tDiffuse:{value:null},res:{value:new THREE.Vector2(innerWidth,innerHeight)}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 res;varying vec2 vUv;
    void main(){vec2 px=1.0/res;vec3 m[4];vec3 s[4];for(int k=0;k<4;k++){m[k]=vec3(0.0);s[k]=vec3(0.0);}
      for(int j=-2;j<=2;j++)for(int i=-2;i<=2;i++){vec3 c=texture2D(tDiffuse,vUv+vec2(float(i),float(j))*px).rgb;
        if(i<=0&&j<=0){m[0]+=c;s[0]+=c*c;}if(i>=0&&j<=0){m[1]+=c;s[1]+=c*c;}if(i<=0&&j>=0){m[2]+=c;s[2]+=c*c;}if(i>=0&&j>=0){m[3]+=c;s[3]+=c*c;}}
      float best=1e9;vec3 outc=vec3(0.0);for(int k=0;k<4;k++){vec3 mu=m[k]/9.0;vec3 v=abs(s[k]/9.0-mu*mu);float sv=v.r+v.g+v.b;if(sv<best){best=sv;outc=mu;}}
      gl_FragColor=vec4(outc,texture2D(tDiffuse,vUv).a);}`});
composer.addPass(paintPass);
const gradePass=new ShaderPass({uniforms:{tDiffuse:{value:null},vig:{value:0.32},warm:{value:0.03},flash:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform float vig,warm,flash;varying vec2 vUv;
    void main(){vec4 c=texture2D(tDiffuse,vUv);
      // grade: lifted, cool shadows, warm highlights and a touch more colour
      float l=dot(c.rgb,vec3(0.299,0.587,0.114));c.rgb=mix(vec3(l),c.rgb,1.12);c.rgb+=vec3(0.02,0.025,0.05)*(1.0-smoothstep(0.0,0.45,l));c.rgb*=mix(vec3(0.97,0.98,1.04),vec3(1.03,1.0,0.96),smoothstep(0.3,0.8,l));
      vec2 d=vUv-0.5;c.rgb*=1.0-dot(d,d)*vig*2.4;c.r*=1.0+warm;c.b*=1.0-warm;c.rgb+=vec3(1.0,0.78,0.55)*flash;gl_FragColor=c;}`});
composer.addPass(gradePass);composer.addPass(new OutputPass());
// graphics levels: High, Medium, Low, or Auto (watches your frame rate and adjusts resolution, shadows and effects)
function gfxLevel(){const touch=matchMedia('(pointer:coarse)').matches;return GFX.q==='auto'?(GFX.autoLvl||(touch?'medium':'high')):GFX.q}
function applyGfx(){
  const lv=gfxLevel(),touch=matchMedia('(pointer:coarse)').matches,cap={high:touch?1.3:1.75,medium:touch?1.0:1.25,low:touch?0.75:0.85}[lv]||1;
  GFX.post=lv!=='low';sun.castShadow=lv!=='low';
  renderer.setPixelRatio(Math.max(0.5,Math.min(devicePixelRatio,cap)*(GFX.q==='auto'?GFX.scale:1)));renderer.setSize(innerWidth,innerHeight);
  composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);paintPass.uniforms.res.value.set(innerWidth*renderer.getPixelRatio(),innerHeight*renderer.getPixelRatio());
  const ms=lv==='high'?2048:1024;if(sun.shadow.mapSize.x!==ms){sun.shadow.mapSize.set(ms,ms);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}
  try{localStorage.setItem('mlc-gfx',GFX.q)}catch(e){}
}
addEventListener('resize',()=>{composer.setSize(innerWidth,innerHeight);paintPass.uniforms.res.value.set(innerWidth*renderer.getPixelRatio(),innerHeight*renderer.getPixelRatio())});
applyGfx();
function renderFrame(){
  bloomPass.strength=cave.active?0.4:0.3+0.5*ENV.night;
  const fl=gradePass.uniforms.flash;fl.value=Math.max(0,fl.value-0.025);
  paintPass.enabled=OPT.paint!==false&&!game.landing;   // keep the cockpit screens sharp during the landing
  if(game.orbitView&&typeof ORB!=='undefined'&&ORB.scene){renderer.render(ORB.scene,camera);return}   // the landing starts in orbit
  if(GFX.post)composer.render();else renderer.render(scene,camera);
}


// Auto graphics: every couple of seconds, lower or raise the resolution (and effects) to keep the game smooth
function gfxAuto(dt){if(GFX.q!=='auto'||game.state==='title')return;GFX.ema+=(dt-GFX.ema)*0.05;if((GFX.t+=dt)<2.5)return;GFX.t=0;
  const lv=gfxLevel();let ch=false;
  if(GFX.ema>1/38){if(GFX.scale>0.62){GFX.scale=Math.max(0.6,GFX.scale-0.1);ch=true}else if(lv!=='low'){GFX.autoLvl=lv==='high'?'medium':'low';GFX.scale=0.85;ch=true}}
  else if(GFX.ema<1/57){if(GFX.scale<1){GFX.scale=Math.min(1,GFX.scale+0.05);ch=true}else if(lv==='low'){GFX.autoLvl='medium';GFX.scale=0.8;ch=true}}
  if(ch)applyGfx()}
