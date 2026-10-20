import asyncio,json,requests,os
from pathlib import Path
from playwright.async_api import async_playwright
D=Path('/tmp/browser/build04');owner=json.load(open(D/'owner-session.json'));e=dict(l.strip().split('=',1) for l in open('/dev-server/.env') if '=' in l);u=e['VITE_SUPABASE_URL'].strip('"');k=e['VITE_SUPABASE_PUBLISHABLE_KEY'].strip('"');h={'apikey':k,'Authorization':'Bearer '+owner['session']['access_token'],'Content-Type':'application/json'}
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});pg=await c.new_page();await pg.goto('http://localhost:8080');await pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[owner['storage_key'],json.dumps(owner['session'])]);await pg.goto('http://localhost:8080/capacidad/DG-01');await pg.get_by_role('button',name='Registrar documento',exact=True).wait_for(timeout=60000)
  call="async ([fn,data])=>{const f=await import('/src/lib/production/capabilities.functions.ts');return await f[fn]({data})}"
  states={};states['before']=await pg.evaluate(call,['getCapabilityAssessmentState',{'capabilityId':'DG-01'}]);
  r=requests.post(u+'/rest/v1/rpc/validate_fragment_mapping',headers=h,json={'_mapping_id':'b0400000-0000-4000-8000-000000000038','_decision':'VALIDATED','_basis':'HUMAN_VALIDATION','_rule_ref':None,'_note':'BUILD04 second synthetic factual validation for variable contrast'});assert r.status_code==204
  states['admission']=await pg.evaluate(call,['processCapabilityDocumentAdmissions',{'capabilityId':'DG-01'}]);states['admitted']=await pg.evaluate(call,['getCapabilityAssessmentState',{'capabilityId':'DG-01'}]);await pg.reload();await pg.get_by_role('button',name='Registrar documento',exact=True).wait_for(timeout=60000);await pg.screenshot(path=str(D/'dg01-factual-admitted.png'))
  states['revocation']=await pg.evaluate(call,['revokeCapabilityDocumentMapping',{'capabilityId':'DG-01','mappingId':'b0400000-0000-4000-8000-000000000038','note':'BUILD04 synthetic factual variable contrast revocation'}]);states['revoked']=await pg.evaluate(call,['getCapabilityAssessmentState',{'capabilityId':'DG-01'}]);D.joinpath('factual-variable-states.json').write_text(json.dumps(states,indent=2));print('factual state keys',states['before'].keys())
  caps=await pg.evaluate("async()=>{const f=await import('/src/lib/production/capabilities.functions.ts');return await f.listAvailableCapabilities()}");results=[]
  for cap in caps['capabilities']:
   cid=cap['capabilityId'] if 'capabilityId' in cap else cap['id']
   try:
    w=await pg.evaluate(call,['getCapabilityWorkspace',{'capabilityId':cid}]);s=await pg.evaluate(call,['getCapabilityAssessmentState',{'capabilityId':cid}]);results.append({'capabilityId':cid,'workspace':w,'state':s,'hostedRead':'PASS'})
   except Exception as er: results.append({'capabilityId':cid,'hostedRead':'FAIL','error':str(er)[:500]})
  D.joinpath('31-capability-live-reads.json').write_text(json.dumps(results,indent=2));print('31 capability authenticated reads',len(results),'passed',sum(x['hostedRead']=='PASS' for x in results));await b.close()
asyncio.run(main())
