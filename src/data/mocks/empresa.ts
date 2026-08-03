import type { Empresa } from "@/types";

export const empresaDemo: Empresa = {
  id: "emp-demo-001",
  nombre: "Pyme Ejemplo S.A.S.",
  sector: "comercio",
  tamaño: "pequeña",
  responsable: "María González",
  correo: "maria@pymeejemplo.co",
  fechaActualizacion: new Date().toISOString(),
};
