/**
 * Guardarraíles de la ruta de API.
 *
 * Una URL pública conectada a una API de pago es una factura abierta. Estas dos
 * defensas son el mínimo honesto para un MVP:
 *
 *  - Código de acceso opcional: si ACCESS_CODE está definido, nadie conversa sin él.
 *  - Límite de mensajes por hora y por visitante.
 *
 * LIMITACIÓN CONOCIDA, documentada a propósito: el contador vive en la memoria
 * del proceso. En Vercel cada función serverless puede arrancar en frío y en una
 * instancia distinta, así que el límite es orientativo, no una garantía. Para
 * producción real hace falta un almacén compartido (Vercel KV, Upstash Redis o
 * equivalente). Se deja así a propósito para no meter una dependencia externa en
 * el MVP, y queda registrado en la memoria técnica como deuda consciente.
 */

type Ventana = { conteo: number; reinicioEn: number };

const ventanas = new Map<string, Ventana>();
const UNA_HORA = 60 * 60 * 1000;

export function limitePorHora(): number {
  const bruto = Number(process.env.RATE_LIMIT_PER_HOUR);
  return Number.isFinite(bruto) && bruto > 0 ? bruto : 40;
}

export function identificarVisitante(req: Request): string {
  const cabecera =
    req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "";
  return cabecera.split(",")[0]?.trim() || "anonimo";
}

export function excedeLimite(id: string): boolean {
  const ahora = Date.now();
  const limite = limitePorHora();
  const actual = ventanas.get(id);

  if (!actual || ahora > actual.reinicioEn) {
    ventanas.set(id, { conteo: 1, reinicioEn: ahora + UNA_HORA });
    return false;
  }

  actual.conteo += 1;
  return actual.conteo > limite;
}

export function accesoPermitido(req: Request): boolean {
  const esperado = process.env.ACCESS_CODE;
  if (!esperado) return true;
  return req.headers.get("x-access-code") === esperado;
}

export function modoDemo(): boolean {
  return !process.env.ANTHROPIC_API_KEY;
}
