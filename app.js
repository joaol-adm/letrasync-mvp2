const currentModel = "vosk-model-en";
let lyrics = [], currentLine = 0, timer = null, interval = 3000;
let audioContext, analyser, microphone, dataArray;

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
    micStatus.textContent = "⏳ Aguardando som...";
    monitorVolume();
  } catch (e) {
    micStatus.textContent = "❌ Erro ao acessar microfone";
  }
}

function monitorVolume() {
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += Math.abs(dataArray[i] - 128);
  }
  let volume = sum / dataArray.length;
  volumeMeter.style.width = Math.min(100, volume * 5) + "%";
  if (volume > 5) {
    micStatus.textContent = "🎤 Captando áudio...";
    beatCircle.classList.add("active");
    setTimeout(() => beatCircle.classList.remove("active"), 100);
  } else {
    micStatus.textContent = "⏳ Aguardando som...";
  }
  requestAnimationFrame(monitorVolume);
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
    document.getElementById("scanAgainBtn").style.display = "inline-block";
  }
}

document.getElementById("micBtn").onclick = enableMic;
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
document.getElementById("restartBtn").onclick = () => { currentLine = 0; renderLyrics(); };
document.getElementById("speedSlider").oninput = e => {
  interval = e.target.value * 1000;
  document.getElementById("speedValue").textContent = e.target.value + "s";
};

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
});
