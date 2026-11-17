"""Shared header geometry and real controls; empty synthetic installation."""
import functools,http.server,threading,sys,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'docs/new-entry/improvement-06-evidence';ART.mkdir(exist_ok=True);stage='before' if '--before' in sys.argv else 'after'
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}';results=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  for theme in ['graphite','dark','light']:
   c=b.new_context(locale='pt-BR',reduced_motion='reduce');c.add_init_script('localStorage.setItem("finly-react-theme",'+json.dumps(theme)+')');page=c.new_page()
   for route in ['visao-geral','lancamentos','fatura','reembolsos','parcelas','planejamentos','configuracoes/financeiro']:
    page.goto(url+'/#/'+route+'?competencia=2026-11');page.locator('main h1').wait_for();before=page.evaluate("localStorage.getItem('finly-v2')")
    for w,h in [(1920,1080),(1440,900),(1366,768),(1024,900),(768,1024),(390,844),(360,800)]:
     page.set_viewport_size({'width':w,'height':h});a=page.locator('.home-header-actions .month-trigger').bounding_box();button=page.get_by_role('button',name='Novo lançamento',exact=True);z=button.bounding_box();same=abs(a['y']-z['y'])<2;results.append({'theme':theme,'route':route,'width':w,'month':a,'button':z})
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
     if stage=='after':
      assert abs(a['height']-z['height'])<2,(route,w,a,z)
      if w>=768:assert same,(route,w,a,z)
     if route=='planejamentos' and w in [1440,390]:page.screenshot(path=str(ART/f'{stage}-{theme}-{w}.png'),full_page=True)
     if route=='visao-geral' and w==1366:assert page.locator('.executive-dashboard').evaluate('(e)=>e.getBoundingClientRect().bottom')<=h+1
    assert page.evaluate("localStorage.getItem('finly-v2')")==before
   if stage=='after':
    page.get_by_label('Mês de referência',exact=True).click();page.locator('.month-panel:popover-open').wait_for();page.keyboard.press('Escape');page.get_by_role('button',name='Novo lançamento',exact=True).click();page.get_by_role('dialog').get_by_role('tab',name='Despesa',exact=True).wait_for();page.keyboard.press('Escape');page.get_by_role('dialog').wait_for(state='hidden');page.get_by_role('button',name='Alternar menu',exact=True).click();page.get_by_role('dialog').wait_for();page.keyboard.press('Escape')
   c.close()
  b.close()
 (ART/f'{stage}-geometry.json').write_text(json.dumps(results,indent=2));print('PASS',stage,'3 themes, 7 routes, 7 widths, geometry, overflow, dashboard; after: month/form/sidebar interactions')
finally:server.shutdown();server.server_close()
