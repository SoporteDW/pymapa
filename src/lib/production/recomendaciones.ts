/** MVP-BETA-INT-01 · Una recomendación es gobernada solo con título, contenido y vínculo gobernado. */
export function esRecomendacionGobernada(r: { title: string | null; mappingStatus: string; contentStatus: string }): boolean {
  return Boolean(r.title) && r.mappingStatus !== "NOT_GOVERNED" && !r.contentStatus.startsWith("NOT_EXPLICIT");
}
