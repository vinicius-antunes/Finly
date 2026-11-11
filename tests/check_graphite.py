#!/usr/bin/env python3
"""Synthetic only, production build, before/after + dynamic evidence."""
import functools, http.server, json, sys, threading, base64, tempfile, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'docs/graphite/evidence';ART.mkdir(parents=True,exist_ok=True)
BEFORE='--before' in sys.argv
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
fixture={'version':1,'settings':{},'entries':[
 {'id':'synthetic-income','description':'Projeto sintético','amount':1000,'month':'2026-11','kind':'income','category':'Trabalho','status':'received'},
 {'id':'synthetic-food','description':'Mercado sintético','amount':260,'month':'2026-11','kind':'out','category':'Alimentação','status':'received'},
 {'id':'synthetic-transit','description':'Transporte sintético','amount':140,'month':'2026-11','kind':'out','category':'Transporte'},
 {'id':'synthetic-credit','description':'Compra sintética','amount':500,'month':'2026-11','kind':'credit','category':'Estudo'},
 {'id':'synthetic-refund','description':'Reembolso sintético','amount':75,'month':'2026-11','kind':'reimbursement','status':'received'},
 {'id':'synthetic-promised','description':'Reembolso previsto sintético','amount':25,'month':'2026-11','kind':'reimbursement','status':'planned'}]}
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  for theme,label in [('graphite','Graphite Green'),('dark','Escuro Padrão'),('light','Claro')]:
   ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR')
   ctx.add_init_script(f"localStorage.setItem('saldoclaro-v1',JSON.stringify({json.dumps(fixture)}));localStorage.setItem('finly-react-theme','{('aurora' if theme=='graphite' else theme)}');")
   page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   recorder=None; frames=[]; temporary=None
   if not BEFORE and theme=='graphite':
    temporary=tempfile.TemporaryDirectory(prefix='finly-video-'); recorder=ctx.new_cdp_session(page)
    def record_frame(event):
     target=Path(temporary.name)/f'{len(frames):05d}.jpg';target.write_bytes(base64.b64decode(event['data']))
     frames.append((target,event['metadata']['timestamp']))
     recorder.send('Page.screencastFrameAck',{'sessionId':event['sessionId']})
    recorder.on('Page.screencastFrame',record_frame)
    recorder.send('Page.startScreencast',{'format':'jpeg','quality':75,'maxWidth':1440,'maxHeight':1000,'everyNthFrame':2})
   page.goto(f'http://127.0.0.1:{server.server_port}');page.locator('input[type="month"]').fill('2026-11')
   if not BEFORE:
    assert page.locator('html').get_attribute('data-theme')==theme
   page.evaluate('document.fonts.ready')
   if not BEFORE: page.wait_for_selector('.recharts-sector')
   page.locator('h1').click()
   for w,h,name in [(1440,1000,'desktop'),(390,844,'mobile')]:
    page.set_viewport_size({'width':w,'height':h})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(ART/f'{"before" if BEFORE else "after"}-{theme}-{name}.png'),full_page=True)
   if BEFORE: ctx.close();continue
   baseline=page.evaluate("localStorage.getItem('saldoclaro-v1')")
   assert page.locator('.summary-card strong').all_text_contents()==['R$\xa01.000,00','R$\xa0400,00','R$\xa0500,00','R$\xa075,00']
   assert page.locator('.recharts-sector').count()==2
   assert page.locator('.category-legend').inner_text().count('260,00')==1
   assert page.locator('.category-legend').inner_text().count('140,00')==1
   bar=page.get_by_role('progressbar')
   assert bar.get_attribute('aria-valuenow')=='7500' and bar.get_attribute('aria-valuemax')=='10000'
   assert page.locator('[tremor-id="tremor-raw"]').count()==1
   for width,height in [(1366,768),(768,1024)]:
    page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.set_viewport_size({'width':1440,'height':1000})
   if theme=='graphite':
    page.wait_for_selector('.light-rays__canvas')
    page.locator('.magic-card').first.hover();page.wait_for_timeout(200)
    assert page.locator('.magic-card').first.get_attribute('data-active')=='true'
    page.locator('input[type="month"]').fill('2026-12')
    page.wait_for_function("document.querySelector('.period-morph').getAttribute('aria-label')==='dezembro de 2026'")
    page.wait_for_timeout(500)
    assert page.locator('.recharts-sector').count()==0
    assert 'Sem despesas' in page.locator('.category-panel').inner_text()
    page.locator('input[type="month"]').fill('2026-11');page.wait_for_timeout(500)
    page.emulate_media(reduced_motion='reduce');page.wait_for_function("!document.querySelector('.light-rays__canvas')")
    page.locator('input[type="month"]').fill('2026-12')
    page.wait_for_function("document.querySelector('.period-morph').textContent.replace(/\\s/g,' ').includes('dezembro de 2026')")
    page.locator('input[type="month"]').fill('2026-11');page.emulate_media(reduced_motion='no-preference')
   assert page.evaluate("localStorage.getItem('saldoclaro-v1')")==baseline
   assert not errors,errors
   if recorder:
    recorder.send('Page.stopScreencast')
    recorder.remove_listener('Page.screencastFrame',record_frame)
    listing=Path(temporary.name)/'frames.txt'
    listing.write_text(''.join(f"file '{p}'\nduration {max(.04,min(1,(frames[i+1][1]-t) if i+1<len(frames) else .1))}\n" for i,(p,t) in enumerate(frames)))
    subprocess.run(['ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing),'-vf','scale=1440:1000:force_original_aspect_ratio=decrease,pad=1440:1000:(ow-iw)/2:(oh-ih)/2,format=yuv420p','-c:v','libvpx-vp9','-crf','38','-b:v','0',str(ART/'interactions-graphite.webm')],check=True)
    temporary.cleanup()
   ctx.close()
  browser.close()
 print('PASS: comparable synthetic captures', 'before' if BEFORE else 'after')
finally:
 server.shutdown();server.server_close()
