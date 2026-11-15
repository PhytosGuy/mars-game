'use strict';
/* =========================================================
   COMMUNICATION: radio feed, crew conversations, co-op chat,
   location pings, quick-comms wheel and emotes
   ========================================================= */
function radio(from,msg,kind=''){
  const feed=$('#radiofeed');if(!feed)return;
  const el=document.createElement('div');el.className='rmsg '+kind;el.innerHTML=`<b>${esc(from)}</b><span>${keyText(esc(msg))}</span>`;feed.appendChild(el);
  while(feed.children.length>5)feed.firstChild.remove();
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),600)},kind==='chat'||kind==='nasa'?15000:10000);
  if(S){S.radioLog=S.radioLog||[];S.radioLog.unshift({from,msg,sol:solNum()});if(S.radioLog.length>40)S.radioLog.pop()}
}
/* ---------- NASA facts that fit the moment (a storm, a cave, nightfall, driving…) ---------- */
function nasaFact(tag){
  if(!S||typeof NASA_FACTS==='undefined')return false;S.facts=Array.isArray(S.facts)?S.facts:[];
  const pool=NASA_FACTS.map((f,i)=>i).filter(i=>NASA_FACTS[i][0]===tag&&!S.facts.includes(i));if(!pool.length)return false;
  const i=pool[Math.floor(Math.random()*pool.length)];S.facts.push(i);radio('NASA archive · Mars fact',NASA_FACTS[i][1],'nasa');sfx(0.08,2200,3,0.03);return true}
function factTick(dt){
  if(!S||game.state!=='play'||game.dead)return;game.factT=(game.factT===undefined?20:game.factT)-dt;if(game.factT>0)return;game.factT=70;
  const tags=[];if(S.storm.active||S.storm.level>0.3)tags.push('dust');if(cave.active)tags.push('cave');if(typeof quake!=='undefined'&&quake.active)tags.push('quake');
  if(P.mode==='rover')tags.push('rover');if(ENV.night>0.7)tags.push('night','moon','cold');if(count('moxie'))tags.push('oxygen');
  sample(P.pos.x,P.pos.z,TS3);if(TS3.ice>0.5)tags.push('ice','water');if(S.dose>0.3)tags.push('radiation');tags.push('sky','general','life','flight','ice','cold','rover','quake','cave');
  for(const t of tags)if(nasaFact(t))return}
function randomFact(){return typeof NASA_FACTS!=='undefined'?NASA_FACTS[Math.floor(Math.random()*NASA_FACTS.length)][1]:''}
function crewName(role){const c=S&&S.crewList.find(c=>c.role===role);return c?c.name:'Mission Control'}
function crewSay(role,msg){radio(crewName(role),msg,'crew');sfx(0.1,2600,2.5,0.025);beep(1150,0.04,'sine',0.03,0.11)}
// once-per-key crew lines so contextual chatter never spams
const said={};function crewOnce(key,role,msg,cool=SOL_H){const t=S?S.time:0;if(said[key]&&t-said[key]<cool)return;said[key]=t;crewSay(role,msg)}
function crewContext(){
  if(!S||game.state!=='play')return;
  const t=tod();
  if(t>17.6&&t<18.2&&!cave.active&&Math.hypot(P.pos.x-home().x,P.pos.z-home().z)>250)crewOnce('dusk'+solNum(),'Engineer','Sun’s going down in about half an hour. Night predators come out after dark. Head home or bring flares.');
  if(P.mode==='foot'&&P.o2<35&&!cave.active)crewOnce('o2','Medical Specialist','Your suit oxygen is under 35%. Turn back now, or use an Oxygen Canister.',2);
  if(P.bat<20)crewOnce('bat','Engineer','Suit battery is low. Your drill and lamp will die soon. A Power Cell will top it up.',3);
  if(P.hp<40)crewOnce('hp','Medical Specialist','Suit integrity is critical! Patch it or get back to the habitat.',2);
}
/* ---------- talking to your crew (and co-op crewmates) ---------- */
const CREW_REPLIES=[
  [/status|how.*(colony|base)|report/i,()=>`Oxygen ${S.res.o2.toFixed(0)} kg, water ${Math.round(S.res.water)} L, food ${S.res.food.toFixed(0)} kg. Power ${S.powerNet>=0?'positive':'negative'} at ${S.powerNet.toFixed(1)} kW. ${S.crew} people in the colony.`,'Engineer'],
  [/storm|weather|wind|dust/i,()=>typeof forecastText==='function'?forecastText():'Skies look clear for now.','Engineer'],
  [/quake|seism|shake/i,()=>count('seismo')?'The seismometer is online. You’ll get a few seconds’ warning before shaking hits.':'Build a Seismometer and we’ll get a few seconds’ warning before quakes.','Engineer'],
  [/alien|tharrak|lumari|creature|life/i,()=>typeof alienAdvice==='function'?alienAdvice():'Keep your distance from anything with teeth.','Geologist'],
  [/where|explore|find|cave|landmark/i,()=>typeof exploreHint==='function'?exploreHint():'Climb something tall and look around.','Planetary Scientist'],
  [/iron|ore|mine|titanium|metal/i,()=>'Hematite looks like dark, shiny nodules. Silica is bright and creamy. Titanium runs in silvery veins in the mountains and deep caves. Craft a Core Drill for the tough stuff.','Geologist'],
  [/help|tip|what.*do/i,()=>game.guide&&game.guide.text?'Here’s what I’d do next: '+game.guide.text.replace(/<[^>]+>/g,''):'Explore, mine, and keep the life support running.','Engineer'],
  [/hello|hi |hey|morning/i,()=>['Good to hear your voice out there.','Reading you loud and clear.','Hey! All quiet at the hab.'][Math.floor(Math.random()*3)],'Medical Specialist'],
  [/thank/i,()=>'Any time. Stay safe out there.','Medical Specialist'],
];
function crewReply(m){const say=(role,txt)=>{crewSay(role,txt);chatLog(crewName(role),txt)};
  for(const[re,f,role]of CREW_REPLIES)if(re.test(m)){setTimeout(()=>say(role,f()),900+Math.random()*900);return}
  if(!net.role)setTimeout(()=>say('Engineer','Copy that.'),900)}
