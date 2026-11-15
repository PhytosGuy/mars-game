# Mars: Last Colony

A survival, exploration and colony-building game on a NASA-science-inspired Mars. It runs in the browser as a static site with no build step: `index.html` plus the scripts in `js/`. Three.js and PeerJS load from the unpkg CDN.

## NASA Space Apps Challenge 2026: Team NAA
Mars: Last Colony is Team NAA's entry for the NASA Space Apps Challenge 2026. It teaches players three stages of a real Mars mission through gameplay and real NASA data:

1. **Mission Design Lab:** plan a NASA mission by choosing the objective, destination, instruments, power, spacecraft, rocket and trajectory.
2. **Landing:** fly entry, descent and landing at one of five sites, each modelled on a real Martian landscape.
3. **Sustain:** keep the colony alive with oxygen, water ice, power, food and repairs, while choices shape the colony's future.

Every number in the game is linked to its source on the sources page. The game, visuals and sounds were vibe-coded with Claude Code.

Our Space Apps project page: https://www.spaceappschallenge.org/2026/find-a-team/naa/?tab=project

For the game, visit: https://mars-last-colony.vercel.app  
For project demo/ quick review, visit: https://mars-last-colony.vercel.app/NAA/                                   
For more detail, visit: https://mars-last-colony.vercel.app/NAA/spaceapps/  
For code, visit github: https://github.com/PhytosGuy/mars-game (you are here)                                       
For sources, visit: https://mars-last-colony.vercel.app/NAA/sources  

