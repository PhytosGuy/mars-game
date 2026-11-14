'use strict';
/* =========================================================
   ALIEN COMMUNICATION: glyph languages, learning, dialogue,
   gifts, trades, requests and reputation
   ========================================================= */
const WORDS=['greet','friend','you','we','star','water','stone','metal','sky','fire','wind','storm','deep','ground','shake','danger','walker','shadow','night',
  'light','energy','home','child','old','ones','place','far','near','see','path','give','gift','trade','share','want','thank','yes','no','follow','sleep'];
const GESTURE={water:'cups its hands as if holding water',stone:'taps a rock',metal:'points at your suit',sky:'raises an arm to the sky',ground:'presses a hand to the ground',home:'gestures back toward its home',
  light:'glows brightly',energy:'pulses with light',follow:'drifts a little away, then back',deep:'sinks low toward the floor',star:'points at you, then up at the stars',give:'holds out an open hand',child:'lowers its hand to knee height',danger:'flinches and looks around'};
const SP_TALK={tharrak:{verb:'hums',color:'#ffcf6a'},lumari:{verb:'pulses',color:'#6fe0c8'}};
const GIFT_PREF={tharrak:{ice:6,plate:4,crystal:5,glass:3,titanium:3,flare:-3},lumari:{cell:8,crystal:5,resonite:4,lamp:3,flare:-6,chitin:-4}};
const TRADES={tharrak:[{give:{ice:3},get:{titanium:2}},{give:{plate:4},get:{alloy:1}},{give:{glass:4},get:{crystal:2}},{give:{cell:1},get:{tablet:1}}],
  lumari:[{give:{cell:1},get:{resonite:1}},{give:{crystal:3},get:{resonite:1}},{give:{lamp:1},get:{crystal:2}}]};
const REQUESTS={tharrak:{item:'ice',n:5,reward:{alloy:2,tablet:1},rep:20,line:['water','give','child','want'],text:'They need water ice for their young'},
  lumari:{item:'cell',n:2,reward:{resonite:2},rep:20,line:['light','energy','want','give'],text:'Their light is fading: they want energy'}};
