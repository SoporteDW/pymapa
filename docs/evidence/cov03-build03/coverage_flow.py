import asyncio,json,os,sys,requests,uuid
from pathlib import Path
from playwright.async_api import async_playwright
E=dict(l.strip().split('=',1) for l in open('/dev-server/.env') if '=' in l);U=E['VITE_SUPABASE_URL'].strip('"');K=E['VITE_SUPABASE_PUBLISHABLE_KEY'].strip('"');m=json.load(open(os.path.expanduser('~/.cache/lovable-auth/session.json')));H={'apikey':K,'Authorization':'Bearer '+m['session']['access_token'],'Content-Type':'application/json'}
qa=json.load(open('/tmp/browser/build03/qa.json'));out={}
def rpc(fn,body):
 r=requests.post(U+'/rest/v1/rpc/'+fn,headers=H,json=body);return r.status_code,(r.json() if r.content else None)
def read(t,params):
 r=requests.get(U+'/rest/v1/'+t,headers=H,params=params);r.raise_for_status();return r.json()
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});pg=await c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.goto('http://localhost:8080');await pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[m['storage_key'],json.dumps(m['session'])])
  for cap in ['CM-05','OP-05']:
   item=qa[cap];mid=item['mappingId'];d=item['declaration'];before=read('observations',{'assessment_id':'eq.c71d7b34-9da0-4755-8394-418172412731','select':'id,value'})
   await pg.goto('http://localhost:8080/capacidad/'+cap);await pg.wait_for_timeout(4500)
   li=pg.locator('[data-mapping-id="'+mid+'"]');await li.get_by_role('button',name='Evaluar cobertura').click()
   assert await pg.get_by_role('button',name='Solicitar cobertura completa').count()==1
   await pg.screenshot(path='/tmp/browser/build03/'+cap+'-authorized-editor.png');await li.get_by_role('button',name='Cancelar').click()
   partial=json.loads(json.dumps(d));partial['requestId']=str(uuid.uuid4());partial['componentEvaluations']=partial['componentEvaluations'][:-1]
   status,result=rpc('set_structured_acquisition_coverage',{'_declaration':partial});assert status==200 and result['coverageScope']=='PARTIAL',(status,result)
   await pg.reload();await pg.wait_for_timeout(3500);await pg.screenshot(path='/tmp/browser/build03/'+cap+'-partial.png')
   await li.get_by_role('button',name='Evaluar cobertura').click()
   for i,comp in enumerate(d['componentEvaluations']):
    desc=comp['componentDescription'];await pg.get_by_label('Respaldo: '+desc).select_option('SUPPORTED');await pg.get_by_label('Cita: '+desc).fill(comp['supportingQuote']);await pg.get_by_label('Justificación: '+desc).fill(comp['componentJustification']);await li.locator('fieldset').nth(i).get_by_role('checkbox').click()
   await pg.get_by_label('Justificación de síntesis').fill('BUILD03 OWNER QA verifies all pilot components and scope.')
   await li.locator('label',has_text='Declaro bajo mi responsabilidad').get_by_role('checkbox').click();await pg.get_by_role('button',name='Solicitar cobertura completa').click();await pg.wait_for_timeout(4500)
   assert await li.get_by_text('Cobertura completa declarada',exact=True).count()==1
   full=read('fragment_mappings',{'id':'eq.'+mid,'select':'coverage_scope,coverage_revision,coverage_evaluation'})[0];assert full['coverage_scope']=='FULL'
   fd=full['coverage_evaluation']['declaration'];status,retry=rpc('set_structured_acquisition_coverage',{'_declaration':fd});assert status==200 and retry['revision']==full['coverage_revision']
   await pg.screenshot(path='/tmp/browser/build03/'+cap+'-full.png')
   status,res=rpc('revoke_fragment_mapping',{'_mapping_id':mid,'_note':'BUILD03 governed synthetic QA revocation, retain history.'});assert status in (200,204),(status,res)
   await pg.reload();await pg.wait_for_timeout(3500);await pg.screenshot(path='/tmp/browser/build03/'+cap+'-revoked.png')
   after=read('observations',{'assessment_id':'eq.c71d7b34-9da0-4755-8394-418172412731','select':'id,value'});assert before==after
   out[cap]={'partial':result,'full':{'scope':full['coverage_scope'],'revision':full['coverage_revision']},'idempotentRetry':retry,'observationCountBefore':len(before),'observationCountAfter':len(after),'revoked':True,'mappingId':mid}
   print(cap,'PARTIAL → FULL (UI) → retry → revoked; observations unchanged',len(after))
  out['pageErrors']=errors;Path('/tmp/browser/build03/e2e-results.json').write_text(json.dumps(out,indent=2));await b.close()
asyncio.run(main())
