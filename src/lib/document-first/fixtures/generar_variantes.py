import subprocess,re,sys
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
def txt(p): return subprocess.run(["pdftotext","-layout",p,"-"],capture_output=True,text=True).stdout
def write(pages,out):
    c=canvas.Canvas(out,pagesize=A4)
    for pg in pages:
        y=800
        for line in pg.split("\n"):
            line=re.sub(r"\s{2,}","   ",line.strip())
            if not line: continue
            c.setFont("Helvetica",8); c.drawString(40,y,line[:150]); y-=12
            if y<40: c.showPage(); y=800
        c.showPage()
    c.save()
U="/mnt/user-uploads/"
d1=txt(U+"MO-DOC-01_Expediente_Empresarial_Sintetico_v2.pdf").split("\f")
full="\f".join(d1)
# remove sections 06 and 08
def drop(sec_start, sec_end, s): return re.sub(r"\n\s*"+sec_start+r" ·.*?(?=\n\s*"+sec_end+r" ·)","\n",s,flags=re.S)
mod=drop("06","07",full); mod=drop("08","09",mod)
write([p for p in mod.split("\f") if p.strip()],"pdfs/MO-DOC-01_sin_06_08.pdf")
otra="""Panadería La Espiga | Expediente
01 · Ficha
La Espiga es una mediana empresa de alimentos. Sector: manufactura.
Opera una tienda física y una tienda en línea con pedidos semanales.
02 · Operación
Se realizan copias de respaldo diarias verificadas por el responsable de sistemas."""
write([otra],"pdfs/otra_empresa.pdf")
d2=txt(U+"MO-DOC-02_Plan_Mejora_Comercial_Sintetico_v2.pdf")
m2=d2.replace("Matriz días 1–7; diseño días 8–14; validación días 15–20","Matriz días 1–12; diseño días 13–25; validación días 26–40")
m2=re.sub(r"\n\s*Actividad 3\s+Probar cambios con usuarios[^\n]*","",m2)
write([p for p in m2.split("\f") if p.strip()],"pdfs/MO-DOC-02_modificado.pdf")
print("ok")
