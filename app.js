/* ===== PWA ===== */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js");
}

/* ===== Network badge ===== */
const netBadge = document.getElementById("netBadge");
const updateNet = () =>
  netBadge.textContent = navigator.onLine ? "online" : "offline-ready";
window.addEventListener("online", updateNet);
window.addEventListener("offline", updateNet);
updateNet();

/* ===== Theme toggle ===== */
const themeToggle = document.getElementById("themeToggle");
const body = document.body;
const getTheme = () => localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const setTheme = (t) => {
  body.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
  themeToggle.textContent = t === "dark" ? "☀️" : "🌙";
};
setTheme(getTheme());
themeToggle.onclick = () => setTheme(body.getAttribute("data-theme") === "dark" ? "light" : "dark");

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
  // Quitar el foco de cualquier botón dentro al cerrar
  if (document.activeElement) document.activeElement.blur();
}
ovClose.onclick = closeOverlay;

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
  sI = 0; sN = 0;

  // Asignar el click de next específicamente para SOS
  ovNext.onclick = () => {
    sI++;
    if (sI >= SOS.length) {
      ovStepTitle.textContent = "Listo";
      ovHint.textContent = "Respira y vuelve con calma. Has completado el grounding.";
      ovTapArea.style.display = "none";
      ovNext.disabled = true;
      ovProgress.style.width = "100%";
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
document.getElementById("actBtn").onclick = () => {
  const steps = [
    ["Observar", "Identifica lo que sientes (ansiedad, enojo, tensión). Ponerle nombre reduce su poder sobre ti.", "./assets/act.png"],
    ["Etiquetar", "Dite: 'Estoy teniendo el pensamiento de que...'. Esto crea distancia entre tú y el pensamiento.", "./assets/act.png"],
    ["Anclar", "Exhala lento 3 veces y siente el peso de tus pies. El cuerpo es tu ancla al presente.", "./assets/act.png"],
    ["Regresar", "El pensamiento sigue ahí como una nube, pero tú eliges tu siguiente paso pequeño.", "./assets/act.png"]
  ];
  runSteps("Tomar Distancia (ACT)", steps);
};

/* ===== DBT 90s ===== */
document.getElementById("dbtBtn").onclick = () => {
  const steps = [
    ["Respirar", "Inhala 4s, exhala 6s. Al exhalar más largo, le dices a tu cerebro que estás a salvo.", "./assets/dbt.png"],
    ["Frío", "Si puedes, toca algo frío o lávate la cara. El cambio de temperatura bloquea la respuesta de estrés.", "./assets/dbt.png"],
    ["Re-orientar", "Mira 3 objetos y escucha 2 sonidos. Esto saca tu atención del caos interno al mundo externo.", "./assets/dbt.png"],
    ["Mínimo", "Vuelve con la tarea más pequeña posible. No intentes resolver todo ahora.", "./assets/dbt.png"]
  ];
  runSteps("Cambio de Estado (DBT)", steps);
};

function runSteps(title, steps) {
  let i = 0;
  ovTitle.textContent = title;
  ovTapArea.style.display = "none";
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
    clearInterval(bt); breathing = false;
    breathPhase.textContent = "Listo";
    [breathCircle, breathCircleInner].forEach(el => el.style.transform = "scale(1)");
    breathToggle.textContent = "Iniciar";
  } else {
    breathing = true; bI = 0;
    breathToggle.textContent = "Detener";
    const run = () => {
      const phase = bI % 4;
      breathPhase.textContent = phases[phase];

      // Timer 4s
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

      // Lógica de expansión
      // 0: Inhala (crece), 1: Sostén (se queda grande), 2: Exhala (encoge), 3: Sostén (se queda pequeño)
      const scale = (phase === 0 || phase === 1) ? "scale(2.2)" : "scale(1)";
      [breathCircle, breathCircleInner].forEach(el => el.style.transform = scale);

      // Háptica diferenciada
      if (phase === 0) doVibrate(60); // Pulso suave al empezar
      if (phase === 1) doVibrate([30, 50, 30]); // Doble pulso corto al sostener arriba
      if (phase === 2) doVibrate(40); // Pulso muy suave al soltar

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

function brown(ctx) {
  const bufferSize = 4096;
  const n = ctx.createScriptProcessor(bufferSize, 1, 1);
  let lastOut = 0.0;
  n.onaudioprocess = e => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      output[i] = lastOut * 3.5; // Ajuste compensación volumen
    }
  };
  return n;
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
    gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.2); // Fade in suave
    await ctx.resume();
    noiseOn = true;
    noiseToggle.textContent = "Apagar";
  } else {
    if (gain) {
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8); // Fade out suave
      setTimeout(() => { if (!noiseOn) ctx.suspend(); }, 800);
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
