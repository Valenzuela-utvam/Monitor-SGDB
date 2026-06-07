import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { prompt, engine } = await req.json();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Eres Glitch, un asistente técnico experto en bases de datos.
      El usuario está utilizando el motor: ${engine}.
      Responde a la siguiente consulta o petición de manera directa, corta y con la sintaxis exacta que necesita.
      No uses saludos largos.

      Consulta del usuario: "${prompt}"`,
    });

    return NextResponse.json({ success: true, reply: response.text });
  } catch (error: any) {
    if (error.message && (error.message.includes('503') || error.message.includes('UNAVAILABLE'))) {
      return NextResponse.json({ success: false, error: "Glitch (Gemini) está experimentando alta demanda global (Error 503). Por favor, intenta preguntar de nuevo en unos segundos." }, { status: 503 });
    }
    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota'))) {
      return NextResponse.json({ success: false, error: "Se ha excedido la cuota gratuita de la API de Gemini (Error 429). Por favor, espera un minuto antes de volver a intentar." }, { status: 429 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
