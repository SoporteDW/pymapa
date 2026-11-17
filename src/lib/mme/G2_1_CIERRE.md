# PYMAPA · G2.1 — Cierre técnico y preparación documental de G3

**Estado: G2.1 PASS técnico; G3 y GJ-01 NO INICIADOS.**

## Baseline y alcance

Punto de partida: `e4a9b43d0aba8b83aa73a36e0e34caac79c47e8b`, árbol limpio al inicio. El commit anterior sigue siendo la referencia de recuperación verificable; no se reescribió historia. La copia adicional mediante `git archive` fue rechazada por las restricciones del entorno, por lo que no se presenta un archivo de respaldo inexistente. Recuperación propuesta: revertir únicamente el commit G2.1 mediante un nuevo commit, previa autorización; no implica restaurar datos.

Cambios limitados al módulo MME y al seguimiento documental en `roadmap.md`. No se añadieron rutas, funciones remotas ni conexiones a servicios. No hubo operaciones de base de datos, migraciones, RLS, cambios de pantallas, publicación o despliegue. Master, 31 Knowledge Packs, captura, Engine 0.2.0 y Journey permanecen intactos. El registro de activación sigue vacío.

## Correcciones por archivo

| Archivo | Cambio |
|---|---|
| `evaluador.server.ts` | Control recursivo de números antes de firmar/verificar; versión numérica explícita; errores de firma seguros; rechazo de listas de evidencia de contradicción inválidas; eliminación de aserciones no nulas en los accesos afectados. |
| `datos/referencia-python/mme_dec062.py` | Mismo control de firma y rechazo de evidencias; normalización exclusivamente dentro de la serialización firmada de enteros representados como float. Ninguna fórmula modificada. |
| `mme-dec062.test.ts` | Eliminación de `@ts-nocheck` y de `any`; fixtures con contratos explícitos, guardas y tratamiento de campos opcionales. Conserva las 33 pruebas originales y la comprobación adicional de firmas. |
| `datos/referencia-python/test_g21.py` | Ocho pruebas Python de bordes y generador de fixtures desde Python. |
| `datos/referencia-python/g21-reference-results.json` | Fixture adicional, separado de la referencia original: firma numérica y seis validaciones/resultados completos de contradicciones. |
| `mme-g21.test.ts` | 17 pruebas TypeScript sobre firma, errores y equivalencia completa de los seis casos de contradicción. Sin supresiones de tipos. |
| `AGENTS.md` del módulo | Reglas técnicas de compatibilidad y rechazo seguro. |
| `roadmap.md` | Cierre G2.1 y separación explícita de G3/GJ-01. |
| `G2_1_CIERRE.md` | Este informe y propuesta no ejecutada de G3. |

## 1. Firma numérica y compatibilidad

Se elige **control explícito**, no reconstruir heurísticamente la representación perdida `1.0`/`1` después de parsear JSON.

- Firmas heredadas sin `signature_version`: conservan los mismos bytes HMAC para contenidos sin números JSON. Las firmas originales de atestación y N/A siguen coincidiendo exactamente con Python.
- Un número JSON en formato heredado se rechaza con `SIGNED_NUMBER_REQUIRES_V2`, tanto al emitir como al verificar. No se transforma silenciosamente ni se acepta una firma ambigua.
- La convención optativa `signature_version: "MME-SIGN/2.0.0"` admite únicamente enteros seguros, rango −9007199254740991 a +9007199254740991. Python serializa `1.0` como `1` y `-0.0` como `0`; TypeScript produce los mismos bytes. La versión forma parte del contenido firmado.
- Fracciones, NaN, infinito y números fuera del rango se rechazan con `SIGNED_NUMBER_NOT_SAFE_INTEGER`. Mediciones decimales deben ser cadenas explícitas, por ejemplo `"1.25"`; no se convierten automáticamente. La lectura matemática ya existente sigue admitiendo esas cadenas.
- Versiones desconocidas se rechazan con `UNSUPPORTED_SIGNATURE_VERSION`. La versión del motor, pesos, umbrales y fórmulas no cambian.
- Compatibilidad acotada: no se afirma compatibilidad de firmas numéricas históricas no versionadas; quedan rechazadas deliberadamente, pues su representación no es recuperable de manera fiable. En G1–G2 no se integró persistencia ni emisión productiva; no se consultaron ni modificaron atestaciones empresariales. Si existieran firmas numéricas externas heredadas, su admisión exigiría conservar los bytes originales y un mecanismo autorizado de verificación/migración; no se implementó aquí.

## 2. Evidencias nulas en contradicciones

`conflict_resolution.evidence_refs = null`, lista vacía, cadena, objeto o miembros no textuales/vacíos son rechazados expresamente con `CONFLICT_EVIDENCE_REFS_INVALID`. Python ya no falla intentando iterar null; TypeScript ya no lo sustituye por `[]`. Se mantiene el error de procedencia incompleta cuando corresponde.

El evaluador devuelve `REVIEW_REQUIRED`, nivel nulo y check no acreditado; no concede PASS ni evidencia válida. El control con `["e1"]` conserva el comportamiento válido. Las seis salidas completas y errores coinciden con Python. La validación de evidencias principales y N/A sigue rechazando null mediante sus errores existentes.

## 3. Pruebas y tipos

| Verificación | Resultado |
|---|---|
| Python originales DEC-062/06B | **33/33 PASS** |
| Regeneración temporal desde Python contra referencia original | **Identidad byte a byte**, sin sobrescribir referencia original |
| Python G2.1 | **8/8 PASS** |
| TypeScript MME completo | **57/57 PASS**: 33 originales + 1 firma original + 6 contratos + 17 bordes |
| Regresión completa | **1429/1429 PASS**, 83 archivos, 144,93 s |
| `tsgo --noEmit` y comprobación final `tsgo -b --noEmit` | **PASS**, salida vacía, código 0; configuración estricta sin modificar |
| Señal del compilador de Preview | **build OK** |
| `git diff --check` | **PASS** |

