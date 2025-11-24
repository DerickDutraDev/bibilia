// ELEMENTOS
const micBtn = document.getElementById("mic-btn");
const statusText = document.getElementById("status");
const face = document.getElementById("face");
const chatWindow = document.getElementById("chat-window");
const textInput = document.getElementById("text-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");

// =========================================================
// SOM AMBIENTE DO CÉU
// =========================================================
function startHeavenSound() {
  const bgAudio = document.getElementById("heaven-audio");
  if (!bgAudio) return;
  bgAudio.volume = 0.25;
  bgAudio.play().catch(() => {});
}

// =========================================================
// BOTÕES (Devocional + Reset)
// =========================================================
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

// =========================================================
// LIPSYNC (boca animada enquanto Jesus fala)
// =========================================================
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

// =========================================================
// CHAT VISUAL – Bolhas WhatsApp + Avatar
// =========================================================
function addMessage(role, text) {
  // ativa a janela do chat somente quando houver interação real (envio ou mic)
  activateChatWindow();

  const wrapper = document.createElement("div");
  wrapper.className = "msg-row " + (role === "user" ? "right" : "left");

  if (role === "jesus") {
    const img = document.createElement("img");
    img.src = "./jesus-avatar.png";
    img.className = "msg-avatar";
    wrapper.appendChild(img);
  }

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + role;
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);

  // keep scroll at bottom
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: "smooth" });
}

// =========================================================
// TYPING INDICATOR
// =========================================================
function showTyping() {
  if (!typingIndicator) return;
  typingIndicator.classList.remove("hidden");
  // ensure typing indicator is last element
  chatWindow.appendChild(typingIndicator);
  chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: "smooth" });
}

function hideTyping() {
  if (!typingIndicator) return;
  typingIndicator.classList.add("hidden");
}

// =========================================================
// ÁUDIO (Voz + Lipsync)
// =========================================================
async function speak(text) {
  hideTyping();

  try {
    const resp = await fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!resp.ok) {
      throw new Error("Falha ao gerar áudio");
    }

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
}

// =========================================================
// CONTEXTO (memória local)
// =========================================================
let localContext = JSON.parse(localStorage.getItem("jesusContext") || "[]");

function saveToCache(role, text) {
  localContext.push({ role, text });
  if (localContext.length > 8) localContext.shift();
  localStorage.setItem("jesusContext", JSON.stringify(localContext));
}

// =========================================================
// GEMINI API
// =========================================================
async function askJesus(question) {
  saveToCache("user", question);

  showTyping();

  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: question }),
  });

  const data = await res.json();

  hideTyping();

  const reply = data.text || "Filho, confie no Senhor.";
  saveToCache("assistant", reply);
  return reply;
}

// =========================================================
// ATIVA JANELA DO CHAT (quando for necessário)
// =========================================================
function activateChatWindow() {
  if (!chatWindow.classList.contains("active")) {
    chatWindow.classList.add("active");
  }
}

// =========================================================
// RECONHECIMENTO DE VOZ
// =========================================================
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

// =========================================================
// MICROFONE
// =========================================================
micBtn.addEventListener("click", () => {
  startHeavenSound();

  if (!recognition) return;

  if (!listening) {
    listening = true;
    // ativa a janela do chat quando o mic inicia a escuta
    activateChatWindow();

    micBtn.classList.add("listening");
    devotionalBtn.disabled = true;

    statusText.textContent = "Jesus está se conectando...";

    // fala inicial, então começa a escutar
    speak("Olá, filho ou filha. Como você está hoje?").then(() => {
      try {
        recognition.start();
        statusText.textContent = "Jesus está te ouvindo...";
      } catch (e) {
        console.warn("Não foi possível iniciar reconhecimento:", e);
      }
    });
  } else {
    listening = false;
    micBtn.classList.remove("listening");
    devotionalBtn.disabled = false;

    try {
      recognition.stop();
    } catch {}
    speak("A paz esteja contigo, filho ou filha. Até breve.");
    statusText.textContent = "Conversa encerrada.";
  }
});

if (recognition) {
  recognition.onresult = async (evt) => {
    const userText = evt.results[0][0].transcript;
    // ativar chat (já deve estar ativo quando mic start foi chamado)
    activateChatWindow();

    addMessage("user", userText);

    statusText.textContent = "Jesus está refletindo...";
    showTyping();

    const reply = await askJesus(userText);

    hideTyping();
    addMessage("jesus", reply);
    await speak(reply);

    if (listening) {
      setTimeout(() => {
        try {
          recognition.start();
          statusText.textContent = "Jesus está te ouvindo novamente...";
        } catch {}
      }, 1200);
    }
  };

  recognition.onerror = (evt) => {
    if (listening && evt.error === "no-speech") {
      statusText.textContent = "Não ouvi nada, fale novamente.";
      setTimeout(() => {
        try {
          recognition.start();
        } catch {}
      }, 1500);
    }
  };

  recognition.onend = () => {
    if (listening) {
      try {
        recognition.start();
      } catch {}
    }
  };
}

// =========================================================
// ENVIO DE TEXTO
// =========================================================
sendBtn.addEventListener("click", sendTextMessage);
textInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendTextMessage();
});

async function sendTextMessage() {
  const text = textInput.value.trim();
  if (!text) return;

  // ativar chat apenas quando o usuário enviar de fato
  activateChatWindow();

  addMessage("user", text);
  textInput.value = "";

  showTyping();
  const reply = await askJesus(text);
  hideTyping();

  addMessage("jesus", reply);
  speak(reply);
}

// =========================================================
// MODO DEVOCIONAL
// =========================================================
devotionalBtn.addEventListener("click", async () => {
  startHeavenSound();

  // ativa chat ao iniciar devocional
  activateChatWindow();

  micBtn.disabled = true;
  devotionalBtn.disabled = true;

  statusText.textContent = "Preparando devocional...";
  showTyping();

  const message = await askJesus(
    "Traga uma palavra devocional curta e inspiradora."
  );

  hideTyping();
  addMessage("jesus", message);
  await speak(message);

  micBtn.disabled = false;
  devotionalBtn.disabled = false;
  statusText.textContent = "Devocional concluído.";
});