function sendChat(m){
  m=String(m||'').trim().slice(0,160);if(!m)return;
  radio(net.name+(net.role?'':' (you)'),m,'chat me');chatLog(net.name+' (you)',m);chatBubble(myBubble,m);
  if(net.role==='host')netSend({t:'chat',from:net.name,id:ME,m});else if(net.role==='guest')netSend({t:'chat',m});
  if(!net.role||/crew|base|control|status|storm|weather|help|where|alien|quake|ore|mine/i.test(m))crewReply(m);
}
function onChat(msg){radio(msg.from,msg.m,'chat');SFX.radio();chatLog(msg.from,msg.m);const p=msg.id&&net.players.get(msg.id);if(p)chatBubble(p,msg.m)}
// chat history (shown while the chat box is open) and speech bubbles above whoever is talking
const chatHist=[];
function chatLog(from,m){chatHist.push({from,m});if(chatHist.length>30)chatHist.shift();if(game.typing)renderChatHist()}
function renderChatHist(){const h=$('#chathist');if(!h)return;h.innerHTML=chatHist.length?chatHist.slice(-12).map(c=>`<div><b>${esc(c.from)}</b> ${esc(c.m)}</div>`).join(''):'<div class="dim">No messages yet. Say hi, or ask your crew about storms, ore or aliens.</div>';h.scrollTop=1e6}
function bubbleSprite(text){const cv=document.createElement('canvas'),x=cv.getContext('2d');const t=text.length>48?text.slice(0,46)+'…':text;
  x.font='700 28px Nunito Sans, sans-serif';const w=Math.min(620,x.measureText(t).width+40);cv.width=w;cv.height=70;x.font='700 28px Nunito Sans, sans-serif';
  x.fillStyle='rgba(255,250,244,.94)';x.beginPath();x.roundRect(2,2,w-4,52,20);x.fill();x.beginPath();x.moveTo(w/2-10,52);x.lineTo(w/2,66);x.lineTo(w/2+10,52);x.fill();
  x.fillStyle='#24140c';x.textBaseline='middle';x.fillText(t,20,29);
  const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,fog:false}));
  s.scale.set(w/70*0.55,0.55,1);s.position.y=3.15;s.renderOrder=10;return s}
function chatBubble(holder,m){const a=holder.a||holder;if(holder.bub)a.remove(holder.bub.s);const s=bubbleSprite(m);a.add(s);holder.bub={s,t:6}}
const myBubble={a:astro,bub:null};
function updateMyBubble(dt){const b=myBubble.bub;if(!b)return;b.t-=dt;b.s.material.opacity=clamp(b.t,0,1);if(b.t<=0){astro.remove(b.s);myBubble.bub=null}}
function openChat(){if(game.state!=='play')return;const b=$('#chatbox');b.classList.remove('hidden');const i=$('#chatin');i.value='';i.focus();game.typing=true;renderChatHist()}
function closeChat(){$('#chatbox').classList.add('hidden');$('#chatin').blur();game.typing=false;for(const k in keys)keys[k]=false}
$('#chatbtn').addEventListener('mousedown',e=>{e.stopPropagation();e.preventDefault();openChat()});
$('#chatin').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){sendChat(e.target.value);closeChat()}else if(e.key==='Escape')closeChat()});
/* ---------- pings ---------- */
const pings=[];
function mkPingMarker(){const g=new THREE.Group();const c=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.2,12),new THREE.MeshBasicMaterial({color:'#6fe0c8',fog:false}));c.rotation.x=Math.PI;c.position.y=3;g.add(c);
  const r=new THREE.Mesh(new THREE.RingGeometry(1.2,1.45,32),new THREE.MeshBasicMaterial({color:'#6fe0c8',transparent:true,opacity:0.8,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.y=0.2;g.add(r);
  const b=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,60,6,1,true),new THREE.MeshBasicMaterial({color:'#6fe0c8',transparent:true,opacity:0.3,blending:THREE.AdditiveBlending,depthWrite:false}));b.position.y=32;g.add(b);g.userData={c,r};return g}
