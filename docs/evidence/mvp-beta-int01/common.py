"""MVP-BETA-INT-01 · utilidades Playwright (sesiones solo en /tmp, nunca en evidencia)."""
import json
from playwright.async_api import async_playwright
S='/tmp/int01/'; E='/dev-server/docs/evidence/mvp-beta-int01/'
CALL="async ([fn,data])=>{const f=await import('/src/lib/production/capabilities.functions.ts');return await f[fn]({data})}"
async def abrir(p, sess, ruta):
    m=json.load(open(S+sess))
    b=await p.chromium.launch(headless=True); c=await b.new_context(viewport={'width':1280,'height':1800}); pg=await c.new_page()
    await pg.goto('http://localhost:8080'); await pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[m['storage_key'],json.dumps(m['session'])])
    await pg.goto('http://localhost:8080'+ruta); return b,pg
