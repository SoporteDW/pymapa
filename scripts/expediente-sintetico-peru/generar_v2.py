"""PYM-NOV-MVP31 · Bloque 5 · Expediente sintético enriquecido (v2).

Empresa ficticia: Textiles Qhapaq S.A.C. Todo el contenido es inventado.
Parte del corpus v1 y añade anexos con líneas base, indicadores, metas,
fechas, responsables, presupuestos, resultados históricos y procesos.

Se conservan deliberadamente:
- VACÍOS: no se documenta el tiempo de sincronización entre sistemas, ni
  presupuesto de ciberseguridad, ni resultados del piloto tecnológico.
- CONTRADICCIONES entre documentos (para comprobar detección):
  * pedidos con retraso en 2025: 40 % (doc 01) vs 25 % (doc 03);
  * merma de hilado: 4 % (doc 03) vs 7 % (doc 01);
  * trabajadores: 68 (doc 01) vs 74 (doc 02).
Uso: python3 generar_v2.py <directorio>
"""
import sys
from pathlib import Path
from generar import DOCS, MARCA, generar  # noqa: F401
import generar as base

ANEXOS = {
    "01_Plan_estrategico_y_gobierno.pdf": [
        ("Anexo A · Líneas base y metas 2026", [
            "Línea base 2025: ventas digitales directas de 610 mil soles; meta 2026 de 732 mil soles al 31 de diciembre de 2026; responsable la jefa comercial.",
            "Línea base 2025: el principal comprador concentró el 44 % de las ventas; meta reducirlo al 30 % al cierre de 2026; responsable la gerente general.",
            "Línea base 2025: devoluciones por talla de 6,5 %; meta 3 % al cierre de la campaña de invierno 2026; responsable el jefe de producción.",
            "La merma de hilado reportada a gerencia en 2025 fue de 7 % del consumo anual.",
            "El presupuesto aprobado de transformación para 2026 es de 150 mil soles, revisado por el comité de gerencia cada trimestre.",
        ]),
    ],
    "02_Personas_y_conocimiento.pdf": [
        ("Anexo B · Dotación y conocimiento crítico", [
            "Según planilla de setiembre de 2026, la empresa tiene 74 trabajadores, incluidos 9 temporales de campaña.",
            "El conocimiento material es el patronaje de prendas de alpaca y la regulación de las máquinas rectilíneas; es material porque sin él no se producen muestras.",
            "Ese conocimiento está concentrado en dos personas: la patronista principal y un técnico de mantenimiento con 18 años en la empresa.",
            "La transferencia de conocimiento funciona solo en parte: existen 12 fichas de patronaje documentadas de unas 40 prendas activas.",
            "Si la patronista no está disponible, recuperar ese conocimiento tomaría alrededor de tres semanas consultando muestras físicas.",
            "Las fichas se mantienen vigentes cuando cambia un diseño, pero nadie revisa que se reutilicen en nuevas colecciones.",
        ]),
        ("Anexo C · Participación de personas afectadas", [
            "Las tejedoras resultan afectadas por el nuevo sistema de planificación porque cambiará la asignación diaria de órdenes.",
            "Necesitan esa información al menos dos semanas antes del inicio del piloto para organizar turnos.",
            "Su participación aporta valor al definir tiempos reales por prenda, y debe ocurrir antes de configurar el sistema para influir útilmente.",
            "Los problemas que plantean se registran en el acta mensual de producción; la respuesta visible se comunica en la reunión de turno.",
        ]),
    ],
    "03_Procesos_y_operaciones.pdf": [
        ("Anexo D · Indicadores operativos históricos", [
            "En 2025 el 25 % de los pedidos de exportación salió con retraso respecto de la fecha comprometida, según el registro de despachos.",
            "La merma de hilado medida en planta en 2025 fue de 4 % del consumo, según el control mensual de almacén.",
            "El tiempo promedio de muestra a pedido confirmado fue de 26 días en 2025.",
        ]),
        ("Anexo E · Articulación del flujo entre áreas", [
            "El flujo de un pedido conecta ventas, diseño, almacén de hilado, tejido, acabado y despacho; cada parte recibe la orden de la anterior.",
            "Ventas origina la información del pedido: modelo, tallas, color, cantidad y fecha; se transfiere a producción por correo y hoja de cálculo.",
            "Producción necesita además la ficha técnica y la disponibilidad de hilado, que se originan en diseño y almacén.",
            "Cuando la información se pierde o se transforma incorrectamente, por ejemplo una talla mal copiada, el error se detecta recién en acabado.",
            "El resultado queda entre dos partes sin que esté claro cómo continúa cuando un pedido cambia después de iniciado el tejido.",
            "Las situaciones entre áreas se resuelven en la reunión diaria de las 8:00 con el jefe de producción y la jefa comercial.",
        ]),
        ("Anexo F · Propósito de actividades y trabajo repetido", [
            "La doble revisión de tallas existe para proteger contra devoluciones; si dejara de hacerse aumentarían los reclamos de clientes.",
            "La razón original sigue vigente, pero el trabajo se repite porque ventas y producción copian los mismos datos en dos hojas distintas.",
            "Esa repetición ocurre en cada pedido, unas 30 veces al mes, y consume cerca de 20 horas mensuales del área administrativa.",
            "El proceso de pedido tiene once pasos relevantes, de los cuales cuatro son aprobaciones o traslados de información.",
        ]),
        ("Anexo G · Definición de la iniciativa de planificación", [
            "Problema que atiende la iniciativa: atrasos de entrega por falta de visibilidad de capacidad; beneficiario: clientes de exportación y el área de producción.",
            "Resultado observable esperado: porcentaje de pedidos entregados a tiempo medido mensualmente en el registro de despachos.",
            "Alcance incluido: planificación de tejido y acabado; excluido: contabilidad y tienda en línea; unidades afectadas: producción y ventas.",
            "Entregable: sistema configurado con órdenes de la línea de chompas; criterio de terminado: dos meses de planificación sin hoja de cálculo paralela.",
            "Cronograma: inicio en noviembre de 2026, piloto en enero de 2027 y decisión de ampliación en marzo de 2027; responsable el jefe de producción.",
        ]),
    ],
    "04_Tecnologia_y_datos.pdf": [
        ("Anexo H · Calidad de datos de pedidos y clientes", [
            "El uso de los datos de clientes está definido para cotizar, despachar y facturar; la ficha de cliente es el requisito mínimo.",
            "La completitud es parcial: de 210 clientes registrados, 64 no tienen correo ni dirección de despacho actualizada.",
            "Existen clientes duplicados en la hoja de ventas y en el sistema de facturación, por lo que la unicidad no está asegurada.",
            "La definición de pedido confirmado no es igual en ventas y producción, lo que genera interpretaciones distintas del estado.",
            "La actualidad de los datos de inventario depende de un conteo semanal; entre conteos la información puede estar desactualizada.",
        ]),
        ("Anexo I · Traspasos de información entre sistemas", [
            "Los traspasos materiales son: pedido de ventas a producción, consumo de hilado de producción a almacén y despacho a facturación.",
            "El propósito del traspaso de despacho a facturación es emitir la factura de exportación el mismo día del envío.",
            "La información requerida a veces no llega completa: falta el número de guía en uno de cada diez despachos.",
        ]),
        ("Anexo J · Evaluación de la nueva tecnología", [
            "La necesidad material está definida: planificar capacidad de tejido; el ajuste funcional se revisó con una demostración del proveedor.",
            "Las incertidumbres críticas identificadas son la carga de tiempos estándar por prenda y la adopción por las tejedoras.",
            "El experimento previsto es el piloto de un mes con la línea de chompas, diseñado para responder si los tiempos estándar son confiables.",
        ]),
    ],
    "05_Clientes_mercado_y_aliados.pdf": [
        ("Anexo K · Esfuerzo del cliente y deterioro de la relación", [
            "El cliente tiene que esforzarse demasiado para obtener algo que debería ser sencillo: conocer el estado de su pedido requiere escribir varias veces.",
            "Cuando algo sale mal, la jefa comercial llama al cliente y propone reponer prendas o descontar el flete; no hay un procedimiento escrito.",
            "Las señales de que una relación se está deteriorando son pedidos más pequeños, demoras en confirmar muestras y reclamos repetidos de talla.",
        ]),
        ("Anexo L · Uso de la solución del tercero", [
            "Necesitan saber utilizar el sistema de planificación el jefe de producción, dos supervisoras de turno y la asistente de gerencia.",
            "Hoy solo el jefe de producción lo usa realmente en la demostración; lo que impide aprovecharlo más es la falta de capacitación.",
            "La empresa necesita saber configurar órdenes y reportes; el tercero puede seguir haciendo cambios de estructura y respaldos.",
        ]),
    ],
}

DOCS_V2 = {n: (t, list(s) + ANEXOS.get(n, [])) for n, (t, s) in DOCS.items()}

if __name__ == "__main__":
    base.DOCS = DOCS_V2
    base.generar(Path(sys.argv[1] if len(sys.argv) > 1 else "expediente-v2"))
