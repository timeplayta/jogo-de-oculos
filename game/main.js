import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

// ---------------------------------------------------------------------------
// Sistema de itens (autorização / destino)
// ---------------------------------------------------------------------------
const ITEM_SYSTEM = [
  {
    id: "usb-c",
    name: "Cabos USB-C",
    category: "eletrônicos",
    desc: "Lote selado · 40 un.",
    meta: "Peso 8.2 kg · SKU E-118",
    inside: "40 cabos USB-C 2m enrolados em plástico bolha.",
    authorized: false,
    disposition: "quarantine",
    reason: "Pedido cancelado. Não pode sair na van.",
    markForVan: false,
  },
  {
    id: "parafusos",
    name: "Parafusos M6",
    category: "ferragens",
    desc: "Caixa metálica M6x20.",
    meta: "Peso 12 kg · SKU F-044",
    inside: "Parafusos a granel com óleo residual — lote sujo.",
    authorized: false,
    disposition: "quarantine",
    reason: "Contaminação detectada. Enviar à quarentena.",
    markForVan: false,
  },
  {
    id: "sensor-iot",
    name: "Sensor IoT",
    category: "eletrônicos",
    desc: "Módulos com chip IA. Pedido #A-204.",
    meta: "Peso 4.1 kg · prioridade A · SLA 18 min",
    inside: "6 sensores IoT com chip IA, embalados e etiquetados A-204.",
    authorized: true,
    disposition: "van",
    reason: "Liberado para expedição na van.",
    markForVan: true,
    target: true,
  },
  {
    id: "kraft",
    name: "Embalagem Kraft",
    category: "embalagens",
    desc: "Folhas A3 para reembalar.",
    meta: "Peso 3.0 kg · SKU P-012",
    inside: "Resma de kraft A3 sem pedido ativo.",
    authorized: false,
    disposition: "return",
    reason: "Sem pedido. Devolver à prateleira / área de retorno.",
    markForVan: false,
  },
  {
    id: "led",
    name: "Lâmpadas LED",
    category: "iluminação",
    desc: "LED 12W branco frio — 24 un.",
    meta: "Peso 5.4 kg · SKU L-220",
    inside: "24 lâmpadas LED. Uma unidade quebrada no canto.",
    authorized: false,
    disposition: "quarantine",
    reason: "Dano no lote. Quarentena de qualidade.",
    markForVan: false,
  },
  {
    id: "fita",
    name: "Fita adesiva",
    category: "embalagens",
    desc: "Rolos reforçados.",
    meta: "Peso 2.1 kg · SKU P-088",
    inside: "Rolos de fita marrom e transparente.",
    authorized: false,
    disposition: "return",
    reason: "Consumo interno. Não expedir.",
    markForVan: false,
  },
  {
    id: "wifi",
    name: "Módulo Wi-Fi",
    category: "eletrônicos",
    desc: "Placas 2.4/5 GHz.",
    meta: "Peso 3.8 kg · SKU E-301",
    inside: "Placas Wi-Fi de outro turno (pedido B-119).",
    authorized: false,
    disposition: "return",
    reason: "Pedido de outro turno. Não levar à van A-204.",
    markForVan: false,
  },
  {
    id: "porcas",
    name: "Porcas sextavadas",
    category: "ferragens",
    desc: "Porcas M6 zincadas.",
    meta: "Peso 9.5 kg · SKU F-019",
    inside: "Porcas a granel sem NF de saída.",
    authorized: false,
    disposition: "quarantine",
    reason: "Sem nota fiscal. Bloqueado na saída.",
    markForVan: false,
  },
  {
    id: "termica",
    name: "Caixa térmica",
    category: "logística",
    desc: "Contêiner isotérmico.",
    meta: "Peso 6.0 kg · SKU G-077",
    inside: "Caixa térmica vazia reservada para farmacêuticos.",
    authorized: false,
    disposition: "return",
    reason: "Reservado. Não autorizado neste turno.",
    markForVan: false,
  },
  {
    id: "qr",
    name: "Etiquetas QR",
    category: "embalagens",
    desc: "Rolo rastreável.",
    meta: "Peso 1.2 kg · SKU P-003",
    inside: "Rolo de etiquetas QR parcialmente usado.",
    authorized: false,
    disposition: "return",
    reason: "Material de apoio. Fica no galpão.",
    markForVan: false,
  },
  {
    id: "camera",
    name: "Câmera mini",
    category: "eletrônicos",
    desc: "Mini câmeras de inspeção.",
    meta: "Peso 2.7 kg · SKU E-450",
    inside: "3 mini câmeras. Número de série divergente do WMS.",
    authorized: false,
    disposition: "quarantine",
    reason: "Divergência de inventário. Quarentena.",
    markForVan: false,
  },
  {
    id: "kit",
    name: "Kit ferramentas",
    category: "ferragens",
    desc: "Kit de manutenção do galpão.",
    meta: "Peso 7.3 kg · SKU F-900",
    inside: "Chaves, alicate e lanterna de uso interno.",
    authorized: false,
    disposition: "return",
    reason: "Patrimônio interno. Não expedir.",
    markForVan: false,
  },
];

function getItem(idOrName) {
  return (
    ITEM_SYSTEM.find((i) => i.id === idOrName || i.name === idOrName) || ITEM_SYSTEM[0]
  );
}

function scanActionFor(item) {
  if (item.authorized && item.markForVan) {
    return "AUTORIZADO → VAN. Pegue (E), abra na BANCADA, entregue na doca.";
  }
  if (item.disposition === "quarantine") {
    return "NÃO AUTORIZADO. Se pegar: abra na bancada e leve à QUARENTENA.";
  }
  return "NÃO AUTORIZADO. Se pegar: abra na bancada e DEVOLVA na área de retorno.";
}

const TARGET_NAME = "Sensor IoT";
const DROP_POS = new THREE.Vector3(-42, 1, 0);
const BENCH_POS = new THREE.Vector3(-32, 1, 10);
const QUARANTINE_POS = new THREE.Vector3(-32, 1, -12);
const RETURN_POS = new THREE.Vector3(-28, 1, -12);
const TARGET_SHELF = { row: 2, col: 6, level: 1, slot: 1 };
const SETTINGS_KEY = "oculos-ia-settings";

const defaultSettings = {
  shadows: true,
  ceilingLights: true,
  volume: 70,
  sensitivity: 70,
  moveSpeed: 70,
  quality: "medium",
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    const merged = { ...defaultSettings, ...parsed };
    // migra save antigo com câmera forçada em 35%
    if (parsed.moveSpeed == null && parsed.sensitivity != null && parsed.sensitivity <= 40) {
      merged.sensitivity = 70;
    }
    return merged;
  } catch {
    return { ...defaultSettings };
  }
}

const settings = loadSettings();

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function playerObject() {
  return controls.getObject();
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
const state = {
  started: false,
  carrying: null,
  inspected: false,
  delivered: false,
  vanLeaving: false,
  vanTimer: 0,
  scanProgress: 0,
  lookingBox: null,
  clock: 0,
  breath: 0,
  footTimer: 0,
  battery: 94,
  lastScanBeep: 0,
  targetWorld: new THREE.Vector3(0, 1.5, 0),
  ambientReady: false,
  settingsOpen: false,
  resumeAfterSettings: false,
  ignoreEscClose: false,
  ignoreUnlock: false,
  worldReady: false,
  openFlash: 0,
};

// ---------------------------------------------------------------------------
// Áudio procedural (imersão sem arquivos externos)
// ---------------------------------------------------------------------------
const AudioFX = {
  ctx: null,
  master: null,
  ambientNodes: [],

  ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = settings.volume / 100;
    this.master.connect(this.ctx.destination);
  },

  setVolume(pct) {
    settings.volume = pct;
    this.ensure();
    if (this.master) {
      this.master.gain.setTargetAtTime(pct / 100, this.ctx.currentTime, 0.05);
    }
  },

  resume() {
    this.ensure();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  },

  tone(freq, dur, type = "sine", gain = 0.08, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noiseBurst(dur = 0.08, gain = 0.04) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 900;
    g.gain.value = gain;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  },

  startAmbient() {
    if (!this.ctx || state.ambientReady) return;
    state.ambientReady = true;

    // zumbido do galpão
    const hum = this.ctx.createOscillator();
    const humGain = this.ctx.createGain();
    hum.type = "sine";
    hum.frequency.value = 58;
    humGain.gain.value = 0.028;
    hum.connect(humGain);
    humGain.connect(this.master);
    hum.start();

    // ruído de ventilação
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const nf = this.ctx.createBiquadFilter();
    nf.type = "lowpass";
    nf.frequency.value = 280;
    const ng = this.ctx.createGain();
    ng.gain.value = 0.035;
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(this.master);
    noise.start();

    this.ambientNodes.push(hum, noise);
  },

  footstep() {
    this.noiseBurst(0.06, 0.05);
    this.tone(90, 0.05, "triangle", 0.03);
  },

  scanTick(progress) {
    const now = performance.now();
    if (now - state.lastScanBeep < 120) return;
    state.lastScanBeep = now;
    this.tone(420 + progress * 520, 0.05, "square", 0.025);
  },

  lockTarget() {
    this.tone(660, 0.08, "sine", 0.06);
    this.tone(880, 0.12, "sine", 0.045);
  },

  pickup() {
    this.tone(220, 0.1, "triangle", 0.06);
    this.tone(440, 0.15, "sine", 0.04);
    this.noiseBurst(0.1, 0.03);
  },

  wrong() {
    this.tone(160, 0.18, "sawtooth", 0.04);
  },

  deliver() {
    this.tone(523, 0.12, "sine", 0.06);
    this.tone(659, 0.14, "sine", 0.05);
    this.tone(784, 0.22, "sine", 0.045);
  },

  vanEngine() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(45, t + 3.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 400;
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 4.1);
  },
};

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = settings.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b121a);
scene.fog = new THREE.FogExp2(0x0f1822, 0.018);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.08, 220);
camera.rotation.order = "YXZ";

const controls = new PointerLockControls(camera, document.body);
// spawn no corredor da doca (fora das prateleiras)
// spawn no corredor amarelo da doca (entrada livre pro galpão)
controls.getObject().position.set(-34, 1.65, 0);
const basePointerSpeed = 1.0;

const player = {
  velocity: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  onGround: true,
  height: 1.7,
  radius: 0.28,
};
const keys = {};

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const boxes = [];
const colliders = [];
const flickerLights = [];
const lightRig = { hemi: null, sun: null, dockKey: null, ceiling: [] };
const dustSystem = { points: null, velocities: null };
const worldNav = new THREE.Group();
scene.add(worldNav);

// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------
const matConcrete = new THREE.MeshStandardMaterial({ color: 0x4e4c48, roughness: 0.94, metalness: 0.04 });
const matConcreteDark = new THREE.MeshStandardMaterial({ color: 0x353330, roughness: 0.96, metalness: 0.02 });
const matWall = new THREE.MeshStandardMaterial({ color: 0x6f747c, roughness: 0.82, metalness: 0.08 });
const matWallDirty = new THREE.MeshStandardMaterial({ color: 0x5a5f66, roughness: 0.9 });
const matMetal = new THREE.MeshStandardMaterial({ color: 0x3a3e45, metalness: 0.85, roughness: 0.35 });
const matMetalDark = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.9, roughness: 0.4 });
const matCardA = new THREE.MeshStandardMaterial({ color: 0x9e7340, roughness: 0.78 });
const matCardB = new THREE.MeshStandardMaterial({ color: 0x8a6538, roughness: 0.82 });
const matCardC = new THREE.MeshStandardMaterial({ color: 0x7a5a32, roughness: 0.85 });
const matTape = new THREE.MeshStandardMaterial({ color: 0xd4bc3a, roughness: 0.55 });

// Caixas realistas — Poly Haven Cardboard Box 01 (CC0)
const BoxKit = {
  ready: false,
  geometry: null,
  material: null,
  hero: null,
  size: new THREE.Vector3(0.39, 0.34, 0.52),
  min: new THREE.Vector3(-0.19, -0.18, -0.23),
  labelCache: new Map(),

  async load() {
    if (this.ready) return;
    const loader = new GLTFLoader();
    const sources = [
      "./assets/box_models/cardboard_box_01_1k.gltf",
      "./assets/boxes/cardboard_box_01_1k.gltf",
    ];
    let gltf = null;
    for (const url of sources) {
      try {
        gltf = await loader.loadAsync(url);
        if (gltf?.scene) {
          console.log("Modelo de caixa OK:", url);
          break;
        }
      } catch (e) {
        console.warn("Caixa falhou:", url, e?.message || e);
        gltf = null;
      }
    }
    if (!gltf?.scene) throw new Error("Caixa local não encontrada");

    let src = null;
    gltf.scene.traverse((c) => {
      if (c.isMesh && !src) src = c;
    });
    if (!src) throw new Error("Mesh da caixa não encontrado no GLTF");

    const geo = src.geometry;
    geo.computeBoundingBox();
    this.size = geo.boundingBox.getSize(new THREE.Vector3());
    this.min = geo.boundingBox.min.clone();

    const mat = src.material.clone ? src.material.clone() : src.material;
    if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
    mat.roughness = 0.92;
    mat.metalness = 0.02;
    this.geometry = geo;
    this.material = mat;

    this.hero = new THREE.Mesh(geo, mat.clone());
    this.hero.castShadow = true;
    this.hero.receiveShadow = true;
    this.hero.visible = false;
    this.hero.name = "boxHero";
    scene.add(this.hero);
    this.ready = true;
  },

  /** Cria o mesh do modelo e coloca DENTRO do group da caixa do jogo */
  addModelToGroup(group, sx, sy, sz) {
    if (!this.ready || !this.geometry) return null;
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.name = "boxModel";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const sxN = sx / this.size.x;
    const syN = sy / this.size.y;
    const szN = sz / this.size.z;
    mesh.scale.set(sxN, syN, szN);
    // assenta a base da caixa no chão do group (y=0)
    mesh.position.set(0, -this.min.y * syN, 0);
    group.add(mesh);
    return mesh;
  },

  makeLabelTexture(product) {
    if (this.labelCache.has(product.id)) return this.labelCache.get(product.id);
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 160;
    const ctx = c.getContext("2d");
    ctx.fillStyle = product.markForVan ? "#d8f5e4" : product.authorized ? "#f4efe4" : "#f0e6d8";
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = "#2a2218";
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 250, 154);
    ctx.fillStyle = product.markForVan ? "#0d6b3c" : "#1a1510";
    ctx.font = "bold 22px Arial";
    ctx.fillText(product.name.slice(0, 18), 14, 36);
    ctx.font = "14px Arial";
    ctx.fillStyle = "#4a4030";
    ctx.fillText((product.category || "").toUpperCase(), 14, 58);
    ctx.fillText((product.meta || "").slice(0, 28), 14, 78);
    ctx.fillStyle = "#111";
    for (let i = 0; i < 36; i++) {
      ctx.fillRect(14 + i * 5, 95, 1 + ((i * 17) % 3), 42);
    }
    ctx.font = "11px monospace";
    ctx.fillText(`SKU-${(product.id || "X").toUpperCase()}`, 14, 150);
    if (product.markForVan) {
      ctx.fillStyle = "#0d6b3c";
      ctx.fillRect(170, 12, 70, 22);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Arial";
      ctx.fillText("→ VAN", 182, 28);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.labelCache.set(product.id, tex);
    return tex;
  },

  hideBox(box) {
    if (!box) return;
    box.visible = false;
  },

  showBoxInWorld(box) {
    if (!box) return;
    box.visible = true;
  },

  showHeroAt(box, x, y, z, scaleMul = 1) {
    if (!this.hero || !box) return;
    const s = box.userData.size;
    this.hero.visible = true;
    if (this.hero.parent !== scene) scene.add(this.hero);
    this.hero.scale.set(
      (s.sx / this.size.x) * scaleMul,
      (s.sy / this.size.y) * scaleMul * box.scale.y,
      (s.sz / this.size.z) * scaleMul
    );
    this.hero.position.set(x, y - this.min.y * this.hero.scale.y, z);
    this.hero.rotation.set(0, box.userData.rotY || 0, 0);
  },

  attachHeroTo(parent, localPos, box, scaleMul = 0.85) {
    if (!this.hero || !box) return;
    const s = box.userData.size;
    parent.add(this.hero);
    this.hero.visible = true;
    this.hero.scale.set(
      (s.sx / this.size.x) * scaleMul,
      (s.sy / this.size.y) * scaleMul,
      (s.sz / this.size.z) * scaleMul
    );
    this.hero.position.copy(localPos);
    this.hero.rotation.set(0, 0, 0);
  },

  hideHero() {
    if (!this.hero) return;
    this.hero.visible = false;
    if (this.hero.parent && this.hero.parent !== scene) scene.add(this.hero);
  },
};

function sMidY(box) {
  return (box.userData.size?.sy || 0.4) * 0.45;
}

/** Evita trava infinita em CDN / rede lenta */
function withTimeout(promise, ms, fallback = null) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// Galpão realista — assets locais/CDN opcionais (nunca bloqueia o boot)
const WarehouseKit = {
  ready: false,
  shelfTemplate: null,
  shelfSize: new THREE.Vector3(3.08, 3.0, 1.24),
  exteriorRoot: null,
  // alturas de prateleira alinhadas ao pallet rack (~3 m)
  levelYs: [0.18, 1.15, 2.15],

  async load() {
    if (this._loadedOnce) return;
    const gltfLoader = new GLTFLoader();
    const texLoader = new THREE.TextureLoader();
    const rgbe = new RGBELoader();
    const base = "./assets/warehouse/";

    const loadTex = (file, colorSpace = null) =>
      withTimeout(
        new Promise((resolve) => {
          texLoader.load(
            base + file,
            (t) => {
              t.wrapS = t.wrapT = THREE.RepeatWrapping;
              t.anisotropy = 8;
              if (colorSpace) t.colorSpace = colorSpace;
              resolve(t);
            },
            undefined,
            () => resolve(null)
          );
        }),
        10000,
        null
      );

    const loadGltfLocalOnly = (path) =>
      withTimeout(gltfLoader.loadAsync(path).catch(() => null), 12000, null);

    const [hdri, floorDiff, floorNor, floorRough, metalDiff, metalNor, exteriorGltf, rackGltf] =
      await Promise.all([
        withTimeout(rgbe.loadAsync(base + "empty_warehouse_01_1k.hdr").catch(() => null), 12000, null),
        loadTex("concrete_floor_painted_diff_1k.jpg", THREE.SRGBColorSpace),
        loadTex("concrete_floor_painted_nor_gl_1k.jpg"),
        loadTex("concrete_floor_painted_rough_1k.jpg"),
        loadTex("metal_plate_diff_1k.jpg", THREE.SRGBColorSpace),
        loadTex("metal_plate_nor_gl_1k.jpg"),
        loadGltfLocalOnly(base + "warehouse.glb"),
        loadGltfLocalOnly(base + "pallet-rack-light.glb"),
      ]);

    if (hdri) {
      hdri.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = hdri;
      scene.environmentIntensity = 0.55;
    }

    if (floorDiff) {
      floorDiff.repeat.set(14, 10);
      if (floorNor) floorNor.repeat.copy(floorDiff.repeat);
      if (floorRough) floorRough.repeat.copy(floorDiff.repeat);
      matConcrete.map = floorDiff;
      matConcrete.normalMap = floorNor;
      matConcrete.roughnessMap = floorRough;
      matConcrete.roughness = 1;
      matConcrete.needsUpdate = true;
      matConcreteDark.map = floorDiff;
      matConcreteDark.normalMap = floorNor;
      matConcreteDark.color = new THREE.Color(0x2a2826);
      matConcreteDark.needsUpdate = true;
      matAsphalt.map = floorDiff;
      matAsphalt.color = new THREE.Color(0x1a1b1e);
      matAsphalt.needsUpdate = true;
    }

    if (metalDiff) {
      metalDiff.repeat.set(6, 3);
      if (metalNor) metalNor.repeat.copy(metalDiff.repeat);
      matWall.map = metalDiff;
      matWall.normalMap = metalNor;
      matWall.metalness = 0.55;
      matWall.roughness = 0.45;
      matWall.color = new THREE.Color(0x8a9098);
      matWall.needsUpdate = true;
      matWallDirty.map = metalDiff;
      matWallDirty.normalMap = metalNor;
      matWallDirty.metalness = 0.4;
      matWallDirty.color = new THREE.Color(0x6a7078);
      matWallDirty.needsUpdate = true;
      matMetal.map = metalDiff;
      matMetal.normalMap = metalNor;
      matMetal.needsUpdate = true;
      matMetalDark.map = metalDiff;
      matMetalDark.normalMap = metalNor;
      matMetalDark.needsUpdate = true;
      matPipe.map = metalDiff;
      matPipe.normalMap = metalNor;
      matPipe.needsUpdate = true;
    }

    if (exteriorGltf?.scene) {
      this.exteriorRoot = exteriorGltf.scene;
      this.exteriorRoot.traverse((m) => {
        if (!m.isMesh) return;
        m.castShadow = true;
        m.receiveShadow = true;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          if (mat?.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        });
      });
    }

    if (rackGltf?.scene) {
      this.shelfTemplate = rackGltf.scene;
      this.stripCargo(this.shelfTemplate);
      this.shelfTemplate.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(this.shelfTemplate);
      this.shelfSize = bb.getSize(new THREE.Vector3());
      // níveis proporcionalmente à altura do rack
      const h = Math.max(2.4, this.shelfSize.y);
      this.levelYs = [0.16, h * 0.38, h * 0.72];
    }

    this.ready = !!(this.shelfTemplate || this.exteriorRoot || hdri);
    this._loadedOnce = true;
    console.log("WarehouseKit:", {
      ready: this.ready,
      shelf: !!this.shelfTemplate,
      exterior: !!this.exteriorRoot,
      hdri: !!hdri,
      size: this.shelfSize,
    });
  },

  stripCargo(root) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.name || "").toLowerCase();
      const drop =
        /carton|cardboard|box|package|crate|parcel|pallet(?!.?rack)/.test(n) ||
        /cargo|goods|load|tape/.test(n);
      const keep = /frame|beam|upright|post|guard|rack|brace|connector|shelf|column|foot/.test(n);
      if (drop && !keep) {
        o.visible = false;
        return;
      }
      // cartons costumam ser pouco metálicos e mais claros
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const avgMetal = mats.reduce((a, m) => a + (m?.metalness || 0), 0) / mats.length;
      const avgRough = mats.reduce((a, m) => a + (m?.roughness ?? 0.5), 0) / mats.length;
      if (!keep && avgMetal < 0.15 && avgRough > 0.55 && !/floor|ground/.test(n)) {
        // heurística: volume pequeno = caixa
        o.geometry?.computeBoundingBox?.();
        const bb = o.geometry?.boundingBox;
        if (bb) {
          const size = bb.getSize(new THREE.Vector3());
          const vol = size.x * size.y * size.z;
          if (vol < 1.2) o.visible = false;
        }
      }
    });
  },

  placeExterior() {
    if (!this.exteriorRoot) return;
    const wrap = new THREE.Group();
    wrap.name = "warehouseExterior";
    wrap.add(this.exteriorRoot);

    this.exteriorRoot.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(this.exteriorRoot);
    const size = bb.getSize(new THREE.Vector3());
    const center = bb.getCenter(new THREE.Vector3());
    this.exteriorRoot.position.sub(center);
    this.exteriorRoot.position.y += size.y / 2;

    // escala pra ~altura do nosso galpão e coloca na doca oeste (cenário externo)
    const s = (H * 0.9) / size.y;
    wrap.scale.setScalar(s);
    wrap.position.set(-W / 2 - size.x * s * 0.42, 0, 0);
    wrap.rotation.y = Math.PI / 2;
    scene.add(wrap);
  },

  buildShelfModel(ox, oz, aisleLabel) {
    const group = new THREE.Group();
    group.position.set(ox, 0, oz);
    const width = 3.2;
    const depth = 1.25;

    if (this.shelfTemplate) {
      const rack = this.shelfTemplate.clone(true);
      const bb = new THREE.Box3().setFromObject(rack);
      const size = bb.getSize(new THREE.Vector3());
      const min = bb.min.clone();
      const sx = width / size.x;
      const sz = depth / size.z;
      const sy = THREE.MathUtils.clamp(((sx + sz) * 0.5) * 1.05, 0.85, 1.35);
      rack.scale.set(sx, sy, sz);
      rack.position.set(
        -(min.x + size.x * 0.5) * sx,
        -min.y * sy,
        -(min.z + size.z * 0.5) * sz
      );
      rack.traverse((m) => {
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      group.add(rack);
    } else {
      // fallback: estrutura procedural antiga (baixa)
      const height = 3.2;
      [[-width / 2, -depth / 2], [-width / 2, depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2]].forEach(
        ([x, z]) => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, height, 8), matMetalDark);
          post.position.set(x, height / 2, z);
          post.castShadow = true;
          group.add(post);
        }
      );
      for (let i = 0; i < 3; i++) {
        const y = 0.35 + i * 1.1;
        const plank = boxMesh(width - 0.1, 0.05, depth - 0.1, matMetal);
        plank.position.set(0, y, 0);
        group.add(plank);
      }
    }

    const tag = boxMesh(0.55, 0.22, 0.04, matSign);
    tag.position.set(0, 1.15, depth / 2 + 0.08);
    group.add(tag);
    group.userData.aisle = aisleLabel;
    scene.add(group);
    addCollider(ox, oz, width / 2 - 0.1, depth / 2 + 0.05);
    return group;
  },
};

