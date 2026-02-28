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

function openOverlay() {
  overlay.classList.add("show");
  overlay.removeAttribute("aria-hidden");
  ovProgress.style.width = "0%";
  ovIllustration.style.display = "none";
}
function closeOverlay() {
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  if (document.activeElement) document.activeElement.blur();
}
ovClose.onclick = closeOverlay;

/* ===== Session logging without user data ===== */
function logToolSession(tool, event) {
  const sessions = DB.get("toolSessions", []);
  sessions.push({ tool, event, at: new Date().toISOString() });
  DB.set("toolSessions", sessions);
}

/* ===== SOS 5-4-3-2-1 ===== */
const sosBtn = document.getElementById("sosBtn");
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
  ovTitle.textContent = "SOS";
  ovNext.style.display = "";
  sI = 0;
  sN = 0;
  logToolSession("sos", "start");

  ovNext.onclick = () => {
    sI++;
    if (sI >= SOS.length) {
      ovStepTitle.textContent = "Listo";
      ovHint.textContent = "Respira y vuelve con calma. Has completado el grounding.";
      ovTapArea.style.display = "none";
      ovNext.disabled = true;
      ovProgress.style.width = "100%";
      logToolSession("sos", "complete");
      return;
    }
    sN = 0;
    loadSOS();
  };

  loadSOS();
  openOverlay();
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

/* ===== ACT 60s ===== */
const actBtn = document.getElementById("actBtn");
actBtn.onclick = () => {
  const steps = [
    ["Observar", "Identifica lo que sientes (ansiedad, enojo, tensión). Ponerle nombre reduce su poder sobre ti.", "./assets/act.png"],
    ["Etiquetar", "Dite: 'Estoy teniendo el pensamiento de que...'. Esto crea distancia entre tú y el pensamiento.", "./assets/act.png"],
    ["Anclar", "Exhala lento 3 veces y siente el peso de tus pies. El cuerpo es tu ancla al presente.", "./assets/act.png"],
    ["Regresar", "El pensamiento sigue ahí como una nube, pero tú eliges tu siguiente paso pequeño.", "./assets/act.png"]
  ];
  runSteps("Tomar Distancia (ACT)", steps, "act");
};

/* ===== DBT 90s ===== */
const dbtBtn = document.getElementById("dbtBtn");
dbtBtn.onclick = () => {
  const steps = [
    ["Respirar", "Inhala 4s, exhala 6s. Al exhalar más largo, le dices a tu cerebro que estás a salvo.", "./assets/dbt.png"],
    ["Temperatura suave", "Agua fría en cara/manos por 15s (incómodo, no doloroso). Sin hielo.", "./assets/dbt.png"],
    ["Re-orientar", "Mira 3 objetos y escucha 2 sonidos. Esto saca tu atención del caos interno al mundo externo.", "./assets/dbt.png"],
    ["Mínimo", "Vuelve con la tarea más pequeña posible. No intentes resolver todo ahora.", "./assets/dbt.png"]
  ];
  runSteps("Cambio de Estado (DBT)", steps, "dbt");
};

function runSteps(title, steps, toolName) {
  let i = 0;
  ovTitle.textContent = title;
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
      ovStepTitle.textContent = "Listo";
      ovHint.textContent = "Has completado el ejercicio. Tu sistema nervioso está más regulado.";
      ovIllustration.style.display = "none";
      ovNext.disabled = true;
      ovProgress.style.width = "100%";
      logToolSession(toolName, "complete");
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
  openOverlay();
}

/* ===== Respiración ===== */
const breathToggle = document.getElementById("breathToggle");
const breathPhase = document.getElementById("breathPhase");
const breathCircle = document.getElementById("breathCircle");
const breathCircleInner = document.getElementById("breathCircleInner");
let breathing = false, bt = null, bI = 0;
const phases = ["Inhala", "Sostén", "Exhala", "Sostén"];

function doVibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

breathToggle.onclick = () => {
  if (breathing) {
    clearInterval(bt);
    breathing = false;
    breathPhase.textContent = "Listo";
    [breathCircle, breathCircleInner].forEach((el) => el.style.transform = "scale(1)");
    breathToggle.textContent = "Iniciar";
    logToolSession("breath", "stop");
  } else {
    breathing = true;
    bI = 0;
    breathToggle.textContent = "Detener";
    logToolSession("breath", "start");

    const run = () => {
      const phase = bI % 4;
      breathPhase.textContent = phases[phase];
      let timeLeft = 4;
      breathTimer.textContent = `${timeLeft}s`;
      const timerInt = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0 || !breathing) {
          clearInterval(timerInt);
          return;
        }
        breathTimer.textContent = `${timeLeft}s`;
      }, 1000);

      const scale = (phase === 0 || phase === 1) ? "scale(2.2)" : "scale(1)";
      [breathCircle, breathCircleInner].forEach((el) => el.style.transform = scale);

      if (phase === 0) doVibrate(60);
      if (phase === 1) doVibrate([30, 50, 30]);
      if (phase === 2) doVibrate(40);

      bI++;
    };
    run();
    bt = setInterval(run, 4000);
  }
};

/* ===== Brown noise ===== */
const noiseToggle = document.getElementById("noiseToggle");
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
    "overlay"
  ];

  const missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    moduleStatus.textContent = `Faltan módulos: ${missing.join(", ")}`;
    moduleStatus.classList.add("danger");
  } else {
    moduleStatus.textContent = "Módulos verificados: SOS, respiración, ruido, ACT, DBT y crisis.";
  }
}

/* ===== Init ===== */
initGate();
maybeShowReminder();
verifyModules();
