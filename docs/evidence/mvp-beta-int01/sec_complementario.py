import asyncio,json,os
from playwright.async_api import async_playwright
CALL="async ([fn,data])=>{try{const f=await import('/src/lib/production/capabilities.functions.ts');return await f[fn]({data})}catch(e){return {error:String(e.message||e)}}}"
ORG='a62e562b-f282-4915-a004-b3746ec7cdcd'
F='75f65a68-54fc-458b-a5f6-06bce1c34ee7'; I='3c56e75a-4327-4d66-9ed1-9745ba0f80a5'; A='d969ce62-8561-4f2b-9afb-63e0a0e9b56f'
env=dict(l.strip().split('=',1) for l in open('/dev-server/.env') if '=' in l)
URL=env['VITE_SUPABASE_URL'].strip('"'); KEY=env['VITE_SUPABASE_PUBLISHABLE_KEY'].strip('"')
async def sess(p,f,ruta):
    m=json.load(open('/root/int01/'+f)); b=await p.chromium.launch(headless=True)
    c=await b.new_context(viewport={'width':1280,'height':1800}); pg=await c.new_page()
    await pg.goto('http://localhost:8080'); await pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[m['storage_key'],json.dumps(m['session'])])
    await pg.goto('http://localhost:8080'+ruta); await pg.wait_for_timeout(6000); return b,pg,m['session']['access_token']
async def main():
  out={}
  async with async_playwright() as p:
    b,pg,tok=await sess(p,'member.json','/capacidad/op-01')
    calls={'reviewCapabilityFinding':{'capabilityId':'OP-01','findingId':F,'decision':'CONFIRMED'},
     'createCapabilityIntervention':{'capabilityId':'OP-01','title':'QA member intento','findingId':F},
     'createCapabilityActivity':{'capabilityId':'OP-01','interventionId':I,'title':'QA member intento'},
     'changeCapabilityActivityState':{'capabilityId':'OP-01','activityId':A,'state':'EXECUTING'},
     'registerCapabilityDeliverable':{'capabilityId':'OP-01','activityId':A,'title':'QA member intento'}}
    out['memberCalls']={k:await pg.evaluate(CALL,[k,v]) for k,v in calls.items()}
    rest={}
    for t in ['findings','interventions','activities','deliverables','audit_events']:
      r=await pg.evaluate("async ([u,k,tok,t,o])=>{const own=await fetch(`${u}/rest/v1/${t}?select=id&organization_id=eq.${o}`,{headers:{apikey:k,Authorization:'Bearer '+tok}});const oth=await fetch(`${u}/rest/v1/${t}?select=id&organization_id=neq.${o}`,{headers:{apikey:k,Authorization:'Bearer '+tok}});return {own:own.status===200?(await own.json()).length:own.status,others:oth.status===200?(await oth.json()).length:oth.status}}",[URL,KEY,tok,t,ORG])
      rest[t]=r
    out['memberRestIsolation']=rest
    await b.close()
    b,pg,_=await sess(p,'owner.json','/capacidad/op-01')
    await pg.wait_for_timeout(3000)
    out['owner']={'sinSustento':await pg.get_by_test_id('hallazgo-sin-sustento').count(),'fundamentoRevision':await pg.get_by_test_id('fundamento-requiere-revision').count(),'bloquePlanesAntiguo':await pg.get_by_text('Planes de trabajo',exact=True).count(),'comprobacionTareas':await pg.get_by_test_id('comprobacion-tareas').count()}
    el=pg.get_by_test_id('diagnostico-trazable')
    if await el.count(): await el.screenshot(path='/dev-server/docs/evidence/mvp-beta-int01/c1-sin-sustento.png')
    await b.close()
  json.dump(out,open('/dev-server/docs/evidence/mvp-beta-int01/r-complementario.json','w'),indent=1,ensure_ascii=False); print(json.dumps(out,ensure_ascii=False)[:3000])
asyncio.run(main())
