import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { respuestaDemo } from "@/lib/demo";
import {
  accesoPermitido,
  excedeLimite,
  identificarVisitante,
  limitePorHora,
  modoDemo,
} from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

type Mensaje = { role: "user" | "assistant"; content: string };

/**
 * La clave de la API vive SOLO aquí, en el servidor.
 *
 * El navegador nunca la ve. Esta es la razón principal por la que este proyecto
 * es una aplicación Next.js con rutas de servidor y no una página estática: una
 * página estática solo puede llamar al modelo desde el navegador, y eso obliga a
 * exponer la clave a cualquiera que abra las herramientas de desarrollo.
 */
function cliente() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function textoPlano(cuerpo: string, estado: number) {
  return new Response(cuerpo, {
    status: estado,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function streamDeTexto(texto: string): Response {
  // Se emite por trozos para que el modo demo se comporte igual que el real:
  // misma tubería, misma sensación de escritura progresiva.
  const codificador = new TextEncoder();
  const trozos = texto.match(/[\s\S]{1,18}/g) ?? [texto];

  const stream = new ReadableStream({
    async start(controlador) {
      for (const trozo of trozos) {
        controlador.enqueue(codificador.encode(trozo));
        await new Promise((r) => setTimeout(r, 18));
      }
      controlador.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  if (!accesoPermitido(req)) {
    return textoPlano("Código de acceso incorrecto.", 401);
  }

  if (excedeLimite(identificarVisitante(req))) {
    return textoPlano(
      `Has alcanzado el límite de ${limitePorHora()} mensajes por hora. Vuelve a intentarlo más tarde.`,
      429
    );
  }

  let mensajes: Mensaje[] = [];
  try {
    const cuerpo = await req.json();
    mensajes = Array.isArray(cuerpo?.messages) ? cuerpo.messages : [];
  } catch {
    return textoPlano("No pude leer la petición.", 400);
  }

  if (modoDemo()) {
    const turnos = mensajes.filter((m) => m.role === "user").length;
    return streamDeTexto(respuestaDemo(Math.max(0, turnos - 1)));
  }

  try {
    const anthropic = cliente();
    const flujo = anthropic.messages.stream({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: mensajes.map((m) => ({ role: m.role, content: m.content })),
    });

    const codificador = new TextEncoder();
    const stream = new ReadableStream({
      async start(controlador) {
        try {
          for await (const evento of flujo) {
            if (
              evento.type === "content_block_delta" &&
              evento.delta.type === "text_delta"
            ) {
              controlador.enqueue(codificador.encode(evento.delta.text));
            }
          }
        } catch (error) {
          const detalle =
            error instanceof Error ? error.message : "error desconocido";
          controlador.enqueue(
            codificador.encode(`\n\n[Se interrumpió la respuesta: ${detalle}]`)
          );
        } finally {
          controlador.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "error desconocido";
    return textoPlano(`No pude contactar al modelo. Detalle: ${detalle}`, 502);
  }
}
