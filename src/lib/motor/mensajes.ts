/**
 * Diccionario de textos del motor (POC-04, 8 y 14).
 * Las reglas referencian claves (messageKey) para no acoplar la lógica a la redacción.
 * Los textos son descriptivos del estado detectado: no son recomendaciones finales
 * ni Fichas de Acción, que corresponden al POC-05.
 */

export interface MensajeHallazgo {
  /** Título corto del hallazgo. */
  titulo: string;
  /** ¿Qué se detectó? */
  estadoActual: string;
  /** ¿Por qué importa para esta pyme? */
  implicacion: string;
  /** Explicación en lenguaje claro, sin fórmulas ni identificadores. */
  usuario: string;
}

export const mensajes: Record<string, MensajeHallazgo> = {
  "EST.direccion.ausente": {
    titulo: "Dirección digital sin definir",
    estadoActual:
      "No hay objetivos digitales explícitos ni una conexión clara con las metas del negocio.",
    implicacion:
      "Sin una dirección compartida, las inversiones digitales se dispersan y es difícil evaluar si aportan valor.",
    usuario:
      "Todavía no hay objetivos digitales claros para el negocio. Definirlos permite ordenar decisiones y medir avances.",
  },
  "EST.gobierno.ausente": {
    titulo: "Falta un responsable de coordinación",
    estadoActual: "No se identifica una persona que coordine y dé seguimiento a las iniciativas digitales.",
    implicacion:
      "Sin responsable, las iniciativas avanzan de forma intermitente y dependen de la disponibilidad del momento.",
    usuario:
      "Nadie coordina de forma estable las iniciativas digitales, por lo que el avance depende de la urgencia del día.",
  },
  "EST.direccion.solida": {
    titulo: "Dirección digital establecida",
    estadoActual: "Existen objetivos digitales conocidos y alineados con el negocio.",
    implicacion: "Es una base sólida para priorizar y sostener nuevas iniciativas.",
    usuario: "La empresa ya sabe qué espera lograr con lo digital y eso facilita los siguientes pasos.",
  },
  "EST.seguimiento.parcial": {
    titulo: "Seguimiento parcial de iniciativas",
    estadoActual: "La revisión de avances existe, pero no es sistemática.",
    implicacion: "Un seguimiento regular permitiría corregir a tiempo y aprovechar lo que ya funciona.",
    usuario: "Los avances se revisan de vez en cuando; hacerlo con una rutina fija daría más control.",
  },
  "CLI.clientes.sinUso": {
    titulo: "Información de clientes sin aprovechar",
    estadoActual: "La empresa no registra o no utiliza información de clientes para decidir.",
    implicacion:
      "Se pierden oportunidades de fidelización y de enfocar el esfuerzo comercial donde rinde más.",
    usuario:
      "Hoy los datos de clientes no se usan para tomar decisiones comerciales, aunque el negocio ya los genera.",
  },
  "CLI.canales.debiles": {
    titulo: "Canales digitales con operación irregular",
    estadoActual:
      "La información publicada no se mantiene actualizada o la atención pierde continuidad entre canales.",
    implicacion:
      "El cliente percibe desorden y aumenta la probabilidad de abandono antes de concretar la compra.",
    usuario:
      "Los canales digitales funcionan de forma irregular, lo que confunde a quien intenta comprar o consultar.",
  },
  "CLI.canales.solidos": {
    titulo: "Operación de canales consolidada",
    estadoActual: "Los canales digitales están actualizados y la atención mantiene continuidad.",
    implicacion: "Es una fortaleza que puede sostener acciones comerciales más ambiciosas.",
    usuario: "Los canales digitales están bien atendidos y ofrecen una experiencia coherente.",
  },
  "CLI.medicion.oportunidad": {
    titulo: "Base de clientes sin medición",
    estadoActual: "Existe información de clientes, pero no se mide el resultado de las acciones digitales.",
    implicacion: "Hay valor disponible a corto plazo si se empieza a medir lo que ya se está haciendo.",
    usuario: "Ya hay datos de clientes; falta medir qué acciones digitales están funcionando.",
  },
  "PRO.procesos.informales": {
    titulo: "Procesos principales sin estandarizar",
    estadoActual: "Los procesos críticos no están documentados o la información se duplica entre áreas.",
    implicacion: "Aumentan los reprocesos y la dependencia de personas concretas.",
    usuario: "Los procesos principales funcionan por costumbre, lo que genera errores y trabajo repetido.",
  },
  "PRO.automatizacion.oportunidad": {
    titulo: "Trabajo manual repetitivo",
    estadoActual: "Las tareas repetitivas se realizan de forma manual, sin herramientas de apoyo.",
    implicacion: "Se consume tiempo del equipo en actividades que podrían simplificarse.",
    usuario: "Hay tareas repetitivas que consumen tiempo y podrían apoyarse en herramientas sencillas.",
  },
  "PRO.procesos.solidos": {
    titulo: "Procesos documentados y con responsables",
    estadoActual: "Los procesos principales están documentados y la información fluye entre áreas.",
    implicacion: "Facilita incorporar herramientas digitales sin desordenar la operación.",
    usuario: "La operación está ordenada, lo que facilita cualquier mejora digital posterior.",
  },
  "DAT.decisiones.sinEvidencia": {
    titulo: "Decisiones sin indicadores de apoyo",
    estadoActual: "Las decisiones se toman sin apoyo de datos ni indicadores.",
    implicacion: "Se dificulta detectar problemas a tiempo y justificar inversiones.",
    usuario: "Las decisiones se apoyan sobre todo en la experiencia; faltan indicadores que las respalden.",
  },
  "DAT.informacion.dispersa": {
    titulo: "Información dispersa entre herramientas",
    estadoActual: "La información no está organizada o las herramientas no intercambian datos.",
    implicacion: "Consultar y consolidar información exige esfuerzo manual y genera versiones distintas.",
    usuario: "La información está repartida en varios lugares, lo que obliga a rearmarla cada vez.",
  },
  "DAT.decisiones.solidas": {
    titulo: "Decisiones apoyadas en datos",
    estadoActual: "La empresa utiliza indicadores para apoyar sus decisiones.",
    implicacion: "Permite avanzar hacia análisis más finos y metas medibles.",
    usuario: "Ya se decide con datos, lo que abre la puerta a mediciones más completas.",
  },
  "DAT.dependencia.ordenAntesDeIndicadores": {
    titulo: "Ordenar la información antes de medir",
    estadoActual:
      "Se busca decidir con indicadores mientras la información base sigue dispersa o incompleta.",
    implicacion: "Los indicadores construidos sobre datos desordenados llevan a conclusiones erróneas.",
    usuario: "Conviene ordenar primero la información y después construir indicadores.",
  },
  "DAT.informacion.parcial": {
    titulo: "Herramientas adecuadas con datos accesibles",
    estadoActual: "Las herramientas responden a las necesidades y la información es consultable.",
    implicacion: "Base útil para conectar sistemas y evitar reprocesos.",
    usuario: "Las herramientas actuales sirven y la información se encuentra sin dificultad.",
  },
  "TAL.competencias.insuficientes": {
    titulo: "Competencias digitales insuficientes",
    estadoActual:
      "Las personas no cuentan con las habilidades necesarias o los cambios no se acompañan con capacitación.",
    implicacion: "Las herramientas se usan por debajo de su capacidad y la adopción se estanca.",
    usuario: "El equipo necesita apoyo y práctica para aprovechar las herramientas disponibles.",
  },
  "TAL.cultura.solida": {
    titulo: "Cultura de aprendizaje activa",
    estadoActual: "Los equipos comparten aprendizajes y hay disposición a probar nuevas formas de trabajo.",
    implicacion: "Facilita cualquier cambio digital posterior.",
    usuario: "Hay apertura al cambio y aprendizaje compartido, un punto de apoyo importante.",
  },
  "TAL.disposicion.sinCompetencias": {
    titulo: "Disposición al cambio sin habilidades suficientes",
    estadoActual: "Existe apertura a probar cosas nuevas, pero las competencias todavía son limitadas.",
    implicacion: "La motivación puede desaprovecharse si no se acompaña con formación concreta.",
    usuario: "El equipo quiere avanzar; le falta preparación práctica para hacerlo con seguridad.",
  },
  "SEG.accesos.sinControl": {
    titulo: "Accesos a sistemas sin control",
    estadoActual: "No se controla quién puede acceder a los sistemas y a la información del negocio.",
    implicacion:
      "Es una exposición directa a fraude, fuga de información y pérdida de control operativo.",
    usuario:
      "Hoy no está claro quién puede entrar a los sistemas del negocio; es un riesgo que conviene cerrar pronto.",
  },
  "SEG.respaldo.ausente": {
    titulo: "Sin copias de respaldo confiables",
    estadoActual: "No se realizan copias de respaldo de la información importante.",
    implicacion: "Una falla o un ataque puede provocar pérdida definitiva de información del negocio.",
    usuario: "La información importante no se respalda, así que una falla podría hacerla desaparecer.",
  },
  "SEG.practicas.debiles": {
    titulo: "Prácticas básicas de seguridad poco difundidas",
    estadoActual: "El personal no conoce prácticas básicas para evitar fraudes o incidentes digitales.",
    implicacion: "La mayoría de los incidentes en pymes se originan en errores evitables.",
    usuario: "Conviene reforzar las prácticas básicas del equipo frente a fraudes digitales.",
  },
  "SEG.continuidad.ausente": {
    titulo: "Continuidad operativa sin definir",
    estadoActual: "No hay claridad sobre cómo continuar operando ante una falla tecnológica.",
    implicacion: "Una interrupción prolongada afectaría ventas, atención y cumplimiento de compromisos.",
    usuario: "Si un sistema falla, no hay un plan claro para seguir operando.",
  },
  "SEG.base.solida": {
    titulo: "Controles básicos de seguridad presentes",
    estadoActual: "Existen control de accesos y copias de respaldo de la información.",
    implicacion: "Reduce de forma significativa la exposición a incidentes.",
    usuario: "Los controles básicos de seguridad están cubiertos.",
  },
  "CONS.contradiccion": {
    titulo: "Respuestas incompatibles entre sí",
    estadoActual: "Dos respuestas del diagnóstico describen situaciones que no pueden coexistir.",
    implicacion:
      "Reduce la confianza de las conclusiones de esta dimensión: conviene revisar la evidencia antes de decidir.",
    usuario:
      "Detectamos respuestas que se contradicen. Revisarlas mejorará la precisión del diagnóstico.",
  },
};

export function mensajeDe(clave: string): MensajeHallazgo {
  return (
    mensajes[clave] ?? {
      titulo: clave,
      estadoActual: "Hallazgo sin texto asociado en el catálogo de mensajes.",
      implicacion: "Debe completarse la clave de mensaje correspondiente.",
      usuario: "Hallazgo detectado sin descripción disponible.",
    }
  );
}
