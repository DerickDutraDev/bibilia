const micBtn = document.getElementById("mic-btn");
const statusText = document.getElementById("status");
const face = document.getElementById("face");
const messageBox = document.getElementById("message-box");
const assistantText = document.getElementById("assistant-text");

// === Som ambiente ===
function startHeavenSound() {
  const bgAudio = document.getElementById("heaven-audio");
  if (!bgAudio) return;
  bgAudio.volume = 0.25;
  bgAudio.play().catch(() => {});
}

// === Botões ===
const devotionalBtn = document.createElement("button");
devotionalBtn.textContent = "📖 Modo Devocional";
Object.assign(devotionalBtn.style, {
  marginTop: "12px",
  background: "#e0c285",
  border: "none",
  padding: "12px 18px",
  borderRadius: "12px",
  fontSize: "16px",
  fontWeight: "600",
  color: "#3a2b00",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  width: "80%",
  maxWidth: "300px",
  cursor: "pointer",
});
document.querySelector(".card").appendChild(devotionalBtn);

const resetBtn = document.createElement("button");
resetBtn.textContent = "♻️ Reiniciar Conversa";
Object.assign(resetBtn.style, {
  marginTop: "8px",
  background: "#ddd2a3",
  border: "none",
  padding: "10px 14px",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#3a2b00",
  width: "70%",
  maxWidth: "260px",
  cursor: "pointer",
});
document.querySelector(".card").appendChild(resetBtn);

// === Lipsync ===
let speakingInterval;
function startLipsync() {
  clearInterval(speakingInterval);
  speakingInterval = setInterval(() => {
    const scale = 1 + Math.random() * 0.03;
    face.style.transform = `scale(${scale})`;
    face.style.filter = `brightness(${0.95 + Math.random() * 0.1})`;
  }, 100);
}
function stopLipsync() {
  clearInterval(speakingInterval);
  face.style.transform = "";
  face.style.filter = "";
}

// === Fala ===
async function speak(text) {
  assistantText.textContent = "";
  messageBox.classList.add("visible", "typing");

  const chars = text.split("");
  const audioPromise = (async () => {
    try {
      const resp = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onplay = startLipsync;
      audio.onended = stopLipsync;
      await audio.play();
    } catch {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR";
      u.onstart = startLipsync;
      u.onend = stopLipsync;
      speechSynthesis.speak(u);
    }
  })();

  for (const ch of chars) {
    assistantText.textContent += ch;
    messageBox.scrollTo({ top: messageBox.scrollHeight, behavior: "smooth" });
    await new Promise((r) => setTimeout(r, 20));
  }

  messageBox.classList.remove("typing");
  await audioPromise;
}

// === Contexto local ===
let localContext = JSON.parse(localStorage.getItem("jesusContext") || "[]");

function saveToCache(role, text) {
  localContext.push({ role, text });
  if (localContext.length > 8) localContext.shift();
  localStorage.setItem("jesusContext", JSON.stringify(localContext));
}

// === Gemini ===
async function askJesus(question) {
  saveToCache("user", question);
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: question }),
  });
  const data = await res.json();
  const reply = data.text;
  saveToCache("assistant", reply);
  return reply;
}

// === Reconhecimento de voz ===
let recognition;
let listening = false;

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
} else {
  micBtn.disabled = true;
  statusText.textContent = "Seu navegador não suporta voz.";
}

// === Fluxo principal ===
micBtn.addEventListener("click", () => {
  startHeavenSound();
  if (!recognition) return;

  if (!listening) {
    listening = true;
    micBtn.classList.add("listening");
    devotionalBtn.disabled = true;
    resetBtn.disabled = true;
    statusText.textContent = "Jesus está se conectando...";
    speak("Olá, filho ou filha. Como você está hoje?").then(() => {
      recognition.start();
      statusText.textContent = "Jesus está te ouvindo...";
    });
  } else {
    listening = false;
    micBtn.classList.remove("listening");
    devotionalBtn.disabled = false;
    resetBtn.disabled = false;
    recognition.stop();
    speak("A paz esteja contigo, filho ou filha. Até breve.");
    statusText.textContent = "Conversa encerrada.";
  }
});

if (recognition) {
  recognition.onresult = async (evt) => {
    const userText = evt.results[0][0].transcript;
    statusText.textContent = "Jesus está refletindo...";
    const reply = await askJesus(userText);
    await speak(reply);

    // Reinicia automaticamente após resposta
    if (listening) {
      setTimeout(() => {
        try {
          recognition.start();
          statusText.textContent = "Jesus está te ouvindo novamente...";
        } catch (e) {
          console.warn("Reconhecimento já ativo.");
        }
      }, 1200);
    }
  };

  recognition.onerror = (evt) => {
    console.warn("Erro reconhecimento:", evt.error);
    if (listening && evt.error === "no-speech") {
      statusText.textContent = "Não ouvi nada, filho ou filha. Fale novamente.";
      setTimeout(() => {
        try {
          recognition.start();
        } catch {}
      }, 1500);
    } else {
      statusText.textContent = "Não consegui ouvir bem. Tente novamente.";
    }
  };

  recognition.onend = () => {
    // Garante que continua ouvindo se ainda estiver no modo ativo
    if (listening) {
      try {
        recognition.start();
        statusText.textContent = "Jesus continua te ouvindo...";
      } catch {}
    }
  };
}

// === Devocional ===
devotionalBtn.addEventListener("click", async () => {
  startHeavenSound();
  micBtn.disabled = true;
  devotionalBtn.disabled = true;
  statusText.textContent = "Preparando devocional...";
  const res = await askJesus("Traga uma palavra devocional breve e inspiradora.");
  await speak(res);
  micBtn.disabled = false;
  devotionalBtn.disabled = false;
  statusText.textContent = "Devocional concluído.";
});

// === Resetar contexto ===
resetBtn.addEventListener("click", async () => {
  await fetch("/api/reset", { method: "POST" });
  localContext = [];
  localStorage.removeItem("jesusContext");
  assistantText.textContent = "Memória apagada.";
  statusText.textContent = "Jesus esqueceu as conversas anteriores.";
});
