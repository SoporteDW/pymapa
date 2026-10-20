"""Paso OP-01: carga UI → lectura determinista → aceptación (admisión factual) → Engine real → revisión → acción humana → revocación."""
import asyncio,sys,json;sys.path.insert(0,'.');from common import *
PDF=E+'SQA_manual_operativo_calibracion.pdf'
async def estado(pg):
  ws=await pg.evaluate(CALL,['getCapabilityWorkspace',{'capabilityId':'OP-01'}])
  d=await pg.evaluate(CALL,['getCapabilityDiagnosis',{'capabilityId':'OP-01'}]) if True else None
  return {'counts':ws['workspace']['counts'],'findings':[(f.get('findingRef'),f.get('lifecycleState')) for f in (d or {}).get('findings',[])]}
async def main():
  async with async_playwright() as p:
    b,pg=await abrir(p,'owner-c.json','/capacidad/op-01'); out={}
    pg.on('console',lambda m: m.type=='error' and print('console',m.text[:200]))
    await pg.get_by_role('button',name='Registrar evidencia').wait_for(timeout=90000)
    card=pg.locator('div.rounded-lg, div',has=pg.get_by_text('Adjuntar evidencia',exact=True)).last
    radios=pg.locator('[id^="ev-"]'); out['tipoEvidencia']=await pg.locator('label[for^="ev-"]').first.inner_text(); await radios.first.click()
    await pg.set_input_files('#archivo-evidencia',PDF); await pg.fill('#referencia-evidencia','SQA_manual_operativo_calibracion.pdf')
    await pg.get_by_role('button',name='Registrar evidencia').click()
    panel=pg.locator('[data-testid="documentos-gobernados"]')
    btn=panel.get_by_role('button',name='Leer documento de prueba').first; await btn.wait_for(timeout=30000); await btn.click()
    prop=pg.locator('[data-proposal-id]',has_text='OP01-P11').first; await prop.wait_for(timeout=60000)
    out['mappingId']=await prop.get_attribute('data-proposal-id'); out['quote']=await prop.locator('blockquote').inner_text()
    hall=pg.locator('[data-testid="capa-hallazgos"]'); out['hallazgosAntes']=await hall.inner_text()
    await pg.screenshot(path=E+'op01-1-candidate.png')
    await prop.get_by_role('button',name='Aceptar propuesta').click(); await prop.get_by_role('button',name='Revocar').wait_for(timeout=60000)
    await pg.reload(); await hall.wait_for(timeout=60000); await pg.wait_for_timeout(3000)
    out['hallazgosAdmitido']=await hall.inner_text(); await pg.screenshot(path=E+'op01-2-hallazgos.png')
    await hall.get_by_role('button',name='Confirmar hallazgo').first.click(); await pg.wait_for_timeout(4000)
    acc=pg.locator('[data-testid="capa-acciones"]')
    await acc.get_by_role('button',name='Formular una acción para H04').click()
    await pg.fill('#acc-titulo','Documentar el procedimiento de calibración crítico'); await pg.fill('#acc-motivo','La empresa decide reducir la dependencia de una sola persona.')
    await pg.fill('#acc-actividad','Redactar instructivo paso a paso'); await pg.fill('#acc-resp','Jefe de laboratorio (ficticio)'); await pg.fill('#acc-plazo','2026-03-31')
    await acc.get_by_role('button',name='Registrar acción').click(); await acc.get_by_text('Redactar instructivo paso a paso').wait_for(timeout=30000)
    out['acciones']=await acc.inner_text(); out['recomendaciones']=await pg.locator('[data-testid="capa-recomendaciones"]').inner_text()
    await pg.screenshot(path=E+'op01-3-accion.png')
    await prop.get_by_role('button',name='Revocar').click(); await prop.get_by_text('Revocada').wait_for(timeout=60000)
    await pg.reload(); await hall.wait_for(timeout=60000); await pg.wait_for_timeout(3000)
    out['hallazgosRevocado']=await hall.inner_text(); out['accionesRevocado']=await acc.inner_text()
    await pg.screenshot(path=E+'op01-4-revocado.png')
    json.dump(out,open(E+'r-op01.json','w'),indent=1,ensure_ascii=False); print(json.dumps(out,ensure_ascii=False)[:3500]); await b.close()
asyncio.run(main())