/* ---------- glyphs ---------- */
const glyphCache={};
function glyph(sp,w){const k=sp+w;if(glyphCache[k])return glyphCache[k];const r=mulberry(strHash(k));let s='';
  if(sp==='lumari'){for(let i=0;i<9;i++)if(r()<0.55){const x=4+(i%3)*8,y=4+Math.floor(i/3)*8,c=['#6fe0c8','#c69bff','#ffe28a','#8fd8ff'][Math.floor(r()*4)];s+=`<circle cx="${x}" cy="${y}" r="${1.6+r()*1.6}" fill="${c}"/>`}}
  else{let x=4+r()*16,y=3+r()*6;let d=`M${x.toFixed(1)} ${y.toFixed(1)}`;for(let i=0;i<4+Math.floor(r()*3);i++){x=clamp(x+(r()-0.5)*14,2,22);y=clamp(y+r()*7-1,2,22);d+=` L${x.toFixed(1)} ${y.toFixed(1)}`}
    s=`<path d="${d}" fill="none" stroke="#ffcf6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;if(r()<0.5)s+=`<circle cx="${(4+r()*16).toFixed(1)}" cy="${(16+r()*6).toFixed(1)}" r="1.6" fill="#ffcf6a"/>`}
  return glyphCache[k]=`<svg viewBox="0 0 24 24" width="30" height="30">${s}</svg>`}
const knows=(sp,w)=>(S.lang[sp]||[]).includes(w);
const comprehension=sp=>Math.round((S.lang[sp]||[]).length/WORDS.length*100);
const hasDecoder=()=>slotsCount(S.inv,'decoder')>0;
function lineHTML(sp,words){return words.map(w=>{const k=knows(sp,w);return`<span class="gw${k?' known':''}">${glyph(sp,w)}<i>${k?esc(w):hasDecoder()?esc(w)+'?':'···'}</i></span>`}).join('')}
function learnWords(sp,n,specific){
  S.lang[sp]=S.lang[sp]||[];const before=S.lang[sp].length;
  const pool=specific?specific.filter(w=>WORDS.includes(w)&&!knows(sp,w)):WORDS.filter(w=>!knows(sp,w)).sort(()=>Math.random()-0.5);
  const add=pool.slice(0,n);if(!add.length)return 0;act({a:'learn',sp,w:add});
  if(S.lang[sp].length===before)S.lang[sp].push(...add); // guests predict locally
  return add.length;
}
ACT.learn=(pid,a,predict)=>{if(!SP_TALK[a.sp]||!Array.isArray(a.w))return false;S.lang[a.sp]=S.lang[a.sp]||[];for(const w of a.w.slice(0,8))if(WORDS.includes(w)&&!S.lang[a.sp].includes(w))S.lang[a.sp].push(w);if(net.role==='host')net.snapDirty=true;return true};
/* ---------- authoritative alien actions ---------- */
function talkTarget(pid,id){const c=creatures.get(id);const p=posOf(pid);if(!c||!p||!SPECIES[c.sp].sapient||Math.hypot(c.x-p.x,c.z-p.z)>8)return null;return c}
ACT.greet=(pid,a,predict)=>{const c=talkTarget(pid,a.id);if(!c)return false;if(predict)return true;S.greeted=S.greeted||{};if(S.greeted[c.id]!==solNum()){S.greeted[c.id]=solNum();S.rep[c.sp]=Math.min(100,(S.rep[c.sp]||0)+3)}c.waveBack=2;c.pulse=2;return true};
ACT.gift=(pid,a,predict)=>{const c=talkTarget(pid,a.id);if(!c)return false;const inv=invOf(pid),s=inv[a.slot];if(!s||ITEMS[s.id].dur)return false;
  const item=s.id;s.n--;if(s.n<=0)inv[a.slot]=null;if(predict)return true;
  const sc=(GIFT_PREF[c.sp]||{})[item]??1;S.rep[c.sp]=clamp((S.rep[c.sp]||0)+sc,-100,100);
  S.gifts=S.gifts||{};const back=sc>=5&&!S.gifts[c.sp+item];if(back){S.gifts[c.sp+item]=1;giveItem(pid,c.sp==='lumari'?'crystal':'tablet',1)}
  if(pid!==ME&&pid)netInvDirty(pid);return{sc,back}};
ACT.trade=(pid,a,predict,local,fail)=>{const c=talkTarget(pid,a.id);if(!c)return false;const o=(TRADES[c.sp]||[])[a.i];if(!o)return false;if((S.rep[c.sp]||0)<15)return fail('They don’t trust you enough to trade');
  if(!haveAll(pid,o.give,false))return fail('You don’t have: '+missingText(pid,o.give,false));payAll(pid,o.give,false);if(predict)return true;
  for(const id in o.get)giveItem(pid,id,o.get[id]);S.rep[c.sp]=Math.min(100,(S.rep[c.sp]||0)+1);return true};
function hiddenPlaceNear(x,z){let best=null,bd=1e9;
  for(const L of landmarksNear(x,z,1500)){const st=S.landmarks[L.id];if(st&&st.seen)continue;const d=Math.hypot(L.x-x,L.z-z);if(d<bd){bd=d;best={x:L.x,z:L.z,id:L.id,kind:LM_INFO[L.type].label,lm:true}}}
  for(const e of entrancesNear(x,z,1500)){if(S.knownCaves&&S.knownCaves[e.id])continue;const d=Math.hypot(e.x-x,e.z-z);if(d<bd*0.8){bd=d;best={x:e.x,z:e.z,id:e.id,kind:'cave entrance',cave:true}}}
  return best}
ACT.ask=(pid,a,predict,local,fail)=>{const c=talkTarget(pid,a.id);if(!c)return false;if((S.rep[c.sp]||0)<30)return fail('They aren’t ready to share that');
  const h=hiddenPlaceNear(c.x,c.z);if(!h)return{none:true};if(!predict){if(h.lm){S.landmarks[h.id]=S.landmarks[h.id]||{};S.landmarks[h.id].seen=true}else{S.knownCaves=S.knownCaves||{};S.knownCaves[h.id]=true}}return h};
ACT.request=(pid,a,predict,local,fail)=>{const c=talkTarget(pid,a.id);if(!c)return false;const q=REQUESTS[c.sp];S.requests=S.requests||{};if(S.requests[c.sp]==='done')return false;
  if(!haveAll(pid,{[q.item]:q.n},false))return fail(`You need ${q.n} × ${ITEMS[q.item].name}`);payAll(pid,{[q.item]:q.n},false);if(predict)return true;
  S.requests[c.sp]='done';S.rep[c.sp]=Math.min(100,(S.rep[c.sp]||0)+q.rep);for(const id in q.reward)giveItem(pid,id,q.reward[id]);return true};
/* ---------- the dialogue window ---------- */
const dlg={c:null,line:[],note:'',mode:'main'};
function nearestTalker(){let best=null,bd=1e9;for(const c of creatures.values()){if(!SPECIES[c.sp].sapient||c.gone)continue;const d=Math.hypot(c.x-P.pos.x,c.z-P.pos.z);if(d<(c.sp==='lumari'?5:6.5)&&d<bd&&Math.abs(c.y-P.pos.y)<4){bd=d;best=c}}return best}
function alienInteract(hints){if(game.dialogue)return null;const c=nearestTalker();if(!c)return null;const S_=SPECIES[c.sp],rep=S.rep[c.sp]||0;
  if(c.fear>0||rep<-20){hints.unshift(`The ${S_.name} keeps away from you`);return null}hints.unshift(`<span class="key">F</span>Talk to the ${S_.name}`);return null}
function alienPressF(){if(game.dialogue)return true;const c=nearestTalker();if(!c||c.fear>0||(S.rep[c.sp]||0)<-20)return false;openDialogue(c);return true}
function openDialogue(c){
  game.dialogue=c;dlg.c=c;dlg.mode='main';c.talking=true;S.met=S.met||{};
  const first=!S.met[c.sp];S.met[c.sp]=true;
  if(first){card(`First contact: ${SPECIES[c.sp].name}`,'New species',SPECIES[c.sp].desc+' Their language is unknown, but every exchange teaches you a little. Glyph Tablets and the Xeno Decoder help.',SP_TALK[c.sp].color);SFX.radio();
    crewSay('Planetary Scientist',`First contact with the ${SPECIES[c.sp].name}! Be patient. Learn their words, and offer things they value.`)}
  const rep=S.rep[c.sp]||0;say(rep>=30?['greet','friend','star']:rep>=10?['greet','star','you']:['star','you','near'],'greet');
  $('#dlg').classList.remove('hidden');renderDialogue();alienVoice(c.sp,3);
}
function closeDialogue(){if(dlg.c)dlg.c.talking=false;game.dialogue=null;dlg.c=null;$('#dlg').classList.add('hidden')}
function say(words,teach){dlg.line=words;dlg.note='';
  const unknown=words.filter(w=>GESTURE[w]&&!knows(dlg.c.sp,w));
  if(unknown.length){const w=unknown[0];learnWords(dlg.c.sp,1,[w]);dlg.note=`It ${GESTURE[w]}. You think “${w}” means <b>${esc(w)}</b>.`}
  else if(teach&&Math.random()<0.5){const n=learnWords(dlg.c.sp,1);if(n)dlg.note='You pick up another word from the way it repeats itself.'}
  alienVoice(dlg.c.sp,words.length);
}
function alienVoice(sp,n){if(!AU.ctx||!AU.sound)return;const C=AU.ctx;for(let i=0;i<n;i++){const t=C.currentTime+i*0.22,o=C.createOscillator(),o2=C.createOscillator(),g=C.createGain();
  if(sp==='lumari'){o.type='sine';o.frequency.value=900+Math.random()*900;o2.type='sine';o2.frequency.value=o.frequency.value*1.5}else{o.type='sawtooth';o.frequency.setValueAtTime(90+Math.random()*60,t);o.frequency.linearRampToValueAtTime(70+Math.random()*80,t+0.2);o2.type='triangle';o2.frequency.value=180+Math.random()*60}
  const f=C.createBiquadFilter();f.type='lowpass';f.frequency.value=sp==='lumari'?4000:700;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.05,t+0.03);g.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
  o.connect(f);o2.connect(f);f.connect(g).connect(sfxOut());o.start(t);o2.start(t);o.stop(t+0.22);o2.stop(t+0.22)}}
function dangerWords(){
  if(typeof nextDisaster==='function'){const d=nextDisaster();if(d&&d.in<SOL_H*0.8)return d.type==='storm'?['wind','storm','near','home','sleep']:d.type==='quake'?['ground','shake','near','danger']:d.type==='solar'?['sky','fire','danger','deep']:['sky','danger','near']}
  const c=dlg.c,around=[...creatures.values()].filter(o=>SPECIES[o.sp].kind==='hostile'&&Math.hypot(o.x-c.x,o.z-c.z)<300);
  if(around.some(o=>o.sp==='wyrm'))return['walker','deep','danger','path'];if(tod()>18)return['shadow','night','danger','light'];return['sky','near','home','yes']}
function renderDialogue(){
  const c=dlg.c;if(!c)return;const sp=c.sp,S_=SPECIES[sp],rep=S.rep[sp]||0,req=REQUESTS[sp];S.requests=S.requests||{};
  let opts='';
  if(dlg.mode==='gift'){
    const items=S.inv.map((s,i)=>s&&!ITEMS[s.id].dur?`<button class="gift" data-gift="${i}"><img src="${iconURL(s.id)}" alt=""><span>${esc(ITEMS[s.id].name)} ×${s.n}</span></button>`:'').join('');
    opts=`<div class="giftgrid">${items||'<span class="sub">You have nothing to give.</span>'}</div><button class="btn sm" data-d="back">Back</button>`;
  }else if(dlg.mode==='trade'){
    opts=TRADES[sp].map((o,i)=>{const can=haveAll(ME,o.give,false);const f=(m)=>Object.entries(m).map(([id,n])=>`<img src="${iconURL(id)}" alt="">${n} ${esc(ITEMS[id].name)}`).join(' + ');
      return`<button class="dopt trade" data-trade="${i}" ${can?'':'disabled'}>${f(o.give)} <b>→</b> ${f(o.get)}</button>`}).join('')+`<button class="btn sm" data-d="back">Back</button>`;
  }else{
    const o=[['greet','👋 Wave hello'],['gift','🎁 Offer a gift']];
    if(rep>=15)o.push(['trade','⇄ Trade']);
    if(rep>=30)o.push(['ask','❓ Ask about hidden places']);
    o.push(['danger','⚠ Ask about dangers']);
    if(S.requests[sp]!=='done')o.push(['request',S.requests[sp]==='open'?`✋ Give ${req.n} ${ITEMS[req.item].name} (${slotsCount(S.inv,req.item)}/${req.n})`:'✋ Ask what they need']);
    o.push(['bye','Leave']);
    opts=o.map(([k,l])=>`<button class="dopt" data-d="${k}">${l}</button>`).join('');
  }
  $('#dlg').innerHTML=`<div class="dhead"><b style="color:${SP_TALK[sp].color}">${S_.name}</b><span class="sub">Trust <i class="rep"><i style="width:${(rep+100)/2}%"></i></i> ${rep>=30?'friendly':rep>=10?'warming up':rep>=-20?'cautious':'hostile'} · Language ${comprehension(sp)}%</span></div>
    <div class="dline">${lineHTML(sp,dlg.line)}</div>${dlg.note?`<div class="dnote">${dlg.note}</div>`:''}<div class="dopts">${opts}</div>`;
}
$('#dlg').addEventListener('mousedown',e=>{
  const c=dlg.c;if(!c)return;const b=e.target.closest('[data-d],[data-gift],[data-trade]');if(!b||b.disabled)return;e.preventDefault();
  const sp=c.sp;
  if(b.dataset.gift!=null){const i=+b.dataset.gift,item=S.inv[i]&&S.inv[i].id;const r=act({a:'gift',id:c.id,slot:i});dlg.mode='main';
    const sc=(GIFT_PREF[sp]||{})[item]??1;if(r!==false){say(sc>=5?['thank','gift','friend']:sc>0?['thank','you']:['no','want','gift']);learnWords(sp,1,['gift','thank']);
      dlg.note=(dlg.note?dlg.note+' ':'')+(sc>=5?'It is delighted with the gift.':sc>0?'It accepts the gift politely.':'It recoils. That was a poor choice.')}
    renderDialogue();refreshInvUI();return}
  if(b.dataset.trade!=null){if(act({a:'trade',id:c.id,i:+b.dataset.trade})!==false){say(['trade','share','thank']);dlg.note='The trade is done.'}renderDialogue();refreshInvUI();return}
  switch(b.dataset.d){
    case'greet':act({a:'greet',id:c.id});doEmote('wave');say((S.rep[sp]||0)>=20?['greet','friend','we','home']:['greet','star','you'],true);break;
    case'gift':dlg.mode='gift';break;
    case'trade':dlg.mode='trade';say(['trade','give','share']);break;
    case'back':dlg.mode='main';break;
    case'ask':{const r=act({a:'ask',id:c.id});if(r&&r.none)say(['no','far','place']),dlg.note='It knows of nowhere you haven’t already found.';
      else if(r){const h=net.role==='guest'?hiddenPlaceNear(c.x,c.z):r;if(h){if(net.role==='guest'){if(h.lm){S.landmarks[h.id]=S.landmarks[h.id]||{};S.landmarks[h.id].seen=true}else{S.knownCaves=S.knownCaves||{};S.knownCaves[h.id]=true}}
        revealArea(h.x,h.z,90);say(['old','place','far','see','path']);dlg.note=`It draws a line in the dust toward the ${compassWord(h.x-c.x,h.z-c.z)}: a ${h.kind} about ${fmtDist(Math.hypot(h.x-c.x,h.z-c.z))} away. It’s marked on your map.`;S.waypoint={x:h.x,z:h.z}}}
      break}
    case'danger':say(dangerWords(),true);dlg.note=dlg.note||'It is warning you about something. The more words you know, the clearer it gets.';break;
    case'request':{if(S.requests[sp]!=='open'){S.requests[sp]='open';say(REQUESTS[sp].line);dlg.note=(dlg.note?dlg.note+' ':'')+REQUESTS[sp].text+'.'}
      else if(act({a:'request',id:c.id})!==false){say(['thank','friend','gift'],true);dlg.note='You’ve earned their trust. They give you something precious in return.';SFX.radio()}break}
    case'bye':closeDialogue();return;
  }
  renderDialogue();
});
function alienAdvice(){const met=S.met||{};const parts=[];
  if(met.tharrak)parts.push(`The Tharrak trust you ${S.rep.tharrak>=30?'a lot':S.rep.tharrak>=10?'a little':'barely'}. They value water ice and metal.`);
  if(met.lumari)parts.push('The Lumari love energy. Bring Power Cells and they may guide you to resonite.');
  parts.push('Skitters fear light, wyrms hunt by vibration so walk on the dunes, and stalkers only strike alone astronauts in the dark.');return parts.join(' ')}
RESEARCH.push({id:'xenoling',name:'Xenolinguistics',branch:'Science',cost:30,req:()=>!!(S.met&&(S.met.tharrak||S.met.lumari)),reqText:'Meet an alien species first',desc:'Teaches 6 words of every alien language you have encountered.'});
function dialogueTick(dt){
  if(game.dialogue){const c=dlg.c;if(!c||!creatures.has(c.id)||Math.hypot(c.x-P.pos.x,c.z-P.pos.z)>12||c.fear>0)closeDialogue();
    else{const a=Math.atan2(c.x-P.pos.x,c.z-P.pos.z);P.yaw=lerpA(P.yaw,a,damp(4,dt));astro.rotation.y=P.yaw;cam.yaw=lerpA(cam.yaw,a+0.6,damp(2,dt))}}
  if(S.research.has('xenoling')&&!S.flags.xenoDone&&net.role!=='guest'){S.flags.xenoDone=true;for(const sp of['tharrak','lumari'])if(S.met&&S.met[sp])learnWords(sp,6);toast('Xenolinguistics: new words learned','good')}
}
