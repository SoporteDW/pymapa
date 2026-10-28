import type { DocumentoExtraido, FragmentoDocumento } from "@/lib/document-first/pdf-texto";

export const VERSION_EXTRACCION_EXPEDIENTE = "mvp31-context-1.1.0";

/** Contexto contiguo, de la misma página/sección. Nunca concatena documentos ni páginas. */
export function fragmentosConContexto(doc: DocumentoExtraido): FragmentoDocumento[] {
  const salida = [...doc.fragmentos];
  for (let i = 0; i < doc.fragmentos.length; i++) {
    const primero = doc.fragmentos[i];
    if (!primero) continue;
    let texto = primero.texto;
    for (let n = 1; n <= 2; n++) {
      const siguiente = doc.fragmentos[i + n];
      if (!siguiente || siguiente.pagina !== primero.pagina || siguiente.seccion !== primero.seccion) break;
      texto += ` ${siguiente.texto}`;
      if (texto.length > 900) break;
      // El contexto tiene que seguir siendo una cita literal de la página extraída.
      if (!doc.textoPorPagina[primero.pagina]?.includes(texto)) continue;
      salida.push({ ...primero, id: `${primero.id}-ctx${n + 1}`, texto });
    }
  }
  return salida;
}