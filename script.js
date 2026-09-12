const GLTFLoader = THREE.GLTFLoader;
const FBXLoader = THREE.FBXLoader;
const OrbitControls = THREE.OrbitControls;

const ASSETS = {
  model: "./assets/model.glb",
  idle: "./assets/Happy%20Idle.fbx",
  hitHead: "./assets/Hit%20On%20Side%20Of%20Head.fbx",
  laugh: "./assets/Laughing.fbx",
  stumble: "./assets/Jogging%20Stumble.fbx"
};

const stateKey = "bestCatBoyfriendState";
const canvas = document.querySelector("#canvas3d");
const speech = document.querySelector("#speechText");
const effectLayer = document.querySelector("#effectLayer");
const loader = document.querySelector("#loader");
const loaderTitle = document.querySelector("#loaderTitle");
const loaderText = document.querySelector("#loaderText");
const loaderSpinner = document.querySelector("#loaderSpinner");
const filePicker = document.querySelector("#filePicker");
const filePickBtn = document.querySelector("#filePickBtn");

const loveFill = document.querySelector("#loveFill");
const loveValue = document.querySelector("#loveValue");
const energyFill = document.querySelector("#energyFill");
const energyValue = document.querySelector("#energyValue");
const moodText = document.querySelector("#moodText");
const micButton = document.querySelector("#micButton");
const micLabel = document.querySelector("#micLabel");
const actionButtons = document.querySelectorAll("[data-action]");

const lines = {
  welcome: [
    "今天也想被你偏爱。",
    "我已经乖乖站好了，等你来戳。",
    "你的宝宝已上线。"
  ],
  head: [
    "哎呀，头发乱了你要负责。",
    "这里面现在全是你。",
    "被你点到会自动变乖。"
  ],
  belly: [
    "哈哈哈哈，肚子真的怕痒。",
    "不准偷袭，除非你再抱一下。",
    "我投降，这局算你赢。"
  ],
  feet: [
    "哎哟，踩到脚趾啦。",
    "脚脚抗议，但本人不敢。",
    "我跳一下，你笑一下。"
  ],
  poke: [
    "轻一点嘛，我会害羞。",
    "再戳一下，我就要脸红了。",
    "这里是本人专属互动按钮。"
  ],
  hug: [
    "抱紧一点，今天电量满格。",
    "这个抱抱我先存起来。",
    "被你抱住的时候最乖。"
  ],
  boba: [
    "全糖加波霸，快乐直接起飞。",
    "这口奶茶有你的偏心味。",
    "被投喂的人会自动开心。"
  ],
  flower: [
    "花收下了，人也归你。",
    "鲜花赠给全世界最好看的你。",
    "这束花的意思是，我今天也喜欢你。"
  ],
  quote: [
    "你知道你和星星的区别吗？星星在天上，你在我心里。",
    "我本来想讲道理，但一看到你就只想讲情话。",
    "今天的限定台词：我超喜欢你。"
  ],
  sleep: [
    "晚安，梦里也要见。",
    "我先乖乖充电，醒来继续想你。",
    "困了，但是还想牵手。"
  ],
  listen: [
    "我听见啦，正在把这句话藏进心里。",
    "收到。你的声音是今日彩蛋。",
    "嗯嗯，我在认真听。"
  ]
};

const moodTable = [
  { min: 0, label: "想被哄" },
  { min: 25, label: "乖乖等你" },
  { min: 48, label: "有点害羞" },
  { min: 72, label: "超开心" },
  { min: 90, label: "满格心动" }
];

const savedState = readState();
let love = savedState.love;
let energy = savedState.energy;
let lastInteraction = performance.now();
let activeTimeout = 0;
let audioContext = null;
let recognition = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let mediaStream = null;
let lastRecognizedText = "";

const gameEl = document.querySelector(".game");
let speechTimer = 0;
let userActiveTime = performance.now();
let isImmersionMode = false;

let scene;
let camera;
let renderer;
let controls;
let mixer;
let avatar;
let activeAction;
let modelHeight = 1.75;
let propsGroup;
let lookTarget = null;

