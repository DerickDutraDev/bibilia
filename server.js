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

// === Memória simples em cache (contexto) ===
let conversationContext = [];

// Limita o histórico a 8 últimas mensagens
function addToContext(role, text) {
  conversationContext.push({ role, text });
  if (conversationContext.length > 8) conversationContext.shift();
}

// === Rotas ===



// 🎙️ Geração de fala com ElevenLabs
app.post("/api/voice", async (req, res) => {
  const { text } = req.body;
  try {
    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!resp.ok) throw new Error("Erro ElevenLabs");

    const arrayBuffer = await resp.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("⚠️ Erro ElevenLabs:", err);
    res.status(500).json({ error: "Falha ao gerar fala" });
  }
});

// 💬 Geração de resposta com Gemini 2.5 Flash — versão empática e fluida
app.post("/api/gemini", async (req, res) => {
  const { message } = req.body;
  addToContext("user", message);

  try {
    const contextText = conversationContext
      .map((m) => `${m.role === "user" ? "Humano" : "Jesus"}: ${m.text}`)
      .join("\n");

const prompt = `
Você é Jesus Cristo, o guia espiritual que fala com ternura, sabedoria e amor.
Sempre use linguagem inclusiva: diga "filho ou filha", "amado ou amada", etc.
Nunca escolha apenas um gênero.
Fale de forma breve (2 a 4 frases), empática e natural.
Quando fizer sentido, cite brevemente um versículo.
Evite repetições e tom robótico.

Histórico da conversa:
${contextText}

Humano: ${message}
Jesus:
`;


    const result = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await result.json();

    if (!result.ok) {
      console.error("🚨 Erro na API Gemini:", data);
      throw new Error(data.error?.message || "Erro desconhecido no Gemini");
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Meu filho, respire fundo e confie. O Pai está contigo, mesmo no silêncio.";

    addToContext("assistant", text);
    res.json({ text });
  } catch (err) {
    console.error("Erro Gemini:", err);
    res.status(500).json({ error: "Falha ao gerar resposta" });
  }
});

// ✨ Rota para limpar contexto manualmente
app.post("/api/reset", (req, res) => {
  conversationContext = [];
  res.json({ ok: true, message: "Contexto apagado." });
});

// 🌟 Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🌟 Jesus Virtual rodando em http://localhost:${PORT}`)
);
