import asyncio,json,os,requests,uuid,copy,time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from playwright.async_api import async_playwright
D=Path('/tmp/browser/build04');m=json.load(open(D/'owner-session.json'));e=dict(l.strip().split('=',1) for l in open('/dev-server/.env') if '=' in l);u=e['VITE_SUPABASE_URL'].strip('"');k=e['VITE_SUPABASE_PUBLISHABLE_KEY'].strip('"');h={'apikey':k,'Authorization':'Bearer '+m['session']['access_token'],'Content-Type':'application/json'}
def read(t,params):
 r=requests.get(u+'/rest/v1/'+t,headers=h,params=params);r.raise_for_status();return r.json()
def rpc(fn,data):
 start=time.time();r=requests.post(u+'/rest/v1/rpc/'+fn,headers=h,json=data);return {'status':r.status_code,'result':r.json() if r.content else None,'start':start,'end':time.time()}
mid='b0400000-0000-4000-8000-000000000014'
d=read('coverage_decisions',{'mapping_id':'eq.b0300000-0000-4000-8000-000000000014','select':'declaration','order':'revision.desc','limit':1})[0]['declaration'];d.update(mappingId=mid,expectedRevision=0,requestId=str(uuid.uuid4()))
out={};out['validation']=rpc('validate_fragment_mapping',{'_mapping_id':mid,'_decision':'VALIDATED','_basis':'HUMAN_VALIDATION','_rule_ref':None,'_note':'BUILD04 synthetic QA OWNER validation of independent candidate.'})
partial=copy.deepcopy(d);partial['componentEvaluations']=partial['componentEvaluations'][:-1];out['partial']=rpc('set_structured_acquisition_coverage',{'_declaration':partial});d['expectedRevision']=1;d['requestId']=str(uuid.uuid4());d2=copy.deepcopy(d);d2['requestId']=str(uuid.uuid4())
with ThreadPoolExecutor(2) as ex: out['parallelDifferentKeys']=list(ex.map(lambda x:rpc('set_structured_acquisition_coverage',{'_declaration':x}),[d,d2]))
full=read('fragment_mappings',{'id':'eq.'+mid})[0];D.joinpath('full-declaration.json').write_text(json.dumps(full['coverage_evaluation']['declaration']))
active=full['coverage_evaluation']['declaration']
with ThreadPoolExecutor(2) as ex: out['parallelSameKey']=list(ex.map(lambda x:rpc('set_structured_acquisition_coverage',{'_declaration':x}),[active,active]))
D.joinpath('owner-pre-revoke.json').write_text(json.dumps(out,indent=2))
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});pg=await c.new_page();errs=[];pg.on('pageerror',lambda er:errs.append(str(er)))
  await pg.goto('http://localhost:8080');await pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[m['storage_key'],json.dumps(m['session'])]);await pg.goto('http://localhost:8080/capacidad/CM-05');
  try: await pg.get_by_role('button',name='Registrar documento',exact=True).wait_for(timeout=60000)
  except Exception: pass
  D.joinpath('cm05-full.txt').write_text(await pg.locator('body').inner_text());await pg.screenshot(path=str(D/'cm05-full.png'));print('loaded',await pg.get_by_role('button',name='Registrar documento',exact=True).count(),'page errors',len(errs))
  if await pg.get_by_label('Archivo de evidencia').count():
   D.joinpath('BUILD04-synthetic.txt').write_text('DOCUMENTO SINTETICO QA BUILD04.\nPagina 1. Los momentos criticos son entrega y reclamos. Fallar en entrega es lo mas grave. El alcance es completo para este caso sintetico.\n')
   await pg.get_by_label('Archivo de evidencia').set_input_files(str(D/'BUILD04-synthetic.txt'));await pg.get_by_label('Referencia o título').fill('QA BUILD04 documento sintético nuevo');await pg.get_by_role('button',name='Registrar documento',exact=True).click();await pg.wait_for_timeout(6000);await pg.screenshot(path=str(D/'document-upload.png'));D.joinpath('document-upload.txt').write_text(await pg.locator('body').inner_text())
  # Exact generated RPC function, not an internal HTTP URL.
  for cap in ['CM-05','DG-01','OP-05']:
   try:
    res=await pg.evaluate("async cap=>{const f=await import('/src/lib/production/capabilities.functions.ts');return await f.getCapabilityWorkspace({data:{capabilityId:cap}})}",cap);D.joinpath(cap+'-workspace-full.json').write_text(json.dumps(res,indent=2));print(cap,'workspace read')
   except Exception as er: out[cap+'-workspaceError']=str(er)[:500]
  out['pageErrors']=errs;await b.close()
asyncio.run(main())
D.joinpath('owner-results.json').write_text(json.dumps(out,indent=2));print(json.dumps({key:[x['status'] for x in v] if isinstance(v,list) else v['status'] for key,v in out.items() if key in ['validation','partial','parallelDifferentKeys','parallelSameKey']}))
