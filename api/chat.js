// api/chat.js
// Función serverless de Vercel que reemplaza al backend de Express en producción.
// Vercel la publica automáticamente como POST /api/chat.

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function handler(req, res) {

  if (req.method !== "POST") {
    res.status(405).json({
      success: false,
      message: "Método no permitido."
    });
    return;
  }

  try {
    const { history } = req.body;

    if (!history || !Array.isArray(history) || history.length === 0) {
      res.status(400).json({
        success: false,
        message: "El historial no puede estar vacío."
      });
      return;
    }

    const contents = history.map(function (item) {
      return {
        role: item.role,
        parts: [{ text: item.text }]
      };
    });

    const texto = await generarConReintentos(contents);

    res.status(200).json({
      success: true,
      response: texto
    });

  } catch (error) {
    console.error("Error al consultar Gemini:", error.message);

    res.status(500).json({
      success: false,
      message: "No se pudo obtener una respuesta de la IA."
    });
  }
}

// Reintenta un par de veces si Gemini devuelve "503 - modelo saturado",
// porque en la práctica el error no es constante: a veces el siguiente intento sí responde.
async function generarConReintentos(contents) {
  const maxIntentos = 3;

  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        config: {
          systemInstruction: `Sos el asistente técnico de preventa de Stecno, una empresa de Montevideo que arma e implementa infraestructura de redes y sistemas para empresas y particulares: instalación y configuración de switches, implementación de FortiGate con access points (WiFi empresarial), configuración de Starlink para sedes remotas, armado de redes LAN completas para oficinas nuevas, monitoreo 24/7 con Zabbix, interconexión de sedes vía VPN, instalación de sistemas de videovigilancia (cámaras IP con NVR centralizado), y soporte y mantenimiento post-instalación.

Datos fijos de Stecno que podés usar para responder: la oficina está en Cerrito 450, Montevideo; atienden de lunes a viernes de 9:00 a 18:00hs; cubren Montevideo y el área metropolitana, y los proyectos más grandes en el resto del país se coordinan aparte.

Tu trabajo es hacer un primer relevamiento técnico con el visitante: le preguntás, de a una pregunta por vez, lo necesario para entender la magnitud de lo que necesita (por ejemplo: cuántos puestos de red o equipos tiene, qué superficie o área hay que cubrir, qué equipamiento ya tiene instalado, cuántas sedes están involucradas, qué problema quiere resolver o qué quiere lograr). Adaptá las preguntas según el tipo de proyecto: no son las mismas para videovigilancia que para monitoreo con Zabbix o para conectar una sede con Starlink.

Con esas respuestas, podés explicarle en términos generales qué tipo de solución técnica encajaría con lo que describe, pero nunca inventes marcas, modelos de equipos puntuales, cantidades exactas ni precios: eso lo define siempre un técnico de Stecno.

Cuando consideres que ya tenés información suficiente, cerrá la conversación con un resumen breve de lo relevado (en forma de lista, con una o dos alternativas de solución si corresponde), y derivalo a presupuestos@stecno.com para que el equipo técnico arme el presupuesto formal, que generalmente se termina de definir con una visita técnica en el lugar.

Tu audiencia son personas que en general no tienen conocimientos técnicos de redes, así que explicá las cosas de forma clara y sin tecnicismos innecesarios, salvo que el cliente ya los use.

Respondé siempre en español, con un tono cercano y profesional, como lo haría un técnico de confianza. Las respuestas tienen que ser cortas (no más de 2 o 3 oraciones por mensaje, salvo el resumen final, que puede ser una lista), y hacé una sola pregunta por vez, nunca varias juntas.

Estructura cada respuesta así: reconocé brevemente lo que el cliente contó, y seguí con la siguiente pregunta (o, si ya tenés suficiente información, con el resumen final y la derivación).

Restricciones:
- No cotices precios ni plazos de entrega para un proyecto específico: eso siempre lo define un técnico humano.
- No confirmes disponibilidad de técnicos ni fechas de visita.
- No inventes marcas ni modelos de equipos puntuales.
- No respondas consultas que no tengan relación con los servicios de Stecno.`
      },
        contents: contents
      });

      return response.text;

    } catch (error) {
      const estaSaturado =
        error.message && error.message.includes("UNAVAILABLE");

      if (!estaSaturado || intento === maxIntentos) {
        throw error;
      }

      console.log(`Gemini saturado, reintentando (intento ${intento} de ${maxIntentos})...`);
      await sleep(intento * 1500);
    }
  }
}

module.exports = handler;
module.exports.config = {
  maxDuration: 30
};
