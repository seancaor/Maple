// Maple · jardín 3D (diorama low-poly con three.js)
// three.js desde la CDN permitida; en desarrollo local, copia local
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js').catch(() => import('./three.module.min.js'));

const SKY = {
  none: ['#F6F1E9', '#FFFDF9'], sky: ['#9FD3FF', '#EAF6FF'], dusk: ['#FFAE7A', '#FFE7D2'], forest: ['#BFE6C6', '#F0FAF1'],
  autumn: ['#FFCF9E', '#FFF2E3'], lab: ['#D4CCFF', '#F5F3FF'], night: ['#1C2550', '#3F4C88'],
};
const GREEN = [0x5DBB63, 0x72C977, 0x4AA853, 0x67C46C];
const BLOOM = [0x4FB262, 0x62C373, 0x3FA055, 0x58BA6A];
const FALL = [0xE8643A, 0xF29A38, 0xD9483B, 0xF5B342];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: .85, metalness: 0 }, o));

function skyTexture(bg) {
  const [a, b] = SKY[bg] || SKY.none, c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, a); gr.addColorStop(1, b);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function mount(box, opts = {}) {
  const W = () => box.clientWidth || 340, H = () => box.clientHeight || 300;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const cv = renderer.domElement; cv.className = 'g3d'; box.append(cv);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, W() / H(), .1, 100);
  const camTarget = new THREE.Vector3(0, 1.55, 0);
  camera.position.set(0, 3.6, 10.2); camera.lookAt(camTarget);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xC9A27A, 1.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xFFF4E0, 2.2); sun.position.set(4, 8, 5);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 4; sun.shadow.bias = -.0008;
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 6, bottom: -3, near: 1, far: 25 });
  scene.add(sun);

  const world = new THREE.Group(); scene.add(world);     // gira con el dedo
  const floater = new THREE.Group(); world.add(floater);  // flota suave
  let treeG = null, decoG = null, extras = [], stars = null, glow = null, curKey = '', cur = {};
  const bobs = []; let camGoal = null, camNow = null;
  const island = buildIsland(); floater.add(island);

  function setSky(bg) {
    if (scene.background && scene.background.dispose) scene.background.dispose();
    scene.background = skyTexture(bg);
    const night = bg === 'night';
    hemi.intensity = night ? 1.0 : 1.6; hemi.color.set(night ? 0x8090D0 : 0xffffff);
    sun.intensity = night ? 1.0 : 2.2; sun.color.set(night ? 0xAFC0FF : 0xFFF4E0);
    if (stars) { scene.remove(stars); stars.geometry.dispose(); stars = null; }
    if (night) {
      const r = rng(7), p = [];
      for (let i = 0; i < 160; i++) { const a = r() * Math.PI * 2, y = 1 + r() * 9, d = 18 + r() * 6; p.push(Math.cos(a) * d, y, Math.sin(a) * d - 4); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: .09 })); scene.add(stars);
    }
  }

  function build(o) {
    const key = [o.stage, (o.deco || []).slice().sort().join(','), o.bg].join('|');
    if (key === curKey) return false;
    const grew = cur.stage != null && o.stage > cur.stage;
    curKey = key; cur = Object.assign({}, o);
    [treeG, decoG].forEach(g => { if (g) { floater.remove(g); dispose(g); } });
    extras = []; glow = null;
    setSky(o.bg);
    treeG = buildTree(o.stage, o.bg === 'night'); floater.add(treeG);
    decoG = buildDeco(o.stage, o.deco || [], treeG.userData); floater.add(decoG);
    const big = o.stage >= 3, ud = treeG.userData, top = big ? ud.cy + ud.R : 1;
    camGoal = { y: big ? Math.max(1.1, top * .42) : .3, d: big ? 9.6 + top * .9 : 10.8 };
    if (!camNow) camNow = Object.assign({}, camGoal);
    if (grew) { treeG.scale.setScalar(.55); treeG.userData.grow = 0; burst(24); }
    return true;
  }

  /* ---------- isla ---------- */
  function buildIsland() {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(3, 2.92, .34, 30), mat(0x7CC86E)); top.position.y = -.17; top.receiveShadow = true; g.add(top);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.92, 2.6, .5, 30), mat(0xC48A5C)); band.position.y = -.59; band.castShadow = true; g.add(band);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.3, 30, 3), mat(0xA06A48)); cone.rotation.x = Math.PI; cone.position.y = -1.99; g.add(cone);
    // jitter de vértices para un look orgánico
    [band, cone].forEach(m => { const p = m.geometry.attributes.position, r = rng(m === band ? 3 : 5); for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (Math.abs(y) < 1.1 && m === cone || m === band) { p.setX(i, p.getX(i) * (.94 + r() * .1)); p.setZ(i, p.getZ(i) * (.94 + r() * .1)); } } m.geometry.computeVertexNormals(); });
    const r = rng(11);
    for (let i = 0; i < 7; i++) { // rocas
      const a = r() * Math.PI * 2, d = 1.6 + r() * 1.1, s = .12 + r() * .16;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(0xB8B2AA)); m.position.set(Math.cos(a) * d, s * .4, Math.sin(a) * d); m.rotation.set(r() * 3, r() * 3, 0); m.castShadow = true; g.add(m);
    }
    const tuft = new THREE.ConeGeometry(.05, .26, 4);
    for (let i = 0; i < 46; i++) { // pasto
      const a = r() * Math.PI * 2, d = .5 + r() * 2.3;
      const m = new THREE.Mesh(tuft, mat(r() > .5 ? 0x5DAE55 : 0x8ED67F)); m.position.set(Math.cos(a) * d, .1, Math.sin(a) * d); m.rotation.z = (r() - .5) * .5; g.add(m);
    }
    for (let i = 0; i < 9; i++) { // florecitas
      const a = r() * Math.PI * 2, d = 1 + r() * 1.8, c = [0xFFFFFF, 0xFFD25A, 0xFF9FBF][i % 3];
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.06, 0), mat(c)); m.position.set(Math.cos(a) * d, .08, Math.sin(a) * d); g.add(m);
    }
    // pedacitos de tierra flotando
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.18 + i * .05, 0), mat(0xA06A48)); m.position.set([-3.4, 3.3, -2.6][i], [-1.2, -1.8, -2.4][i], [.8, -.6, 1.6][i]); m.userData.bob = i; g.add(m); bobs.push(m); }
    return g;
  }

  /* ---------- árbol ---------- */
  function buildTree(stage, night) {
    const g = new THREE.Group(), r = rng(42), ud = { tops: [], canopy: null, R: 0, cy: 0 };
    g.userData = ud;
    if (stage === 0) {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(.42, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8E5E3E)); mound.scale.y = .32; mound.receiveShadow = true; g.add(mound);
      const seed = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), mat(0xC98A54)); seed.scale.set(.8, 1.1, .8); seed.rotation.z = .5; seed.position.set(-.04, .14, 0); seed.castShadow = true; g.add(seed);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(.018, .025, .2, 5), mat(0x5DBB63)); tip.position.set(.05, .3, 0); tip.rotation.z = -.25; g.add(tip);
      const lf = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), mat(0x72C977)); lf.scale.set(1.3, .35, .7); lf.position.set(.11, .4, 0); lf.rotation.z = .4; g.add(lf);
      // cartelito
      const post = new THREE.Mesh(new THREE.BoxGeometry(.04, .42, .04), mat(0x9A6A44)); post.position.set(.55, .21, .25); g.add(post);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(.32, .2, .03), mat(0xD9A46E)); sign.position.set(.55, .4, .27); sign.castShadow = true; g.add(sign);
      ud.cy = .3; ud.R = .3; return g;
    }
    if (stage <= 2) {
      const h = stage === 1 ? .55 : 1.0;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, h, 6), mat(0x4AA853)); stem.position.y = h / 2; stem.castShadow = true; g.add(stem);
      const leafG = new THREE.SphereGeometry(.2, 8, 6);
      const pairs = stage === 1 ? [[h, 0]] : [[h, 0], [h * .55, Math.PI / 2]];
      pairs.forEach(([y, rot]) => [-1, 1].forEach(sd => { const l = new THREE.Mesh(leafG, mat(sd > 0 ? 0x5DBB63 : 0x72C977)); l.scale.set(1.1, .28, .55); l.position.set(Math.cos(rot) * .2 * sd, y, Math.sin(rot) * .2 * sd); l.rotation.y = -rot; l.rotation.z = sd * .45; l.castShadow = true; g.add(l); }));
      ud.cy = h; ud.R = .35; return g;
    }
    const H = [0, 0, 0, 1.3, 1.65, 2.0, 2.2, 2.4, 2.5][stage], R = [0, 0, 0, .8, 1.0, 1.25, 1.4, 1.55, 1.6][stage], tr = .1 + stage * .028;
    const bark = mat(0x8A5A3B);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(tr * .65, tr * 1.25, H, 8), bark); trunk.position.y = H / 2; trunk.castShadow = true; g.add(trunk);
    const root = new THREE.Mesh(new THREE.ConeGeometry(tr * 2, .25, 8), bark); root.position.y = .1; g.add(root);
    [[.9, .5], [-1, .7], [2.5, .62]].forEach(([a, f]) => { // ramas
      const len = R * .75, b = new THREE.Mesh(new THREE.CylinderGeometry(tr * .25, tr * .45, len, 6), bark);
      const piv = new THREE.Group(); piv.position.y = H * f; piv.rotation.y = a; b.position.y = len / 2; piv.add(b); b.parent.rotation.z = .85; b.castShadow = true; g.add(piv);
    });
    const cy = H + R * .55; ud.cy = cy; ud.R = R; ud.H = H;
    const pal = stage >= 8 ? FALL : stage >= 6 ? BLOOM : GREEN;
    const canopy = new THREE.Group(); canopy.position.y = cy; g.add(canopy); ud.canopy = canopy;
    const blobs = [[0, .1, 0, .82], [-.62, -.18, .2, .62], [.64, -.15, -.1, .62], [-.3, .5, -.25, .6], [.35, .45, .3, .58], [.05, -.3, .62, .6], [.1, -.25, -.6, .6], [-.5, .2, -.5, .5], [.55, .25, .55, .5]];
    blobs.slice(0, stage >= 5 ? 9 : stage >= 4 ? 7 : 5).forEach(([x, y, z, s], i) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s * R, 1), mat(pal[i % pal.length]));
      m.position.set(x * R, y * R, z * R); m.rotation.set(r() * 3, r() * 3, r() * 3); m.castShadow = true; m.receiveShadow = true; canopy.add(m);
      ud.tops.push(m);
    });
    const onSurface = (n, size, col, emis) => {
      for (let i = 0; i < n; i++) {
        const v = new THREE.Vector3(r() - .5, r() * .9 - .25, r() - .5).normalize().multiplyScalar(R * (.95 + r() * .12));
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), mat(col, emis ? { emissive: col, emissiveIntensity: .25 } : {}));
        m.position.copy(v); canopy.add(m);
      }
    };
    if (stage >= 6 && stage < 8) onSurface(18, .07, 0xFF9FBF);
    if (stage === 7) onSurface(9, .1, 0xFF5B4D, 1);
    if (stage >= 8) {
      onSurface(8, .1, 0xFFC53D, 1);
      // hojas caídas en el pasto
      for (let i = 0; i < 22; i++) { const a = r() * Math.PI * 2, d = .4 + r() * 2.2; const m = new THREE.Mesh(new THREE.CircleGeometry(.08, 5), mat(FALL[i % 4], { side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.rotation.z = r() * 6; m.position.set(Math.cos(a) * d, .01, Math.sin(a) * d); g.add(m); }
    }
    return g;
  }

  /* ---------- adornos ---------- */
  function buildDeco(stage, deco, ud) {
    const g = new THREE.Group(), has = d => deco.includes(d), big = stage >= 3;
    if (has('mush')) [[-1.6, 1.25, .17], [-1.35, 1.6, .12], [-1.85, .9, .1]].forEach(([x, z, s]) => {
      const m = new THREE.Group();
      const st = new THREE.Mesh(new THREE.CylinderGeometry(s * .35, s * .45, s * 1.4, 8), mat(0xF3E6D6)); st.position.y = s * .7; m.add(st);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xFF5B4D)); cap.position.y = s * 1.3; cap.castShadow = true; m.add(cap);
      [[.4, .5], [-.5, .3], [.1, .8]].forEach(([a, h]) => { const d = new THREE.Mesh(new THREE.SphereGeometry(s * .14, 6, 4), mat(0xffffff)); d.position.set(Math.cos(a * 6) * s * .7, s * 1.3 + s * h * .6, Math.sin(a * 6) * s * .7); m.add(d); });
      m.position.set(x, 0, z); g.add(m);
    });
    if (has('bench')) {
      const b = new THREE.Group(), wood = mat(0xB07A4C);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, .07, .34), wood); seat.position.y = .36; seat.castShadow = true; b.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, .26, .06), wood); back.position.set(0, .62, -.16); back.castShadow = true; b.add(back);
      [[-.45, .12], [.45, .12], [-.45, -.12], [.45, -.12]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(.07, .36, .07), mat(0x7A5236)); l.position.set(x, .18, z); b.add(l); });
      b.position.set(1.55, 0, 1.15); b.rotation.y = -2.4; g.add(b);
    }
    if (has('bird') && big) {
      const b = new THREE.Group(), blue = mat(0x46A7F5);
      const body = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), blue); body.scale.set(1.2, 1, 1); b.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), blue); head.position.set(.16, .12, 0); b.add(head);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), mat(0xFFE7B8)); belly.position.set(.06, -.05, 0); b.add(belly);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(.04, .1, 5), mat(0xFFB23D)); beak.rotation.z = -Math.PI / 2; beak.position.set(.3, .12, 0); b.add(beak);
      [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(.022, 6, 4), mat(0x2E2A28)); e.position.set(.23, .16, s * .06); b.add(e); });
      const tail = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 4), blue); tail.rotation.z = Math.PI / 2 + .4; tail.position.set(-.22, .04, 0); b.add(tail);
      b.traverse(m => m.castShadow = true);
      b.position.set(ud.R * .7, ud.cy + ud.R * .78, ud.R * .25); b.rotation.y = -.5; b.userData.kind = 'bird'; g.add(b); extras.push(b);
    }
    if (has('lanterns') && big) {
      const pts = [], N = 5, y0 = ud.cy - ud.R * .55, rr = ud.R * 1.02;
      for (let i = 0; i <= 24; i++) { const a = -1.2 + i / 24 * 2.4; pts.push(new THREE.Vector3(Math.sin(a) * rr, y0 - Math.sin(i / 24 * Math.PI) * .25, Math.cos(a) * rr)); }
      const curve = new THREE.CatmullRomCurve3(pts);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, .012, 4), mat(0x6A5A4A)));
      for (let i = 0; i < N; i++) {
        const p = curve.getPoint((i + .5) / N), l = new THREE.Mesh(new THREE.SphereGeometry(.08, 10, 8), new THREE.MeshStandardMaterial({ color: 0xFFD25A, emissive: 0xFFB43A, emissiveIntensity: cur.bg === 'night' ? 2.2 : .9 }));
        l.position.copy(p).add(new THREE.Vector3(0, -.1, 0)); g.add(l);
      }
      if (cur.bg === 'night') { glow = new THREE.PointLight(0xFFC266, 6, 6, 1.6); glow.position.set(0, y0 - .2, rr * .8); g.add(glow); }
    }
    if (has('swing') && big) {
      const s = new THREE.Group(), topY = ud.cy - ud.R * .45, len = topY - .32;
      [-.17, .17].forEach(x => { const c = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, len, 4), mat(0x6A5A4A)); c.position.set(x, -len / 2, 0); s.add(c); });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(.44, .05, .2), mat(0xC98A54)); seat.position.y = -len; seat.castShadow = true; s.add(seat);
      s.position.set(-ud.R * .55, topY, .4); s.userData.kind = 'swing'; g.add(s); extras.push(s);
    }
    if (has('butter')) [0, 1].forEach(i => {
      const b = new THREE.Group(), col = i ? 0xFF8FB1 : 0xB7A8FF, wg = new THREE.CircleGeometry(.11, 6);
      [-1, 1].forEach(sd => { const w = new THREE.Mesh(wg, mat(col, { side: THREE.DoubleSide })); w.position.x = sd * .1; const p = new THREE.Group(); p.add(w); p.userData.sd = sd; b.add(p); });
      b.userData = { kind: 'butter', ph: i * 2.7, rad: 1.9 + i * .5, y: (ud.cy || 1) * .7 + i * .4 };
      g.add(b); extras.push(b);
    });
    return g;
  }

  /* ---------- hojas que caen ---------- */
  const leafGeo = new THREE.CircleGeometry(.07, 5), falling = [];
  function spawnLeaf(burstMode) {
    const ud = treeG && treeG.userData; if (!ud) return;
    const stage = cur.stage, col = stage >= 8 ? FALL[Math.floor(Math.random() * 4)] : (stage >= 3 ? GREEN[Math.floor(Math.random() * 4)] : 0x72C977);
    const m = new THREE.Mesh(leafGeo, mat(col, { side: THREE.DoubleSide }));
    const a = Math.random() * Math.PI * 2, d = Math.random() * ud.R;
    m.position.set(Math.cos(a) * d, ud.cy + (Math.random() - .3) * ud.R * .6, Math.sin(a) * d);
    m.userData = { vy: burstMode ? .6 + Math.random() * .8 : 0, vx: (Math.random() - .5) * (burstMode ? 1.6 : .2), vz: (Math.random() - .5) * (burstMode ? 1.6 : .2), spin: Math.random() * 4, life: 0 };
    floater.add(m); falling.push(m);
  }
  function burst(n) { for (let i = 0; i < n; i++) spawnLeaf(true); }

  /* ---------- interacción: girar y tocar ---------- */
  let rotY = -.35, vel = 0, dragging = false, lastX = 0, moved = 0, idle = 0, shake = 0;
  cv.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; moved = 0; vel = 0; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); rotY += dx * .011; vel = dx * .011; idle = 0; });
  const up = e => {
    if (!dragging) return; dragging = false;
    if (moved < 6) { shake = 1; burst(cur.stage >= 3 ? 10 : 4); opts.onTap && opts.onTap(); }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.style.touchAction = 'pan-y';

  /* ---------- bucle ---------- */
  const clock = new THREE.Clock(); let raf = 0, alive = true;
  function frame() {
    if (!alive) return; raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    idle += dt;
    if (!dragging) { vel *= .93; rotY += vel; if (idle > 2.5) rotY += dt * .18; }
    world.rotation.y = rotY;
    if (camGoal) { camNow.y += (camGoal.y - camNow.y) * Math.min(1, dt * 3); camNow.d += (camGoal.d - camNow.d) * Math.min(1, dt * 3); camTarget.y = camNow.y; camera.position.set(0, camNow.y + 2.1, camNow.d); camera.lookAt(camTarget); }
    floater.position.y = Math.sin(t * 1.1) * .06;
    if (treeG) {
      const ud = treeG.userData;
      if (ud.grow != null) { ud.grow = Math.min(1, ud.grow + dt * 1.1); const k = ud.grow, e = 1 + .45 * Math.sin(k * Math.PI) * (1 - k); treeG.scale.setScalar((.55 + .45 * k) * e); if (k >= 1) { delete ud.grow; treeG.scale.setScalar(1); } }
      shake = Math.max(0, shake - dt * 1.6);
      if (ud.canopy) { ud.canopy.rotation.z = Math.sin(t * .9) * .025 + Math.sin(t * 22) * shake * .06; ud.canopy.rotation.x = Math.cos(t * .7) * .02; }
      else treeG.rotation.z = Math.sin(t * 22) * shake * .1;
      if (cur.stage >= 3 && Math.random() < dt * (cur.stage >= 8 ? 1.6 : .25)) spawnLeaf(false);
    }
    for (let i = falling.length - 1; i >= 0; i--) {
      const m = falling[i], u = m.userData; u.life += dt;
      u.vy -= dt * 1.4; u.vy = Math.max(u.vy, -.45);
      m.position.x += (u.vx + Math.sin(t * 2 + u.spin) * .25) * dt; m.position.z += u.vz * dt; m.position.y += u.vy * dt;
      m.rotation.x += dt * u.spin; m.rotation.y += dt * 1.3;
      u.vx *= .99; u.vz *= .99;
      if (m.position.y <= .02 || u.life > 9) { m.position.y = Math.max(m.position.y, .02); u.vy = 0; u.vx = u.vz = 0; u.rest = (u.rest || 0) + dt; m.rotation.set(-Math.PI / 2, 0, u.spin); m.material.opacity = 1 - u.rest / 2; m.material.transparent = true; if (u.rest > 2 || Math.hypot(m.position.x, m.position.z) > 3) { floater.remove(m); m.material.dispose(); falling.splice(i, 1); } }
    }
    bobs.forEach(m => { m.position.y += Math.sin(t * 1.3 + m.userData.bob) * .0015; });
    extras.forEach(m => {
      const u = m.userData;
      if (false) m.position.y += Math.sin(t * 1.3 + u.bob) * .0015;
      if (u.kind === 'bird') { m.position.y += Math.sin(t * 3) * .0008; m.rotation.z = Math.max(0, Math.sin(t * 1.7)) * .25; }
      if (u.kind === 'swing') m.rotation.x = Math.sin(t * 1.6) * .25;
      if (u.kind === 'butter') { const a = t * .6 + u.ph; m.position.set(Math.cos(a) * u.rad, u.y + Math.sin(t * 1.8 + u.ph) * .25, Math.sin(a) * u.rad); m.rotation.y = -a; m.children.forEach(p => p.rotation.y = p.userData.sd * (.3 + Math.abs(Math.sin(t * 14 + u.ph)) * 1.1)); }
    });
    if (stars) stars.rotation.y = t * .01;
    renderer.render(scene, camera);
  }

  function resize() { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(box);

  build(opts); frame();

  return {
    update(o) { build(Object.assign({}, cur, o)); },
    burst,
    snapshot(size = 112) {
      renderer.render(scene, camera);
      const c = document.createElement('canvas'); c.width = c.height = size;
      const s = Math.min(cv.width, cv.height) * .9, sx = (cv.width - s) / 2, sy = (cv.height - s) / 2 - cv.height * .02;
      c.getContext('2d').drawImage(cv, sx, Math.max(0, sy), s, s, 0, 0, size, size);
      return c.toDataURL('image/jpeg', .85);
    },
    destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); dispose(scene); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); cv.remove(); },
  };
}

function dispose(o) {
  o.traverse && o.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) [].concat(m.material).forEach(x => x.dispose()); });
}