// Van realista — Grab3D Delivery Truck (CC0), fallback Delivery Van
const VanKit = {
  ready: false,
  root: null,
  wheels: [],
  rearDoor: null,
  size: new THREE.Vector3(2.8, 3.0, 6.3),

  async load() {
    if (this.ready) return;
    const loader = new GLTFLoader();
    const sources = ["./assets/van/delivery-truck.glb", "./assets/van/delivery-van.glb"];
    let gltf = null;
    for (const url of sources) {
      try {
        gltf = await loader.loadAsync(url);
        if (gltf?.scene) {
          console.log("Van OK:", url);
          break;
        }
      } catch (e) {
        console.warn("Van falhou:", url, e?.message || e);
        gltf = null;
      }
    }
    if (!gltf?.scene) throw new Error("GLB da van não carregou");

    const wrap = new THREE.Group();
    wrap.name = "vanModel";
    const model = gltf.scene;
    wrap.add(model);

    model.updateMatrixWorld(true);
    let bb = new THREE.Box3().setFromObject(model);
    let size = bb.getSize(new THREE.Vector3());
    const center = bb.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -bb.min.y, -center.z);

    // comprimento no eixo X (nariz em +X), como a van procedural antiga
    if (size.z >= size.x) {
      wrap.rotation.y = Math.PI / 2;
    }
    wrap.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(wrap);
    size = bb.getSize(new THREE.Vector3());
    const c2 = bb.getCenter(new THREE.Vector3());
    wrap.position.set(-c2.x, -bb.min.y, -c2.z);

    this.wheels = [];
    let wi = 0;
    wrap.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m?.map) m.map.colorSpace = THREE.SRGBColorSpace;
      });
      const n = (o.name || "").toLowerCase();
      if (/wheel|tire|tyre/.test(n)) {
        o.name = `wheel_${wi++}`;
        this.wheels.push(o);
      }
      if (/rear.?leaf|rear.?door|door_rear|barn/.test(n)) {
        this.rearDoor = o;
      }
    });

    this.size.copy(size);
    this.root = wrap;
    this.ready = true;
  },

  attachTo(vanGroup) {
    if (!this.root) return false;
    // remove mesh procedural antigo (mantém luzes / helpers)
    const kill = [];
    vanGroup.children.forEach((ch) => {
      if (ch === this.root) return;
      if (ch.isLight || ch.isSpotLight) return;
      if (ch.name === "vanModel") return;
      if (ch.type === "SpotLight" || ch.type === "PointLight" || ch.type === "DirectionalLight") return;
      // farol target é Object3D
      if (ch.isMesh || ch.isGroup) kill.push(ch);
    });
    kill.forEach((ch) => vanGroup.remove(ch));
    if (this.root.parent !== vanGroup) vanGroup.add(this.root);
    return true;
  },

  spinWheels(dt) {
    const speed = dt * 9;
    if (this.wheels.length) {
      this.wheels.forEach((w) => {
        w.rotation.x += speed;
      });
      return;
    }
    // fallback procedural
    van.children.forEach((ch) => {
      if (ch.name?.startsWith("wheel")) ch.rotation.x += speed;
    });
  },

  openRear() {
    if (!this.rearDoor) return;
    // folha traseira do Grab3D gira no eixo local
    this.rearDoor.rotation.z = -Math.PI * 0.85;
  },
};

const matVan = new THREE.MeshStandardMaterial({ color: 0x2a5aaa, metalness: 0.35, roughness: 0.35 });
const matVanDark = new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.4, roughness: 0.45 });
const matGlass = new THREE.MeshStandardMaterial({
  color: 0x3aa0d8,
  metalness: 0.1,
  roughness: 0.1,
  transparent: true,
  opacity: 0.55,
  emissive: 0x1a6a9a,
  emissiveIntensity: 0.35,
});
const matYellow = new THREE.MeshStandardMaterial({
  color: 0xe0b820,
  roughness: 0.5,
  emissive: 0x604800,
  emissiveIntensity: 0.25,
});
const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.95 });
const matOrange = new THREE.MeshStandardMaterial({ color: 0xd45a12, roughness: 0.55, emissive: 0x401800, emissiveIntensity: 0.15 });
const matPipe = new THREE.MeshStandardMaterial({ color: 0x7a848e, metalness: 0.7, roughness: 0.35 });
const matNight = new THREE.MeshStandardMaterial({
  color: 0x0a1420,
  emissive: 0x142838,
  emissiveIntensity: 0.35,
  side: THREE.BackSide,
});
const matHighlight = new THREE.MeshStandardMaterial({
  color: 0x3de0ff,
  emissive: 0x3de0ff,
  emissiveIntensity: 1.8,
  transparent: true,
  opacity: 0.85,
});
const matSign = new THREE.MeshStandardMaterial({
  color: 0x102028,
  emissive: 0x3de0ff,
  emissiveIntensity: 0.35,
});

