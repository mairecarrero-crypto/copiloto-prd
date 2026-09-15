import Anthropic from "@anthropic-ai/sdk";
import { PRD_PROMPT, SYSTEM_PROMPT } from "@/lib/prompt";
import { PRD_DEMO } from "@/lib/demo";
import {
  accesoPermitido,
  excedeLimite,
  identificarVisitante,
  modoDemo,
} from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 120;

type Mensaje = { role: "user" | "assistant"; content: string };

/**
 * Generación del documento final.
 *
 * Se separa de la ruta de conversación a propósito: es otra tarea, con otro
 * límite de tokens y otra tolerancia a la latencia. Mezclarlas obligaría a
 * dimensionar las dos por la más exigente.
 */
export async function POST(req: Request) {
  if (!accesoPermitido(req)) {
    return new Response("Código de acceso incorrecto.", { status: 401 });
  }

  if (excedeLimite(identificarVisitante(req))) {
    return new Response("Límite de uso alcanzado. Intenta más tarde.", {
      status: 429,
    });
  }

  let mensajes: Mensaje[] = [];
  try {
    const cuerpo = await req.json();
    mensajes = Array.isArray(cuerpo?.messages) ? cuerpo.messages : [];
  } catch {
    return new Response("No pude leer la petición.", { status: 400 });
  }

  if (modoDemo()) {
    return Response.json({ prd: PRD_DEMO, demo: true });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const respuesta = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        ...mensajes.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: PRD_PROMPT },
      ],
    });

    const prd = respuesta.content
      .filter((bloque) => bloque.type === "text")
      .map((bloque) => (bloque.type === "text" ? bloque.text : ""))
      .join("\n")
      .trim();

    if (!prd) {
      return new Response("El modelo devolvió un documento vacío.", {
        status: 502,
      });
    }

    return Response.json({ prd, demo: false });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "error desconocido";
    return new Response(`No pude generar el PRD. Detalle: ${detalle}`, {
      status: 502,
    });
  }
}
