'use strict';

/* =========================================================
   MAIN LOOP
   ========================================================= */
showTitle();
let last=performance.now();
function loop(t){
  requestAnimationFrame(loop);
  const dt=Math.min(0.05,Math.max(0,(t-last)/1000));last=t;now=t/1000;
  if(game.state==='title'||game.state==='sites')titleUpdate(dt);
  else if(game.state==='intro')introUpdate(dt);
  else if(game.state==='play'&&(!game.paused||(net.role&&!S.over))&&(!game.tour||net.role))playUpdate(dt);
  if(typeof gfxAuto==='function')gfxAuto(dt);
  updateAudio();
  renderFrame();
}
requestAnimationFrame(loop);
window.__mars={get S(){return S},P,R,blds,game,cam,cave,net,spawnMeteor,addBuilding,act,invUI,deps:()=>depTargets,creatures:()=>creatures,startQuake,caveQuery,floorAt,entrancesNear,landmarksNear,spawnPickup,get storyPOIs(){return storyPOIs},GFX};
