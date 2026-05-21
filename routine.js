/**
 * ROUTINE: Recuperación de llamada perdida — Taller mecánico
 * 
 * Trigger: Webhook POST desde sistema de telefonía
 * Acción:  Carga el SKILL.md, genera mensaje con Claude, envía WhatsApp + email
 * 
 * Requisitos: Node.js 18+
 * Instalar:   npm install
 * Arrancar:   node routine.js
 */
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// ─── Configuración del taller ────────────────────────────────────────────────
const TALLER = {
  nombre: process.env.TALLER_NOMBRE || "Taller Martínez",
  telefono: process.env.TALLER_TELEFONO || "91 123 45 67",
  ciudad: process.env.TALLER_CIUDAD || "Madrid",
  email_remitente: process.env.TALLER_EMAIL || "taller@ejemplo.com",
};

// ─── Cargar el skill una sola vez al arrancar ─────────────────────────────────
const skillPath = path.join(__dirname, "SKILL.md");
const SKILL_CONTENT = fs.readFileSync(skillPath, "utf-8")
  .replace(/\[NOMBRE_TALLER\]/g, TALLER.nombre)
  .replace(/\[TELÉFONO\]/g, TALLER.telefono)
  .replace(/\[CIUDAD\]/g, TALLER.ciudad);

console.log(`✅ Skill cargado: ${TALLER.nombre}`);

// ─── Cliente Anthropic ────────────────────────────────────────────────────────
const claude = new Anthropic();

// ─── Función principal: generar mensajes con Claude ──────────────────────────
async function generarMensajes(datos) {
  const { nombre_cliente, numero_cliente, hora_llamada, motivo_probable, tiene_email } = datos;

  const prompt = `
Eres el asistente de ${TALLER.nombre}. Acaba de perderse una llamada de un cliente.

Datos de la llamada perdida:
- Nombre del cliente: ${nombre_cliente || "desconocido"}
- Número: ${numero_cliente}
- Hora de la llamada: ${hora_llamada}
- Motivo probable: ${motivo_probable || "consulta general"}
- Tiene email registrado: ${tiene_email ? "sí" : "no"}

Usando las instrucciones del skill, genera exactamente esto en formato JSON:

{
  "whatsapp": "mensaje de WhatsApp listo para enviar",
  "email_asunto": "asunto del email (solo si tiene_email es true, si no pon null)",
  "email_cuerpo": "cuerpo del email completo (solo si tiene_email es true, si no pon null)",
  "nota_interna": "nota para el equipo del taller"
}

Devuelve SOLO el JSON, sin explicaciones ni markdown.
`;

  const response = await claude.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    system: SKILL_CONTENT,
    messages: [{ role: "user", content: prompt }],
  });

  const texto = response.content[0].text.trim();
const limpio = texto.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
return JSON.parse(limpio);

// ─── Simuladores de envío (reemplaza con tu proveedor real) ──────────────────

async function enviarWhatsApp(numero, mensaje) {
  // Aquí conectas: Twilio, 360dialog, Meta Cloud API, etc.
  console.log(`\n📱 WHATSAPP → ${numero}`);
  console.log(`   "${mensaje}"`);

  // Ejemplo con Twilio (descomenta y configura):
  // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  // await twilio.messages.create({
  //   from: 'whatsapp:+14155238886',
  //   to: `whatsapp:${numero}`,
  //   body: mensaje
  // });

  return { ok: true, canal: "whatsapp", numero };
}

async function enviarEmail(numero_cliente, asunto, cuerpo) {
  // Aquí conectas: Resend, SendGrid, Nodemailer, etc.
  console.log(`\n📧 EMAIL → (cliente de ${numero_cliente})`);
  console.log(`   Asunto: ${asunto}`);
  console.log(`   ${cuerpo.substring(0, 80)}...`);

  // Ejemplo con Resend (descomenta y configura):
  // const { Resend } = require('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: TALLER.email_remitente,
  //   to: email_cliente,
  //   subject: asunto,
  //   text: cuerpo
  // });

  return { ok: true, canal: "email" };
}

