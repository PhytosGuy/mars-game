'use strict';

/* =========================================================
   AUDIO (all synthesized; thin-atmosphere muffled ambience)
   ========================================================= */
const AU={ctx:null,sound:true,music:true,nextChord:0,ci:0};
function initAudio(){
  if(AU.ctx){if(AU.ctx.state==='suspended')AU.ctx.resume();return}
  try{
    const C=new(window.AudioContext||window.webkitAudioContext)();AU.ctx=C;
    const m=C.createGain();m.gain.value=0.8;m.connect(C.destination);AU.master=m;
    const len=C.sampleRate*4,nb=C.createBuffer(1,len,C.sampleRate),d=nb.getChannelData(0),wb=C.createBuffer(1,len,C.sampleRate),wd=wb.getChannelData(0);
    let l=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;l=(l+0.02*w)/1.02;d[i]=l*3.5;wd[i]=Math.random()*2-1}
    AU.wbuf=wb;AU.nbuf=nb;
    const src=b=>{const s=C.createBufferSource();s.buffer=b;s.loop=true;s.start();return s};
    const gain=v=>{const g=C.createGain();g.gain.value=v;return g};
    const filt=(type,f,q=1)=>{const b=C.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;return b};
    AU.windF=filt('lowpass',320);AU.windG=gain(0);src(nb).connect(AU.windF).connect(AU.windG).connect(m);
    AU.vacG=gain(0);src(wb).connect(filt('bandpass',1500,1.4)).connect(AU.vacG).connect(m);
    AU.breathG=gain(0);src(wb).connect(filt('bandpass',900,0.7)).connect(AU.breathG).connect(m);
    AU.o1=C.createOscillator();AU.o1.type='sawtooth';AU.o2=C.createOscillator();AU.o2.type='square';
    const mf=filt('lowpass',240);AU.motorG=gain(0);AU.o1.connect(mf);AU.o2.connect(mf);mf.connect(AU.motorG).connect(m);AU.o1.start();AU.o2.start();
    const h1=C.createOscillator(),h2=C.createOscillator();h1.frequency.value=58;h2.frequency.value=117;AU.humG=gain(0);h1.connect(AU.humG);h2.connect(AU.humG);AU.humG.connect(m);h1.start();h2.start();
    const conv=C.createConvolver(),il=Math.floor(C.sampleRate*4.5),ib=C.createBuffer(2,il,C.sampleRate);
    for(let ch=0;ch<2;ch++){const x=ib.getChannelData(ch);for(let i=0;i<il;i++)x[i]=(Math.random()*2-1)*Math.pow(1-i/il,2.6)}
    conv.buffer=ib;AU.musicG=gain(0.5);AU.musicIn=gain(1);AU.musicIn.connect(conv).connect(AU.musicG);AU.musicIn.connect(gain(0.25)).connect(AU.musicG);AU.musicG.connect(m);
    AU.nextChord=C.currentTime+1.5;
  }catch(e){AU.ctx=null}
}
function beep(f=880,d=0.08,type='sine',vol=0.07,delay=0){
  if(!AU.ctx||!AU.sound)return;const C=AU.ctx,t=C.currentTime+delay,o=C.createOscillator(),g=C.createGain();
  o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+d+0.05);
  o.connect(g).connect(AU.master);o.start(t);o.stop(t+d+0.1);
}
const CHORDS=[[220,261.6,329.6,392],[174.6,261.6,329.6,440],[196,246.9,293.7,392],[164.8,246.9,329.6,415.3],[146.8,220,293.7,349.2]];
function playChord(){
  const C=AU.ctx,t=C.currentTime,ch=CHORDS[AU.ci++%CHORDS.length];
  ch.concat([ch[0]/2]).forEach((f,i)=>{const o=C.createOscillator(),g=C.createGain(),lp=C.createBiquadFilter();o.type=i===4?'sine':'triangle';o.frequency.value=f*(1+(Math.random()-0.5)*0.004);
    lp.type='lowpass';lp.frequency.value=900;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(i===4?0.05:0.022,t+3+i*0.3);g.gain.linearRampToValueAtTime(0,t+11);
    o.connect(lp).connect(g).connect(AU.musicIn);o.start(t);o.stop(t+11.5)});
  if(Math.random()<0.6){const o=C.createOscillator(),g=C.createGain(),tt=t+2+Math.random()*4;o.frequency.value=ch[Math.floor(Math.random()*4)]*4;
    g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(0.012,tt+0.05);g.gain.exponentialRampToValueAtTime(0.0001,tt+3);o.connect(g).connect(AU.musicIn);o.start(tt);o.stop(tt+3.2)}
}
function updateAudio(){
  if(!AU.ctx)return;const C=AU.ctx,t=C.currentTime,on=AU.sound&&!game.paused,set=(g,v,k=0.15)=>g.gain.setTargetAtTime(on?v:0,t,k);
  const inPlay=game.state==='play',rv=inPlay&&P.mode==='rover';
  if(typeof updateAmbience==='function')updateAmbience();                      // wind gusts, storm howl, caves, night, base
  set(AU.breathG,inPlay&&P.mode==='foot'?0.03*Math.pow(Math.max(0,Math.sin(now*(P.o2<25?2.4:1.5))),3):0,0.05);
  set(AU.vacG,inPlay&&vac.mode?(vac.mode==='mine'?0.07:0.045):0,0.06);
  set(AU.motorG,rv?0.035+Math.abs(R.speed)*0.005:0,0.1);
  if(rv){AU.o1.frequency.setTargetAtTime(42+Math.abs(R.speed)*5,t,0.1);AU.o2.frequency.setTargetAtTime(63+Math.abs(R.speed)*7.5,t,0.1)}
  let hum=0;if(inPlay){const hm=home(),d=Math.hypot(hm.x-focusPos().x,hm.z-focusPos().z);hum=Math.max(0,1-d/45)*0.025}set(AU.humG,hum,0.3);
  AU.musicG.gain.setTargetAtTime(AU.music&&on?0.62*(typeof OPT!=='undefined'?OPT.music:1):0,t,0.8);
  AU.master.gain.setTargetAtTime(0.8*(typeof OPT!=='undefined'?OPT.sfx:1),t,0.2);
  if(typeof updateMusic==='function')updateMusic();
}

