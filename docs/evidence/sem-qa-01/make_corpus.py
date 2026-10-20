"""SEM-QA-01 · corpus sintético determinista (empresa ficticia). Sin datos reales."""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import sys
OUT = sys.argv[1] if len(sys.argv) > 1 else 'docs/evidence/sem-qa-01/corpus/'
H = "SYNTHETIC_QA_ONLY · SEM-QA-01 · Documento sintético ficticio"
DOCS = {
 'SEMQA01-S1_hecho_explicito.pdf': [[
  "Informe de contexto · Cerámicas Vértice (empresa ficticia)",
  "Cerámicas Vértice crea valor fabricando vajilla de gres resistente",
  "y vendiéndola directamente a restaurantes de Medellín, con entrega en 48 horas.",
 ]],
 'SEMQA01-S2_inferencia.pdf': [[
  "Notas de la gerencia · Cerámicas Vértice (empresa ficticia)",
  "Los clientes vuelven a nosotros sobre todo porque adaptamos cada pieza al menú del chef.",
  "Ningún otro taller de la ciudad acepta pedidos de diseño a medida.",
 ]],
 'SEMQA01-S3_negacion.pdf': [[
  "Perspectivas 2027 · Cerámicas Vértice (empresa ficticia)",
  "La gerencia no prevé abrir nuevos canales ni cambiar de proveedores durante 2027.",
  "No se espera ningún cambio relevante en la operación ni en la tecnología del taller.",
 ]],
 'SEMQA01-S4_contradiccion.pdf': [[
  "Objetivos 2027 · versión A · Cerámicas Vértice (empresa ficticia)",
  "Nuestro principal objetivo para 2027 es duplicar las ventas a hoteles.",
 ], [
  "Objetivos 2027 · versión B · Cerámicas Vértice (empresa ficticia)",
  "La gerencia decidió que en 2027 la empresa dejará de vender a hoteles y no buscará crecer en ese segmento.",
 ]],
 'SEMQA01-S5_ausencia.pdf': [[
  "Turnos de limpieza de la oficina (documento ficticio)",
  "Lunes: Ana. Martes: Luis. Miércoles: Marta. Jueves: Ana. Viernes: Luis.",
  "La cafetera se descalcifica cada viernes a las cinco de la tarde.",
 ]],
}
for name, pages in DOCS.items():
    c = canvas.Canvas(OUT + name, pagesize=A4, invariant=1)
    c.setTitle(name); c.setAuthor('SEM-QA-01 synthetic'); c.setCreator('make_corpus.py')
    for i, lines in enumerate(pages, 1):
        y = 800; c.setFont('Helvetica', 10)
        for l in [f"{H} · página {i}"] + lines:
            c.drawString(50, y, l); y -= 18
        c.showPage()
    c.save()
print('ok')
