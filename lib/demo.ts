/**
 * Modo demo.
 *
 * Existe por una razón muy concreta: la aplicación depende de un modelo de pago
 * al que no se puede llamar durante el desarrollo sin exponer la clave ni gastar
 * crédito. El modo demo recorre exactamente la misma tubería que el modo real
 * —misma ruta de API, mismo stream, mismo marcador de progreso, misma
 * exportación— pero con respuestas escritas a mano.
 *
 * Así se prueba el 100% de la interfaz sin una sola llamada a la API, y la
 * aplicación nunca se cae si falta la variable de entorno: se degrada con un
 * aviso visible en lugar de mostrar una pantalla de error.
 */

const GUION: string[] = [
  `Hola. Soy tu copiloto de producto: te voy a hacer preguntas cortas, una a la vez y sin tecnicismos, hasta que entre los dos tengamos un PRD —un documento que describe qué hay que construir y por qué— lo bastante claro como para empezar a trabajar mañana.

Cuéntame en tus palabras: ¿qué quieres crear y qué problema le resolvería a quién?

[[BLOQUE: 1/12 - La idea en una frase]]`,

  `Buena base. Voy a ponerlo en una frase para comprobar que te entendí: quieres una herramienta que le ahorre a alguien un trabajo repetitivo que hoy hace a mano.

Para aterrizarlo: esa persona, hoy, ¿cómo lo resuelve? ¿Se parece más a (a) llenar una plantilla en Word o Excel, (b) pedírselo a alguien del equipo por mensaje, o (c) simplemente no lo hace y por eso el problema se acumula?

[[BLOQUE: 3/12 - El problema]]`,

  `Clarísimo, y es justo el tipo de problema que se resuelve bien con IA: hay mucho texto desordenado y poca estructura.

Ahora el usuario. ¿Quién abriría esto un martes a las 9 de la mañana: la misma persona que sufre el problema, o alguien que se lo pasa ya resuelto a otro?

[[BLOQUE: 4/12 - El usuario]]`,

  `Perfecto, entonces quien sufre el problema es quien usa la herramienta. Eso simplifica mucho la primera versión: no hay que construir roles ni permisos.

Pensando en la primera versión: si tuvieras que quedarte con UNA sola cosa que la herramienta hace —y sin la cual no sirve para nada—, ¿cuál sería?

[[BLOQUE: 9/12 - Alcance del MVP]]`,

  `Anotado como el corazón del MVP. Todo lo demás pasa a "más adelante".

Última de este bloque y cerramos: dentro de 90 días, ¿qué número tendría que haberse movido para que digas "esto valió la pena"? Si no lo tienes claro te propongo uno: que 10 personas distintas lo usen de principio a fin al menos una vez.

[[BLOQUE: 10/12 - Éxito]]`,

  `Listo. Con esto ya puedo escribirte un PRD completo: tengo problema, usuario, alcance mínimo y una métrica con meta.

Antes de generarlo: ¿hay algo importante que no te he preguntado y que debería saber?

[[BLOQUE: 12/12 - Restricciones prácticas]]`,
];

const CIERRE = `Ya cubrimos los bloques principales. Pulsa "Generar PRD" cuando quieras el documento, o cuéntame cualquier otra cosa que quieras dejar registrada.

[[BLOQUE: 12/12 - Restricciones prácticas]]`;

export function respuestaDemo(turnosDelUsuario: number): string {
  return GUION[turnosDelUsuario] ?? CIERRE;
}

