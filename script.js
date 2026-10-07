// ============ КОНФИГ ============
const CONFIG = {
  herPhotos: [
    { src:'assets/her/1.jpg', caption:'моя любимоя:3' },
    { src:'assets/her/2.jpg', caption:'мяу' },
    { src:'assets/her/3.jpg', caption:'моё золотце' },
    { src:'assets/her/4.jpg', caption:'мой котёночек' },
    { src:'assets/her/5.jpg', caption:'буся муся' },
    { src:'assets/her/6.jpg', caption:'мяяяяя' }
  ],
  catPhotos: [
    { src:'assets/cat/1.jpg', caption:'ириска — королева дома' },
    { src:'assets/cat/2.jpg', caption:'самые мягкие лапки' },
    { src:'assets/cat/3.jpg', caption:'чемпионка по сну' },
    { src:'assets/cat/4.jpg', caption:'осуждает меня' },
    { src:'assets/cat/5.jpg', caption:'мяу' },
    { src:'assets/cat/6.jpg', caption:'маленькая звезда беатрисы' }
  ],

  coverPhotos: [
    { src:'assets/covers/1.jpg' },
    { src:'assets/covers/2.jpg' },
    { src:'assets/covers/3.jpg' },
    { src:'assets/covers/4.jpg' },
    { src:'assets/covers/5.jpg' },
    { src:'assets/covers/6.jpg' },
    { src:'assets/covers/7.jpg' },
    { src:'assets/covers/8.jpg' }
  ],

  panorama: 'assets/pano.jpg',

  finalText:
`Беатриса, ты для меня — как тихая галактика: огромная, тёплая, и я до сих пор не знаю, где ты заканчиваешься и где начинаюсь я.

Твои красные волосы — как рассвет, который я готов смотреть каждый день. Твой голос — как шум далёких звёзд, который я мог бы слушать вечно.

И где-то рядом всегда Ириска — маленькая луна, которая делает твою вселенную ещё мягче.

Спасибо, что ты есть. С днём рождения. ♡`
};

// ============ СОСТОЯНИЕ ============
let scene, camera, renderer;
let panoramaMat;
let heroCards = [];       // ★ только боковые карточки
let starLayers = [];
let nebulaMeshes = [];
let meteorSystem;
let dust;

let mouseX = 0, mouseY = 0, tX = 0, tY = 0;
let analyser, dataArray, audioCtx;
let glitchIntensity = 0.02;
let clock = new THREE.Clock();

const SCENES = 6;
let currentScene = 0;

let isTransitioning = false;
let directionLock = 0;
let lastMoveTime = 0;
const MIN_DELTA = 30;
const LOCK_DIRECTION_MS = 450;
const WHEEL_SETTLE_MS = 350;

let warpIntensity = 0;

const camPos        = { x:0, y:0, z:15 };
const camTarget     = { x:0, y:0, z:15 };
const camRot        = { x:0, y:0, z:0 };
const camRotTarget  = { x:0, y:0, z:0 };

// ============ ★★ ПОЗИЦИИ КАРТОЧЕК И КАМЕРЫ ★★ ============
const HERO_POSITIONS = [
  { cardX:-4.0, cardY: 0.3, cardZ: 11.0, cardRotY: 0.30,
    camX: 0.5, camY: 0.0, camZ: 15.0,  camRotY: 0.10 },
  { cardX: 4.0, cardY: 0.2, cardZ:  3.0, cardRotY:-0.30,
    camX:-0.5, camY: 0.0, camZ:  7.0,  camRotY:-0.10 },
  { cardX:-4.2, cardY: 0.6, cardZ: -5.0, cardRotY: 0.30,
    camX: 0.6, camY: 0.1, camZ: -1.0,  camRotY: 0.10 },
  { cardX: 4.2, cardY:-0.4, cardZ:-13.0, cardRotY:-0.30,
    camX:-0.6, camY:-0.1, camZ: -9.0,  camRotY:-0.10 },
  { cardX:-4.4, cardY: 0.1, cardZ:-21.0, cardRotY: 0.32,
    camX: 0.7, camY: 0.0, camZ:-17.0,  camRotY: 0.10 },
  { cardX: 4.4, cardY: 0.4, cardZ:-29.0, cardRotY:-0.32,
    camX:-0.7, camY: 0.2, camZ:-25.0,  camRotY:-0.10 }
];

