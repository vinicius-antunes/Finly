#!/usr/bin/env python3
"""Production-build UI checks; optional Python Playwright + system Chromium.
Fixtures exist only in disposable browser contexts, never in production code.
"""
import functools
import hashlib
import http.server
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
ART=Path('/tmp/finly-react-regression')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
fixture={'version':1,'settings':{},'entries':[
 {'id':'synthetic-income','description':'Receita sintética','amount':100,'month':'2026-11','kind':'income'},
 {'id':'synthetic-out','description':'Despesa sintética','amount':20,'month':'2026-11','kind':'out'},
 {'id':'synthetic-credit','description':'Compra sintética','amount':30,'month':'2026-11','kind':'credit'},
 {'id':'synthetic-refund','description':'Reembolso sintético','amount':5,'month':'2026-11','kind':'reimbursement','status':'received'},
 {'id':'synthetic-promised','description':'Reembolso previsto','amount':99,'month':'2026-11','kind':'reimbursement','status':'planned'}]}
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  context=browser.new_context(viewport={'width':1440,'height':900})
  context.add_init_script("""window.financialWrites=[];
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k==='saldoclaro-v1'||k==='finly-v2') window.financialWrites.push(k);return original.call(this,k,v)};
  """)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);assert page.locator('html').get_attribute('data-theme')=='graphite'
  assert page.locator('.summary-card').count()==4
  assert page.evaluate('financialWrites')==[]
  page.screenshot(path=str(ART/'after-empty-desktop.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(ART/'after-empty-mobile.png'),full_page=True)
  page.set_viewport_size({'width':1440,'height':900})
  page.evaluate('(d)=>localStorage.setItem("saldoclaro-v1",JSON.stringify(d))',fixture)
  page.reload();page.locator('input[type="month"]').fill('2026-11')
  baseline=page.evaluate('localStorage.getItem("saldoclaro-v1")')
  for theme,label in [('graphite','Graphite Green'),('dark','Escuro Padrão'),('light','Claro')]:
   page.get_by_role('button',name=label,exact=True).click();page.reload()
   assert page.locator('html').get_attribute('data-theme')==theme
   page.locator('input[type="month"]').fill('2026-11')
   assert page.locator('.summary-card strong').all_text_contents()==['R$\xa0100,00','R$\xa020,00','R$\xa030,00','R$\xa05,00']
   if theme=='graphite': page.wait_for_selector('.light-rays__canvas')
   if theme!='graphite': assert page.locator('.light-rays__canvas').count()==0
   # Contrast for the semantic tokens actually applied by the theme.
   colors=page.evaluate("""() => {
     const tokens=['--text','--muted-foreground','--card','--bg','--positive','--primary','--primary-foreground'];
     const context=document.createElement('canvas').getContext('2d');
     return Object.fromEntries(tokens.map(k=>{context.clearRect(0,0,1,1);context.fillStyle=getComputedStyle(document.documentElement).getPropertyValue(k).trim();context.fillRect(0,0,1,1);return [k,Array.from(context.getImageData(0,0,1,1).data).slice(0,3)]}));
   }""")
   def luminance(rgb):
    channels=[c/255 for c in rgb]
    return sum(c*w for c,w in zip([c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in channels],[.2126,.7152,.0722]))
   for fg,bg in [('--text','--bg'),('--muted-foreground','--card'),('--positive','--card'),('--primary-foreground','--primary')]:
    a,b=sorted([luminance(colors[fg]),luminance(colors[bg])]);assert (b+.05)/(a+.05)>=4.5,(theme,fg,bg)
   page.locator('h1').click()
   for w,h in [(1440,900),(1366,768),(768,1024),(390,844)]:
    page.set_viewport_size({'width':w,'height':h})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(theme,w)
    if w in (1440,390): page.screenshot(path=str(ART/f'{theme}-{w}.png'),full_page=True)
   page.set_viewport_size({'width':1440,'height':900})
   if theme=='graphite':
    page.locator('.magic-card').first.hover()
    assert page.locator('.magic-card').first.get_attribute('data-active')=='true'
    page.screenshot(path=str(ART/'aurora-hover.png'),full_page=True)
    page.get_by_label('Efeitos de luz').uncheck();assert page.locator('.light-rays__canvas').count()==0
    page.get_by_label('Efeitos de luz').check()
   page.get_by_role('button',name='Lançamentos',exact=True).click()
   assert page.locator('tbody tr').count()==5
   page.get_by_role('button',name='Planejamentos',exact=False).click();assert 'Metas múltiplas' in page.locator('main').inner_text()
   page.get_by_role('button',name='Visão geral',exact=True).click()
   assert page.evaluate('localStorage.getItem("saldoclaro-v1")')==baseline
   assert page.evaluate('financialWrites')==[]
  # Keyboard, reduced motion and touch keep content available without animation.
  page.emulate_media(reduced_motion='reduce');page.get_by_role('button',name='Graphite Green',exact=True).click()
  assert page.locator('.light-rays__canvas').count()==0
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement !== document.body')
  # Production legacy assets and origin are preserved; do not load its writing JS into this context.
  for asset in ['legacy/index.html','legacy/assets/theme.js','legacy/assets/aurora.css']:
   response=page.request.get(url+'/'+asset);assert response.status==200
   assert hashlib.sha256(response.body()).digest()==hashlib.sha256((ROOT/'public'/asset).read_bytes()).digest()
  assert page.locator('a[href="/legacy/"]').count()>=1
  assert not errors,errors
  context.close()
  for raw in ['{bad',None]:
   ctx=browser.new_context(reduced_motion='reduce',has_touch=True,viewport={'width':390,'height':844})
   if raw: ctx.add_init_script(f'localStorage.setItem("saldoclaro-v1",{json.dumps(raw)})')
   pg=ctx.new_page();pg.goto(url)
   if raw: assert pg.get_by_role('alert').first.is_visible();assert pg.evaluate('localStorage.getItem("saldoclaro-v1")')==raw
   else: assert pg.locator('.info-banner[role="status"]').is_visible()
   assert pg.locator('.light-rays__canvas').count()==0
   ctx.close()
  ctx=browser.new_context()
  ctx.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')}})")
  pg=ctx.new_page();pg.goto(url);pg.get_by_role('button',name='Claro',exact=True).click()
  assert pg.locator('html').get_attribute('data-theme')=='light'
  assert pg.get_by_role('alert').first.is_visible()
  ctx.close()
  # Preserve both existing React preference and legacy light fallback.
  for key,value in [('finly-react-theme','dark'),('finly-theme','light')]:
   ctx=browser.new_context();ctx.add_init_script(f'localStorage.setItem({json.dumps(key)},{json.dumps(value)})')
   pg=ctx.new_page();pg.goto(url);assert pg.locator('html').get_attribute('data-theme')==value;ctx.close()
  # GPU unavailable: official component leaves static CSS background intact.
  ctx=browser.new_context()
  ctx.add_init_script("HTMLCanvasElement.prototype.getContext=function(){return null}")
  pg=ctx.new_page();gpuerrors=[];pg.on('pageerror',lambda e:gpuerrors.append(str(e)));pg.goto(url)
  assert pg.locator('.balance-hero').is_visible();assert not gpuerrors
  ctx.close();browser.close()
 print('PASS: three themes, preference, money invariance, four viewports, hover, reduced motion, touch, invalid/denied storage, WebGL fallback and legacy build; nine screenshots.')
finally:
 server.shutdown();server.server_close()
