import asyncio,json
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    m=json.load(open('owner.json')); b=await p.chromium.launch(headless=True)
    c=await b.new_context(viewport={'width':1280,'height':1800}); pg=await c.new_page()
    await pg.goto('http://localhost:8080'); await pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[m['storage_key'],json.dumps(m['session'])])
    await pg.goto('http://localhost:8080/capacidad/op-01'); 
    try: await pg.get_by_test_id('diagnostico-trazable').wait_for(timeout=40000)
    except Exception as e: print('nowait',e)
    print(pg.url); await pg.screenshot(path='o.png')
    el=pg.get_by_test_id('diagnostico-trazable')
    if await el.count():
      await el.scroll_into_view_if_needed(); await el.screenshot(path='/dev-server/docs/evidence/mvp-beta-int01/c1-sin-sustento.png')
    for t in ['hallazgo-sin-sustento','fundamento-requiere-revision','comprobacion-tareas']: print(t,await pg.get_by_test_id(t).count())
    print('Planes', await pg.get_by_text('Planes de trabajo',exact=True).count())
asyncio.run(main())