/* ---------- sound effects (synthesised, with cave echo) ---------- */
function sfxOut(){
  if(!cave.active)return AU.master;
  if(!AU.echo){const C=AU.ctx,d=C.createDelay(1);d.delayTime.value=0.27;const fb=C.createGain();fb.gain.value=0.42;const lp=C.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1500;
    const inp=C.createGain();inp.connect(AU.master);inp.connect(d);d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(AU.master);AU.echo=inp}
  return AU.echo;
}
function sfx(dur,f,q,vol,type='bandpass',delay=0,sweep){
  if(!AU.ctx||!AU.sound||!AU.wbuf)return;const C=AU.ctx,t=C.currentTime+delay,s=C.createBufferSource();s.buffer=AU.wbuf;
  const fl=C.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(sweep)fl.frequency.exponentialRampToValueAtTime(sweep,t+dur);fl.Q.value=q;
  const g=C.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(fl).connect(g).connect(sfxOut());s.start(t,Math.random()*3);s.stop(t+dur+0.05);
}
const SFX={
  step(){sfx(0.09,320+Math.random()*160,0.8,0.07,'lowpass');sfx(0.05,2200+Math.random()*800,1.5,0.014)},
  land(){sfx(0.3,160,0.7,0.16,'lowpass');beep(55,0.25,'sine',0.09)},
  radio(){sfx(0.14,2600,2.5,0.035);beep(1250,0.05,'sine',0.045,0.15);beep(950,0.06,'sine',0.045,0.22)},
  hiss(){sfx(1.1,3200,0.6,0.08,'bandpass',0,500)},
  boom(v){sfx(2.4,110,0.6,0.4*v,'lowpass',0,40);sfx(0.6,700,0.8,0.14*v,'lowpass');beep(38,1.2,'sine',0.22*v)},
};
function updateSfx(){
  if(!AU.ctx||!AU.wbuf||game.state!=='play')return;
  if(P.mode==='foot'){
    const hs=Math.hypot(P.vel.x,P.vel.z),ph=Math.floor(P.phase/Math.PI);
    if(P.onGround&&hs>0.6&&ph!==game.lastStep)SFX.step();game.lastStep=ph;
    if(P.onGround&&game.wasAir&&game.airVy<-3)SFX.land();
    game.wasAir=!P.onGround;if(!P.onGround)game.airVy=P.vel.y;
  }
  if(!AU.gravelG){const C=AU.ctx,s=C.createBufferSource();s.buffer=AU.wbuf;s.loop=true;const f=C.createBiquadFilter();f.type='bandpass';f.frequency.value=850;f.Q.value=0.5;
    AU.gravelG=C.createGain();AU.gravelG.gain.value=0;s.connect(f).connect(AU.gravelG).connect(AU.master);s.start()}
  const g=P.mode==='rover'&&!R.air&&AU.sound&&!game.paused?Math.min(0.06,Math.abs(R.speed)*0.005)*(0.7+Math.random()*0.6):0;
  AU.gravelG.gain.setTargetAtTime(g,AU.ctx.currentTime,0.05);
}

