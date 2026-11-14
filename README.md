# Mars: Last Colony

A survival, exploration and colony-building game on a NASA-science-inspired Mars. It runs in the browser as a static site with no build step: `index.html` plus the scripts in `js/`. Three.js and PeerJS load from the unpkg CDN.

## Play locally
Serve the folder (opening `index.html` directly won't load the scripts):

```bash
python -m http.server 8123
```

Then go to http://localhost:8123. Add `?dev` to the URL to bypass the browser cache while editing.

## Deploy for free (Vercel)
The folder is already linked to the Vercel project `mars-game` (see `.vercel/`).

- **CLI:** run `npx vercel --prod` in this folder.
- **Auto-deploy:** push the folder to GitHub, then import the repo on vercel.com (Framework preset **Other**, no build command, output directory `.`). Every push then redeploys.

Netlify or GitHub Pages also work: it's a plain static folder.

When you change the scripts, bump `V` in `index.html` so returning players get the new files.

## Controls
WASD: walk/drive · Shift: sprint · Space: jump (hold in the air with a Thruster Pack) · walk into cliffs, modules, wrecks, ruins or boulders to climb (uses stamina) · right-drag or arrow keys: look around · Alt+scroll or +/−: zoom
1–9, scroll or click the hotbar: pick an item · hold left mouse: use it (drill, Pulse Blaster, Arc Prod) · Q: drop one · I: inventory · F: interact, talk, feed animals, scan, open · E: get in or out of the rover (any time; bail out at speed and you tumble and take damage) · C: cruise · rover in the air: W/S flip, A/D spin, Shift+A/D barrel roll
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

## External services
- **unpkg.com:** serves Three.js r160 and PeerJS 1.5.4.
- **PeerJS public signalling server (0.peerjs.com):** used only to connect co-op players. Game data then flows peer-to-peer over WebRTC. Some strict corporate or school networks block WebRTC, and co-op won't connect there.