La regresión anterior era 1412/1412; diferencia: **17 pruebas TypeScript adicionales**. No se desactivó ninguna prueba ni verificación. El alias dinámico `Obj = any` del evaluador heredado permanece para el port de diccionarios Python; no se presenta como una conversión integral de ese port a contratos cerrados. Las pruebas del motor sí están estrictamente tipadas, sin `any`, `ts-nocheck`, `ts-ignore` o `ts-expect-error`.

Huellas SHA-256:

- Referencia original inalterada: `971c0d3526a11ce0b4e6c8b6ad26f766eafe588c6cfdc14a308d9068bf34b3d9`.
- Referencia adicional G2.1: `2f2b561da3e110ad5cb1babeac563e9f2bd1b824d71892d39f20c520c898cb2f`.

Las pruebas son sintéticas, locales y sin llamadas a proveedores IA o servicios de datos. No corresponde probar emisión/persistencia/UI empresarial: no existen conexiones autorizadas para MME. No se atribuye madurez empresarial a estos resultados.

## Propuesta documental G3 — NO IMPLEMENTADA

### Separación física

Crear, solo tras autorización, un proyecto de desarrollo/pruebas con **otra instancia de Lovable Cloud**, credenciales, usuarios y almacenamiento independientes. Ni otra organización ni otro esquema en la instancia actual constituyen separación física. Preview y publicado actuales comparten backend: no son entornos independientes.

La opción propuesta es un proyecto aislado/remix, verificando que recibe una instancia distinta antes de permitir escrituras. El remix copia estructura, no datos; no se presupone copia de usuarios, archivos, secretos ni configuración de acceso. Aprovisionar solamente empresas/identidades/evidencias sintéticas. Si la separación no puede acreditarse, bloquear G3. No crear ahora el proyecto ni cambiar la configuración actual.

### Respaldo y recuperación

- Código: commit base y commit de cada migración con huellas del catálogo y versión del evaluador; recuperación mediante commits compensatorios, no reescritura de historia.
- Base aislada: respaldo diario documentado por Cloud (retención aproximada de 14 días), inventario de fechas verificadas antes de cada hito; no se han consultado respaldos reales aquí. No hay recuperación a cualquier instante: la restauración usa snapshots diarios y revierte esquema y datos de la misma instancia.
- Exportación completa autorizada desde Cloud antes de cambios importantes; contiene usuarios y hashes de contraseñas, por lo que requiere custodia restringida. No usar datos productivos para pruebas por defecto. Los archivos de almacenamiento no están incluidos en backups/exportación de base de datos: requieren respaldo separado y autorizado.
- Simular pérdida y recuperación exclusivamente en el entorno aislado. Documentar pérdida potencial posterior al snapshot, tiempos medidos de recuperación y coherencia esquema/código. No prometer recuperación reversible ni pérdida cero.

### Datos, migraciones y aislamiento multiempresa

- Diseñar tablas aditivas `mme_*` solo en el entorno aislado; no ejecutar en el backend compartido. Atar atestaciones a empresa, assessment, capacidad, check, versión de catálogo y evidencia.
- Historial append-only: decisiones de activación, emisión, supersesión y revocación como eventos; jamás borrar/reescribir evidencia histórica.
- Migraciones versionadas con precondiciones y pruebas de compatibilidad. Registro de activación vacío por defecto; ID+versión y autorización institucional verificables, sin derivar autoridad de OWNER/ADMIN.
- RLS y permisos mínimos por tabla/función, aislamiento bilateral de referencias, archivos y lecturas. Identidades/secretos separados entre entornos; ninguna credencial productiva en pruebas.

### Atestaciones y revocación

- Emisor exclusivamente del lado servidor, autoridad temporal y alcance institucional comprobados antes de firmar; pruebas no habilitan emisión productiva.
- Guardar contenido firmado exacto, versión de firma, huella, emisor, evidencia, fecha y linaje. Rotación de claves con identificadores y verificación histórica; secretos solo en almacén seguro.
- Revocar evidencia, autoridad o activación mediante eventos; recalcular la proyección vigente sin borrar resultados anteriores, señalando invalidación y causa. Evitar que un resultado persistido siga apareciendo como vigente tras una revocación.
- No resolver política de agregación N/A por condición ni aprobar indicadores/bindings por implementación. Requieren decisión metodológica e institucional separada.

### Pruebas de aceptación G3 propuestas

1. Demostrar dos instancias distintas y que ninguna prueba escribe en producción.
2. Dos empresas sintéticas con filas presentes: lectura/escritura bilateral denegada, IDOR, referencias cruzadas y almacenamiento.
3. Anónimo, MEMBER, OWNER/ADMIN sin autoridad institucional, autoridad expirada/revocada: emisión y activación denegadas.
4. Crear→leer→superseder→revocar una atestación autorizada sintética; conservar toda la historia y verificar firmas/versiones.
5. Concurrencia, idempotencia, firma alterada, evidencia nula/revocada, binding/indicador no habilitado y registros duplicados.
6. Recuperación de respaldo aislado con lectura posterior y comprobación de archivos por separado.
7. Repetir equivalencia Python–TypeScript y regresión completa antes de cualquier integración.

**G3 espera autorización de alcance, proyecto físicamente separado, política de autoridad/firmas y decisiones metodológicas pendientes. GJ-01 · Recuperación y validación del Journey empresarial permanece separado, registrado y sin implementación. Trabajo detenido al finalizar G2.1.**