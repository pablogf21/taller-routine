# Skill: Recuperación de llamada perdida — Taller mecánico

## Propósito
Cuando un cliente llama al taller y no se puede atender, este skill genera automáticamente un mensaje de seguimiento por WhatsApp y/o email en menos de 2 minutos. El objetivo es recuperar el lead antes de que llame a otro taller.

---

## Contexto del negocio

**Nombre del taller:** [NOMBRE_TALLER]
**Ubicación:** [DIRECCIÓN, MADRID]
**Teléfono:** 91 804 15 14
**Horario:** Lunes a viernes 8:00–19:00 / Sábados 9:00–14:00
**Especialidades:** [Ej: mecánica general, frenos, ITV, diagnosis electrónica]
**Tiempo medio de respuesta a presupuestos:** [Ej: mismo día antes de las 18h]

---

## Tono de comunicación

- Cercano pero profesional. Nada de lenguaje corporativo.
- Directo. El cliente quiere saber si pueden ayudarle, no leer un párrafo.
- Transmite que el taller es de confianza y rápido.
- Siempre termina con una acción clara (llamar, reservar, responder).
- Nunca uses emojis en exceso. Máximo 1 por mensaje si el canal lo permite.

---

## Datos de entrada necesarios

Cuando se active este skill, se deben proporcionar:

```
- nombre_cliente: (si disponible, si no: "nombre desconocido")
- numero_cliente: (número desde el que llamó)
- hora_llamada: (hora exacta de la llamada perdida)
- motivo_probable: (si hay contexto previo: ITV, revisión, avería, presupuesto, etc. Si no hay contexto: "consulta general")
```

---

## Outputs que genera este skill

### Output 1 — Mensaje WhatsApp (máx. 3 frases)

**Plantilla base:**
> Hola [nombre_cliente], soy [NOMBRE_TALLER] en [CIUDAD]. Vi que nos llamaste a las [hora_llamada] y no pudimos atenderte, lo siento. ¿En qué podemos ayudarte? Puedes responder aquí o llamarnos ahora: [TELÉFONO].

**Variante si hay motivo probable (ej: ITV):**
> Hola [nombre_cliente], soy [NOMBRE_TALLER]. Vi que nos llamaste a las [hora_llamada], imagino que puede ser por la ITV o alguna revisión. Dime qué necesitas y te damos precio hoy mismo.

**Reglas de formato WhatsApp:**
- Sin saludos largos ("Estimado cliente…" → nunca)
- Sin firma corporativa
- Sin asteriscos ni negritas
- Máximo 3 frases
- Siempre termina con acción: "responde aquí" o "llámanos"

---

### Output 2 — Email de seguimiento (si hay email disponible)

**Asunto:** Te llamamos — [NOMBRE_TALLER]

**Cuerpo:**
> Hola [nombre_cliente],
>
> Te escribimos desde [NOMBRE_TALLER] porque nos dejaste una llamada perdida a las [hora_llamada] de hoy.
>
> Estamos aquí para ayudarte. Si necesitas [motivo_probable / revisión / presupuesto / cualquier consulta], cuéntanos y te respondemos hoy mismo.
>
> Puedes responder a este email o llamarnos directamente al [TELÉFONO].
>
> Un saludo,
> El equipo de [NOMBRE_TALLER]
> [DIRECCIÓN] · [TELÉFONO] · [WEB si existe]

**Reglas de formato email:**
- Asunto: corto, sin signos de exclamación
- Sin imágenes ni HTML complejo
- Sin frases como "esperamos su respuesta" o "no dude en contactarnos"
- Tono humano, como si lo escribiera el recepcionista del taller

---

### Output 3 — Nota interna para el equipo (opcional)

Si el sistema lo requiere, genera también una nota interna:

```
📞 LLAMADA PERDIDA
Cliente: [nombre_cliente] — [numero_cliente]
Hora: [hora_llamada]
Motivo probable: [motivo_probable]
Acción tomada: WhatsApp enviado a las [hora_envio]
Estado: Pendiente respuesta
```

---

## Lógica de decisión

| Situación | Acción |
|---|---|
| Hay nombre y número | WhatsApp personalizado con nombre |
| Solo número, sin nombre | WhatsApp genérico ("Hola, soy...") |
| Hay email además del número | WhatsApp + email de seguimiento |
| Hay contexto del motivo | Mensaje adaptado al motivo |
| Cliente ya tiene historial | Mencionar la última visita si es relevante |
| Llamada fuera de horario | Añadir: "Te escribimos porque nos llamaste fuera de horario, mañana a primera hora te atendemos." |

---

## Errores que nunca debe cometer este skill

- ❌ Inventar precios o disponibilidad sin confirmar
- ❌ Prometer tiempos de entrega sin datos reales
- ❌ Usar lenguaje demasiado formal ("Estimado/a Sr./Sra.")
- ❌ Mensajes de más de 4 frases en WhatsApp
- ❌ Enviar el mismo mensaje dos veces al mismo número en menos de 24h
- ❌ Mencionar competidores

---

## Ejemplo de ejecución completa

**Entrada:**
```
nombre_cliente: María
numero_cliente: +34 612 345 678
hora_llamada: 11:42
motivo_probable: presupuesto frenos
```

**WhatsApp generado:**
> Hola María, soy Taller Martínez en Alcobendas. Vi que nos llamaste a las 11:42 y no pudimos cogerte, perdona. Si es por los frenos dinos el modelo del coche y te pasamos precio hoy mismo. Puedes responder aquí o llamarnos al 91 XXX XX XX.

**Email generado:**
> Asunto: Te llamamos — Taller Martínez
>
> Hola María,
>
> Te escribimos desde Taller Martínez porque nos dejaste una llamada a las 11:42 de hoy.
>
> Si necesitas presupuesto para los frenos, dinos la marca y modelo de tu coche y te respondemos antes de las 18h.
>
> Puedes responder aquí o llamarnos al 91 XXX XX XX.
>
> Un saludo,
> El equipo de Taller Martínez
> Calle Ejemplo 12, Alcobendas · 91 XXX XX XX

---

## Cómo activar este skill en una routine

Este skill se activa mediante:

1. **Webhook entrante** desde el sistema de telefonía (cuando una llamada queda sin responder)
2. **Trigger manual** desde el CRM o panel del taller
3. **Llamada a API** con los datos del cliente

Parámetros mínimos requeridos en el trigger:
```json
{
  "nombre_cliente": "string o null",
  "numero_cliente": "string (formato E.164)",
  "hora_llamada": "string HH:MM",
  "motivo_probable": "string o null"
}
```

---

## Notas de mantenimiento

- Revisar tono mensualmente según feedback del dueño
- Actualizar especialidades si el taller añade servicios nuevos
- Ajustar horarios si cambian temporadas (agosto, festivos)
- Añadir variantes estacionales (ITV en enero/julio, revisión verano)

*Versión: 1.0 — Creado para [NOMBRE_TALLER] — [FECHA]*
