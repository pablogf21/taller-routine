import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const TALLER = {
  nombre: process.env.TALLER_NOMBRE || "Taller Martinez",
  telefono: process.env.TALLER_TELEFONO || "91 123 45 67",
  ciudad: process.env.TALLER_CIUDAD || "Madrid",
  email_remitente: process.env.TALLER_EMAIL || "taller@ejemplo.com",
};

const skillPath = path.join(__dirname, "SKILL.md");
const SKILL_CONTENT = fs.readFileSync(skillPath, "utf-8")
  .replace(/\[NOMBRE_TALLER\]/g, TALLER.nombre)
  .replace(/\[TELEFONO\]/g, TALLER.telefono)
  .replace(/\[CIUDAD\]/g, TALLER.ciudad);

console.log("Skill cargado: " + TALLER.nombre);

const claude = new Anthropic();

async function generarMensajes(datos) {
  const { nombre_cliente, numero_cliente, hora_llamada, motivo_probable, tiene_email } = datos;
  const prompt = `Eres el asistente de ${TALLER.nombre}. Acaba de perderse una llamada.
Datos:
- Nombre: ${nombre_cliente || "desconocido"}
- Numero: ${numero_cliente}
- Hora: ${hora_llamada}
- Motivo: ${motivo_probable || "consulta general"}
- Tiene email: ${tiene_email ? "si" : "no"}

Genera exactamente este JSON sin markdown:
{"whatsapp":"mensaje","email_asunto":"asunto o null","email_cuerpo":"cuerpo o null","nota_interna":"nota"}`;

  const response = await claude.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    system: SKILL_CONTENT,
    messages: [{ role: "user", content: prompt }],
  });

  const texto = response.content[0].text.trim();
  const limpio = texto.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(limpio);
}

async function enviarWhatsApp(numero, mensaje) {
  console.log("WHATSAPP -> " + numero + ": " + mensaje);
  return { ok: true, canal: "whatsapp", numero };
}

async function enviarEmail(email, asunto, cuerpo) {
  console.log("EMAIL -> " + email + ": " + asunto);
  return { ok: true, canal: "email" };
}

function registrarNotaInterna(datos, nota, resultados) {
  const log = {
    timestamp: new Date().toISOString(),
    cliente: datos.nombre_cliente || "desconocido",
    numero: datos.numero_cliente,
    nota_interna: nota,
    mensajes_enviados: resultados,
  };
  const logPath = path.join(__dirname, "llamadas_perdidas.log");
  fs.appendFileSync(logPath, JSON.stringify(log) + "\n");
}

app.post("/webhook/llamada-perdida", async (req, res) => {
  const { nombre_cliente, numero_cliente, hora_llamada, motivo_probable, email_cliente } = req.body;
  if (!numero_cliente) {
    return res.status(400).json({ error: "numero_cliente es obligatorio" });
  }
  const datos = {
    nombre_cliente: nombre_cliente || null,
    numero_cliente,
    hora_llamada: hora_llamada || new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    motivo_probable: motivo_probable || null,
    tiene_email: !!email_cliente,
  };
  try {
    const mensajes = await generarMensajes(datos);
    const resultados = [];
    const wa = await enviarWhatsApp(datos.numero_cliente, mensajes.whatsapp);
    resultados.push(wa);
    if (email_cliente && mensajes.email_asunto) {
      const em = await enviarEmail(email_cliente, mensajes.email_asunto, mensajes.email_cuerpo);
      resultados.push(em);
    }
    registrarNotaInterna(datos, mensajes.nota_interna, resultados);
    res.json({ ok: true, mensajes_enviados: resultados.length, whatsapp: mensajes.whatsapp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/test", async (req, res) => {
  const datos = {
    nombre_cliente: "Maria",
    numero_cliente: "+34 612 345 678",
    hora_llamada: "11:42",
    motivo_probable: "presupuesto frenos",
    tiene_email: true,
  };
  try {
    const mensajes = await generarMensajes(datos);
    registrarNotaInterna(datos, mensajes.nota_interna, []);
    res.json({ test: true, ok: true, whatsapp: mensajes.whatsapp, email_asunto: mensajes.email_asunto });
  } catch (error) {
    res.json({ test: true, ok: false, error: error.message });
  }
});

app.get("/health", (_, res) => {
  res.json({ ok: true, taller: TALLER.nombre, skill_cargado: true, uptime_segundos: Math.round(process.uptime()) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("ROUTINE activa - Puerto: " + PORT);
  console.log("Taller: " + TALLER.nombre);
});