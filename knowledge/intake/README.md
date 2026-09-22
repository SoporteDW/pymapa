# knowledge/intake

Zona de entrada de la Knowledge Factory para fuentes históricas aún no canónicas.

```
knowledge/intake/<CAP-ID>/
  registration.json          ← bun run knowledge:factory -- register --capability <ID> --domain <DOM> --file <docx|pdf|txt> [--marker "<texto literal>"]
  original/<archivo>         ← original inmutable (SHA-256 en registration.json)
  text/<archivo>.txt         ← texto extraído determinista (citable por línea; NO es conocimiento)
  candidate.json             ← candidato de extracción (herramienta, humano o IA: siempre CANDIDATE)
  canonical-acceptance.json  ← decisión humana ligada al checksum exacto del candidato
```

`bun run knowledge:factory -- promote --capability <ID>` materializa la baseline canónica en
`knowledge/master/<v>/capabilities/<ID>/` solo con aceptación `ACCEPTED` vigente.

Vacío en M2-FACTORY-01: no se ingesta ninguna fuente nueva.
