"""Direct empty activation, failures and concurrent tabs; synthetic data only."""
import functools,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'docs/new-entry/improvement-01-evidence';ART.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  for custom in [False,True]:
   c=b.new_context(viewport={'width':1440,'height':1000});page=c.new_page();page.goto(url);page.get_by_role('heading',name='Visão geral',exact=True).wait_for()
   if custom:page.evaluate("localStorage.setItem('finly-react-theme','light');let s=JSON.parse(localStorage.getItem('finly-v2'));s.settings.cardLabel='Cartão personalizado';localStorage.setItem('finly-v2',JSON.stringify(s))");page.reload();page.get_by_role('heading',name='Visão geral',exact=True).wait_for()
   before=json.loads(page.evaluate("localStorage.getItem('finly-v2')"));other=c.new_page();other.goto(url);other.get_by_role('heading',name='Visão geral',exact=True).wait_for()
   page.get_by_role('button',name='Novo lançamento',exact=True).click();d=page.get_by_role('dialog');d.get_by_role('tab',name='Despesa',exact=True).wait_for()
   assert d.get_by_text('Preparar Novo lançamento',exact=True).count()==0
   assert d.get_by_role('tab').count()==5
   after=page.evaluate("localStorage.getItem('finly-v2')");state=json.loads(after);assert state['settings']==before['settings'];assert state['transactions']==[]
   assert all(not v for v in state['entryLedger'].values() if isinstance(v,list))
   other.get_by_role('button',name='Novo lançamento',exact=True).click();other.get_by_role('dialog').get_by_role('tab',name='Despesa',exact=True).wait_for();assert other.evaluate("localStorage.getItem('finly-v2')")==after
   if not custom:page.screenshot(path=str(ART/'empty-direct-form-desktop.png'));page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(ART/'empty-direct-form-mobile.png'))
   page.reload();page.get_by_role('heading',name='Visão geral',exact=True).wait_for();page.get_by_role('button',name='Novo lançamento',exact=True).click();page.get_by_role('dialog').get_by_role('tab',name='Despesa',exact=True).wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==after
   d=page.get_by_role('dialog');d.get_by_role('button',name='Cancelar',exact=True).click()
   for route in ['lancamentos','fatura','reembolsos','planejamentos']:
    page.goto(url+'/#/'+route+'?competencia=2026-11');page.get_by_role('button',name='Novo lançamento',exact=True).click();d=page.get_by_role('dialog');d.get_by_role('tab',name='Despesa',exact=True).wait_for();assert d.get_by_role('tab',selected=True).count()==1;d.get_by_role('button',name='Cancelar',exact=True).click();assert page.evaluate("localStorage.getItem('finly-v2')")==after
   c.close()
  c=b.new_context();page=c.new_page();page.goto(url);page.get_by_role('heading',name='Visão geral',exact=True).wait_for();before=page.evaluate("localStorage.getItem('finly-v2')");page.evaluate("Storage.prototype.setItem=function(k,v){if(k==='finly-v2')throw Error('quota')}");page.get_by_role('button',name='Novo lançamento',exact=True).click();page.get_by_role('dialog').get_by_role('alert').wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==before;c.close();b.close()
 print('PASS: empty/custom settings, five tabs, no migration prompt, reload, two tabs, quota failure; desktop/mobile evidence')
finally:server.shutdown();server.server_close()
