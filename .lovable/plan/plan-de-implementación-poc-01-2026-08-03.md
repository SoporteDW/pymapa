# Plan de implementación — POC-01
Arquitectura técnica y estructura base del MVP Alfa de Transformación Digital para Pymes.

## Alcance del paquete

Construir la aplicación web navegable, visualmente consistente y técnicamente preparada para los nueve paquetes siguientes. Se limita al contenedor: layout, rutas, componentes base, datos simulados, persistencia local mínima y estados del sistema. No se implementa la lógica definitiva de diagnóstico, priorización, recomendaciones, roadmap ni integraciones externas.

## Estado de los Paquetes Oficiales de Construcción

- Recibidos e integrados: ninguno.
- Recibido, pendiente de integrar: POC-01.
- Pendientes: POC-02 a POC-10.

No se detectan dependencias no resueltas; este paquete es la base del proyecto.

## Estructura técnica adoptada

Se utiliza el stack actual del proyecto (TanStack Start v1 + React 19 + Tailwind CSS v4 + Vite 7). Se organiza el código en capas modulares:

```text
src/
  routes/                 # Rutas de TanStack Router
    __root.tsx            # Layout global (header, nav, main, footer)
    index.tsx             # Redirección a /inicio
    inicio.tsx            # NAV-01 · Pantalla de bienvenida y valor
    diagnostico.tsx       # NAV-02 · Contenedor estructural del cuestionario
    resultados.tsx        # NAV-03 · Plantilla de hallazgos simulados
    plan-de-accion.tsx    # NAV-04 · Estructura de prioridades simuladas
    dashboard.tsx         # NAV-05 · Resumen de avance simulado
    perfil.tsx            # NAV-06 · Edición básica de empresa (persistencia local)
    ayuda.tsx             # NAV-07 · Guía de uso del prototipo
  components/ui/          # Biblioteca de componentes reutilizables
  features/               # Agrupación funcional por dominio (Inicio, Diagnóstico, ...)
  data/mocks/             # Datos de demostración separados de la interfaz
  types/                  # Contratos de datos y tipos compartidos
  hooks/                  # Estado local, persistencia y preferencias
  lib/utils.ts            # Funciones auxiliares sin lógica de negocio
  styles.css              # Tokens visuales y estilos globales (ya existente)
```

## Rutas y componentes a crear

Rutas principales (todas bajo el layout global):

| Ruta | Estado POC-01 | Contenido esperado |
| --- | --- | --- |
| /inicio | Activa | Propuesta de valor, siguiente paso, acción principal hacia el diagnóstico. |
| /diagnostico | Estructural | Encabezado, stepper, área de pregunta simulada, ayuda contextual, indicador de guardado, mensaje de datos demostrativos. |
| /resultados | Simulado | Resumen ejecutivo, indicador global ilustrativo, dimensiones, fortalezas, oportunidades, prioridades. |
| /plan-de-accion | Simulado | Lista de prioridades, tarjetas de acción con impacto/esfuerzo/estado, filtros simples, estado vacío. |
| /dashboard | Simulado | Resumen visual del avance con datos ilustrativos. |
| /perfil | Básico funcional | Formulario editable de datos de empresa con persistencia local. |
| /ayuda | Básico funcional | Preguntas frecuentes y orientación sobre el recorrido. |

Componentes reutilizables mínimos:

- Button, Card, Badge, Progress, Alert, Dialog, Tabs, Accordion, Stepper, Table, Input, Tooltip, Skeleton, EmptyState, Toast.
- Layout: AppHeader, AppSidebar, AppFooter, MobileNav.
- Estados del sistema: LoadingState, ErrorState, SuccessState, WarningState, EmptyState, FutureFeatureState, OfflineState.

## Sistema visual

- Paleta base clara y neutra con color principal azul profundo; acentos moderados para estados (éxito, advertencia, error, información).
- Tipografía sans-serif moderna y legible (usando la fuente del sistema/stack actual).
- Tarjetas con bordes suaves, separación clara y sombras sutiles.
- Espaciado generoso y consistente mediante tokens de Tailwind.
- Soporte para preferencia de movimiento reducido.

## Modelo de datos provisional

Tipos mínimos centralizados en src/types/:

- Empresa: id, nombre, sector, tamaño, responsable, correo, fechaActualizacion.
- Diagnóstico: id, estado, progreso, pasoActual, fechaActualizacion.
- Pregunta: id, seccion, texto, tipo, opciones, ayuda.
- Respuesta: preguntaId, valor, fechaGuardado.
- Resultado: dimension, puntajeDemostrativo, nivel, mensaje, esSimulado.
- Accion: id, titulo, proposito, prioridad, impacto, esfuerzo, estado, esSimulada.
- Actividad: id, fecha, tipo, descripcion.
- Preferencias: menuColapsado, ultimaRuta, movimientoReducido.

## Datos simulados

- Empresa de demostración preseleccionada al inicio.
- Diagnóstico en progreso y un estado vacío disponible para pruebas.
- Preguntas de demostración en archivo separado de la vista.
- Resultados y acciones ilustrativas claramente marcados como simulados.
- Opción en /perfil para restablecer los datos de demostración.

## Persistencia local

- Almacenamiento en localStorage encapsulado en hooks dedicados.
- Datos persistidos: perfil de empresa, progreso simulado del diagnóstico, preferencias de navegación.
- Sin autenticación real ni credenciales.

## Accesibilidad y responsive

- Foco visible en controles interactivos.
- Etiquetas asociadas a campos de formulario.
- Jerarquía semántica de títulos.
- Navegación por teclado operativa.
- Layout adaptable a escritorio, tableta y móvil: menú lateral expandido en escritorio, colapsable en móvil.
- No depender únicamente del color para comunicar estados.

## Criterios de aceptación a verificar

- AC-01: La aplicación inicia sin errores críticos.
- AC-02: Todas las rutas principales son accesibles.
- AC-03: La vista activa se identifica en la navegación.
- AC-04: El layout es consistente en todas las pantallas.
- AC-05: Las pantallas se adaptan a escritorio, tableta y móvil.
- AC-06: No existen enlaces rotos ni botones principales sin respuesta.
- AC-07: Los datos simulados están separados de los componentes.
- AC-08: Los estados de carga, vacío, error, éxito y confirmación están disponibles.
- AC-09: La interfaz usa lenguaje claro y orientado a pymes.
- AC-10: Las funciones excluidas no se implementan con reglas inventadas.
- AC-11: El perfil y el progreso simulado pueden persistirse localmente.
- AC-12: Existe una opción para restablecer datos de demostración.
- AC-13: Los controles esenciales son operables por teclado.
- AC-14: El foco visible y las etiquetas de campos están implementados.
- AC-15: Los datos ilustrativos están marcados como simulados.

## Punto de detención

Una vez construidos y verificados los entregables del POC-01, se presentará el informe de cierre solicitado y se detendrá la construcción a la espera del POC-02. No se desarrollará la lógica definitiva de diagnóstico, motor de conocimiento, personalización de recomendaciones, priorización real, Fichas de Acción completas, roadmap dinámico ni seguimiento productivo.

## Riesgos y dependencias para el POC-02

- La estructura de datos provisional debe ser compatible con el modelo definitivo que llegue en el siguiente paquete; se mitiga manteniendo tipos simples y mocks desacoplados.
- La navegación y el layout global deben soportar nuevas rutas profundas (por ejemplo, detalle de ficha de acción); se mitiga con el layout anidado de TanStack Router.
- La persistencia local es temporal; el POC-02 probablemente deba definir si se conecta a Lovable Cloud o se mantiene local.
