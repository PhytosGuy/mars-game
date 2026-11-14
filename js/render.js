'use strict';
/* ---------- cinematic post-processing ---------- */
/* cel shading for every lit material: light falls into soft bands, plus a gentle rim of light on silhouettes */
{const k='lights_physical_pars_fragment',src=THREE.ShaderChunk[k],from='vec3 irradiance = dotNL * directLight.color;';
  if(src&&src.includes(from))THREE.ShaderChunk[k]=src.replace(from,'float toonNL = smoothstep( 0.0, 0.08, dotNL ) * 0.55 + smoothstep( 0.42, 0.5, dotNL ) * 0.45;\n\tfloat toonRim = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), 4.0 ) * smoothstep( 0.0, 0.2, dotNL ) * 0.35;\n\tvec3 irradiance = ( toonNL + toonRim ) * directLight.color;');
  else console.warn('Cel shading: shader chunk not found, using standard lighting')}
const GFX={q:(()=>{try{return localStorage.getItem('mlc-gfx')||'high'}catch(e){return'high'}})()};
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
function applyGfx(){
  const hi=GFX.q==='high',touch=matchMedia('(pointer:coarse)').matches;renderer.setPixelRatio(Math.min(devicePixelRatio,hi?(touch?1.25:1.75):1));renderer.setSize(innerWidth,innerHeight);
  composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);paintPass.uniforms.res.value.set(innerWidth*renderer.getPixelRatio(),innerHeight*renderer.getPixelRatio());
  const ms=hi?2048:1024;if(sun.shadow.mapSize.x!==ms){sun.shadow.mapSize.set(ms,ms);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}
  try{localStorage.setItem('mlc-gfx',GFX.q)}catch(e){}
}
addEventListener('resize',()=>{composer.setSize(innerWidth,innerHeight);paintPass.uniforms.res.value.set(innerWidth*renderer.getPixelRatio(),innerHeight*renderer.getPixelRatio())});
applyGfx();
function renderFrame(){
  bloomPass.strength=cave.active?0.4:0.3+0.5*ENV.night;
  const fl=gradePass.uniforms.flash;fl.value=Math.max(0,fl.value-0.025);
  paintPass.enabled=OPT.paint!==false;
  if(GFX.q==='high')composer.render();else renderer.render(scene,camera);
}