export const PRD_DEMO = `# PRD — Producto de ejemplo (modo demo)

> **Este documento es una muestra.** La aplicación está corriendo en modo demo
> porque no hay una clave de API configurada. Con la clave puesta, este mismo
> botón genera un PRD real a partir de tu conversación.

## 1. Resumen ejecutivo
Herramienta web que convierte una conversación desordenada en un documento de
requisitos estructurado, para que una persona sin formación técnica pueda pedirle
a un equipo —o a un modelo de IA— que construya su idea sin perder información
por el camino.

## 2. Problema y oportunidad
Hoy el problema se resuelve a mano, con notas sueltas y plantillas que nadie
llena completas. El resultado es que se empieza a construir sobre supuestos no
escritos y se descubre el malentendido tarde, cuando corregirlo ya cuesta dinero.

## 3. Usuario objetivo
Persona con una idea de producto y sin lenguaje técnico. Es la misma que sufre el
problema y la misma que usaría la herramienta. **TBD:** si también es quien paga.

## 4. Propuesta de valor
Pasar de "tengo una idea en la cabeza" a "tengo un documento que alguien puede
ejecutar" en una sola sesión de treinta minutos.

## 5. Casos de uso principales

| Actor | Disparador | Pasos | Resultado |
|---|---|---|---|
| Fundadora sin equipo técnico | Quiere cotizar el desarrollo de su idea | Conversa, responde preguntas, genera el PRD | Documento en Markdown descargable |
| Product manager junior | Le piden un PRD para el lunes | Vuelca lo que sabe, marca los TBD | Borrador estructurado con huecos señalados |

## 6. Recorrido del usuario
**Camino feliz:** abre la web, lee la pregunta de apertura, responde entre 8 y 15
turnos, pulsa "Generar PRD" y descarga el archivo.
**Cuando falla:** si el modelo no responde, la aplicación muestra el error real y
conserva la conversación, de modo que reintentar no pierde nada de lo escrito.

## 7. Qué hace la IA
**Recibe:** el historial completo de la conversación.
**Produce:** la siguiente pregunta, y al final el documento completo.
**No debe:** inventar datos que la persona no dijo, dar consejo legal, médico o
financiero, ni cerrar el documento sin marcar los huecos como TBD.

## 8. Construibilidad con Claude
**Con Claude:** la entrevista, la síntesis y la redacción del documento.
**Requiere conexiones adicionales:** guardar conversaciones entre sesiones (base
de datos), cuentas de usuario (autenticación), y exportar a PDF con marca propia.

## 9. Alcance del MVP

| Prioridad | Función | Esfuerzo |
|---|---|---|
| Must | Entrevista conversacional guiada | Medio |
| Must | Generación y descarga del PRD | Rápido |
| Should | Indicador de avance por bloques | Rápido |
| Could | Guardar y retomar la conversación | Medio |
| No por ahora | Cuentas de usuario y equipos | Grande |

## 10. Cómo se construye

\`\`\`mermaid
flowchart LR
  A[Persona] --> B[Interfaz web]
  B --> C[Servidor]
  C --> D[Modelo de Claude]
  D --> C
  C --> B
  B --> E[PRD descargable]
\`\`\`

La persona escribe en una página web. Esa página no habla directamente con el
modelo: le pasa el mensaje a un servidor propio, que es quien guarda la clave y
llama a Claude. La respuesta vuelve por el mismo camino. La clave nunca viaja al
navegador.

## 11. Métricas de éxito
**Métrica estrella:** conversaciones que terminan en un PRD descargado.
**Meta a 90 días:** 10 personas distintas completan el flujo al menos una vez.
**De apoyo:** turnos promedio hasta generar el PRD (meta: menos de 15) y
porcentaje de documentos con menos de 3 TBD (meta: 60%).

## 12. Riesgos y cómo evitarlos

| Riesgo | Probabilidad | Qué hacer |
|---|---|---|
| El costo por uso se dispara | Media | Límite de mensajes por visitante y código de acceso |
| La persona abandona a mitad | Alta | Acortar la entrevista y permitir generar el PRD en cualquier momento |
| El documento sale genérico | Media | Obligar a que cada requisito tenga número, tiempo o condición |

## 13. Plan 30 / 60 / 90 días
**30:** MVP publicado y probado con 3 personas reales.
**60:** guardar conversaciones y exportar a PDF.
**90:** cuentas de usuario y plantillas por tipo de producto.

## 14. Primeros pasos con Claude
1. Pedirle a Claude que refine el prompt del copiloto con tres conversaciones reales.
2. Probar la entrevista con alguien que no conozca el proyecto y cronometrarla.
3. Revisar los PRD generados y contar cuántos TBD quedan sin resolver.
`;