function boxMesh(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function addCollider(x, z, halfW, halfD) {
  colliders.push({ x, z, halfW, halfD });
}

// ---------------------------------------------------------------------------
// Galpão
// ---------------------------------------------------------------------------
const W = 80;
const D = 55;
const H = 14;

function buildWarehouse() {
  const floor = boxMesh(W, 0.3, D, matConcrete);
  floor.position.y = -0.15;
  scene.add(floor);

  // placas de concreto alternadas (profundidade no chão)
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 7; j++) {
      if ((i + j) % 2) continue;
      const tile = boxMesh(7.8, 0.02, 7.6, matConcreteDark);
      tile.position.set(-36 + i * 8, 0.01, -24 + j * 8);
      tile.receiveShadow = true;
      scene.add(tile);
    }
  }

  const ceil = boxMesh(W, 0.25, D, matWallDirty);
  ceil.position.y = H;
  scene.add(ceil);

  const wallN = boxMesh(W, H, 0.35, matWall);
  wallN.position.set(0, H / 2, D / 2);
  scene.add(wallN);
  addCollider(0, D / 2, W / 2, 0.4);

  const wallS = boxMesh(W, H, 0.35, matWall);
  wallS.position.set(0, H / 2, -D / 2);
  scene.add(wallS);
  addCollider(0, -D / 2, W / 2, 0.4);

  const wallE = boxMesh(0.35, H, D, matWall);
  wallE.position.set(W / 2, H / 2, 0);
  scene.add(wallE);
  addCollider(W / 2, 0, 0.4, D / 2);

  // Porta da doca BEM larga (antes a “parede gigante” fechava o caminho)
  const doorHalf = 14; // abertura central ~28 m
  const sideLen = D / 2 - doorHalf;
  const wallWA = boxMesh(0.35, H, sideLen, matWall);
  wallWA.position.set(-W / 2, H / 2, doorHalf + sideLen / 2);
  scene.add(wallWA);
  addCollider(-W / 2, doorHalf + sideLen / 2, 0.35, sideLen / 2);

  const wallWB = boxMesh(0.35, H, sideLen, matWall);
  wallWB.position.set(-W / 2, H / 2, -(doorHalf + sideLen / 2));
  scene.add(wallWB);
  addCollider(-W / 2, -(doorHalf + sideLen / 2), 0.35, sideLen / 2);

  // só a faixa de cima da porta (sem colisão)
  const wallWT = boxMesh(0.35, H * 0.28, doorHalf * 2, matWall);
  wallWT.position.set(-W / 2, H * 0.86, 0);
  scene.add(wallWT);

  // piso amarelo marcando a entrada livre doca → galpão
  const entryPath = boxMesh(28, 0.03, 6, matYellow);
  entryPath.position.set(-26, 0.02, 0);
  scene.add(entryPath);

  // faixas de segurança + profundidade de corredor
  [-16, -8, 0, 8, 16].forEach((z) => {
    const line = boxMesh(W * 0.72, 0.02, 0.12, matYellow);
    line.position.set(4, 0.02, z);
    scene.add(line);
  });

  // marcas de corredor
  for (let i = 0; i < 6; i++) {
    const mark = boxMesh(1.4, 0.03, 0.9, matSign);
    mark.position.set(-26 + i * 10, 0.03, -22);
    scene.add(mark);
  }

  const dock = boxMesh(22, 0.25, 26, matAsphalt);
  dock.position.set(-W / 2 - 10, -0.12, 0);
  scene.add(dock);

  // céu noturno na abertura da doca
  const nightDome = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), matNight);
  nightDome.position.set(-70, 8, 0);
  scene.add(nightDome);

  // brilho da cidade distante
  const cityGlow = new THREE.PointLight(0x4a7aaa, 18, 55, 2);
  cityGlow.position.set(-75, 6, 0);
  scene.add(cityGlow);

  // pilares (pula o corredor central da doca)
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      const px = -30 + i * 15;
      const pz = -20 + j * 20;
      if (Math.abs(pz) < 8 && px < -10) continue;
      const p = boxMesh(0.45, H - 0.5, 0.45, matMetalDark);
      p.position.set(px, (H - 0.5) / 2, pz);
      scene.add(p);
      addCollider(p.position.x, p.position.z, 0.35, 0.35);

      const base = boxMesh(0.85, 0.25, 0.85, matMetal);
      base.position.set(p.position.x, 0.12, p.position.z);
      scene.add(base);
    }
  }

  // tubos no teto
  for (let i = 0; i < 8; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, W * 0.85, 10), matPipe);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, H - 1.6, -22 + i * 6.2);
    pipe.castShadow = true;
    scene.add(pipe);
  }

  // bandejas de cabo
  for (let i = 0; i < 4; i++) {
    const tray = boxMesh(W * 0.7, 0.08, 0.55, matMetal);
    tray.position.set(2, H - 2.4, -15 + i * 10);
    scene.add(tray);
  }

  // prédio externo realista (Grab3D) na doca
  WarehouseKit.placeExterior();
  buildProps();
}

function buildProps() {
  // cones de segurança
  const coneGeo = new THREE.ConeGeometry(0.22, 0.55, 10);
  [[-38, -6], [-38, 6], [-36, -10], [-36, 10], [8, -20], [20, 18]].forEach(([x, z]) => {
    const cone = new THREE.Mesh(coneGeo, matOrange);
    cone.position.set(x, 0.28, z);
    cone.castShadow = true;
    scene.add(cone);
  });

  // pallets fora do corredor de entrada
  for (let i = 0; i < 5; i++) {
    const pallet = boxMesh(1.2, 0.12, 1.0, matCardC);
    pallet.position.set(-34 + i * 1.5, 0.06, 16);
    scene.add(pallet);
    const stack = boxMesh(1.0, 0.7 + Math.random() * 0.5, 0.85, Math.random() > 0.5 ? matCardA : matCardB);
    stack.position.set(pallet.position.x, 0.5, pallet.position.z);
    scene.add(stack);
    addCollider(pallet.position.x, pallet.position.z, 0.7, 0.6);
  }

  // tambores
  for (let i = 0; i < 4; i++) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.0, 14), matMetal);
    drum.position.set(30, 0.5, -10 + i * 1.1);
    drum.castShadow = true;
    scene.add(drum);
    addCollider(drum.position.x, drum.position.z, 0.4, 0.4);
  }

  // empilhadeira estática (silhueta)
  const forklift = new THREE.Group();
  forklift.position.set(-30, 0, -14);
  forklift.rotation.y = 0.4;
  const body = boxMesh(2.2, 1.1, 1.2, matOrange);
  body.position.y = 0.75;
  forklift.add(body);
  const mast = boxMesh(0.15, 2.4, 0.5, matMetalDark);
  mast.position.set(1.1, 1.3, 0);
  forklift.add(mast);
  const fork = boxMesh(1.2, 0.08, 0.35, matMetal);
  fork.position.set(1.7, 0.35, 0);
  forklift.add(fork);
  scene.add(forklift);
  addCollider(-30, -14, 1.3, 1.0);

  // placas DOCA / CORREDOR
  const dockLabel = boxMesh(0.12, 1.4, 3.2, matSign);
  dockLabel.position.set(-40, 3.8, 9);
  scene.add(dockLabel);

  const exitGlow = new THREE.PointLight(0x3de0ff, 12, 18, 2);
  exitGlow.position.set(-40, 3.8, 9);
  scene.add(exitGlow);

  // placas de corredor suspensas
  ["A", "B", "C", "D"].forEach((letter, i) => {
    const sign = boxMesh(1.6, 0.7, 0.08, matSign);
    sign.position.set(-20 + i * 12, 7.2, -1);
    scene.add(sign);
    const light = new THREE.PointLight(0x3de0ff, 4, 10, 2);
    light.position.copy(sign.position);
    scene.add(light);
  });
}

function buildShelf(ox, oz, aisleLabel) {
  return WarehouseKit.buildShelfModel(ox, oz, aisleLabel);
}

function makeBox(product, x, y, z, isTarget) {
  // proporções próximas do modelo Poly Haven (caixa real amassada)
  const sx = 0.42 + Math.random() * 0.22;
  const sy = 0.32 + Math.random() * 0.18;
  const sz = 0.48 + Math.random() * 0.22;
  const rotY = (Math.random() - 0.5) * 0.35;
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  const markVan = !!product.markForVan;

  // hitbox pra raycast
  const hitMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), hitMat);
  hit.position.y = sy / 2;
  hit.name = "boxBody";
  group.add(hit);

  // MODELO real DENTRO do group (ou cubo se o GLTF não carregou)
  let body = null;
  if (BoxKit.ready) {
    body = BoxKit.addModelToGroup(group, sx, sy, sz);
  } else {
    const mats = [matCardA, matCardB, matCardC];
    body = boxMesh(sx, sy, sz, mats[(Math.random() * 3) | 0]);
    body.position.y = sy / 2;
    body.name = "boxBodyFallback";
    group.add(body);
    const tape = boxMesh(sx * 0.95, sy * 0.08, 0.04, matTape);
    tape.position.y = sy * 0.85;
    group.add(tape);
  }

  const labelMat = new THREE.MeshStandardMaterial({
    map: BoxKit.ready ? BoxKit.makeLabelTexture(product) : null,
    color: markVan ? 0xe8fff0 : 0xfff6e8,
    roughness: 0.65,
    metalness: 0,
    emissive: markVan ? 0x1a4030 : 0x000000,
    emissiveIntensity: markVan ? 0.25 : 0,
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(sx * 0.55, sy * 0.38), labelMat);
  label.position.set(0, sy * 0.48, sz / 2 + 0.012);
  label.name = "boxLabel";
  group.add(label);

  const ringMat = matHighlight.clone();
  if (markVan) {
    ringMat.color.set(0x5dff9a);
    ringMat.emissive.set(0x5dff9a);
  } else if (!product.authorized) {
    ringMat.color.set(0xff6b4a);
    ringMat.emissive.set(0xff6b4a);
  }
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Math.max(sx, sz) * 0.7, 0.028, 8, 32),
    ringMat
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = sy * 0.55;
  ring.visible = markVan;
  ring.material.emissiveIntensity = markVan ? 2.6 : 0.8;
  group.add(ring);

  if (markVan) {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(sx, sz) * 0.85, Math.max(sx, sz) * 1.15, 32),
      new THREE.MeshBasicMaterial({
        color: 0x5dff9a,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.02;
    group.add(halo);
    group.userData.halo = halo;

    const marker = boxMesh(0.08, 0.55, 0.08, new THREE.MeshStandardMaterial({
      color: 0x5dff9a,
      emissive: 0x5dff9a,
      emissiveIntensity: 2,
    }));
    marker.position.y = sy + 0.55;
    group.add(marker);
    const markerHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.22, 4),
      new THREE.MeshStandardMaterial({ color: 0x5dff9a, emissive: 0x5dff9a, emissiveIntensity: 2 })
    );
    markerHead.position.y = sy + 0.95;
    group.add(markerHead);
    group.userData.vanMarker = marker;
    group.userData.vanMarkerHead = markerHead;

    state.targetWorld.set(x, y + sy * 0.5, z);
  }

  group.userData = {
    ...group.userData,
    product,
    isTarget: markVan || isTarget,
    ring,
    baseY: y,
    size: { sx, sy, sz },
    rotY,
    labelMesh: label,
    modelMesh: body,
    taken: false,
    opened: false,
  };

  scene.add(group);
  boxes.push(group);
  return group;
}