// ============ ИНИЦИАЛИЗАЦИЯ ============
function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050014, 0.008);

  camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 500);
  camera.position.set(0, 0, 15);

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('scene'),
    antialias: true,
    alpha: true
  });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const panoGeo = new THREE.SphereGeometry(180, 64, 64);
  panoGeo.scale(-1, 1, 1);
  const panoTex = new THREE.TextureLoader().load(CONFIG.panorama);
  panoTex.colorSpace = THREE.SRGBColorSpace;
  panoramaMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(PanoShader.uniforms),
    vertexShader: PanoShader.vertexShader,
    fragmentShader: PanoShader.fragmentShader,
    side: THREE.BackSide
  });
  panoramaMat.uniforms.uTexture.value = panoTex;

  const panoMesh = new THREE.Mesh(panoGeo, panoramaMat);
  panoMesh.renderOrder = -1;
  scene.add(panoMesh);

  createStarLayers();
  createNebulas();
  createDust();
  createMeteors();
  createHeroCards();

  addEventListener('resize', onResize);
  addEventListener('mousemove', onMouse);
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('keydown', onKey);
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchend', onTouchEnd, { passive: true });

  document.querySelectorAll('#dotNav .dot').forEach(d => {
    d.addEventListener('click', (e) => {
      e.preventDefault();
      if (isTransitioning) return;
      const idx = +d.dataset.scene;
      lastMoveTime = performance.now();
      directionLock = idx > currentScene ? 1 : -1;
      gotoScene(idx);
    });
  });

  const p = CAM_PRESETS[0];
  camPos.x = camTarget.x = p.pos[0];
  camPos.y = camTarget.y = p.pos[1];
  camPos.z = camTarget.z = p.pos[2];
  camRot.x = camRotTarget.x = p.rot[0];
  camRot.y = camRotTarget.y = p.rot[1];
  camRot.z = camRotTarget.z = p.rot[2];

  animate();
}

// ============ ТЕКСТУРА ЗВЕЗДЫ ============
function makeStarTexture(rays = 4) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2, cy = size / 2;

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.18);
  core.addColorStop(0,   'rgba(255,255,255,1)');
  core.addColorStop(0.6, 'rgba(255,255,255,0.8)');
  core.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const len = size * 0.48;
    const grad = ctx.createLinearGradient(
      cx, cy,
      cx + Math.cos(angle) * len,
      cy + Math.sin(angle) * len
    );
    grad.addColorStop(0,   'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = size * 0.035;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.stroke();
  }

  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + Math.PI / rays;
    const len = size * 0.28;
    const grad = ctx.createLinearGradient(
      cx, cy,
      cx + Math.cos(angle) * len,
      cy + Math.sin(angle) * len
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============ СЛОИ ЗВЁЗД ============
function createStarLayers() {
  const starTex = makeStarTexture(4);
  const cfgs = [
    { count: 4000, spread: 300, depth: 120, size: 1.2, color: 0xffffff, opacity: 0.75, speed: 0.005 },
    { count: 2200, spread: 200, depth: 100, size: 1.8, color: 0xd8b4fe, opacity: 0.9,  speed: 0.015 },
    { count:  900, spread: 130, depth:  80, size: 2.8, color: 0xb026ff, opacity: 1.0,  speed: 0.03  }
  ];
  cfgs.forEach(cfg => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(cfg.count * 3);
    for (let i = 0; i < cfg.count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * cfg.spread;
      pos[i*3+1] = (Math.random() - 0.5) * cfg.spread;
      pos[i*3+2] = (Math.random() - 0.5) * cfg.depth - 15;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: cfg.color, size: cfg.size, map: starTex,
      transparent: true, opacity: cfg.opacity,
      blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true, alphaTest: 0.02
    });
    const points = new THREE.Points(geo, mat);
    points.userData.speed = cfg.speed;
    points.userData.baseSpread = cfg.depth;
    scene.add(points);
    starLayers.push(points);
  });
}

