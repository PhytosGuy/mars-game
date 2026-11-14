'use strict';
/* ---------- small shared helpers ---------- */
function setRing(ring){
  const rg=$('#ring');
  if(ring){rg.classList.remove('hidden');$('#ringfg').style.strokeDashoffset=213.6*(1-clamp(ring.p,0,1));$('#ringlbl').textContent=ring.l}
  else if(!rg.classList.contains('hidden')){rg.classList.add('hidden');$('#ringlbl').textContent=''}
}
function compassWord(dx,dz){const deg=((180-Math.atan2(dx,dz)*180/Math.PI)%360+360)%360;return['north','north-east','east','south-east','south','south-west','west','north-west'][Math.round(deg/45)%8]}
