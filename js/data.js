'use strict';

/* =========================================================
   GAME DATA
   ========================================================= */
const POI={
  sediment:{name:'Layered Sedimentary Outcrop',color:'#5fe3c9',rp:14,sample:true,
    scan:'Thin, flat-lying layers of mudstone and sandstone. Layered rocks like these at Jezero’s delta and Gale’s Mount Sharp were laid down by water in lakes more than 3 billion years ago.',
    lab:'Grain-size analysis shows alternating fine mud and coarser sand, a record of changing water flow into a long-lived lake.'},
  clay:{name:'Hydrated Clay Deposit',color:'#9fe37f',rp:18,sample:true,
    scan:'Spectra show hydrated clay minerals. Clays form when rock reacts with liquid water for a long time; MRO’s CRISM spectrometer mapped them across Mars’s oldest terrain.',
    lab:'X-ray diffraction confirms smectite clays, which form in roughly neutral water. Those are conditions scientists consider favourable for life as we know it.'},
  basalt:{name:'Basalt Boulders',color:'#c9b8ff',rp:9,sample:true,
    scan:'Dark volcanic rock rich in pyroxene and olivine, the most common rock type on Mars. Its iron minerals oxidise into the fine red dust that colours the planet.',
    lab:'Olivine-rich basalt with little alteration: it cooled from lava and was barely touched by water afterwards.'},
  ice:{name:'Subsurface Ice Signature',color:'#8fd8ff',rp:10,sample:true,
    scan:'Ground-penetrating sensors detect water ice less than a metre down. MRO’s SHARAD radar and fresh impact craters revealed buried ice like this at Mars’s mid-latitudes. Ice extraction research is now possible.',
    lab:'The melted core is mostly water with dissolved salts and fine dust. It has to be filtered and purified before the crew can drink it.'},
  salt:{name:'Perchlorate Salt Crust',color:'#fff2b0',rp:12,sample:true,
    scan:'A bright crust that includes perchlorate salts, first detected by the Phoenix lander in 2008. Perchlorates lower water’s freezing point but are toxic, which is another reason all water must be purified.',
    lab:'Chloride and perchlorate salts confirmed: evidence that briny water evaporated here in the distant past.'},
  ejecta:{name:'Impact Ejecta Blocks',color:'#ffb27f',rp:11,sample:true,
    scan:'Angular blocks thrown out by an impact. Ejecta brings up rock from deep underground, a free drill core for geologists.',
    lab:'Shocked minerals and melt glass record the impact’s energy. The excavated rock is older than the plains around it.'},
  sand:{name:'Dark Basaltic Dune Sand',color:'#d9a07a',rp:8,sample:true,
    scan:'Dark basaltic sand shaped into ripples by the thin wind. Curiosity studied the active Bagnold Dunes, which creep forward by up to about a metre per Earth year.',
    lab:'Well-sorted olivine sand: the wind has been sorting these grains for millions of years.'},
  lavatube:{name:'Lava Tube Skylight',color:'#ff7a7a',rp:30,sample:false,
    scan:'A collapsed pit opening into an underground lava tube, like the skylights photographed on Arsia Mons. You lower a scout robot with lights and lidar…'},
  organics:{name:'Organic-bearing Mudstone',color:'#ffd36f',rp:28,sample:true,
    scan:'Fine grey mudstone. The abrasion tool exposes fresh rock and the spectrometer flags possible organic carbon. The sample is sealed immediately to avoid contamination.'},
};
const BUILD={
  solar:{name:'Solar Array',cost:8,r:2.6,power:0,desc:'2.5 kW at noon. Tracks the Sun. Dust lowers output, so clean it with [F].'},
  battery:{name:'Battery Bank',cost:12,r:1.8,power:0,desc:'Stores 30 kWh to get through the night.'},
  moxie:{name:'Oxygen Unit',cost:20,r:2.4,power:1.5,prio:9,desc:'A scaled-up MOXIE that splits atmospheric CO₂ into O₂. +6 kg O₂/sol.'},
  drill:{name:'Ice Drill',cost:26,r:2.6,power:2,prio:8,res:'icedrill',needsIce:true,remote:true,desc:'Mines and melts subsurface ice. +39 L water/sol. Must sit on ice-rich ground; links to the grid by buried cable.'},
  greenhouse:{name:'Greenhouse',cost:30,r:4.4,power:1.5,prio:6,res:'greenhouse',desc:'LED hydroponics. +5 kg food/sol, uses 7 L water/sol.'},
  lab:{name:'Science Lab',cost:28,r:3.6,power:1,prio:4,desc:'Analyses rock samples to earn research points.'},
  regolith:{name:'Regolith Processor',cost:16,r:2.6,power:1.5,prio:3,desc:'Sinters regolith into construction material. +54 materials/sol.'},
  comms:{name:'Comms Antenna',cost:12,r:1.6,power:0.3,prio:7,desc:'Links you to Earth and orbiters. Supply landers need it.'},
  charger:{name:'Rover Charger',cost:10,r:2.2,power:0,solid:false,desc:'Fast-charges the rover from the grid.'},
  weather:{name:'Weather Station',cost:10,r:1,power:0,remote:true,desc:'Self-powered. Warns of dust storms. Can be placed anywhere.'},
  reactor:{name:'Fission Power Unit',cost:60,r:2.6,power:0,res:'reactor',desc:'Kilopower-class reactor: 10 kW day and night. Keep it 30 m from habitats.'},
  pad:{name:'Landing Pad',cost:40,r:9,power:0,res:'landingpad',solid:false,maxSlope:2,desc:'Larger supply deliveries and crew landers.'},
  habitat:{name:'Habitat',cost:60,r:6.6,power:1.5,prio:10,res:'hab2',desc:'Pressurised living module with room for 2 more crew.'},
  bed:{name:'Camp Bed',cost:2,r:1.2,power:0,remote:true,solid:false,desc:'A folding cot with a thermal blanket. Sleep through the night anywhere, alone or with your crew (F). Several crewmates can share one.'},
  beacon:{name:'Beacon',cost:1,r:0.6,power:0,remote:true,solid:false,desc:'Navigation marker that shows on the compass and map.'},
  fabricator:{name:'Fabricator',cost:30,r:3,power:1.5,prio:5,desc:'Advanced crafting: titanium plates, better tools, weapons and suit upgrades.'},
  seismo:{name:'Seismometer',cost:20,r:1.4,power:0.2,prio:7,desc:'Detects marsquake P-waves seconds before the shaking arrives, like NASA’s InSight.'},
};
const BUILD_ORDER=['solar','battery','moxie','drill','greenhouse','lab','fabricator','regolith','comms','charger','weather','seismo','reactor','pad','habitat','bed','beacon'];
const RESEARCH=[
  {id:'icedrill',name:'Ice Extraction',branch:'Water',cost:10,req:()=>S.flags.iceFound,reqText:'Scan an ice signature first',desc:'Unlocks the Ice Drill.'},
  {id:'greenhouse',name:'Controlled Agriculture',branch:'Agriculture',cost:15,desc:'Unlocks the Greenhouse.'},
  {id:'dustcoat',name:'Electrostatic Dust Shield',branch:'Energy',cost:18,desc:'Solar panels collect 60% less dust.'},
  {id:'batteries',name:'Solid-state Batteries',branch:'Energy',cost:20,desc:'+60% battery capacity.'},
  {id:'rovercell',name:'Extended Rover Pack',branch:'Robotics',cost:15,desc:'+75% rover battery, sample cache of 6.'},
  {id:'roverspeed',name:'Rover Drive Upgrade',branch:'Robotics',cost:20,desc:'+30% top speed, less drag in sand.'},
  {id:'scanner',name:'Orbital Data Uplink',branch:'Geology',cost:15,req:()=>count('comms')>0,reqText:'Build a Comms Antenna',desc:'Points of interest detected from twice as far; 40% faster scans.'},
  {id:'moxie2',name:'Improved Electrolysis',branch:'Life Support',cost:25,desc:'Oxygen Units produce 80% more O₂.'},
  {id:'recycling',name:'Water Recovery System',branch:'Water',cost:22,desc:'ISS-style recycling halves crew water use.'},
  {id:'landingpad',name:'Landing Pad',branch:'Construction',cost:20,desc:'Unlocks the Landing Pad.'},
  {id:'hab2',name:'Expanded Habitats',branch:'Construction',cost:30,req:()=>(S.flags&&S.flags.mdone3)||S.chapter>=4||S.mode==='sandbox',reqText:'Complete the Secrets Beneath the Surface mission',desc:'Build more Habitats (+2 crew each).'},
  {id:'reactor',name:'Fission Surface Power',branch:'Energy',cost:40,req:()=>S.research.has('batteries'),reqText:'Needs Solid-state Batteries',desc:'Unlocks the Fission Power Unit.'},
];
const CREW0=[
  {name:'Cmdr. Rosa Alvarez',role:'Engineer',bonus:'Faults 30% rarer, faster construction'},
  {name:'Dr. Kenji Mori',role:'Geologist',bonus:'+25% research from samples'},
  {name:'Dr. Amara Okafor',role:'Botanist',bonus:'+15% greenhouse yield'},
  {name:'Dr. Lukas Brandt',role:'Medical Specialist',bonus:'Monitors radiation and crew health'}];
