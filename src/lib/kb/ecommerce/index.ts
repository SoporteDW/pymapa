/**
 * Knowledge Pack · E-commerce POC v0.1
 *
 * Base de conocimiento experimental: preguntas, variables, condicionales,
 * reglas, hallazgos, recomendaciones, perfil tecnológico y dataset DEMO.
 * La interfaz consume este objeto a través del evaluador; nunca al contrario.
 * Una versión posterior (v0.2) se sustituye aquí, en un único punto.
 */

import type { KnowledgePack } from "../tipos";
import { condicionales } from "./condicionales";
import { datasetDemo } from "./dataset-demo";
import { hallazgos } from "./hallazgos";
import { perfilTecnologico } from "./perfil-tecnologico";
import { preguntas } from "./preguntas";
import { recomendaciones } from "./recomendaciones";
import { reglas } from "./reglas";

export const knowledgePackEcommerce: KnowledgePack = {
  id: "kb-ecommerce",
  nombre: "Diagnóstico Inteligente · E-commerce",
  version: "0.1.0",
  estado: "experimental",
  fuentes: [
    {
      codigo: "SRC-TEC-01",
      fuente: "Matriz de evaluación Plataforma Tecnológica e-commerce V2021",
      uso: "Lógica inicial de adecuación tecnológica; requiere actualización de variables, pesos y catálogo.",
    },
    {
      codigo: "SRC-SS-01",
      fuente: "Digiway Growth Framework · Social Selling Field Kit",
      uso: "Capacidad comercial digital: señales, diagnóstico, contenido, confianza, conversación, gestión y medición.",
    },
    {
      codigo: "SRC-CRO-01",
      fuente: "E-commerce Checklist",
      uso: "Auditoría CRO/UX del journey transaccional: 304 verificaciones agrupadas por etapas.",
    },
    {
      codigo: "SRC-PM-01",
      fuente: "Ficha Discovery, Propuesta Funcional, Acta de Inicio y matrices Digiway",
      uso: "Conversión de hallazgos y recomendaciones en iniciativas gestionables y trazables.",
    },
  ],
  dominios: [
    {
      id: "EC",
      etiqueta: "Contexto del canal",
      proposito: "Determinar el estado, el modelo comercial y la relevancia del canal digital.",
    },
    {
      id: "TEC",
      etiqueta: "Tecnología",
      proposito:
        "Determinar preliminarmente qué perfil de solución tecnológica requiere la empresa.",
    },
    {
      id: "SS",
      etiqueta: "Social Selling",
      proposito:
        "Evaluar si las interacciones digitales se convierten en oportunidades gestionables: Detectar → Comprender → Aportar → Respaldar → Conversar → Gestionar → Aprender.",
    },
    {
      id: "CRO",
      etiqueta: "CRO / UX",
      proposito:
        "Revisar a alto nivel el journey transaccional y determinar si se requiere auditoría especializada.",
    },
  ],
  preguntas,
  condicionales,
  hallazgos,
  recomendaciones,
  reglas,
  perfilTecnologico,
  datasetDemo,
};

export { preguntas, condicionales, hallazgos, recomendaciones, reglas, datasetDemo };