function buildShelvesAndBoxes() {
  let idx = 0;
  const rows = 6;
  const cols = 10;
  // corredor central livre da doca até o fundo do galpão
  const clearHalfZ = 3.8;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // começa mais pra dentro — área aberta perto da doca
      const x = -14 + col * 4.4;
      const z = -18 + row * 5.6;
      if (Math.abs(z) < clearHalfZ) continue;

      const aisle = `${String.fromCharCode(65 + row)}${col + 1}`;
      buildShelf(x, z, aisle);

      for (let level = 0; level < 3; level++) {
        const y = WarehouseKit.levelYs[level] ?? 0.45 + level * 1.0;
        for (let slot = 0; slot < 3; slot++) {
          const bx = x - 1.0 + slot * 1.0;
          const bz = z + (Math.random() - 0.5) * 0.2;
          const isTarget =
            row === TARGET_SHELF.row &&
            col === TARGET_SHELF.col &&
            level === TARGET_SHELF.level &&
            slot === TARGET_SHELF.slot;
          const product = isTarget
            ? getItem("sensor-iot")
            : ITEM_SYSTEM[idx % ITEM_SYSTEM.length];
          // evita vários "Sensor IoT" soltos
          const finalProduct =
            !isTarget && product.id === "sensor-iot"
              ? ITEM_SYSTEM[(idx + 3) % ITEM_SYSTEM.length]
              : product;
          const box = makeBox(finalProduct, bx, y, bz, isTarget);
          box.userData.aisle = aisle;
          box.userData.level = level + 1;
          idx++;
        }
      }
    }
  }

  // caixas no chão perto do spawn — fáceis de testar o E
  const easySpots = [
    [-33, 0, 1.5],
    [-31.5, 0, 2.2],
    [-30, 0, 1.2],
    [-32, 0, -1.5],
  ];
  easySpots.forEach((spot, i) => {
    const item = ITEM_SYSTEM[(i + 4) % ITEM_SYSTEM.length];
    if (item.markForVan) return;
    makeBox(item, spot[0], spot[1], spot[2], false);
  });
}

// ---------------------------------------------------------------------------
// Van + navegação AR no mundo
// ---------------------------------------------------------------------------
const van = new THREE.Group();
const dropZone = new THREE.Group();
let navArrow = null;

function buildVanProceduralFallback() {
  const body = boxMesh(5.2, 2.2, 2.4, matVan);
  body.position.y = 1.4;
  van.add(body);

  const cabin = boxMesh(1.8, 1.5, 2.35, matVan);
  cabin.position.set(2.2, 1.55, 0);
  van.add(cabin);

  const window = boxMesh(0.1, 0.9, 1.8, matGlass);
  window.position.set(3.15, 1.85, 0);
  van.add(window);

  const bumper = boxMesh(0.3, 0.35, 2.5, matVanDark);
  bumper.position.set(3.2, 0.45, 0);
  van.add(bumper);

  [[1.4, 1.15], [1.4, -1.15], [-1.4, 1.15], [-1.4, -1.15]].forEach(([x, z], i) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.28, 16), matVanDark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.45, z);
    wheel.name = `wheel_${i}`;
    van.add(wheel);
  });

  const brakeL = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.2, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.9 })
  );
  brakeL.position.set(-2.65, 1.1, 0.8);
  van.add(brakeL);
  const brakeR = brakeL.clone();
  brakeR.position.z = -0.8;
  van.add(brakeR);

  const headL = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.18, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe08a, emissiveIntensity: 1.4 })
  );
  headL.position.set(3.15, 1.1, 0.75);
  van.add(headL);
  const headR = headL.clone();
  headR.position.z = -0.75;
  van.add(headR);
}

function buildVan() {
  van.position.set(-48, 0, 0);

  if (!VanKit.attachTo(van)) {
    buildVanProceduralFallback();
  }

  // farol dinâmico (modelo já tem faróis; mantém luz de jogo)
  const noseX = VanKit.ready ? Math.max(2.8, VanKit.size.x * 0.48) : 3.2;
  const headLight = new THREE.SpotLight(0xfff0d0, 18, 28, 0.55, 0.4, 1.5);
  headLight.position.set(noseX, 1.2, 0);
  headLight.target.position.set(noseX + 10, 0, 0);
  van.add(headLight);
  van.add(headLight.target);

  scene.add(van);

  const zone = boxMesh(3.5, 0.05, 3.5, matYellow);
  zone.position.set(-42, 0.03, 0);
  dropZone.add(zone);
  const zoneRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.04, 8, 48), matHighlight);
  zoneRing.rotation.x = Math.PI / 2;
  zoneRing.position.set(-42, 0.08, 0);
  zoneRing.name = "dropRing";
  dropZone.add(zoneRing);

  // pilares de luz da zona
  for (const z of [-1.6, 1.6]) {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x3de0ff, emissive: 0x3de0ff, emissiveIntensity: 1.2 })
    );
    pillar.position.set(-42, 0.9, z);
    dropZone.add(pillar);
  }
  scene.add(dropZone);

  // seta de navegação AR flutuante
  navArrow = new THREE.Group();
  const shaft = boxMesh(0.12, 0.12, 0.9, matHighlight);
  shaft.position.z = -0.2;
  navArrow.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 4), matHighlight);
  head.rotation.x = -Math.PI / 2;
  head.position.z = 0.45;
  navArrow.add(head);
  navArrow.position.set(8, 1.4, 0);
  worldNav.add(navArrow);

  buildStations();
}

const stations = { bench: null, quarantine: null, returnBin: null };

function buildStations() {
  // Bancada de inspeção
  const bench = new THREE.Group();
  bench.position.copy(BENCH_POS);
  bench.position.y = 0;
  const table = boxMesh(2.4, 0.12, 1.2, matMetal);
  table.position.y = 1.0;
  bench.add(table);
  for (const x of [-1.0, 1.0]) {
    for (const z of [-0.45, 0.45]) {
      const leg = boxMesh(0.1, 1.0, 0.1, matMetalDark);
      leg.position.set(x, 0.5, z);
      bench.add(leg);
    }
  }
  const topPad = boxMesh(1.6, 0.04, 0.8, matYellow);
  topPad.position.y = 1.08;
  bench.add(topPad);
  const lamp = new THREE.PointLight(0xfff2dc, 16, 8, 2);
  lamp.position.set(0, 2.2, 0);
  bench.add(lamp);
  const lampArm = boxMesh(0.08, 1.0, 0.08, matMetal);
  lampArm.position.set(0.8, 1.55, 0);
  bench.add(lampArm);
  const sign = boxMesh(1.4, 0.35, 0.06, matSign);
  sign.position.set(0, 1.55, -0.65);
  bench.add(sign);
  scene.add(bench);
  addCollider(BENCH_POS.x, BENCH_POS.z, 1.3, 0.7);
  stations.bench = bench;

  // Quarentena (vermelho)
  const q = new THREE.Group();
  q.position.set(QUARANTINE_POS.x, 0, QUARANTINE_POS.z);
  const bin = boxMesh(1.6, 1.1, 1.2, new THREE.MeshStandardMaterial({
    color: 0x6a1818,
    metalness: 0.3,
    roughness: 0.55,
    emissive: 0x401010,
    emissiveIntensity: 0.35,
  }));
  bin.position.y = 0.55;
  q.add(bin);
  const qRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.04, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0xff4a4a, emissive: 0xff2222, emissiveIntensity: 1.4 })
  );
  qRing.rotation.x = Math.PI / 2;
  qRing.position.y = 0.08;
  qRing.name = "qRing";
  q.add(qRing);
  const qSign = boxMesh(1.2, 0.4, 0.06, new THREE.MeshStandardMaterial({
    color: 0x401010,
    emissive: 0xff4444,
    emissiveIntensity: 0.5,
  }));
  qSign.position.set(0, 1.5, 0);
  q.add(qSign);
  scene.add(q);
  addCollider(QUARANTINE_POS.x, QUARANTINE_POS.z, 0.9, 0.7);
  stations.quarantine = q;

  // Área de retorno
  const r = new THREE.Group();
  r.position.set(RETURN_POS.x, 0, RETURN_POS.z);
  const rack = boxMesh(1.8, 0.15, 1.0, matMetal);
  rack.position.y = 0.5;
  r.add(rack);
  const rPad = boxMesh(1.5, 0.04, 0.8, matOrange);
  rPad.position.y = 0.6;
  r.add(rPad);
  const rSign = boxMesh(1.2, 0.35, 0.06, new THREE.MeshStandardMaterial({
    color: 0x402010,
    emissive: 0xd45a12,
    emissiveIntensity: 0.45,
  }));
  rSign.position.set(0, 1.3, 0);
  r.add(rSign);
  scene.add(r);
  addCollider(RETURN_POS.x, RETURN_POS.z, 1.0, 0.6);
  stations.returnBin = r;
}

// ---------------------------------------------------------------------------
// Luzes + poeira
// ---------------------------------------------------------------------------
function buildLights() {
  const hemi = new THREE.HemisphereLight(0x9eb4c8, 0x1a1610, 0.42);
  scene.add(hemi);
  lightRig.hemi = hemi;

  const sun = new THREE.DirectionalLight(0xffe4c4, 0.85);
  sun.position.set(-60, 40, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -50;
  sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(0, 0, 0);
  lightRig.sun = sun;

  // luz da doca (mais fria / profunda)
  const dockKey = new THREE.DirectionalLight(0x6aa8d8, 0.55);
  dockKey.position.set(-70, 20, 0);
  scene.add(dockKey);
  lightRig.dockKey = dockKey;

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      const light = new THREE.PointLight(0xfff2dc, 28, 20, 2);
      light.position.set(-30 + i * 12, H - 1.2, -18 + j * 12);
      scene.add(light);
      lightRig.ceiling.push(light);
      flickerLights.push({ light, base: 28, phase: Math.random() * Math.PI * 2 });

      const fixture = boxMesh(1.8, 0.12, 0.6, matMetal);
      fixture.position.copy(light.position);
      fixture.position.y += 0.2;
      scene.add(fixture);

      // glow do refletor
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.35),
        new THREE.MeshBasicMaterial({
          color: 0xfff0d0,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
        })
      );
      glow.rotation.x = Math.PI / 2;
      glow.position.set(light.position.x, light.position.y - 0.15, light.position.z);
      scene.add(glow);
    }
  }

  buildDust();
  applyLightingSettings();
}

function setMeshShadows(enabled) {
  scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = enabled;
      obj.receiveShadow = enabled;
    }
  });
}

function applyLightingSettings() {
  const shadowsOn = settings.shadows;
  renderer.shadowMap.enabled = shadowsOn;
  if (lightRig.sun) {
    lightRig.sun.castShadow = shadowsOn;
    lightRig.sun.intensity = shadowsOn ? 0.85 : 0.7;
  }
  if (lightRig.hemi) {
    lightRig.hemi.intensity = shadowsOn ? 0.42 : 0.7;
  }
  if (lightRig.dockKey) {
    lightRig.dockKey.intensity = shadowsOn ? 0.55 : 0.45;
  }
  setMeshShadows(shadowsOn);
  renderer.shadowMap.needsUpdate = true;

  const ceilingOn = settings.ceilingLights;
  lightRig.ceiling.forEach((l) => {
    l.visible = ceilingOn;
  });
  flickerLights.forEach((f) => {
    f.light.visible = ceilingOn;
  });
}

