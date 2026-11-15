'use strict';
/* =========================================================
   CO-OP MULTIPLAYER (peer-to-peer via PeerJS, host-authoritative)
   - Guests never change shared state directly: they send actions, the host
     re-runs them through applyAct() against its own copy and replies.
   - Every incoming message is type-checked, clamped and rate-limited.
   - Guests are identified by a persistent token so a reconnect restores
     their inventory.
   ========================================================= */
const NET_V=3,MAX_GUESTS=3;
const net={role:null,peer:null,conns:new Map(),hostConn:null,code:null,id:null,token:'',name:'',players:new Map(),
  poseT:0,snapT:0,flagT:0,snapDirty:false,invDirty:new Set(),lastHost:0,reconnect:0,leaving:false};
try{net.name=localStorage.getItem('mlc-name')||'';net.token=localStorage.getItem('mlc-token')||''}catch(e){}
if(!net.name)net.name='Astronaut-'+Math.floor(1000+Math.random()*9000);
if(!net.token){net.token=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');try{localStorage.setItem('mlc-token',net.token)}catch(e){}}
/* ---------- validation helpers ---------- */
const isNum=v=>typeof v==='number'&&Number.isFinite(v);
const num=(v,a,b,d=0)=>isNum(v)?clamp(v,a,b):d;
const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
const cleanName=v=>str(v,20).replace(/[\u0000-\u001f<>]/g,'').trim()||'Crewmate';
/* ---------- transport ---------- */
const PEER_OPTS={config:{iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']},{urls:'stun:global.stun.twilio.com:3478'},
  {urls:['turn:eu-0.turn.peerjs.com:3478','turn:us-0.turn.peerjs.com:3478'],username:'peerjs',credential:'peerjsp'}],sdpSemantics:'unified-plan'},debug:0};
