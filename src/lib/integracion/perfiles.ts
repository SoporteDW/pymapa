/**
 * POC-08 · Perfiles de pyme simulados (sección "Datos simulados").
 * Cinco perfiles con respuestas distintas que producen hallazgos, prioridades y
 * Roadmap diferentes. Son datos de prueba controlados: no representan a ninguna
 * empresa real y no provienen de modelos generativos.
 */

import { respuesta } from "@/lib/motor/casos-demo";
import { VALOR_NO_APLICA } from "@/lib/motor/catalogo";
import type { DiagnosticAnswer } from "@/lib/diagnostico/tipos";
import type { Empresa } from "@/types";

const PREGUNTAS_PUNTUABLES = Array.from({ length: 24 }, (_, i) => `Q${String(i + 1).padStart(2, "0")}`);

function contexto(
  tamano: string,
  sector: string,
  canales: string[],
  objetivo: string
): DiagnosticAnswer[] {
  return [
    respuesta("C01", tamano),
    respuesta("C02", sector),
    respuesta("C03", canales),
    respuesta("C04", objetivo),
  ];
}

function uniforme(valor: number, soloIds?: string[]): DiagnosticAnswer[] {
  return (soloIds ?? PREGUNTAS_PUNTUABLES).map((id) => respuesta(id, valor));
}

function sobrescribir(
  base: DiagnosticAnswer[],
  cambios: Record<string, number | string>
): DiagnosticAnswer[] {
  const mapa = new Map(base.map((r) => [r.questionId, r]));
  for (const [id, valor] of Object.entries(cambios)) {
    mapa.set(id, respuesta(id, valor));
  }
  return [...mapa.values()];
}

function empresa(datos: Omit<Empresa, "fechaActualizacion">): Empresa {
  return { ...datos, fechaActualizacion: "2026-02-01T09:00:00.000Z" };
}

export interface PerfilSimulado {
  /** Identificador estable del perfil simulado. */
  id: string;
  nombre: string;
  resumen: string;
  /** Comportamiento esperado del recorrido completo con este perfil. */
  expectativa: string;
  /** Identificador de diagnóstico usado por el motor y el Roadmap. */
  diagnosisId: string;
  /** Perfil completo del instrumento o solo una parte (diagnóstico parcial). */
  cobertura: "completa" | "parcial";
  empresa: Empresa;
  respuestas: DiagnosticAnswer[];
}

