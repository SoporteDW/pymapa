import asyncio,json,uuid,sys
from pathlib import Path
from datetime import datetime,timezone
from playwright.async_api import async_playwright
async def main():
 root=Path('/dev-server');out=root/'docs/evidence/dec-046/hosted-final';out.mkdir(exist_ok=True);i=json.loads((root/'docs/evidence/dec-046/owner-flow.json').read_text())['input'];i['requestId']=str(uuid.uuid4());label=sys.argv[1]
 async with async_playwright() as pw:
  b=await pw.chromium.launch(headless=True);c=await b.new_context(viewport={'width':1280,'height':1800});p=await c.new_page();await p.goto('http://localhost:8080');
  if label!='anonymous':
   m=json.loads(Path('/root/.cache/lovable-auth/session.json').read_text());await p.evaluate('([k,v])=>localStorage.setItem(k,v)',[m['storage_key'],json.dumps(m['session'])]);await p.reload();await p.wait_for_timeout(2000)
  r=await p.evaluate("""async(i)=>{const f=await import('/src/lib/production/prescriptive.functions.ts');const {supabase}=await import('/src/integrations/supabase/client.ts');const {data:s}=await supabase.auth.getSession();const {data:u}=await supabase.auth.getUser();let evaluation;try{evaluation={result:await f.evaluateComplementaryPrescription({data:i,headers:s.session?{Authorization:'Bearer '+s.session.access_token}:{}})}}catch(e){evaluation={error:e.message}}const r=await supabase.from('prescriptive_decisions').select('id,emission_decision').eq('organization_id','a62e562b-f282-4915-a004-b3746ec7cdcd');return {actorId:u.user?.id??null,evaluation,rows:r.data,readError:r.error?.code??null}}""",i)
  if label=='cross-org':assert r['evaluation'].get('error')=='PRESCRIPTION_SCOPE_FORBIDDEN' and r['rows']==[]
  elif label=='member':assert r['evaluation'].get('error')=='PRESCRIPTION_ROLE_FORBIDDEN' and all(z['emission_decision']=='BLOCKED' for z in r['rows'])
  else:assert 'error' in r['evaluation'] and not r['rows']
  r.update(status='PASS',timestamp=datetime.now(timezone.utc).isoformat(),finalUrl=p.url);out.joinpath(label+'.json').write_text(json.dumps(r,indent=2));await p.screenshot(path='/tmp/browser/dec046-final/'+label+'.png');print(label,'PASS','rows',len(r['rows'] or []),'evaluation',r['evaluation']);await b.close()
asyncio.run(main())
