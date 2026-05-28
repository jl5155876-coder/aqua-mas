
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Helper para obtener la instancia de AI de forma segura.
 * Se instancia en cada llamada para asegurar que capture la API_KEY inyectada.
 */
const getAI = () => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const apiKey = process.env.API_KEY;
  const key = geminiKey || apiKey;
  
  if (!key) {
    console.error("CRITICAL: Gemini API Key not found. Please check your environment variables (GEMINI_API_KEY or API_KEY).");
  } else {
    console.log("Gemini API Key found and initialized.");
  }
  return new GoogleGenAI({ apiKey: key || '' });
};

export async function processVoiceCommand(command: string) {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      console.error("Gemini API Key missing for processVoiceCommand");
      return { action: 'ERROR', summary: 'Error de configuración: API Key de Gemini no encontrada.' };
    }
    console.log("Processing voice command with Gemini...");
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
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      console.error("Gemini API Key missing for optimizeRoute");
      return { orderedIds: orders.map(o => o.id), explanation: "Error de configuración: API Key no encontrada." };
    }
    console.log(`Optimizing ${orders.length} orders via Gemini...`);
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Optimiza esta lista de pedidos basándote en la eficiencia logística y proximidad de direcciones. 
      Pedidos (incluyen dirección del cliente): ${JSON.stringify(orders)}`,
      config: {
        systemInstruction: "Eres un despachador experto en logística urbana. Reordena los pedidos para minimizar el tiempo de viaje basándote en las direcciones proporcionadas. Si no hay direcciones claras, usa la lógica de prioridad. Devuelve un JSON con el campo 'orderedIds' que sea un arreglo de los IDs en el orden óptimo.",
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
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      return "Error de configuración: API Key no encontrada.";
    }
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
