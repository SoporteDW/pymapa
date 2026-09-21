# supabase/policies

Documentación canónica de las políticas RLS de la fundación de datos productiva (M1-C).

Las políticas se **aplican** mediante migraciones versionadas en `supabase/migrations/`
(archivo `*_m1c_initial_rls_policies`, segundo archivo de M1-C). Este directorio describe
la intención de cada política para revisión de gobierno; no debe divergir de la migración.

## Principios

1. `organizations` es el tenant root. Toda tabla tenant-owned lleva `organization_id`.
2. La autorización se basa exclusivamente en `memberships` (User ≠ Membership).
3. No existen políticas permisivas generales. `anon` no tiene acceso a ninguna tabla.
4. Las credenciales `service_role` nunca se exponen al browser.
5. Los helpers `private.is_organization_member` y `private.has_organization_role` viven en
   el esquema `private` (no expuesto por la Data API) para evitar recursión de RLS.

## Matriz de acceso (rol `authenticated`)

| Tabla | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| `knowledge_versions` | sí (catálogo gobernado) | no | no | no |
| `organizations` | miembros | cualquier autenticado | OWNER/ADMIN | no |
| `memberships` | propias + OWNER/ADMIN de la org | OWNER/ADMIN | OWNER/ADMIN | OWNER/ADMIN |
| `cases` | miembros | miembros | miembros | OWNER/ADMIN |
| `assessments` | miembros | miembros | miembros | no |
| `responses` | miembros | miembros (`submitted_by` propio o nulo) | no (append-only) | no |
| `observations` | miembros | solo servidor | solo servidor | solo servidor |
| `evaluation_runs` | miembros | solo servidor | solo servidor | solo servidor |
| `variable_evaluations` | miembros | solo servidor | solo servidor | solo servidor |
| `information_need_states` | miembros | solo servidor | solo servidor | solo servidor |

"solo servidor" = sin GRANT ni política para `authenticated`; la escritura queda reservada
al futuro Knowledge Engine ejecutándose con `service_role`.

## Fuera de alcance en M1-C

- Respondent externo y Assignment externo (no introducidos todavía).
- IAM complejo, permisos granulares por capacidad.
- Reglas de conocimiento, scoring, sufficiency, confidence, priority.
- Cualquier conexión del frontend a estas tablas (el MVP sigue en `MVP_ENGINE`).