// ============ ТУМАННОСТИ ============
function createNebulas() {
  const tex = makeNebulaTexture();
  const cfgs = [
    { pos: [-30,  15,  10], scale: 90, color: 0x4b0082, opacity: 0.35 },
    { pos: [ 35, -12,  -5], scale: 80, color: 0x7b2ff7, opacity: 0.30 },
    { pos: [-15,  20, -15], scale: 70, color: 0xb026ff, opacity: 0.22 },
    { pos: [ 20, -25, -25], scale: 65, color: 0x8a2be2, opacity: 0.25 },
    { pos: [-25, -18, -35], scale: 60, color: 0x6a1b9a, opacity: 0.22 }
  ];
  cfgs.forEach(cfg => {
    const mat = new THREE.SpriteMaterial({
      map: tex, color: cfg.color, transparent:true, opacity: cfg.opacity,
      blending: THREE.AdditiveBlending, depthWrite:false
    });
    const s = new THREE.Sprite(mat);
    s.position.set(...cfg.pos);
    s.scale.set(cfg.scale, cfg.scale, 1);
    s.userData.rotSpeed = (Math.random() - 0.5) * 0.02;
    scene.add(s);
    nebulaMeshes.push(s);
  });
}
function makeNebulaTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.1)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============ ПЫЛЬ ============
function createDust() {
  const starTex = makeStarTexture(4);
  const COUNT = 3000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 200;
    pos[i*3+1] = (Math.random() - 0.5) * 200;
    pos[i*3+2] = (Math.random() - 0.5) * 120 - 10;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xb026ff, size: 1.6, map: starTex,
    transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
    alphaTest: 0.02
  });
  dust = new THREE.Points(geo, mat);
  scene.add(dust);
}

// ============ КАРТОЧКИ-ГЕРОИНИ (только они и остались) ============
function createHeroCards() {
  const loader = new THREE.TextureLoader();
  const pool = [...CONFIG.coverPhotos, ...CONFIG.herPhotos];

  for (let i = 0; i < SCENES; i++) {
    const source = pool[i % pool.length];
    const tex = loader.load(source.src);
    tex.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.PlaneGeometry(3.2, 3.2);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 1.0,
      depthTest: true,
      depthWrite: true
    });
    const mesh = new THREE.Mesh(geo, mat);

    const p = HERO_POSITIONS[i];
    mesh.position.set(p.cardX, p.cardY, p.cardZ);
    mesh.rotation.y = p.cardRotY;

    mesh.userData = {
      sceneIdx: i,
      baseX: p.cardX, baseY: p.cardY, baseZ: p.cardZ,
      baseRotY: p.cardRotY,
      phase:  Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      phase3: Math.random() * Math.PI * 2
    };

    mesh.visible = (i === 0);
    scene.add(mesh);
    heroCards.push(mesh);
  }
}

// ============ МЕТЕОРЫ ============
function createMeteors() {
  meteorSystem = new THREE.Group();
  scene.add(meteorSystem);
  for (let i = 0; i < 20; i++) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([0,0,0, 0.6,0.6,0]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color:0xd8b4fe, transparent:true, opacity:0.9 });
    const line = new THREE.Line(geo, mat);
    resetMeteor(line, true);
    meteorSystem.add(line);
  }
}
function resetMeteor(m, initial = false) {
  m.position.set(
    (Math.random() - 0.5) * 200,
    60 + Math.random() * 60,
    -60 + Math.random() * 100
  );
  m.userData.speed = 1.5 + Math.random() * 4;
  m.userData.delay = initial ? Math.random() * 6 : Math.random() * 4;
  m.material.opacity = 0;
}

// ============ СОБЫТИЯ ============
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
function onMouse(e) {
  mouseX = (e.clientX / innerWidth) * 2 - 1;
  mouseY = -(e.clientY / innerHeight) * 2 + 1;
}

// ============ ★ CAM_PRESETS ============
const CAM_PRESETS = HERO_POSITIONS.map(p => ({
  pos: [p.camX, p.camY, p.camZ],
  rot: [0, p.camRotY, 0]
}));

