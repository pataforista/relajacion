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

/* ===== Global feedback ===== */
const appFeedback = document.getElementById("appFeedback");
let feedbackTimeout = null;

let visualFeedbackEnabled = DB.get("visualFeedbackEnabled", true);

function announceFeedback(message, vibratePattern = null, critical = false) {
  if (!visualFeedbackEnabled && !critical) {
    return;
  }
  appFeedback.textContent = message;
  appFeedback.classList.add("show");
  clearTimeout(feedbackTimeout);
  feedbackTimeout = setTimeout(() => appFeedback.classList.remove("show"), 2200);
  if (vibratePattern) doVibrate(vibratePattern);
}

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
  const q2 = document.querySelector("input[name='q2']:checked")?.value;
  if (q2 !== "yes") {
    alert("Por favor confirma que comprendes el límite para finalizar.");
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
    if (onboarding.step === 1) {
      const q1 = document.querySelector("input[name='q1']:checked")?.value;
      if (q1 !== "no") {
        alert("Por favor selecciona la respuesta correcta para continuar.");
        return;
      }
    }
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

document.getElementById("closeReminder").onclick = () => {
  document.getElementById("reminderCard").style.display = "none";
};

/* ===== Crisis mode ===== */
const crisisBtn = document.getElementById("crisisBtn");
const crisisScreen = document.getElementById("crisisScreen");
const closeCrisis = document.getElementById("closeCrisis");

function setCrisisScreen(show) {
  crisisScreen.classList.toggle("show", show);
  body.classList.toggle("crisis-active", show);
  if (show) {
    announceFeedback("Modo crisis activado. Prioriza contacto humano inmediato.", [80, 60, 80], true);
    DB.set("crisisEvents", [...DB.get("crisisEvents", []), { at: new Date().toISOString(), source: "manual" }]);
  } else {
    announceFeedback("Pantalla de crisis cerrada.");
  }
}

crisisBtn.onclick = () => setCrisisScreen(true);
closeCrisis.onclick = () => setCrisisScreen(false);

/* ===== Overlay base ===== */
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

function openOverlay() {
  overlay.classList.add("show");
  overlay.removeAttribute("aria-hidden");
  ovProgress.style.width = "0%";
  ovIllustration.style.display = "none";
}

function closeOverlay() {
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  ovNext.disabled = false;
  ovStop.disabled = false;
  if (document.activeElement) document.activeElement.blur();
}
ovClose.onclick = closeOverlay;
ovStop.onclick = () => runUniversalStop();

function startTool(tool, startFn) {
  openOverlay();
  ovTitle.textContent = tool;
  ovStepTitle.textContent = "Preparando";
  ovHint.textContent = "Comenzando ejercicio breve...";
  ovTapArea.style.display = "none";
  ovNext.style.display = "";
  ovIllustration.style.display = "none";
  startFn();
}

function finishTool(tool, message) {
  ovStepTitle.textContent = "Listo";
  ovHint.textContent = message;
  ovIllustration.style.display = "none";
  ovNext.disabled = true;
  ovProgress.style.width = "100%";
  logToolSession(tool, "complete");
  announceFeedback("Ejercicio completado. Registra cómo te sientes ahora.", 35);
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
const quickCalmBtn = document.getElementById("quickCalmBtn");
const quickFocusBtn = document.getElementById("quickFocusBtn");
const quickSleepBtn = document.getElementById("quickSleepBtn");
const hapticToggle = document.getElementById("hapticToggle");
const voiceToggle = document.getElementById("voiceToggle");
const wakeLockBtn = document.getElementById("wakeLockBtn");
const mobilePulseBtn = document.getElementById("mobilePulseBtn");
const mobileSupportHint = document.getElementById("mobileSupportHint");
const feedbackToggle = document.getElementById("feedbackToggle");
const comfortModeToggle = document.getElementById("comfortModeToggle");
const resetComfortBtn = document.getElementById("resetComfortBtn");

let hapticEnabled = DB.get("hapticEnabled", true);
let voiceEnabled = DB.get("voiceEnabled", false);
let comfortModeEnabled = DB.get("comfortModeEnabled", false);
let wakeLock = null;
let wakeLockRequested = false;

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

quickCalmBtn.onclick = () => {
  startSOS();
};

quickFocusBtn.onclick = () => {
  actBtn.click();
};

quickSleepBtn.onclick = async () => {
  breathMode.value = "coherence";
  if (!breathing) {
    breathToggle.click();
  }
  if (!noiseOn) {
    await noiseToggle.onclick();
  }
};

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
  startTool("SOS", () => {
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
  startTool(title, () => {
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
  if (!hapticEnabled) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function speak(text) {
  if (!voiceEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) {
    mobileSupportHint.textContent = "Tu dispositivo no soporta bloqueo de pantalla activa (Wake Lock).";
    return false;
  }

  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLockRequested = true;
    wakeLockBtn.textContent = "Mantener pantalla encendida: ON";
    announceFeedback("Pantalla activa para acompañar la práctica.");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
      wakeLockBtn.textContent = "Mantener pantalla encendida: OFF";
    });
    return true;
  } catch {
    mobileSupportHint.textContent = "No se pudo activar pantalla encendida. Revisa batería/permisos.";
    return false;
  }
}

async function releaseWakeLock() {
  wakeLockRequested = false;
  if (!wakeLock) {
    wakeLockBtn.textContent = "Mantener pantalla encendida: OFF";
    return;
  }

  await wakeLock.release();
  wakeLock = null;
  wakeLockBtn.textContent = "Mantener pantalla encendida: OFF";
}

function stopBreathing(silent = false) {
  clearInterval(phaseTime);
  clearTimeout(breathTimeout);
  breathing = false;
  breathPhase.textContent = "Listo";
  breathTimer.textContent = "0s";
  [breathCircle, breathCircleInner].forEach((el) => el.style.transform = "scale(1)");
  breathToggle.textContent = "Iniciar";
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (!silent) {
    logToolSession("breath", "stop");
    announceFeedback("Respiración detenida.");
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
  speak(phase.label);

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

  startTool("Respiración", () => {
    breathing = true;
    bI = 0;
    breathToggle.textContent = "Detener";
    logToolSession("breath", "start");
    announceFeedback(`Inicia ${breathPrograms[breathMode.value].name}. Sigue el ritmo.`, 30);

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
    announceFeedback("Ruido marrón activado.");
  } else {
    if (gain) {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
      setTimeout(() => {
        if (!noiseOn) ctx.suspend();
      }, 800);
    }
    noiseOn = false;
    noiseToggle.textContent = "Encender";
    announceFeedback("Ruido marrón apagado.");
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

/* ===== Check-in / Check-out tracking ===== */
const checkPopupBtn = document.getElementById("checkPopupBtn");
const checkModal = document.getElementById("checkModal");
const checkModalClose = document.getElementById("checkModalClose");
const openCheckinTab = document.getElementById("openCheckinTab");
const openCheckoutTab = document.getElementById("openCheckoutTab");
const checkinBlock = document.getElementById("checkinBlock");
const checkoutBlock = document.getElementById("checkoutBlock");
const checkFeedback = document.getElementById("checkFeedback");
const checkSummary = document.getElementById("checkSummary");
const saveCheckinBtn = document.getElementById("saveCheckinBtn");
const saveCheckoutBtn = document.getElementById("saveCheckoutBtn");

const metricConfig = {
  checkinAnxiety: "checkinAnxietyValue",
  checkinDistress: "checkinDistressValue",
  checkinSadness: "checkinSadnessValue",
  checkoutAnxiety: "checkoutAnxietyValue",
  checkoutDistress: "checkoutDistressValue",
  checkoutSadness: "checkoutSadnessValue",
  checkoutUsefulness: "checkoutUsefulnessValue"
};


function openCheckModal(defaultTab = "checkin") {
  checkModal.classList.add("show");
  checkModal.setAttribute("aria-hidden", "false");
  setCheckTab(defaultTab);
}

function closeCheckModal() {
  checkModal.classList.remove("show");
  checkModal.setAttribute("aria-hidden", "true");
}

function setCheckTab(tab) {
  const showCheckin = tab === "checkin";
  checkinBlock.classList.toggle("hidden", !showCheckin);
  checkoutBlock.classList.toggle("hidden", showCheckin);
  openCheckinTab.classList.toggle("active", showCheckin);
  openCheckoutTab.classList.toggle("active", !showCheckin);
}

checkPopupBtn.onclick = () => openCheckModal("checkin");
checkModalClose.onclick = closeCheckModal;
openCheckinTab.onclick = () => setCheckTab("checkin");
openCheckoutTab.onclick = () => setCheckTab("checkout");
checkModal.onclick = (event) => {
  if (event.target === checkModal) closeCheckModal();
};
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && checkModal.classList.contains("show")) {
    closeCheckModal();
  }
});

Object.entries(metricConfig).forEach(([inputId, valueId]) => {
  const input = document.getElementById(inputId);
  const output = document.getElementById(valueId);
  const syncValue = () => {
    output.textContent = input.value;
  };
  input.addEventListener("input", syncValue);
  syncValue();
});

function getCheckValues(prefix) {
  return {
    anxiety: Number(document.getElementById(`${prefix}Anxiety`).value),
    distress: Number(document.getElementById(`${prefix}Distress`).value),
    sadness: Number(document.getElementById(`${prefix}Sadness`).value)
  };
}

function maxEmotionalValue(values) {
  return Math.max(values.anxiety, values.distress, values.sadness);
}

function showCheckSummary() {
  const checkins = DB.get("checkins", []);
  const checkouts = DB.get("checkouts", []);

  if (!checkins.length || !checkouts.length) {
    checkSummary.textContent = "Aún no hay suficientes registros para mostrar evolución.";
    return;
  }

  const avg = (arr, key) => arr.reduce((acc, item) => acc + item[key], 0) / arr.length;
  const summaryText = `Promedio check-in → ansiedad ${avg(checkins, "anxiety").toFixed(1)}, malestar ${avg(checkins, "distress").toFixed(1)}, tristeza ${avg(checkins, "sadness").toFixed(1)} · Promedio check-out → ansiedad ${avg(checkouts, "anxiety").toFixed(1)}, malestar ${avg(checkouts, "distress").toFixed(1)}, tristeza ${avg(checkouts, "sadness").toFixed(1)}, utilidad ${avg(checkouts, "usefulness").toFixed(1)}.`;
  checkSummary.textContent = summaryText;
}

function suggestProfessionalContact(type) {
  if (type === "checkout") {
    alert("Tus valores en el check-out son altos (9-10). Te recomendamos con insistencia contactar a una/un profesional de salud mental hoy. Puedes seguir usando la app como apoyo, pero busca acompañamiento humano.");
    alert("Importante: si esto se mantiene o empeora, prioriza hablar con un profesional o servicio de urgencias de tu zona.");
    return;
  }

  alert("Tus valores en el check-in son altos (9-10). Te sugerimos contactar a una/un profesional de salud mental. Puedes continuar usando la app como apoyo.");
}

saveCheckinBtn.onclick = () => {
  const values = getCheckValues("checkin");
  const logs = DB.get("checkins", []);
  logs.push({ ...values, at: new Date().toISOString() });
  DB.set("checkins", logs);

  if (maxEmotionalValue(values) > 8) {
    suggestProfessionalContact("checkin");
  }

  checkFeedback.textContent = "Check-in guardado. Ahora puedes usar una herramienta breve y luego hacer check-out.";
  announceFeedback("Check-in guardado correctamente.", 20);
  showCheckSummary();
  setCheckTab("checkout");
};

saveCheckoutBtn.onclick = () => {
  const values = getCheckValues("checkout");
  const usefulness = Number(document.getElementById("checkoutUsefulness").value);
  const logs = DB.get("checkouts", []);
  logs.push({ ...values, usefulness, at: new Date().toISOString() });
  DB.set("checkouts", logs);

  if (maxEmotionalValue(values) > 8) {
    suggestProfessionalContact("checkout");
  }

  checkFeedback.textContent = "Check-out guardado. Gracias: esto permite ver si la app te está sirviendo en el tiempo.";
  announceFeedback("Check-out guardado. Buen trabajo cerrando el ciclo.", 20);
  showCheckSummary();
};

/* ===== Mobile support ===== */
hapticToggle.checked = hapticEnabled;
voiceToggle.checked = voiceEnabled;
feedbackToggle.checked = visualFeedbackEnabled;
comfortModeToggle.checked = comfortModeEnabled;

function syncComfortControls() {
  hapticToggle.checked = hapticEnabled;
  voiceToggle.checked = voiceEnabled;
  feedbackToggle.checked = visualFeedbackEnabled;
  comfortModeToggle.checked = comfortModeEnabled;

  const disableAdvanced = comfortModeEnabled;
  voiceToggle.disabled = disableAdvanced;
  hapticToggle.disabled = disableAdvanced;
  mobilePulseBtn.disabled = disableAdvanced;

  if (disableAdvanced && wakeLockRequested) {
    void releaseWakeLock();
  }
}

function applyComfortMode(enabled, notify = true) {
  comfortModeEnabled = enabled;
  DB.set("comfortModeEnabled", enabled);

  if (enabled) {
    visualFeedbackEnabled = false;
    hapticEnabled = false;
    voiceEnabled = false;
    DB.set("visualFeedbackEnabled", false);
    DB.set("hapticEnabled", false);
    DB.set("voiceEnabled", false);
    if (notify) {
      announceFeedback("Modo comodidad alta activado: estímulos reducidos.", null, true);
    }
  }

  syncComfortControls();
}

hapticToggle.onchange = () => {
  hapticEnabled = hapticToggle.checked;
  DB.set("hapticEnabled", hapticEnabled);
  announceFeedback(hapticEnabled ? "Vibración guiada activada." : "Vibración guiada desactivada.");
};

voiceToggle.onchange = () => {
  voiceEnabled = voiceToggle.checked;
  DB.set("voiceEnabled", voiceEnabled);
  announceFeedback(voiceEnabled ? "Guía por voz activada." : "Guía por voz desactivada.");
};

feedbackToggle.onchange = () => {
  visualFeedbackEnabled = feedbackToggle.checked;
  DB.set("visualFeedbackEnabled", visualFeedbackEnabled);
  announceFeedback(visualFeedbackEnabled ? "Mensajes visuales activados." : "Mensajes visuales desactivados.", null, true);
};

comfortModeToggle.onchange = () => {
  applyComfortMode(comfortModeToggle.checked);
  if (!comfortModeToggle.checked) {
    announceFeedback("Modo comodidad alta desactivado. Personaliza según preferencia.", null, true);
  }
};

resetComfortBtn.onclick = () => {
  comfortModeEnabled = false;
  visualFeedbackEnabled = true;
  hapticEnabled = true;
  voiceEnabled = false;
  DB.set("comfortModeEnabled", comfortModeEnabled);
  DB.set("visualFeedbackEnabled", visualFeedbackEnabled);
  DB.set("hapticEnabled", hapticEnabled);
  DB.set("voiceEnabled", voiceEnabled);
  syncComfortControls();
  announceFeedback("Configuración recomendada restaurada.", 20, true);
};

wakeLockBtn.onclick = async () => {
  if (wakeLockRequested) {
    await releaseWakeLock();
    announceFeedback("Pantalla encendida continua desactivada.");
    return;
  }

  await requestWakeLock();
};

mobilePulseBtn.onclick = () => {
  if (comfortModeEnabled) {
    announceFeedback("Modo comodidad alta activo: pausa háptica deshabilitada.", null, true);
    return;
  }
  if (!navigator.vibrate) {
    announceFeedback("Tu dispositivo no soporta vibración.");
    return;
  }
  doVibrate([120, 140, 120, 260, 120, 140, 120]);
  announceFeedback("Pausa háptica iniciada: acompasa respiración con el pulso.");
};

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (wakeLockRequested) requestWakeLock();
});

if (comfortModeEnabled) {
  applyComfortMode(true, false);
}
syncComfortControls();

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
    "stateSelect",
    "checkPopupBtn",
    "checkModal",
    "appFeedback",
    "feedbackToggle",
    "comfortModeToggle",
    "hapticToggle",
    "voiceToggle",
    "wakeLockBtn",
    "mobilePulseBtn",
    "resetComfortBtn"
  ];

  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    moduleStatus.textContent = `Faltan módulos: ${missing.join(", ")}`;
    moduleStatus.classList.add("danger");
  } else {
    moduleStatus.textContent = "Lista rápida lista: SOS, respiración, ruido, ACT/DBT y crisis disponibles.";
  }
}

/* ===== Init ===== */
initGate();
maybeShowReminder();
careLevel.value = String(DB.get("careLevel", 1));
applyCareLevel();
renderStateMenu();
showCheckSummary();
verifyModules();