function loadPeerJS(){return new Promise((res,rej)=>{if(window.Peer)return res();const s=document.createElement('script');s.src='https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  s.onload=()=>res();s.onerror=()=>rej(new Error('Could not load the multiplayer library. Check your internet connection.'));document.head.appendChild(s)})}
const genCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(5)),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
function sendTo(c,msg){if(c&&c.open)try{c.send(msg)}catch(e){}}
function netSend(msg,except){
  if(net.role==='host'){for(const g of net.conns.values())if(g.conn!==except&&g.ready)sendTo(g.conn,msg)}
  else if(net.role==='guest')sendTo(net.hostConn,msg);
}
const netConnOf=pid=>{for(const g of net.conns.values())if(g.token===pid)return g.conn;return null};
const guestByToken=pid=>{for(const g of net.conns.values())if(g.token===pid)return g;return null};
function netName(pid){if(!pid||pid===ME)return net.name;const g=S.guests&&S.guests[pid];return g?g.name:'Crewmate'}
function netPlayerPos(pid){const g=guestByToken(pid);return g&&g.pos?g.pos:null}
function netInvDirty(pid){if(pid&&pid!==ME)net.invDirty.add(pid);net.snapDirty=true}
function netUsed(pid,id,a){const g=S.guests[pid];if(id==='lamp')g.lampTokens=(g.lampTokens||0)+1;sendTo(netConnOf(pid),{t:'used',id,a:{i:a.i}})}
function netPickupUpdate(pk){if(net.role==='host')netSend({t:'pkn',id:pk.id,n:pk.n})}
/* ---------- hosting ---------- */
async function hostGame(){
  if(net.role)return;
  try{await loadPeerJS()}catch(e){toast(e.message,'bad');return}
  const tryCode=()=>{const code=genCode(),peer=new Peer('marslc-'+code,PEER_OPTS);
    peer.on('open',id=>{net.peer=peer;net.role='host';net.code=code;net.id=id;updateNetUI();toast(`Co-op is open! Share the code ${code} with friends`,'good');SFX.radio();radio('System',`Colony open for co-op. Code ${code}.`,'sys')});
    peer.on('connection',conn=>{
      conn.on('open',()=>{const g={conn,token:null,name:'',ready:false,pos:null,last:now,bucket:120,tb:now,flood:0};net.conns.set(conn.connectionId||conn.peer,g);
        conn.on('data',d=>hostReceive(g,d));conn.on('close',()=>dropGuest(g,'left the colony'));conn.on('error',()=>dropGuest(g,'lost connection'))});
    });
    peer.on('disconnected',()=>{try{peer.reconnect()}catch(e){}});
    peer.on('error',e=>{if(e.type==='unavailable-id'){peer.destroy();tryCode()}else if(e.type==='network'||e.type==='server-error'||e.type==='socket-error'||e.type==='socket-closed'){setTimeout(()=>{try{if(!peer.destroyed)peer.reconnect()}catch(x){}},2000)}else if(e.type!=='peer-unavailable')toast('Co-op error: '+e.type,'bad')});
  };
  tryCode();
}
function rateOK(g){const t=now;g.bucket=Math.min(120,g.bucket+(t-g.tb)*60);g.tb=t;if(g.bucket<1){g.flood++;if(g.flood>300){sendTo(g.conn,{t:'sys',m:'Disconnected: too many messages.'});g.conn.close()}return false}g.bucket--;return true}
function hostReceive(g,d){
  if(!d||typeof d!=='object'||typeof d.t!=='string'||!rateOK(g))return;g.last=now;
  if(!g.ready&&d.t!=='hello')return;
  switch(d.t){
    case'hello':{
      if(g.ready)return;if(num(d.v,0,99)!==NET_V){sendTo(g.conn,{t:'sys',m:'Version mismatch: please reload the game.'});setTimeout(()=>g.conn.close(),300);return}
      if([...net.conns.values()].filter(x=>x.ready).length>=MAX_GUESTS){sendTo(g.conn,{t:'sys',m:'This colony is full (4 players).'});setTimeout(()=>g.conn.close(),300);return}
      const token=str(d.token,40);if(!/^[0-9a-f]{8,40}$/.test(token)){g.conn.close();return}
      for(const o of net.conns.values())if(o!==g&&o.token===token){o.conn.close();net.conns.delete(o.conn.connectionId||o.conn.peer)}
      g.token=token;g.name=cleanName(d.name);g.look=cleanLook(d.look);
      S.guests=S.guests||{};const rec=S.guests[token];const back=!!rec;
      if(!rec)S.guests[token]={name:g.name,inv:starterInv(S.mode==='sandbox'),ups:{},lampTokens:0};else{rec.name=g.name;if(!rec.inv.some(s=>s&&s.id==='blaster'))slotsAdd(rec.inv,'blaster',1)}
      const sp=cave.active&&cave.ret?cave.ret:P.pos;g.pos={x:sp.x+3,y:sp.y,z:sp.z+3};
      const save=serializeData();save.S.guests={};
      sendTo(g.conn,{t:'welcome',save,you:{inv:S.guests[token].inv,ups:S.guests[token].ups},spawn:g.pos,host:net.name,hostId:net.id,v:NET_V});
      g.ready=true;getRemote(token,g.name,g.look);
      toast(`${g.name} ${back?'rejoined':'joined'} your colony`,'good');SFX.radio();radio('System',`${g.name} ${back?'rejoined':'joined'} the colony.`,'sys');
      netSend({t:'sys',m:`${g.name} ${back?'rejoined':'joined'} the colony`},g.conn);updateNetUI();break}
    case'pose':{const p=cleanPose(d);if(!p)return;g.pos={x:p.p[0],y:p.p[1],z:p.p[2]};p.id=g.token;p.name=g.name;p.look=g.look;updateRemotePose(p);netSend(p,g.conn);break}
    case'act':{if(typeof d.a!=='string')return;const ok=applyAct(g.token,d,false);if(ok===false)net.invDirty.add(g.token);net.snapDirty=true;break}
    case'chat':{const m=str(d.m,160).trim();if(!m||now-(g.chatT||0)<0.8)return;g.chatT=now;const msg={t:'chat',from:g.name,id:g.token,m};onChat(msg);netSend(msg,g.conn);break}
    case'ping':{if(!isNum(d.x)||!isNum(d.z))return;if(now-(g.pingT||0)<1)return;g.pingT=now;const msg={t:'ping',from:g.name,x:d.x,y:num(d.y,-2000,2000),z:d.z,k:str(d.k,12)};onPing(msg);netSend(msg,g.conn);break}
    case'emote':{const msg={t:'emote',id:g.token,e:str(d.e,12)};onEmote(msg);netSend(msg,g.conn);break}
    case'talk':{if(typeof onRemoteTalk==='function')onRemoteTalk(g,d);break}
    case'fx':{const v=okBolt(d);if(!v||now-(g.fxT||0)<0.3)return;g.fxT=now;drawBolt(v[0],v[1]);netSend({t:'fx',k:'bolt',f:d.f,to:d.to},g.conn);break}
    case'bye':g.conn.close();break;
    case'sleep':if(d.on)net.sleepers.add(g.token);else net.sleepers.delete(g.token);hostCheckSleep();break;
  }
}
function dropGuest(g,why){const key=g.conn.connectionId||g.conn.peer;if(!net.conns.has(key))return;net.conns.delete(key);if(net.sleepers){net.sleepers.delete(g.token);setTimeout(hostCheckSleep,50)}
  if(g.ready){toast(`${g.name} ${why}`);radio('System',`${g.name} ${why}.`,'sys');dropPlayer(g.token);netSend({t:'bye',id:g.token})}updateNetUI()}
/* ---------- joining ---------- */
async function joinGame(code){
  code=(code||'').trim().toUpperCase();if(!/^[A-Z0-9]{5}$/.test(code)){coopMsg('Enter the 5-character code from your friend.');return}
  coopMsg('Connecting…');net.joinCode=code;net.leaving=false;net.tries=0;
  try{await loadPeerJS()}catch(e){coopMsg(e.message);return}
  connectToHost(code,false);
}
function connectToHost(code,isRe){
  try{net.peer&&net.peer.destroy()}catch(e){}
  const peer=new Peer(PEER_OPTS);net.peer=peer;const attempt=++net.tries;
  const retry=why=>{if(isRe||net.role==='guest'||net.leaving||attempt!==net.tries)return;if(net.tries<3){coopMsg(`${why} Trying again (${net.tries+1} of 3)…`);setTimeout(()=>{if(!net.leaving&&net.role!=='guest')connectToHost(code,false)},1500)}else{coopMsg(why+' Make sure your friend’s game is open and they pressed “Open to friends”, then try again.');leaveNet(true)}};
  const openTo=setTimeout(()=>retry('The connection server is slow.'),10000);
  peer.on('open',id=>{clearTimeout(openTo);net.id=id;const c=peer.connect('marslc-'+code,{reliable:true,serialization:'json'});net.hostConn=c;
    const to=setTimeout(()=>{if(net.role!=='guest')retry('No answer from that colony yet.')},10000);
    c.on('open',()=>sendTo(c,{t:'hello',v:NET_V,name:net.name,look:LOOK,token:net.token}));
    c.on('data',d=>{if(d&&d.t==='welcome')clearTimeout(to);guestReceive(d)});
    c.on('close',()=>{if(net.role==='guest'&&!net.leaving)startReconnect()})});
  peer.on('error',e=>{if(isRe)return;clearTimeout(openTo);if(net.role!=='guest')retry(e.type==='peer-unavailable'?'No colony found with that code yet.':'Connection problem ('+e.type+').')});
}
function startReconnect(){
  if(net.reconnect>0)return;net.reconnect=1;toast('Lost connection to the host. Reconnecting…','warn');radio('System','Signal lost. Re-establishing link…','sys');
  const tryIt=()=>{if(net.role!=='guest'||net.leaving)return;if(net.reconnect>6){toast('Could not reconnect to the host','bad');leaveNet(true);showTitle();return}
    net.reconnect++;connectToHost(net.joinCode,true);setTimeout(()=>{if(net.reconnect>0)tryIt()},4000)};
  tryIt();
}
function guestReceive(d){
  if(!d||typeof d!=='object'||typeof d.t!=='string')return;net.lastHost=now;
  switch(d.t){
    case'welcome':joinWorld(d);break;
    case'snap':if(net.role==='guest'&&S)applySnap(d);break;
    case'inv':if(net.role==='guest'&&S){S.inv=cleanSlots(d.inv,INV_SIZE);if(d.ups)S.ups=d.ups;if(d.storage)S.storage=cleanSlots(d.storage,STORE_SIZE);refreshInvUI();onHotbarChange()}break;
    case'used':if(ITEMS[d.id])useEffect(d.id,d.a||{});break;
    case'pose':{const p=cleanPose(d);if(p){p.id=str(d.id,40);p.name=cleanName(d.name);p.look=cleanLook(d.look);updateRemotePose(p)}break}
    case'dep':if(typeof d.id==='string'&&isNum(d.u))setDepUnits(d.id,d.u);break;
    case'dig':if(isNum(d.x)&&isNum(d.z))digAt(d.x,d.z,num(d.a,0,3));break;
    case'rock':if(typeof d.k==='string')removeRockKey(d.k);break;
    case'pk+':{const p=d.p;if(p&&ITEMS[p.it]&&!pickups.has(p.id)){const q=spawnPickup(p.it,num(p.n,1,999,1),p.meta,num(p.x,-1e6,1e6),num(p.y,-5000,5000),num(p.z,-1e6,1e6),str(p.id,40));if(q&&now-(net.dropT||-9)<2&&Math.hypot(q.x-P.pos.x,q.z-P.pos.z)<3.5)q.hold=true}break}
    case'pk-':removePickup(d.id);break;
    case'pkn':{const pk=pickups.get(d.id);if(pk)pk.n=num(d.n,1,999,1);break}
    case'lamps':if(Array.isArray(d.l)){S.lamps=d.l.slice(0,60).filter(l=>l&&isNum(l.x)&&isNum(l.y)&&isNum(l.z));syncLamps()}break;
    case'flare':if(Array.isArray(d.p)&&d.p.every(isNum))throwFlare(...d.p,true);break;
    case'meteor':if(isNum(d.x)&&isNum(d.z))spawnMeteor(d.x,d.z,str(d.id,24),d.big);break;
    case'lander':if(isNum(d.x)&&isNum(d.z))spawnLander(!!d.crew,num(d.n,1,40,2),d.x,d.z);break;
    case'card':card(esc(d.a),esc(d.b),esc(d.c),/^#[0-9a-f]{6}$/i.test(d.d)?d.d:'#6fe0c8',true);break;
    case'sys':{const m=str(d.m,160);toast(m);coopMsg(m.startsWith('Version mismatch')?'Your friend is on a different version of the game. Both of you reload the page, then try again.':m);break}
    case'sleepn':sleepUI(true,num(d.n,0,9,0),num(d.of,1,9,1),true);break;
    case'slept':sleepUI(false);fade(true,'Resting…');setTimeout(()=>{P.o2=100;fade(false);toast('Everyone slept through the night. Good morning!','good')},1400);break;
    case'fx':{const v=okBolt(d);if(v)drawBolt(v[0],v[1]);break}
    case'dv':onDevilSnap(d);break;
    case'chat':onChat({from:cleanName(d.from),id:str(d.id,40),m:str(d.m,160)});break;
    case'ping':if(isNum(d.x)&&isNum(d.z))onPing({from:cleanName(d.from),x:d.x,y:num(d.y,-2000,2000),z:d.z,k:str(d.k,12)});break;
    case'emote':onEmote({id:str(d.id,40),e:str(d.e,12)});break;
    case'ev':if(typeof onWorldEvent==='function')onWorldEvent(d);break;
    case'cr':if(typeof onCreatureSnap==='function')onCreatureSnap(d);break;
    case'talkr':if(typeof onTalkResult==='function')onTalkResult(d);break;
    case'bye':dropPlayer(str(d.id,40));break;
  }
}
// a blaster shot drawn for everyone: two finite points no more than 60 m apart
function okBolt(d){if(d.k!=='bolt'||!Array.isArray(d.f)||!Array.isArray(d.to)||d.f.length!==3||d.to.length!==3||![...d.f,...d.to].every(isNum))return null;
  const a=new THREE.Vector3(...d.f),b=new THREE.Vector3(...d.to);return a.distanceTo(b)<=60?[a,b]:null}
function cleanPose(d){const p=d.p;if(!Array.isArray(p)||p.length!==11||!p.every(isNum))return null;
  return{t:'pose',p:p.map((v,i)=>i===3||i>=8?clamp(v,-50,50):clamp(v,-1e6,1e6)),h:typeof d.h==='string'&&ITEMS[d.h]?d.h:null,
    v:Array.isArray(d.v)&&d.v.length===7&&d.v.every(isNum)?d.v:0,e:str(d.e,12),hp:num(d.hp,0,200,100),o2:num(d.o2,0,100,100),mh:num(d.mh,50,200,100),in:d.in?1:0,
    hd:Array.isArray(d.hd)&&d.hd.length===2&&d.hd.every(isNum)?[clamp(d.hd[0],-1.2,1.2),clamp(d.hd[1],-0.6,0.6)]:[0,0],
    rd:Array.isArray(d.rd)&&d.rd.length===2&&d.rd.every(isNum)?[clamp(d.rd[0],-4,4),clamp(d.rd[1],-4,4)]:0}}
async function joinWorld(d){
  if(net.role==='guest'&&S){ // reconnect: refresh the world without leaving play
    net.reconnect=0;toast('Reconnected to the host','good');radio('System','Link restored.','sys');
    S.inv=cleanSlots(d.you&&d.you.inv,INV_SIZE);S.ups=(d.you&&d.you.ups)||{};refreshInvUI();return}
  fade(true,'Joining colony…');await wait(400);
  for(const id of['title','sites','worlds','coop','over','friends','account','settings','creator','pause'])$('#'+id).classList.add('hidden');
  if(!loadFromData(d.save)){fade(false);toast('The colony data was invalid','bad');showTitle();return}
  net.role='guest';net.reconnect=0;net.lastHost=now;
  S.inv=cleanSlots(d.you&&d.you.inv,INV_SIZE);S.ups=(d.you&&d.you.ups)||{};S.guests={};
  P.mode='foot';P.o2=100;P.hp=maxHP();P.bat=100;const hb=home(),sa=(hb.rot||0)+(Math.random()-0.5)*1.4;const sp={x:hb.x+Math.sin(sa)*10,z:hb.z+Math.cos(sa)*10};P.pos.set(sp.x,0,sp.z);P.pos.y=groundHeight(P.pos.x,P.pos.z);P.vel.set(0,0,0);P.lastG=undefined;
  R.pos.set(P.pos.x+6,0,P.pos.z+4);R.pos.y=groundHeight(R.pos.x,R.pos.z);R.battery=100;R.speed=0;R.visY=R.pos.y;R.lastG=R.pos.y;
  S.samples=[];updateChunks(P.pos.x,P.pos.z,999);enterPlay();updateNetUI();fade(false);
  toast(`You joined ${cleanName(d.host)}’s colony!`,'good');SFX.radio();
  {let seen=[];try{seen=JSON.parse(localStorage.getItem('mlc-joined'))||[]}catch(e){}const key=cleanName(d.host)+'@'+(S.site||'');if(!seen.includes(key)){seen.push(key);try{localStorage.setItem('mlc-joined',JSON.stringify(seen.slice(-30)))}catch(e){}setTimeout(()=>{if(game.state==='play'&&!game.tour)startTour()},2200)}}radio('System',`Connected to ${cleanName(d.host)}’s colony.`,'sys');
}
function leaveNet(silent){
  net.leaving=true;
  if(net.role==='guest')sendTo(net.hostConn,{t:'bye'});
  if(net.role==='host')netSend({t:'sys',m:'The host closed the colony.'});
  try{net.peer&&net.peer.destroy()}catch(e){}
  for(const id of[...net.players.keys()])dropPlayer(id);
  Object.assign(net,{role:null,peer:null,hostConn:null,code:null,reconnect:0});net.conns.clear();net.invDirty.clear();
  updateNetUI();if(!silent)toast('Co-op session ended');
}
/* ---------- remote astronauts ---------- */
function nameSprite(name){
  const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.font='bold 28px system-ui,sans-serif';x.textAlign='center';
  const w=Math.min(250,x.measureText(name).width+28);x.fillStyle='rgba(15,8,5,.6)';x.fillRect(128-w/2,10,w,44);x.fillStyle='#fff';x.fillText(name,128,42);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(2.6,0.65,1);s.renderOrder=999;return s;
}
function applyLookTo(a,rv,l){l=cleanLook(l);dressModel(a,l);rv.userData.paint.color.set(l.rover)}
function getRemote(id,name,look){
  let p=net.players.get(id);
  if(!p){const a=mkAstronaut(),rv=mkRover();a.userData.lamp.parent.remove(a.userData.lamp,a.userData.lamp.target);rv.userData.body.remove(rv.userData.lamp,rv.userData.lamp.target);rv.rotation.order='YXZ';
    const lab=nameSprite(name||'Crewmate');lab.position.y=2.7;a.add(lab);
    scene.add(a,rv);p={id,name,a,rv,lookS:'',t:null,ph:0,wave:0};net.players.set(id,p);updateNetUI()}
  if(look){const s=JSON.stringify(look);if(s!==p.lookS){p.lookS=s;applyLookTo(p.a,p.rv,look)}}
  return p;
}
function dropPlayer(id){const p=net.players.get(id);if(!p)return;scene.remove(p.a,p.rv);net.players.delete(id);updateNetUI()}
function myPose(){return{t:'pose',id:net.role==='host'?ME:net.token,name:net.name,look:LOOK,h:S.inv[P.hot]?S.inv[P.hot].id:null,hp:P.hp,o2:P.o2,mh:maxHP(),in:P.inside?1:0,e:game.emote||'',
  hd:[+astro.userData.head.rotation.y.toFixed(2),+astro.userData.head.rotation.x.toFixed(2)],rd:P.ragdoll?[+P.ragdoll.rx.toFixed(2),+P.ragdoll.rz.toFixed(2)]:0,p:[P.pos.x,P.pos.y,P.pos.z,P.yaw,P.mode==='rover'?1:0,rover.position.x,rover.position.y,rover.position.z,R.yaw,R.pitch,R.roll],
  v:vac.mode?[vac.mode==='mine'?1:2,vac.from.x,vac.from.y,vac.from.z,vac.target.x,vac.target.y,vac.target.z]:0}}
function updateRemotePose(d){if(d.id===net.token&&net.role==='guest')return;const p=getRemote(d.id,d.name,d.look);p.t=d;if(!!p.a.userData.casual!==!!d.in)setOutfit(p.a,!!d.in);if(p.a.userData.held!==d.h)setHeld(p.a,d.h)}
function updateRemotes(dt){
  for(const p of net.players.values()){
    const d=p.t;if(!d)continue;const q=d.p,k=damp(12,dt),a=p.a,rv=p.rv,u=a.userData;
    const ox=a.position.x,oz=a.position.z;a.position.x=lerp(a.position.x,q[0],k);a.position.y=lerp(a.position.y,q[1],k);a.position.z=lerp(a.position.z,q[2],k);
    a.rotation.order='YXZ';a.rotation.y=lerpA(a.rotation.y,q[3],k);a.rotation.x=lerpA(a.rotation.x,d.rd?d.rd[0]:0,k);a.rotation.z=lerpA(a.rotation.z,d.rd?d.rd[1]:0,k);a.visible=!q[4];
    const oy=a.userData.ly??a.position.y;a.position.y=a.userData.ly=lerp(oy,q[1],k);
    const sp=Math.hypot(a.position.x-ox,a.position.z-oz)/Math.max(dt,1e-3),vy=(a.position.y-oy)/Math.max(dt,1e-3);
    p.amt=lerp(p.amt||0,clamp(sp/4.6,0,1.25),damp(8,dt));p.ph+=sp*dt*TAU/(1.5+sp*0.18);const air=Math.abs(vy)>2.5&&sp<12;
    a.position.y+=animSuit(a,p.ph,p.amt,!air,false);const sw=Math.sin(p.ph)*0.55*p.amt;
    const hd=d.hd||[0,0];u.head.rotation.y=lerp(u.head.rotation.y,hd[0],k);u.head.rotation.x=lerp(u.head.rotation.x,hd[1],k);
    if(p.bub){p.bub.t-=dt;p.bub.s.material.opacity=clamp(p.bub.t,0,1);if(p.bub.t<=0){a.remove(p.bub.s);p.bub=null}}
    if(d.e==='wave'){p.wave+=dt;u.armL.rotation.set(0,0,2.6+Math.sin(p.wave*10)*0.4)}else{p.wave=0;u.armL.rotation.z=0}
    if(d.v){u.armR.rotation.x=-1.4;const hm=u.heldModel;if(hm&&hm.userData.bit)hm.userData.bit.rotation.y+=dt*40;if(Math.random()<0.4)emitSparks(_v1.set(d.v[4],d.v[5],d.v[6]),2)}else u.armR.rotation.x=sw*0.8;
    rv.position.set(lerp(rv.position.x,q[5],k),lerp(rv.position.y,q[6],k),lerp(rv.position.z,q[7],k));rv.rotation.set(-q[9],q[8],q[10]);
  }
}
/* ---------- host → guests world state ---------- */
function snapData(){return{t:'snap',time:S.time,res:S.res,battery:S.battery,cap:S.cap,rates:S.rates,crew:S.crew,crewList:S.crewList,research:[...S.research],chapter:S.chapter,
  objDone:[...S.objDone],flags:S.flags,storm:S.storm,spe:S.spe,brownout:S.brownout,powerNet:S.powerNet,powerProd:S.powerProd,powerDemand:S.powerDemand,tier:S.tier||0,
  scanned:[...S.scanned],sampled:[...S.sampled],labQueue:S.labQueue.length,extraPOIs:S.extraPOIs||[],extraDeps:S.extraDeps||[],stowed:!!S.stowed,rep:S.rep,lang:S.lang,
  disaster:typeof disasterSnap==='function'?disasterSnap():null,over:S.over,storage:S.storage,
  world:{pwp:S.pwp||[],landmarks:S.landmarks,loot:S.loot,pylons:S.pylons||{},shrines:S.shrines||{},caves:S.caves,knownCaves:S.knownCaves||{},driven:S.driven||{},met:S.met||{},depleted:S.depleted,lostCaches:S.lostCaches,
    explored:(net.snapN=(net.snapN||0)+1)%8===1?S.explored:null},
  blds:blds.map(b=>({id:b.id,t:b.type,x:b.x,z:b.z,r:b.rot,p:b.progress,f:b.fault,on:b.on,d:b.dust,pw:b.powered}))}}
// shared discovery state: plain {key:value} maps, size-capped and type-checked before use
function plainMap(o,max,valOK){const out={};if(!o||typeof o!=='object'||Array.isArray(o))return out;let n=0;for(const k in o){if(n++>=max)break;if(typeof k==='string'&&k.length<64&&valOK(o[k]))out[k]=o[k]}return out}
const okBool=v=>v===true||v===1,okNum=v=>Number.isFinite(v),okFlags=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length<8&&Object.values(v).every(x=>typeof x==='boolean'||Number.isFinite(x));
function applyWorldSnap(w){
  S.landmarks=plainMap(w.landmarks,4000,okFlags);S.caves=plainMap(w.caves,4000,okFlags);S.loot=plainMap(w.loot,8000,v=>okBool(v)||okNum(v));
  S.pylons=plainMap(w.pylons,4000,okBool);S.shrines=plainMap(w.shrines,2000,okNum);S.knownCaves=plainMap(w.knownCaves,4000,okBool);
  S.driven=plainMap(w.driven,2000,okNum);S.met=plainMap(w.met,16,okBool);S.depleted=plainMap(w.depleted,20000,okNum);
  if(Array.isArray(w.pwp)){S.pwp=w.pwp.slice(0,40).filter(p=>p&&typeof p.id==='string'&&isNum(p.x)&&isNum(p.z)).map(p=>({id:str(p.id,24),x:p.x,z:p.z,name:str(p.name,24)||'Waypoint',who:str(p.who,20)||'Crewmate',by:str(p.by,40),col:/^#[0-9a-f]{6}$/i.test(p.col)?p.col:'#ffd34d'}));if(typeof syncPwp==='function')syncPwp()}
  if(Array.isArray(w.lostCaches)){S.lostCaches=w.lostCaches.slice(0,16).filter(c=>c&&typeof c.id==='string'&&isNum(c.x)&&isNum(c.y)&&isNum(c.z)&&Array.isArray(c.items));if(typeof syncCaches==='function')syncCaches()}
  if(w.explored){const e=plainMap(w.explored,60000,okBool);for(const k in e)S.explored[k]=1}
}
function sendSnap(){if(net.role==='host'&&net.conns.size)netSend(snapData());net.snapDirty=false}
function applySnap(d){
  if(!d.res||!Array.isArray(d.blds))return;
  S.time=num(d.time,0,1e9,S.time);for(const k of['o2','water','food','rp'])S.res[k]=num(d.res[k],0,1e9,S.res[k]);
  S.battery=num(d.battery,0,1e7);S.cap=num(d.cap,1,1e7,1);S.rates=d.rates||S.rates;S.crew=num(d.crew,0,10000,S.crew);if(Array.isArray(d.crewList))S.crewList=d.crewList.slice(0,64);
  S.research=new Set((d.research||[]).filter(r=>RESEARCH.some(x=>x.id===r)));S.chapter=num(d.chapter,0,99,S.chapter);S.objDone=new Set(d.objDone||[]);
  if(d.flags&&typeof d.flags==='object')for(const k in d.flags)S.flags[k]=d.flags[k];
  if(d.storm)S.storm=d.storm;if(d.spe)S.spe=d.spe;S.brownout=!!d.brownout;S.powerNet=num(d.powerNet,-1e6,1e6);S.powerProd=num(d.powerProd,0,1e6);S.powerDemand=num(d.powerDemand,0,1e6);
  S.tier=num(d.tier,0,10);S.scanned=new Set(d.scanned||[]);S.sampled=new Set(d.sampled||[]);S.labQueue=new Array(num(d.labQueue,0,99)).fill(0);
  if(Array.isArray(d.extraPOIs))S.extraPOIs=d.extraPOIs;if(Array.isArray(d.extraDeps))S.extraDeps=d.extraDeps;S.stowed=!!d.stowed;
  if(d.rep)S.rep=d.rep;if(d.lang)S.lang=d.lang;if(d.storage)S.storage=cleanSlots(d.storage,STORE_SIZE);
  if(d.disaster&&typeof applyDisasterSnap==='function')applyDisasterSnap(d.disaster);
  if(d.world&&typeof d.world==='object')applyWorldSnap(d.world);
  const ids=new Set();
  for(const hb of d.blds){if(!hb||!BUILD[hb.t]||!isNum(hb.x)||!isNum(hb.z))continue;ids.add(hb.id);let b=blds.find(x=>x.id===hb.id);
    if(!b)b=addBuilding(hb.t,hb.x,hb.z,num(hb.r,-10,10),num(hb.p,0,1),{id:hb.id,fault:hb.f,on:hb.on,dust:hb.d});
    else{b.progress=num(hb.p,0,1);const e=1-Math.pow(1-b.progress,3);b.g.scale.set(1,b.progress>=1?1:0.03+0.97*e,1);
      b.on=!!hb.on;b.dust=num(hb.d,0,1);
      if(hb.f&&!b.fault){b.fault=hb.f;addFaultMarker(b)}else if(!hb.f&&b.fault){b.fault=null;if(b.fm){scene.remove(b.fm);b.fm=null}}}
    b.powered=!!hb.pw}
  for(const b of[...blds])if(!ids.has(b.id))removeBuilding(b);
  if(invUI.open)refreshInvUI();
  if(d.over&&!S.over)gameOver();
}
function removeRockKey(k){if(minedRocks.has(k))return;minedRocks.add(k);const[cx,cz]=k.split(',');if(chunks.get(cx+','+cz)){dirtyChunks.add(cx+','+cz);rebuildDirtyChunks()}}
function netTick(dt){
  if(!net.role)return;
  updateRemotes(dt);
  if((net.poseT-=dt)<=0){net.poseT=0.1;const p=myPose();if(net.role==='host')netSend(p);else sendTo(net.hostConn,p)}
  if(net.role==='host'){
    for(const pid of net.invDirty){const c=netConnOf(pid),g=S.guests[pid];if(c&&g)sendTo(c,{t:'inv',inv:g.inv,ups:g.ups,storage:S.storage})}net.invDirty.clear();
    if((net.snapT-=dt)<=0||net.snapDirty&&net.snapT<0.75){net.snapT=1;sendSnap()}
    for(const g of net.conns.values())if(g.ready&&now-g.last>20){sendTo(g.conn,{t:'sys',m:'Timed out.'});g.conn.close()}
  }else{
    if((net.flagT-=dt)<=0){net.flagT=2;sendTo(net.hostConn,{t:'act',a:'flags',f:{nearRover:!!S.flags.nearRover,habCheck:!!S.flags.habCheck}})}
    if(net.reconnect===0&&net.lastHost&&now-net.lastHost>9)startReconnect();
  }
}
function updateNetUI(){
  const el=$('#netinfo');if(!el)return;
  if(!net.role){el.classList.add('hidden');const b=$('#p-coop');if(b)b.textContent='Invite friends (co-op)';return}
  el.classList.remove('hidden');
  const names=[net.name+' (you)',...[...net.players.values()].map(p=>p.name)];
  el.innerHTML=(net.role==='host'?`Co-op code <b>${esc(net.code)}</b>`:'Co-op')+` · ${names.length} player${names.length>1?'s':''}<span>${names.map(esc).join(', ')}</span>`;
  const b=$('#p-coop');if(b)b.textContent=net.role==='host'?`Co-op code: ${net.code} (click to close)`:'Leave co-op session';
}
function coopMsg(m){$('#coop-msg').textContent=m}
function closeCoop(){$('#coop').classList.add('hidden')}
// cards are mirrored to crewmates when you're the host
{const _card=card;card=function(a,b,c,d,remote){_card(a,b,c,d);if(net.role==='host'&&!remote)netSend({t:'card',a,b,c,d})}}

/* ---------- sleeping together: when everyone in the colony is in bed at night, skip to morning ---------- */
net.sleepers=new Set();
function netSleep(on){
  sleepUI(on,0,1,false);game.sleeping=!!on;
  if(net.role==='host'){if(on)net.sleepers.add(ME);else net.sleepers.delete(ME);hostCheckSleep()}
  else if(net.role==='guest')sendTo(net.hostConn,{t:'sleep',on:on?1:0})}
function hostCheckSleep(){if(net.role!=='host')return;const ids=[ME,...[...net.conns.values()].filter(g=>g.ready).map(g=>g.token)],n=ids.filter(i=>net.sleepers.has(i)).length;
  netSend({t:'sleepn',n,of:ids.length});if(net.sleepers.has(ME))sleepUI(true,n,ids.length,true);
  if(n>0&&n>=ids.length){net.sleepers.clear();netSend({t:'slept'});sleepUI(false);game.sleeping=false;rest()}}
function sleepUI(on,n,of,upd){let el=$('#sleepui');if(!el){el=document.createElement('div');el.id='sleepui';el.className='hidden';el.innerHTML='<b>Sleeping…</b><span id="sl-n"></span><button class="btn sm" id="sl-up">Get up</button>';document.body.appendChild(el);el.querySelector('#sl-up').onclick=()=>netSleep(false)}
  if(!on){el.classList.add('hidden');game.sleeping=false;return}if(!upd&&!el.classList.contains('hidden')&&!game.sleeping)return;el.classList.remove('hidden');$('#sl-n').textContent=of>1?`${n} of ${of} crew in bed. Night is skipped when everyone is asleep.`:'Waiting…'}
