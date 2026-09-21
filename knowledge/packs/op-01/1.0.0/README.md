# Knowledge Pack OP-01 · versión 1.0.0

Fuente autoritativa: **PYMAPA-KNOWLEDGE-MASTER-v1.0 · BASELINE-APPROVED**,
paquete de extracción **AT-04 · KNOWLEDGE SOURCE PACKAGE — OP-01**.

## Reglas de gobierno

1. Este pack es **declarativo**. No contiene runtime ni código.
2. Todo su contenido es transcripción del material aprobado. Nada se completa
   por inferencia: lo no explícito se marca como
   `NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`.
3. Una versión publicada es **inmutable**. Cualquier cambio exige una nueva
   carpeta de versión (`1.0.1`, `1.1.0`, …) y un nuevo registro en
   `knowledge_versions`.
4. El conocimiento OP-01 **no puede** duplicarse en React, hooks, handlers de
   API ni en el runtime genérico.

## Alcance implementado (M1-D)

- Adquisición **OP01-P01** únicamente (nivel P1).
- P02–P15 permanecen declaradas como no implementadas en este pack.
- Reglas `R-OP01-01 … R-OP01-13` quedan registradas con clasificación
  `GOVERNED_JUDGMENT` y `implemented: false`: el runtime las transporta como
  juicio pendiente y **no** las ejecuta.
- Sufficiency, Confidence y severidad no tienen fórmula aprobada: se declaran
  como `NOT_EXPLICIT_IN_KNOWLEDGE_MASTER`.
- Los cuatro `KNOWLEDGE CHANGE CANDIDATE` (KCC-AT04-01…04) quedan registrados
  sin resolver.
