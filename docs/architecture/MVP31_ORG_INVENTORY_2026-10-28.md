# MVP31 · Inventario de organizaciones (solo lectura) · 2026-10-28

Backend único compartido por Preview y dominio oficial. Sin modificaciones.

| Org (id corto) | Nombre | Usuarios:rol | Eval. | Resp. | Evid. | Autoriz. sintética |
|---|---|---|---|---|---|---|
| 88fb67d6 | Organización de trabajo (QA A) | qa.op01 OWNER, qa2.member MEMBER | 3 | 18 | 12 | Sí |
| f26a1777 | Digiway Corp | jose.diaz OWNER | 1 | 60 | 3 | No |
| 9816dfad | Organización de trabajo (CM05 E2E) | qa.cm05e2e OWNER, qa.op01 ADMIN, qa2.member MEMBER | 1 | 0 | 5 | Sí |
| b0400000 | QA SINTETICA BUILD04 B | qa.op01 OWNER, qa2.member MEMBER, qa.orgb.exclusive MEMBER | 1 | 0 | 1 | Sí |
| a62e562b | QA SINTETICA MVP-BETA-INT-01 · Sensores y Calibración Andina | qa.int01.owner OWNER, qa.int01.member MEMBER | 2 | 32 | 60 | Sí |
| cbea48e0 | Organización de trabajo (creada 2026-10-28) | digiwaysuindprueba@gmail.com OWNER | 1 | 0 | 0 | No |
| dc0f1e87 | Organización de trabajo (Textiles Qhapaq) | qa.mvp31.qhapaq OWNER | 2 | 99 | 5 | **No** |

Usuarios sin organización: gov.qa.dec052@digiwaycorp.com (nunca inició sesión).
Análisis IA DEC-053 persistidos: 0 en todas.

## Hallazgos
- **Moda Origen** no existe en el backend: es la demo `/demo-documental`, que corre solo en el navegador y nunca escribió datos. No fue eliminada.
- **Textiles Qhapaq** está registrada con el nombre genérico "Organización de trabajo"; el nombre comercial vive en los documentos sintéticos.
- **Recurrencia INC-ARCH-BOOTSTRAP-01**: la identidad institucional `digiwaysuindprueba@gmail.com` volvió a crear una organización vacía hoy al iniciar sesión. No se tocó.
- **Bloqueo DEC-053**: Qhapaq carece de autorización sintética (DEC-047), por lo que el servidor rechaza el análisis IA (fail-closed, correcto). Requiere autorización expresa para registrarla.
- Accesibilidad: cada organización solo es legible por sus miembros (RLS por membresía, verificado en QA bilateral previas).
