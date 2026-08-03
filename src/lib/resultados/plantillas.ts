/**
 * Catálogo de plantillas de Ficha de Acción (POC-05, 8.1 y 8.2).
 * Contenido versionado como datos: pasos, indicadores y riesgos se redactan en
 * lenguaje claro, sin herramientas comerciales ni garantías de resultado.
 */

export interface PlantillaAccion {
  /** Capacidad del catálogo del motor (POC-04) o dimensión como respaldo. */
  clave: string;
  titulo: string;
  impactoEsperado: string;
  responsable: string;
  prerrequisitos: string[];
  pasos: string[];
  indicadores: string[];
  riesgos: { riesgo: string; mitigacion: string }[];
}

export const plantillasPorCapacidad: PlantillaAccion[] = [
  {
    clave: "CAP-D01-01",
    titulo: "Definir dos objetivos digitales concretos para el próximo trimestre",
    impactoEsperado:
      "Dar dirección a las iniciativas digitales y evitar esfuerzos dispersos sin resultado visible.",
    responsable: "Dirección o gerencia general",
    prerrequisitos: ["Contar con las metas comerciales del trimestre"],
    pasos: [
      "Elegir dos resultados de negocio que quieras mejorar en el trimestre.",
      "Traducir cada resultado en un objetivo digital medible.",
      "Definir cómo se medirá cada objetivo y con qué frecuencia.",
      "Comunicar los objetivos al equipo en una reunión breve.",
      "Registrar los objetivos en un documento accesible para todos.",
    ],
    indicadores: [
      "Dos objetivos digitales escritos y compartidos",
      "Porcentaje del equipo que los conoce",
      "Revisión mensual realizada",
    ],
    riesgos: [
      {
        riesgo: "Definir objetivos demasiado amplios que no puedan medirse.",
        mitigacion: "Limitar cada objetivo a un solo resultado observable.",
      },
    ],
  },
  {
    clave: "CAP-D01-02",
    titulo: "Asignar un responsable y una revisión mensual del avance digital",
    impactoEsperado:
      "Sostener el avance en el tiempo y detectar desvíos antes de que afecten la operación.",
    responsable: "Dirección o gerencia general",
    prerrequisitos: ["Tener objetivos digitales definidos"],
    pasos: [
      "Designar una persona responsable del seguimiento digital.",
      "Fijar una reunión mensual de 30 minutos en el calendario.",
      "Definir tres indicadores que se revisarán siempre.",
      "Registrar acuerdos y responsables en cada reunión.",
      "Revisar el cumplimiento de acuerdos al inicio de la siguiente reunión.",
    ],
    indicadores: [
      "Responsable designado",
      "Reuniones mensuales efectivamente realizadas",
      "Porcentaje de acuerdos cumplidos",
    ],
    riesgos: [
      {
        riesgo: "La reunión se cancela por urgencias operativas.",
        mitigacion: "Mantener una duración corta y una agenda fija de tres puntos.",
      },
    ],
  },
  {
    clave: "CAP-D02-01",
    titulo: "Organizar la información de clientes en un registro único",
    impactoEsperado:
      "Recuperar oportunidades comerciales y dar seguimiento sin depender de la memoria de cada persona.",
    responsable: "Líder comercial o encargado de atención",
    prerrequisitos: ["Identificar dónde está hoy la información de clientes"],
    pasos: [
      "Listar las fuentes actuales de datos de clientes.",
      "Definir los campos mínimos que se registrarán.",
      "Consolidar la información en un único registro compartido.",
      "Asignar responsable de actualización.",
      "Revisar la calidad del registro cada mes.",
    ],
    indicadores: [
      "Porcentaje de clientes registrados con datos completos",
      "Registros duplicados detectados",
      "Actualizaciones realizadas por mes",
    ],
    riesgos: [
      {
        riesgo: "El registro queda desactualizado tras las primeras semanas.",
        mitigacion: "Integrar la actualización a la rutina de atención diaria.",
      },
    ],
  },
  {
    clave: "CAP-D02-02",
    titulo: "Definir un proceso básico para responder consultas digitales",
    impactoEsperado:
      "Mejorar la oportunidad de respuesta y reducir las consultas que quedan sin atender.",
    responsable: "Líder comercial o persona encargada de atención",
    prerrequisitos: ["Tener identificados los canales digitales activos"],
    pasos: [
      "Identificar todos los canales por los que llegan consultas.",
      "Asignar un responsable por canal.",
      "Definir un tiempo objetivo de respuesta.",
      "Crear un registro simple de consultas recibidas y resueltas.",
      "Revisar el registro una vez por semana.",
    ],
    indicadores: [
      "Porcentaje de consultas respondidas",
      "Tiempo promedio de respuesta",
      "Consultas sin cierre",
    ],
    riesgos: [
      {
        riesgo: "Los canales se multiplican sin responsable claro.",
        mitigacion: "Mantener solo los canales que se puedan atender con el equipo actual.",
      },
    ],
  },
  {
    clave: "CAP-D03-01",
    titulo: "Documentar los tres procesos que más afectan a tus clientes",
    impactoEsperado:
      "Reducir errores y reprocesos, y facilitar que otra persona pueda ejecutar la tarea.",
    responsable: "Responsable de operaciones",
    prerrequisitos: ["Acordar qué procesos son los más críticos"],
    pasos: [
      "Seleccionar los tres procesos con mayor impacto en el cliente.",
      "Describir cada proceso en pasos simples y numerados.",
      "Asignar responsable de cada paso.",
      "Validar la descripción con quienes ejecutan el trabajo.",
      "Guardar los documentos en un lugar accesible.",
    ],
    indicadores: [
      "Procesos documentados",
      "Errores o reprocesos reportados por mes",
      "Tiempo de capacitación de una persona nueva",
    ],
    riesgos: [
      {
        riesgo: "Documentar en exceso y no usar los documentos.",
        mitigacion: "Limitar cada proceso a una página y revisarlo cada trimestre.",
      },
    ],
  },
  {
    clave: "CAP-D03-02",
    titulo: "Reducir una tarea manual repetitiva con las herramientas ya disponibles",
    impactoEsperado: "Liberar tiempo del equipo y disminuir errores en tareas repetitivas.",
    responsable: "Responsable de operaciones",
    prerrequisitos: ["Tener el proceso descrito paso a paso"],
    pasos: [
      "Identificar la tarea manual que más tiempo consume.",
      "Medir cuánto tiempo toma hoy por semana.",
      "Definir una forma más simple de hacerla con las herramientas actuales.",
      "Probar el nuevo flujo durante dos semanas.",
      "Comparar el tiempo utilizado y ajustar.",
    ],
    indicadores: [
      "Horas semanales dedicadas a la tarea",
      "Errores detectados antes y después",
      "Personas capacitadas en el nuevo flujo",
    ],
    riesgos: [
      {
        riesgo: "El equipo vuelve al método anterior.",
        mitigacion: "Acordar el cambio con quienes ejecutan la tarea antes de aplicarlo.",
      },
    ],
  },
  {
    clave: "CAP-D04-01",
    titulo: "Centralizar la información clave del negocio en un solo lugar",
    impactoEsperado:
      "Evitar versiones distintas del mismo dato y acelerar la preparación de información.",
    responsable: "Responsable administrativo",
    prerrequisitos: ["Definir qué información se considera clave"],
    pasos: [
      "Listar la información que se usa para decidir cada mes.",
      "Definir una única fuente para cada dato.",
      "Consolidar la información en un archivo o herramienta compartida.",
      "Establecer quién actualiza y cuándo.",
      "Verificar la consistencia al cierre de cada mes.",
    ],
    indicadores: [
      "Datos con fuente única definida",
      "Tiempo de preparación del informe mensual",
      "Diferencias detectadas entre fuentes",
    ],
    riesgos: [
      {
        riesgo: "Cada área mantiene su propia versión de los datos.",
        mitigacion: "Acordar la fuente única de forma explícita con cada área.",
      },
    ],
  },
  {
    clave: "CAP-D04-02",
    titulo: "Elegir tres indicadores y revisarlos cada mes",
    impactoEsperado:
      "Tomar decisiones con evidencia en lugar de percepciones, y detectar problemas a tiempo.",
    responsable: "Dirección con apoyo administrativo",
    prerrequisitos: ["Contar con información básica organizada"],
    pasos: [
      "Elegir tres indicadores que reflejen ventas, operación y clientes.",
      "Definir cómo se calcula cada indicador.",
      "Registrar los valores del último trimestre como punto de partida.",
      "Revisar los indicadores en la reunión mensual.",
      "Documentar las decisiones tomadas a partir de ellos.",
    ],
    indicadores: [
      "Indicadores calculados cada mes",
      "Decisiones documentadas con base en datos",
      "Meses con seguimiento completo",
    ],
    riesgos: [
      {
        riesgo: "Medir demasiadas cosas y perder foco.",
        mitigacion: "Mantener solo tres indicadores durante los primeros seis meses.",
      },
    ],
  },
  {
    clave: "CAP-D05-01",
    titulo: "Cerrar la brecha de habilidades digitales del equipo con práctica guiada",
    impactoEsperado:
      "Aprovechar las herramientas que ya se pagan y reducir la dependencia de una sola persona.",
    responsable: "Responsable de personas o dirección",
    prerrequisitos: ["Identificar las herramientas de uso diario"],
    pasos: [
      "Detectar qué herramienta se usa por debajo de su potencial.",
      "Identificar quién necesita apoyo y en qué tarea.",
      "Organizar una sesión práctica corta por herramienta.",
      "Dejar una guía breve de uso disponible.",
      "Verificar el uso dos semanas después.",
    ],
    indicadores: [
      "Personas capacitadas",
      "Consultas de soporte interno por semana",
      "Tareas realizadas de forma autónoma",
    ],
    riesgos: [
      {
        riesgo: "La capacitación se realiza una vez y no se aplica.",
        mitigacion: "Practicar sobre tareas reales del trabajo diario.",
      },
    ],
  },
  {
    clave: "CAP-D05-02",
    titulo: "Crear un espacio breve para compartir aprendizajes del equipo",
    impactoEsperado: "Difundir buenas prácticas y sostener la adopción de nuevas formas de trabajo.",
    responsable: "Responsable de personas o líder de área",
    prerrequisitos: [],
    pasos: [
      "Definir una reunión corta cada dos semanas.",
      "Invitar a una persona a compartir una mejora aplicada.",
      "Registrar el aprendizaje en un documento común.",
      "Reconocer las mejoras aplicadas.",
    ],
    indicadores: [
      "Reuniones realizadas",
      "Aprendizajes registrados",
      "Mejoras replicadas en otras áreas",
    ],
    riesgos: [
      {
        riesgo: "El espacio se percibe como una reunión más.",
        mitigacion: "Mantenerlo en 20 minutos y con un caso concreto por sesión.",
      },
    ],
  },
  {
    clave: "CAP-D06-01",
    titulo: "Ordenar los accesos y activar copias de respaldo de la información crítica",
    impactoEsperado:
      "Reducir la exposición ante pérdida de información o salida de personas del equipo.",
    responsable: "Responsable de tecnología o dirección",
    prerrequisitos: ["Identificar la información crítica del negocio"],
    pasos: [
      "Listar los sistemas y archivos críticos del negocio.",
      "Revisar quién tiene acceso a cada uno y retirar los accesos innecesarios.",
      "Activar copias de respaldo automáticas donde sea posible.",
      "Verificar que una copia pueda restaurarse.",
      "Registrar responsables y frecuencia de revisión.",
    ],
    indicadores: [
      "Sistemas con accesos revisados",
      "Copias de respaldo verificadas",
      "Tiempo estimado de recuperación",
    ],
    riesgos: [
      {
        riesgo: "Se activan respaldos sin comprobar que funcionan.",
        mitigacion: "Realizar una prueba de restauración al menos una vez.",
      },
    ],
  },
  {
    clave: "CAP-D06-02",
    titulo: "Acordar prácticas mínimas de seguridad y un plan simple de continuidad",
    impactoEsperado:
      "Mantener la operación ante fallas tecnológicas y reducir errores humanos evitables.",
    responsable: "Responsable de tecnología o dirección",
    prerrequisitos: ["Tener accesos y respaldos identificados"],
    pasos: [
      "Acordar reglas básicas de contraseñas y uso de equipos.",
      "Explicar las reglas al equipo con ejemplos cotidianos.",
      "Escribir qué hacer si falla el sistema principal.",
      "Definir responsables y contactos de apoyo.",
      "Revisar el plan cada seis meses.",
    ],
    indicadores: [
      "Personas informadas de las reglas",
      "Incidentes registrados por trimestre",
      "Plan de continuidad revisado",
    ],
    riesgos: [
      {
        riesgo: "El plan queda escrito pero nadie lo conoce.",
        mitigacion: "Repasarlo en una reunión breve al momento de publicarlo.",
      },
    ],
  },
];