export const perfilesSimulados: PerfilSimulado[] = [
  {
    id: "PYME-01",
    nombre: "Panadería La Espiga",
    resumen: "Micronegocio de comercio con venta en tienda y pedidos por WhatsApp.",
    expectativa:
      "Madurez inicial en todas las dimensiones, prioridades críticas en fundamentos y acciones de bajo esfuerzo al inicio del Roadmap.",
    diagnosisId: "int-pyme-01",
    cobertura: "completa",
    empresa: empresa({
      id: "PYME-01",
      nombre: "Panadería La Espiga",
      sector: "comercio",
      tamaño: "micro",
      responsable: "Luz Marina Ríos",
      correo: "contacto@laespiga.demo",
      ciudad: "Bucaramanga",
      pais: "Colombia",
      canales: ["Tienda física", "WhatsApp"],
      presenciaDigital: "ninguna",
      objetivoPrincipal: "ordenar_operacion",
      descripcion: "Producción artesanal de panadería con venta directa al público.",
    }),
    respuestas: [
      ...contexto("micro", "comercio", ["presencial", "telefono"], "operacion"),
      ...sobrescribir(uniforme(1), { Q05: 2, Q19: 2, Q20: 2 }),
    ],
  },
  {
    id: "PYME-02",
    nombre: "Servitec Soluciones",
    resumen: "Empresa pequeña de servicios técnicos con agenda y facturación digitales.",
    expectativa:
      "Madurez en desarrollo, fortalezas en canales y clientes, brechas en datos e integración de procesos.",
    diagnosisId: "int-pyme-02",
    cobertura: "completa",
    empresa: empresa({
      id: "PYME-02",
      nombre: "Servitec Soluciones",
      sector: "servicios",
      tamaño: "pequeña",
      responsable: "Andrés Bermúdez",
      correo: "gerencia@servitec.demo",
      ciudad: "Medellín",
      pais: "Colombia",
      canales: ["WhatsApp", "Sitio web", "Llamadas telefónicas"],
      presenciaDigital: "intermedia",
      objetivoPrincipal: "atender_mejor",
      sitioWeb: "https://servitec.demo",
      descripcion: "Mantenimiento y soporte técnico para empresas medianas.",
    }),
    respuestas: [
      ...contexto("pequena", "servicios", ["presencial", "redes", "web"], "clientes"),
      ...sobrescribir(uniforme(3), {
        Q05: 4,
        Q06: 4,
        Q13: 4,
        Q14: 2,
        Q09: 2,
        Q11: 2,
        Q16: 2,
        Q21: 2,
      }),
    ],
  },
  {
    id: "PYME-03",
    nombre: "Metalúrgica Andes",
    resumen: "Mediana empresa de manufactura con procesos y datos estructurados.",
    expectativa:
      "Madurez avanzada, pocas brechas, prioridades medias y Roadmap orientado a optimización y medición.",
    diagnosisId: "int-pyme-03",
    cobertura: "completa",
    empresa: empresa({
      id: "PYME-03",
      nombre: "Metalúrgica Andes",
      sector: "manufactura",
      tamaño: "mediana",
      responsable: "Claudia Restrepo",
      correo: "operaciones@andes.demo",
      ciudad: "Bogotá",
      pais: "Colombia",
      canales: ["Sitio web", "Marketplace", "Llamadas telefónicas"],
      presenciaDigital: "avanzada",
      objetivoPrincipal: "tomar_decisiones",
      sitioWeb: "https://andes.demo",
      descripcion: "Fabricación de piezas metálicas para el sector industrial.",
    }),
    respuestas: [
      ...contexto("mediana", "manufactura", ["presencial", "web", "marketplace"], "eficiencia"),
      ...sobrescribir(uniforme(5), {
        Q12: 4,
        Q19: 4,
        Q23: 4,
        Q10: VALOR_NO_APLICA as unknown as number,
      }),
    ],
  },
  {
    id: "PYME-04",
    nombre: "Moda Origen",
    resumen: "Comercio de ropa que respondió solo una parte del instrumento.",
    expectativa:
      "Resultado marcado como parcial, confianza reducida, advertencias visibles y Roadmap acotado.",
    diagnosisId: "int-pyme-04",
    cobertura: "parcial",
    empresa: empresa({
      id: "PYME-04",
      nombre: "Moda Origen",
      sector: "comercio",
      tamaño: "pequeña",
      responsable: "Sofía Palacios",
      correo: "hola@modaorigen.demo",
      ciudad: "Cali",
      pais: "Colombia",
      canales: ["Tienda física", "Redes sociales", "Tienda en línea"],
      presenciaDigital: "basica",
      objetivoPrincipal: "vender_mas",
      descripcion: "Diseño y venta de prendas con producción local.",
    }),
    respuestas: [
      ...contexto("pequena", "comercio", ["presencial", "redes", "web"], "ventas"),
      ...uniforme(2, ["Q01", "Q02", "Q05", "Q06", "Q09", "Q13", "Q21"]),
    ],
  },
  {
    id: "PYME-05",
    nombre: "Logística Rápida",
    resumen: "Servicios de transporte con respuestas contradictorias entre práctica y uso real.",
    expectativa:
      "Riesgos de inconsistencia resueltos por precedencia de reglas, explicación trazable y prioridades mixtas.",
    diagnosisId: "int-pyme-05",
    cobertura: "completa",
    empresa: empresa({
      id: "PYME-05",
      nombre: "Logística Rápida",
      sector: "servicios",
      tamaño: "pequeña",
      responsable: "Jorge Iván Salas",
      correo: "coordinacion@logisticarapida.demo",
      ciudad: "Barranquilla",
      pais: "Colombia",
      canales: ["Llamadas telefónicas", "WhatsApp", "Sitio web"],
      presenciaDigital: "intermedia",
      objetivoPrincipal: "reducir_costos",
      descripcion: "Distribución urbana de última milla para comercios.",
    }),
    respuestas: [
      ...contexto("pequena", "servicios", ["presencial", "web", "telefono"], "eficiencia"),
      ...sobrescribir(uniforme(3), {
        Q08: 1,
        Q16: 5,
        Q09: 1,
        Q12: 5,
        Q21: 1,
        Q24: 5,
        Q17: 2,
      }),
    ],
  },
];

/**
 * Macroentrega 4.1 · Escenario Hero (Moda Origen).
 *
 * El caso demostrativo debe entrar con el instrumento COMPLETO: 28 de 28
 * preguntas obligatorias respondidas. La profundización posterior existe porque
 * hay prácticas incipientes y respuestas dispares, no porque falten preguntas.
 *
 * Deja abiertas exactamente tres necesidades de información: evidencia de
 * clientes y canales (D02), evidencia de tecnología y datos (D04) y una
 * aclaración de personas y cultura (D05).
 */
export const RESPUESTAS_HERO_MODA_ORIGEN: DiagnosticAnswer[] = [
  ...contexto("pequena", "comercio", ["presencial", "redes", "web"], "ventas"),
  ...sobrescribir(uniforme(3), {
    Q03: 4,
    Q05: 2,
    Q13: 2,
    Q18: 5,
    Q20: 4,
    Q24: 4,
  }),
];

export function perfilPorId(id: string): PerfilSimulado | undefined {
  return perfilesSimulados.find((p) => p.id === id);
}
