/* ===== PWA ===== */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js");
}

/* ===== Simple local DB ===== */
const DB = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

/* ===== Network badge ===== */
const netBadge = document.getElementById("netBadge");
const updateNet = () => netBadge.textContent = navigator.onLine ? "online" : "offline-ready";
window.addEventListener("online", updateNet);
window.addEventListener("offline", updateNet);
updateNet();

/* ===== Theme toggle ===== */
const themeToggle = document.getElementById("themeToggle");
const body = document.body;
const getTheme = () => localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const setTheme = (theme) => {
  body.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
};
setTheme(getTheme());
themeToggle.onclick = () => setTheme(body.getAttribute("data-theme") === "dark" ? "light" : "dark");

/* ===== Disclaimer gate + onboarding ===== */
const GATE_VERSION = "v2.0";
const gate = document.getElementById("disclaimerGate");
const gateStep = document.getElementById("gateStep");
const gateBack = document.getElementById("gateBack");
const gateNext = document.getElementById("gateNext");

const onboarding = { step: 0 };

const gateScreens = [
  {
    title: "Límites de uso",
    html: "<ul><li>Steam Out es solo una herramienta de autorregulación.</li><li>No ofrece diagnóstico, terapia ni intervención clínica.</li><li>Si hay riesgo inminente, no uses la app y busca ayuda humana inmediata.</li></ul>"
  },
  {
    title: "Comprensión 1/2",
    html: "<p>¿Esta app reemplaza tratamiento profesional?</p><label><input type='radio' name='q1' value='no'> No</label><br><label><input type='radio' name='q1' value='yes'> Sí</label>"
  },
  {
    title: "Comprensión 2/2",
    html: "<p>¿Comprendes este límite: si hay riesgo inminente, no debes usar la app y debes buscar ayuda inmediata?</p><label><input type='radio' name='q2' value='yes'> Sí, lo comprendo</label><br><label><input type='radio' name='q2' value='no'> No</label>"
  }
];

function renderGateStep() {
  const cfg = gateScreens[onboarding.step];
  gateStep.innerHTML = `<div class="gate-step"><h2>${cfg.title}</h2>${cfg.html}</div>`;
  gateBack.style.display = onboarding.step === 0 ? "none" : "";
  gateNext.textContent = onboarding.step === gateScreens.length - 1 ? "Finalizar" : "Continuar";
}

function completeGate() {
  const q1 = document.querySelector("input[name='q1']:checked")?.value;
  const q2 = document.querySelector("input[name='q2']:checked")?.value;
  if (q1 !== "no" || q2 !== "yes") {
    onboarding.step = 0;
    renderGateStep();
    alert("Repasemos los límites para un uso seguro.");
    return;
  }

  DB.set("disclaimer", { accepted: true, version: GATE_VERSION, acceptedAt: new Date().toISOString() });

  gate.classList.remove("show");
  gate.setAttribute("aria-hidden", "true");
}

gateBack.onclick = () => {
  onboarding.step = Math.max(0, onboarding.step - 1);
  renderGateStep();
};

gateNext.onclick = () => {
  if (onboarding.step < gateScreens.length - 1) {
    onboarding.step += 1;
    renderGateStep();
    return;
  }
  completeGate();
};

function initGate() {
  const accepted = DB.get("disclaimer");
  if (!accepted || accepted.version !== GATE_VERSION) {
    gate.classList.add("show");
    gate.setAttribute("aria-hidden", "false");
    renderGateStep();
  }
}

/* ===== 14-day reminder ===== */
function maybeShowReminder() {
  const reminderCard = document.getElementById("reminderCard");
  const lastShown = DB.get("lastDisclaimerReminder", null);
  const now = Date.now();
  const days = lastShown ? (now - new Date(lastShown).getTime()) / (1000 * 60 * 60 * 24) : Infinity;
  if (days >= 14) {
    reminderCard.style.display = "block";
    DB.set("lastDisclaimerReminder", new Date().toISOString());
  }
}

/* ===== Crisis mode ===== */
const crisisBtn = document.getElementById("crisisBtn");
const crisisScreen = document.getElementById("crisisScreen");
const closeCrisis = document.getElementById("closeCrisis");

function setCrisisScreen(show) {
  crisisScreen.classList.toggle("show", show);
  body.classList.toggle("crisis-active", show);
  if (show) {
    DB.set("crisisEvents", [...DB.get("crisisEvents", []), { at: new Date().toISOString(), source: "manual" }]);
  }
}

