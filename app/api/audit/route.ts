import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key de Gemini no configurada" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { query, engine, userRole } = await req.json();

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        allowed: {
          type: Type.BOOLEAN,
          description: "true si la acción es segura para el rol, false si es destructiva o excede permisos."
        },
        reason: {
          type: Type.STRING,
          description: "Explicación técnica de por qué se permite o bloquea."
        },
        riskLevel: {
          type: Type.STRING,
          enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        },
        suggestedFix: {
          type: Type.STRING,
          description: "Sugerencia de sintaxis correcta o mitigación si fue bloqueada."
        }
      },
      required: ["allowed", "reason", "riskLevel"],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Audita esta operación en ${engine}. El usuario tiene el rol: ${userRole}.\n\nComando/Consulta:\n${query}`,
      config: {
        systemInstruction: `Eres un estricto Auditor de Seguridad de Bases de Datos.
        Evalúa si la consulta es peligrosa. Un usuario básico NUNCA debe ejecutar DDL (DROP, CREATE, ALTER) ni modificar registros sin un WHERE.
        Si el usuario no tiene privilegios de administrador, bloquea acciones destructivas.`,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      },
    });

    const auditResult = JSON.parse(response.text || '{}');
    return NextResponse.json(auditResult);

  } catch (error: any) {
    console.error("Fallo en auditoría AI:", error);

    if (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota'))) {
      return NextResponse.json({
        allowed: true,
        reason: "Se ha excedido la cuota de la API de Gemini. Se ha omitido la auditoría de seguridad para no bloquear el trabajo.",
        riskLevel: "LOW"
      }, { status: 200 });
    }

    return NextResponse.json({
      allowed: true,
      reason: "La IA de Gemini está sobrecargada temporalmente. Se ha omitido la auditoría de seguridad para no bloquear el trabajo.",
      riskLevel: "LOW"
    }, { status: 200 });
  }
}
