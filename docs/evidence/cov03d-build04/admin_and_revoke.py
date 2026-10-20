import asyncio,json,requests,os,uuid,copy,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from playwright.async_api import async_playwright
D=Path('/tmp/browser/build04');admin=json.load(open(os.path.expanduser('~/.cache/lovable-auth/session.json')));D.joinpath('admin-session.json').write_text(json.dumps(admin));owner=json.load(open(D/'owner-session.json'));e=dict(l.strip().split('=',1) for l in open('/dev-server/.env') if '=' in l);u=e['VITE_SUPABASE_URL'].strip('"');k=e['VITE_SUPABASE_PUBLISHABLE_KEY'].strip('"')
def headers(m): return {'apikey':k,'Authorization':'Bearer '+m['session']['access_token'],'Content-Type':'application/json'}
def rpc(fn,data,m=admin):
 start=time.time();r=requests.post(u+'/rest/v1/rpc/'+fn,headers=headers(m),json=data);return {'status':r.status_code,'result':r.json() if r.content else None,'start':start,'end':time.time()}
def read(t,q,m=admin):
 r=requests.get(u+'/rest/v1/'+t,headers=headers(m),params=q);r.raise_for_status();return r.json()
mid='b0400000-0000-4000-8000-000000000014';out={};d=json.load(open(D/'full-declaration.json'));d.update(expectedRevision=2,requestId=str(uuid.uuid4()),targetScope='PARTIAL');out['adminPartial']=rpc('set_structured_acquisition_coverage',{'_declaration':d});d.update(expectedRevision=3,requestId=str(uuid.uuid4()),targetScope='FULL');out['adminFull']=rpc('set_structured_acquisition_coverage',{'_declaration':d})
retry=copy.deepcopy(d);retry.update(expectedRevision=4,requestId=str(uuid.uuid4()))
with ThreadPoolExecutor(2) as ex:
 fs=[ex.submit(rpc,'set_structured_acquisition_coverage',{'_declaration':retry}),ex.submit(rpc,'revoke_fragment_mapping',{'_mapping_id':mid,'_note':'BUILD04 simultaneous governed QA revocation'},owner)];out['concurrentRevocation']=[f.result() for f in fs]
out['postRevokeRetry']=rpc('set_structured_acquisition_coverage',{'_declaration':d});out['idempotentRevoke']=rpc('revoke_fragment_mapping',{'_mapping_id':mid,'_note':'BUILD04 simultaneous governed QA revocation'},owner)
out['mappingAfter']=read('fragment_mappings',{'id':'eq.'+mid,'select':'id,status,coverage_scope,coverage_revision'});out['decisions']=read('coverage_decisions',{'mapping_id':'eq.'+mid,'select':'id,revision,result','order':'revision'});out['audit']=read('audit_events',{'subject_id':'eq.'+mid,'select':'event_type,subject_id,actor_user_id,detail,created_at','order':'created_at'})
# Org B partial decision enables a positive RLS read and cross-org empty read.
mb='b0400000-0000-4000-8000-000000000046';out['orgBValidation']=rpc('validate_fragment_mapping',{'_mapping_id':mb,'_decision':'VALIDATED','_basis':'HUMAN_VALIDATION','_rule_ref':None,'_note':'BUILD04 synthetic QA B OWNER human validation'})
db=copy.deepcopy(d);db.update(mappingId=mb,expectedRevision=0,requestId=str(uuid.uuid4()),targetScope='PARTIAL',componentEvaluations=[],humanConfirmedCompleteness=False);out['orgBPartial']=rpc('set_structured_acquisition_coverage',{'_declaration':db});out['ownerCrossOrgDecisions']=read('coverage_decisions',{'organization_id':'eq.b0400000-0000-4000-8000-000000000001','select':'id'},owner);out['orgBPositiveDecisions']=read('coverage_decisions',{'organization_id':'eq.b0400000-0000-4000-8000-000000000001','select':'id'})
# No privileged criterion modifications: RLS negatives and post-state checks.
for name,path,body in [('promote','coverage_criteria_catalog?criteria_version=eq.CM05-P101-COV-1.0.0',{'approval_status':'APPROVED'}),('directFull','fragment_mappings?id=eq.'+mid,{'coverage_scope':'FULL'})]:
 r=requests.patch(u+'/rest/v1/'+path,headers=headers(admin),json=body);out[name]={'status':r.status_code,'result':r.json() if r.content else None}
out['catalogCounts']={s:len(read('coverage_criteria_catalog',{'approval_status':'eq.'+s,'select':'criteria_version'})) for s in ['APPROVED','PILOT_TEST_GOVERNED','PROPOSED']}
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});pg=await c.new_page();await pg.goto('http://localhost:8080');await pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[owner['storage_key'],json.dumps(owner['session'])]);await pg.goto('http://localhost:8080/capacidad/CM-05');await pg.get_by_role('button',name='Registrar documento',exact=True).wait_for(timeout=60000)
  await pg.screenshot(path=str(D/'cm05-revoked.png'));D.joinpath('cm05-revoked.txt').write_text(await pg.locator('body').inner_text())
  for cap in ['CM-05','DG-01','OP-05']:
   x=await pg.evaluate("async cap=>{const f=await import('/src/lib/production/capabilities.functions.ts');return await f.getCapabilityWorkspace({data:{capabilityId:cap}})}",cap);D.joinpath(cap+'-workspace-revoked.json').write_text(json.dumps(x,indent=2))
  out['observationsBeforeFactual']=read('observations',{'assessment_id':'eq.c71d7b34-9da0-4755-8394-418172412731','select':'id,variable_ref,value'},owner)
  for mapping in ['b0400000-0000-4000-8000-000000000036','b0400000-0000-4000-8000-000000000037']:
   out['validate-'+mapping]=rpc('validate_fragment_mapping',{'_mapping_id':mapping,'_decision':'VALIDATED','_basis':'HUMAN_VALIDATION','_rule_ref':None,'_note':'BUILD04 governed synthetic human factual or thematic validation'},owner)
  call="async ([fn,data])=>{const f=await import('/src/lib/production/capabilities.functions.ts');return await f[fn]({data})}"
  for cap in ['DG-01','CM-05']:
   out['admission-'+cap]=await pg.evaluate(call,['processCapabilityDocumentAdmissions',{'capabilityId':cap}])
  out['observationsAdmitted']=read('observations',{'assessment_id':'eq.c71d7b34-9da0-4755-8394-418172412731','select':'id,variable_ref,value'},owner)
  out['factualRetry']=await pg.evaluate(call,['processCapabilityDocumentAdmissions',{'capabilityId':'DG-01'}])
  out['factualRevoke']=await pg.evaluate(call,['revokeCapabilityDocumentMapping',{'capabilityId':'DG-01','mappingId':'b0400000-0000-4000-8000-000000000036','note':'BUILD04 synthetic factual invalidation with retained lineage'}])
  out['observationsInvalidated']=read('observations',{'assessment_id':'eq.c71d7b34-9da0-4755-8394-418172412731','select':'id,variable_ref,value'},owner)
  await b.close()
asyncio.run(main());D.joinpath('admin-revoke-factual-results.json').write_text(json.dumps(out,indent=2));print('ADMIN',out['adminPartial']['status'],out['adminFull']['status'],'race',[r['status'] for r in out['concurrentRevocation']],'after',out['mappingAfter'],'cross org',len(out['ownerCrossOrgDecisions']),'orgB positive',len(out['orgBPositiveDecisions']),'factual counts',len(out['observationsBeforeFactual']),len(out['observationsAdmitted']),len(out['observationsInvalidated']))
