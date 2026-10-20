import asyncio,json,os,re
from playwright.async_api import async_playwright
async def main():
  m=json.load(open(os.path.expanduser("~/.cache/lovable-auth/session.json")))
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True);pg=await (await b.new_context(viewport={"width":1280,"height":1800})).new_page()
    await pg.goto("http://localhost:8080");await pg.evaluate("([k,v])=>localStorage.setItem(k,v)",[m["storage_key"],json.dumps(m["session"])])
    await pg.goto("http://localhost:8080/capacidad/OP-05");await pg.wait_for_timeout(9000)
    t=await pg.inner_text("body");print(re.findall(r"\d+ con respuesta · \d+ de \d+[^\n]*",t)); print("L254 pending:", "problema/oportunidad;" in t.split("Requerimientos de información pendientes")[1].split("Cobertura documental")[0] if "Requerimientos de información pendientes" in t else "n/a")
    await pg.screenshot(path=os.environ.get("N","c")+".png");await b.close()
asyncio.run(main())
