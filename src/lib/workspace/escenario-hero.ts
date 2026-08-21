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
  },
];
