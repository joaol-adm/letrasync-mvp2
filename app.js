const currentModel = "vosk-model-en";
let lyrics = [], currentLine = 0, timer = null, interval = 3000;
let audioContext, analyser, microphone, dataArray, recognizer, model;
let sensitivityThreshold = 5;
let html5QrCode;

const lyricsEl = document.getElementById("lyrics");
const volumeMeter = document.getElementById("volumeMeter");
const micStatus = document.getElementById("micStatus");
const beatCircle = document.getElementById("beatCircle");

async function enableMic() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    if (!model) {
      model = await Vosk.createModel(`./${currentModel}/`);
      recognizer = new model.Recognizer();
    }
    micStatus.textContent = "⏳ Aguardando som...";
    processMic();
  } catch (e) {
    micStatus.textContent = "❌ Erro ao acessar microfone";
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

function processRecognition(audioData) {
  const textResult = recognizer.acceptWaveform(audioData);
  if (textResult) {
    const recognized = recognizer.result().text.toLowerCase();
    const currentLyric = lyrics[currentLine]?.toLowerCase();
    if (recognized && currentLyric && recognized.includes(currentLyric.split(" ")[0])) {
      if (sensitivityThreshold <= 5) nextLine();
    }
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