crisisBtn.onclick = () => setCrisisScreen(true);
closeCrisis.onclick = () => setCrisisScreen(false);

/* ===== Overlay base + EMA ===== */
const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovStepTitle = document.getElementById("ovStepTitle");
const ovHint = document.getElementById("ovHint");
const ovTapArea = document.getElementById("ovTapArea");
const ovCount = document.getElementById("ovCount");
const ovProgress = document.getElementById("ovProgress");
const breathTimer = document.getElementById("breathTimer");
const ovNext = document.getElementById("ovNext");
const ovClose = document.getElementById("ovClose");
const ovIllustration = document.getElementById("ovIllustration");
const ovImg = document.getElementById("ovImg");
const ovStop = document.getElementById("ovStop");
const emaBox = document.getElementById("emaBox");
const emaActivation = document.getElementById("emaActivation");
const emaDistress = document.getElementById("emaDistress");
const emaContinue = document.getElementById("emaContinue");

let currentTool = "";
let pendingStart = null;

function openOverlay() {
  overlay.classList.add("show");
  overlay.removeAttribute("aria-hidden");
  ovProgress.style.width = "0%";
  ovIllustration.style.display = "none";
}

function closeOverlay() {
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  pendingStart = null;
  emaActivation.value = "";
  emaDistress.value = "";
  emaBox.classList.add("hidden");
  ovNext.disabled = false;
  if (document.activeElement) document.activeElement.blur();
}
ovClose.onclick = closeOverlay;
ovStop.onclick = () => runUniversalStop();

function parseEMAInput(el) {
  const n = Number(el.value);
  if (Number.isNaN(n) || n < 0 || n > 10) return null;
  return Math.round(n);
}

function saveEMA(tool, phase) {
  const activation = parseEMAInput(emaActivation);
  const distress = parseEMAInput(emaDistress);
  if (activation === null || distress === null) {
    alert("Ingresa EMA válidos entre 0 y 10 para continuar.");
    return false;
  }

  const list = DB.get("emaLogs", []);
  list.push({ tool, phase, activation, distress, at: new Date().toISOString() });
  DB.set("emaLogs", list);
  return true;
}

function startWithEMA(tool, startFn) {
  currentTool = tool;
  pendingStart = startFn;
  openOverlay();
  ovTapArea.style.display = "none";
  ovStepTitle.textContent = "EMA pre";
  ovHint.textContent = "Antes de empezar, indica tus niveles actuales.";
  emaBox.classList.remove("hidden");
  ovNext.style.display = "none";
  ovIllustration.style.display = "none";
}

emaContinue.onclick = () => {
  if (!pendingStart) return;
  if (!saveEMA(currentTool, "pre")) return;
  emaBox.classList.add("hidden");
  ovNext.style.display = "";
  pendingStart();
};

function finishTool(tool, message) {
  const post = prompt("EMA post · Ansiedad/activación (0-10), Malestar (0-10). Escribe formato A,M por ejemplo 3,4");
  if (post) {
    const [a, d] = post.split(",").map((v) => Number(v?.trim()));
    if (!Number.isNaN(a) && !Number.isNaN(d) && a >= 0 && a <= 10 && d >= 0 && d <= 10) {
      const list = DB.get("emaLogs", []);
      list.push({ tool, phase: "post", activation: Math.round(a), distress: Math.round(d), at: new Date().toISOString() });
      DB.set("emaLogs", list);
    }
  }
  ovStepTitle.textContent = "Listo";
  ovHint.textContent = message;
  ovIllustration.style.display = "none";
  ovNext.disabled = true;
  ovProgress.style.width = "100%";
  logToolSession(tool, "complete");
}

function runUniversalStop() {
  stopBreathing(true);
  setCrisisScreen(true);
  ovTitle.textContent = "STOP";
  ovStepTitle.textContent = "Pausa de seguridad";
  ovHint.textContent = "Respira normal, pies al suelo y nombra 3 objetos neutrales. Si no baja en pocos minutos, mantén pantalla de crisis y busca ayuda.";
  ovTapArea.style.display = "none";
  ovIllustration.style.display = "none";
  ovNext.disabled = true;
  ovStop.disabled = true;
  ovProgress.style.width = "100%";
}