const actions = {};
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPoint = { x: 0, y: 0 };

boot();

function readState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(stateKey) || "{}");
    return {
      love: Number.isFinite(parsed.love) ? parsed.love : 52,
      energy: Number.isFinite(parsed.energy) ? parsed.energy : 76
    };
  } catch {
    return { love: 52, energy: 76 };
  }
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify({ love, energy }));
}

function boot() {
  setupScene();
  setupUi();
  updateMeters();
  say(choose(lines.welcome));
  loadAvatarAuto();
  animate();
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.22, 3.25);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.panSpeed = 0.85;
  controls.rotateSpeed = 0.45;
  controls.zoomSpeed = 0.9;
  controls.minDistance = 1.2;
  controls.maxDistance = 6.0;
  controls.target.set(0, 0.92, 0);
  controls.minPolarAngle = Math.PI * 0.2;
  controls.maxPolarAngle = Math.PI * 0.65;
  if (THREE.TOUCH) {
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
  }

  const hemi = new THREE.HemisphereLight(0xffffff, 0xffb3a8, 1.05);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(3.2, 5.6, 3.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);

  const fill = new THREE.PointLight(0x66a6ff, 0.9, 6);
  fill.position.set(-2.5, 2.2, 2.5);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 96),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.02,
      transparent: true,
      opacity: 0.62
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.012, 10, 120),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 })
  );
  rim.rotation.x = Math.PI / 2;
  scene.add(rim);

  propsGroup = new THREE.Group();
  scene.add(propsGroup);
}

