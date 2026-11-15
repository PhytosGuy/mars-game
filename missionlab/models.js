'use strict';
/* =========================================================
   Mission Lab 3D models: every choice in the lab has a model.
   - objectives (what you want to discover), destinations
   - spacecraft (CubeSats, orbiter, lander, rover, telescope) with your instruments mounted on them
   - instruments, power systems and telescope mirrors
   - launch vehicles, drawn to their real heights, with your spacecraft inside the fairing
   M3.thumb() renders a model to a picture for the option cards; M3.viewer() is the big live 3D view.
   ========================================================= */
const M3 = (() => {
  const T = THREE, TAU = Math.PI * 2;
  const std = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.1 }, o));
  const MAT = {
    white: std('#eef0f2', { roughness: 0.6 }), silver: std('#c3c9d1', { metalness: 0.75, roughness: 0.32 }), dark: std('#2a2e35', { roughness: 0.5, metalness: 0.3 }),
    gold: std('#d8a640', { metalness: 0.6, roughness: 0.35, emissive: '#4a3006', emissiveIntensity: 0.35 }),
    cell: std('#1b2c6b', { metalness: 0.4, roughness: 0.25, emissive: '#0a1640', emissiveIntensity: 0.35, side: T.DoubleSide }),
    orange: std('#ff8a3d', { roughness: 0.5 }), black: std('#1a1b1f', { roughness: 0.6 }), glass: std('#0c1220', { metalness: 0.9, roughness: 0.08 }),
    shield: std('#d9b7d6', { metalness: 0.7, roughness: 0.25, side: T.DoubleSide }), shield2: std('#b9a2c9', { metalness: 0.7, roughness: 0.3, side: T.DoubleSide }),
    mirror: std('#f0c25a', { metalness: 0.45, roughness: 0.28, emissive: '#8a5c10', emissiveIntensity: 0.55 }),
    foam: std('#d1874a', { roughness: 0.75 }), tan: std('#b98a5e', { roughness: 0.85 }), tan2: std('#9c6b45', { roughness: 0.9 }), tan3: std('#c9a27a', { roughness: 0.85 }),
    rtg: std('#4a4f57', { metalness: 0.6, roughness: 0.4, emissive: '#3a1204', emissiveIntensity: 0.25 }),
    fairing: std('#f4f5f7', { roughness: 0.5, transparent: true, opacity: 1 }),
    glowO: new T.MeshBasicMaterial({ color: '#ffcf8a' }), glowC: new T.MeshBasicMaterial({ color: '#7fe8ff' }), glowV: new T.MeshBasicMaterial({ color: '#a98bff' }),
    glowG: new T.MeshBasicMaterial({ color: '#8dffb0' }), sun: new T.MeshBasicMaterial({ color: '#ffd36b' }),
  };
  /* ---------- small building blocks ---------- */
  const at = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); return o };
  const box = (w, h, d, m, x, y, z) => at(new T.Mesh(new T.BoxGeometry(w, h, d), m), x, y, z);
  const cyl = (rt, rb, h, m, x, y, z, seg = 24) => at(new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), m), x, y, z);
  const sph = (r, m, x, y, z, ws = 32, hs = 20) => at(new T.Mesh(new T.SphereGeometry(r, ws, hs), m), x, y, z);
  const grp = (...a) => { const g = new T.Group(); a.forEach(o => o && g.add(o)); return g };
  const lathe = (pts, m, seg = 32) => new T.Mesh(new T.LatheGeometry(pts.map(([x, y]) => new T.Vector2(x, y)), seg), m);
  const rotX = (o, a) => { o.rotation.x = a; return o }, rotZ = (o, a) => { o.rotation.z = a; return o }, rotY = (o, a) => { o.rotation.y = a; return o };
  // parabolic dish, opening towards +y
  const dish = (r, depth, m) => { const p = []; for (let i = 0; i <= 12; i++) { const x = Math.max(0.001, i / 12 * r); p.push([x, depth * x * x / (r * r)]) } const d = lathe(p, m); d.material.side = T.DoubleSide; return d };
  // a solar panel lying in the x-z plane, with silver seams
  const solar = (w, d, t = 0.03) => { const g = grp(box(w, t, d, MAT.cell), box(w * 1.02, t * 0.5, d * 1.02, MAT.silver, 0, -t * 0.6, 0)); const n = Math.max(1, Math.round(w / (d * 0.5))); for (let i = 1; i < n; i++) g.add(box(t * 0.5, t * 1.1, d, MAT.silver, -w / 2 + i * w / n, 0, 0)); return g };
  // nose cone / fairing (ogive) of radius r and length L, base at y=0
  const ogive = (r, L, m) => { const p = []; for (let i = 0; i <= 16; i++) { const t = i / 16; p.push([Math.max(0.001, r * Math.pow(Math.cos(t * Math.PI / 2), 0.55)), t * L]) } return lathe(p, m) };
  const bell = (r, L, m) => lathe([[r * 0.35, 0], [r * 0.45, -L * 0.3], [r * 0.7, -L * 0.7], [r, -L]], m, 20);
  const helix = (r, h, turns, tube, m) => { const pts = []; for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * TAU; pts.push(new T.Vector3(Math.cos(a) * r, i / (turns * 24) * h, Math.sin(a) * r)) } return new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), turns * 24, tube, 6), m) };
  const hexGrid = (rings, r) => { const out = []; for (let q = -rings; q <= rings; q++)for (let s = -rings; s <= rings; s++) { const u = -q - s; if (Math.abs(u) > rings) continue; out.push([r * 1.5 * q, r * Math.sqrt(3) * (s + q / 2)]) } return out };

  /* ---------- planet textures, drawn once ---------- */
  const texCache = {};
  function planetTex(kind) {
    if (texCache[kind]) return texCache[kind];
    const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    let seed = kind === 'mars' ? 7 : 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    if (kind === 'mars') {
      x.fillStyle = '#c1582f'; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${90 + rnd() * 60 | 0},${30 + rnd() * 25 | 0},${15 + rnd() * 15 | 0},${0.15 + rnd() * 0.25})`; x.beginPath(); x.ellipse(rnd() * W, H * 0.2 + rnd() * H * 0.6, 6 + rnd() * 40, 3 + rnd() * 16, rnd() * 3, 0, TAU); x.fill() }
      for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(230,150,95,${0.1 + rnd() * 0.2})`; x.beginPath(); x.arc(rnd() * W, rnd() * H, 2 + rnd() * 14, 0, TAU); x.fill() }
      x.fillStyle = 'rgba(255,248,240,.9)'; x.fillRect(0, 0, W, 10); x.fillRect(0, H - 8, W, 8);
    } else {
      x.fillStyle = '#1d4f9c'; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { x.fillStyle = rnd() < 0.5 ? '#3f7a3a' : '#8a7a4a'; x.beginPath(); x.ellipse(rnd() * W, H * 0.15 + rnd() * H * 0.7, 10 + rnd() * 45, 6 + rnd() * 24, rnd() * 3, 0, TAU); x.fill() }
      x.fillStyle = '#f2f6fa'; x.fillRect(0, 0, W, 14); x.fillRect(0, H - 12, W, 12);
    }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; texCache[kind] = t; return t;
  }
  const cloudTex = () => { if (texCache.cloud) return texCache.cloud; const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`; x.beginPath(); x.ellipse(r() * W, r() * H, 8 + r() * 40, 3 + r() * 9, r() * 0.6 - 0.3, 0, TAU); x.fill() }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return texCache.cloud = t };
  const planet = (kind, r = 1) => { const g = grp(sph(r, new T.MeshStandardMaterial({ map: planetTex(kind), roughness: 0.95 }), 0, 0, 0, 48, 32));
    if (kind === 'earth') { g.add(sph(r * 1.02, new T.MeshStandardMaterial({ map: cloudTex(), transparent: true, depthWrite: false, roughness: 1 }), 0, 0, 0, 48, 32)); g.add(sph(r * 1.08, new T.MeshBasicMaterial({ color: '#6fb6ff', transparent: true, opacity: 0.12, side: T.BackSide }))) }
    else g.add(sph(r * 1.05, new T.MeshBasicMaterial({ color: '#ff9a62', transparent: true, opacity: 0.08, side: T.BackSide })));
    g.rotation.z = 0.35; return g };
  const dots = (pts, col, size) => { const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pts.flat(), 3)); return new T.Points(geo, new T.PointsMaterial({ color: col, size, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false })) };

  /* ---------- objectives and destinations ---------- */
  const OBJ = {
    water() { const g = planet('mars'); for (const [la, lo] of [[0.9, 0.4], [0.6, 1.4], [-0.3, 2.2], [0.3, -0.6]]) { const p = new T.Vector3().setFromSphericalCoords(1.005, Math.PI / 2 - la, lo); const s = sph(0.16, MAT.glowC, p.x, p.y, p.z, 16, 10); s.scale.set(1, 0.35, 1); s.lookAt(0, 0, 0); s.rotateX(Math.PI / 2); g.add(s) } return g },
    atmo() { const g = planet('mars'); g.add(sph(1.16, new T.MeshBasicMaterial({ color: '#ffb27a', transparent: true, opacity: 0.16, side: T.BackSide }))); const p = []; let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 260; i++) { const d = 1.15 + r() * 1.3, a = (r() - 0.5) * 1.2, b = (r() - 0.5) * 0.9; p.push([d * Math.cos(a) , d * Math.sin(b) * 0.7, d * Math.sin(a)]) } g.add(dots(p, '#ffd2a6', 0.035)); return g },
    life() { const g = grp(); const cols = [MAT.tan, MAT.tan2, MAT.tan3, MAT.tan, MAT.tan2]; for (let i = 0; i < 5; i++) { const c = cyl(0.95 - i * 0.12, 1 - i * 0.12, 0.22, cols[i], (i % 2) * 0.05, 0.11 + i * 0.22, 0, 7); c.rotation.y = i * 0.5; g.add(c) } g.add(sph(0.07, MAT.glowG, 0.32, 0.9, 0.42, 12, 8)); g.add(at(rotX(new T.Mesh(new T.TorusGeometry(0.16, 0.012, 8, 32), MAT.glowG), Math.PI / 2), 0.32, 0.9, 0.42)); return g },
    quakes() { const g = grp(); g.add(new T.Mesh(new T.SphereGeometry(1, 48, 32, 0, Math.PI * 1.5), new T.MeshStandardMaterial({ map: planetTex('mars'), roughness: 0.95, side: T.DoubleSide })));
      g.add(new T.Mesh(new T.SphereGeometry(0.82, 32, 20, 0, Math.PI * 1.5), std('#a04a22', { side: T.DoubleSide })));
      g.add(sph(0.5, std('#ffb347', { emissive: '#ff7a1a', emissiveIntensity: 0.9 })));
      for (let i = 0; i < 3; i++) g.add(rotX(new T.Mesh(new T.TorusGeometry(1.2 + i * 0.22, 0.008, 6, 64), new T.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0.6 - i * 0.17 })), Math.PI / 2 + 0.3));
      g.rotation.y = -0.6; return g },
    relay() { const g = planet('mars'); const orbit = rotX(new T.Mesh(new T.TorusGeometry(1.6, 0.006, 6, 96), new T.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0.6 })), Math.PI / 2 - 0.25); g.add(orbit);
      for (const a of [0.5, 3.4]) { const s = M.cubesat6(); s.g.scale.setScalar(0.7); s.g.position.set(Math.cos(a) * 1.6, Math.sin(a) * 0.4, Math.sin(a) * 1.6); g.add(s.g) } return g },
    galaxies() { const p = [], c = []; let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 1600; i++) { const arm = i % 2, t = r() * 3.2, a = t * 1.9 + arm * Math.PI + (r() - 0.5) * 0.5, d = 0.08 + t * 0.42; p.push([Math.cos(a) * d, (r() - 0.5) * 0.08, Math.sin(a) * d]) }
      const g = grp(dots(p, '#cfd8ff', 0.03), sph(0.12, MAT.glowO, 0, 0, 0, 16, 12)); const q = []; for (let i = 0; i < 400; i++)q.push([(r() - 0.5) * 6, (r() - 0.5) * 3, (r() - 0.5) * 6]); g.add(dots(q, '#ffffff', 0.02)); g.rotation.x = 0.5; return g },
    exo() { const g = grp(sph(0.75, MAT.sun), sph(0.95, new T.MeshBasicMaterial({ color: '#ffb84a', transparent: true, opacity: 0.18 })));
      const pl = grp(sph(0.28, std('#5d7fb8', { roughness: 0.8 })), sph(0.32, new T.MeshBasicMaterial({ color: '#9fd6ff', transparent: true, opacity: 0.25, side: T.BackSide }))); pl.position.set(1.5, 0.1, 0.8); g.add(pl);
      g.add(rotX(new T.Mesh(new T.TorusGeometry(1.72, 0.006, 6, 96), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 })), Math.PI / 2 - 0.15)); return g },
    climate() { const g = planet('earth'); const s = M.cubesat3(); s.g.scale.setScalar(1.6); s.g.position.set(1.15, 0.5, 0.75); g.add(s.g); g.add(rotX(new T.Mesh(new T.TorusGeometry(1.4, 0.006, 6, 96), new T.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0.55 })), Math.PI / 2 - 0.5)); return g },
  };
  const DEST = {
    mars: () => planet('mars'), leo: () => planet('earth'),
    L2() { const g = grp(sph(0.9, MAT.sun, -3.2, 0, 0), sph(1.15, new T.MeshBasicMaterial({ color: '#ffb84a', transparent: true, opacity: 0.15 }), -3.2, 0, 0));
      const e = planet('earth', 0.45); e.position.set(1.2, 0, 0); g.add(e); g.add(sph(0.06, MAT.glowC, 2.6, 0, 0, 12, 8));
      const l = box(1.4, 0.01, 0.01, new T.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, opacity: 0.5 }), 1.9, 0, 0); g.add(l); return g },
  };

  /* ---------- spacecraft: each returns {g, mounts:[[x,y,z,rx]], is (instrument scale)} ---------- */
  const M = {
    cubesat3() { const g = grp(), W = 0.1, H = 0.34;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.012, H + 0.01, 0.012, MAT.silver, sx * W / 2, 0, sz * W / 2));
      for (const [x, z, ry] of [[W / 2, 0, 0], [-W / 2, 0, 0], [0, W / 2, Math.PI / 2], [0, -W / 2, Math.PI / 2]]) g.add(rotY(box(0.004, H - 0.02, W - 0.016, MAT.cell, x, 0, z), ry));
      g.add(box(W - 0.004, 0.008, W - 0.004, MAT.dark, 0, H / 2, 0), box(W - 0.004, 0.008, W - 0.004, MAT.dark, 0, -H / 2, 0), box(0.003, 0.2, 0.003, MAT.silver, 0.035, H / 2 + 0.1, 0.035));
      return { g, mounts: [[0, H / 2 + 0.006, 0], [0.0, -H / 2 - 0.006, 0, Math.PI], [W / 2 + 0.006, 0.06, 0, 0]], is: 0.13 } },
    cubesat6() { const g = grp(), W = 0.22, D = 0.1, H = 0.34;
      g.add(box(W, H, D, MAT.silver)); g.add(box(W - 0.01, H - 0.02, 0.004, MAT.cell, 0, 0, D / 2 + 0.002));
      for (const s of [-1, 1]) { const w = rotX(solar(0.3, 0.3, 0.006), Math.PI / 2); w.position.set(s * (W / 2 + 0.17), 0, -D / 2 + 0.01); g.add(w, box(0.03, 0.01, 0.01, MAT.silver, s * (W / 2 + 0.015), 0, -D / 2)) }
      g.add(box(0.003, 0.22, 0.003, MAT.silver, 0.08, H / 2 + 0.11, 0));
      return { g, mounts: [[0, H / 2 + 0.006, 0], [-0.06, H / 2 + 0.006, 0], [0.06, H / 2 + 0.006, 0], [0, -H / 2 - 0.006, 0, Math.PI]], is: 0.16 } },
    orbiter(o) { const g = grp(box(2.2, 2, 2.2, MAT.gold), box(2.24, 0.06, 2.24, MAT.white, 0, 1.03, 0), box(2.24, 0.06, 2.24, MAT.white, 0, -1.03, 0));
      for (const s of [-1, 1]) { g.add(rotZ(cyl(0.05, 0.05, 1.2, MAT.silver, s * 1.7, 0, 0, 8), Math.PI / 2)); for (let i = 0; i < 2; i++) g.add(at(solar(2.4, 1.7, 0.05), s * (2.4 + i * 2.5), 0, 0)) }
      const d = dish(1.5, 0.45, MAT.white); d.rotation.x = -1.1; d.position.set(0, 2.15, -0.8); g.add(d, cyl(0.06, 0.06, 1.1, MAT.silver, 0, 1.55, -0.5, 8), cyl(0.04, 0.12, 0.25, MAT.dark, 0, 2.45, -0.15, 12));
      for (const [x, z] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) g.add(at(rotX(bell(0.12, 0.25, MAT.dark), 0), x, -1.06, z));
      return { g, mounts: [[0.55, 0.35, 1.1, Math.PI / 2], [-0.55, 0.35, 1.1, Math.PI / 2], [0.55, -0.45, 1.1, Math.PI / 2], [-0.55, -0.45, 1.1, Math.PI / 2], [0.6, 1.06, 0.6], [-0.6, 1.06, 0.6]], is: 1.15 } },
    lander(o) { const g = grp(cyl(1, 1, 0.32, MAT.white, 0, 1.0, 0, 6), cyl(1.02, 1.02, 0.12, MAT.gold, 0, 0.82, 0, 6));
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5, lx = Math.cos(a), lz = Math.sin(a); const leg = cyl(0.05, 0.05, 1.05, MAT.silver, lx * 1.0, 0.45, lz * 1.0, 8); leg.lookAt(lx * 1.5, -0.1, lz * 1.5); leg.rotateX(Math.PI / 2); g.add(leg, cyl(0.17, 0.2, 0.05, MAT.silver, lx * 1.28, 0.03, lz * 1.28, 16)) }
      if (o.power === 'rtg') g.add(rtgModel(0.55).g.translateX(0).translateY(1.45).translateZ(-0.55));
      else for (const s of [-1, 1]) { const p = new T.Mesh(new T.CircleGeometry(1.1, 10), MAT.cell); p.rotation.x = -Math.PI / 2 + 0.12 * s; p.position.set(s * 2.15, 1.15, 0); g.add(p, rotZ(cyl(0.03, 0.03, 0.4, MAT.silver, s * 1.1, 1.15, 0, 6), Math.PI / 2), rotX(at(new T.Mesh(new T.TorusGeometry(1.1, 0.025, 6, 10), MAT.silver), s * 2.15, 1.15, 0), Math.PI / 2 - 0.12 * s)) }
      g.add(box(0.06, 0.06, 1.0, MAT.silver, 0.55, 1.3, 0.75), box(0.25, 0.12, 0.14, MAT.white, 0.55, 1.3, 1.25));
      return { g, mounts: [[0.35, 1.16, 0.35], [-0.35, 1.16, 0.25], [0, 1.16, -0.4], [0.5, 1.16, -0.25], [-0.5, 1.16, -0.3], [-0.1, 1.16, 0.6]], is: 0.72 } },
    rover(o) { const g = grp(box(1.6, 0.5, 1.15, MAT.white, 0, 0.9, 0), box(1.64, 0.06, 1.19, MAT.dark, 0, 1.17, 0));
      for (const sx of [-1, 1]) { for (const z of [-0.72, 0, 0.72]) { const w = rotZ(cyl(0.26, 0.26, 0.22, MAT.silver, sx * 0.95, 0.27, z), Math.PI / 2); g.add(w, rotZ(cyl(0.27, 0.27, 0.12, MAT.dark, sx * 0.95, 0.27, z), Math.PI / 2), rotZ(cyl(0.08, 0.08, 0.24, MAT.dark, sx * 0.95, 0.27, z, 12), Math.PI / 2)) }
        g.add(rotX(box(0.06, 0.06, 1.2, MAT.silver, sx * 0.82, 0.62, 0.15), -0.25), rotX(box(0.06, 0.06, 0.9, MAT.silver, sx * 0.82, 0.55, -0.4), 0.3)) }
      g.add(cyl(0.045, 0.05, 1.05, MAT.white, -0.55, 1.7, 0.45, 12), box(0.42, 0.2, 0.22, MAT.white, -0.55, 2.28, 0.45));
      for (const s of [-1, 1]) g.add(rotX(cyl(0.05, 0.05, 0.05, MAT.glass, -0.55 + s * 0.1, 2.3, 0.57, 16), Math.PI / 2));
      g.add(rotX(box(0.06, 0.06, 0.7, MAT.silver, 0.45, 0.95, 0.9), 0.4), box(0.22, 0.22, 0.22, MAT.white, 0.45, 0.8, 1.25));
      if (o.power === 'solar') g.add(at(solar(1.8, 1.25, 0.03), 0, 1.24, -0.05));
      else { const r = rtgModel(0.6); r.g.rotation.x = 1.0; r.g.position.set(0, 1.0, -0.85); g.add(r.g) }
      return { g, mounts: [[0.35, 1.2, 0.25], [0.2, 1.2, -0.3], [0.62, 1.2, -0.2], [-0.15, 1.2, 0.1], [0.62, 1.2, 0.35], [-0.2, 1.2, -0.4]], is: 0.5 } },
    telescope(o) { const opt = o.optic || 'med', g = grp();
      if (opt === 'small') { g.add(rotX(cyl(1.3, 1.3, 4.2, MAT.silver, 0, 1.6, 0), Math.PI / 2), rotX(cyl(1.32, 1.32, 0.3, MAT.dark, 0, 1.6, 2.0), Math.PI / 2), rotX(cyl(1.25, 1.25, 0.02, MAT.mirror, 0, 1.6, -1.9), Math.PI / 2));
        const door = rotX(cyl(1.25, 1.25, 0.06, MAT.silver, 0, 2.9, 2.15), 0.5); g.add(door);
        for (const s of [-1, 1]) g.add(rotX(at(solar(1.0, 6.5, 0.04), s * 1.85, 1.6, -0.6), 0), rotZ(cyl(0.04, 0.04, 0.6, MAT.silver, s * 1.45, 1.6, -0.6, 6), Math.PI / 2));
        return { g, mounts: [[0.7, 1.6, -2.15, -Math.PI / 2], [-0.7, 1.6, -2.15, -Math.PI / 2], [0, 2.3, -2.15, -Math.PI / 2], [0, 0.9, -2.15, -Math.PI / 2]], is: 1.0 } }
      const shape = new T.Shape([[-5, 0], [-2.6, 3.2], [2.6, 3.2], [5, 0], [2.6, -3.2], [-2.6, -3.2]].map(([x, y]) => new T.Vector2(x, y)));
      for (let i = 0; i < 5; i++) { const l = new T.Mesh(new T.ShapeGeometry(shape), i % 2 ? MAT.shield2 : MAT.shield); l.rotation.x = -Math.PI / 2; l.position.y = -0.2 + i * 0.13; l.scale.setScalar(1 - i * 0.025); g.add(l) }
      g.add(box(1.8, 1.0, 1.8, MAT.dark, 0, -0.85, 0)); g.add(at(solar(2.2, 1.0, 0.04), 0, -1.4, -1.6));
      const mir = grp(), hr = 0.62, cells = hexGrid(opt === 'big' ? 2 : 1, hr * 0.96).filter(([x, y]) => opt === 'big' ? !(x === 0 && y === 0) : true);
      for (const [x, y] of cells) { const h = rotX(cyl(hr, hr, 0.08, MAT.mirror, x, y, 0, 6), Math.PI / 2); h.rotation.y = Math.PI / 6; mir.add(h) }
      const span = opt === 'big' ? 2.2 : 1.2; mir.add(box(span * 1.7, span * 1.9, 0.12, MAT.dark, 0, 0, -0.12));
      for (const a of [0, 2.1, 4.2]) { const st = cyl(0.025, 0.025, 3.2, MAT.dark, Math.cos(a) * span * 0.6, Math.sin(a) * span * 0.6, 1.5, 6); st.lookAt(0, 0, 3.0); st.rotateX(Math.PI / 2); mir.add(st) }
      mir.add(rotX(cyl(0.22, 0.22, 0.08, MAT.mirror, 0, 0, 3.0, 16), Math.PI / 2));
      mir.rotation.x = -0.25; mir.position.set(0, 0.9 + span * 0.9, 0.6); g.add(mir);
      return { g, mounts: [[0.55, 0.62, -1.3, 0], [-0.55, 0.62, -1.3, 0], [0, 0.62, -1.9, 0], [0.9, 0.62, -0.6, 0]], is: 1.6 } },
  };
  function rtgModel(L = 0.6) { const g = grp(cyl(L * 0.28, L * 0.28, L, MAT.rtg)); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, f = box(L * 0.03, L * 0.92, L * 0.24, MAT.rtg, Math.cos(a) * L * 0.36, 0, Math.sin(a) * L * 0.36); f.rotation.y = -a; g.add(f) } g.add(cyl(L * 0.12, L * 0.12, L * 1.04, MAT.glowO)); return { g } }

  /* ---------- instruments (about 0.5 m across before scaling) ---------- */
  const I = {
    cam() { return grp(box(0.36, 0.26, 0.3, MAT.white), rotX(cyl(0.1, 0.12, 0.22, MAT.dark, 0, 0.02, 0.24), Math.PI / 2), rotX(cyl(0.075, 0.075, 0.02, MAT.glass, 0, 0.02, 0.36), Math.PI / 2)) },
    imager() { return grp(box(0.18, 0.16, 0.18, MAT.dark), rotX(cyl(0.05, 0.05, 0.08, MAT.silver, 0, 0, 0.12), Math.PI / 2), rotX(cyl(0.04, 0.04, 0.01, MAT.glass, 0, 0, 0.165), Math.PI / 2)) },
    irspec() { const g = grp(box(0.36, 0.24, 0.42, MAT.gold)); for (let i = 0; i < 5; i++) g.add(box(0.36, 0.1, 0.012, MAT.silver, 0, 0.17, -0.16 + i * 0.08)); g.add(rotX(cyl(0.06, 0.06, 0.1, MAT.glass, 0.08, 0, 0.25), Math.PI / 2)); return g },
    radar() { const g = grp(box(0.18, 0.12, 0.18, MAT.white)); g.add(rotZ(cyl(0.012, 0.012, 2.6, MAT.silver, 0, 0.04, 0, 6), Math.PI / 2), rotX(cyl(0.012, 0.012, 1.6, MAT.silver, 0, 0.04, 0, 6), Math.PI / 2)); return g },
    uvspec() { return grp(box(0.22, 0.22, 0.62, MAT.white), box(0.16, 0.04, 0.01, MAT.glowV, 0, 0.03, 0.315), box(0.24, 0.24, 0.04, MAT.dark, 0, 0, 0.29)) },
    ngims() { return grp(cyl(0.13, 0.13, 0.36, MAT.silver, 0, 0.18, 0), cyl(0.15, 0.15, 0.05, MAT.gold, 0, 0.02, 0), cyl(0.05, 0.15, 0.16, MAT.dark, 0, 0.44, 0)) },
    mag() { return grp(box(0.12, 0.08, 0.12, MAT.white, 0, 0.04, 0), rotZ(cyl(0.015, 0.015, 1.5, MAT.dark, 0.75, 0.08, 0, 6), Math.PI / 2), box(0.09, 0.09, 0.09, MAT.gold, 1.52, 0.08, 0)) },
    xrf() { return grp(cyl(0.17, 0.17, 0.16, MAT.silver, 0, 0.08, 0, 6), cyl(0.03, 0.08, 0.14, MAT.dark, 0, 0.23, 0, 16), rotX(at(new T.Mesh(new T.TorusGeometry(0.11, 0.015, 8, 24), MAT.glowC), 0, 0.17, 0), Math.PI / 2)) },
    drill() { const g = grp(box(0.18, 0.34, 0.18, MAT.white, 0, 0.17, 0), cyl(0.035, 0.02, 0.34, MAT.silver, 0, -0.16, 0, 12)); for (let i = 0; i < 5; i++) g.add(rotX(at(new T.Mesh(new T.TorusGeometry(0.035, 0.008, 6, 16), MAT.silver), 0, -0.04 - i * 0.055, 0), Math.PI / 2)); g.add(box(0.06, 0.06, 0.3, MAT.silver, 0, 0.3, -0.2)); return g },
    seis() { return grp(at(new T.Mesh(new T.SphereGeometry(0.28, 28, 14, 0, TAU, 0, Math.PI / 2), MAT.white), 0, 0.02, 0), at(rotX(new T.Mesh(new T.TorusGeometry(0.3, 0.03, 8, 32), MAT.dark), Math.PI / 2), 0, 0.02, 0), cyl(0.33, 0.33, 0.02, MAT.gold, 0, 0.01, 0, 32)) },
    nircam() { return grp(box(0.62, 0.42, 0.5, MAT.white), box(0.6, 0.4, 0.02, MAT.gold, 0, 0, 0.26), rotX(cyl(0.12, 0.12, 0.2, MAT.dark, 0.15, 0.05, 0.36), Math.PI / 2)) },
    mirs() { const g = grp(box(0.5, 0.34, 0.44, MAT.silver), rotZ(cyl(0.09, 0.09, 0.42, MAT.gold, 0, 0.27, 0), Math.PI / 2)); for (let i = 0; i < 4; i++) g.add(box(0.012, 0.16, 0.36, MAT.white, -0.18 + i * 0.12, 0.42, 0)); return g },
    relay() { return grp(cyl(0.12, 0.12, 0.03, MAT.silver, 0, 0.015, 0), at(helix(0.07, 0.5, 6, 0.01, MAT.gold), 0, 0.03, 0), cyl(0.008, 0.008, 0.55, MAT.silver, 0, 0.3, 0, 6)) },
  };

  /* ---------- launch vehicles (real heights, metres) ---------- */
  const LV = {
    electron: { h: 18, build(p) { const g = grp(cyl(0.6, 0.6, 12, MAT.black, 0, 6, 0), cyl(0.61, 0.61, 0.4, MAT.white, 0, 12.2, 0), cyl(0.6, 0.6, 2.4, MAT.black, 0, 13.6, 0)); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; g.add(at(bell(0.11, 0.35, MAT.dark), Math.cos(a) * 0.35 * (i ? 1 : 0), 0.05, Math.sin(a) * 0.35 * (i ? 1 : 0))) } return { g, fair: [0.62, 3.2, 14.8] } } },
    f9: { h: 70, build() { const g = grp(cyl(1.83, 1.83, 41, MAT.white, 0, 20.5, 0), cyl(1.85, 1.85, 6, MAT.black, 0, 44, 0), cyl(1.83, 1.83, 9, MAT.white, 0, 51.5, 0));
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.78; g.add(rotY(box(0.9, 1.4, 0.15, MAT.dark, Math.cos(a) * 2.0, 39.5, Math.sin(a) * 2.0), -a), rotY(box(0.35, 9, 0.2, MAT.black, Math.cos(a) * 1.9, 4.6, Math.sin(a) * 1.9), -a)) }
        for (let i = 0; i < 9; i++) { const a = i / 8 * TAU; g.add(at(bell(0.5, 1.2, MAT.dark), i ? Math.cos(a) * 1.1 : 0, 0.1, i ? Math.sin(a) * 1.1 : 0)) } return { g, fair: [2.6, 13.1, 56] } } },
    atlas: { h: 58, build() { const g = grp(cyl(1.9, 1.9, 32.5, MAT.foam, 0, 16.25, 0), cyl(1.6, 1.9, 2, MAT.white, 0, 33.5, 0));
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.6, x = Math.cos(a) * 2.75, z = Math.sin(a) * 2.75; g.add(cyl(0.8, 0.8, 17, MAT.white, x, 9.5, z), at(ogive(0.8, 2.4, MAT.white), x, 18, z), at(bell(0.55, 1.2, MAT.dark), x, 1.0, z)) }
        g.add(at(bell(1.1, 1.8, MAT.dark), 0, 0.1, 0)); return { g, fair: [2.7, 22, 34.5] } } },
    ariane: { h: 52, build() { const g = grp(cyl(2.7, 2.7, 30.5, MAT.white, 0, 15.25, 0), cyl(2.7, 2.7, 4.5, MAT.white, 0, 32.75, 0), at(bell(1.1, 2, MAT.dark), 0, 0.1, 0));
        for (const s of [-1, 1]) { const x = s * 4.3; g.add(cyl(1.5, 1.5, 27, MAT.white, x, 14.5, 0), at(ogive(1.5, 4, MAT.white), x, 28, 0), at(bell(1.3, 2.4, MAT.dark), x, 1.0, 0)); for (const y of [8, 20]) g.add(cyl(1.52, 1.52, 0.5, MAT.black, x, y, 0)) }
        return { g, fair: [2.7, 17, 35] } } },
    sls: { h: 98, build() { const g = grp(cyl(4.2, 4.2, 65, MAT.foam, 0, 32.5, 0), cyl(4.2, 2.6, 4, MAT.white, 0, 67, 0), cyl(2.6, 2.6, 6, MAT.white, 0, 72, 0));
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.78; g.add(at(bell(1.1, 2.8, MAT.dark), Math.cos(a) * 1.9, 0.2, Math.sin(a) * 1.9)) }
        for (const s of [-1, 1]) { const x = s * 6.3; g.add(cyl(1.85, 1.85, 50, MAT.white, x, 28, 0), at(ogive(1.85, 5.5, MAT.white), x, 53, 0), at(bell(1.6, 3, MAT.dark), x, 2.6, 0)); for (const y of [12, 26, 40]) g.add(cyl(1.87, 1.87, 1.2, MAT.black, x, y, 0)) }
        return { g, fair: [4.2, 23, 75] } } },
  };

  /* ---------- public builders ---------- */
  const API = {};
  API.objective = k => OBJ[k] ? OBJ[k]() : planet('mars');
  API.dest = d => DEST[d] ? DEST[d]() : planet('mars');
  API.instrument = k => I[k] ? I[k]() : grp();
  API.power = k => k === 'rtg' ? rtgModel(0.6).g : solar(1.6, 1.0, 0.04);
  API.mirror = k => { const g = grp(); if (k === 'small') { g.add(rotX(cyl(1.2, 1.2, 0.06, MAT.mirror), Math.PI / 2), rotX(cyl(1.3, 1.3, 0.04, MAT.dark, 0, 0, -0.06), Math.PI / 2)); return g }
    const hr = 0.62; for (const [x, y] of hexGrid(k === 'big' ? 2 : 1, hr * 0.96).filter(([x, y]) => k === 'big' ? !(x === 0 && y === 0) : true)) { const h = rotX(cyl(hr, hr, 0.08, MAT.mirror, x, y, 0, 6), Math.PI / 2); h.rotation.y = Math.PI / 6; g.add(h) } return g };
  // a spacecraft with your instruments, power and mirror
  API.craft = (arch, o = {}) => { const b = M[arch] ? M[arch](o) : M.orbiter(o), list = o.inst || [];
    list.forEach((k, i) => { const mt = b.mounts[i % b.mounts.length]; const m = API.instrument(k); m.scale.setScalar(b.is * (i >= b.mounts.length ? 0.8 : 1)); m.position.set(mt[0], mt[1], mt[2]); if (mt[3]) m.rotation.x = mt[3];
      if (i >= b.mounts.length) m.position.x += 0.15 * b.is * (i - b.mounts.length + 1); b.g.add(m) });
    return b.g };
  // the rocket, with the spacecraft inside a see-through fairing
  API.rocket = (k, payload, seeThrough) => { const L = LV[k] || LV.f9, r = L.build(), [fr, fl, fy] = r.fair, g = r.g;
    const mat = seeThrough ? new T.MeshStandardMaterial({ color: '#f4f5f7', roughness: 0.4, transparent: true, opacity: 0.22, depthWrite: false, side: T.DoubleSide }) : (k === 'electron' ? MAT.black : MAT.white);
    g.add(at(cyl(fr, fr, fl * 0.45, mat, 0, 0, 0), 0, fy + fl * 0.225, 0), at(ogive(fr, fl * 0.55, mat), 0, fy + fl * 0.45, 0));
    if (payload) { const bb = new T.Box3().setFromObject(payload), sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3());
      const s = Math.min(fr * 1.5 / Math.max(sz.x, sz.z), fl * 0.6 / sz.y); payload.scale.multiplyScalar(s); payload.position.set(-c.x * s, fy + 0.4 - bb.min.y * s, -c.z * s); g.add(payload) }
    g.userData.height = L.h; return g };
  API.rocketHeight = k => (LV[k] || LV.f9).h;

  /* ---------- fitting a camera to a model ---------- */
  // frame a model: use its largest side rather than the box diagonal, so round things (planets) fill the view
  function fit(obj, cam, pad = 1.15) { const bb = new T.Box3().setFromObject(obj), sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3()); const rad = Math.max(sz.x, sz.y, sz.z) / 2 * 1.12; const fov = Math.min(cam.fov, cam.fov * cam.aspect) * Math.PI / 360; const d = rad / Math.sin(fov) * pad; return { center: c, radius: rad, dist: d, minY: bb.min.y, foot: Math.max(sz.x, sz.z) / 2 } }
  function lights(sc) { sc.add(new T.HemisphereLight(0xfff1e0, 0x1a1420, 1.1)); const k = new T.DirectionalLight(0xffffff, 2.4); k.position.set(4, 6, 5); sc.add(k); const r = new T.DirectionalLight(0x8fc8ff, 1.1); r.position.set(-5, 2, -4); sc.add(r) }
  function dispose(o) { o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material && !Object.values(MAT).includes(n.material) && !n.material.map) n.material.dispose && n.material.dispose() }) }

  /* ---------- thumbnails for the option cards ---------- */
  let TR = null; const thumbs = {};
  API.thumb = (key, make) => {
    if (thumbs[key]) return thumbs[key];
    try {
      if (!TR) { const c = document.createElement('canvas'); c.width = 360; c.height = 240; const r = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.setSize(360, 240, false); r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
        const sc = new T.Scene(); lights(sc); TR = { r, sc, cam: new T.PerspectiveCamera(32, 1.5, 0.01, 2000) } }
      const o = make(); TR.sc.add(o); const f = fit(o, TR.cam, 1.08), dir = new T.Vector3(0.95, 0.55, 1.25).normalize();
      TR.cam.position.copy(f.center).addScaledVector(dir, f.dist); TR.cam.near = f.dist / 100; TR.cam.far = f.dist * 10; TR.cam.updateProjectionMatrix(); TR.cam.lookAt(f.center);
      TR.r.render(TR.sc, TR.cam); thumbs[key] = TR.r.domElement.toDataURL('image/png'); TR.sc.remove(o); dispose(o);
    } catch (e) { thumbs[key] = '' }
    return thumbs[key];
  };

  /* ---------- the big live viewer ---------- */
  API.viewer = canvas => {
    const r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    const sc = new T.Scene(), cam = new T.PerspectiveCamera(34, 1, 0.01, 5000); lights(sc);
    const sp = []; for (let i = 0; i < 1200; i++) { const v = new T.Vector3().randomDirection().multiplyScalar(1); sp.push([v.x, v.y, v.z]) } const stars = dots(sp, '#ffffff', 0.004); stars.material.sizeAttenuation = true; sc.add(stars);
    // the glowing rings under the model
    const ringA = rotX(new T.Mesh(new T.RingGeometry(0.985, 1, 128), new T.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false })), -Math.PI / 2);
    const ringB = rotX(new T.Mesh(new T.RingGeometry(0.7, 0.705, 128), new T.MeshBasicMaterial({ color: '#ffb37a', transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false })), -Math.PI / 2);
    const disc = rotX(new T.Mesh(new T.CircleGeometry(1, 96), new T.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, opacity: 0.06, depthWrite: false })), -Math.PI / 2);
    const rings = grp(disc, ringA, ringB); sc.add(rings);
    const V = { r, sc, cam, cur: null, old: null, key: '', t: 1, yaw: 0.7, pitch: 0.28, zoom: 1, view: { center: new T.Vector3(), radius: 1, dist: 4, minY: -1 }, from: null, drag: null, idle: 0, launch: null, fx: [] };
    function size() { const w = canvas.clientWidth, h = canvas.clientHeight; if (w && h && (canvas.width !== Math.round(w * r.getPixelRatio()) || canvas.height !== Math.round(h * r.getPixelRatio()))) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix() } }
    V.show = (key, make) => {
      if (key === V.key && V.cur) return; V.key = key;
      if (V.old) { sc.remove(V.old); dispose(V.old) } V.old = V.cur; V.oldT = 0;
      const o = make(); const w = new T.Group(); w.add(o); sc.add(w); V.cur = w; V.t = 0; V.launch = null; V.fx.forEach(p => sc.remove(p.m)); V.fx = [];
      const f = fit(o, cam, 1.75); V.from = { c: V.view.center.clone(), d: V.view.dist, y: rings.position.y, s: rings.scale.x }; V.view = f;
    };
    V.launchNow = done => { if (!V.cur) { done && done(); return } V.launch = { t: 0, done }; };
    canvas.addEventListener('pointerdown', e => { V.drag = { x: e.clientX, y: e.clientY, yaw: V.yaw, pitch: V.pitch }; canvas.setPointerCapture(e.pointerId) });
    canvas.addEventListener('pointermove', e => { if (!V.drag) return; V.yaw = V.drag.yaw - (e.clientX - V.drag.x) * 0.008; V.pitch = Math.max(-0.2, Math.min(1.2, V.drag.pitch + (e.clientY - V.drag.y) * 0.006)); V.idle = 0 });
    const up = () => V.drag = null; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); V.zoom = Math.max(0.45, Math.min(2.2, V.zoom * (e.deltaY > 0 ? 1.08 : 0.93))) }, { passive: false });
    let last = performance.now(), visible = true;
    new IntersectionObserver(es => visible = es[0].isIntersecting).observe(canvas);
    const ease = t => 1 - Math.pow(1 - t, 3);
    function frame(now) {
      requestAnimationFrame(frame); if (!visible || document.hidden) { last = now; return }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; size();
      V.t = Math.min(1, V.t + dt * 1.6); V.idle += dt; if (!V.drag && V.idle > 1.5 && !V.launch) V.yaw += dt * 0.25;
      const k = ease(V.t), F = V.from || { c: V.view.center, d: V.view.dist, y: V.view.minY, s: V.view.radius };
      const c = F.c.clone().lerp(V.view.center, k), d = (F.d + (V.view.dist - F.d) * k) * V.zoom;
      if (V.cur) { const s = 0.6 + 0.4 * ease(Math.min(1, V.t * 1.2)); V.cur.scale.setScalar(s); V.cur.position.y = (1 - k) * -V.view.radius * 0.25 }
      if (V.old) { V.oldT += dt * 3; const s = Math.max(0.001, 1 - V.oldT); V.old.scale.setScalar(s); if (V.oldT >= 1) { sc.remove(V.old); dispose(V.old); V.old = null } }
      const ry = F.y + (V.view.minY - F.y) * k, rr = F.s + (Math.max(V.view.foot * 1.35, V.view.radius * 0.3) - F.s) * k; rings.position.set(c.x, ry - V.view.radius * 0.02, c.z); rings.scale.setScalar(Math.max(0.01, rr)); ringB.rotation.z += dt * 0.2;
      let target = c.clone();
      if (V.launch && V.cur) { const L = V.launch; L.t += dt; const a = Math.max(0, L.t - 0.6), h = 0.5 * 9 * a * a * (V.view.radius / 20); V.cur.position.y = h; target.y += h * 0.92;
        if (L.t > 0.3) for (let i = 0; i < 3; i++) { const m = sph(V.view.radius * (0.02 + Math.random() * 0.03), new T.MeshBasicMaterial({ color: Math.random() < 0.5 ? '#ffd38a' : '#ff8a3d', transparent: true, opacity: 0.9, depthWrite: false }), c.x + (Math.random() - 0.5) * V.view.radius * 0.08, V.view.minY + h, c.z + (Math.random() - 0.5) * V.view.radius * 0.08, 8, 6); sc.add(m); V.fx.push({ m, v: new T.Vector3((Math.random() - 0.5) * 0.4, -0.6 - Math.random() * 0.5, (Math.random() - 0.5) * 0.4).multiplyScalar(V.view.radius * 0.6), life: 1 }) }
        if (L.t > 3.2 && L.done) { const f = L.done; L.done = null; f() } }
      for (let i = V.fx.length - 1; i >= 0; i--) { const p = V.fx[i]; p.life -= dt * 0.9; p.m.position.addScaledVector(p.v, dt); p.v.multiplyScalar(0.97); p.m.scale.setScalar(1 + (1 - p.life) * 3); p.m.material.opacity = Math.max(0, p.life * 0.8); if (p.life <= 0) { sc.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); V.fx.splice(i, 1) } }
      cam.position.set(target.x + Math.cos(V.yaw) * Math.cos(V.pitch) * d, target.y + Math.sin(V.pitch) * d, target.z + Math.sin(V.yaw) * Math.cos(V.pitch) * d);
      cam.near = d / 200; cam.far = d * 50; cam.updateProjectionMatrix(); cam.lookAt(target);
      stars.position.copy(cam.position); stars.scale.setScalar(d * 20); stars.material.size = 0.004 * d * 20 / 8;
      r.render(sc, cam);
    }
    requestAnimationFrame(frame);
    return V;
  };
  return API;
})();
