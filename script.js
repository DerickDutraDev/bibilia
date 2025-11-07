const micBtn = document.getElementById("mic-btn");
const statusText = document.getElementById("status");
const face = document.getElementById("face");

// cria botão devocional dinamicamente
const devotionalBtn = document.createElement("button");
devotionalBtn.textContent = "📖 Modo Devocional";
devotionalBtn.id = "devocional-btn";
devotionalBtn.style.marginTop = "12px";
devotionalBtn.style.background = "#e0c285";
devotionalBtn.style.border = "none";
devotionalBtn.style.padding = "12px 18px";
devotionalBtn.style.borderRadius = "12px";
devotionalBtn.style.fontSize = "16px";
devotionalBtn.style.fontWeight = "600";
devotionalBtn.style.color = "#3a2b00";
devotionalBtn.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
devotionalBtn.style.transition = "0.2s";
devotionalBtn.style.width = "80%";
devotionalBtn.style.maxWidth = "300px";
devotionalBtn.style.cursor = "pointer";
devotionalBtn.style.alignSelf = "center";

devotionalBtn.addEventListener("mouseenter", () => {
  devotionalBtn.style.filter = "brightness(1.1)";
});
devotionalBtn.addEventListener("mouseleave", () => {
  devotionalBtn.style.filter = "brightness(1)";
});

document.querySelector(".card").appendChild(devotionalBtn);

let recognition = null;
let listening = false;
let speakingInterval = null;

// reconhecimento de voz
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
} else {
  micBtn.disabled = true;
  statusText.textContent = "Seu navegador não suporta reconhecimento de voz.";
}

// animações simples (zoom leve e filtro de brilho)
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

// fala com animação simples de “lipsync”
function speak(text, opts = {}) {
  if (!("speechSynthesis" in window)) {
    if (opts.onend) opts.onend();
    return;
  }

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  u.rate = 0.95;
  u.pitch = 1.0;

  const voices = speechSynthesis.getVoices();
  const best = voices.find((v) => v.lang === "pt-BR");
  if (best) u.voice = best;

  u.onstart = () => startLipsync();
  u.onend = () => {
    stopLipsync();
    if (opts.onend) opts.onend();
  };

  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// 🔹 Temas e versículos
const bibleThemes = {
  fé: { book: "hb", chapter: 11, verse: 1 },
  amor: { book: "1jo", chapter: 4, verse: 19 },
  medo: { book: "sl", chapter: 23, verse: 4 },
  ansiedade: { book: "fp", chapter: 4, verse: 6 },
  força: { book: "is", chapter: 40, verse: 31 },
  tristeza: { book: "jo", chapter: 16, verse: 33 },
  esperança: { book: "rm", chapter: 15, verse: 13 },
  paz: { book: "jo", chapter: 14, verse: 27 },
};

const localBibleFallback = {
  fé: "Ora, a fé é o firme fundamento das coisas que se esperam, e a prova das coisas que se não veem. — Hebreus 11:1",
  amor: "Nós o amamos porque Ele nos amou primeiro. — 1 João 4:19",
  medo: "Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum, porque Tu estás comigo. — Salmos 23:4",
  ansiedade:
    "Não estejais inquietos por coisa alguma; antes, as vossas petições sejam em tudo conhecidas diante de Deus. — Filipenses 4:6",
  força:
    "Mas os que esperam no Senhor renovarão as suas forças. — Isaías 40:31",
  tristeza:
    "No mundo tereis aflições, mas tende bom ânimo; eu venci o mundo. — João 16:33",
  esperança:
    "O Deus da esperança vos encha de todo o gozo e paz. — Romanos 15:13",
  paz: "Deixo-vos a paz, a minha paz vos dou. — João 14:27",
};

// 🔹 Busca versículo da API (com fallback)
async function getBibleVerse(theme) {
  const ref = bibleThemes[theme] || bibleThemes["fé"];
  const url = `https://www.abibliadigital.com.br/api/verses/arc/${ref.book}/${ref.chapter}/${ref.verse}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Falha na API");
    const data = await response.json();
    if (data.text && data.book) {
      return `${data.text.trim()} — ${data.book.name} ${data.chapter}:${
        data.number
      }`;
    }
  } catch (err) {
    console.warn("API indisponível, usando versículo local:", err.message);
  }

  return localBibleFallback[theme];
}

// 🔹 Gera resposta de Jesus com base no tema
async function generateResponse(text) {
  const t = text.toLowerCase();
  let theme = "fé";
  if (t.includes("fé")) theme = "fé";
  else if (t.includes("amor")) theme = "amor";
  else if (t.includes("força")) theme = "força";
  else if (t.includes("triste")) theme = "tristeza";
  else if (t.includes("medo")) theme = "medo";
  else if (t.includes("ansiedade")) theme = "ansiedade";
  else if (t.includes("esperança")) theme = "esperança";
  else if (t.includes("paz")) theme = "paz";

  const verse = await getBibleVerse(theme);
  return `Filho, medite sobre este versículo: ${verse}`;
}

// 🔹 Integração reconhecimento de voz
if (recognition) {
  recognition.onresult = async (evt) => {
    const userText = evt.results[0][0].transcript;
    const response = await generateResponse(userText);
    statusText.textContent = "Jesus está respondendo...";
    speak(response, {
      onend: () => {
        if (listening) {
          statusText.textContent = "Jesus está te ouvindo...";
          setTimeout(() => recognition.start(), 600);
        } else {
          statusText.textContent = "Toque no microfone para conversar";
        }
      },
    });
  };

  recognition.onerror = (e) => {
    console.warn(e);
    statusText.textContent = "Não ouvi direito. Tente novamente.";
  };
}

// 🔹 Botão microfone
micBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (!listening) {
    listening = true;
    micBtn.classList.add("listening");
    devotionalBtn.disabled = true;
    statusText.textContent = "Iniciando conversa...";
    speak("Olá meu filho. Como você está hoje?", {
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
    speak("Que a paz esteja contigo. Estarei aqui quando quiser voltar.");
    statusText.textContent = "Chamada encerrada";
  }
});

// 🔹 Botão devocional
devotionalBtn.addEventListener("click", async () => {
  micBtn.disabled = true;
  devotionalBtn.disabled = true;
  statusText.textContent = "Preparando devocional...";

  const themes = Object.keys(bibleThemes);
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  const verse = await getBibleVerse(randomTheme);

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
