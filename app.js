const currentModel = "vosk-model-en";

let lyrics = [];
let currentLine = 0;
let timer = null;
let interval = 3000;
let recognizer;
let audioContext, analyser, microphone, dataArray;

const lyricsEl = document.getElementById("lyrics");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const scanAgainBtn = document.getElementById("scanAgainBtn");
const adjustBtn = document.getElementById("adjustBtn");
const endMsg = document.getElementById("endMsg");
const speedSlider = document.getElementById("speedSlider");
const themeToggle = document.getElementById("themeToggle");
const micBtn = document.getElementById("micBtn");
const volumeMeter = document.getElementById("volumeMeter");

let html5QrCode;

async function startVosk() {
  const model = await Vosk.createModel(`./${currentModel}/`);
  recognizer = new model.Recognizer();
}

async function enableMic() {
  try {
    await startVosk();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    processMic();
  } catch (err) {
    alert("Erro ao acessar microfone: " + err);
  }
}

function processMic() {
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += Math.abs(dataArray[i] - 128);
  }
  let volume = sum / dataArray.length;
  volumeMeter.style.width = Math.min(100, volume * 5) + "%";
  requestAnimationFrame(processMic);
}

function startQRScanner() {
  html5QrCode = new Html5Qrcode("reader");
  html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
    async (decodedText) => { html5QrCode.stop(); hideEndMsg(); await loadLyrics(decodedText); },
    (err) => console.warn(`QR Scan error: ${err}`));
}

async function loadLyrics(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erro ao carregar");
    const text = await res.text();
    lyrics = text.split("\n").filter(line => line.trim() !== "");
    currentLine = 0;
    restartBtn.style.display = "none";
    scanAgainBtn.style.display = "none";
    hideEndMsg();
    renderLyrics();
  } catch {
    lyricsEl.textContent = "❌ Não foi possível carregar a letra.";
    scanAgainBtn.style.display = "inline-block";
  }
}

function renderLyrics() {
  lyricsEl.innerHTML = "";
  lyrics.forEach((line, index) => {
    const div = document.createElement("div");
    div.textContent = line;
    div.classList.add("line");
    if (index === currentLine) {
      div.classList.add("current");
      setTimeout(() => div.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
    div.addEventListener("click", () => { currentLine = index; renderLyrics(); });
    lyricsEl.appendChild(div);
  });
}

function playPause() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    playPauseBtn.textContent = "▶️";
  } else {
    timer = setInterval(nextLine, interval);
    playPauseBtn.textContent = "⏸";
  }
}

function nextLine() {
  if (currentLine < lyrics.length - 1) {
    currentLine++;
    renderLyrics();
  } else {
    clearInterval(timer);
    timer = null;
    playPauseBtn.textContent = "▶️";
    restartBtn.style.display = "inline-block";
    scanAgainBtn.style.display = "inline-block";
    showEndMsg();
  }
}

function showEndMsg() {
  endMsg.classList.add("visible");
  setTimeout(() => endMsg.classList.remove("visible"), 5000);
}

function hideEndMsg() {
  endMsg.classList.remove("visible");
}

function restartLyrics() {
  currentLine = 0;
  restartBtn.style.display = "none";
  hideEndMsg();
  renderLyrics();
}

function scanAgain() {
  lyricsEl.innerHTML = "";
  restartBtn.style.display = "none";
  scanAgainBtn.style.display = "none";
  hideEndMsg();
  startQRScanner();
}

themeToggle.addEventListener("click", () => {
  document.body.dataset.theme = document.body.dataset.theme === "light" ? "dark" : "light";
});

micBtn.addEventListener("click", enableMic);

speedSlider.addEventListener("input", () => {
  interval = speedSlider.value * 1000;
  if (timer) { clearInterval(timer); timer = setInterval(nextLine, interval); }
});

playPauseBtn.addEventListener("click", playPause);
nextBtn.addEventListener("click", nextLine);
restartBtn.addEventListener("click", restartLyrics);
scanAgainBtn.addEventListener("click", scanAgain);

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
  startQRScanner();
});