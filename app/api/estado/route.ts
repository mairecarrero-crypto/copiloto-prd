import { modoDemo } from "@/lib/guard";

export const runtime = "nodejs";

/**
 * La interfaz necesita saber en qué modo está corriendo el servidor para avisar
 * a la persona con honestidad, sin revelar nada sensible: solo si hay clave
 * configurada y si se exige código de acceso. Nunca el valor de ninguna de las dos.
 */
export async function GET() {
  return Response.json({
    demo: modoDemo(),
    requiereCodigo: Boolean(process.env.ACCESS_CODE),
  });
}
