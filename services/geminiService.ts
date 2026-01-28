
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Helper para obtener la instancia de AI de forma segura.
 * Se instancia en cada llamada para asegurar que capture la API_KEY inyectada.
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function processVoiceCommand(command: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Procesa el siguiente comando de voz para una purificadora de agua y devuelve un JSON estructurado. 
      Comando: "${command}"`,
      config: {
        systemInstruction: "Eres un asistente de ERP. Interpreta intenciones de venta o consulta. Ejemplo: 'Vendí 3 garrafones a Juan' -> {action: 'SALE', quantity: 3, item: 'garrafon', customer: 'Juan'}",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: "SALE, QUERY, or LOG" },
            quantity: { type: Type.NUMBER },
            item: { type: Type.STRING },
            customer: { type: Type.STRING },
            summary: { type: Type.STRING, description: "Resumen amigable de la acción" }
          },
          required: ["action", "summary"]
        }
      },
    });

    const text = response.text || '{"action": "ERROR", "summary": "La IA no devolvió contenido."}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return { action: 'ERROR', summary: 'No pude entender el comando. Intenta de nuevo.' };
  }
}

export async function optimizeRoute(orders: any[]) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Optimiza esta lista de pedidos basándote en la eficiencia logística. 
      Pedidos: ${JSON.stringify(orders)}`,
      config: {
        systemInstruction: "Eres un despachador experto. Reordena los pedidos para minimizar el tiempo de viaje. Devuelve un JSON con el campo 'orderedIds' que sea un arreglo de los IDs en el orden óptimo.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            orderedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            explanation: { type: Type.STRING }
          },
          required: ["orderedIds"]
        }
      }
    });
    
    const text = response.text || '{"orderedIds": [], "explanation": "Sin respuesta de la IA"}';
    return JSON.parse(text);
  } catch (error) {
    return { orderedIds: orders.map(o => o.id), explanation: "Orden cronológico (Falla de IA)" };
  }
}

export async function getBusinessInsights(salesData: any[]) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza estos datos de ventas de Aqua+ Fundadores y dame 3 consejos clave: ${JSON.stringify(salesData)}`,
      config: {
        systemInstruction: "Eres un consultor experto en negocios de purificación de agua. Sé breve y motivador.",
      }
    });
    return response.text || "No hay suficientes datos para generar insights hoy.";
  } catch (error) {
    return "No hay suficientes datos para generar insights hoy.";
  }
}
