import asyncio,json,os,sys
from playwright.async_api import async_playwright
STEP=sys.argv[1]
async def main():
  m=json.load(open(os.path.expanduser("~/.cache/lovable-auth/session.json")))
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True);c=await b.new_context(viewport={"width":1280,"height":1800});pg=await c.new_page()
    await pg.goto("http://localhost:8080");await pg.evaluate("([k,v])=>localStorage.setItem(k,v)",[m["storage_key"],json.dumps(m["session"])])
    await pg.goto("http://localhost:8080/capacidad/OP-05");await pg.wait_for_timeout(4000)
    try: await pg.get_by_test_id("cobertura-documental").wait_for(timeout=20000)
    except Exception as e: print("nopanel")
    txt=await pg.inner_text("body")
    print("L254_in_page:", "problema/oportunidad" in txt)
    sec=pg.get_by_test_id("cobertura-documental")
    print("panel:", await sec.count())
    if STEP in("partial","full") and await sec.count():
      await pg.get_by_role("button",name="Evaluar cobertura").click()
      descs=["Problema u oportunidad que origina el objetivo identificado","Exhaustividad del alcance declarado"]
      quotes=["El proyecto nace del problema de pedidos entregados tarde a clientes mayoristas.","La dirección declara que este es el único problema que origina el objetivo."]
      n=1 if STEP=="partial" else 2
      for i in range(n):
        await pg.get_by_label(f"Respaldo: {descs[i]}").select_option("SUPPORTED")
        await pg.get_by_label(f"Cita: {descs[i]}").fill(quotes[i])
        await pg.get_by_label(f"Justificación: {descs[i]}").fill("Confirmado por OWNER QA.")
        await sec.locator("fieldset").nth(i).get_by_role("checkbox").click()
      await pg.get_by_label("Justificación de síntesis").fill("Revisión OWNER QA E2E-OP05-01 del piloto OP-05.")
      if STEP=="full": await sec.locator("label",has_text="Declaro bajo mi responsabilidad").get_by_role("checkbox").click()
      await pg.get_by_role("button",name="Solicitar cobertura completa").click()
      await pg.wait_for_timeout(5000)
      t=await pg.inner_text("body")
      for k in ["Cobertura completa registrada","Cobertura parcial registrada","REQUIRED_COMPONENT_INCOMPLETE","Cobertura completa declarada"]: print(k, k in t)
    await pg.screenshot(path=f"{STEP}.png")
    await b.close()
asyncio.run(main())
