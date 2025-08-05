const currentModel = "vosk-model-en";
let lyrics = [], currentLine = 0, timer = null, interval = 3000;
let audioContext, analyser, microphone, dataArray, recognizer = null, model = null;
let sensitivityThreshold = 5;
let html5QrCode;
let modelReady = false;

const requiredFiles = [
  "conf/mfcc.conf",
  "am/final.mdl"
];

const graphFiles = [
  "graph/HCLG.fst",
  "graph/HCLr.fst",
  "graph/Gr.fst"
];

const lyricsEl = document.getElementById("lyrics");
const volumeMeter = document.getElementById("volumeMeter");
const micStatus = document.getElementById("micStatus");
const logStatus = document.getElementById("logStatus");
const beatCircle = document.getElementById("beatCircle");
const testRecBtn = document.getElementById("testRecBtn");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

function logMessage(msg) {
  logStatus.textContent += "\n" + msg;
  logStatus.scrollTop = logStatus.scrollHeight;
}

async function enableMic() {
  try {
    logMessage("🎤 Solicitando permissão para microfone...");
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    await audioContext.resume();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    micStatus.textContent = "🎤 Microfone ativo - verificando modelo...";
    logMessage("📂 Verificando modelo...");
    validateModel();
    processMic();
  } catch (e) {
    micStatus.textContent = "❌ Erro ao acessar microfone";
    logMessage("Erro: " + e.message);
  }
}

function showProgress(percent, text) {
  progressContainer.style.display = "block";
  progressBar.style.width = percent + "%";
  progressText.textContent = text + " " + percent + "%";
}

async function validateModel() {
  let allFound = true;
  // Verificação de arquivos obrigatórios
  for (const file of requiredFiles) {
    const res = await fetch(`./${currentModel}/${file}`);
    if (!res.ok) {
      logMessage(`⚠️ ${file} Faltando`);
      allFound = false;
    } else {
      logMessage(`✅ ${file} OK`);
    }
  }
  // Verificação de arquivos de grafo (aceita qualquer um)
  let graphFound = false;
  for (const gfile of graphFiles) {
    const gres = await fetch(`./${currentModel}/${gfile}`);
    if (gres.ok) {
      logMessage(`✅ ${gfile} OK`);
      graphFound = true;
    }
  }
  if (!graphFound) {
    logMessage("⚠️ Nenhum grafo válido encontrado (HCLG/HCLr/Gr)");
    allFound = false;
  }

  if (!allFound) {
    micStatus.textContent = "❌ Modelo incompleto";
    logMessage("❌ Modelo incompleto - verifique arquivos");
    return;
  }
  logMessage("📦 Modelo completo. Carregando...");
  showProgress(0, "Carregando modelo");
  loadModel();
}

async function loadModel() {
  try {
    for (let p = 0; p <= 100; p += 10) {
      showProgress(p, "Carregando modelo");
      await new Promise(r => setTimeout(r, 150));
    }
    model = await Vosk.createModel(`./${currentModel}/`);
    recognizer = new model.Recognizer();
    modelReady = true;
    testRecBtn.disabled = false;
    micStatus.textContent = "✅ Modelo carregado!";
    logMessage("✅ Modelo carregado com sucesso!");
    progressContainer.style.display = "none";
  } catch (err) {
    micStatus.textContent = "❌ Erro ao carregar modelo";
    logMessage("Erro ao carregar modelo: " + err.message);
  }
}

function processMic() {
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) sum += Math.abs(dataArray[i] - 128);
  let volume = sum / dataArray.length;
  volumeMeter.style.width = Math.min(100, volume * 5) + "%";
  if (volume > 5) {
    micStatus.textContent = modelReady ? "🎤 Captando áudio..." : "⏳ Aguardando modelo...";
    beatCircle.classList.add("active");
    setTimeout(() => beatCircle.classList.remove("active"), 100);
  } else {
    micStatus.textContent = modelReady ? "⏳ Aguardando som..." : "⏳ Aguardando modelo...";
  }
  requestAnimationFrame(processMic);
}

function manualTestRecognition() {
  if (!modelReady || !recognizer) {
    logMessage("⚠️ Modelo não carregado - teste indisponível.");
    return;
  }
  try {
    const textResult = recognizer.result().text;
    logMessage("📝 Teste Manual: " + (textResult || "[Nenhum texto reconhecido]"));
  } catch (err) {
    logMessage("Erro no teste manual: " + err.message);
  }
}

function startQRScanner() {
  if (html5QrCode) html5QrCode.stop();
  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 200 },
    async (decodedText) => { html5QrCode.stop(); await loadLyrics(decodedText); },
    (err) => console.warn(`QR Scan error: ${err}`)
  );
}

async function loadLyrics(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erro ao carregar");
    const text = await res.text();
    lyrics = text.split("\n").filter(line => line.trim() !== "");
    currentLine = 0;
    document.getElementById("restartBtn").style.display = "none";
    renderLyrics();
  } catch {
    lyricsEl.textContent = "❌ Não foi possível carregar a letra.";
  }
}

function renderLyrics() {
  lyricsEl.innerHTML = "";
  lyrics.forEach((line, i) => {
    const div = document.createElement("div");
    div.textContent = line;
    div.className = "line" + (i === currentLine ? " current" : "");
    div.onclick = () => { currentLine = i; renderLyrics(); };
    lyricsEl.appendChild(div);
  });
}

function nextLine() {
  if (currentLine < lyrics.length - 1) {
    currentLine++;
    renderLyrics();
  } else {
    clearInterval(timer);
    document.getElementById("restartBtn").style.display = "inline-block";
  }
}

document.getElementById("micBtn").onclick = enableMic;
document.getElementById("startQRBtn").onclick = startQRScanner;
testRecBtn.onclick = manualTestRecognition;
document.getElementById("playPauseBtn").onclick = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    playPauseBtn.textContent = "▶️";
  } else {
    timer = setInterval(nextLine, interval);
    playPauseBtn.textContent = "⏸";
  }
};
document.getElementById("nextBtn").onclick = nextLine;
document.getElementById("restartBtn").onclick = () => { currentLine = 0; renderLyrics(); window.scrollTo({ top: 0, behavior: "smooth" }); };
document.getElementById("speedSlider").oninput = e => {
  interval = e.target.value * 1000;
  document.getElementById("speedValue").textContent = e.target.value + "s";
};
document.getElementById("sensitivitySlider").oninput = e => {
  sensitivityThreshold = parseInt(e.target.value);
  document.getElementById("sensitivityValue").textContent = sensitivityThreshold;
};

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
});
