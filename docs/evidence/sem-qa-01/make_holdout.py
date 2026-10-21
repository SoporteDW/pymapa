"""SEM-QA-01 holdout S6–S8. Never used as prompt examples. Original S1–S5 untouched."""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

OUT = Path(__file__).parent / 'corpus'
DOCS = {
    'SEMQA01-S6_inferencia.pdf': [
        'Registro del taller Aurora (empresa ficticia)',
        'Los pedidos se copian a mano de una libreta a otra.',
        'Cada semana se pierden anotaciones y se repiten entregas.',
        'El registro describe lo ocurrido; no contiene decisiones de transformación.',
    ],
    'SEMQA01-S7_explicito_equivalente.pdf': [
        'Dirección del taller Aurora (empresa ficticia)',
        'Para diciembre de 2027 buscamos vender el doble de unidades que en 2026.',
        'Queremos que ninguna entrega llegue después de la fecha acordada.',
    ],
    'SEMQA01-S8_negacion.pdf': [
        'Perspectivas del taller Aurora (empresa ficticia)',
        'Durante 2027 no prevemos abrir canales de venta adicionales.',
        'No cambiaremos el proceso de fabricación durante ese año.',
    ],
}
for name, lines in DOCS.items():
    c = canvas.Canvas(str(OUT / name), pagesize=A4, invariant=1)
    c.setTitle(name)
    c.setAuthor('SEM-QA-01 synthetic holdout')
    c.setCreator('make_holdout.py')
    c.setFont('Helvetica', 10)
    for i, line in enumerate(['SYNTHETIC_QA_ONLY · SEM-QA-01 · Documento sintético ficticio'] + lines):
        c.drawString(50, 800 - i * 18, line)
    c.showPage()
    c.save()