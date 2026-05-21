# Routine: Recuperación de llamada perdida
### Taller mecánico — Madrid

---

## Qué hace

Cuando un cliente llama y no se puede atender:
1. El sistema de telefonía envía un webhook a esta routine
2. Claude carga el `SKILL.md` del taller y genera los mensajes
3. Se envía un WhatsApp personalizado al cliente en menos de 2 minutos
4. Si hay email, se envía también
5. Se registra una nota interna en el log del taller

---

## Instalación (5 minutos)

```bash
# 1. Entrar a la carpeta
cd taller_llamada_perdida

# 2. Copiar el SKILL.md aquí (o ajusta la ruta en routine.js)
cp SKILL.md taller_routine/SKILL.md

# 3. Instalar dependencias
cd taller_routine
npm install

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus datos reales

# 5. Arrancar
npm start
```

---

## Probar sin telefonía real

```bash
# Con el servidor corriendo, lanza el test:
curl -X POST http://localhost:3000/test
```

Verás en consola el WhatsApp y email generados para "María" con su presupuesto de frenos.

---

## Conectar con tu sistema de telefonía

### Opción A — Asterisk / FreePBX
Añade en el dialplan un AGI script que haga POST al webhook cuando `DIALSTATUS=NOANSWER`.

### Opción B — VoIP.ms / Zadarma / Vonage
Configura el "missed call webhook URL" apuntando a:
```
https://tu-servidor.com/webhook/llamada-perdida
```

### Opción C — Twilio (telefonía + WhatsApp en uno)
Twilio puede tanto detectar la llamada perdida como enviar el WhatsApp.
Configura el webhook de "call status" en tu número de Twilio.

### Opción D — Zapier / Make (sin código)
Crea un zap: "Llamada perdida en [tu sistema]" → POST a esta URL con los datos del cliente.

---

## Formato del webhook

```json
POST /webhook/llamada-perdida
Content-Type: application/json

{
  "nombre_cliente": "María",
  "numero_cliente": "+34612345678",
  "hora_llamada": "11:42",
  "motivo_probable": "presupuesto frenos",
  "email_cliente": "maria@gmail.com"
}
```

Solo `numero_cliente` es obligatorio. El resto es opcional pero mejora la personalización.

---

## Conectar WhatsApp real

Descomenta en `routine.js` la sección de tu proveedor preferido:

| Proveedor | Coste aprox. | Mejor para |
|---|---|---|
| Twilio | ~0.05€/msg | Fácil de configurar |
| 360dialog | ~0.02€/msg | Volumen alto |
| Meta Cloud API | Gratis hasta 1000/mes | Sin intermediario |

---

## Conectar email real

Descomenta en `routine.js` la sección de tu proveedor:

| Proveedor | Plan gratuito | Setup |
|---|---|---|
| Resend | 3.000/mes gratis | 5 min |
| SendGrid | 100/día gratis | 10 min |
| Nodemailer + Gmail | Gratis | 15 min |

---

## Despliegue en producción

```bash
# Railway (recomendado — gratis para empezar)
railway login
railway init
railway up

# Render
# Conecta tu repo GitHub y despliega como Web Service

# VPS propio
pm2 start routine.js --name "taller-routine"
pm2 save
pm2 startup
```

---

## Estructura de archivos

```
taller_llamada_perdida/
├── SKILL.md              ← instrucciones para Claude
├── routine.js            ← servidor y lógica principal
├── package.json
├── .env.example          ← variables de entorno (copiar a .env)
├── README.md
└── llamadas_perdidas.log ← se crea automáticamente
```

---

## Personalizar para un nuevo cliente

1. Editar `SKILL.md`: cambiar nombre del taller, tono, especialidades
2. Editar `.env`: cambiar `TALLER_NOMBRE`, `TALLER_TELEFONO`, etc.
3. Reiniciar el servidor
4. Listo — mismo código, nuevo cliente

---

*Versión 1.0 — Pablo — 2026*