function applyQualitySettings() {
  const q = settings.quality;
  const pr =
    q === "low" ? 1 : q === "high" ? Math.min(devicePixelRatio, 2) : Math.min(devicePixelRatio, 1.5);
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight);
  if (lightRig.sun) {
    const map = q === "high" ? 2048 : q === "medium" ? 1024 : 512;
    lightRig.sun.shadow.mapSize.set(map, map);
    if (lightRig.sun.shadow.map) {
      lightRig.sun.shadow.map.dispose();
      lightRig.sun.shadow.map = null;
    }
  }
}

function applySensitivity() {
  const t = THREE.MathUtils.clamp(settings.sensitivity, 20, 200) / 100;
  controls.pointerSpeed = basePointerSpeed * t;
}

function applyAllSettings() {
  applyLightingSettings();
  applyQualitySettings();
  applySensitivity();
  AudioFX.setVolume(settings.volume);
}

function buildDust() {
  const count = 900;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * W;
    positions[i * 3 + 1] = Math.random() * (H - 1);
    positions[i * 3 + 2] = (Math.random() - 0.5) * D;
    velocities[i * 3] = (Math.random() - 0.5) * 0.15;
    velocities[i * 3 + 1] = 0.05 + Math.random() * 0.12;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xc8d8e8,
    size: 0.045,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    sizeAttenuation: true,
  });
  dustSystem.points = new THREE.Points(geo, mat);
  dustSystem.velocities = velocities;
  scene.add(dustSystem.points);
}

