// 3D scenes (three.js) for the presentation.
// Each scene is initialized lazily the first time its slide becomes
// visible, and only renders while that slide is present.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Bilingual UI: the Spanish deck sets lang="es", the English deck lang="en".
const LANG = document.documentElement.lang.startsWith('en') ? 'en' : 'es';
const tr = (en, es) => (LANG === 'en' ? en : es);

const C = {
  navy: 0x14213d,
  orange: 0xff9a3c,
  blue: 0x6fa8ff,
  green: 0x7ddc8a,
  gray: 0x5a6680,
  white: 0xf2f5fb,
  purple: 0xb48cff,
};

// ---------- utilities ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rng) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
const expit = (x) => 1 / (1 + Math.exp(-x));

function revealScale() {
  try { return window.Reveal?.getScale?.() || 1; } catch { return 1; }
}

function makeRenderer(el) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  el.prepend(renderer.domElement);
  el._threeRenderer = renderer; // so it can be released if the factory fails halfway
  return renderer;
}

function label(text, { color = '#ffffff', size = 0.55, italic = true } = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.font = `${italic ? 'italic ' : ''}600 76px "Source Sans 3", Georgia, serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 10;
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(size * 4, size, 1);
  s.renderOrder = 10;
  return s;
}

function arrow(from, to, color, rFrom = 0.45, rTo = 0.45) {
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  const start = from.clone().addScaledVector(dir, rFrom);
  const end = to.clone().addScaledVector(dir, -rTo);
  const L = start.distanceTo(end);
  const headL = 0.34;
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.35, transparent: true, opacity: 1,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, L - headL, 14), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, headL, 20), mat);
  shaft.position.y = (L - headL) / 2;
  head.position.y = L - headL / 2;
  const g = new THREE.Group();
  g.add(shaft, head);
  g.position.copy(start);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.userData = { mat, start, end };
  return g;
}

function addLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const d = new THREE.DirectionalLight(0xffffff, 1.4);
  d.position.set(4, 8, 6);
  scene.add(d);
  const d2 = new THREE.DirectionalLight(0x88aaff, 0.5);
  d2.position.set(-6, -2, -4);
  scene.add(d2);
}

function overlay(el, html) {
  const div = document.createElement('div');
  div.className = 'overlay';
  div.innerHTML = html;
  el.appendChild(div);
  return div;
}
function statusBox(el) {
  const div = document.createElement('div');
  div.className = 'status';
  el.appendChild(div);
  return div;
}
function hint(el, text) {
  const div = document.createElement('div');
  div.className = 'hint';
  div.textContent = text;
  el.appendChild(div);
}

// ---------- Scene 1: cover causal network ----------
function heroScene(el) {
  const renderer = makeRenderer(el);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 15);
  addLights(scene);

  const rng = mulberry32(7);
  const group = new THREE.Group();
  group.position.x = 3.2;
  scene.add(group);

  const N = 70;
  const pts = [];
  for (let i = 0; i < N; i++) {
    // layers along x to suggest a causal ordering (DAG)
    const x = -6 + (12 * i) / (N - 1) + randn(rng) * 0.4;
    const r = 3.2 * Math.sqrt(rng());
    const th = 2 * Math.PI * rng();
    pts.push(new THREE.Vector3(x, r * Math.cos(th), r * Math.sin(th)));
  }
  const nodeGeo = new THREE.SphereGeometry(0.11, 16, 16);
  pts.forEach((p, i) => {
    const col = i % 5 === 0 ? C.orange : C.blue;
    const m = new THREE.Mesh(nodeGeo, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 }));
    m.position.copy(p);
    group.add(m);
  });

  // edges: each node points to 2 nearby later nodes (acyclicity)
  const edges = [];
  for (let i = 0; i < N; i++) {
    const cand = [];
    for (let j = i + 1; j < N; j++) cand.push([pts[i].distanceTo(pts[j]), j]);
    cand.sort((a, b) => a[0] - b[0]);
    cand.slice(0, 2).forEach(([, j]) => edges.push([i, j]));
  }
  const pos = new Float32Array(edges.length * 6);
  edges.forEach(([i, j], k) => {
    pos.set([pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z], k * 6);
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.28 })));

  // pulses traveling along edges: "causal flow"
  const P = 60;
  const pulseGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffd2a0 });
  const pulses = [];
  for (let k = 0; k < P; k++) {
    const m = new THREE.Mesh(pulseGeo, pulseMat);
    group.add(m);
    pulses.push({ m, e: edges[Math.floor(rng() * edges.length)], t: rng(), v: 0.25 + rng() * 0.4 });
  }

  let mx = 0, my = 0;
  el.addEventListener('pointermove', (ev) => {
    const r = el.getBoundingClientRect();
    mx = ((ev.clientX - r.left) / r.width - 0.5) * 2;
    my = ((ev.clientY - r.top) / r.height - 0.5) * 2;
  });

  return {
    renderer, scene, camera,
    tick(t, dt) {
      group.rotation.x = 0.25 * Math.sin(t * 0.15);
      group.rotation.y += dt * 0.08;
      camera.position.x += (mx * 1.5 - camera.position.x) * 0.03;
      camera.position.y += (-my * 1.0 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
      for (const p of pulses) {
        p.t += dt * p.v;
        if (p.t > 1) {
          // continue along an edge leaving the arrival node, if one exists
          const nxt = edges.filter((e) => e[0] === p.e[1]);
          p.e = nxt.length ? nxt[Math.floor(rng() * nxt.length)] : edges[Math.floor(rng() * edges.length)];
          p.t = 0;
        }
        p.m.position.lerpVectors(pts[p.e[0]], pts[p.e[1]], p.t);
      }
    },
  };
}

// ---------- Scene 2: DAG with do(T) surgery ----------
function dagScene(el) {
  const renderer = makeRenderer(el);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0.5, 2.2, 10.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.1, 0);
  controls.saveState(); // Reset returns to this framing
  addLights(scene);

  const P = {
    T: new THREE.Vector3(-3.3, 0, 0),
    M: new THREE.Vector3(0, 0, 0.3),
    Y: new THREE.Vector3(3.3, 0, 0),
    X: new THREE.Vector3(-0.3, -2.1, 1.6),
    U: new THREE.Vector3(0, 2.5, -1.3),
  };
  const nodeColor = { T: C.orange, M: C.blue, Y: C.green, X: 0xc9d3e6, U: C.purple };
  const nodes = {};
  for (const k of Object.keys(P)) {
    const g = new THREE.Group();
    g.position.copy(P[k]);
    const mat = new THREE.MeshStandardMaterial({
      color: nodeColor[k], emissive: nodeColor[k], emissiveIntensity: 0.25,
      roughness: 0.35, metalness: 0.1, transparent: k === 'U', opacity: k === 'U' ? 0.35 : 1,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 32), mat);
    sphere.userData.node = k;
    g.add(sphere);
    if (k === 'U') {
      const wire = new THREE.Mesh(new THREE.SphereGeometry(0.47, 14, 10), new THREE.MeshBasicMaterial({ color: C.purple, wireframe: true, transparent: true, opacity: 0.6 }));
      g.add(wire);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 12, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.visible = false;
    g.add(ring);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), new THREE.MeshStandardMaterial({ color: C.orange, emissive: C.orange, emissiveIntensity: 0.5 }));
    box.visible = false;
    box.userData.node = k;
    g.add(box);
    const lab = label(k === 'U' ? tr('U (unobs.)', 'U (no obs.)') : k, { size: 0.5 });
    lab.position.set(0, 0.85, 0);
    g.add(lab);
    scene.add(g);
    nodes[k] = { g, sphere, ring, box, lab };
  }
  const doLabel = label('do(T = t)', { color: '#ffd2a0', size: 0.42, italic: false });
  doLabel.position.set(0, -0.9, 0);
  doLabel.visible = false;
  nodes.T.g.add(doLabel);

  const E = [['X', 'T'], ['X', 'Y'], ['U', 'T'], ['U', 'Y'], ['T', 'M'], ['M', 'Y']];
  const edges = {};
  for (const [a, b] of E) {
    const ar = arrow(P[a], P[b], C.gray);
    scene.add(ar);
    edges[a + b] = ar;
  }

  // pulses
  const pulseGeo = new THREE.SphereGeometry(0.09, 12, 12);
  const pulses = [];
  for (const key of Object.keys(edges)) {
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      scene.add(m);
      pulses.push({ m, key, t: k / 3 });
    }
  }

  const ui = overlay(el, `
    <button data-k="doT">${tr('do(T): intervene', 'do(T): intervenir')}</button>
    <button data-k="adjX">${tr('Adjust for X', 'Ajustar por X')}</button>
    <button data-k="adjM">${tr('Adjust for M', 'Ajustar por M')}</button>
    <button data-k="reset">${tr('Reset', 'Reiniciar')}</button>`);
  const status = statusBox(el);
  hint(el, tr('Drag to rotate · scroll to zoom · click T, X or M', 'Arrastra para rotar · rueda para zoom · clic en T, X o M'));

  const S = { doT: false, adjX: false, adjM: false };
  const litColor = {};

  function update() {
    const bd1 = !S.doT && !S.adjX; // T <- X -> Y
    const bd2 = !S.doT;            // T <- U -> Y
    const causal = !S.adjM;        // T -> M -> Y
    const set = (key, color, opacity = 1) => {
      const m = edges[key].userData.mat;
      m.color.setHex(color); m.emissive.setHex(color); m.opacity = opacity;
      litColor[key] = opacity > 0.5 && color !== C.gray ? color : null;
    };
    set('XT', S.doT ? C.gray : bd1 ? C.orange : C.gray, S.doT ? 0.06 : 1);
    set('UT', S.doT ? C.gray : C.orange, S.doT ? 0.06 : 1);
    set('XY', bd1 ? C.orange : C.gray, 1);
    set('UY', bd2 ? C.orange : C.gray, 1);
    set('TM', causal ? C.green : C.gray, 1);
    set('MY', causal ? C.green : C.gray, 1);
    nodes.X.ring.visible = S.adjX;
    nodes.M.ring.visible = S.adjM;
    nodes.T.box.visible = S.doT;
    nodes.T.sphere.visible = !S.doT;
    doLabel.visible = S.doT;
    ui.querySelectorAll('button[data-k]').forEach((b) => b.classList.toggle('on', !!S[b.dataset.k]));

    const opened = () => `<span class="bad">${tr('open', 'abierto')}</span>`;
    const blocked = () => `<span class="ok">${tr('blocked', 'bloqueado')}</span>`;
    const tag = (isOpen) => (isOpen ? opened() : blocked());
    // A causal path being open is good news; a backdoor being open is bad news.
    const causalTag = (isOpen) => (isOpen
      ? `<span class="ok">${tr('open', 'abierto')}</span>`
      : `<span class="bad">${tr('blocked', 'bloqueado')}</span>`);
    let verdict;
    if (S.adjM) verdict = `<span class="bad">${tr('Overadjustment', 'Sobrecontrol')}:</span> ${tr('conditioning on the mediator M blocks exactly the effect we want to measure.', 'condicionar en el mediador M bloquea justo el efecto que queremos medir.')}`;
    else if (S.doT) verdict = `<span class="ok">${tr('Graph surgery', 'Cirugía del grafo')}:</span> ${tr('arrows into T are deleted. No backdoor remains — this is what randomization does.', 'se borran las flechas hacia T. No queda ninguna puerta trasera; es lo que hace un experimento aleatorizado.')}`;
    else if (bd2) verdict = `<b>U</b> ${tr('is unobserved: no backdoor adjustment identifies the effect. The <b>frontdoor</b> path via M does.', 'no se observa: ningún ajuste por puerta trasera identifica el efecto. La <b>puerta frontal</b> vía M sí lo identifica.')}`;
    status.innerHTML = `
      <div>${tr('Backdoor', 'Puerta trasera')} T ← X → Y: ${tag(bd1)}</div>
      <div>${tr('Backdoor', 'Puerta trasera')} T ← U → Y: ${tag(bd2)}</div>
      <div>${tr('Causal path', 'Camino causal')} T → M → Y: ${causalTag(causal)}</div>
      <div style="margin-top:6px">${verdict}</div>`;
  }
  ui.addEventListener('click', (ev) => {
    const k = ev.target.closest('button')?.dataset.k;
    if (!k) return;
    if (k === 'reset') { S.doT = S.adjX = S.adjM = false; controls.reset(); } else S[k] = !S[k];
    update();
  });

  // clicking nodes
  const ray = new THREE.Raycaster();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (ev) => { down = [ev.clientX, ev.clientY]; });
  renderer.domElement.addEventListener('pointerup', (ev) => {
    if (!down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, camera);
    const objs = Object.values(nodes).flatMap((n) => [n.sphere, n.box]).filter((o) => o.visible);
    const hit = ray.intersectObjects(objs)[0];
    const k = hit?.object.userData.node;
    const map = { T: 'doT', X: 'adjX', M: 'adjM' };
    if (map[k]) { S[map[k]] = !S[map[k]]; update(); }
  });
  update();

  return {
    renderer, scene, camera, controls,
    tick(t, dt) {
      for (const p of pulses) {
        const col = litColor[p.key];
        p.m.visible = !!col;
        if (!col) continue;
        p.m.material.color.setHex(col === C.green ? 0xd8ffd9 : 0xffe1c2);
        p.t = (p.t + dt * 0.45) % 1;
        const { start, end } = edges[p.key].userData;
        p.m.position.lerpVectors(start, end, p.t);
      }
      nodes.U.g.rotation.y += dt * 0.4;
      nodes.X.ring.rotation.y += dt * 1.2;
      nodes.M.ring.rotation.y += dt * 1.2;
      nodes.T.box.rotation.y += dt * 0.6;
    },
  };
}

// ---------- Scene 3: propensity score surface ----------
function propensityScene(el) {
  const renderer = makeRenderer(el);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(7.5, 6.5, 9);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.3, 0);
  controls.saveState(); // Reset returns to this framing
  addLights(scene);

  const K = 1.6;   // scale X into world coordinates
  const H = 3.2;   // height at e(x) = 1
  const R = 2.5;   // domain [-R, R]
  const SEG = 60;

  const grid = new THREE.GridHelper(2 * R * K, 10, 0x40507a, 0x2a3658);
  scene.add(grid);
  const axisMat = new THREE.LineBasicMaterial({ color: 0x8ea0c4 });
  const axisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-R * K, 0, -R * K), new THREE.Vector3(-R * K, H, -R * K)]);
  scene.add(new THREE.Line(axisGeo, axisMat));
  const top = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-R * K, H, -R * K), new THREE.Vector3(R * K, H, -R * K)]), new THREE.LineDashedMaterial({ color: 0x8ea0c4, dashSize: 0.2, gapSize: 0.15 }));
  top.computeLineDistances();
  scene.add(top);
  const lx = label('X₁', { size: 0.45 }); lx.position.set(R * K + 0.6, 0, 0); scene.add(lx);
  const lz = label('X₂', { size: 0.45 }); lz.position.set(0, 0, R * K + 0.6); scene.add(lz);
  const le = label('e(X)', { size: 0.45 }); le.position.set(-R * K, H + 0.5, -R * K); scene.add(le);
  const l1 = label('1', { size: 0.35, italic: false }); l1.position.set(-R * K - 0.4, H, -R * K); scene.add(l1);

  const geo = new THREE.PlaneGeometry(2 * R * K, 2 * R * K, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const colors = new Float32Array(geo.attributes.position.count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const surf = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.62, roughness: 0.6,
  }));
  const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.07 }));
  scene.add(surf, wire);

  const n = 300;
  const rng = mulberry32(2026);
  const data = Array.from({ length: n }, () => ({ x1: randn(rng), x2: randn(rng), u: rng() }));
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 12), new THREE.MeshStandardMaterial({ roughness: 0.4 }), n);
  scene.add(inst);

  const ui = overlay(el, `
    <label>${tr('Confounding', 'Confusión')} γ <input type="range" min="0" max="4" step="0.1" value="1"><span class="gv">1.0</span></label>
    <button data-k="w">${tr('Size = IPW weight', 'Tamaño = peso IPW')}</button>`);
  const status = statusBox(el);
  hint(el, tr('Orange: treated · blue: control · drag to rotate', 'Naranja: tratados · azul: control · arrastra para rotar'));
  const slider = ui.querySelector('input');
  const S = { gamma: 1, w: false };
  const cBlue = new THREE.Color(0x4f8cff), cOrange = new THREE.Color(0xff9a3c), tmp = new THREE.Color();
  const dummy = new THREE.Object3D();

  const e = (x1, x2) => expit(S.gamma * (x1 + 0.6 * x2));
  function update() {
    ui.querySelector('.gv').textContent = S.gamma.toFixed(1);
    ui.querySelector('button').classList.toggle('on', S.w);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x1 = p.getX(i) / K, x2 = p.getZ(i) / K;
      const v = e(x1, x2);
      p.setY(i, H * v);
      tmp.copy(cBlue).lerp(cOrange, v);
      colors.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    p.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();

    let sw = 0, sw2 = 0, wmax = 0, extreme = 0, nt = 0;
    data.forEach((d, i) => {
      const ei = e(d.x1, d.x2);
      const T = d.u < ei ? 1 : 0;
      nt += T;
      const w = T ? 1 / ei : 1 / (1 - ei);
      sw += w; sw2 += w * w; wmax = Math.max(wmax, w);
      if (ei < 0.05 || ei > 0.95) extreme++;
      const s = S.w ? Math.min(0.55, 0.045 * Math.sqrt(w)) : 0.075;
      dummy.position.set(d.x1 * K, H * ei + 0.04, d.x2 * K);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, T ? cOrange : cBlue);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.instanceColor.needsUpdate = true;
    const ess = (sw * sw) / sw2;
    status.innerHTML = `
      <div>e(x) = expit(γ·(x₁ + 0.6·x₂)), γ = <b>${S.gamma.toFixed(1)}</b></div>
      <div>${tr('Treated', 'Tratados')}: ${nt} ${tr('of', 'de')} ${n}</div>
      <div>${tr('Max IPW weight', 'Peso IPW máximo')}: <b>${wmax.toFixed(1)}</b></div>
      <div>${tr('Effective sample size', 'Tamaño muestral efectivo')}: <b>${ess.toFixed(0)}</b> ${tr('of', 'de')} ${n}</div>
      <div>${tr('Units with', 'Unidades con')} e(x) &lt; 0.05 ${tr('or', 'o')} &gt; 0.95: <b class="${extreme > 30 ? 'bad' : 'ok'}">${extreme}</b></div>
      <div style="margin-top:6px">${S.gamma > 2.5 ? `<span class="bad">${tr('Positivity nearly violated', 'Positividad casi violada')}:</span> ${tr('a few weights dominate the estimator.', 'pocos pesos dominan el estimador.')}` : (wmax > 10 || extreme > 5) ? `<span class="bad">${tr('Overlap is weakening', 'El solapamiento se debilita')}:</span> ${tr('a few weights are already large — watch the effective sample size.', 'unos pocos pesos ya son grandes — vigila el tamaño muestral efectivo.')}` : tr('Good overlap: weights are moderate.', 'Buen solapamiento: los pesos son moderados.')}</div>`;
  }
  slider.addEventListener('input', () => { S.gamma = +slider.value; update(); });
  ui.querySelector('button').addEventListener('click', () => { S.w = !S.w; update(); });
  update();

  return { renderer, scene, camera, controls, tick() {} };
}

// ---------- Scene 4: conjugate Bayesian posterior ----------
function bayesScene(el) {
  const renderer = makeRenderer(el);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(6.5, 6, 8.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);
  controls.saveState(); // Reset returns to this framing
  addLights(scene);

  // Data: y = 1 + 2 T + e, sigma = 1, balanced design
  const rng = mulberry32(11);
  const NMAX = 500;
  const D = Array.from({ length: NMAX }, (_, i) => {
    const T = i % 2;
    return { T, y: 1 + 2 * T + randn(rng) };
  });
  const truth = [1, 2];
  const ctr = [1, 1.2]; // view center (alpha, tau)
  const K = 1.7, H = 3, SEG = 70;
  const span = 2.4;     // +/- in parameter units
  const toW = (a, t) => [(a - ctr[0]) * K, (t - ctr[1]) * K];

  scene.add(new THREE.GridHelper(2 * span * K, 12, 0x40507a, 0x2a3658));
  const la = label(tr('α (intercept)', 'α (intercepto)'), { size: 0.4 }); la.position.set(span * K + 0.3, 0, 0); scene.add(la);
  const lt = label(tr('τ (effect)', 'τ (efecto)'), { size: 0.4 }); lt.position.set(0, 0, span * K + 0.6); scene.add(lt);

  const mkSurf = (opts) => {
    const g = new THREE.PlaneGeometry(2 * span * K, 2 * span * K, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    return g;
  };
  const gPost = mkSurf();
  const cols = new Float32Array(gPost.attributes.position.count * 3);
  gPost.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const post = new THREE.Mesh(gPost, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.85, roughness: 0.5 }));
  const gPrior = mkSurf();
  const prior = new THREE.Mesh(gPrior, new THREE.MeshBasicMaterial({ color: C.blue, wireframe: true, transparent: true, opacity: 0.22 }));
  scene.add(post, prior);

  const pillar = (color, text) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), new THREE.MeshBasicMaterial({ color }));
    m.position.y = 0.5;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), new THREE.MeshBasicMaterial({ color }));
    const lab = label(text, { size: 0.32, italic: false, color: '#' + new THREE.Color(color).getHexString() });
    g.add(m, ball, lab);
    g.userData = { m, ball, lab };
    scene.add(g);
    return g;
  };
  const pPrior = pillar(C.blue, tr('prior mean', 'media a priori'));
  const pOls = pillar(C.orange, tr('OLS', 'MCO'));
  const pPost = pillar(C.white, tr('posterior mean', 'media posterior'));
  const pTrue = pillar(C.green, tr('truth', 'verdad'));
  const placePillar = (p, a, t, h) => {
    const [x, z] = toW(a, t);
    p.position.set(x, 0, z);
    p.userData.m.scale.y = h; p.userData.m.position.y = h / 2;
    p.userData.ball.position.y = h;
    p.userData.lab.position.y = h + 0.3;
  };

  const ui = overlay(el, `
    <label>n <input type="range" data-k="n" min="0" max="1" step="0.01" value="0.25"><span class="nv"></span></label>
    <label>${tr('prior sd', 'sd a priori')} <input type="range" data-k="s" min="-1.3" max="0.7" step="0.01" value="-0.5"><span class="sv"></span></label>`);
  const status = statusBox(el);
  hint(el, tr('Blue mesh: prior · surface: posterior · drag to rotate', 'Malla azul: prior · superficie: posterior · arrastra para rotar'));
  const cLo = new THREE.Color(0x1e3a7a), cHi = new THREE.Color(0xffb15c), tmp = new THREE.Color();

  const inv2 = (A) => { const d = A[0] * A[3] - A[1] * A[2]; return [A[3] / d, -A[1] / d, -A[2] / d, A[0] / d]; };
  const mul2v = (A, v) => [A[0] * v[0] + A[1] * v[1], A[2] * v[0] + A[3] * v[1]];
  const quad = (P, dx) => dx[0] * (P[0] * dx[0] + P[1] * dx[1]) + dx[1] * (P[2] * dx[0] + P[3] * dx[1]);

  function update() {
    const n = Math.round(4 * Math.pow(NMAX / 4, +ui.querySelector('[data-k=n]').value));
    const s0 = Math.pow(10, +ui.querySelector('[data-k=s]').value);
    ui.querySelector('.nv').textContent = n;
    ui.querySelector('.sv').textContent = s0.toFixed(2);
    // X'X and X'y with X = [1, T]
    let n1 = 0, sy = 0, sty = 0;
    for (let i = 0; i < n; i++) { n1 += D[i].T; sy += D[i].y; sty += D[i].T * D[i].y; }
    const XtX = [n, n1, n1, n1];
    const Xty = [sy, sty];
    const P0 = [1 / s0 ** 2, 0, 0, 1 / s0 ** 2];
    const Ppost = [XtX[0] + P0[0], XtX[1], XtX[2], XtX[3] + P0[3]]; // sigma^2 = 1
    const S = inv2(Ppost);
    const m = mul2v(S, Xty); // mu0 = 0
    const ols = mul2v(inv2(XtX), Xty);
    const detPost = Ppost[0] * Ppost[3] - Ppost[1] * Ppost[2];
    const detPrior = P0[0] * P0[3];
    const ratio = Math.sqrt(detPrior / detPost); // prior density / posterior peak

    const pp = gPost.attributes.position, pr = gPrior.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const a = pp.getX(i) / K + ctr[0], t = pp.getZ(i) / K + ctr[1];
      const hp = Math.exp(-0.5 * quad(Ppost, [a - m[0], t - m[1]]));
      pp.setY(i, H * hp);
      tmp.copy(cLo).lerp(cHi, hp);
      cols.set([tmp.r, tmp.g, tmp.b], i * 3);
      const h0 = ratio * Math.exp(-0.5 * quad(P0, [a, t]));
      pr.setY(i, Math.min(1.4 * H, H * h0));
    }
    pp.needsUpdate = pr.needsUpdate = true;
    gPost.attributes.color.needsUpdate = true;
    gPost.computeVertexNormals();

    placePillar(pPrior, 0, 0, 0.6);
    placePillar(pOls, ols[0], ols[1], H + 0.45);
    placePillar(pPost, m[0], m[1], H + 0.95);
    placePillar(pTrue, truth[0], truth[1], 0.9);
    const sdTau = Math.sqrt(S[3]);
    // Relative shrinkage is undefined when the OLS effect is essentially zero.
    const hasOlsSignal = Math.abs(ols[1]) > 1e-3;
    const shrink = hasOlsSignal ? 1 - m[1] / ols[1] : 0;
    const verdict = !hasOlsSignal
      ? tr('The data carry little signal about the effect, so the posterior mostly reflects the prior.', 'Los datos aportan poca señal sobre el efecto, así que la posterior refleja sobre todo el prior.')
      : shrink > 0.25
        ? tr('Strong prior or little data: the posterior stays near μ₀.', 'Prior fuerte o pocos datos: la posterior se queda cerca de μ₀.')
        : tr('Data dominate: the posterior moves toward OLS and tightens.', 'Los datos dominan: la posterior se acerca a MCO y se concentra.');
    status.innerHTML = `
      <div>β | D ~ N(m, S), σ² = 1, μ₀ = 0, Σ₀ = ${s0.toFixed(2)}² I</div>
      <div>τ̂<sub>${tr('OLS', 'MCO')}</sub> = <b>${ols[1].toFixed(2)}</b> · E(τ | D) = <b>${m[1].toFixed(2)}</b> · sd(τ | D) = <b>${sdTau.toFixed(2)}</b></div>
      <div>${tr('Shrinkage toward', 'Contracción hacia')} μ₀: <b>${hasOlsSignal ? (100 * shrink).toFixed(0) + '%' : 'n/a'}</b></div>
      <div style="margin-top:6px">${verdict}</div>`;
  }
  ui.addEventListener('input', update);
  update();

  return { renderer, scene, camera, controls, tick() {} };
}

// ---------- registration and loop ----------
const FACTORIES = { hero: heroScene, dag: dagScene, propensity: propensityScene, bayes: bayesScene };
const items = [];
document.querySelectorAll('[data-three]').forEach((el) => {
  const f = FACTORIES[el.dataset.three];
  if (f) items.push({ el, f, inst: null, failed: false, w: 0, h: 0, pr: 0 });
});

// In print/PDF mode (?print-pdf) no slide has the `present` class,
// so render them all to avoid a blank PDF.
const isPrinting = () => document.documentElement.classList.contains('print-pdf') ||
  !!window.Reveal?.isPrintingPDF?.();
const isPresent = (el) => {
  if (isPrinting()) return true;
  const s = el.closest('section');
  return !!s && s.classList.contains('present') && !s.classList.contains('stack');
};

function fail(it, err) {
  console.error('[three]', err);
  it.failed = true;
  // Release the WebGL context and controls (also if the factory failed halfway)
  try { it.inst?.controls?.dispose(); } catch {}
  const r = it.inst?.renderer || it.el._threeRenderer;
  if (r) { try { r.dispose(); r.forceContextLoss(); } catch {} }
  it.inst = null;
  it.el._threeRenderer = null;
  it.el.querySelectorAll('canvas, .overlay, .status, .hint').forEach((n) => n.remove());
  const msg = document.createElement('div');
  msg.className = 'three-error';
  msg.textContent = tr('Could not start the 3D scene (WebGL unavailable or load error). Try reloading the page.', 'No se pudo iniciar la escena 3D (WebGL no disponible o error de carga). Prueba a recargar la página.');
  it.el.appendChild(msg);
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  for (const it of items) {
    if (it.failed || !isPresent(it.el)) continue;
    try {
      if (!it.inst) {
        it.inst = it.f(it.el);
        if (!it.inst) throw new Error(`la escena «${it.el.dataset.three}» no devolvió una instancia`);
      }
      const { renderer, camera, scene, controls } = it.inst;
      const w = it.el.clientWidth, h = it.el.clientHeight;
      const pr = Math.min(2.5, (window.devicePixelRatio || 1) * revealScale());
      if (w !== it.w || h !== it.h || Math.abs(pr - it.pr) > 0.01) {
        it.w = w; it.h = h; it.pr = pr;
        renderer.setPixelRatio(pr);
        renderer.setSize(w, h, true);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      it.inst.tick(t, dt);
      controls?.update();
      renderer.render(scene, camera);
    } catch (err) {
      // A failure in one scene must not stop the rest of the loop
      fail(it, err);
    }
  }
}
loop();