function registrarNotaInterna(datos, nota, mensajes_generados) {
  const log = {
    timestamp: new Date().toISOString(),
    cliente: datos.nombre_cliente || "desconocido",
    numero: datos.numero_cliente,
    hora_llamada: datos.hora_llamada,
    motivo: datos.motivo_probable || "consulta general",
    nota_interna: nota,
    mensajes_enviados: mensajes_generados,
  };

  const logPath = path.join(__dirname, "llamadas_perdidas.log");
  fs.appendFileSync(logPath, JSON.stringify(log) + "\n");
  console.log(`\n📋 NOTA INTERNA registrada en llamadas_perdidas.log`);
}

// ─── Endpoint principal: recibe el webhook ───────────────────────────────────
app.post("/webhook/llamada-perdida", async (req, res) => {
  const inicio = Date.now();
  console.log("\n═══════════════════════════════════════");
  console.log(`🔔 LLAMADA PERDIDA recibida — ${new Date().toLocaleTimeString("es-ES")}`);

  // Validar datos mínimos
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

  console.log(`   Cliente: ${datos.nombre_cliente || "desconocido"} (${datos.numero_cliente})`);
  console.log(`   Hora: ${datos.hora_llamada} | Motivo: ${datos.motivo_probable || "—"}`);

  try {
    // 1. Generar mensajes con Claude + Skill
    console.log("\n🤖 Generando mensajes con Claude...");
    const mensajes = await generarMensajes(datos);

    // 2. Enviar WhatsApp siempre
    const resultados = [];
    const wa = await enviarWhatsApp(datos.numero_cliente, mensajes.whatsapp);
    resultados.push(wa);

    // 3. Enviar email si está disponible
    if (email_cliente && mensajes.email_asunto) {
      const em = await enviarEmail(email_cliente, mensajes.email_asunto, mensajes.email_cuerpo);
      resultados.push(em);
    }

    // 4. Registrar nota interna
    registrarNotaInterna(datos, mensajes.nota_interna, resultados);

    const duracion = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`\n✅ Completado en ${duracion}s`);
    console.log("═══════════════════════════════════════\n");

    res.json({
      ok: true,
      duracion_segundos: parseFloat(duracion),
      mensajes_enviados: resultados.length,
      whatsapp_preview: mensajes.whatsapp.substring(0, 60) + "...",
    });

  } catch (error) {
    console.error("❌ Error en routine:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Endpoint de prueba: simula una llamada perdida ──────────────────────────
app.post("/test", async (req, res) => {
  console.log("\n🧪 MODO TEST activado");
  req.body = {
    nombre_cliente: "María",
    numero_cliente: "+34 612 345 678",
    hora_llamada: "11:42",
    motivo_probable: "presupuesto frenos",
    email_cliente: "maria@ejemplo.com",
  };
  try {
    const mensajes = await generarMensajes(req.body);
    registrarNotaInterna(req.body, mensajes.nota_interna, []);
    res.json({ test: true, ok: true, whatsapp: mensajes.whatsapp, email_asunto: mensajes.email_asunto });
  } catch (error) {
    res.json({ test: true, ok: false, error: error.message });
  }
});
// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_, res) => {
  res.json({
    ok: true,
    taller: TALLER.nombre,
    skill_cargado: true,
    uptime_segundos: Math.round(process.uptime()),
  });
});

// ─── Arrancar servidor ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log(`║  ROUTINE: Llamada perdida activa          ║`);
  console.log(`║  Taller: ${TALLER.nombre.padEnd(32)}║`);
  console.log(`║  Puerto: ${String(PORT).padEnd(32)}║`);
  console.log("╚══════════════════════════════════════════╝");
  console.log("\nEndpoints:");
  console.log(`  POST http://localhost:${PORT}/webhook/llamada-perdida`);
  console.log(`  POST http://localhost:${PORT}/test`);
  console.log(`  GET  http://localhost:${PORT}/health\n`);
});
