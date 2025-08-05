const currentModel = "vosk-model-en";
let lyrics = [], currentLine = 0, timer = null, interval = 3000;
let audioContext, analyser, microphone, dataArray, recognizer, model;
let sensitivityThreshold = 5;
let html5QrCode;

const lyricsEl = document.getElementById("lyrics");
const volumeMeter = document.getElementById("volumeMeter");
const micStatus = document.getElementById("micStatus");
const logStatus = document.getElementById("logStatus");
const beatCircle = document.getElementById("beatCircle");

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
    micStatus.textContent = "🎤 Microfone ativo - aguardando modelo...";
    logMessage("📦 Carregando modelo...");
    if (!model) {
      model = await Vosk.createModel(`./${currentModel}/`);
      recognizer = new model.Recognizer();
      logMessage("✅ Modelo carregado!");
    }
    processMic();
    startRecognitionTest();
  } catch (e) {
    micStatus.textContent = "❌ Erro ao acessar microfone";
    logMessage("Erro: " + e.message);
  }
}

function processMic() {
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) sum += Math.abs(dataArray[i] - 128);
  let volume = sum / dataArray.length;
  volumeMeter.style.width = Math.min(100, volume * 5) + "%";
  if (volume > 5) {
    micStatus.textContent = "🎤 Captando áudio...";
    beatCircle.classList.add("active");
    setTimeout(() => beatCircle.classList.remove("active"), 100);
  } else {
    micStatus.textContent = "⏳ Aguardando som...";
  }
  requestAnimationFrame(processMic);
}

function startRecognitionTest() {
  logMessage("🔍 Teste de reconhecimento iniciado...");
  setInterval(() => {
    try {
      const textResult = recognizer.result().text;
      if (textResult) {
        logMessage("Reconhecido: " + textResult);
      }
    } catch (err) {
      logMessage("Erro no reconhecimento: " + err.message);
    }
  }, 2000);
}

function manualTestRecognition() {
  try {
    const textResult = recognizer.result().text;
    if (textResult) {
      logMessage("📝 Teste Manual: " + textResult);
    } else {
      logMessage("📝 Teste Manual: Nenhum texto reconhecido");
    }
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
document.getElementById("testRecBtn").onclick = manualTestRecognition;
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