// ============ ПЕРЕХОД К СЦЕНЕ ============
function gotoScene(idx) {
  if (isTransitioning) return;
  if (idx < 0 || idx >= SCENES || idx === currentScene) return;

  isTransitioning = true;

  document.querySelectorAll('.scene').forEach((s, i) => {
    s.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('#dotNav .dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });

  heroCards.forEach((c, i) => {
    c.visible = (i === idx);
  });

  const p = CAM_PRESETS[idx];
  camTarget.x = p.pos[0];
  camTarget.y = p.pos[1];
  camTarget.z = p.pos[2];
  camRotTarget.x = p.rot[0];
  camRotTarget.y = p.rot[1];
  camRotTarget.z = p.rot[2];

  warpIntensity = 1.0;
  const startWarp = performance.now();
  const warpDur = 3000;
  function fadeWarp(now) {
    const k = (now - startWarp) / warpDur;
    warpIntensity = Math.max(0, Math.pow(1 - k, 1.4));
    if (k < 1) requestAnimationFrame(fadeWarp);
    else warpIntensity = 0;
  }
  requestAnimationFrame(fadeWarp);

  const linesEl = document.querySelector('.speed-lines');
  if (linesEl) {
    linesEl.classList.add('active');
    setTimeout(() => linesEl.classList.remove('active'), 2600);
  }

  if (idx === 4) startTypingOnce();
  if (idx === 5) startHeartsRainOnce();

  currentScene = idx;

  setTimeout(() => { isTransitioning = false; }, 3000);
}

// ============ ВВОД ============
function onWheel(e) {
  e.preventDefault();
  if (Math.abs(e.deltaY) < MIN_DELTA) return;
  if (isTransitioning) return;

  const now = performance.now();
  const dir = e.deltaY > 0 ? 1 : -1;

  if (now - lastMoveTime < LOCK_DIRECTION_MS && dir !== directionLock) return;
  if (now - lastMoveTime < WHEEL_SETTLE_MS) return;

  lastMoveTime = now;
  directionLock = dir;
  gotoScene(currentScene + dir);
}

function onKey(e) {
  if (isTransitioning) return;
  if (e.key === 'ArrowDown' || e.key === 'PageDown') {
    lastMoveTime = performance.now();
    directionLock = 1;
    gotoScene(currentScene + 1);
  }
  if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    lastMoveTime = performance.now();
    directionLock = -1;
    gotoScene(currentScene - 1);
  }
  if (e.key === 'Home') gotoScene(0);
  if (e.key === 'End')  gotoScene(SCENES - 1);
}

let touchStartY = 0;
let touchStartTime = 0;
function onTouchStart(e) {
  touchStartY = e.touches[0].clientY;
  touchStartTime = performance.now();
}
function onTouchEnd(e) {
  if (isTransitioning) return;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const dt = performance.now() - touchStartTime;
  if (Math.abs(dy) < 60) return;
  if (dt > 800) return;
  lastMoveTime = performance.now();
  directionLock = dy < 0 ? 1 : -1;
  gotoScene(currentScene + directionLock);
}

// ============ ПЕЧАТЬ / СЕРДЕЧКИ ============
let typingStarted = false;
function startTypingOnce() {
  if (typingStarted) return;
  typingStarted = true;
  typeText(CONFIG.finalText);
}
function typeText(text) {
  const el = document.getElementById('typing');
  el.textContent = '';
  let i = 0;
  const timer = setInterval(() => {
    el.textContent += text[i] || '';
    i++;
    if (i > text.length) clearInterval(timer);
  }, 28);
}

let heartsStarted = false;
function startHeartsRainOnce() {
  if (heartsStarted) return;
  heartsStarted = true;
  const box = document.getElementById('heartsRain');
  const hearts = ['♡','♥','✦','✧','✿','❀','☾','★'];
  const colors = ['#b026ff','#7b2ff7','#d8b4fe','#8a2be2','#ffffff'];
  setInterval(() => {
    const h = document.createElement('div');
    h.className = 'heart-float';
    h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    h.style.left = Math.random() * 100 + '%';
    h.style.fontSize = (14 + Math.random() * 22) + 'px';
    h.style.animationDuration = (6 + Math.random() * 6) + 's';
    h.style.color = colors[Math.floor(Math.random() * colors.length)];
    box.appendChild(h);
    setTimeout(() => h.remove(), 12000);
  }, 220);
}

// ============ АУДИО ============
function setupAudioReactive() {
  const audio = document.getElementById('bgMusic');
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    function reactLoop() {
      requestAnimationFrame(reactLoop);
      if (!analyser) return;
      analyser.getByteFrequencyData(dataArray);
      let avg = 0;
      for (let i = 0; i < dataArray.length; i++) avg += dataArray[i];
      avg /= dataArray.length;

      const intensity = (avg / 255) * 0.15;
      glitchIntensity = 0.015 + intensity;

      if (dust) {
        const s = 1 + intensity * 3;
        dust.scale.set(s, s, s);
        const hue = 0.75 + Math.sin(Date.now() * 0.001) * 0.06;
        dust.material.color.setHSL(hue, 1, 0.5 + intensity);
      }
    }
    reactLoop();
  } catch (e) {
    console.warn('Audio reactive fail:', e);
  }
}

// ============ ОБНОВЛЕНИЕ БОКОВЫХ КАРТОЧЕК ============
function updateHeroCards(t) {
  heroCards.forEach((m) => {
    const d = m.userData;

    m.position.x = d.baseX + Math.sin(t * 0.5 + d.phase)  * 0.2;
    m.position.y = d.baseY + Math.sin(t * 0.7 + d.phase2) * 0.25;
    m.position.z = d.baseZ + Math.cos(t * 0.4 + d.phase3) * 0.2;

    m.rotation.x = Math.sin(t * 0.6 + d.phase) * 0.05;
    m.rotation.y = d.baseRotY + Math.sin(t * 0.4 + d.phase2) * 0.1;
    m.rotation.z = Math.sin(t * 0.5 + d.phase3) * 0.04;

    const s = 1 + Math.sin(t * 0.9 + d.phase) * 0.03;
    m.scale.set(s, s, 1);
  });
}

// ============ АНИМАЦИЯ ============
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  const dz = camTarget.z - camPos.z;
  const dx = camTarget.x - camPos.x;
  const dy = camTarget.y - camPos.y;
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

  const baseSpeed = 0.018 + Math.min(dist * 0.006, 0.030);

  camPos.x += dx * baseSpeed;
  camPos.y += dy * baseSpeed;
  camPos.z += dz * baseSpeed;

  camRot.x += (camRotTarget.x - camRot.x) * 0.025;
  camRot.y += (camRotTarget.y - camRot.y) * 0.025;
  camRot.z += (camRotTarget.z - camRot.z) * 0.025;

  tX += (mouseX * 0.85 - tX) * 0.045;
  tY += (mouseY * 0.65 - tY) * 0.045;

  camera.position.set(camPos.x, camPos.y, camPos.z);
  camera.rotation.x = camRot.x + tY * 0.75;
  camera.rotation.y = camRot.y - tX * 0.75;
  camera.rotation.z = camRot.z + Math.sin(t * 0.3) * 0.01;

  starLayers.forEach((layer, i) => {
    layer.position.z = -t * layer.userData.speed * 4 + camPos.z;
    layer.position.x = camPos.x * 0.5;
    layer.position.y = camPos.y * 0.5;
    if (layer.position.z < -layer.userData.baseSpread * 2) {
      layer.position.z = layer.userData.baseSpread;
    }
    layer.rotation.y = t * 0.01 * (i + 1);
  });

  nebulaMeshes.forEach((n, i) => {
    n.material.rotation += n.userData.rotSpeed * 0.01;
    n.scale.setScalar(n.scale.x * 0.999 + Math.sin(t * 0.3 + i) * 0.05);
  });

  if (panoramaMat) {
    panoramaMat.uniforms.uTime.value = t;
    panoramaMat.uniforms.uGlitch.value = glitchIntensity + warpIntensity * 0.25;
    panoramaMat.uniforms.uRGB.value = 0.004 + warpIntensity * 0.02;
  }

  updateHeroCards(t);

  meteorSystem.children.forEach(m => {
    m.userData.delay -= 0.016;
    if (m.userData.delay <= 0) {
      m.material.opacity = Math.min(1, m.material.opacity + 0.05);
      m.position.x -= m.userData.speed * 0.8;
      m.position.y -= m.userData.speed * 0.6;
      m.position.z += m.userData.speed * 0.3;
      if (m.position.x < -160 || m.position.y < -100) resetMeteor(m);
    }
  });

  if (dust) {
    dust.rotation.y = t * 0.05;
    dust.rotation.x = t * 0.02;
  }

  renderer.render(scene, camera);
}