const CREW_NEW=[
  {name:'Priya Nair',role:'Robotics Specialist',bonus:'Rover uses 20% less energy'},
  {name:'Dr. Tomás Silva',role:'Planetary Scientist',bonus:'+15% research from scans'}];
const hasRole=r=>S.crewList.some(c=>c.role===r);
const analyzedType=t=>S.analyzed.filter(a=>a.type===t).length;
const CHAPTERS=[
  {title:'Touchdown',intro:'Your lander is down. Before you can take the rover out, set up the colony: check the habitat, bring power online and start making oxygen.',reward:{mat:30,rp:15},objs:[
    {id:'hab',text:'Run a systems check at the habitat airlock [F]',check:()=>S.flags.habCheck},
    {id:'solar',text:'Deploy power: build 2 more Solar Arrays [B]',check:()=>count('solar')>=5},
    {id:'moxie',text:'Make oxygen: build an Oxygen Unit (MOXIE) [B]',check:()=>count('moxie')>=1}]},
  {title:'First Survival',intro:'The rover is yours. The stored supplies won’t last: call home, find water and start growing food.',reward:{mat:40,rp:10},objs:[
    {id:'comms',text:'Establish communications: build a Comms Antenna',check:()=>count('comms')>=1},
    {id:'ice',text:'Find subsurface ice: scan an ice signature',check:()=>S.flags.iceFound},
    {id:'drill',text:'Research Ice Extraction, then build an Ice Drill',check:()=>count('drill')>=1},
    {id:'gh',text:'Research Agriculture, then build a Greenhouse',check:()=>count('greenhouse')>=1},
    {id:'pos',text:'Get oxygen and water production into surplus',check:()=>S.rates.o2>0&&S.rates.water>0}]},
  {title:'Beyond the Horizon',intro:'Time to do science. Build a lab, collect samples and set up remote instruments.',reward:{mat:50,rp:20},objs:[
    {id:'lab',text:'Build a Science Lab',check:()=>count('lab')>=1},
    {id:'samples',text:'Collect and analyse 3 rock samples',check:()=>S.analyzed.length>=3},
    {id:'wx',text:'Install a Weather Station 300 m+ from the habitat',check:()=>blds.some(b=>b.type==='weather'&&b.progress>=1&&Math.hypot(b.x,b.z)>300)},
    {id:'drive',text:'Drive 3 km in the rover',check:()=>S.stats.roverDist>=3000}]},
  {title:'Secrets Beneath the Surface',intro:'Lava tubes and ancient mud may hold answers. Investigate, and stay sceptical.',reward:{mat:60,rp:20},objs:[
    {id:'tube',text:'Investigate a lava tube skylight',check:()=>(S.scannedTypes.lavatube||0)>0},
    {id:'org1',text:'Analyse an organic-bearing mudstone sample',check:()=>analyzedType('organics')>=1},
    {id:'org2',text:'Repeat the measurement at a second site',check:()=>new Set(S.analyzed.filter(a=>a.type==='organics').map(a=>a.id)).size>=2}]},
  {title:'A Growing World',intro:'Earth is sending more specialists. Get ready to receive them.',reward:{mat:60,rp:25},objs:[
    {id:'pad',text:'Research and build a Landing Pad',check:()=>count('pad')>=1},
    {id:'hab2',text:'Research Expanded Habitats and build a 2nd Habitat',check:()=>count('habitat')>=2},
    {id:'crew',text:'Welcome the new specialists (crew lander)',check:()=>S.crew>=6},
    {id:'gh2',text:'Feed the crew: run 2 Greenhouses',check:()=>count('greenhouse')>=2}]},
  {title:'Humanity’s New Home',intro:'Make the colony self-sufficient and secure its future.',reward:{mat:100,rp:30},objs:[
    {id:'r8',text:'Complete 8 research projects',check:()=>S.research.size>=8},
    {id:'reactor',text:'Build a Fission Power Unit',check:()=>count('reactor')>=1},
    {id:'sustain',text:'Stay in surplus on O₂, water and food for a full sol',check:()=>S.flags.sustained}]},
];
const FAULTS={
  habitat:[{kind:'leak',res:'o2',rate:0.22,label:'Seal leak'}],
  drill:[{kind:'leak',res:'water',rate:1.4,label:'Water line leak'},{kind:'jam',label:'Drill bit jammed'}],
  greenhouse:[{kind:'leak',res:'water',rate:1.0,label:'Irrigation leak'},{kind:'jam',label:'Grow-light failure'}],
  moxie:[{kind:'jam',label:'Electrolyser fault'}],solar:[{kind:'jam',label:'Tracker motor stuck'}],
  regolith:[{kind:'jam',label:'Conveyor jammed'}],comms:[{kind:'jam',label:'Antenna misaligned'}],battery:[{kind:'jam',label:'Cell imbalance'}]};

