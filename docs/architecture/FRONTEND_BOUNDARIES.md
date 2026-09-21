# FRONTEND_BOUNDARIES.md — Fronteras del Frontend (arquitectura productiva Pymapa)

> Introducido en **M1-A · Repository Boundary Introduction**.
> Estas reglas aplican a la transición hacia la arquitectura productiva
> (Application API + Knowledge Engine). El MVP Alfa actual sigue funcionando
> intacto; este documento fija a qué se atiene cualquier código nuevo.

## Principio

El frontend es una capa de **presentación e interacción**. Toda decisión
diagnóstica y todo conocimiento gobernado vive del lado del servidor
(Knowledge Engine / Application API) o en el catálogo gobernado
(`knowledge/catalog/`). El frontend **consume** resultados; nunca los **produce**.

## El frontend PUEDE

1. **Renderizar estado** recibido del servidor (p. ej. `AssessmentStateDTO`).
2. **Recoger respuestas** del usuario y enviarlas como comandos
   (p. ej. `SubmitResponseCommand`).
3. **Consumir contratos/API** definidos en `packages/contracts`.
4. **Mostrar findings** producidos por el servidor, tal como llegan.
5. **Mostrar progreso** (avance, completitud) a partir del estado recibido.

## El frontend NO PUEDE

1. **Determinar capability state** (estado de una capacidad).
2. **Calcular sufficiency** (suficiencia de evidencia).
3. **Calcular confidence** (confianza del diagnóstico).
4. **Producir findings** (hallazgos).
5. **Ejecutar Knowledge Rules** (reglas de conocimiento).
6. **Asignar priority** (priorización de capacidades o adquisiciones).
7. **Modificar Master Knowledge** (`knowledge/catalog/*` es de solo lectura
   para la aplicación; su gobierno es editorial y externo al frontend).

## Paquetes relacionados

- `packages/contracts` — DTOs, comandos y tipos puros compartidos.
  Prohibido incluir ahí lógica diagnóstica, reglas, scoring o acceso a datos.
- `knowledge/catalog` — catálogo gobernado de dominios y capacidades.
  Ningún ítem se publica sin contenido editorial aprobado.

## Nota sobre el MVP Alfa vigente

El motor actual (`src/lib/motor`) y las reglas diagnósticas existentes son la
implementación del MVP Alfa y **permanecen sin cambios** durante esta etapa.
La migración de esas responsabilidades hacia el lado del servidor se hará de
forma incremental y gobernada en etapas posteriores; hasta entonces, este
documento no exige reescribir código existente, solo acotar el código nuevo.