/** Plantilla de respaldo cuando el hallazgo no está asociado a una capacidad. */
export const plantillasPorDimension: Record<string, PlantillaAccion> = {
  D01: crearRespaldo("D01", "la dirección digital", "Dirección o gerencia general"),
  D02: crearRespaldo("D02", "la relación con tus clientes", "Líder comercial"),
  D03: crearRespaldo("D03", "tus procesos internos", "Responsable de operaciones"),
  D04: crearRespaldo("D04", "el uso de la información", "Responsable administrativo"),
  D05: crearRespaldo("D05", "las capacidades del equipo", "Responsable de personas"),
  D06: crearRespaldo("D06", "la seguridad de la información", "Responsable de tecnología"),
};

function crearRespaldo(clave: string, foco: string, responsable: string): PlantillaAccion {
  return {
    clave,
    titulo: `Acordar una primera mejora concreta en ${foco}`,
    impactoEsperado: `Avanzar en ${foco} con una mejora acotada y verificable.`,
    responsable,
    prerrequisitos: [],
    pasos: [
      "Revisar el hallazgo con la persona responsable del área.",
      "Elegir una mejora que pueda aplicarse en menos de un mes.",
      "Definir cómo se comprobará que la mejora funcionó.",
      "Aplicar la mejora y registrar el resultado.",
    ],
    indicadores: [
      "Mejora aplicada en el plazo definido",
      "Resultado registrado",
      "Personas involucradas informadas",
    ],
    riesgos: [
      {
        riesgo: "La mejora se posterga por falta de tiempo.",
        mitigacion: "Acotar el alcance para que pueda ejecutarse en pocas horas de trabajo.",
      },
    ],
  };
}

export function plantillaPara(capacidadId: string | null, dimensionId: string): PlantillaAccion {
  const porCapacidad = capacidadId
    ? plantillasPorCapacidad.find((p) => p.clave === capacidadId)
    : undefined;
  return porCapacidad ?? plantillasPorDimension[dimensionId] ?? plantillasPorDimension["D01"]!;
}
