import type { Empresa } from "@/types";

export const empresaDemo: Empresa = {
  id: "emp-demo-001",
  nombre: "Pyme Ejemplo S.A.S.",
  sector: "comercio",
  tamaño: "pequeña",
  responsable: "María González",
  correo: "maria@pymeejemplo.co",
  ciudad: "Medellín",
  pais: "Colombia",
  canales: ["Tienda física", "WhatsApp", "Redes sociales"],
  presenciaDigital: "basica",
  objetivoPrincipal: "vender_mas",
  sitioWeb: "https://pymeejemplo.co",
  descripcion: "Comercio minorista de productos para el hogar con atención en tienda y domicilios.",
  fechaActualizacion: new Date().toISOString(),
};

export const empresaVacia: Empresa = {
  id: "emp-nueva-001",
  nombre: "",
  sector: "comercio",
  tamaño: "micro",
  responsable: "",
  correo: "",
  ciudad: "",
  pais: "",
  canales: [],
  presenciaDigital: "",
  objetivoPrincipal: "",
  sitioWeb: "",
  descripcion: "",
  fechaActualizacion: new Date().toISOString(),
};

export const opcionesCanales = [
  "Tienda física",
  "WhatsApp",
  "Redes sociales",
  "Sitio web",
  "Tienda en línea",
  "Marketplace",
  "Llamadas telefónicas",
];

export const opcionesPresencia = [
  { valor: "ninguna", etiqueta: "Aún no tenemos presencia digital" },
  { valor: "basica", etiqueta: "Básica: redes sociales o WhatsApp" },
  { valor: "intermedia", etiqueta: "Intermedia: sitio web y canales activos" },
  { valor: "avanzada", etiqueta: "Avanzada: vendemos en línea de forma habitual" },
];

export const opcionesObjetivo = [
  { valor: "vender_mas", etiqueta: "Vender más" },
  { valor: "ordenar_operacion", etiqueta: "Ordenar la operación" },
  { valor: "atender_mejor", etiqueta: "Atender mejor a los clientes" },
  { valor: "reducir_costos", etiqueta: "Reducir costos y reprocesos" },
  { valor: "tomar_decisiones", etiqueta: "Tomar decisiones con datos" },
];
