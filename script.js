const micBtn = document.getElementById("mic-btn");
const statusText = document.getElementById("status");
const face = document.getElementById("face");
const messageBox = document.getElementById("message-box");
const assistantText = document.getElementById("assistant-text");
const bgAudio = document.getElementById("heaven-audio");

// 🔊 inicia som ambiente suave
function startHeavenSound() {
  bgAudio.volume = 0.3;
  bgAudio
    .play()
    .catch(() =>
      console.warn("Som ambiente aguardando interação do usuário.")
    );
}

// 🔆 botão Modo Devocional
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
  alignSelf: "center",
  transition: "0.2s",
});
devotionalBtn.addEventListener("mouseenter", () => {
  devotionalBtn.style.filter = "brightness(1.1)";
});
devotionalBtn.addEventListener("mouseleave", () => {
  devotionalBtn.style.filter = "brightness(1)";
});
document.querySelector(".card").appendChild(devotionalBtn);

let voicePitch = 0.9;
let voiceRate = 0.92;

let elevenApiKey =
  "76f3e2de8b4186c2a7809d391f42a9c923e50c4ba62e1b109a3937ed7b99a41f";
let elevenVoiceId = "29vD33N1CtxCmqQRPOHJ";

async function elevenSynthesize(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    elevenVoiceId
  )}`;
  const body = { text };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": elevenApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error("Erro ao conectar ElevenLabs");
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}

// ✨ lipsync
let speakingInterval = null;
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

// 🕊️ fala e digitação sincronizados
async function speak(text, opts = {}) {
  assistantText.textContent = "";
  messageBox.classList.add("visible", "typing");

  const chars = text.split("");
  let i = 0;
  let finishedTyping = false;

  // início do áudio logo no começo da digitação
  const audioPromise = (async () => {
    try {
      const blobUrl = await elevenSynthesize(text);
      const audio = new Audio(blobUrl);
      audio.onplay = startLipsync;
      audio.onended = () => {
        stopLipsync();
        if (opts.onend) opts.onend();
      };
      await audio.play();
    } catch {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR";
      u.rate = voiceRate;
      u.pitch = voicePitch;
      u.onstart = startLipsync;
      u.onend = () => {
        stopLipsync();
        if (opts.onend) opts.onend();
      };
      speechSynthesis.speak(u);
    }
  })();

  // digitação suave enquanto fala
  for (const ch of chars) {
    assistantText.textContent += ch;
    messageBox.scrollTo({ top: messageBox.scrollHeight, behavior: "smooth" });
    await new Promise((r) => setTimeout(r, 20));
  }

  finishedTyping = true;
  messageBox.classList.remove("typing");
  await audioPromise;
}

// 🎙️ reconhecimento de voz
let recognition = null;
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

// 📖 temas e versículos
const bibleThemes = {
  fé: "Ora, a fé é o firme fundamento das coisas que se esperam. — Hebreus 11:1",
  amor: "Nós o amamos porque Ele nos amou primeiro. — 1 João 4:19",
  medo: "Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum. — Salmos 23:4",
  ansiedade:
    "Não andeis ansiosos por coisa alguma; antes, em tudo, sejam conhecidos os vossos pedidos diante de Deus. — Filipenses 4:6",
  força: "Os que esperam no Senhor renovarão as suas forças. — Isaías 40:31",
  tristeza: "No mundo tereis aflições, mas tende bom ânimo; eu venci o mundo. — João 16:33",
  esperança:
    "O Deus da esperança vos encha de todo gozo e paz em crença. — Romanos 15:13",
  paz: "Deixo-vos a paz, a minha paz vos dou. — João 14:27",
};

function getVerseByTheme(theme) {
  return bibleThemes[theme] || bibleThemes["fé"];
}

async function generateResponse(text) {
  const t = text.toLowerCase();
  let theme = "fé";
  for (const key of Object.keys(bibleThemes)) {
    if (t.includes(key)) {
      theme = key;
      break;
    }
  }
  const verse = getVerseByTheme(theme);
  return `Filho, medite sobre este versículo: ${verse}`;
}

// 🎤 mic control
micBtn.addEventListener("click", () => {
  startHeavenSound();

  if (!recognition) return;
  if (!listening) {
    listening = true;
    micBtn.classList.add("listening");
    devotionalBtn.disabled = true;
    statusText.textContent = "Iniciando conversa...";

    speak("Olá, meu filho. Como você está hoje?", {
      onend: () => {
        recognition.start();
        statusText.textContent = "Jesus está te ouvindo...";
      },
    });
  } else {
    listening = false;
    micBtn.classList.remove("listening");
    devotionalBtn.disabled = false;
    recognition.stop();
    speak("Que a paz esteja contigo, meu filho. Estarei aqui quando quiser voltar.");
    statusText.textContent = "Chamada encerrada.";
  }
});

// 🕊️ reconhecimento → resposta
if (recognition) {
  recognition.onresult = async (evt) => {
    const userText = evt.results[0][0].transcript;
    const response = await generateResponse(userText);
    statusText.textContent = "Jesus está respondendo...";
    speak(response, {
      onend: () => {
        if (listening) {
          statusText.textContent = "Jesus está te ouvindo...";
          setTimeout(() => recognition.start(), 500);
        } else {
          statusText.textContent = "Toque no microfone para conversar";
        }
      },
    });
  };

  recognition.onerror = () => {
    statusText.textContent = "Não ouvi direito. Tente novamente.";
  };
}

// 📖 Modo Devocional
devotionalBtn.addEventListener("click", async () => {
  startHeavenSound();

  micBtn.disabled = true;
  devotionalBtn.disabled = true;
  statusText.textContent = "Preparando devocional...";

  const themes = Object.keys(bibleThemes);
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  const verse = getVerseByTheme(randomTheme);
  const message = `Hoje vamos refletir sobre ${randomTheme}. ${verse}`;

  speak(message, {
    onend: () => {
      micBtn.disabled = false;
      devotionalBtn.disabled = false;
      statusText.textContent =
        "Devocional concluído. Toque no microfone para conversar.";
    },
  });
});