/* ===== Session logging without user data ===== */
function logToolSession(tool, event) {
  const sessions = DB.get("toolSessions", []);
  sessions.push({ tool, event, at: new Date().toISOString() });
  DB.set("toolSessions", sessions);
}

/* ===== Stepped care level ===== */
const careLevel = document.getElementById("careLevel");
const careHint = document.getElementById("careHint");
const breathMode = document.getElementById("breathMode");
const stateMenuCard = document.getElementById("stateMenuCard");
const actBtn = document.getElementById("actBtn");
const dbtBtn = document.getElementById("dbtBtn");
const sosBtn = document.getElementById("sosBtn");
const breathToggle = document.getElementById("breathToggle");
const noiseToggle = document.getElementById("noiseToggle");

function applyCareLevel() {
  const level = Number(careLevel.value);
  DB.set("careLevel", level);

  const restricted = level >= 3;
  const crisisOnly = level >= 4;

  Array.from(breathMode.options).forEach((opt) => {
    const isBox = opt.value === "box";
    opt.disabled = restricted && isBox;
  });

  if (restricted && breathMode.value === "box") {
    breathMode.value = "extended";
  }

  actBtn.disabled = crisisOnly;
  dbtBtn.disabled = crisisOnly;
  sosBtn.disabled = crisisOnly;
  breathToggle.disabled = crisisOnly;
  noiseToggle.disabled = crisisOnly;
  stateMenuCard.style.display = crisisOnly ? "none" : "block";

  careHint.textContent = crisisOnly
    ? "Nivel 4: solo crisis/derivación activa."
    : restricted
      ? "Nivel 3: se ocultan retenciones largas y herramientas más complejas."
      : "Nivel 1-2: biblioteca completa de bajo riesgo.";
}

careLevel.onchange = applyCareLevel;

/* ===== SOS 5-4-3-2-1 ===== */
const SOS = [
  ["Mira 5 cosas", 5],
  ["Siente 4 cosas", 4],
  ["Escucha 3 sonidos", 3],
  ["Huele 2 aromas", 2],
  ["Saborea 1 cosa", 1]
];
let sI = 0, sN = 0;

ovTapArea.onclick = () => {
  sN++;
  ovCount.textContent = sN;
  doVibrate(20);
  if (sN >= SOS[sI][1]) {
    ovNext.disabled = false;
  }
};

function startSOS() {
  startWithEMA("sos", () => {
    ovTitle.textContent = "SOS";
    ovStop.disabled = false;
    ovNext.style.display = "";
    sI = 0;
    sN = 0;
    logToolSession("sos", "start");

    ovNext.onclick = () => {
      sI++;
      if (sI >= SOS.length) {
        ovTapArea.style.display = "none";
        finishTool("sos", "Respira normal. Has completado el grounding 5-4-3-2-1.");
        return;
      }
      sN = 0;
      loadSOS();
    };

    loadSOS();
  });
}

function loadSOS() {
  ovIllustration.style.display = "none";
  ovStepTitle.textContent = SOS[sI][0];
  ovHint.textContent = `Toca el centro ${SOS[sI][1]} veces (${sI + 1}/${SOS.length})`;
  ovCount.textContent = "0";
  ovNext.disabled = true;
  ovTapArea.style.display = "";
  ovProgress.style.width = `${(sI / SOS.length) * 100}%`;
}

sosBtn.onclick = startSOS;

/* ===== ACT/DBT guided ===== */
actBtn.onclick = () => {
  const steps = [
    ["Observar", "Identifica lo que sientes (ansiedad, enojo, tensión).", "./assets/act.png"],
    ["Defusión", "Di: 'Estoy teniendo el pensamiento de que...'.", "./assets/act.png"],
    ["Anclar", "Exhala lento 3 veces y nota tus pies en el suelo.", "./assets/act.png"],
    ["Regresar", "Elige un siguiente paso pequeño y seguro.", "./assets/act.png"]
  ];
  runSteps("Tomar Distancia (ACT)", steps, "act");
};

dbtBtn.onclick = () => {
  const steps = [
    ["STOP", "Stop · da un paso atrás · observa · procede con calma.", "./assets/dbt.png"],
    ["Respirar", "Inhala 4s, exhala 6s.", "./assets/dbt.png"],
    ["Re-orientar", "Nombra 3 objetos y 2 sonidos.", "./assets/dbt.png"],
    ["Mínimo", "Haz la tarea más pequeña posible durante 2 minutos.", "./assets/dbt.png"]
  ];
  runSteps("Cambio de Estado (DBT)", steps, "dbt");
};

