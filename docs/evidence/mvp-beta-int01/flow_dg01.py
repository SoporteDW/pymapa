"""Paso DG-01: carga UI → lectura determinista → aceptación OWNER → cobertura FULL (DG01-NI04-COV-1.0.0)."""
import asyncio,sys,json;sys.path.insert(0,'.');from common import *
PDF=E+'SQA_plan_estrategico_2026_2028.pdf'
Q={'Horizonte temporal':'El horizonte de este plan es de tres años, de enero de 2026 a diciembre de 2028.',
 'Ambición estratégica':'Nuestra ambición es ser el laboratorio de calibración de referencia para la industria andina.',
 'Cambios materiales previstos':'Prevemos abrir una segunda línea de calibración y certificar el laboratorio en ISO/IEC 17025.',
 'Cambios relevantes del entorno':'En el entorno esperamos una regulación metrológica más exigente y nuevos competidores importados.',
 'Exhaustividad del alcance declarado':'Este apartado recoge todos los cambios relevantes previstos por la dirección para el periodo.'}
async def estado(pg):
  ws=await pg.evaluate(CALL,['getCapabilityWorkspace',{'capabilityId':'DG-01'}])
  return {'pending':[t['acquisitionId'] for t in ws['workspace']['pendingInformationTasks']],'counts':ws['workspace']['counts']}
async def main():
  async with async_playwright() as p:
    b,pg=await abrir(p,'owner-c.json','/capacidad/DG-01'); out={}
    await pg.get_by_role('button',name='Registrar documento',exact=True).wait_for(timeout=90000)
    out['before']=await estado(pg)
    panel=pg.locator('[data-testid="documentos-gobernados"]')
    await pg.set_input_files('input[aria-label="Archivo de evidencia"]',PDF)
    await pg.get_by_role('button',name='Registrar documento',exact=True).click()
    await panel.locator('li',has_text='SQA_plan_estrategico').first.wait_for(timeout=30000)
    await panel.locator('li',has_text='SQA_plan_estrategico').first.get_by_role('button',name='Leer documento de prueba').click()
    prop=pg.locator('[data-proposal-id]',has_text='El horizonte de este plan').first
    await prop.wait_for(timeout=60000); out['mappingId']=mid=await prop.get_attribute('data-proposal-id')
    out['afterCandidate']=await estado(pg); await pg.screenshot(path=E+'dg01-1-candidate.png')
    await prop.get_by_role('button',name='Aceptar propuesta').click(); await prop.get_by_role('button',name='Revocar').wait_for(timeout=60000)
    out['afterValidated']=await estado(pg)
    li=pg.locator(f'[data-mapping-id="{mid}"]'); await li.get_by_role('button',name='Evaluar cobertura').click()
    fs=li.locator('fieldset')
    for i,(k,q) in enumerate(Q.items()):
      await li.get_by_label('Respaldo: '+k).select_option('SUPPORTED'); await li.get_by_label('Cita: '+k).fill(q)
      await li.get_by_label('Justificación: '+k).fill('La cita sintética declara explícitamente este componente.'); await fs.nth(i).get_by_role('checkbox').click()
    await li.get_by_label('Justificación de síntesis').fill('OWNER QA: el apartado 02 cubre los cinco componentes del criterio DG01-NI04-COV-1.0.0.')
    await li.locator('label',has_text='Declaro bajo mi responsabilidad').get_by_role('checkbox').click()
    await li.get_by_role('button',name='Solicitar cobertura completa').click()
    await li.get_by_text('Cobertura completa declarada',exact=True).wait_for(timeout=30000)
    out['afterFull']=await estado(pg); await pg.screenshot(path=E+'dg01-2-full.png')
    json.dump(out,open(E+'r-dg01.json','w'),indent=1,ensure_ascii=False); print(json.dumps(out,ensure_ascii=False)[:1500]); await b.close()
asyncio.run(main())
