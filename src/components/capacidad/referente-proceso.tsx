/**
 * H01 · Presentación del referente de «este proceso». Muestra solo títulos
 * literales de secciones confirmadas por la persona; si no hay, pide aclarar.
 * Nunca reescribe la pregunta oficial ni infiere el proceso.
 */
export function ReferenteProceso({ texto, referentes }: { texto: string; referentes: string[] }) {
  if (!/\beste proceso\b/i.test(texto)) return null;
  return referentes.length > 0 ? (
    <p data-testid="referente-proceso" className="rounded-md border border-border bg-muted/40 p-2 text-sm">
      <span className="font-medium">«Este proceso» se refiere a: </span>
      {referentes.map((r) => `«${r}»`).join(", ")}
      <span className="block text-xs text-muted-foreground">Título literal de la sección de tus documentos que ya confirmaste. Si se trata de otro proceso, indícalo en tu respuesta.</span>
    </p>
  ) : (
    <p data-testid="referente-proceso-ausente" className="rounded-md border border-dashed border-border p-2 text-sm text-muted-foreground">
      Aún no sabemos a qué proceso de tu empresa se refiere esta pregunta. Empieza tu respuesta nombrando el proceso.
    </p>
  );
}
