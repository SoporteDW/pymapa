"""PYM-NOV-MVP31 · Expediente sintético de demostración (Perú).

Empresa ficticia: Textiles Qhapaq S.A.C. (Arequipa). Todo el contenido es
inventado para demostración; no corresponde a ninguna empresa real.
Genera 5 PDF con texto seleccionable en el directorio indicado.
"""
import sys
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

MARCA = "DOCUMENTO SINTÉTICO DE DEMOSTRACIÓN · Textiles Qhapaq S.A.C. es una empresa ficticia."

DOCS = {
    "01_Plan_estrategico_y_gobierno.pdf": ("Plan estratégico y gobierno 2026", [
        ("Modelo de negocio", [
            "Textiles Qhapaq crea valor diseñando y confeccionando prendas de alpaca y algodón pima para tiendas boutique de Estados Unidos y Europa y para su tienda propia en Arequipa.",
            "La empresa tiene 68 trabajadores, factura alrededor de 9 millones de soles al año y el 62 % de sus ventas proviene de exportación.",
            "Las principales restricciones materiales del negocio son la dependencia de dos compradores mayoristas, el capital de trabajo limitado durante la campaña de invierno y la falta de tejedoras especializadas.",
        ]),
        ("Objetivos y dirección", [
            "Los objetivos empresariales para 2026 son crecer 20 % en ventas digitales directas, reducir a 30 % la concentración del principal comprador y bajar las devoluciones por talla al 3 %.",
            "La gerencia espera realizar cambios relevantes: abrir venta en línea a Chile y México y reemplazar el control de producción en hojas de cálculo por un sistema integrado.",
            "Los cambios de clientes y mercado que pueden afectar estos objetivos son la preferencia por compras en línea, la exigencia de trazabilidad de la fibra y la presión de precios de marcas asiáticas.",
            "Los cambios competitivos y tecnológicos más materiales son la venta directa por marketplaces y la certificación de bienestar animal que piden los compradores europeos.",
            "Las restricciones y riesgos externos que condicionan la dirección son el tipo de cambio, el costo del flete aéreo y la variabilidad climática que afecta la oferta de fibra de alpaca.",
            "De lo anterior se derivan necesidades de transformación: digitalizar la planificación de producción, ordenar los datos de clientes y profesionalizar la venta directa.",
            "La transformación prevista se conecta con resultados del negocio porque permitiría entregar a tiempo la campaña de invierno y mejorar el margen de la venta directa.",
        ]),
        ("Priorización de iniciativas", [
            "Hoy compiten por atención y recursos cinco iniciativas: sistema de planificación de producción, tienda en línea internacional, certificación de fibra, capacitación de tejedoras y renovación de dos máquinas rectilíneas.",
            "Para compararlas existe información mínima: costo estimado, beneficio esperado en ventas o ahorro, plazo y responsable propuesto, registrada en una matriz del comité.",
            "Se espera que el sistema de planificación reduzca atrasos de entrega; el beneficio esperado se fundamenta en que el 40 % de los pedidos de 2025 salió con retraso.",
            "El esfuerzo y costo material del sistema de planificación se estima en 85 mil soles y cuatro meses de dedicación parcial del jefe de producción.",
            "Los recursos realmente disponibles son 150 mil soles de inversión anual y la capacidad parcial de tres personas del equipo administrativo.",
            "La decisión de prioridad que tomó el comité en marzo fue ejecutar primero la planificación de producción y luego la tienda en línea, porque la segunda depende de inventario confiable.",
            "La asignación efectiva de recursos corresponde con esa decisión: el presupuesto de 2026 asigna 85 mil soles al sistema y 40 mil soles a la tienda en línea.",
            "Las decisiones de prioridad se revisan cada trimestre en el comité de gerencia o antes si cambian las condiciones de un comprador principal.",
        ]),
        ("Responsabilidad y decisiones", [
            "Las decisiones materiales de transformación que requieren responsabilidad explícita son la elección del sistema, la apertura de nuevos mercados y la inversión en maquinaria.",
            "La gerente general, Rosa Mamani, responde por los resultados de la transformación; el jefe de producción responde por la implementación del sistema de planificación.",
            "El jefe de producción tiene autoridad para decidir cambios de procedimiento en planta, pero no puede aprobar gastos mayores a 5 mil soles sin la gerencia.",
            "Los responsables acceden a la información de ventas y producción, aunque el área comercial entrega los pronósticos con retraso.",
            "Las decisiones fuera de esos límites se escalan al comité de gerencia, que se reúne cada quince días y deja acta firmada.",
            "Cuando falta una persona clave, la responsabilidad pasa a la asistente de gerencia, pero no existe un respaldo formal para el jefe de producción.",
        ]),
        ("Seguimiento de iniciativas", [
            "Las iniciativas materiales que requieren seguimiento son la planificación de producción y la tienda en línea; su estado actual es en implementación y en diseño respectivamente.",
            "El resultado esperado del sistema es entregar a tiempo el 90 % de los pedidos; se verifica comparando la fecha comprometida con la fecha de despacho.",
            "La evidencia de resultado existente es el reporte mensual de despachos, que se compara contra la línea base de 2025.",
            "Se consideran desviaciones relevantes un atraso mayor a una semana en el cronograma o un sobrecosto mayor al 10 %.",
            "El seguimiento lo realiza el comité de gerencia cada mes y continúa seis meses después de terminada la implementación.",
        ]),
        ("Riesgos y dependencias", [
            "Las incertidumbres materiales que pueden afectar la transformación son la disponibilidad del proveedor de software y la resistencia del personal de planta.",
            "Existe dependencia material de un único consultor externo que conoce la configuración del sistema; la exposición se concentra en la campaña de invierno.",
            "La respuesta definida es documentar la configuración y capacitar a dos usuarios clave; la gerente general puede aceptar o escalar estos riesgos.",
            "Las señales de cambio de exposición son retrasos en la migración de datos y ausencias repetidas a las capacitaciones; la respuesta se revisa en cada comité mensual.",
        ]),
    ]),
    "02_Personas_y_conocimiento.pdf": ("Gestión de personas y conocimiento", [
        ("Conocimiento requerido", [
            "La organización necesita conocimiento material sobre patronaje por tallas internacionales, normas de etiquetado de exportación y comercio electrónico transfronterizo.",
            "Ese conocimiento se necesita para reducir devoluciones por talla y para abrir la tienda en línea internacional.",
            "Existe una fuente adecuada: la asociación de exportadores y un consultor de patronaje; la empresa sabe localizarlas y puede acceder dentro de los plazos de la campaña.",
            "El conocimiento externo es pertinente y confiable, aunque el personal necesita apoyo para aplicarlo en planta; el acceso es sostenible mediante un convenio anual.",
        ]),
        ("Competencias", [
            "La competencia requerida es el manejo del nuevo sistema de planificación y el tejido en máquinas rectilíneas electrónicas.",
            "Actualmente solo dos personas dominan las máquinas electrónicas; la brecha material afecta la capacidad en temporada alta.",
            "Conviene desarrollar la competencia internamente mediante aprendizaje en el puesto con una tejedora experta como guía y retroalimentación semanal.",
            "Lo aprendido se demuestra en contexto con una prueba práctica de producción; la competencia requiere refuerzo cuando cambian los modelos de temporada.",
        ]),
        ("Adopción de nuevas formas de trabajo", [
            "La nueva forma de trabajo es registrar el avance de cada orden de producción en tabletas en lugar de anotarlo en cuadernos.",
            "Deben cambiar las supervisoras de tejido y confección; comprenden qué deben hacer diferente y para qué, pero algunas no disponen todavía de tabletas.",
            "La nueva práctica se utiliza en tejido de forma consistente, mientras que en acabados todavía se usa el cuaderno cuando hay mucha carga.",
        ]),
        ("Conservación del conocimiento", [
            "El conocimiento crítico de patronaje está concentrado en la diseñadora principal; se documenta en fichas técnicas por modelo guardadas en una carpeta compartida.",
            "Las fichas se revisan al iniciar cada temporada y se comparten con las supervisoras en una reunión de lanzamiento.",
        ]),
        ("Participación y adaptación al cambio", [
            "El personal afectado por el cambio son 25 operarias de planta; el impacto material es aprender a registrar datos en tabletas.",
            "Las operarias reciben información del cambio en reuniones semanales y pueden aportar retroalimentación por medio de sus supervisoras.",
            "El feedback relevante se considera: se ajustó el formulario de registro después de las primeras dos semanas.",
            "Las barreras que emergen durante la transición son el tiempo adicional de registro y la conectividad inestable en el segundo piso.",
        ]),
    ]),
    "03_Procesos_y_operaciones.pdf": ("Manual de procesos de producción", [
        ("Proceso de producción por pedido", [
            "El proceso de producción por pedido está documentado en un procedimiento escrito de 2024, pero algunas partes dependen del juicio de cada supervisora.",
            "Las actividades incluidas son recepción del pedido, programación, compra de hilado, tejido, confección, control de calidad, empaque y despacho, en ese orden.",
            "El proceso empieza con una orden de compra confirmada y el resultado esperado es el lote empacado con su lista de empaque y factura.",
            "El responsable del proceso es el jefe de producción; participan compras, las supervisoras y almacén, y queda sin cubrir la responsabilidad por los cambios del cliente.",
            "Existe una revisión de calidad al final de confección y una aprobación de la gerencia antes de despachar pedidos de exportación.",
            "La forma de ejecutar varía en temporada alta, cuando se omite la programación formal para acelerar la producción.",
            "Si el jefe de producción no estuviera disponible, la programación se detendría porque nadie más maneja el cuadro de capacidad.",
            "La forma definida coincide parcialmente con la práctica; el procedimiento se revisó por última vez en enero de 2024.",
        ]),
        ("Organización del trabajo y recursos", [
            "Cuando el proceso funciona normalmente, el trabajo se organiza con un programa semanal que asigna máquinas y operarias según la fecha de entrega de cada pedido.",
            "En la campaña de invierno de 2025 tuvimos mucho trabajo y faltó hilado; se reprogramaron pedidos sin avisar a tiempo al cliente y se pagaron horas extra.",
        ]),
        ("Integración de extremo a extremo", [
            "En un caso reciente real, un pedido de Boston pasó por ventas, gerencia, compras, tejido, confección, calidad, almacén y la agencia de carga.",
            "La información que no puede perderse durante el recorrido son las tallas, los colores y la fecha comprometida; con frecuencia el cambio de color del cliente no llega a tejido.",
            "Los traspasos críticos son de ventas a producción y de calidad a almacén; la condición mínima para aceptar el traspaso es la ficha técnica completa.",
            "Las fallas que aparecen son demora y devolución por información incompleta de tallas.",
        ]),
        ("Simplificación y automatización", [
            "Las tareas que consumen tiempo de forma recurrente son volver a registrar los pedidos en tres hojas de cálculo distintas y conciliar el inventario de hilado cada semana.",
            "La repetición no cumple un control válido; el retrabajo se origina en información inconsistente entre ventas y producción.",
            "La aprobación de compras requiere más pasos de lo razonable: tres firmas para montos pequeños.",
            "Hemos pensado que una herramienta podría generar automáticamente la lista de empaque y la orden de compra de hilado.",
        ]),
        ("Gestión de iniciativas", [
            "La iniciativa del sistema de planificación tiene como problema los atrasos de entrega y como cambio esperado la programación digital de órdenes.",
            "El beneficiario es el área de producción y el resultado observable es el porcentaje de pedidos entregados a tiempo.",
            "Está incluido tejido y confección; está excluido el área comercial en esta primera etapa. El entregable es el sistema configurado con datos reales.",
            "El accountable es la gerente general, los responsables son el jefe de producción y el consultor; las restricciones son el presupuesto y la campaña de invierno.",
        ]),
    ]),
    "04_Tecnologia_y_datos.pdf": ("Diagnóstico interno de tecnología y datos", [
        ("Base tecnológica", [
            "Las actividades que necesitan habilitación tecnológica son la planificación de producción, la facturación electrónica y la venta en línea.",
            "Los recursos tecnológicos disponibles son doce computadoras, un sistema de facturación electrónica en la nube, hojas de cálculo compartidas y una tienda en línea básica.",
            "La facturación funciona de forma estable, pero las hojas de cálculo no proporcionan la funcionalidad requerida para planificar capacidad.",
            "La red de la planta no funciona bien bajo condiciones reales de trabajo en el segundo piso, donde la señal es inestable.",
            "Existe obsolescencia material en dos computadoras de diseño y el costo tecnológico actual es proporcional al tamaño de la empresa.",
        ]),
        ("Calidad de datos", [
            "Los datos materiales requeridos son pedidos, inventario de hilado, clientes y tiempos de producción.",
            "El inventario de hilado no siempre se captura en origen y su exactitud es baja: las diferencias con el conteo físico llegan al 15 %.",
            "Los clientes están duplicados en las hojas de ventas y facturación, con nombres escritos de forma distinta.",
        ]),
        ("Integración de información", [
            "El traspaso de pedidos de ventas a producción se hace copiando datos a mano, con pérdida de información de tallas y duplicación de registros.",
            "No hay confirmación visible de que producción recibió el cambio de un pedido.",
        ]),
        ("Información para decidir", [
            "Nos cuesta decidir cuánto hilado comprar antes de la campaña porque no tenemos suficiente información de ventas proyectadas.",
            "El reporte que usamos realmente para decidir es el resumen semanal de pedidos pendientes que prepara la asistente de gerencia.",
            "Recibimos el reporte de visitas de la tienda en línea pero no sabemos cómo interpretarlo.",
            "Las decisiones de contratación de personal temporal terminan tomándose demasiado tarde.",
            "Ventas y producción llegan a conclusiones diferentes sobre la capacidad usando los mismos datos.",
        ]),
        ("Protección y continuidad", [
            "Si mañana no estuviera disponible el sistema de facturación o la carpeta compartida de fichas técnicas, el negocio se frenaría.",
            "Sería especialmente grave que se perdieran las fichas técnicas de patronaje o que alguien no autorizado viera los precios de exportación.",
            "Cuando alguien sale de la empresa habría que quitar inmediatamente su acceso al correo, a la carpeta compartida y a la banca en línea.",
            "Si el sistema principal deja de funcionar podríamos operar unos dos días con registros en papel.",
            "No hemos comprobado que podemos recuperar la información importante desde la copia de seguridad.",
        ]),
        ("Evaluación de nuevas tecnologías", [
            "La necesidad de planificar capacidad está definida; se consideraron tres alternativas tecnológicas y una alternativa no tecnológica de contratar un planificador.",
            "Se eligió un sistema en la nube por su costo total proporcional y su ajuste al contexto operativo; el riesgo principal es la dependencia del consultor.",
            "Antes de comprometer toda la inversión se realizará un piloto de un mes con la línea de chompas.",
        ]),
    ]),
    "05_Clientes_mercado_y_aliados.pdf": ("Clientes, mercado y aliados", [
        ("Clientes y propuesta de valor", [
            "Los clientes para los que este problema es más importante son tiendas boutique que venden prendas de alpaca de origen trazable a consumidores de ingresos altos.",
            "Los clientes que más necesitan nuestra solución se diferencian por exigir lotes pequeños, diseño exclusivo y certificado de origen de la fibra.",
            "Cuando nos buscan, intentan resolver la falta de proveedores confiables de prendas de alpaca en lotes pequeños; lo sabemos por las entrevistas de la feria de Nueva York.",
            "Recientemente aprendimos que los compradores jóvenes valoran más la trazabilidad que el precio, lo que nos hizo cambiar la idea de competir por costo.",
            "Nuestros mejores clientes nos eligen por la calidad del acabado y la rapidez para producir muestras.",
            "Prometemos entregar en seis semanas, pero esa promesa cuesta mucho cumplir en la campaña de invierno.",
            "Si no existiéramos, el cliente usaría talleres de Bolivia o marcas de mezcla sintética.",
        ]),
        ("Ventas y relación comercial", [
            "Los clientes que realmente terminan comprando vienen de ferias internacionales y de recomendaciones entre tiendas.",
            "Las ventas suelen detenerse en la etapa de muestras, cuando el cliente espera más de tres semanas.",
            "Perdemos oportunidades por demoras en cotizar y por no tener catálogo actualizado en línea.",
            "Después de la primera compra hacemos una llamada de seguimiento y enviamos el catálogo de la siguiente temporada.",
        ]),
        ("Canales e interacción", [
            "Los clientes nos contactan por correo para pedidos, por WhatsApp para consultas rápidas y por la tienda en línea para compras pequeñas.",
            "Cuando un cliente cambia de canal tiene que volver a explicar todo porque no hay un registro común de conversaciones.",
            "Algunas solicitudes de WhatsApp se pierden y en el canal de Instagram nadie sabe bien quién debe responder.",
        ]),
        ("Experiencia y valor generado", [
            "El momento más grave para fallarle al cliente es la entrega de la campaña de invierno; el cliente espera recibir el lote completo y en la fecha comprometida.",
            "Los problemas que se repiten son errores de talla y retrasos de despacho; una señal de deterioro es que el cliente reduce el tamaño del pedido.",
            "Sabemos que generamos valor porque los clientes recompran; el resultado del negocio que debería cambiar es el margen de la venta directa.",
            "La línea de mantas vende mucho pero deja poco margen por el costo de la fibra.",
        ]),
        ("Proveedores y aliados", [
            "Necesitamos conseguir afuera hilado certificado, desarrollo de software y transporte internacional.",
            "Escogemos proveedores por precio, referencias y una prueba de muestra; sería indispensable la certificación de origen del hilado.",
            "Si escogemos mal al proveedor de hilado, el lote completo puede rechazarse; cambiar de proveedor después tomaría unos tres meses.",
            "De la consultora de software esperamos la configuración del sistema; la gerente general responde internamente por que esa relación funcione.",
            "Sabemos si la relación funciona bien revisando el avance contra el cronograma; los problemas se escalan a la gerente general.",
            "El sistema todavía depende del proveedor para cambios de configuración; si cambia la persona que hoy sabe manejarlo, perderíamos capacidad.",
            "Sería difícil perder mañana a la hilandería principal de Arequipa: dejaría de funcionar la producción de alpaca y solo podríamos operar dos semanas con el stock.",
            "Existe una alternativa real en una hilandería de Juliaca, pero nunca la hemos probado; la gerente general decide cuánto riesgo aceptar.",
        ]),
    ]),
}


def generar(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    estilos = getSampleStyleSheet()
    for nombre, (titulo, secciones) in DOCS.items():
        doc = SimpleDocTemplate(str(destino / nombre), pagesize=A4, title=titulo, author="Textiles Qhapaq S.A.C. (ficticia)")
        story = [Paragraph(titulo, estilos["Title"]), Paragraph(MARCA, estilos["Italic"]), Spacer(1, 12)]
        for i, (sec, parrafos) in enumerate(secciones, 1):
            story.append(Paragraph(f"{i:02d} · {sec}", estilos["Heading2"]))
            for p in parrafos:
                story.append(Paragraph(p, estilos["BodyText"]))
                story.append(Spacer(1, 4))
        doc.build(story)
        print("generado", destino / nombre)


if __name__ == "__main__":
    generar(Path(sys.argv[1] if len(sys.argv) > 1 else "expediente"))