function onPing(m){
  const g=mkPingMarker();g.position.set(m.x,m.y,m.z);scene.add(g);pings.push({g,x:m.x,y:m.y,z:m.z,from:m.from,t:0});
  while(pings.length>6){const o=pings.shift();scene.remove(o.g)}
  radio(m.from,m.k==='danger'?'marked DANGER here!':m.k==='help'?'needs help here!':'marked a location','ping');beep(1500,0.06);beep(1900,0.08,'sine',0.05,0.08);
}
function sendPing(kind=''){
  if(game.state!=='play')return;let pt=null;
  if(!cave.active)pt=pickTerrain();if(!pt){pt=new THREE.Vector3(P.pos.x+Math.sin(cam.yaw)*8,0,P.pos.z+Math.cos(cam.yaw)*8)}
  pt.y=floorAt(pt.x,pt.z,P.pos.y+2);const m={from:net.name+(net.role?'':' (you)'),x:pt.x,y:pt.y,z:pt.z,k:kind};onPing(m);
  if(net.role==='host')netSend({t:'ping',from:net.name,x:pt.x,y:pt.y,z:pt.z,k:kind});else if(net.role==='guest')netSend({t:'ping',x:pt.x,y:pt.y,z:pt.z,k:kind});
}
function updatePings(dt){for(let i=pings.length-1;i>=0;i--){const p=pings[i];p.t+=dt;p.g.userData.c.position.y=3+Math.sin(p.t*3)*0.4;p.g.userData.r.scale.setScalar(1+(p.t%1.5)*0.6);if(p.t>35){scene.remove(p.g);pings.splice(i,1)}}}
/* ---------- emotes ---------- */
function doEmote(e){game.emote=e;game.emoteT=2.6;if(net.role==='host')netSend({t:'emote',id:ME,e});else if(net.role==='guest')netSend({t:'emote',e});if(e==='wave'&&typeof onPlayerWave==='function')onPlayerWave(P.pos,ME)}
function onEmote(m){const p=net.players.get(m.id);if(p&&p.t)p.t.e=m.e;if(m.e==='wave'&&net.role==='host'&&typeof onPlayerWave==='function'&&p)onPlayerWave(p.a.position,m.id)}
function updateEmote(dt){updateMyBubble(dt);if(game.emoteT>0){game.emoteT-=dt;const u=astro.userData;if(game.emote==='wave'&&P.mode==='foot'){u.armL.rotation.set(0,0,2.6+Math.sin(now*10)*0.4)}if(game.emoteT<=0){game.emote='';u.armL.rotation.z=0}}}
/* ---------- quick-comms wheel (hold V) ---------- */
const QUICK=[['wave','Wave'],['onmyway','On my way'],['help','Need help!'],['found','Found something'],['follow','Follow me'],['ping','Ping here'],['danger','Danger here!']];
function openQuick(){if(game.state!=='play')return;const w=$('#quick');w.innerHTML=QUICK.map(([k,l],i)=>{const a=i/QUICK.length*TAU-Math.PI/2;return`<button data-q="${k}" style="left:calc(50% + ${Math.cos(a)*120}px);top:calc(50% + ${Math.sin(a)*120}px)">${l}</button>`}).join('')+'<div class="qmid">Quick comms</div>';w.classList.remove('hidden')}
function closeQuick(){$('#quick').classList.add('hidden')}
$('#quick').addEventListener('mousedown',e=>{const b=e.target.closest('[data-q]');if(!b)return;const k=b.dataset.q;closeQuick();
  if(k==='wave')doEmote('wave');else if(k==='ping')sendPing();else if(k==='danger'){sendPing('danger');sendChat('Danger here! Watch out!')}else if(k==='help'){sendPing('help');sendChat('I need help!')}
  else sendChat({onmyway:'On my way!',found:'I found something interesting!',follow:'Follow me!'}[k])});
