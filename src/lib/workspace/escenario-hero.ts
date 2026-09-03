/**
 * B5 + B6 · Escenario Hero del demo: recorrido e-commerce de punta a punta
 * sobre carrito y checkout.
 *
 * Es contenido DEMO explícito (`escenario_demo`): sirve para experimentar el
 * ciclo completo entender → ejecutar con instrumento → entregar → revisar →
 * ajustar → validar sin depender de que el usuario complete todo el recorrido.
 */

import { nombreDominio } from "@/lib/dominios/registro";
import type { PlantillaActividad } from "./tipos";

export const ESCENARIO_HERO_ID = "hero-ecommerce-checkout";

export const plantillasEscenarioHero: PlantillaActividad[] = [
  {
    id: "hero-act-01-auditoria-checkout",
    titulo: "Auditar el checkout y eliminar la fricción de cierre de compra",
    objetivo:
      "Reducir el abandono en el paso de pago identificando y corrigiendo los obstáculos concretos del checkout actual.",
    porQue:
      "El diagnóstico especializado detecta que la mayoría de las compras se pierden después de agregar al carrito: el problema no es atraer tráfico, es cerrar la venta.",
    origen: {
      tipo: "escenario_demo",
      fuente: "Escenario Hero e-commerce (demo)",
      dominioId: "D03",
      dominioNombre: nombreDominio("D03"),
      referencias: ["KB-EC-H03", "KB-CRO-R01", "EC-Q05", "EC-Q08"],
    },
    pasosSugeridos: [
      "Recorrer una compra real de principio a fin desde el celular.",
      "Anotar cada punto donde el cliente debe detenerse, decidir o volver atrás.",
    ],
    senalesProfundizacion: ["checkout", "pago", "abandono"],
    // Metadatos demostrativos equivalentes a los de una Ficha de Acción.
    esfuerzo: "alto",
    duracion: "60 días (dos mediciones de seguimiento)",
  },
  {
    id: "hero-act-02-carrito-costos",
    titulo: "Hacer visibles los costos y la continuidad de compra en el carrito",
    objetivo:
      "Que el cliente conozca el costo total y pueda editar su pedido sin perder lo que ya seleccionó.",
    porQue:
      "El costo de envío que aparece recién al final es una de las causas más frecuentes de abandono declarado.",
    origen: {
      tipo: "escenario_demo",
      fuente: "Escenario Hero e-commerce (demo)",
      dominioId: "D03",
      dominioNombre: nombreDominio("D03"),
      referencias: ["KB-EC-H02", "KB-CRO-R02", "EC-Q04"],
    },
    pasosSugeridos: [
      "Revisar qué información de costos ve el cliente antes de pagar.",
      "Definir dónde y cómo se mostrará el costo total.",
    ],
    senalesProfundizacion: ["carrito", "envío", "costos"],
    esfuerzo: "medio",
    duracion: "45 días",
  },
  {
    /**
     * Tercera Actividad del mismo diagnóstico e-commerce: la brecha de atención
     * a las consultas de compra. Existe para que el conjunto demuestre que no
     * toda brecha requiere tecnología, proveedor ni financiación.
     */
    id: "hero-act-03-atencion-consultas",
    titulo: "Acordar con el equipo comercial cómo se responde cada consulta de venta",
    objetivo:
      "Que ninguna consulta de compra quede sin respuesta: un acuerdo interno de tiempos, responsable y registro del seguimiento.",
    porQue:
      "El diagnóstico especializado muestra que las consultas de compra se responden de forma desigual y sin responsable definido: se pierden ventas de clientes ya interesados.",
    origen: {
      tipo: "escenario_demo",
      fuente: "Escenario Hero e-commerce (demo)",
      dominioId: "D03",
      dominioNombre: nombreDominio("D03"),
      referencias: ["KB-EC-H05", "KB-SS-R01", "EC-Q11"],
    },
    pasosSugeridos: [
      "Listar por dónde llegan hoy las consultas de compra y quién las responde.",
      "Acordar con el equipo un tiempo máximo de respuesta y un responsable por canal.",
    ],
    senalesProfundizacion: ["atención", "consultas", "ventas"],
    esfuerzo: "bajo",
    duracion: "30 días",
  },
];