// ============ ПОСТРОЕНИЕ ГАЛЕРЕЙ ============
function buildGallery(containerId, list) {
  const box = document.getElementById(containerId);
  if (!box) return;
  list.forEach((p, i) => {
    const slot = document.createElement('div');
    slot.className = 'photo-slot';
    slot.innerHTML = `
      <img src="${p.src}" alt="фото ${i+1}" loading="lazy"
           onerror="this.parentElement.classList.add('empty'); this.remove(); this.parentElement.innerHTML='<div class=&quot;placeholder&quot;>добавь фото сюда ♡</div>';">
      <div class="caption">${p.caption}</div>
    `;
    box.appendChild(slot);
  });
}

// ============ СТАРТ ============
window.addEventListener('load', () => {
  buildGallery('herGallery', CONFIG.herPhotos);
  buildGallery('catGallery', CONFIG.catPhotos);

  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('loader').classList.add('hide');
    const audio = document.getElementById('bgMusic');
    audio.volume = 0.5;
    audio.play().then(() => setupAudioReactive())
                .catch(err => console.warn('Audio blocked:', err));

    init();

    document.querySelector('.scene[data-scene="0"]').classList.add('active');
  });

  const musicBtn = document.getElementById('musicBtn');
  const bgAudio  = document.getElementById('bgMusic');

  musicBtn.addEventListener('click', () => {
    bgAudio.muted = !bgAudio.muted;
    musicBtn.classList.toggle('muted', bgAudio.muted);
    musicBtn.classList.toggle('playing', !bgAudio.muted);
  });
});