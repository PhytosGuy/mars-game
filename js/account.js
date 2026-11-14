'use strict';
/* =========================================================
   ACCOUNTS, PROFILES & FRIENDS (Supabase)
   Without a Supabase project configured (js/config.js), your name and look are
   still saved on this device. With one: email sign-in, a profile that follows you,
   friends, and one-tap joining when a friend is playing.
   Security: all tables use Row Level Security (see README); only the public anon key is in the page.
   ========================================================= */
const ACC={sb:null,user:null,profile:null,friends:[],incoming:[],outgoing:[],busy:false,beat:null};
const sbConfigured=()=>typeof SUPABASE_URL==='string'&&/^https:\/\/.+\.supabase\.co\/?$/.test(SUPABASE_URL)&&typeof SUPABASE_ANON_KEY==='string'&&SUPABASE_ANON_KEY.length>30;
if(OPT.autoHost===undefined)OPT.autoHost=true;
const cleanUser=s=>String(s||'').replace(/[^A-Za-z0-9 _-]/g,'').trim().slice(0,20);
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Could not load '+src));document.head.appendChild(s)})}
async function sbInit(){
  if(ACC.sb||!sbConfigured())return ACC.sb;
  try{await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js');
    ACC.sb=window.supabase.createClient(SUPABASE_URL.replace(/\/$/,''),SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const{data}=await ACC.sb.auth.getSession();ACC.user=data&&data.session?data.session.user:null;
    ACC.sb.auth.onAuthStateChange((ev,sess)=>{const was=ACC.user&&ACC.user.id;ACC.user=sess?sess.user:null;if(ACC.user&&ACC.user.id!==was)loadProfile();if(!ACC.user)ACC.profile=null;renderAccount();renderAcctBtn()});
    if(ACC.user)await loadProfile();
    if(!ACC.beat)ACC.beat=setInterval(heartbeat,40000);
  }catch(e){console.warn(e);ACC.sb=null}
  renderAcctBtn();return ACC.sb;
}
async function loadProfile(){
  if(!ACC.sb||!ACC.user)return;
  let{data,error}=await ACC.sb.from('profiles').select('id,username,look').eq('id',ACC.user.id).maybeSingle();
  if(!data&&!error){ // first sign-in: create the profile from the name and suit on this device (pick a free username)
    let base=cleanUser(ACC.user.user_metadata&&ACC.user.user_metadata.username)||cleanUser(net.name)||'Astronaut';if(base.length<3)base='Astronaut';
    for(let i=0;i<5&&!data;i++){const name=i?(base.slice(0,15)+'-'+Math.floor(Math.random()*9000+1000)):base;
      const r=await ACC.sb.from('profiles').insert({id:ACC.user.id,username:name,look:LOOK}).select('id,username,look').maybeSingle();data=r.data;if(r.error&&!/duplicate|unique/i.test(r.error.message))break}}
  if(data){ACC.profile=data;net.name=data.username;try{localStorage.setItem('mlc-name',net.name)}catch(e){}
    if(data.look&&typeof data.look==='object'&&Object.keys(data.look).length){LOOK=Object.assign({},LOOK_DEFAULT,LOOK,data.look);applyLook();try{localStorage.setItem('mlc-look',JSON.stringify(LOOK))}catch(e){}}}
  heartbeat();renderAccount();renderAcctBtn();
}
// let friends see you're online (and which co-op code to join, if you're hosting)
async function heartbeat(){
  if(!ACC.sb||!ACC.user)return;const code=net.role==='host'?net.code:null;
  try{await ACC.sb.from('presence').upsert({user_id:ACC.user.id,room_code:code,last_seen:new Date().toISOString()})}catch(e){}
}
/* ---------- account window ---------- */
function renderAcctBtn(){const b=$('#acctbtn');if(!b)return;b.querySelector('span').textContent=ACC.profile?ACC.profile.username:(net.name||'Guest')}
function lookEditor(){return WOPTS.filter(o=>o[0]!=='rover').map(([k,l,cols])=>`<div class="wrow"><div class="sub">${l}</div><div class="sw">${cols.map(c=>`<button data-lk="${k}" data-v="${c}" style="background:${c}" class="${LOOK[k]===c?'on':''}"></button>`).join('')}</div></div>`).join('')}
function renderAccount(msg){
  const box=$('#acctbody');if(!box)return;const m=msg?`<div class="amsg">${esc(msg)}</div>`:'';
  let h='';
  if(ACC.user&&ACC.profile){
    h=`<div class="arow"><span class="sub">Signed in as ${esc(ACC.user.email||'')}</span></div>
      <div class="field"><span class="sub">Username</span><div class="inrow"><input id="acc-name" maxlength="20" value="${esc(ACC.profile.username)}"><button class="btn sm primary" id="acc-save">Save</button></div></div>
      <div class="sec">Appearance</div>${lookEditor()}
      <div class="srow"><span>Open my games to friends</span><div class="opt"><button data-ah="1" class="${OPT.autoHost?'on':''}">On</button><button data-ah="0" class="${OPT.autoHost?'':'on'}">Off</button></div></div>
      <div class="btns"><button class="btn" id="acc-out">Sign out</button></div>`;
  }else{
    h=`<div class="field"><span class="sub">Your name (shown to other players)</span><div class="inrow"><input id="acc-local" maxlength="20" value="${esc(net.name||'')}"><button class="btn sm" id="acc-localsave">Save</button></div></div>
      <div class="sec">Appearance</div>${lookEditor()}`;
    if(sbConfigured())h+=`<div class="sec" style="margin-top:14px">Online account</div><p class="sub">Sign in to keep your name and look on any device, add friends and join their games.</p>
      <div class="field"><span class="sub">Email</span><input id="acc-email" type="email" autocomplete="email"></div>
      <div class="field"><span class="sub">Password (8+ characters)</span><input id="acc-pass" type="password" autocomplete="current-password"></div>
      <div class="btns"><button class="btn primary" id="acc-in">Sign in</button><button class="btn" id="acc-up">Create account</button></div>`;
    else h+=`<p class="sub" style="margin-top:12px">Online accounts aren’t switched on for this copy of the game yet. Your name and look are saved on this device.</p>`;
  }
  box.innerHTML=m+h;
}
async function openAccount(){$('#account').classList.remove('hidden');renderAccount(sbConfigured()&&!ACC.sb?'Connecting…':'');await sbInit();renderAccount()}
$('#acc-x').onclick=()=>$('#account').classList.add('hidden');
$('#account').addEventListener('keydown',e=>e.stopPropagation());
$('#account').addEventListener('click',async e=>{
  const t=e.target,lk=t.closest('[data-lk]'),ah=t.closest('[data-ah]');
  if(lk){LOOK[lk.dataset.lk]=lk.dataset.v;applyLook();try{localStorage.setItem('mlc-look',JSON.stringify(LOOK))}catch(err){}renderAccount();if(ACC.sb&&ACC.user)ACC.sb.from('profiles').update({look:LOOK}).eq('id',ACC.user.id).then(()=>{});return}
  if(ah){OPT.autoHost=ah.dataset.ah==='1';saveOpts();renderAccount();return}
  if(t.id==='acc-localsave'){const n=cleanUser($('#acc-local').value);if(n.length<2){renderAccount('Pick a name with at least 2 letters');return}net.name=n;try{localStorage.setItem('mlc-name',n)}catch(err){}renderAcctBtn();renderAccount('Saved');return}
  if(ACC.busy)return;
  if(t.id==='acc-in'||t.id==='acc-up'){const email=$('#acc-email').value.trim(),pass=$('#acc-pass').value;
    if(!/^\S+@\S+\.\S+$/.test(email)||pass.length<8){renderAccount('Enter a valid email and a password of at least 8 characters');return}
    ACC.busy=true;renderAccount(t.id==='acc-in'?'Signing in…':'Creating your account…');
    const r=t.id==='acc-in'?await ACC.sb.auth.signInWithPassword({email,password:pass}):await ACC.sb.auth.signUp({email,password:pass,options:{emailRedirectTo:location.origin,data:{username:cleanUser(net.name)}}});
    ACC.busy=false;
    if(r.error)renderAccount(r.error.message);
    else if(t.id==='acc-up'&&!r.data.session)renderAccount('Check your inbox: click the confirmation link, then sign in here.');
    else{await loadProfile();renderAccount('Welcome, '+(ACC.profile?ACC.profile.username:'astronaut')+'!')}
    return}
  if(t.id==='acc-save'){const n=cleanUser($('#acc-name').value);if(n.length<3){renderAccount('Usernames need 3–20 letters, numbers, spaces, - or _');return}
    ACC.busy=true;const r=await ACC.sb.from('profiles').update({username:n,updated_at:new Date().toISOString()}).eq('id',ACC.user.id);ACC.busy=false;
    if(r.error)renderAccount(/duplicate|unique/i.test(r.error.message)?'That username is taken':r.error.message);else{ACC.profile.username=n;net.name=n;try{localStorage.setItem('mlc-name',n)}catch(err){}renderAcctBtn();renderAccount('Username saved')}return}
  if(t.id==='acc-out'){await ACC.sb.auth.signOut();ACC.user=null;ACC.profile=null;renderAccount('Signed out');renderAcctBtn()}
});
/* ---------- friends ---------- */
const ONLINE_MS=90000;
async function loadFriends(){
  if(!ACC.sb||!ACC.user)return;const me=ACC.user.id;
  const{data:fs}=await ACC.sb.from('friendships').select('id,requester,addressee,status').or(`requester.eq.${me},addressee.eq.${me}`);
  const rows=fs||[],ids=[...new Set(rows.map(f=>f.requester===me?f.addressee:f.requester))];
  const profs=ids.length?((await ACC.sb.from('profiles').select('id,username').in('id',ids)).data||[]):[],name=id=>(profs.find(p=>p.id===id)||{}).username||'Unknown';
  const accepted=rows.filter(f=>f.status==='accepted').map(f=>{const id=f.requester===me?f.addressee:f.requester;return{fid:f.id,id,name:name(id)}});
  const pres=accepted.length?((await ACC.sb.from('presence').select('user_id,room_code,last_seen').in('user_id',accepted.map(a=>a.id))).data||[]):[];
  for(const a of accepted){const p=pres.find(x=>x.user_id===a.id);a.online=!!(p&&Date.now()-new Date(p.last_seen).getTime()<ONLINE_MS);a.code=a.online&&p.room_code?p.room_code:null}
  accepted.sort((a,b)=>(b.code?2:b.online?1:0)-(a.code?2:a.online?1:0)||a.name.localeCompare(b.name));
  ACC.friends=accepted;ACC.incoming=rows.filter(f=>f.status==='pending'&&f.addressee===me).map(f=>({fid:f.id,id:f.requester,name:name(f.requester)}));
  ACC.outgoing=rows.filter(f=>f.status==='pending'&&f.requester===me).map(f=>({fid:f.id,id:f.addressee,name:name(f.addressee)}));
}
function renderFriends(msg,results){
  const box=$('#frbody');if(!box)return;let h=msg?`<div class="amsg">${esc(msg)}</div>`:'';
  if(!sbConfigured()||!ACC.user){h+=`<p class="sub">${sbConfigured()?'Sign in to add friends and see when they’re online.':'Online friends aren’t switched on for this copy of the game yet.'}</p>${sbConfigured()?'<button class="btn primary" id="fr-signin">Sign in</button>':''}`}
  else{
    h+=`<div class="inrow"><input id="fr-q" maxlength="20" placeholder="Find people by username"><button class="btn sm" id="fr-search">Search</button></div>`;
    if(results)h+=`<div class="flist">${results.length?results.map(p=>{const isF=ACC.friends.some(f=>f.id===p.id),out=ACC.outgoing.some(f=>f.id===p.id);return`<div class="frow"><b>${esc(p.username)}</b><span style="flex:1"></span>${isF?'<span class="sub">Friend</span>':out?'<span class="sub">Requested</span>':`<button class="btn sm primary" data-add="${esc(p.id)}">Add friend</button>`}</div>`}).join(''):'<p class="sub">Nobody found.</p>'}</div>`;
    if(ACC.incoming.length)h+=`<div class="sec">Friend requests</div><div class="flist">${ACC.incoming.map(r=>`<div class="frow"><b>${esc(r.name)}</b><span style="flex:1"></span><button class="btn sm primary" data-acc="${r.fid}">Accept</button><button class="btn sm" data-del="${r.fid}">Decline</button></div>`).join('')}</div>`;
    h+=`<div class="sec">Friends</div><div class="flist">${ACC.friends.length?ACC.friends.map(f=>`<div class="frow"><i class="dot ${f.code?'on':f.online?'idle':''}"></i><b>${esc(f.name)}</b><span class="sub">${f.code?'Playing · can join':f.online?'Online':'Offline'}</span><span style="flex:1"></span>${f.code?`<button class="btn sm primary" data-join="${esc(f.code)}">Join</button>`:''}<button class="btn sm" data-del="${f.fid}" title="Remove friend">✕</button></div>`).join(''):'<p class="sub">No friends yet: search for someone’s username above.</p>'}</div>`;
    if(ACC.outgoing.length)h+=`<p class="sub">Waiting for: ${ACC.outgoing.map(o=>esc(o.name)).join(', ')}</p>`;
  }
  h+=`<div class="btns" style="margin-top:12px"><button class="btn" id="fr-code">Join with a code</button></div>`;
  box.innerHTML=h;
}
async function openFriends(){$('#friends').classList.remove('hidden');renderFriends(sbConfigured()?'Loading…':'');await sbInit();if(ACC.user)await loadFriends();renderFriends()}
$('#fr-x').onclick=()=>$('#friends').classList.add('hidden');
$('#friends').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&e.target.id==='fr-q')$('#fr-search').click()});
$('#friends').addEventListener('click',async e=>{
  const t=e.target,add=t.closest('[data-add]'),acc=t.closest('[data-acc]'),del=t.closest('[data-del]'),join=t.closest('[data-join]');
  if(t.id==='fr-signin'){$('#friends').classList.add('hidden');openAccount();return}
  if(t.id==='fr-code'){$('#friends').classList.add('hidden');$('#coop-name').value=net.name;$('#coop-code').value='';coopMsg('');$('#coop').classList.remove('hidden');$('#coop-code').focus();return}
  if(join){$('#friends').classList.add('hidden');$('#coop-name').value=net.name;$('#coop-code').value=join.dataset.join;$('#coop').classList.remove('hidden');joinGame(join.dataset.join);return}
  if(!ACC.sb||!ACC.user)return;
  if(t.id==='fr-search'){const q=cleanUser($('#fr-q').value);if(q.length<2){renderFriends('Type at least 2 letters');return}
    const{data}=await ACC.sb.from('profiles').select('id,username').ilike('username',`%${q}%`).neq('id',ACC.user.id).limit(10);renderFriends('',data||[]);return}
  if(add){const id=add.dataset.add,rev=ACC.incoming.find(r=>r.id===id);
    const r=rev?await ACC.sb.from('friendships').update({status:'accepted'}).eq('id',rev.fid):await ACC.sb.from('friendships').insert({requester:ACC.user.id,addressee:id});
    await loadFriends();renderFriends(r.error?r.error.message:rev?'You’re now friends':'Friend request sent');return}
  if(acc){const r=await ACC.sb.from('friendships').update({status:'accepted'}).eq('id',+acc.dataset.acc);await loadFriends();renderFriends(r.error?r.error.message:'Friend added');return}
  if(del){const r=await ACC.sb.from('friendships').delete().eq('id',+del.dataset.del);await loadFriends();renderFriends(r.error?r.error.message:'')}
});
setInterval(()=>{if(!$('#friends').classList.contains('hidden')&&ACC.user)loadFriends().then(()=>{if(!$('#fr-q')||!$('#fr-q').value)renderFriends()})},20000);
/* ---------- hooks ---------- */
$('#acctbtn').onclick=()=>{initAudio();openAccount()};
$('#friendsbtn').onclick=()=>{initAudio();openFriends()};
$('#b-coop').onclick=()=>{initAudio();openFriends()};
renderAcctBtn();
if(sbConfigured())sbInit();
// signed in with "open my games to friends": host automatically so friends can join from their list
function autoHostIfWanted(){if(OPT.autoHost&&ACC.user&&!net.role&&game.state==='play')hostGame();setTimeout(heartbeat,3000)}
