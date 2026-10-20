import asyncio,json,subprocess
from playwright.async_api import async_playwright
m=json.load(open('orgb-owner-session.json'));AS='5a64a7f8-016e-4e75-8510-556901fba203';MID='ee961093-44b8-449e-aef6-3023b4ff1dd3'
def q(s): return subprocess.run(['psql','-Atc',s],capture_output=True,text=True).stdout.strip().splitlines()
def snap(): return {'responses':q(f"select id||'|'||acquisition_ref||'|'||md5(payload::text) from responses where assessment_id='{AS}' order by created_at"),
 'observations':q(f"select id||'|'||variable_ref||'|'||md5(value::text) from observations where assessment_id='{AS}' order by created_at"),
 'mapping':q(f"select status||'|'||coverage_scope from fragment_mappings where id='{MID}'"),
 'audit':q(f"select event_type||'|'||created_at from audit_events where subject_id='{MID}' order by created_at")}
async def main():
 out={'actor':'qa.op01 (OWNER org de trabajo QA 88fb67d6)','assessment':AS,'mapping':MID,'manualResponse':'e80faf59-fcce-4429-a573-b9f9e5f11f8a','manualObservation':'f27c7d79-e3d1-4289-a101-8bb373417d7e','documentObservation':'80928de1-756c-49aa-b6ee-83d51d7aad0b'}
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});pg=await c.new_page()
  await pg.goto('http://localhost:8080');await pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[m['storage_key'],json.dumps(m['session'])]);await pg.goto('http://localhost:8080/capacidad/DG-01');await pg.wait_for_timeout(8000)
  call="async ([fn,data])=>{try{const f=await import('/src/lib/production/capabilities.functions.ts');return await f[fn]({data})}catch(e){return {error:String(e)}}}"
  out['stateBefore']=await pg.evaluate(call,['getCapabilityAssessmentState',{'capabilityId':'DG-01'}])
  out['before']=snap()
  if out['stateBefore'].get('assessmentId')==AS:
   out['revoke']=await pg.evaluate(call,['revokeCapabilityDocumentMapping',{'capabilityId':'DG-01','mappingId':MID,'note':'CIERRE CONTROLADO T3 synthetic factual revocation; manual response must persist'}])
   out['revokeRetry']=await pg.evaluate(call,['revokeCapabilityDocumentMapping',{'capabilityId':'DG-01','mappingId':MID,'note':'CIERRE CONTROLADO T3 synthetic factual revocation; manual response must persist'}])
   out['stateAfter']=await pg.evaluate(call,['getCapabilityAssessmentState',{'capabilityId':'DG-01'}])
  await pg.screenshot(path='t3-dg01-after.png');await b.close()
 out['after']=snap();open('t3-manual-preservation.json','w').write(json.dumps(out,indent=1,ensure_ascii=False))
 print('resolved',out['stateBefore'].get('assessmentId'),out['stateBefore'].get('error'))
 for x in ['stateBefore','stateAfter']:
  s=out.get(x) or {};print(x,[v for v in s.get('variableStates',[]) if v['variableRef']=='VA01'],s.get('answeredAcquisitionIds'))
 print('revoke',json.dumps(out.get('revoke'))[:300]);print('retry',json.dumps(out.get('revokeRetry'))[:200])
 print('responses same',out['before']['responses']==out['after']['responses'],'obs',len(out['before']['observations']),len(out['after']['observations']));print(out['after']['mapping'],out['after']['audit'][-3:]);print(set(out['after']['observations'])-set(out['before']['observations']))
asyncio.run(main())
