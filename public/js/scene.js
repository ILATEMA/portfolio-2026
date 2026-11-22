import * as THREE from 'three';

/**
 * Monde 3D du portfolio — version « plate » (aplats + contours, sans lumières, sans brouillard).
 * Le visiteur "vole" à travers 5 niveaux (un par section) et franchit des portes violettes
 * entre chaque niveau. Palette : vert forêt (fond), beige sable (objets), violet électrique (accents ~10 %).
 */

// Les couleurs viennent des variables CSS (public/css/style.css, bloc :root) : une seule source de vérité.
const css = getComputedStyle(document.documentElement);
const fromCss = (name, fallback) => {
  try { return new THREE.Color(css.getPropertyValue(name).trim() || fallback); } catch (e) { return new THREE.Color(fallback); }
};
const C = {
  bg: fromCss('--forest-900', '#0e2a1f'),
  deep: fromCss('--forest-950', '#0a1f17'),
  mid: fromCss('--forest-700', '#1c4a37'),
  light: fromCss('--forest-600', '#2a6a4e'),
  leaf: fromCss('--leaf', '#4a9a72'),
  sand: fromCss('--sand', '#e8dcc0'),
  violet: fromCss('--violet', '#7b2ff7'),
};

const GAP = 30; // distance (en unités 3D) entre deux niveaux
const LEVELS = 5;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function initScene(canvas, { reducedMotion = false, isMobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(C.bg, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);

  /* ---------- Matériaux plats (aucune lumière : couleur unie) ---------- */
  const flat = (color) => new THREE.MeshBasicMaterial({ color });
  const line = (color, opacity = 1) => new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  const wire = (color, opacity) => new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });

  const fillMid = flat(C.mid);
  const fillSand = flat(C.sand);
  const fillViolet = flat(C.violet);
  const fillLight = flat(C.light);

  /** Solide en aplat + contour net (donne du relief sans ombre ni dégradé) */
  function outlined(geometry, fill, edge, angle = 1) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geometry, fill));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, angle), line(edge)));
    return g;
  }

  /* ---------- Un "décor" par niveau ---------- */
  const props = [];

  // Niveau 1 — noyau cristallin
  {
    const g = new THREE.Group();
    const core = outlined(new THREE.IcosahedronGeometry(2.1, 1), fillMid, C.sand);
    const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(2.7, 1), wire(C.sand, 0.22));
    const orbitG = new THREE.Group();
    const sat = outlined(new THREE.OctahedronGeometry(0.36, 0), fillViolet, C.sand);
    sat.position.set(3.5, 0, 0);
    orbitG.add(sat);
    g.add(core, halo, orbitG);
    props.push({ group: g, update: (t, dt, s) => { core.rotation.y += dt * 0.25 * s; core.rotation.x += dt * 0.1 * s; halo.rotation.y -= dt * 0.12 * s; orbitG.rotation.y += dt * 0.7 * s; orbitG.rotation.z = 0.5; } });
  }

  // Niveau 2 — nœud torique
  {
    const g = new THREE.Group();
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.5, 0.42, 160, 18), fillSand);
    const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(1.5, 0.425, 160, 18), wire(C.deep, 0.5));
    g.add(knot, mesh);
    props.push({ group: g, update: (t, dt, s) => { g.rotation.y += dt * 0.3 * s; g.rotation.x += dt * 0.18 * s; } });
  }

  // Niveau 3 — grille de cubes (arbre de compétences)
  {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
    const cubes = [];
    const N = 4;
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        const isAccent = x === 2 && y === 1;
        const fill = isAccent ? fillViolet : (x + y) % 2 ? fillSand : fillLight;
        const m = outlined(geo, fill, isAccent || (x + y) % 2 ? C.deep : C.sand);
        m.position.set((x - (N - 1) / 2) * 0.95, (y - (N - 1) / 2) * 0.95, 0);
        g.add(m);
        cubes.push({ m, x, y });
      }
    }
    g.rotation.set(0.35, -0.5, 0);
    props.push({ group: g, update: (t, dt, s) => { g.rotation.y = -0.5 + Math.sin(t * 0.3 * s) * 0.4; cubes.forEach(({ m, x, y }) => { const k = 0.62 + 0.38 * Math.sin(t * 1.5 * s + (x + y) * 0.8); m.scale.setScalar(k); m.rotation.z += dt * 0.4 * s; }); } });
  }

  // Niveau 4 — écrans en orbite (projets)
  {
    const g = new THREE.Group();
    const screens = new THREE.Group();
    const geo = new THREE.BoxGeometry(2.1, 1.3, 0.08);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const s = outlined(geo, fillMid, i === 0 ? C.violet : C.sand);
      s.position.set(Math.cos(a) * 2.8, Math.sin(a * 2) * 0.35, Math.sin(a) * 2.8);
      s.rotation.y = -a + Math.PI / 2;
      screens.add(s);
    }
    g.add(screens);
    g.rotation.x = 0.28;
    props.push({ group: g, update: (t, dt, s) => { screens.rotation.y += dt * 0.35 * s; } });
  }

  // Niveau 5 — balise
  {
    const g = new THREE.Group();
    const beacon = outlined(new THREE.OctahedronGeometry(1.5, 0), fillViolet, C.sand);
    const frame1 = new THREE.Mesh(new THREE.OctahedronGeometry(2.3, 0), wire(C.sand, 0.4));
    const frame2 = new THREE.Mesh(new THREE.OctahedronGeometry(3.1, 1), wire(C.violet, 0.7));
    g.add(beacon, frame1, frame2);
    props.push({ group: g, update: (t, dt, s) => { beacon.rotation.y += dt * 0.6 * s; frame1.rotation.y -= dt * 0.25 * s; frame2.rotation.y += dt * 0.1 * s; const k = 1 + Math.sin(t * 2 * s) * 0.05; beacon.scale.setScalar(k); } });
  }

  props.forEach((p) => scene.add(p.group));

  /* ---------- Portes de passage (entre les niveaux) ---------- */
  const gates = [];
  for (let i = 0; i < LEVELS - 1; i++) {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.08, 10, 90), new THREE.MeshBasicMaterial({ color: C.violet }));
    const inner = new THREE.Mesh(new THREE.TorusGeometry(4.7, 0.035, 8, 90), new THREE.MeshBasicMaterial({ color: C.sand, transparent: true, opacity: 0.3 }));
    g.add(outer, inner);
    g.position.z = 6 - (i + 0.5) * GAP;
    scene.add(g);
    gates.push({ g, outer, inner, at: i + 0.5 });
  }

  /* ---------- Éclats flottants (aplats) ---------- */
  const SHARDS = isMobile ? 150 : 320;
  const shardGeo = new THREE.OctahedronGeometry(0.2, 0);
  const shards = new THREE.InstancedMesh(shardGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), SHARDS);
  shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const shardData = [];
  const col = new THREE.Color();
  for (let i = 0; i < SHARDS; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = rand(6.5, 24);
    const r1 = Math.random();
    col.copy(r1 < 0.1 ? C.violet : r1 < 0.55 ? C.sand : C.leaf);
    shards.setColorAt(i, col);
    shardData.push({
      x: Math.cos(a) * r, y: Math.sin(a) * r * 0.65, z: rand(14, -(GAP * (LEVELS - 1) + 40)),
      s: rand(0.5, 2.1), rx: rand(-1, 1), ry: rand(-1, 1), ph: Math.random() * 6.28,
    });
  }
  shards.instanceColor.needsUpdate = true;
  scene.add(shards);
  const dummy = new THREE.Object3D();

  /* ---------- Étoiles (points) ---------- */
  const STARS = isMobile ? 600 : 1300;
  const starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    starPos[i * 3] = rand(-45, 45);
    starPos[i * 3 + 1] = rand(-30, 30);
    starPos[i * 3 + 2] = rand(25, -(GAP * (LEVELS - 1) + 70));
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: C.sand, size: isMobile ? 0.09 : 0.065, transparent: true, opacity: 0.7, sizeAttenuation: true, depthWrite: false }));
  scene.add(stars);

  /* ---------- Disposition (selon écran portrait / paysage) ---------- */
  function layout() {
    const portrait = camera.aspect < 0.9;
    props.forEach((p, i) => {
      const z = -i * GAP - 4;
      if (portrait) {
        p.group.position.set(0, 3.1, z);
        p.group.scale.setScalar(0.5);
      } else {
        const side = [1, -1, 1, -1, 0][i];
        p.group.position.set(side * 5.1, i === 4 ? 0.4 : 0.3, z);
        p.group.scale.setScalar(i === 4 ? 1.05 : 1);
      }
    });
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layout();
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  /* ---------- Entrées ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reducedMotion) {
    window.addEventListener('pointermove', (e) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  let sec = 0; // position lissée (0 → 4)
  let secTarget = 0;
  let introStart = null;
  const INTRO_DIST = 18;
  const INTRO_MS = 2600;
  const spin = reducedMotion ? 0.15 : 1;

  /* ---------- Boucle de rendu ---------- */
  let last = performance.now();
  let t = 0;
  let frames = 0;
  let acc = 0;
  let adapted = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    // Qualité adaptative : si la machine peine, on allège automatiquement
    if (!adapted && ++frames > 20) {
      acc += dt;
      if (frames === 100) {
        adapted = true;
        if (acc / 80 > 0.026) {
          if (pixelRatio > 1) { pixelRatio = 1; renderer.setPixelRatio(1); renderer.setSize(window.innerWidth, window.innerHeight, false); }
          shards.count = Math.ceil(SHARDS * 0.5);
        }
      }
    }

    sec += (secTarget - sec) * (1 - Math.exp(-dt * 4));
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 3));
    mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 3));

    // Intro : le monde se révèle quand on appuie sur "jouer"
    let intro = INTRO_DIST;
    if (introStart !== null) intro = INTRO_DIST * (1 - easeOut(clamp((now - introStart) / INTRO_MS, 0, 1)));

    const camZ = 6 - sec * GAP + intro;
    const px = Math.sin(sec * 1.15) * 1.1 + mouse.x * 0.7;
    const py = Math.cos(sec * 0.9) * 0.5 + mouse.y * 0.45;
    camera.position.set(px, py, camZ);
    camera.lookAt(px * 0.4, py * 0.4, camZ - 12);
    const lag = secTarget - sec;
    camera.rotateZ(-lag * 0.035 - mouse.x * 0.012);

    // Sensation de vitesse : le champ de vision s'élargit pendant le défilement
    const fovT = 60 + (reducedMotion ? 0 : Math.min(Math.abs(lag) * 12, 14));
    camera.fov += (fovT - camera.fov) * (1 - Math.exp(-dt * 6));
    camera.updateProjectionMatrix();

    props.forEach((p) => p.update(t, dt, spin));

    gates.forEach((gt, i) => {
      const near = 1 - clamp(Math.abs(sec - gt.at) / 0.9, 0, 1);
      gt.outer.scale.setScalar(1 + near * 0.05);
      gt.inner.material.opacity = 0.18 + near * 0.5;
      gt.g.rotation.z += dt * 0.15 * spin * (i % 2 ? -1 : 1);
    });

    for (let i = 0; i < shards.count; i++) {
      const d = shardData[i];
      dummy.position.set(d.x, d.y + Math.sin(t * 0.6 + d.ph) * 0.35 * spin, d.z);
      dummy.rotation.set(t * d.rx * 0.6 * spin + d.ph, t * d.ry * 0.6 * spin, 0);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;

    stars.rotation.z = t * 0.004 * spin;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    start() { introStart = performance.now(); },
    setSection(v) { secTarget = clamp(v, 0, LEVELS - 1); },
  };
}