## Play locally
Serve the folder (opening `index.html` directly won't load the scripts):

```bash
python -m http.server 8123
```

Then go to http://localhost:8123. Add `?dev` to the URL to bypass the browser cache while editing.

## Deploy for free (Vercel)
Live at https://mars-last-colony.vercel.app (the older https://mars-game-nu.vercel.app still works). The Vercel project `mars-game` is connected to this GitHub repo (PhytosGuy/mars-game).

The NASA Space Apps promo website is in `NAA/` and is live at https://mars-last-colony.vercel.app/NAA, with the detailed challenge page at `/NAA/spaceapps/`. The NASA Mission Design Lab is its own page in `missionlab/` (https://mars-last-colony.vercel.app/missionlab/): every choice is shown in 3D, launched missions are saved in the browser, and the game gives the colony research points for each one.

- **Auto-deploy:** every push to `main` redeploys the live site automatically. Pushes to other branches get their own preview link.
- **CLI (optional):** `npx vercel --prod` in this folder deploys straight from your computer.

Netlify or GitHub Pages also work: it's a plain static folder.

When you change the scripts, bump `V` in `index.html` so returning players get the new files.

## Controls
WASD: walk/drive · Shift: sprint · Space: jump (hold in the air with a Thruster Pack) · walk into cliffs, modules, wrecks, ruins or boulders to climb (uses stamina) · right-drag or arrow keys: look around · Alt+scroll or +/−: zoom
1–9, scroll or click the hotbar: pick an item · hold left mouse: use it (drill, Pulse Blaster, Arc Prod) · Q: drop one · I: inventory · F: interact, talk, feed animals, scan, open · E: get in or out of the rover (any time; bail out at speed and you tumble and take damage) · C: cruise · rover in the air: W/S flip, A/D spin, Shift+A/D barrel roll
Caps Lock: shift lock (the mouse looks around and you aim at the centre crosshair) · thrown by a dust devil or a fast bail-out: steer with WASD, hold Space to brace
Tab: open the menu on Inventory, Tab again for the next page (Shift+Tab goes back) · the ⋯ button at the end of the hotbar also opens it · B: build · X: recycle · R: rotate · M: map · Enter: radio chat · G: ping a spot · V: quick comms and wave · J: objectives · K: status · H: hide HUD · N: music · Esc: pause

## What's in the game
- **Two modes:** Survival (oxygen, water and food run out and the colony can be lost) and Sandbox (unlimited materials, everything unlocked).
- **Missions:** six missions you can do in any order. Pick one to track from the Missions page; its next step shows on the compass, the guide arrow and the top-right journal. With nothing tracked there's no arrow, so you can just explore.
- **Tab menu:** pages for Inventory (with a player card on top: integrity, oxygen, battery, stamina, held item, boosts, suit upgrades and alien standing), Missions, Colony, Research, Crew, Stats, Logbook and Mars data.
- **Pulse Blaster:** everyone starts with one in slot 2. It has unlimited shots and a 0.6 s cooldown, shown on the reticle. Shots are checked by the host in co-op, and other players see them.
- **Look:** cel-shaded lighting with soft rim light, and an original UI theme: dark slate panels, thin cream frames, cyan highlights and serif titles.
- **Tool mining:** deposits of hematite, silica, titanium, ice, crystal and resonite. Drills come in tiers, so harder ores need better drills. Drilling drains suit battery, wears tool durability, takes time, and the chunks fly into your pack. Boulders give basalt and digging the ground gives regolith.
- **Inventory:** 36 slots with a 9-slot hotbar, stacks, drag-and-drop, split (right-click), shift-click quick move, durability bars, tooltips and pickup feedback. Colony storage is reachable at base. You can craft in your suit, at the habitat and at the Fabricator.
- **Open world:**
  - crash sites, abandoned stations, ancient ruins with pylon shrines, alien villages and climbable spires
  - named regions and discovery banners
  - map fog of war
  - datapads and lore
  - loot caches
- **Mountains and caves:** every site now has ridged mountain ranges up to about 170 m. Sinkholes are common, and they lead down into generated lava tubes with real collision, chambers, branches, deposits, alien habitats, unstable ceilings and a major discovery in each. It gets darker the deeper you go: your headlamp comes on automatically, and you can throw flares or place lamps.
- **Aliens:**
  - **Peaceful:** the Tharrak and Lumari, who talk in glyphs and gestures. You learn their words over time, and they have their own gift preferences, trades, requests and reputation.
  - **Hostile:** skitter swarms, dune wyrms and night stalkers, which react to noise, light and wounds.
  - **Wildlife:** rockback herds, Pebblehopper colonies (small) and Loomstrider herds (large). Feed them regolith or ice with F and they leave a boost behind.
  - **More hostiles:** Rustmite swarms (small) and the Ravager (large), which winds up and charges. Driving them off drops boosts.
- **Boosts:** Springmoss (high jumps and safe landings), Strider Nectar (40% faster and some oxygen), Mite Adrenal (unlimited stamina) and Ironhide Salve (half damage). Active boosts show above your vitals with a countdown.
- **Rover physics:** in the air the rover keeps its momentum and spins freely, so full flips and barrel rolls are possible. Wheels-down landings count your flips; roof or side landings crash, bounce, hurt the driver, and the rover rights itself after a moment.
- **Solid world:** boulders, modules, wrecks, stations, ruins, huts, creatures and other players all have collision. You can climb onto anything solid and stand on it, and the camera pulls in instead of clipping through walls and hills.
- **Disasters:**
  - dust storms that build up in phases, reduce visibility, push you around, wear your suit and coat solar panels (stow them, or shelter)
  - meteors that leave craters and expose new ore
  - quakes that open fissures and cause rockfalls
  - solar storms and cold snaps
  - forecasts from a Weather Station and quake warnings from a Seismometer
- **Colony:** a story campaign or a sandbox, research, construction drones, city growth and the wardrobe (coat-hanger button at base).
- **Chat:** press Enter or the Chat button for radio chat with your crew and co-op players. Messages appear as speech bubbles over whoever said them, with a history while typing.
- **Co-op (up to 4 players):** press Esc, then **Invite friends**, and share the 5-letter code; friends use **Join a friend** on the title screen. The host is authoritative: every mine, build, craft, trade and pickup is validated on the host, and each guest's inventory lives in the host's save. World events, discoveries and creatures sync to everyone, and dropped connections reconnect automatically.
- **Saves:** autosaved to browser storage, with a backup slot and automatic conversion of old saves.
- **Accounts and friends:** the person icon (top right of the home screen) opens your profile: change your name and look, or sign up and sign in with email. The friends icon (bottom left) lets signed-in players search for friends by username, accept requests and see who's online. Expeditions → **Join a friend** lists friends who are playing, and joins them in one click.
- **Minimap:** top left, turning with you, with your stats underneath.
- **Habitat interior:** press F at the habitat door to go inside a round, futuristic dome with glowing ribs, panoramic windows and a holo-table showing Mars. There's a sleep pod (sleep through the night) and a desk with a journal that opens full screen when you walk up to it. You can write anything in it; it's saved with the world and is also on the Journal page of the Tab menu.
- **Safe base:** hostile creatures, dust devils and meteor impacts stay away from your habitats.
- **Onboarding:** a guided tour of the screen and controls the first time you land. Skip (bottom right) ends it, and Settings → Replay the tour shows it again.
- **Touch controls:** a rounded block-style joystick and buttons, sized and spaced for phones.

## New in 4.7
- **Landing sites that look like their names:** the Ice-rich Plains is a flat ice sheet with blue ice-crystal mountains; the Crater Basin puts your base on the floor of a big meteorite crater; the Volcanic Highlands are a small plain ringed by four large volcanoes under a red sky; the Rocky Plains are ringed by pointed mountains; the Jezero-type Delta is unchanged. Each site in the expedition picker shows a picture of where your base will be.
- **Ice biome:** every site has a frozen plain with climbable mountains of blue ice crystal, and the water mission (“scan an ice signature”) sends you there.
- **Mission Lab:** its own page (`missionlab/`) with a 3D model for every choice, your spacecraft assembled live and launched in 3D, the solar system and flight path on the trajectory step, and every launched mission saved under My missions. Each saved mission gives your colony research points once.
- **Custom graphics:** Settings → Graphics → Custom switches shaders (post-processing), glow, colour grading and vignette, shadows, sharp shadows and cel shading on or off, and sets the resolution.
- **Phones:** hints name the on-screen buttons (“Tap Interact”) instead of keyboard keys, and messages, NASA facts and story cards use smaller text.
- **Loading:** until the game has loaded, buttons are held back and a “Wait for the game to load” message appears.

## New in 4.2
- **Landing:** starts in orbit above Mars, then you ride down in a detailed cockpit with a big window and two live screens: a LIDAR terrain scan and a chase camera with flight statistics. After touchdown you turn round, the hatch opens and you walk down the lander's own stairs (the same lander that stays at your base). Space skips every sequence.
- **Pip, your robot companion:** fetches nearby items, helps you drill (35% faster), lights the way and warns you about danger.
- **Deep caves:** depth zones as you descend, and caves deeper than 30 m hide a glowing crystal vault with rare rewards.
- **Survival needs:** food and water meters (eat at the habitat galley, or carry Ration Packs and Water Pouches). Expand your habitat twice: a bigger dome with a grow bay, spare bunks, a water recycler and a workbench.
- **Lasting disasters:** storms bury remote equipment (dig it out with F) and uncover new ore; quakes can seal cave entrances with rubble. Storms now roll in as a visible wall of dust; dust devils are gentler and dust-orange.
- **Aliens remember you:** reputation tiers (Hostile to Kin), memories of gifts, harm and past meetings, translations once you know half their words, and consequences: allies give gifts, cheaper trades, storm warnings and protection; hostile species throw stones.
- **Discoveries become technology:** scanning and analysing on Mars unlocks practical upgrades (better crops, water, materials, dust shields, armour, radiation shielding, batteries, faster drills, faster language learning).
- **Mission Lab science:** launch windows from JPL planetary elements; Hohmann transfer time, phase angle, Δv and C3 calculated from Kepler's laws; ✓ marks calculated or NASA values, ≈ marks game estimates; sources listed.
- **Phones and slow devices:** smaller, contextual touch buttons, and Auto/High/Medium/Low graphics with automatic resolution and shadow scaling.
- **Supabase:** run `supabase-security-fix.sql` to lock friendship records (only the recipient can accept, and nobody can change who sent or received a request).

## New in 4.0
- **Landing sequence:** your first landing is flown from the lander’s window. Entry, parachute and heat-shield release are automatic (like a real Mars landing); you fly the powered descent with a throttle lever (drag it, or W/S / arrow keys). Touch down under 3 m/s.
- **Airlock:** entering or leaving the habitat runs a short airlock cycle (pressure gauge, dust shower, suit on/off). Inside you wear your everyday clothes.
- **Character creator:** Bitmoji-style choices for skin, eyes, brows, nose, mouth, hair, facial hair, headwear, glasses, build, height, clothes and spacesuit, with a live 3D preview. Your suited portrait is your profile picture.
- **Habitat:** a wardrobe (walk up to it), a holo-map table, a room panel to recolour the floor and lights, and a shared sleep pod.
- **Mars movement:** low-traction walking, long forward leaps and a bounding run.
- **Death:** your body stays where you fell with everything you carried; a red “Your body” marker shows on the compass and map, and the rover is driven back to base.
- **Co-op:** steadier joining (retries and relay servers), newcomers start at the base with the tour, everyone in bed at night skips to morning, buildable Camp Beds, crewmates’ health and profile pictures on the HUD and maps, a big join code in Esc → Friends, and invites that pop up at the top right.
- **Colony setup first:** the rover and the land beyond 130 m unlock after the first mission (solar arrays and an Oxygen Unit).
- **Settings:** field of view and dynamic FOV. **Esc menu:** Resume, Settings, Friends, Save, Save & quit (keys 1–5). **F** toggles your flashlight when nothing is nearby.
- **NASA Mission Design Lab** (home screen, or Tab → Mission Lab): design a mission from idea to launch using NASA’s process (mission segments, Concept Maturity Levels, Mission Design Lab stages, Webb-style instrument choices, CubeSats, real Earth–Mars launch windows, a 3D trajectory and timeline with a VR view, verification, results compared with real missions, and CSA contributions).

## Accounts setup (Supabase)
Accounts are optional: without them the game works as before, with a local name and look. To switch them on, create a free Supabase project, run the SQL for the `profiles`, `friendships` and `presence` tables (all with Row Level Security), and put the project URL and the public anon/publishable key in `js/config.js`. Never put the service_role / secret key in this repo. For world invites, also run `supabase-invites.sql`.

## External services
- **unpkg.com:** serves Three.js r160 and PeerJS 1.5.4.
- **Supabase (only when configured in `js/config.js`):** email sign-in, profiles, friend lists and online status. supabase-js 2.45.4 loads from cdn.jsdelivr.net.
- **PeerJS public signalling server (0.peerjs.com):** used only to connect co-op players. Game data then flows peer-to-peer over WebRTC. Some strict corporate or school networks block WebRTC, and co-op won't connect there.