function setupUi() {
  window.addEventListener("resize", resize);

  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, wakeUpUi, { passive: true });
  });

  let isMultiTouchGesture = false;

  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length > 1) {
      isMultiTouchGesture = true;
    }
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    if (e.touches.length === 0) {
      window.setTimeout(() => { isMultiTouchGesture = false; }, 120);
    }
  }, { passive: true });

  canvas.addEventListener("pointerdown", (event) => {
    downPoint = { x: event.clientX, y: event.clientY };
  });

  canvas.addEventListener("pointerup", (event) => {
    if (isMultiTouchGesture) return;
    const moved = Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y);
    if (moved > 8) return;
    handleModelTap(event);
  });

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });

  micButton.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  micButton.addEventListener("pointerdown", (e) => {
    if (e.cancelable) e.preventDefault();
    try {
      micButton.setPointerCapture(e.pointerId);
    } catch {}
    startListening();
  });

  micButton.addEventListener("pointerup", (e) => {
    try {
      micButton.releasePointerCapture(e.pointerId);
    } catch {}
    stopListening();
  });

  micButton.addEventListener("pointercancel", (e) => {
    try {
      micButton.releasePointerCapture(e.pointerId);
    } catch {}
    stopListening();
  });

  micButton.addEventListener("touchstart", (e) => {
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  micButton.addEventListener("touchend", (e) => {
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  filePickBtn.addEventListener("click", () => filePicker.click());
  filePicker.addEventListener("change", handleManualFileSelect);

  const resetBtn = document.querySelector("#resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetCameraView);
  }

  const uiToggleBtn = document.querySelector("#uiToggleBtn");
  if (uiToggleBtn) {
    uiToggleBtn.addEventListener("click", toggleImmersionMode);
  }
}

function wakeUpUi() {
  userActiveTime = performance.now();
  if (gameEl && gameEl.classList.contains("is-dimmed")) {
    gameEl.classList.remove("is-dimmed");
  }
}

function toggleImmersionMode(e) {
  if (e) e.stopPropagation();
  isImmersionMode = !isImmersionMode;
  const icon = document.querySelector("#uiToggleIcon");
  const label = document.querySelector("#uiToggleLabel");

  if (isImmersionMode) {
    gameEl.classList.add("is-hidden-ui");
    if (icon) icon.textContent = "🙈";
    if (label) label.textContent = "完整";
  } else {
    gameEl.classList.remove("is-hidden-ui");
    if (icon) icon.textContent = "👁️";
    if (label) label.textContent = "沉浸";
    say("已恢复完整界面~ ✨");
  }
}

function resetCameraView() {
  controls.target.set(0, 0.92, 0);
  camera.position.set(0, 1.22, 3.25);
  camera.lookAt(0, 0.92, 0);
  controls.update();
  say("视角已归位，宝宝在正中间啦~ 🎯");
  playTone("poke");
}

async function loadAvatarAuto() {
  updateLoader("正在召唤 3D 汤姆猫", "正在尝试读取模型与动作资源...", true);

  try {
    const gltfLoader = new GLTFLoader();
    const fbxLoader = new FBXLoader();

    const modelUrl = ASSETS.model;
    const modelBuffer = await fetchArrayBuffer(modelUrl);

    if (isGlbBuffer(modelBuffer)) {
      await new Promise((resolve, reject) => {
        gltfLoader.parse(modelBuffer, '', (gltf) => {
          avatar = gltf.scene;
          resolve();
        }, reject);
      });
    } else {
      avatar = fbxLoader.parse(modelBuffer, '');
    }

    prepareAvatar();
    mixer = new THREE.AnimationMixer(avatar);

    updateLoader("正在挂载 3D 动作", "正在对接待机、受击、大笑和踩脚动作...", true);

    const [iBuf, hBuf, lBuf, sBuf] = await Promise.all([
      fetchArrayBuffer(ASSETS.idle),
      fetchArrayBuffer(ASSETS.hitHead),
      fetchArrayBuffer(ASSETS.laugh),
      fetchArrayBuffer(ASSETS.stumble)
    ]);

    actions['idle'] = mixer.clipAction(adaptMixamoClip(fbxLoader.parse(iBuf, '').animations[0], avatar));
    actions['hitHead'] = mixer.clipAction(adaptMixamoClip(fbxLoader.parse(hBuf, '').animations[0], avatar));
    actions['laugh'] = mixer.clipAction(adaptMixamoClip(fbxLoader.parse(lBuf, '').animations[0], avatar));
    actions['stumble'] = mixer.clipAction(adaptMixamoClip(fbxLoader.parse(sBuf, '').animations[0], avatar));

    playAction("idle", 0.1, true);
    hideLoader();
    say("看！我好端端站在你面前啦，戳戳我吧~");

  } catch (err) {
    console.warn("自动加载资源受阻:", err);
    const isFileProtocol = location.protocol === 'file:';
    showLoadError(
      isFileProtocol ? "本地双击模式受阻" : "模型载入受阻",
      isFileProtocol
        ? "浏览器出于安全限制无法在本地双击(file://)下直接读取文件。请点击下方按钮，一次性选择那 5 个模型文件即可开启游戏！"
        : `读取 3D 资源失败：${err.message || '网络连接或 URL 错误'}。请刷新重试或手动加载。`
    );
  }
}

async function handleManualFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  let modelFile = null, idleFile = null, hitFile = null, laughFile = null, stumbleFile = null;

  files.forEach(f => {
    const name = f.name.toLowerCase();
    if (name.includes('idle')) idleFile = f;
    else if (name.includes('hit') || name.includes('head')) hitFile = f;
    else if (name.includes('laugh')) laughFile = f;
    else if (name.includes('stumble') || name.includes('jogging')) stumbleFile = f;
    else if (name.endsWith('.glb') || name.endsWith('.gltf') || name.includes('model')) modelFile = f;
  });

  if (!modelFile || !idleFile || !hitFile || !laughFile || !stumbleFile) {
    alert("请确保一次性选齐了 5 个文件（1个 model.glb + 4个动作 .fbx）");
    return;
  }

  updateLoader("正在解析本地 3D 模型", "请稍等片刻...", true);

  try {
    const gltfLoader = new GLTFLoader();
    const fbxLoader = new FBXLoader();

    const modelBuf = await modelFile.arrayBuffer();

    if (isGlbBuffer(modelBuf) || modelFile.name.toLowerCase().endsWith('.glb')) {
      await new Promise((resolve, reject) => {
        gltfLoader.parse(modelBuf, '', (gltf) => {
          avatar = gltf.scene;
          resolve();
        }, reject);
      });
    } else {
      avatar = fbxLoader.parse(modelBuf, '');
    }

    prepareAvatar();
    mixer = new THREE.AnimationMixer(avatar);

    const [iBuf, hBuf, lBuf, sBuf] = await Promise.all([
      idleFile.arrayBuffer(), hitFile.arrayBuffer(), laughFile.arrayBuffer(), stumbleFile.arrayBuffer()
    ]);

    actions['idle'] = mixer.clipAction(adaptMixamoClip(fbxLoader.parse(iBuf, '').animations[0], avatar));
    actions['hitHead'] = mixer.clipAction(adaptMixamoClip(fbxLoader.parse(hBuf, '').animations[0], avatar));
    actions['laugh'] = mixer.clipAction(adaptMixamoClip(fbxLoader.parse(lBuf, '').animations[0], avatar));
    actions['stumble'] = mixer.clipAction(adaptMixamoClip(fbxLoader.parse(sBuf, '').animations[0], avatar));

    playAction("idle", 0.1, true);
    hideLoader();
    say("成功加载！你的 3D 男友汤姆就位！");

  } catch (err) {
    showLoadError("模型解析失败", err.message || "未能解析选择的文件，请重试。");
  }
}

async function fetchArrayBuffer(url) {
  const safeUrl = encodeURI(decodeURI(url));
  const res = await fetch(safeUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} when fetching ${safeUrl}`);
  return await res.arrayBuffer();
}

function isGlbBuffer(buf) {
  if (!buf || buf.byteLength < 4) return false;
  const view = new DataView(buf);
  return view.getUint32(0, false) === 0x676C5446;
}

function prepareAvatar() {
  if (!avatar) return;

  if (avatar.parent) avatar.parent.remove(avatar);

  const initialBox = new THREE.Box3().setFromObject(avatar);
  const size = initialBox.getSize(new THREE.Vector3());
  modelHeight = size.y || 1.75;

  if (size.y > 0 && Math.abs(size.y - 1.75) > 0.1) {
    const scale = 1.75 / size.y;
    avatar.scale.setScalar(scale);
    modelHeight = 1.75;
  }

  avatar.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.side = THREE.FrontSide;
        child.material.needsUpdate = true;
      }
    }
  });

  const box = new THREE.Box3().setFromObject(avatar);
  avatar.position.y = -box.min.y;
  avatar.rotation.y = 0;
  scene.add(avatar);
}

function adaptMixamoClip(clip, model) {
  if (!clip || !model) return clip;

  const modelNodeNames = new Set();
  model.traverse((child) => {
    if (child.name) modelNodeNames.add(child.name);
  });

  clip.tracks.forEach((track) => {
    const parts = track.name.split(".");
    const trackBoneName = parts[0];
    const prop = parts.slice(1).join(".");

    let matchedBoneName = trackBoneName;
    if (!modelNodeNames.has(trackBoneName)) {
      const cleanName = trackBoneName.replace(/^mixamorig:?/i, "").toLowerCase();
      for (const mName of modelNodeNames) {
        const cleanMName = mName.replace(/^mixamorig:?/i, "").toLowerCase();
        if (cleanMName === cleanName) {
          matchedBoneName = mName;
          break;
        }
      }
    }
    track.name = `${matchedBoneName}.${prop}`;

    if (prop === "position") {
      let maxPos = 0;
      for (let i = 0; i < track.values.length; i += 1) {
        maxPos = Math.max(maxPos, Math.abs(track.values[i]));
      }
      if (maxPos > 20 && modelHeight < 3.0) {
        for (let i = 0; i < track.values.length; i += 1) {
          track.values[i] *= 0.01;
        }
      }
    }
  });

  return clip;
}

function playAction(name, fade = 0.2, loop = false) {
  const next = actions[name];
  if (!next) return;

  next.reset();
  next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  next.clampWhenFinished = !loop;
  next.enabled = true;

  if (activeAction && activeAction !== next) {
    activeAction.crossFadeTo(next, fade, true);
  }

  next.play();
  activeAction = next;

  window.clearTimeout(activeTimeout);
  if (!loop && actions.idle) {
    const delay = Math.max((next.getClip().duration - 0.22) * 1000, 800);
    activeTimeout = window.setTimeout(() => {
      if (activeAction === next) {
        playAction("idle", 0.35, true);
      }
    }, delay);
  }
}

function handleModelTap(event) {
  if (!avatar) return;

  const point = getScreenPoint(event.clientX, event.clientY);
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObject(avatar, true);
  if (!hits.length) return;

  const hit = hits[0];
  const box = new THREE.Box3().setFromObject(avatar);
  const height = box.max.y - box.min.y || 1;
  const relY = (hit.point.y - box.min.y) / height;

  lookTarget = hit.point.clone();
  spawnRing(point.x, point.y);

  if (relY >= 0.72) {
    react("head", "hitHead", 2, -4, point);
  } else if (relY >= 0.38) {
    react("belly", "laugh", 3, -6, point);
  } else {
    react("feet", "stumble", 1, -7, point);
  }
}

function handleAction(action) {
  const point = centerPoint();

  if (action === "poke") {
    react("poke", "hitHead", 2, -3, point);
  }

  if (action === "hug") {
    react("hug", "idle", 7, 3, point, "heart", 16);
    nudgeAvatar(0.06);
  }

  if (action === "boba") {
    react("boba", "laugh", 5, 10, point, "food", 14);
    showProp("boba");
  }

  if (action === "flower") {
    react("flower", "idle", 6, 1, point, "flower", 16);
    showProp("flower");
  }

  if (action === "quote") {
    react("quote", "laugh", 8, -2, point, "heart", 18);
    showProp("heart");
  }

  if (action === "sleep") {
    react("sleep", "idle", 4, 18, point, "sleep", 12);
    showProp("moon");
  }
}

function react(lineKey, animation, loveDelta, energyDelta, point, particleKind = "heart", count = 10) {
  unlockAudio();
  lastInteraction = performance.now();
  say(choose(lines[lineKey]));
  playAction(animation, 0.18, animation === "idle");
  spawnParticles(point.x, point.y, particleKind, count);
  updateStats(loveDelta, energyDelta);
  playTone(lineKey);
}

function updateStats(loveDelta, energyDelta) {
  love = clamp(love + loveDelta, 0, 100);
  energy = clamp(energy + energyDelta, 0, 100);
  updateMeters();
  saveState();
}

function updateMeters() {
  loveFill.style.width = `${love}%`;
  energyFill.style.width = `${energy}%`;
  loveValue.textContent = String(Math.round(love));
  energyValue.textContent = String(Math.round(energy));

  const mood = moodTable.reduce((best, item) => (love >= item.min ? item : best), moodTable[0]);
  moodText.textContent = energy < 18 ? "需要充电" : mood.label;
}

function say(text) {
  if (!text) return;
  wakeUpUi();
  speech.textContent = text;
  speech.classList.remove("is-hidden");
  speech.classList.remove("pop");
  requestAnimationFrame(() => speech.classList.add("pop"));
  window.setTimeout(() => speech.classList.remove("pop"), 210);

  window.clearTimeout(speechTimer);
  speechTimer = window.setTimeout(() => {
    speech.classList.add("is-hidden");
  }, 4200);
}

async function startListening() {
  unlockAudio();
  isRecording = true;
  micButton.classList.add("is-recording");
  micLabel.textContent = "正在听...";
  say("在听在听！对我说句话，松开我就模仿你~ 🎙️");
  audioChunks = [];
  lastRecognizedText = "";

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = processRecordedAudio;
      mediaRecorder.start();
    }
  } catch (err) {
    console.warn("麦克风权限打开失败:", err);
  }

  if (!recognition) setupSpeechRecognition();
  if (recognition) {
    try { recognition.start(); } catch { }
  }
}

function stopListening() {
  if (!isRecording) return;
  isRecording = false;
  micButton.classList.remove("is-recording");
  micLabel.textContent = "按住说话";

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  if (recognition) {
    try { recognition.stop(); } catch { }
  }
}

async function processRecordedAudio() {
  if (audioChunks.length === 0) return;
  const blob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
  try {
    const arrayBuffer = await blob.arrayBuffer();
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") await audioContext.resume();

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    playPitchShiftedAudio(audioBuffer);
  } catch (err) {
    console.warn("音频解码变声失败:", err);
  }
}

function playPitchShiftedAudio(buffer) {
  if (!audioContext) return;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = 1.45;

  source.connect(audioContext.destination);
  source.start(0);

  playAction("laugh", 0.15);
  const displayText = lastRecognizedText ? `“${lastRecognizedText}”` : "（汤姆高音复读中... 😸）";
  say(`汤姆模仿你：${displayText}`);
  updateStats(5, -2);
  spawnParticles(centerPoint().x, centerPoint().y, "heart", 14);
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript?.trim();
    if (text) {
      lastRecognizedText = text;
    }
  };
}

function showProp(type) {
  propsGroup.clear();
  let prop;

  if (type === "boba") prop = makeBobaCup();
  else if (type === "flower") prop = makeFlowers();
  else if (type === "moon") prop = makeMoon();
  else prop = makeHeart();

  prop.position.set(0.68, 0.95, 0.15);
  propsGroup.add(prop);

  window.setTimeout(() => {
    propsGroup.clear();
  }, 2600);
}

function makeBobaCup() {
  const group = new THREE.Group();
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 0.34, 32),
    new THREE.MeshStandardMaterial({ color: 0xf7c48b, roughness: 0.45, transparent: true, opacity: 0.82 })
  );
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.035, 32),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32 })
  );
  const straw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.46, 12),
    new THREE.MeshStandardMaterial({ color: 0xef5d75, roughness: 0.4 })
  );
  lid.position.y = 0.19;
  straw.position.set(0.04, 0.32, 0);
  straw.rotation.z = -0.28;
  group.add(cup, lid, straw);

  for (let i = 0; i < 9; i += 1) {
    const pearl = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x2d2230, roughness: 0.55 })
    );
    pearl.position.set(randFloat(-0.095, 0.095), randFloat(-0.12, -0.02), randFloat(-0.07, 0.07));
    group.add(pearl);
  }

  return group;
}

function makeFlowers() {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x65c7a0, roughness: 0.6 });
  const colors = [0xef5d75, 0xf4bf45, 0x8a75d6, 0x66a6ff];

  for (let i = 0; i < 5; i += 1) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 8), stemMat);
    stem.position.x = (i - 2) * 0.035;
    stem.rotation.z = (i - 2) * -0.1;
    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 18, 18),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.5 })
    );
    bloom.position.set(stem.position.x + (i - 2) * 0.018, 0.19 + Math.abs(i - 2) * 0.018, 0);
    group.add(stem, bloom);
  }

  return group;
}

function makeMoon() {
  const group = new THREE.Group();
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xf4df86, roughness: 0.42, emissive: 0x221600, emissiveIntensity: 0.18 })
  );
  const cut = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xf5f7ff })
  );
  cut.position.x = 0.055;
  group.add(moon, cut);
  return group;
}

function makeHeart() {
  const group = new THREE.Group();
  const left = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xef5d75, roughness: 0.38 })
  );
  const right = left.clone();
  const bottom = new THREE.Mesh(
    new THREE.ConeGeometry(0.105, 0.16, 4),
    new THREE.MeshStandardMaterial({ color: 0xef5d75, roughness: 0.38 })
  );
  left.position.set(-0.045, 0.035, 0);
  right.position.set(0.045, 0.035, 0);
  bottom.position.y = -0.035;
  bottom.rotation.z = Math.PI / 4;
  group.add(left, right, bottom);
  return group;
}

function nudgeAvatar(amount) {
  if (!avatar) return;
  avatar.scale.multiplyScalar(1 + amount);
  window.setTimeout(() => {
    if (avatar) avatar.scale.multiplyScalar(1 / (1 + amount));
  }, 520);
}

function spawnParticles(x, y, kind = "heart", count = 10) {
  const symbols = {
    heart: ["♡", "♥", "+"],
    food: ["◇", "◆", "♡"],
    flower: ["✿", "♡", "+"],
    sleep: ["☾", "°", "·"]
  };
  const colors = ["#ef5d75", "#f4bf45", "#65c7a0", "#66a6ff", "#8a75d6"];

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.textContent = choose(symbols[kind] || symbols.heart);
    particle.style.setProperty("--x", `${x + rand(-34, 34)}px`);
    particle.style.setProperty("--y", `${y + rand(-22, 22)}px`);
    particle.style.setProperty("--size", `${rand(16, 28)}px`);
    particle.style.setProperty("--color", choose(colors));
    particle.style.setProperty("--drift", `${rand(-54, 54)}px`);
    particle.style.setProperty("--spin", `${rand(-40, 40)}deg`);
    effectLayer.appendChild(particle);
    particle.addEventListener("animationend", () => particle.remove(), { once: true });
  }
}

function spawnRing(x, y) {
  const ring = document.createElement("span");
  ring.className = "tap-ring";
  ring.style.setProperty("--x", `${x}px`);
  ring.style.setProperty("--y", `${y}px`);
  ring.style.setProperty("--size", "28px");
  effectLayer.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove(), { once: true });
}

function unlockAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(type) {
  if (!audioContext) return;

  const patterns = {
    head: [480, 620],
    belly: [360, 470, 610],
    feet: [220, 180, 260],
    poke: [420, 560],
    hug: [330, 440, 660],
    boba: [260, 320, 420],
    flower: [392, 523, 659],
    quote: [523, 659, 784],
    sleep: [392, 330, 262],
    listen: [440, 554]
  };
  const notes = patterns[type] || patterns.poke;
  const now = audioContext.currentTime;

  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type === "sleep" ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now + index * 0.075);
    gain.gain.linearRampToValueAtTime(0.055, now + index * 0.075 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.075 + 0.17);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now + index * 0.075);
    oscillator.stop(now + index * 0.075 + 0.18);
  });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  if (mixer) mixer.update(delta);

  if (avatar) {
    const idleBob = Math.sin(elapsed * 1.7) * 0.012;
    avatar.position.y = Math.max(0, avatar.position.y + idleBob * delta);
    if (lookTarget) {
      avatar.rotation.y += (clamp(-lookTarget.x * 0.18, -0.16, 0.16) - avatar.rotation.y) * 0.04;
    } else {
      avatar.rotation.y += (Math.sin(elapsed * 0.45) * 0.035 - avatar.rotation.y) * 0.025;
    }
  }

  propsGroup.children.forEach((child, index) => {
    child.rotation.y += delta * (0.8 + index * 0.08);
    child.position.y = 0.95 + Math.sin(elapsed * 2.4 + index) * 0.025;
  });

  controls.update();
  renderer.render(scene, camera);

  if (!isImmersionMode && performance.now() - userActiveTime > 4500) {
    if (gameEl && !gameEl.classList.contains("is-dimmed")) {
      gameEl.classList.add("is-dimmed");
    }
  }

  if (performance.now() - lastInteraction > 18000 && energy > 8) {
    lastInteraction = performance.now();
    updateStats(-1, -2);
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateLoader(title, text, showSpinner = true) {
  loader.classList.remove("is-hidden");
  loaderTitle.textContent = title;
  loaderText.textContent = text;
  if (loaderSpinner) loaderSpinner.style.display = showSpinner ? "block" : "none";
  if (filePickBtn) filePickBtn.style.display = "none";
}

function hideLoader() {
  loader.classList.add("is-hidden");
}

function showLoadError(title, text) {
  loader.classList.remove("is-hidden");
  loaderTitle.textContent = title;
  loaderText.textContent = text;
  if (loaderSpinner) loaderSpinner.style.display = "none";
  if (filePickBtn) filePickBtn.style.display = "inline-block";
}

function getScreenPoint(clientX, clientY) {
  const rect = effectLayer.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function centerPoint() {
  const rect = effectLayer.getBoundingClientRect();
  return {
    x: rect.width / 2,
    y: rect.height * 0.48
  };
}

function choose(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rand(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function randFloat(min, max) {
  return min + Math.random() * (max - min);
}
