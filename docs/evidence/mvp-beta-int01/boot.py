import asyncio,sys,json;sys.path.insert(0,'.');from common import *
async def main():
  async with async_playwright() as p:
    b,pg=await abrir(p,'owner-c.json','/capacidad/DG-01'); await pg.get_by_role('button',name='Registrar documento',exact=True).wait_for(timeout=90000)
    print(json.dumps(await pg.evaluate(CALL,['getCapabilityContext',{'capabilityId':'DG-01'}]))); await b.close()
asyncio.run(main())
