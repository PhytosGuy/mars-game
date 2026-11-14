'use strict';
/* =========================================================
   ONBOARDING: a short guided tour of the screen, the controls and the features.
   Shown the first time you land; Skip (bottom-right) ends it; replay it from Settings.
   ========================================================= */
const isTouchUI=()=>document.body.classList.contains('touch');
const TOUR=[
  {t:'Welcome to Mars',b:()=>`You’re the newest member of a small crew building humanity’s first colony. This quick tour shows what’s on screen and how to play. It takes about a minute, and you can skip it at any time.`},
  {sel:'#minimap',t:'Minimap',b:()=>`The map turns with you, so up is the way you’re facing; the orange <b>N</b> marks north. White squares are your modules, the orange dot is the rover, green dots are friendly creatures, red dots are hostile ones, and the orange ring is where your mission wants you to go. Press <b>M</b> for the full map.`},
  {sel:'#vitals2',t:'Your stats',b:()=>`<b>Health</b> is your suit’s integrity: storms, falls, creatures and crashes wear it down. <b>Oxygen</b> slowly runs out outside; the habitat, the rover and Oxygen Canisters refill it. <b>Battery</b> powers your drill, lamp and heaters. <b>Colony O₂</b> is the base’s air supply: keep it from running out.`},
  {sel:'#top',t:'Compass and guide',b:()=>`The compass shows where the base, rover and discoveries are. When a mission is tracked, the orange arrow, here and on the ground, points the way. Turn it off in Settings if you’d rather explore freely.`},
  {sel:'#journal',t:'Missions',b:()=>`Your tracked mission and its steps. Missions are optional and can be done in any order: open the <b>Tab</b> menu and choose <b>Missions</b> to track a different one.`},
  {sel:'#hotbar',t:'Hotbar and inventory',b:()=>isTouchUI()?`Tap a slot to pick an item. The <b>Hand Drill</b> mines ore, rock and ice: hold <b>Use</b>. The <b>Pulse Blaster</b> defends you from hostile creatures. Tap <b>⋯</b> for your full inventory and crafting.`:`Press <b>1–9</b>, scroll or click to pick an item. Hold <b>left mouse</b> to use it: the <b>Hand Drill</b> mines ore, rock and ice; the <b>Pulse Blaster</b> defends you (it has a short cooldown). Click <b>⋯</b> or press <b>Tab</b> for your full inventory.`},
  {sel:()=>isTouchUI()?'#touchui':null,t:'Moving around',b:()=>isTouchUI()?`<b>Left side:</b> put your thumb down anywhere for a joystick. <b>Right side:</b> drag to look, pinch to zoom, tap to place things. <b>Jump</b>, <b>Use</b> (hold), <b>Interact</b>, <b>Run</b> and <b>Rover</b> are on the right; <b>Menu</b>, <b>Map</b>, <b>Build</b> and <b>Pause</b> are along the top.`:`<b>WASD</b> to walk, <b>Shift</b> to run (on Mars that’s a bounding lope), <b>Space</b> to leap: gravity is only 38% of Earth’s. Walk into cliffs, boulders or modules to climb them. Right-drag or the <b>arrow keys</b> look around. <b>Caps Lock</b> turns on shift lock: the mouse looks around and you aim at the centre. <b>F</b> interacts, or toggles your flashlight when nothing is nearby. <b>E</b> gets in or out of the rover (once the colony is set up), <b>B</b> builds, <b>M</b> opens the map, <b>Esc</b> opens the menu.`},
  {t:'The Tab menu',b:()=>`<b>Tab</b> opens your inventory, with your profile at the top. Press Tab again to flip through your <b>Journal</b>, <b>Missions</b>, <b>Colony</b>, <b>Research</b>, <b>Crew</b>, <b>Stats</b>, logbook and real NASA Mars data.`},
  {t:'Your base',b:()=>`Press <b>F</b> at the habitat door to cycle through the airlock and take off your suit. Inside: a sleep pod, your <b>journal</b>, a <b>wardrobe</b> to change your look, a <b>holo-map</b>, and a panel to change the room’s colours. The base is a safe zone: hostile creatures, dust devils and meteors stay away. Build a <b>Camp Bed</b> [B] to sleep anywhere.`},
  {t:'NASA Mission Lab',b:()=>`Open the <b>Tab</b> menu and choose <b>Mission Lab</b> to design a real-style NASA science mission: pick a goal, trade off spacecraft, choose instruments, find a launch window to Mars and launch. Good designs earn research points.`},
  {t:'Dangers',b:()=>`Dust storms, dust devils, quakes, meteor showers (watch for red rings on the ground), solar storms and cold snaps all affect you. When one hits, the guide points you to shelter. If you get thrown, steer with <b>WASD</b> and hold <b>Space</b> to brace and land on your feet.`},
  {t:'Life on Mars',b:()=>`Peaceful Tharrak and Lumari talk in glyphs you learn over time; Pebblehoppers and Loomstriders leave boosts if you feed them; Rustmites and Ravagers attack. Mission Control also shares real NASA facts as you explore.`},
  {sel:'#chatbtn',t:'Chat and friends',b:()=>`Press <b>Enter</b> (or this button) to chat over the radio. <b>Esc → Friends</b> shows your colony code to share, and lets you invite friends who are online. Crewmates’ health shows under yours.`},
  {t:'You’re ready',b:()=>`Follow your first mission, or just explore: pick a direction and see what’s out there. Good luck, astronaut!`},
];
const tour={i:0,on:false};
function startTour(){if(game.state!=='play')return;tour.on=true;tour.i=0;game.tour=true;if(document.pointerLockElement)document.exitPointerLock();$('#tour').classList.remove('hidden');renderTour()}
function endTour(){tour.on=false;game.tour=false;$('#tour').classList.add('hidden');OPT.onboarded=true;saveOpts()}
function renderTour(){
  const st=TOUR[tour.i],selv=typeof st.sel==='function'?st.sel():st.sel,el=selv?$(selv):null,r=el&&el.getBoundingClientRect(),vis=r&&r.width>0&&r.height>0;
  const hole=$('#tourhole'),card=$('#tourcard');
  if(vis){const pad=8;Object.assign(hole.style,{left:(r.left-pad)+'px',top:(r.top-pad)+'px',width:(r.width+pad*2)+'px',height:(r.height+pad*2)+'px',display:'block'})}else hole.style.display='none';
  card.innerHTML=`<div class="tstep">${tour.i+1} / ${TOUR.length}</div><h3>${st.t}</h3><p>${st.b()}</p><div class="tbtns">${tour.i>0?'<button class="btn" id="tour-back">Back</button>':''}<span style="flex:1"></span><button class="btn primary" id="tour-next">${tour.i===TOUR.length-1?'Start playing':'Next'}</button></div>`;
  // place the card beside the highlighted element (or in the middle)
  const cw=Math.min(380,innerWidth-32);card.style.width=cw+'px';const ch=card.offsetHeight;let x=(innerWidth-cw)/2,y=(innerHeight-ch)/2;
  if(vis){if(r.right+cw+28<innerWidth)x=r.right+20;else if(r.left-cw-28>0)x=r.left-cw-20;else x=clamp(r.left+r.width/2-cw/2,16,innerWidth-cw-16);
    y=r.bottom+ch+28<innerHeight?(x===r.right+20||x===r.left-cw-20?clamp(r.top,16,innerHeight-ch-16):r.bottom+18):clamp(r.top-ch-18,16,innerHeight-ch-16)}
  card.style.left=x+'px';card.style.top=y+'px';
}
$('#tour').addEventListener('click',e=>{if(e.target.id==='tour-next'){if(tour.i>=TOUR.length-1)endTour();else{tour.i++;renderTour()}}else if(e.target.id==='tour-back'){tour.i=Math.max(0,tour.i-1);renderTour()}});
$('#tourskip').addEventListener('click',endTour);
addEventListener('resize',()=>{if(tour.on)renderTour()});
addEventListener('keydown',e=>{if(!tour.on)return;if(e.key==='Enter'||e.key==='ArrowRight'){e.stopImmediatePropagation();if(tour.i>=TOUR.length-1)endTour();else{tour.i++;renderTour()}}else if(e.key==='ArrowLeft'){e.stopImmediatePropagation();tour.i=Math.max(0,tour.i-1);renderTour()}else if(e.key==='Escape'){e.stopImmediatePropagation();endTour()}},true);