/* ---------- real NASA statistics & observations, woven into play (loading screens, radio, logbook) ---------- */
// tag = the moment it fits: general, dust, night, cold, cave, ice, quake, rover, oxygen, radiation, sky, moon, water, life, flight
const NASA_FACTS=[
  ['general','A Martian solar day, a “sol”, lasts 24 hours 39 minutes. A Mars year is 687 Earth days.'],
  ['general','Gravity on Mars is 3.71 m/s², about 38% of Earth’s. That’s why your jumps float.'],
  ['general','Average surface pressure is only about 610 pascals, less than 1% of Earth’s at sea level. Without a pressure suit, the fluids in your body would boil.'],
  ['general','The air is about 95% carbon dioxide, with about 2.6% nitrogen and 1.9% argon (measured by Curiosity’s SAM instrument).'],
  ['general','Sunlight on Mars is only about 43% as strong as on Earth, so solar panels make less than half the power.'],
  ['general','Radio signals take between about 3 and 22 minutes to cross between Earth and Mars, so the colony can’t get live help from home.'],
  ['general','Olympus Mons is about 22 km tall, roughly two and a half times the height of Mount Everest above sea level.'],
  ['general','Valles Marineris is a canyon system more than 4,000 km long and up to 7 km deep.'],
  ['general','Mount Sharp (Aeolis Mons) in Gale Crater rises about 5 km, and Curiosity has been climbing its layered rocks since 2014.'],
  ['general','Jezero Crater held a lake about 3.5 billion years ago. Perseverance landed there on 18 February 2021.'],
  ['general','Perseverance is collecting rock cores in sealed tubes so they can one day be returned to Earth.'],
  ['rover','Opportunity was designed for 90 sols but drove 45.16 km over almost 15 years, a marathon on Mars.'],
  ['rover','Curiosity is about the size of a small car and weighs roughly 900 kg. It is powered by a radioisotope generator, not solar panels.'],
  ['dust','A planet-wide dust storm in 2018 blocked out the Sun and ended Opportunity’s mission.'],
  ['dust','Dust devils sometimes cleaned the solar panels of the Spirit and Opportunity rovers, boosting their power.'],
  ['sky','Mars’s daytime sky looks butterscotch because of fine dust. At sunset, the same dust makes the sky around the Sun glow blue (Curiosity photographed this in 2015).'],
  ['sky','Curiosity and Perseverance have photographed thin, wispy water-ice clouds drifting high above Mars.'],
  ['cold','Rover weather stations show huge daily swings, from about −90 °C at night to around 0 °C or warmer on summer afternoons near the equator.'],
  ['night','Mars has two small moons. Phobos circles Mars about three times a day, so it rises in the west and sets in the east.'],
  ['moon','Phobos is slowly spiralling inward and will eventually break apart or crash into Mars, in tens of millions of years.'],
  ['ice','The Phoenix lander (2008) scraped away soil and watched bright water ice beneath it sublimate away within days.'],
  ['ice','Radar on the Mars Reconnaissance Orbiter (SHARAD) has mapped thick sheets of buried water ice at mid-latitudes.'],
  ['water','Phoenix also found perchlorate salts in the soil. They are toxic to people, so Martian water and soil must be treated before use.'],
  ['oxygen','Perseverance’s MOXIE experiment made oxygen from Martian CO₂: about 122 grams in total, at up to 12 grams per hour.'],
  ['flight','The Ingenuity helicopter made the first powered flight on another planet on 19 April 2021, and went on to fly 72 times.'],
  ['radiation','Curiosity’s RAD instrument found that a round trip to Mars plus about 500 days on the surface would add up to roughly 1 sievert of radiation.'],
  ['quake','NASA’s InSight lander recorded over 1,300 marsquakes. The largest, in May 2022, was about magnitude 4.7.'],
  ['cave','Orbiters have spotted dark “skylight” pits on the volcano Arsia Mons, likely openings into lava tubes that could shelter future explorers.'],
  ['cave','Lava tubes could shield people from radiation, temperature swings and micrometeorites, which is why NASA studies them as possible habitats.'],
  ['life','Curiosity found organic molecules preserved in 3-billion-year-old mudstone in Gale Crater (2018). That’s not proof of life, but the ingredients were there.'],
  ['life','Curiosity has measured methane in Gale Crater rising and falling with the seasons. Its source is still a mystery.'],
  ['general','Mars Odyssey has orbited Mars since 2001, making it the longest-working spacecraft at another planet.'],
  ['general','Perseverance’s microphones showed that sound travels slower on Mars, about 240 m/s, and fades quickly in the thin air.'],
  ['general','The HiRISE camera on the Mars Reconnaissance Orbiter can see objects about the size of a kitchen table from orbit.'],
];
