"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BLOQUES, MARCADOR, TOTAL_BLOQUES } from "@/lib/prompt";

type Turno = {
  role: "user" | "assistant";
  content: string;
  visible: boolean;
};

const SEMILLA = "Empecemos.";

/** Quita el marcador de progreso del texto que ve la persona. */
function limpiar(texto: string): string {
  return texto.replace(MARCADOR, "").trimEnd();
}

/** Lee el último marcador presente en el texto y devuelve el número de bloque. */
function leerBloque(texto: string): number | null {
  const encontrados = Array.from(texto.matchAll(new RegExp(MARCADOR)));
  const ultimo = encontrados[encontrados.length - 1];
  if (!ultimo) return null;
  const n = Number(ultimo[1]);
  return Number.isFinite(n) && n >= 1 && n <= TOTAL_BLOQUES ? n : null;
}

export default function Pagina() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [entrada, setEntrada] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bloque, setBloque] = useState(1);
  const [prd, setPrd] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [demo, setDemo] = useState(false);
  const [requiereCodigo, setRequiereCodigo] = useState(false);
  const [codigo, setCodigo] = useState("");
  const arranco = useRef(false);
  const finRef = useRef<HTMLDivElement | null>(null);

  const cabeceras = useCallback((): HeadersInit => {
    const base: Record<string, string> = { "Content-Type": "application/json" };
    if (codigo) base["x-access-code"] = codigo;
    return base;
  }, [codigo]);

  /** Envía el historial al servidor y va pintando la respuesta según llega. */
  const conversar = useCallback(
    async (historial: Turno[]) => {
      setOcupado(true);
      setError(null);
      setTurnos([...historial, { role: "assistant", content: "", visible: true }]);

      try {
        const respuesta = await fetch("/api/chat", {
          method: "POST",
          headers: cabeceras(),
          body: JSON.stringify({
            messages: historial.map((t) => ({
              role: t.role,
              content: t.content,
            })),
          }),
        });

        if (!respuesta.ok || !respuesta.body) {
          const detalle = await respuesta.text();
          throw new Error(detalle || `Error ${respuesta.status}`);
        }

        const lector = respuesta.body.getReader();
        const decodificador = new TextDecoder();
        let acumulado = "";

        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          acumulado += decodificador.decode(value, { stream: true });

          const n = leerBloque(acumulado);
          if (n) setBloque(n);

          const limpio = limpiar(acumulado);
          setTurnos([
            ...historial,
            { role: "assistant", content: limpio, visible: true },
          ]);
        }

        setTurnos([
          ...historial,
          { role: "assistant", content: limpiar(acumulado), visible: true },
        ]);
      } catch (e) {
        setTurnos(historial);
        setError(
          e instanceof Error
            ? e.message
            : "No pude contactar al servidor. Revisa tu conexión."
        );
      } finally {
        setOcupado(false);
      }
    },
    [cabeceras]
  );

  useEffect(() => {
    if (arranco.current) return;
    arranco.current = true;

    fetch("/api/estado")
      .then((r) => r.json())
      .then((d) => {
        setDemo(Boolean(d.demo));
        setRequiereCodigo(Boolean(d.requiereCodigo));
      })
      .catch(() => undefined);

    void conversar([{ role: "user", content: SEMILLA, visible: false }]);
  }, [conversar]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turnos]);

  function enviar() {
    const texto = entrada.trim();
    if (!texto || ocupado) return;
    setEntrada("");
    void conversar([...turnos, { role: "user", content: texto, visible: true }]);
  }

  async function generarPrd() {
    setGenerando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/prd", {
        method: "POST",
        headers: cabeceras(),
        body: JSON.stringify({
          messages: turnos.map((t) => ({ role: t.role, content: t.content })),
        }),
      });
      if (!respuesta.ok) throw new Error(await respuesta.text());
      const datos = await respuesta.json();
      setPrd(datos.prd);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pude generar el documento."
      );
    } finally {
      setGenerando(false);
    }
  }

  function descargar() {
    if (!prd) return;
    const blob = new Blob([prd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "prd.md";
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  }

  const visibles = turnos.filter((t) => t.visible);
  const turnosDePersona = turnos.filter(
    (t) => t.role === "user" && t.visible
  ).length;
  const porcentaje = Math.round((bloque / TOTAL_BLOQUES) * 100);

  return (
    <main className="pagina">
      <header className="encabezado">
        <h1 className="titulo">Copiloto PRD</h1>
        <p className="subtitulo">
          De una idea en la cabeza a un documento que alguien puede construir.
          Preguntas cortas, una a la vez, sin tecnicismos.
        </p>

        {demo && (
          <p className="aviso">
            <strong>Modo demostración.</strong> El servidor no tiene una clave de
            API configurada, así que las respuestas son un guion de ejemplo. Toda
            la aplicación funciona igual: misma conversación, mismo avance, misma
            descarga del documento.
          </p>
        )}

        {requiereCodigo && (
          <p className="aviso">
            Esta instancia pide un código de acceso para no consumir crédito de
            forma abierta.{" "}
            <input
              aria-label="Código de acceso"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="código"
              style={{ font: "inherit", padding: "2px 6px" }}
            />
          </p>
        )}

        <div className="progreso">
          <div className="progreso-etiqueta">
            <span>
              Bloque {bloque} de {TOTAL_BLOQUES}: {BLOQUES[bloque - 1]}
            </span>
            <span>{porcentaje}%</span>
          </div>
          <div
            className="progreso-barra"
            role="progressbar"
            aria-valuenow={porcentaje}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progreso-relleno" style={{ width: `${porcentaje}%` }} />
          </div>
        </div>
      </header>

      <section className="conversacion" aria-live="polite">
        {visibles.map((t, i) => (
          <div
            key={i}
            className={`burbuja ${t.role === "assistant" ? "copiloto" : "persona"}`}
          >
            <span className="autor">
              {t.role === "assistant" ? "Copiloto" : "Tú"}
            </span>
            {t.content || (ocupado ? "Pensando..." : "")}
          </div>
        ))}
        {error && <div className="error">{error}</div>}
        <div ref={finRef} />
      </section>

      <div className="compositor">
        <textarea
          className="campo"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="Escribe tu respuesta..."
          disabled={ocupado}
        />
        <div className="acciones">
          <button className="boton" onClick={enviar} disabled={ocupado || !entrada.trim()}>
            {ocupado ? "Escribiendo..." : "Enviar"}
          </button>
          <button
            className="boton secundario"
            onClick={generarPrd}
            disabled={generando || ocupado || turnosDePersona === 0}
          >
            {generando ? "Generando PRD..." : "Generar PRD"}
          </button>
          <span className="pista">Ctrl + Enter para enviar</span>
        </div>
      </div>

      <footer className="pie">
        Construido con Claude. La clave de la API vive solo en el servidor: nunca
        viaja al navegador.
      </footer>

      {prd && (
        <div className="panel" role="dialog" aria-label="PRD generado">
          <div className="panel-caja">
            <div className="panel-cabecera">
              <h2 className="panel-titulo">Tu PRD</h2>
              <div className="acciones">
                <button className="boton" onClick={descargar}>
                  Descargar .md
                </button>
                <button className="boton secundario" onClick={() => setPrd(null)}>
                  Cerrar
                </button>
              </div>
            </div>
            <div className="panel-cuerpo">
              <pre>{prd}</pre>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
