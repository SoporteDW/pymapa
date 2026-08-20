/**
 * Persistencia del conocimiento por empresa.
 *
 * Las respuestas pertenecen a la empresa/cliente, no a la ejecución del
 * formulario (principio P-01: preguntar una vez, utilizar muchas veces).
 * Cada empresa tiene su propio registro y las iniciativas creadas conservan
 * la trazabilidad de origen del pack.
 */

import type { IniciativaKB, RegistroEmpresaKB, RespuestasKB } from "./tipos";

export const CLAVE_KB = "pymapa:kb-ecommerce:v1";
const VERSION_ALMACEN = 1;

interface AlmacenKB {
  version: number;
  empresas: Record<string, RegistroEmpresaKB>;
}

function almacenVacio(): AlmacenKB {
  return { version: VERSION_ALMACEN, empresas: {} };
}

function disponible(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function leerAlmacen(): AlmacenKB {
  if (!disponible()) return almacenVacio();
  try {
    const bruto = window.localStorage.getItem(CLAVE_KB);
    if (!bruto) return almacenVacio();
    const datos = JSON.parse(bruto) as Partial<AlmacenKB>;
    if (!datos || typeof datos !== "object" || typeof datos.empresas !== "object") {
      return almacenVacio();
    }
    return { version: VERSION_ALMACEN, empresas: datos.empresas ?? {} };
  } catch (error) {
    console.warn("No se pudo leer el conocimiento local de la empresa:", error);
    return almacenVacio();
  }
}

function guardarAlmacen(almacen: AlmacenKB): boolean {
  if (!disponible()) return false;
  try {
    window.localStorage.setItem(CLAVE_KB, JSON.stringify(almacen));
    return true;
  } catch (error) {
    console.warn("No se pudo guardar el conocimiento local de la empresa:", error);
    return false;
  }
}

export function registroVacio(companyId: string, companyName: string): RegistroEmpresaKB {
  return {
    companyId,
    companyName,
    respuestas: {},
    esDemo: false,
    actualizadoEn: new Date().toISOString(),
    iniciativas: [],
  };
}

/** Recupera el conocimiento ya declarado por la empresa (o un registro vacío). */
export function leerRegistro(companyId: string, companyName: string): RegistroEmpresaKB {
  const existente = leerAlmacen().empresas[companyId];
  if (!existente) return registroVacio(companyId, companyName);
  return {
    ...registroVacio(companyId, companyName),
    ...existente,
    respuestas: existente.respuestas ?? {},
    iniciativas: Array.isArray(existente.iniciativas) ? existente.iniciativas : [],
  };
}

export function guardarRegistro(registro: RegistroEmpresaKB): boolean {
  const almacen = leerAlmacen();
  almacen.empresas[registro.companyId] = {
    ...registro,
    actualizadoEn: new Date().toISOString(),
  };
  return guardarAlmacen(almacen);
}

export function guardarRespuestas(
  companyId: string,
  companyName: string,
  respuestas: RespuestasKB,
  extra?: { esDemo?: boolean; datasetDemoId?: string }
): RegistroEmpresaKB {
  const registro = leerRegistro(companyId, companyName);
  const actualizado: RegistroEmpresaKB = {
    ...registro,
    companyName,
    respuestas,
    esDemo: extra?.esDemo ?? registro.esDemo,
    ...(extra?.datasetDemoId !== undefined
      ? { datasetDemoId: extra.datasetDemoId }
      : registro.datasetDemoId !== undefined
        ? { datasetDemoId: registro.datasetDemoId }
        : {}),
    actualizadoEn: new Date().toISOString(),
  };
  guardarRegistro(actualizado);
  return actualizado;
}

export function agregarIniciativa(
  companyId: string,
  companyName: string,
  iniciativa: IniciativaKB
): RegistroEmpresaKB {
  const registro = leerRegistro(companyId, companyName);
  const sinDuplicado = registro.iniciativas.filter(
    (i) => i.origen.recomendacionId !== iniciativa.origen.recomendacionId
  );
  const actualizado: RegistroEmpresaKB = {
    ...registro,
    iniciativas: [...sinDuplicado, iniciativa],
    actualizadoEn: new Date().toISOString(),
  };
  guardarRegistro(actualizado);
  return actualizado;
}

export function limpiarRegistro(companyId: string, companyName: string): RegistroEmpresaKB {
  const vacio = registroVacio(companyId, companyName);
  guardarRegistro(vacio);
  return vacio;
}
