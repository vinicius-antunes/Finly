"""Matched before/after captures and typography/reflow checks; synthetic data only."""
import functools,http.server,json,subprocess,threading,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];stage='before' if '--before' in sys.argv else 'after';ART=ROOT/'docs/new-entry/improvement-05-evidence';ART.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
raw=subprocess.check_output(['node','--input-type=module','-e',"import {syntheticReimbursementState} from './tests/fixtures/reimbursement-ledger.mjs';console.log(JSON.stringify(syntheticReimbursementState()))"],cwd=ROOT,text=True).strip();measurements=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  for theme in ['graphite','dark','light']:
   c=b.new_context(viewport={'width':1440,'height':900},locale='pt-BR',reduced_motion='reduce');c.add_init_script('if(!localStorage.getItem("finly-v2"))localStorage.setItem("finly-v2",'+json.dumps(raw)+');localStorage.setItem("finly-react-theme",'+json.dumps(theme)+');');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   for route in ['visao-geral','lancamentos','fatura','reembolsos','parcelas','planejamentos','configuracoes/financeiro','configuracoes/backup']:
    page.goto(url+'/#/'+route+'?competencia=2026-11');page.locator('main h1').wait_for();page.evaluate('document.fonts.ready')
    for w,h in [(1920,1080),(1440,900),(1366,768),(1024,900),(768,1024),(390,844),(360,800)]:
     page.set_viewport_size({'width':w,'height':h});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,route,w)
     if route=='visao-geral' and w>=1366:
      bottom=page.locator('.executive-dashboard').evaluate('(e)=>e.getBoundingClientRect().bottom');measurements.append({'theme':theme,'width':w,'height':h,'dashboardBottom':bottom});assert bottom<=h+1,(stage,theme,w,bottom)
     if route in ['visao-geral','planejamentos','parcelas'] and w in [1440,390]:page.screenshot(path=str(ART/f'{stage}-{theme}-{route}-{w}.png'),full_page=True)
    if stage=='after':
     page.set_viewport_size({'width':720,'height':900});page.evaluate("document.documentElement.style.fontSize='200%'");assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('text zoom',theme,route);page.evaluate("document.documentElement.style.fontSize=''")
   page.goto(url+'/#/lancamentos?competencia=2026-11');page.get_by_role('button',name='Novo lançamento',exact=True).click();d=page.get_by_role('dialog');d.wait_for()
   for w,h in [(1440,900),(1366,768),(390,844),(360,800)]:
    page.set_viewport_size({'width':w,'height':h});assert d.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1');assert d.get_by_role('button',name='Salvar lançamento',exact=True).evaluate('(e)=>e.getBoundingClientRect().bottom<=innerHeight')
    if w in [1440,390]:page.screenshot(path=str(ART/f'{stage}-{theme}-form-{w}.png'))
   if stage=='after':assert d.locator('h2').evaluate('(e)=>parseFloat(getComputedStyle(e).letterSpacing)>=-0.3')
   assert json.loads(page.evaluate("localStorage.getItem('finly-v2')"))==json.loads(raw);assert not errors,errors;c.close()
  b.close()
 (ART/f'{stage}-measurements.json').write_text(json.dumps(measurements,indent=2)+'\n');print('PASS',stage,': 3 themes, 8 pages, 7 widths, matching captures, compact dashboard, form, unchanged finance; after includes 200% root text size')
finally:server.shutdown();server.server_close()