function updateDust(dt) {
  if (!dustSystem.points) return;
  const pos = dustSystem.points.geometry.attributes.position.array;
  const vel = dustSystem.velocities;
  for (let i = 0; i < vel.length / 3; i++) {
    pos[i * 3] += vel[i * 3] * dt;
    pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
    pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    if (pos[i * 3 + 1] > H - 0.5) {
      pos[i * 3 + 1] = 0.2;
      pos[i * 3] = camera.position.x + (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 40;
    }
  }
  dustSystem.points.geometry.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// HUD / UI
// ---------------------------------------------------------------------------
const el = {
  hud: document.getElementById("glasses-hud"),
  status: document.getElementById("hud-status"),
  clock: document.getElementById("hud-clock"),
  panel: document.getElementById("ai-panel"),
  title: document.getElementById("ai-title"),
  cat: document.getElementById("ai-cat"),
  desc: document.getElementById("ai-desc"),
  meta: document.getElementById("ai-meta"),
  action: document.getElementById("ai-action"),
  bar: document.getElementById("ai-bar-fill"),
  mission: document.getElementById("mission-text"),
  carry: document.getElementById("carry-hint"),
  start: document.getElementById("overlay-start"),
  win: document.getElementById("overlay-win"),
  settings: document.getElementById("overlay-settings"),
  reticle: document.getElementById("reticle"),
  aisle: document.getElementById("hud-aisle"),
  dist: document.getElementById("hud-dist"),
  battery: document.getElementById("hud-battery"),
  needle: document.getElementById("compass-needle"),
  btnSettingsHud: document.getElementById("btn-settings-hud"),
  optShadows: document.getElementById("opt-shadows"),
  optCeiling: document.getElementById("opt-ceiling-lights"),
  optVolume: document.getElementById("opt-volume"),
  optVolumeVal: document.getElementById("opt-volume-val"),
  optSensitivity: document.getElementById("opt-sensitivity"),
  optSensitivityVal: document.getElementById("opt-sensitivity-val"),
  optMoveSpeed: document.getElementById("opt-move-speed"),
  optMoveSpeedVal: document.getElementById("opt-move-speed-val"),
  optQuality: document.getElementById("opt-quality"),
};

function syncSettingsUI() {
  el.optShadows.checked = settings.shadows;
  el.optCeiling.checked = settings.ceilingLights;
  el.optVolume.value = settings.volume;
  el.optVolumeVal.textContent = `${settings.volume}%`;
  el.optSensitivity.value = settings.sensitivity;
  el.optSensitivityVal.textContent = `${settings.sensitivity}%`;
  if (el.optMoveSpeed) {
    el.optMoveSpeed.value = settings.moveSpeed;
    el.optMoveSpeedVal.textContent = `${settings.moveSpeed}%`;
  }
  el.optQuality.value = settings.quality;
}

function openSettings(fromGameplay = false) {
  if (state.settingsOpen) return;
  state.settingsOpen = true;
  state.ignoreEscClose = true;
  setTimeout(() => {
    state.ignoreEscClose = false;
  }, 400);
  state.resumeAfterSettings = fromGameplay && state.started && !state.delivered;
  if (controls.isLocked) controls.unlock();
  el.settings.classList.remove("hidden");
  el.start.classList.add("hidden");
  el.btnSettingsHud.classList.add("hidden");
  syncSettingsUI();
}

function closeSettings() {
  state.settingsOpen = false;
  el.settings.classList.add("hidden");
  saveSettings();
  applyAllSettings();

  if (state.resumeAfterSettings && !state.delivered) {
    el.hud.classList.remove("hidden");
    el.btnSettingsHud.classList.remove("hidden");
    controls.lock();
    AudioFX.resume();
  } else if (!state.started || state.delivered) {
    if (!state.delivered) el.start.classList.remove("hidden");
    el.btnSettingsHud.classList.add("hidden");
  } else {
    el.btnSettingsHud.classList.remove("hidden");
  }
  state.resumeAfterSettings = false;
}

function setMission(text) {
  el.mission.innerHTML = text;
}

function showAI(product, progress, box) {
  el.panel.classList.remove("hidden");
  el.title.textContent = product.name;
  el.cat.textContent = product.category;
  el.desc.textContent = product.desc;
  el.meta.textContent = `${product.meta || "—"}${box?.userData.aisle ? ` · corredor ${box.userData.aisle}` : ""}${box?.userData.level ? ` · nível ${box.userData.level}` : ""}`;

  const authEl = document.getElementById("ai-auth");
  if (authEl) {
    authEl.textContent = product.authorized ? "AUTORIZADO PARA VAN" : "NÃO AUTORIZADO";
    authEl.className = `ai-auth ${product.authorized ? "ok" : "deny"}`;
  }

  const reason = product.reason || "";
  el.action.textContent =
    progress > 0.85 ? `${scanActionFor(product)} ${reason}` : scanActionFor(product);
  el.bar.style.width = `${Math.floor(progress * 100)}%`;

  const markVan = !!product.markForVan;
  el.reticle.classList.toggle("lock", progress > 0.85 && markVan);
  el.reticle.classList.toggle("deny", progress > 0.7 && !product.authorized);
  el.reticle.style.borderColor = markVan && progress > 0.7 ? "#5dff9a" : !product.authorized && progress > 0.7 ? "#ff6b4a" : "";
  el.status.textContent =
    markVan && progress > 0.85
      ? "MARCADO → VAN"
      : !product.authorized && progress > 0.85
        ? "ITEM BLOQUEADO"
        : progress > 0.4
          ? "CONSULTANDO SISTEMA..."
          : "ANALISANDO...";
  el.status.classList.toggle("warn", !product.authorized && progress > 0.7);
  el.status.classList.toggle("danger", !product.authorized && progress > 0.85);
}

function hideAI() {
  el.panel.classList.add("hidden");
  el.bar.style.width = "0%";
  el.reticle.classList.remove("lock", "deny");
  el.reticle.style.borderColor = "";
  const authEl = document.getElementById("ai-auth");
  if (authEl) {
    authEl.textContent = "—";
    authEl.className = "ai-auth";
  }
  const inside = document.getElementById("ai-inside");
  if (inside) inside.textContent = "—";
  if (!state.carrying && !state.delivered) {
    el.status.textContent = "ESCANSÃO ATIVA";
    el.status.classList.remove("warn", "danger");
  }
}

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------
document.getElementById("btn-start").addEventListener("click", () => {
  if (!state.worldReady) {
    const b = document.getElementById("btn-start");
    if (b) b.textContent = "QUASE PRONTO… AGUARDA 1s";
    return;
  }
  AudioFX.resume();
  AudioFX.setVolume(settings.volume);
  AudioFX.startAmbient();
  el.start.classList.add("hidden");
  el.hud.classList.remove("hidden");
  el.btnSettingsHud.classList.remove("hidden");
  state.started = true;
  state.ignoreUnlock = true;
  setTimeout(() => {
    state.ignoreUnlock = false;
  }, 1200);
  try {
    controls.lock();
  } catch (e) {
    console.warn("PointerLock:", e);
  }
  // se o browser bloquear o mouse, pede outro clique na tela
  setTimeout(() => {
    if (state.started && !controls.isLocked && !state.settingsOpen) {
      setMission("Clique uma vez no meio da tela para capturar o mouse e jogar.");
      canvas.style.cursor = "pointer";
      const once = () => {
        canvas.removeEventListener("click", once);
        canvas.style.cursor = "none";
        state.ignoreUnlock = true;
        setTimeout(() => {
          state.ignoreUnlock = false;
        }, 800);
        controls.lock();
      };
      canvas.addEventListener("click", once);
    }
  }, 350);
  setMission(
    "Óculos: ache a caixa <em>verde (→ VAN)</em> — Sensor IoT. Pegue, <em>abra na BANCADA</em>, depois leve à van. Itens bloqueados vão pra <em>quarentena</em> ou retorno."
  );
});

document.getElementById("btn-restart").addEventListener("click", () => location.reload());

document.getElementById("btn-settings-start").addEventListener("click", () => openSettings(false));
document.getElementById("btn-settings-close").addEventListener("click", () => closeSettings());
el.btnSettingsHud.addEventListener("click", () => openSettings(true));

el.optShadows.addEventListener("change", () => {
  settings.shadows = el.optShadows.checked;
  applyLightingSettings();
  saveSettings();
});

el.optCeiling.addEventListener("change", () => {
  settings.ceilingLights = el.optCeiling.checked;
  applyLightingSettings();
  saveSettings();
});

el.optVolume.addEventListener("input", () => {
  const v = Number(el.optVolume.value);
  el.optVolumeVal.textContent = `${v}%`;
  AudioFX.setVolume(v);
  saveSettings();
});

el.optSensitivity.addEventListener("input", () => {
  settings.sensitivity = Number(el.optSensitivity.value);
  el.optSensitivityVal.textContent = `${settings.sensitivity}%`;
  applySensitivity();
  saveSettings();
});

el.optMoveSpeed?.addEventListener("input", () => {
  settings.moveSpeed = Number(el.optMoveSpeed.value);
  el.optMoveSpeedVal.textContent = `${settings.moveSpeed}%`;
  saveSettings();
});

el.optQuality.addEventListener("change", () => {
  settings.quality = el.optQuality.value;
  applyQualitySettings();
  saveSettings();
});

controls.addEventListener("lock", () => {
  el.start.classList.add("hidden");
  AudioFX.resume();
  if (state.started && !state.delivered) {
    el.btnSettingsHud.classList.remove("hidden");
  }
});

controls.addEventListener("unlock", () => {
  if (state.delivered || state.settingsOpen || state.ignoreUnlock) return;
  if (state.started) {
    openSettings(true);
  } else {
    el.start.classList.remove("hidden");
  }
});

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyE" && !state.settingsOpen) tryInteract();
  if (e.code === "Escape" && state.settingsOpen && !state.ignoreEscClose) {
    e.preventDefault();
    closeSettings();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  applyQualitySettings();
});

function blocked(nx, nz) {
  for (const c of colliders) {
    if (Math.abs(nx - c.x) < c.halfW + player.radius && Math.abs(nz - c.z) < c.halfD + player.radius) {
      return true;
    }
  }
  if (nx > W / 2 - 1 || nx < -W / 2 - 16 || nz > D / 2 - 1 || nz < -D / 2 + 1) return true;
  return false;
}

function near(pos, radius) {
  const p = playerObject().position;
  const dx = p.x - pos.x;
  const dz = p.z - pos.z;
  return Math.hypot(dx, dz) < radius;
}

/** Caixa à frente / escaneada que dá pra pegar com E */
function findPickupTarget() {
  if (state.lookingBox && !state.lookingBox.userData.taken && state.scanProgress >= 0.45) {
    return state.lookingBox;
  }

  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  controls.getDirection(dir);
  dir.y = 0;
  if (dir.lengthSq() < 0.0001) dir.set(0, 0, -1);
  else dir.normalize();

  let best = null;
  let bestScore = Infinity;

  for (const box of boxes) {
    if (!box.visible || box.userData.taken || !box.userData.product) continue;
    const bp = box.position.clone();
    bp.y += (box.userData.size?.sy || 0.4) * 0.5;
    const to = bp.clone().sub(origin);
    const dist = to.length();
    if (dist > 5.5) continue;
    const flat = to.clone();
    flat.y = 0;
    const flatDist = flat.length();
    if (flatDist < 0.01) continue;
    flat.normalize();
    const dot = flat.dot(dir);
    if (dot < 0.35) continue;
    const score = flatDist / Math.max(dot, 0.2);
    if (score < bestScore) {
      bestScore = score;
      best = box;
    }
  }
  return best;
}

function tryInteract() {
  if (!state.started || state.delivered || state.settingsOpen) return;

  if (state.carrying) {
    const item = state.carrying.userData.product;

    // 1) Abrir na bancada (obrigatório antes de destino)
    if (!state.inspected) {
      if (near(BENCH_POS, 3.2)) {
        openAtBench();
      } else {
        setMission(
          `Caixa fechada. Leve até a <em>BANCADA amarela</em> (${playerObject().position.distanceTo(BENCH_POS).toFixed(1)} m) e pressione <em>E</em> para abrir.`
        );
        AudioFX.wrong();
      }
      return;
    }

    // 2) Destino pós-inspeção
    if (item.authorized && item.disposition === "van") {
      if (near(DROP_POS, 4.5)) {
        deliverToVan();
      } else {
        setMission(`Item autorizado. Faltam <em>${playerObject().position.distanceTo(DROP_POS).toFixed(1)} m</em> até a zona da VAN.`);
        AudioFX.wrong();
      }
      return;
    }

    if (item.disposition === "quarantine") {
      if (near(QUARANTINE_POS, 3.2)) {
        disposeBox("quarantine");
      } else {
        setMission(
          `Item <em>bloqueado</em>. Leve à <em>QUARENTENA vermelha</em> (${playerObject().position.distanceTo(QUARANTINE_POS).toFixed(1)} m) e pressione E.`
        );
        AudioFX.wrong();
      }
      return;
    }

    // return
    if (near(RETURN_POS, 3.2)) {
      disposeBox("return");
    } else {
      setMission(
        `Não autorizado pra van. Devolva na <em>área LARANJA de retorno</em> (${playerObject().position.distanceTo(RETURN_POS).toFixed(1)} m).`
      );
      AudioFX.wrong();
    }
    return;
  }

  const target = findPickupTarget();
  if (target) {
    pickBox(target);
    return;
  }

  setMission("Chegue perto de uma caixa, olhe pra ela e pressione <em>E</em>. Tem umas no chão bem na doca.");
  AudioFX.wrong();
}

function pickBox(box) {
  state.carrying = box;
  state.inspected = false;
  box.userData.taken = true;
  BoxKit.hideBox(box);
  BoxKit.hideHero();
  el.carry.classList.remove("hidden");
  const item = box.userData.product;
  updateCarryHint(item);
  setMission(
    item.markForVan
      ? "Caixa <em>marcada → VAN</em> coletada. Abra na <em>BANCADA</em> antes de entregar."
      : `Pegou <em>${item.name}</em> (${item.authorized ? "ok" : "bloqueado"}). Abra na <em>BANCADA</em> para confirmar o conteúdo.`
  );
  el.status.textContent = "LEVE À BANCADA";
  el.status.classList.remove("warn", "danger");
  AudioFX.pickup();

  boxes.forEach((b) => {
    if (b.userData.ring) {
      b.userData.ring.visible = b.userData.product?.markForVan && !b.userData.taken;
    }
  });
}

function updateCarryHint(item) {
  if (!el.carry) return;
  if (!state.inspected) {
    el.carry.textContent = "Caixa fechada — abra na BANCADA (amarela)";
  } else if (item.authorized) {
    el.carry.textContent = "AUTORIZADO — leve à VAN na doca";
  } else if (item.disposition === "quarantine") {
    el.carry.textContent = "BLOQUEADO — descarte na QUARENTENA vermelha";
  } else {
    el.carry.textContent = "NÃO SAI — devolva na área LARANJA";
  }
}

function openAtBench() {
  const box = state.carrying;
  if (!box) return;
  const item = box.userData.product;
  state.inspected = true;
  box.userData.opened = true;
  state.openFlash = 2.5;

  // mostra a caixa aberta na bancada por um instante visual
  box.position.set(BENCH_POS.x, 1.15, BENCH_POS.z);
  box.scale.set(1.05, 0.55, 1.05);
  BoxKit.showHeroAt(box, BENCH_POS.x, 1.05, BENCH_POS.z, 1.05);
  setTimeout(() => {
    if (state.carrying === box) {
      BoxKit.hideHero();
      box.scale.set(1, 1, 1);
    }
  }, 900);

  const panelInside = document.getElementById("ai-inside");
  if (panelInside) panelInside.textContent = `Conteúdo: ${item.inside}`;

  el.panel.classList.remove("hidden");
  el.title.textContent = item.name;
  el.cat.textContent = item.category;
  el.desc.textContent = item.inside;
  el.meta.textContent = item.meta;
  el.action.textContent = item.authorized
    ? "Inspeção OK — autorizado. Leve à VAN."
    : `${item.reason} Destino: ${item.disposition === "quarantine" ? "QUARENTENA" : "RETORNO"}.`;
  const authEl = document.getElementById("ai-auth");
  if (authEl) {
    authEl.textContent = item.authorized ? "AUTORIZADO PARA VAN" : "NÃO AUTORIZADO";
    authEl.className = `ai-auth ${item.authorized ? "ok" : "deny"}`;
  }

  updateCarryHint(item);
  setMission(
    item.authorized
      ? `<em>Aberto:</em> ${item.inside} → leve à <em>VAN</em> e pressione E.`
      : `<em>Aberto:</em> ${item.inside} → <em>${item.reason}</em> Leve ao destino certo.`
  );
  el.status.textContent = item.authorized ? "ROTA · VAN" : "ROTA · DESCARTE";
  el.status.classList.toggle("danger", !item.authorized);
  AudioFX.lockTarget();
}

function deliverToVan() {
  const box = state.carrying;
  const item = box.userData.product;
  if (!item.authorized) {
    setMission("Sistema bloqueou: este item <em>não</em> pode ir na van.");
    AudioFX.wrong();
    return;
  }
  if (!state.inspected) {
    setMission("Abra a caixa na <em>bancada</em> antes de carregar a van.");
    AudioFX.wrong();
    return;
  }

  state.carrying = null;
  state.inspected = false;
  el.carry.classList.add("hidden");

  BoxKit.hideBox(box);
  BoxKit.attachHeroTo(van, new THREE.Vector3(0, 1.15, 0), box, 0.85);
  VanKit.openRear();

  state.delivered = true;
  state.vanLeaving = true;
  state.vanTimer = 0;
  setMission("<em>Sensor IoT autorizado embarcado!</em> Van partindo…");
  el.status.textContent = "ENTREGA CONCLUÍDA";
  hideAI();
  AudioFX.deliver();
  AudioFX.vanEngine();
}

function disposeBox(kind) {
  const box = state.carrying;
  if (!box || !state.inspected) return;
  const item = box.userData.product;
  state.carrying = null;
  state.inspected = false;
  el.carry.classList.add("hidden");

  box.scale.setScalar(0.75);
  if (kind === "quarantine") {
    box.position.set(QUARANTINE_POS.x, 0.9, QUARANTINE_POS.z);
    BoxKit.showHeroAt(box, QUARANTINE_POS.x, 0.9, QUARANTINE_POS.z, 0.75);
    setMission(
      `<em>${item.name}</em> foi pra quarentena. Continue: ache a caixa <em>verde → VAN</em> (Sensor IoT).`
    );
  } else {
    box.position.set(RETURN_POS.x, 0.75, RETURN_POS.z);
    BoxKit.showHeroAt(box, RETURN_POS.x, 0.75, RETURN_POS.z, 0.75);
    setMission(
      `<em>${item.name}</em> devolvido. Continue procurando o <em>Sensor IoT</em> marcado pelo óculos.`
    );
  }
  // reaparece no chão como instância (hero some após um beat)
  setTimeout(() => {
    BoxKit.hideHero();
    BoxKit.showBoxInWorld(box);
  }, 400);
  box.userData.taken = true;
  el.status.textContent = "ESCANSÃO ATIVA";
  el.status.classList.remove("danger", "warn");
  AudioFX.wrong();
}

// ---------------------------------------------------------------------------
// Escaneamento por olhar
// ---------------------------------------------------------------------------
function updateScan(dt) {
  if (!state.started || state.delivered) {
    hideAI();
    return;
  }
  // carregando: não esconde o painel (inspeção na bancada)
  if (state.carrying) return;

  camera.updateMatrixWorld();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  raycaster.far = 16;
  const hits = raycaster.intersectObjects(boxes, true);

  let found = null;
  for (const h of hits) {
    let obj = h.object;
    while (obj && !obj.userData?.product) obj = obj.parent;
    if (obj && obj.userData.product && !obj.userData.taken && h.distance < 14) {
      found = obj;
      break;
    }
  }

  // fallback: caixa próxima no centro da mira (raycast às vezes falha com grupos)
  if (!found) {
    found = findPickupTarget();
    if (found) {
      const origin = new THREE.Vector3();
      camera.getWorldPosition(origin);
      if (origin.distanceTo(found.position) > 6) found = null;
    }
  }

  if (found) {
    if (state.lookingBox !== found) {
      state.lookingBox = found;
      state.scanProgress = 0;
    }
    const prev = state.scanProgress;
    state.scanProgress = Math.min(1, state.scanProgress + dt * 2.2);
    showAI(found.userData.product, state.scanProgress, found);
    AudioFX.scanTick(state.scanProgress);

    if (prev < 0.45 && state.scanProgress >= 0.45 && found.userData.product?.markForVan) {
      AudioFX.lockTarget();
    }

    if (state.scanProgress > 0.2 && found.userData.ring) {
      found.userData.ring.visible = true;
      const mark = found.userData.product?.markForVan;
      found.userData.ring.material.emissiveIntensity = mark ? 2.6 : 0.9 + state.scanProgress;
      found.userData.ring.rotation.z += dt * 1.5;
    }
  } else {
    if (state.lookingBox && !state.lookingBox.userData.product?.markForVan) {
      state.lookingBox.userData.ring.visible = false;
    }
    state.lookingBox = null;
    state.scanProgress = 0;
    hideAI();
  }
}

// ---------------------------------------------------------------------------
// Movimento + animações
// ---------------------------------------------------------------------------
function updatePlayer(dt) {
  if (!controls.isLocked) return;

  const sprint = keys["ShiftLeft"] || keys["ShiftRight"];
  const moveMul = THREE.MathUtils.clamp(settings.moveSpeed, 30, 150) / 100;
  const base = (sprint ? 8.5 : 5.2) * moveMul;
  const speed = base * dt;

  player.direction.set(0, 0, 0);
  if (keys["KeyW"] || keys["ArrowUp"]) player.direction.z += 1;
  if (keys["KeyS"] || keys["ArrowDown"]) player.direction.z -= 1;
  if (keys["KeyA"] || keys["ArrowLeft"]) player.direction.x -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) player.direction.x += 1;
  if (player.direction.lengthSq() > 0) player.direction.normalize();

  const forward = new THREE.Vector3();
  controls.getDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
  else forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const move = new THREE.Vector3()
    .addScaledVector(forward, player.direction.z * speed)
    .addScaledVector(right, player.direction.x * speed);

  // PointerLock: mover o objeto raiz, NÃO camera.position (senão parece que não anda)
  const pos = playerObject().position;
  const nx = pos.x + move.x;
  const nz = pos.z + move.z;

  if (!blocked(nx, pos.z)) pos.x = nx;
  if (!blocked(pos.x, nz)) pos.z = nz;

  state.breath += dt;
  const moving = player.direction.lengthSq() > 0;
  let bob = Math.sin(state.breath * 1.2) * 0.012;
  if (moving) {
    state.clock += dt * (sprint ? 12 : 8);
    bob += Math.sin(state.clock) * (sprint ? 0.05 : 0.035);
    state.footTimer += dt;
    if (state.footTimer > (sprint ? 0.28 : 0.42)) {
      state.footTimer = 0;
      AudioFX.footstep();
    }
  }
  pos.y = player.height + bob;
}