function runSteps(title, steps, toolName) {
  startWithEMA(toolName, () => {
    let i = 0;
    ovTitle.textContent = title;
    ovStop.disabled = false;
    ovTapArea.style.display = "none";
    logToolSession(toolName, "start");

    if (steps[0][2]) {
      ovIllustration.style.display = "block";
      ovImg.src = steps[0][2];
    }
    ovNext.style.display = "";
    ovStepTitle.textContent = steps[0][0];
    ovHint.textContent = steps[0][1];
    ovNext.disabled = false;
    ovNext.onclick = () => {
      i++;
      ovProgress.style.width = `${(i / steps.length) * 100}%`;
      if (i >= steps.length) {
        finishTool(toolName, "Has completado el ejercicio. Evalúa cómo quedó tu activación.");
        return;
      }
      ovStepTitle.textContent = steps[i][0];
      ovHint.textContent = steps[i][1];
      if (steps[i][2]) {
        ovIllustration.style.display = "block";
        ovImg.src = steps[i][2];
      } else {
        ovIllustration.style.display = "none";
      }
    };
  });
}

/* ===== Respiración ===== */
const breathPhase = document.getElementById("breathPhase");
const breathCircle = document.getElementById("breathCircle");
const breathCircleInner = document.getElementById("breathCircleInner");
let breathing = false;
let phaseTime = null;
let bI = 0;
let breathTimeout = null;

const breathPrograms = {
  extended: {
    name: "Exhalación prolongada",
    phases: [
      { label: "Inhala", seconds: 4, scale: "scale(2.2)", vibrate: 60 },
      { label: "Exhala", seconds: 6, scale: "scale(1)", vibrate: 40 }
    ]
  },
  coherence: {
    name: "Coherencia cardiaca",
    phases: [
      { label: "Inhala", seconds: 5, scale: "scale(2.2)", vibrate: 60 },
      { label: "Exhala", seconds: 5, scale: "scale(1)", vibrate: 40 }
    ]
  },
  anchor3: {
    name: "3 respiraciones de anclaje",
    phases: [
      { label: "Inhala", seconds: 4, scale: "scale(2.2)", vibrate: 50 },
      { label: "Exhala", seconds: 5, scale: "scale(1)", vibrate: 40 }
    ],
    maxCycles: 3
  },
  box: {
    name: "Box breathing",
    phases: [
      { label: "Inhala", seconds: 4, scale: "scale(2.2)", vibrate: 60 },
      { label: "Sostén", seconds: 4, scale: "scale(2.2)", vibrate: [20, 50, 20] },
      { label: "Exhala", seconds: 4, scale: "scale(1)", vibrate: 40 },
      { label: "Sostén", seconds: 4, scale: "scale(1)", vibrate: [20, 50, 20] }
    ]
  }
};

function doVibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function stopBreathing(silent = false) {
  clearInterval(phaseTime);
  clearTimeout(breathTimeout);
  breathing = false;
  breathPhase.textContent = "Listo";
  breathTimer.textContent = "0s";
  [breathCircle, breathCircleInner].forEach((el) => el.style.transform = "scale(1)");
  breathToggle.textContent = "Iniciar";
  if (!silent) {
    logToolSession("breath", "stop");
  }
}

function runBreathProgram() {
  const mode = breathPrograms[breathMode.value];
  const phase = mode.phases[bI % mode.phases.length];
  breathPhase.textContent = phase.label;
  let timeLeft = phase.seconds;
  breathTimer.textContent = `${timeLeft}s`;

  [breathCircle, breathCircleInner].forEach((el) => el.style.transform = phase.scale);
  doVibrate(phase.vibrate);

  clearInterval(phaseTime);
  phaseTime = setInterval(() => {
    timeLeft--;
    if (timeLeft < 0 || !breathing) {
      clearInterval(phaseTime);
      return;
    }
    breathTimer.textContent = `${timeLeft}s`;
  }, 1000);

  bI++;

  const cycles = Math.floor(bI / mode.phases.length);
  if (mode.maxCycles && cycles >= mode.maxCycles) {
    stopBreathing();
    return;
  }

  clearTimeout(breathTimeout);
  breathTimeout = setTimeout(() => {
    if (breathing) runBreathProgram();
  }, phase.seconds * 1000);
}

