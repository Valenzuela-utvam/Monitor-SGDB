import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, engine } = await req.json();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: `Eres Glitch, un asistente técnico experto en bases de datos.
El usuario está utilizando el motor: ${engine}.
Responde de manera directa, corta y con la sintaxis exacta que necesita.
No uses saludos largos. Si das código SQL, ponlo en bloques de código.`
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ success: false, error: `Error Groq: ${data.error?.message || 'Error desconocido'}` }, { status: 500 });
    }

    const reply = data.choices?.[0]?.message?.content || '';
    return NextResponse.json({ success: true, reply });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
