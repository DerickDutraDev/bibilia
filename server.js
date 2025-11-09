import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Contexto da conversa ===
let conversationContext = [];
function addToContext(role, text) {
  if (!text) return;
  conversationContext.push({ role, text });
  if (conversationContext.length > 8) conversationContext.shift();
}

// === Função ElevenLabs ===
async function gerarFalaEleven(text) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.85,
        style: 0.5,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ElevenLabs: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// === Rota de voz ===
app.post("/api/voice", async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Texto inválido" });
  }

  try {
    // 🎙️ Tenta gerar com ElevenLabs
    try {
      const audioBuffer = await gerarFalaEleven(text);
      res.setHeader("Content-Type", "audio/mpeg");
      return res.send(audioBuffer);
    } catch (err) {
      console.warn("⚠️ Erro ElevenLabs:", err.message);

      // Se for erro de crédito ou modelo indisponível, usar voz do Google
      if (
        err.message.includes("quota_exceeded") ||
        err.message.includes("model_deprecated_free_tier") ||
        err.message.includes("401")
      ) {
        console.warn("💡 Sem crédito ou modelo indisponível. Usando voz do Google.");
      } else {
        console.warn("💡 Outro erro na ElevenLabs. Usando fallback Google.");
      }

      // Responde ao front avisando para usar o fallback
      return res.status(402).json({ fallback: "google", text });
    }
  } catch (err) {
    console.error("⚠️ Erro geral de voz:", err);
    return res.status(500).json({ error: "Falha ao gerar fala" });
  }
});

// === Rota do Gemini ===
app.post("/api/gemini", async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Mensagem vazia" });
  }

  addToContext("user", message);

  const contextText = conversationContext
    .map((m) => `${m.role === "user" ? "Humano" : "Jesus"}: ${m.text}`)
    .join("\n");

  const prompt = `
Você é Jesus Cristo, falando em um tom de paz, amor e sabedoria profunda.
Responda de forma natural, como se conversasse com algum discípulo — refletindo, acolhendo e inspirando.
Evite parecer robótico ou excessivamente formal; fale com o coração.
Use frases curtas, com pausas suaves e emoção, como quem deseja tocar a alma.
Chame a pessoa de "filho" ou "filha" com ternura, quando fizer sentido.
Sempre que possível, encerre com um versículo bíblico breve, que soe como resposta viva do Espírito.

Histórico da conversa até aqui:
${contextText}

Humano: ${message}
Jesus:
  `;


  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("🚨 Erro na API Gemini:", data);
      throw new Error(data.error?.message || "Erro desconhecido no Gemini");
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Meu filho, confie no Pai. Ele te ama e te sustenta.";

    addToContext("assistant", reply);
    res.json({ text: reply });
  } catch (err) {
    console.error("⚠️ Erro Gemini:", err.message || err);
    res.status(500).json({ error: "Falha ao gerar resposta (Gemini)" });
  }
});

// === Resetar contexto ===
app.post("/api/reset", (req, res) => {
  conversationContext = [];
  res.json({ ok: true, message: "Contexto apagado." });
});

// === Inicialização ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌟 Servidor Jesus Virtual rodando em http://localhost:${PORT}`);
});
