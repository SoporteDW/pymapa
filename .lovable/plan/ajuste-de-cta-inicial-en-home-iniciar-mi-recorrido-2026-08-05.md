# Ajuste de CTA inicial en Home: "Iniciar mi recorrido"

## Contexto
El usuario percibe que, al entrar por primera vez, la plataforma ya muestra una pyme de ejemplo. El problema inmediato es que el banner principal del Home dice siempre **"Continuar mi recorrido"**, lo que sugiere que hay un progreso previo. El objetivo es que un usuario nuevo entienda que empieza de cero: el CTA debe ser **"Iniciar mi recorrido"** o **"Iniciar mi proyecto"** cuando no hay datos, y **"Continuar mi recorrido"** solo cuando realmente hay progreso guardado.

## Alcance del cambio

### 1. Detectar estado "sin progreso"
Definir una función pura que determine si la sesión está completamente vacía:

- `empresa.nombre` está vacío.
- `diagnostico.estado === "no_iniciado"`.
- `respuestas.length === 0`.
- `resultados.length === 0`.
- `acciones.length === 0`.
- `actividad.length === 0`.

Ubicación sugerida: `src/lib/recorrido.ts` o `src/lib/recorrido-modulos.ts`, reutilizando la lógica existente de `estadoEtapas`/`avanceModulos`.

### 2. Adaptar el banner principal en `src/routes/inicio.tsx`
Condicionar el contenido del banner según `hayProgreso`:

| Elemento | Sin progreso | Con progreso |
|---|---|---|
| Título del banner | "Inicia tu recorrido de transformación" | "Tu siguiente paso" (actual) |
| Descripción | Texto de bienvenida orientado a empezar: perfil → diagnóstico → resultados → plan → indicadores. | Descripción contextual del paso actual (actual). |
| Label del CTA | **"Iniciar mi recorrido"** o **"Iniciar mi proyecto"** | **"Continuar mi recorrido"** |
| Ruta del CTA | `/perfil` | Ruta devuelta por `siguientePaso(sesion)` |
| Hint inferior | "Comenzar te lleva al primer paso: completar tu perfil." | "Continuar te lleva exactamente al punto donde quedaste." |

### 3. Mantener la experiencia de demostración intacta
No modificar el botón **"Ver demostraciones"** del `AppHeader` ni la ruta `/demostracion`. Las demostraciones deben seguir siendo el único camino para ver pymes de ejemplo.

### 4. Verificación visual
Validar el Home en dos estados:

1. Sesión vacía (localStorage limpio o `crearSesionVacia()`).
2. Sesión con progreso parcial (perfil completado o diagnóstico iniciado).

Confirmar que el texto, la ruta del CTA y el hint inferior cambian correctamente.

## Riesgos y dependencias
- El preview puede tener datos previos en `localStorage`; para probar el estado vacío será necesario limpiar la clave `pyme-digital-sesion-v2` o usar una sesión de navegador privada.
- No se toca la lógica de demostración ni el botón del header, por lo que el riesgo de regresión es bajo y se limita a la ruta `/inicio`.