breathToggle.onclick = () => {
  if (Number(careLevel.value) >= 4) {
    setCrisisScreen(true);
    return;
  }

  if (breathing) {
    stopBreathing();
    return;
  }

  if (Number(careLevel.value) >= 3 && breathMode.value === "box") {
    alert("Nivel 3: usa exhalación prolongada o coherencia cardiaca (sin retenciones).");
    breathMode.value = "extended";
  }

  startWithEMA("breath", () => {
    breathing = true;
    bI = 0;
    breathToggle.textContent = "Detener";
    logToolSession("breath", "start");

    runBreathProgram();
  });
};

/* ===== Brown noise ===== */
const noiseVol = document.getElementById("noiseVol");
let ctx, node, gain, noiseOn = false;

function brown(audioCtx) {
  const bufferSize = 4096;
  const noiseNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
  let lastOut = 0;
  noiseNode.onaudioprocess = (event) => {
    const output = event.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      output[i] = lastOut * 3.5;
    }
  };
  return noiseNode;
}

noiseToggle.onclick = async () => {
  if (!noiseOn) {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gain = ctx.createGain();
      node = brown(ctx);
      node.connect(gain);
      gain.connect(ctx.destination);
    }
    const target = (noiseVol.value / 100) * 0.4;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.2);
    await ctx.resume();
    noiseOn = true;
    noiseToggle.textContent = "Apagar";
  } else {
    if (gain) {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
      setTimeout(() => {
        if (!noiseOn) ctx.suspend();
      }, 800);
    }
    noiseOn = false;
    noiseToggle.textContent = "Encender";
  }
};

noiseVol.oninput = () => {
  if (gain && noiseOn) {
    gain.gain.setTargetAtTime((noiseVol.value / 100) * 0.4, ctx.currentTime, 0.1);
  }
};

/* ===== Estado menu ===== */
const stateSelect = document.getElementById("stateSelect");
const stateTools = document.getElementById("stateTools");

const quickMenu = {
  ansiedad: [
    "Respiración: exhalación prolongada 4-6 por 90s.",
    "Grounding: orienting reflex (nombra 5 objetos).",
    "DBT: STOP + acción mínima de 2 min."
  ],
  rumiacion: [
    "Respiración: coherencia cardiaca 5-5 por 3 min.",
    "Grounding: objeto ancla (describe textura 60s).",
    "ACT: 'Estoy teniendo el pensamiento de…'."
  ],
  tristeza: [
    "Respiración: 3 respiraciones de anclaje.",
    "Grounding: pies al suelo (empuja 10s/suelta 10s x3).",
    "TCC conductual: activación de 2 minutos."
  ],
  irritabilidad: [
    "Respiración: exhala 6–8s durante 2 min.",
    "Grounding: sonido focal (describe 1 sonido estable).",
    "DBT: Pros/Cons antes de reaccionar."
  ],
  insomnio: [
    "Respiración: coherencia cardiaca 5-5 en cama.",
    "Grounding: body scan breve sin forzar.",
    "Sueño: si >20 min despierto, estímulo control suave."
  ]
};

function renderStateMenu() {
  const selected = quickMenu[stateSelect.value] || [];
  stateTools.innerHTML = "";
  selected.forEach((txt, index) => {
    const button = document.createElement("button");
    button.className = "btn";
    button.innerHTML = `<span class='btn-title'>${index + 1}. ${txt.split(":")[0]}</span><span class='btn-sub'>${txt}</span>`;
    button.onclick = () => alert(txt);
    stateTools.appendChild(button);
  });
}

stateSelect.onchange = renderStateMenu;

/* ===== Module integrity check ===== */
function verifyModules() {
  const moduleStatus = document.getElementById("moduleStatus");
  const requiredIds = [
    "sosBtn",
    "breathToggle",
    "noiseToggle",
    "actBtn",
    "dbtBtn",
    "crisisBtn",
    "overlay",
    "careLevel",
    "stateSelect"
  ];

  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    moduleStatus.textContent = `Faltan módulos: ${missing.join(", ")}`;
    moduleStatus.classList.add("danger");
  } else {
    moduleStatus.textContent = "Módulos verificados: SOS, respiración, ruido, ACT, DBT, menú por estado y crisis.";
  }
}

/* ===== Init ===== */
initGate();
maybeShowReminder();
careLevel.value = String(DB.get("careLevel", 1));
applyCareLevel();
renderStateMenu();
verifyModules();
