# MVP31 · Verificación de cuenta empresarial de demostración

Fecha: 2026-10-28 UTC. Alcance: consultas de solo lectura; sin sesiones nuevas, cambios de contraseña, roles, organizaciones o datos.

## PROBADO · Identidad y permisos actuales

- `jose.diaz@digiwaycorp.com`: una identidad existente, proveedor email; correo confirmado el 2026-10-13, último acceso registrado el 2026-10-25. Sin bloqueo temporal ni eliminación registrada.
- Ajustes alojados de Auth leídos con HTTP 200: acceso email habilitado y confirmación de correo requerida. No se cambió configuración ni se envió correo.
- Una membresía empresarial: **OWNER** en **Digiway Corp**. El rol es empresarial y limitado a la organización; no se agregaron permisos.
- Datos anteriores preservados: 1 caso, 1 assessment, 60 respuestas y 3 evidencias. Estos conteos no acreditan estado de demostración ni suficiencia diagnóstica.
- Cero designaciones de Gobierno y cero autoridades profesionales registradas para esta identidad; ninguna activa.
- Las políticas alojadas permiten a OWNER/ADMIN gestionar su organización; no se encontró tabla adicional de roles/admin en public/private.
- La función alojada `bootstrap_organization` devuelve la organización anterior cuando el usuario ya tiene membresía. La política INSERT de organizaciones también exige no tener membresía previa. Por tanto, el recorrido actual no permite crear una segunda empresa independiente con esta identidad.

## IMPLEMENTADO · Separación de identidades

- La identidad existente es la seleccionada para pruebas personales y demostración empresarial de Perú; no se creó una cuenta duplicada.
- `qa.mvp31.qhapaq@digiwaycorp.com` queda exclusivamente para QA automatizada.
- `digiwaysuindprueba@gmail.com` queda excluida: no se reutilizó ni reactivó.
- No se modificaron registros alojados ni conocimiento protegido.

## PENDIENTE / BLOQUEADO

- Acceso personal: iniciar sesión en `/acceso` con la contraseña existente. No se ensayaron credenciales ni se solicitó un cambio de contraseña.
- La aplicación no tiene actualmente un recorrido de recuperación de contraseña; si el usuario no recuerda la existente, se requiere una petición específica de recuperación segura, sin pedirla en chat.
- Empresa nueva desde cero bajo la misma identidad: bloqueada por la regla actual de una organización por usuario. No renombrar ni vaciar Digiway Corp, ni alterar dicha regla sin autorización. El Escenario B no puede acreditarse con sus datos históricos.
- Verificación E2E personal no ejecutada: esta comprobación fue de identidad/permisos alojados, no un login ni una prueba funcional autenticada.
- Los demás frentes MVP31 siguen abiertos en roadmap; esta verificación no acredita avance de DEC-053, suficiencia documental, Plan de Transformación ni cierre de los escenarios A/B.