function updateNav(dt) {
  let goal = state.targetWorld;
  if (state.delivered) goal = DROP_POS;
  else if (state.carrying) {
    const item = state.carrying.userData.product;
    if (!state.inspected) goal = BENCH_POS;
    else if (item.authorized) goal = DROP_POS;
    else if (item.disposition === "quarantine") goal = QUARANTINE_POS;
    else goal = RETURN_POS;
  }
  const ppos = playerObject().position;
  const toGoal = goal.clone().sub(ppos);
  toGoal.y = 0;
  const dist = toGoal.length();

  // HUD meta
  if (el.dist) el.dist.textContent = `DIST ${dist.toFixed(1)} m`;
  if (el.aisle) {
    if (state.carrying && !state.inspected) el.aisle.textContent = "ROTA · BANCADA";
    else if (state.carrying?.userData.product.authorized) el.aisle.textContent = "ROTA · VAN / DOCA";
    else if (state.carrying?.userData.product.disposition === "quarantine") el.aisle.textContent = "ROTA · QUARENTENA";
    else if (state.carrying) el.aisle.textContent = "ROTA · RETORNO";
    else if (state.lookingBox?.userData.aisle) el.aisle.textContent = `CORREDOR ${state.lookingBox.userData.aisle}`;
    else el.aisle.textContent = dist < 14 ? "ALVO → VAN PRÓXIMO" : "PROCURE MARCA VERDE";
  }
  state.battery = Math.max(82, 94 - clock.elapsedTime * 0.015);
  if (el.battery) el.battery.textContent = `BAT ${state.battery.toFixed(0)}%`;

  // bússola HUD
  const forward = new THREE.Vector3();
  controls.getDirection(forward);
  forward.y = 0;
  forward.normalize();
  const angle = Math.atan2(toGoal.x, toGoal.z) - Math.atan2(forward.x, forward.z);
  if (el.needle) el.needle.style.transform = `rotate(${(angle * 180) / Math.PI}deg)`;

  // seta 3D
  if (navArrow && !state.delivered) {
    const ahead = forward.clone().multiplyScalar(2.4);
    navArrow.position.set(
      ppos.x + ahead.x,
      ppos.y - 0.35 + Math.sin(performance.now() * 0.004) * 0.08,
      ppos.z + ahead.z
    );
    navArrow.lookAt(goal.x, navArrow.position.y, goal.z);
    navArrow.visible = state.started;
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.08;
    navArrow.scale.setScalar(pulse);
  } else if (navArrow) {
    navArrow.visible = false;
  }
}

function updateVan(dt) {
  const ring = dropZone.getObjectByName("dropRing");
  if (ring && !state.delivered) {
    const s = 1 + Math.sin(performance.now() * 0.004) * 0.08;
    ring.scale.set(s, s, s);
    ring.rotation.z += dt * 0.8;
  }

  boxes.forEach((b) => {
    if (b.userData.product?.markForVan && !b.userData.taken) {
      if (b.userData.ring) {
        b.userData.ring.visible = state.started;
        const s = 1 + Math.sin(performance.now() * 0.005) * 0.12;
        b.userData.ring.scale.set(s, s, s);
        b.userData.ring.rotation.z += dt * 2;
      }
      if (b.userData.halo) {
        b.userData.halo.material.opacity = 0.18 + Math.sin(performance.now() * 0.004) * 0.1;
      }
      if (b.userData.vanMarker) {
        b.userData.vanMarker.position.y = b.userData.size.sy + 0.55 + Math.sin(performance.now() * 0.006) * 0.1;
      }
      if (b.userData.vanMarkerHead) {
        b.userData.vanMarkerHead.position.y = b.userData.size.sy + 0.95 + Math.sin(performance.now() * 0.006) * 0.1;
      }
    }
  });

  const qRing = stations.quarantine?.getObjectByName("qRing");
  if (qRing) {
    qRing.rotation.z += dt * 1.2;
    const s = 1 + Math.sin(performance.now() * 0.004) * 0.06;
    qRing.scale.set(s, s, s);
  }

  // flicker sutil das luzes
  if (settings.ceilingLights) {
    const t = performance.now() * 0.001;
    flickerLights.forEach((f, i) => {
      if (Math.sin(t * 2.1 + f.phase) > 0.97) {
        f.light.intensity = f.base * (0.55 + Math.random() * 0.2);
      } else {
        f.light.intensity = THREE.MathUtils.lerp(f.light.intensity, f.base * (0.9 + 0.1 * Math.sin(t + i)), 0.1);
      }
    });
  }

  if (!state.vanLeaving) return;

  state.vanTimer += dt;
  if (state.vanTimer > 1.2) {
    const vt = state.vanTimer - 1.2;
    van.position.x = -48 - vt * 14;
    van.position.z = 0 + vt * 2.2;
    van.rotation.y = -vt * 0.12;
    VanKit.spinWheels(dt);

    // névoa mais densa ao sair
    scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.028, dt * 0.4);

    if (vt > 4.5 && el.win.classList.contains("hidden")) {
      controls.unlock();
      el.hud.classList.add("hidden");
      el.btnSettingsHud.classList.add("hidden");
      el.win.classList.remove("hidden");
    }
  }
}

function updateClockHud() {
  const t = Math.floor(performance.now() / 1000) % 3600;
  const mm = String(Math.floor(t / 60)).padStart(2, "0");
  const ss = String(t % 60).padStart(2, "0");
  el.clock.textContent = `${mm}:${ss}`;
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function setStartButtonReady() {
  const btn = document.getElementById("btn-start");
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = "COLOCAR ÓCULOS E JOGAR";
}

async function boot() {
  syncSettingsUI();
  applyAllSettings();

  const btn = document.getElementById("btn-start");
  const setLoad = (t) => {
    if (btn) {
      btn.disabled = true;
      btn.textContent = t;
    }
  };
  setLoad("1/3 GALPÃO…");
  try {
    await WarehouseKit.load();
  } catch (e) {
    console.warn("WarehouseKit:", e);
  }

  setLoad("2/3 CAIXAS…");
  try {
    await BoxKit.load();
  } catch (e) {
    console.warn("BoxKit:", e);
  }

  setLoad("3/3 VAN…");
  try {
    await VanKit.load();
  } catch (e) {
    console.warn("VanKit:", e);
  }

  // monta o mundo COM os modelos já carregados (senão eles não entram na cena)
  try {
    setLoad("MONTANDO CENA…");
    buildWarehouse();
    buildShelvesAndBoxes();
    buildVan();
    buildLights();
    applyAllSettings();
    state.worldReady = true;
    setStartButtonReady();
    const status = `OK · galpão=${WarehouseKit.ready ? "modelo" : "basic"} · caixa=${BoxKit.ready ? "modelo" : "basic"} · van=${VanKit.ready ? "modelo" : "basic"}`;
    console.log(status, `| ${boxes.length} caixas`);
    if (btn) btn.title = status;
    if (!BoxKit.ready || !VanKit.ready) {
      console.warn(
        "Abra o jogo por http://localhost:8765 (rode game/serve.ps1). file:// bloqueia GLB/GLTF."
      );
    }
  } catch (err) {
    console.error("Erro ao montar o galpão:", err);
    if (btn) {
      btn.disabled = false;
      btn.textContent = "TENTAR DE NOVO";
      btn.onclick = () => location.reload();
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!state.settingsOpen && state.worldReady) {
    updatePlayer(dt);
    updateScan(dt);
    updateNav(dt);
    updateVan(dt);
  }
  updateDust(dt);
  updateClockHud();
  renderer.render(scene, camera);
}

animate();
boot();
