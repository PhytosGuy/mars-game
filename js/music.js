'use strict';
/* =========================================================
   GENERATIVE MUSIC & AMBIENCE (original, all synthesised)
   Calm, sparse pieces in the spirit of sandbox exploration games: soft piano,
   warm pads, kalimba and bells, with playful synth arpeggios while you drive.
   Each piece is composed on the fly from a motif, a scale and a chord progression,
   so it never repeats. Music comes and goes with quiet gaps, like weather.
   ========================================================= */
const MUS={piece:null,next:0,cand:'',candT:0,seedN:1,bus:null,delay:null};
const mtof=m=>440*Math.pow(2,(m-69)/12);
const MODES={ionian:[0,2,4,5,7,9,11],lydian:[0,2,4,6,7,9,11],mixolydian:[0,2,4,5,7,9,10],dorian:[0,2,3,5,7,9,10],aeolian:[0,2,3,5,7,8,10],phrygian:[0,1,3,5,7,8,10]};
const MOODS={
  title:{modes:['lydian','ionian'],tempo:[62,68],lead:'piano',pad:'pad',bell:0.45,bass:true,density:0.6,roots:[60,62,65],gap:[5,9]},
  day:  {modes:['ionian','lydian','mixolydian'],tempo:[64,78],lead:'piano',pad:'pad',bell:0.35,bass:true,density:0.5,roots:[57,60,62,64,65,67],gap:[25,70]},
  base: {modes:['ionian','lydian'],tempo:[70,82],lead:'kalimba',pad:'pad',bell:0.25,bass:true,density:0.6,roots:[60,62,65,67],gap:[20,50]},
  night:{modes:['dorian','aeolian'],tempo:[54,62],lead:'piano',pad:'pad',bell:0.3,bass:true,density:0.36,roots:[57,59,62],gap:[30,80]},
  cave: {modes:['phrygian','aeolian','dorian'],tempo:[48,56],lead:'piano',pad:'dark',bell:0.12,bass:true,density:0.26,roots:[52,55,57],low:true,gap:[20,50]},
  rover:{modes:['mixolydian','dorian','ionian'],tempo:[94,106],lead:'arp',pad:'pad',bell:0.3,bass:true,density:0.8,roots:[57,60,62],gap:[6,16]},
  storm:{modes:['phrygian','aeolian'],tempo:[46,52],lead:null,pad:'dark',bell:0,bass:true,pulse:true,density:0.2,roots:[50,52],gap:[8,16]},
};
// chord progressions as scale degrees (0 = tonic), one chord per bar or per two bars
const PROGS=[[0,4,5,3],[0,5,3,4],[5,3,0,4],[0,2,3,0],[0,3,0,4],[3,4,0,5],[0,1,0,4],[5,6,0,4],[0,3,5,4],[3,0,4,0]];
function currentMood(){
  if(typeof game==='undefined'||game.state!=='play'||!S)return'title';
  if(cave.active)return'cave';
  if(S.storm.level>0.45||(S.spe&&S.spe.active))return'storm';
  if(P.mode==='rover'&&Math.abs(R.speed)>4)return'rover';
  if(nearHab(focusPos(),45))return'base';
  return ENV.night>0.6?'night':'day';
}
function composePiece(mood){
  const M=MOODS[mood],r=mulberry(((Date.now()&0xffffff)^(MUS.seedN++*7919))>>>0),pick=a=>a[Math.floor(r()*a.length)];
  const mode=MODES[pick(M.modes)],root=pick(M.roots)+(M.low?-12:0),bpm=M.tempo[0]+r()*(M.tempo[1]-M.tempo[0]),beat=60/bpm,bar=beat*4;
  const deg=(d,oct=0)=>{const o=Math.floor(d/7),i=((d%7)+7)%7;return root+mode[i]+12*(o+oct)};
  const prog=pick(PROGS),bars=pick([8,12,16]),hold=bpm>90?1:(r()<0.5?2:1),ev=[];
  // a short motif (rhythm in eighth notes + scale steps), reused bar after bar against the changing chords
  const motif=[];let pos=0;const len=3+Math.floor(r()*4);for(let i=0;i<len&&pos<8;i++){motif.push({e:pos,step:Math.round((r()-0.5)*5)});pos+=pick([1,1,2,2,3])}
  const answer=motif.map(n=>({e:n.e,step:-n.step+pick([0,1,-1])}));          // a reply phrase: the motif turned upside down
  const add=(t,inst,f,d,v)=>ev.push({t:Math.max(0,t+(r()-0.5)*0.02),inst,f,d,v});
  for(let b=0;b<bars;b++){
    const ch=prog[Math.floor(b/hold)%prog.length],t0=b*bar,first=b%hold===0;
    if(M.pad&&first)[0,2,4].forEach(k=>add(t0,M.pad,mtof(deg(ch+k,-1)),bar*hold+1.8,0.045));
    if(M.bass&&first)add(t0,'bass',mtof(deg(ch,-2)),bar*hold,0.085);
    if(M.pulse)for(let s=0;s<4;s++)add(t0+s*beat,'pulse',mtof(deg(ch,-2)),beat*0.6,s===0?0.07:0.04);
    if(M.lead==='arp'&&b>0&&b<bars-1){const pat=pick([[0,2,4,7,4,2,0,4],[0,4,7,4,9,7,4,2],[0,2,4,2,7,4,2,4]]);
      pat.forEach((k,s)=>{if(r()<0.92)add(t0+s*beat/2,'arp',mtof(deg(ch+k,0)),beat*0.42,0.045+(s%4===0?0.015:0))})}
    else if(M.lead&&b>0&&b<bars-1&&r()<0.88){
      const phrase=(b%4===3)?answer:motif,reg=pick([0,2,4]);
      for(const n of phrase){if(r()>M.density+0.35)continue;let d=ch+reg+n.step;if(n.e%4===0)d=ch+pick([0,2,4,7]); // strong beats land on chord tones
        add(t0+n.e*beat/2,M.lead,mtof(deg(d,M.lead==='kalimba'?1:0)+12),M.lead==='kalimba'?1.4:beat*2.5,0.06+r()*0.03)}}
    if(M.bell&&r()<M.bell)add(t0+beat*pick([1,1.5,2,3]),'bell',mtof(deg(ch+pick([4,7,9]),1)+12),3,0.022);
  }
  add(bars*bar,M.lead&&M.lead!=='arp'?M.lead:'piano',mtof(deg(0,0)+12),4,0.06);   // resolve home
  if(M.pad)[0,2,4].forEach(k=>add(bars*bar,M.pad,mtof(deg(k,-1)),5,0.04));
  ev.sort((a,b)=>a.t-b.t);
  return{mood,events:ev,len:bars*bar+6,idx:0,t0:0,out:null};
}
/* ---------- instruments ---------- */
function env(g,t,a,peak,d,curve){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);if(curve==='exp')g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);else{g.gain.setValueAtTime(peak,t+a+d*0.6);g.gain.linearRampToValueAtTime(0,t+a+d)}}
function osc(type,f,t,stop,det=0){const o=AU.ctx.createOscillator();o.type=type;o.frequency.value=f;o.detune.value=det;o.start(t);o.stop(stop);return o}
function voice(e,t,out){
  const C=AU.ctx,g=C.createGain(),pan=C.createStereoPanner?C.createStereoPanner():null;if(pan){pan.pan.value=(Math.random()-0.5)*0.6;g.connect(pan).connect(out)}else g.connect(out);
  const f=e.f,d=e.d,v=e.v;
  switch(e.inst){
    case'piano':{ // felt piano: soft hammer, partials that fade faster the higher they are
      [[1,1,1],[2,0.38,0.6],[3,0.12,0.4],[4.02,0.05,0.25]].forEach(([m,a,k])=>{const pg=C.createGain();env(pg,t,0.008,v*a,Math.min(6,1.6+260/f)*k,'exp');osc('sine',f*m,t,t+8).connect(pg).connect(g)});
      g.gain.value=1;const lp=C.createBiquadFilter();break}
    case'kalimba':{const a=C.createGain();env(a,t,0.004,v,1.3,'exp');osc('sine',f,t,t+2).connect(a).connect(g);
      const b=C.createGain();env(b,t,0.002,v*0.3,0.35,'exp');osc('sine',f*2.98,t,t+1).connect(b).connect(g);g.gain.value=1;break}
    case'bell':{const car=osc('sine',f,t,t+d+1),mod=osc('sine',f*3.5,t,t+d+1),mi=C.createGain();mi.gain.setValueAtTime(f*2.2,t);mi.gain.exponentialRampToValueAtTime(1,t+d);mod.connect(mi).connect(car.frequency);
      env(g,t,0.003,v,d,'exp');car.connect(g);break}
    case'pad':case'dark':{const lp=C.createBiquadFilter();lp.type='lowpass';lp.frequency.value=e.inst==='dark'?360:820;lp.Q.value=0.6;
      osc('sawtooth',f,t,t+d+3,-7).connect(lp);osc('sawtooth',f,t,t+d+3,7).connect(lp);osc('triangle',f/2,t,t+d+3).connect(lp);lp.connect(g);
      const a=Math.min(3,d*0.35);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*0.5,t+a);g.gain.setValueAtTime(v*0.5,t+d);g.gain.linearRampToValueAtTime(0,t+d+2.5);break}
    case'bass':{const lp=C.createBiquadFilter();lp.type='lowpass';lp.frequency.value=260;osc('sine',f,t,t+d+2).connect(lp);osc('triangle',f*2,t,t+d+2).connect(lp);lp.connect(g);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.35);g.gain.setValueAtTime(v,t+d*0.8);g.gain.linearRampToValueAtTime(0,t+d+1.2);break}
    case'arp':{const lp=C.createBiquadFilter();lp.type='lowpass';lp.Q.value=4;lp.frequency.setValueAtTime(2600,t);lp.frequency.exponentialRampToValueAtTime(500,t+d+0.1);
      osc('square',f,t,t+d+0.4).connect(lp);osc('triangle',f*2,t,t+d+0.4,4).connect(lp);lp.connect(g);env(g,t,0.005,v*0.55,d+0.25,'exp');break}
    case'pulse':{osc('sine',f,t,t+d+0.5).connect(g);env(g,t,0.01,v,d,'exp');break}
  }
}
function initMusicBus(){
  const C=AU.ctx;MUS.bus=C.createGain();MUS.bus.gain.value=1;MUS.bus.connect(AU.musicIn);
  // a soft echo that makes the piano and bells feel spacious
  const dl=C.createDelay(2);dl.delayTime.value=0.42;const fb=C.createGain();fb.gain.value=0.32;const lp=C.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;const wet=C.createGain();wet.gain.value=0.35;
  MUS.bus.connect(dl);dl.connect(lp).connect(fb).connect(dl);lp.connect(wet).connect(AU.musicIn);
}
function updateMusic(){
  const C=AU.ctx,t=C.currentTime;if(!MUS.bus)initMusicBus();
  const mood=currentMood();
  if(mood!==MUS.cand){MUS.cand=mood;MUS.candT=t}
  const settled=t-MUS.candT>3.5;                                            // only react once the new situation has lasted a moment
  if(MUS.piece&&settled&&mood!==MUS.piece.mood){const out=MUS.piece.out;out.gain.setTargetAtTime(0,t,1.2);setTimeout(()=>{try{out.disconnect()}catch(e){}},8000);MUS.piece=null;MUS.next=t+2.5+Math.random()*3}
  if(!MUS.piece){
    if(AU.music&&settled&&t>=MUS.next){const p=composePiece(mood);p.t0=t+0.3;p.out=C.createGain();p.out.gain.value=1;p.out.connect(MUS.bus);MUS.piece=p}
    return}
  const p=MUS.piece;
  while(p.idx<p.events.length&&p.t0+p.events[p.idx].t<t+0.8){const e=p.events[p.idx++];if(AU.music)voice(e,Math.max(t,p.t0+e.t),p.out)}
  if(t>p.t0+p.len){const M=MOODS[p.mood];MUS.piece=null;MUS.next=t+M.gap[0]+Math.random()*(M.gap[1]-M.gap[0])}
}
/* ---------- ambience: wind gusts, storm howl & grit, caves, night, base ---------- */
const AMB={};
function initAmbience(){
  const C=AU.ctx,M=AU.master,loop=b=>{const s=C.createBufferSource();s.buffer=b;s.loop=true;s.start(0,Math.random()*3);return s},
    filt=(type,f,q=1)=>{const b=C.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;return b},gain=()=>{const g=C.createGain();g.gain.value=0;return g};
  AMB.howlF=filt('bandpass',800,9);AMB.howlG=gain();loop(AU.wbuf).connect(AMB.howlF).connect(AMB.howlG).connect(M);          // whistling storm wind
  AMB.gritG=gain();loop(AU.wbuf).connect(filt('highpass',3800,0.5)).connect(AMB.gritG).connect(M);                       // sand hissing on the visor
  AMB.rumbleG=gain();loop(AU.nbuf).connect(filt('lowpass',90,0.7)).connect(AMB.rumbleG).connect(M);                     // deep cave rumble
  AMB.ventG=gain();loop(AU.wbuf).connect(filt('bandpass',420,1.2)).connect(AMB.ventG).connect(M);                       // habitat ventilation
  AMB.droneG=gain();const d1=C.createOscillator(),d2=C.createOscillator();d1.frequency.value=46;d2.frequency.value=69.3;d1.connect(AMB.droneG);d2.connect(AMB.droneG);AMB.droneG.connect(M);d1.start();d2.start(); // night
  AMB.next={drip:0,creak:0,click:0,gust:0};
}
function updateAmbience(){
  const C=AU.ctx,t=C.currentTime;if(!AMB.howlG)initAmbience();
  const on=AU.sound&&!game.paused,play=game.state==='play',st=ENV.storm,set=(g,v,k=0.4)=>g.gain.setTargetAtTime(on?v:0,t,k);
  const inCave=play&&cave.active,outside=play&&!inCave&&!(P.mode==='foot'&&nearHab(P.pos,5)),exposed=outside&&P.mode==='foot';
  // gusts breathe in and out on top of the base wind
  const gust=0.65+0.35*Math.sin(t*0.37)*Math.sin(t*0.13+1.7)+0.25*Math.max(0,Math.sin(t*0.9+Math.sin(t*0.21)*3));
  set(AU.windG,inCave?0.012:(0.04+st*0.32)*gust*(P.mode==='rover'?0.6:1)+(P.mode==='rover'?Math.abs(R.speed)*0.003:0),0.35);
  AU.windF.frequency.setTargetAtTime(inCave?140:(260+st*800)*(0.8+gust*0.3),t,0.4);
  set(AMB.howlG,!inCave&&st>0.25?(st-0.25)*0.07*(0.4+0.6*Math.max(0,Math.sin(t*0.6+Math.sin(t*0.17)*2))):0,0.3);
  AMB.howlF.frequency.setTargetAtTime(700+500*Math.sin(t*0.5)+st*400,t,0.4);
  set(AMB.gritG,exposed?st*0.045:outside?st*0.012:0,0.3);
  set(AMB.rumbleG,inCave?0.11+Math.min(0.08,cave.depth*0.002):0,0.8);
  const hm=play?home():null,dh=play?Math.hypot(hm.x-focusPos().x,hm.z-focusPos().z):1e9;
  set(AMB.ventG,play&&!inCave?Math.max(0,1-dh/30)*0.02:0,0.6);
  set(AMB.droneG,play&&!inCave?ENV.night*0.012*(0.6+0.4*Math.sin(t*0.07)):0,1.5);
  if(!on||!play)return;
  // cave drips echo through the tunnels; the odd creak of rock
  if(inCave&&t>AMB.next.drip){AMB.next.drip=t+0.8+Math.random()*3;const f=1400+Math.random()*1300,o=C.createOscillator(),g=C.createGain();o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*0.55,t+0.09);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.03,t+0.004);g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);o.connect(g).connect(sfxOut());o.start(t);o.stop(t+0.25)}
  if(inCave&&t>AMB.next.creak){AMB.next.creak=t+9+Math.random()*16;sfx(1.4,180+Math.random()*80,6,0.03,'bandpass',0,90)}
  // small mechanical clicks and pumps around the base
  if(!inCave&&dh<25&&t>AMB.next.click){AMB.next.click=t+3+Math.random()*7;beep(2400+Math.random()*900,0.015,'square',0.006);if(Math.random()<0.4)sfx(0.6,300,1,0.012,'bandpass',0.05,900)}
}
