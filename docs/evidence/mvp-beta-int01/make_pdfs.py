"""MVP-BETA-INT-01 · Genera los dos PDF sintéticos (empresa ficticia, sin datos reales)."""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import sys
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
EMP = "Sensores y Calibración Andina S.A.S. (empresa ficticia)"

def doc(nombre, titulo, paginas):
    c = canvas.Canvas(f"{OUT}/{nombre}", pagesize=A4)
    for n, bloques in enumerate(paginas, start=1):
        y = 800
        if n == 1:
            c.setFont("Helvetica-Bold", 13); c.drawString(50, y, titulo); y -= 18
            c.setFont("Helvetica", 9); c.drawString(50, y, f"{EMP} · Documento de prueba SYNTHETIC_QA_ONLY · versión 1"); y -= 28
        for encabezado, lineas in bloques:
            c.setFont("Helvetica-Bold", 11); c.drawString(50, y, encabezado); y -= 16
            c.setFont("Helvetica", 10)
            for l in lineas:
                c.drawString(50, y, l); y -= 14
            y -= 14
        c.setFont("Helvetica", 8); c.drawString(50, 40, f"Página {n}")
        c.showPage()
    c.save()

doc("SQA_plan_estrategico_2026_2028.pdf", "Plan estratégico 2026–2028", [
    [("01 · Presentación", ["Sensores y Calibración Andina fabrica y calibra sensores de presión para plantas industriales.",
                            "La empresa tiene 38 personas y opera desde Medellín."]),
     ("02 · Horizonte, ambición y cambios esperados", [
        "El horizonte de este plan es de tres años, de enero de 2026 a diciembre de 2028.",
        "Nuestra ambición es ser el laboratorio de calibración de referencia para la industria andina.",
        "Prevemos abrir una segunda línea de calibración y certificar el laboratorio en ISO/IEC 17025.",
        "En el entorno esperamos una regulación metrológica más exigente y nuevos competidores importados.",
        "Este apartado recoge todos los cambios relevantes previstos por la dirección para el periodo."])],
    [("03 · Seguimiento", ["La gerencia revisa el avance del plan cada trimestre con el comité directivo."])],
])
doc("SQA_manual_operativo_calibracion.pdf", "Manual operativo · Proceso de calibración final", [
    [("01 · Alcance del proceso", ["El proceso cubre la calibración final de sensores antes del despacho al cliente.",
                                   "Se calibran en promedio 420 sensores al mes."])],
    [("02 · Dependencia de conocimiento individual", [
        "La calibración final de los sensores la realiza únicamente Marta Ruiz, técnica sénior.",
        "No existe un procedimiento escrito y nadie más conoce los ajustes finales.",
        "Si ella no está disponible, la entrega de pedidos se detiene hasta su regreso."]),
     ("03 · Registros", ["Los certificados de calibración se archivan en la carpeta compartida de calidad."])],
])
print("ok")
