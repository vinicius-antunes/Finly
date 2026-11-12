from backup_helpers import restore_backup
import re
"""Direct Home startup, failure recovery and persistence in real Chromium."""
import functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;ART=ROOT/'docs/startup-evidence';ART.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
spy="""window.v2Writes=[];const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='finly-v2')v2Writes.push(v);return original.call(this,k,v)}"""
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  ctx=b.new_context(viewport={'width':1440,'height':1000},locale='pt-BR');ctx.add_init_script("localStorage.setItem('saldoclaro-v1','original legado intocado');"+spy)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);page.get_by_role('heading',name='Visão geral',exact=True).wait_for()
  assert page.evaluate('v2Writes.length')==1
  assert page.locator('.home-balance>strong').inner_text().replace('\xa0',' ')=='R$ 0,00'
  assert all(t.replace('\xa0',' ')=='R$ 0,00' for t in page.locator('.home-indicator strong').all_text_contents())
  assert page.locator('.home-reserve>strong').inner_text().replace('\xa0',' ')=='R$ 0,00'
  assert page.get_by_text('Ativar Finly funcional',exact=True).count()==0
  assert page.locator('a[href*="legacy"]').count()==0 and page.locator('.home-intro').count()==0
  assert page.get_by_role('button',name='Mês anterior',exact=True).count()==0 and page.get_by_role('button',name='Próximo mês',exact=True).count()==0
  page.get_by_label('Competência',exact=True).fill('2024-01');assert page.get_by_label('Competência',exact=True).input_value()=='2024-01';page.get_by_label('Competência',exact=True).fill('2030-12')
  page.evaluate('document.fonts.ready');page.screenshot(path=str(ART/'empty-desktop.png'),full_page=True);page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(ART/'empty-mobile.png'),full_page=True);page.set_viewport_size({'width':1440,'height':1000})
  page.get_by_role('button',name='Novo lançamento',exact=True).click();d=page.get_by_role('dialog');d.get_by_label('Descrição',exact=True).fill('Primeiro lançamento sintético');d.get_by_label(re.compile(r'^Valor.*\(R\$\)$')).fill('33');d.get_by_role('button',name='Salvar lançamento').click();d.wait_for(state='hidden');saved=page.evaluate("localStorage.getItem('finly-v2')");assert len(json.loads(saved)['transactions'])==1
  page.reload();page.get_by_role('heading',name='Lançamentos',exact=True).wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==saved and page.evaluate('v2Writes.length')==0;assert page.evaluate("localStorage.getItem('saldoclaro-v1')")=='original legado intocado'
  page.goto(url+'/#/visao-geral?competencia=2030-12');page.get_by_role('heading',name='Visão geral',exact=True).wait_for()
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(ART/f'populated-{width}.png'),full_page=True)
  # Existing valid state must not even be normalized/reformatted on startup.
  existing=b.new_context();raw=json.dumps(json.loads(saved),indent=2);existing.add_init_script(f"localStorage.setItem('finly-v2',{json.dumps(raw)});"+spy);pg=existing.new_page();pg.goto(url);pg.get_by_role('heading',name='Visão geral',exact=True).wait_for();assert pg.evaluate("localStorage.getItem('finly-v2')")==raw and pg.evaluate('v2Writes.length')==0;existing.close()
  for mode in ['corrupt','denied','quota']:
   fresh=b.new_context()
   if mode=='corrupt':fresh.add_init_script("localStorage.setItem('finly-v2','{bad');"+spy)
   if mode=='denied':fresh.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('denied')}})")
   if mode=='quota':fresh.add_init_script("const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='finly-v2')throw Error('quota');return original.call(this,k,v)}")
   pg=fresh.new_page();pg.goto(url);pg.get_by_role('heading',name='Não foi possível abrir seus dados').wait_for();assert pg.get_by_role('button',name='Novo lançamento',exact=True).count()==0
   if mode=='corrupt':
    assert pg.evaluate("localStorage.getItem('finly-v2')")=='{bad' and pg.evaluate('v2Writes.length')==0
    pg.screenshot(path=str(ART/'corrupt-recovery.png'),full_page=True)
    restore_backup(pg,saved);pg.get_by_role('heading',name='Visão geral',exact=True).wait_for();assert json.loads(pg.evaluate("localStorage.getItem('finly-v2')"))['transactions']==json.loads(saved)['transactions']
   fresh.close()
  assert not errors,errors;b.close()
 print('PASS: direct empty Home, zero indicators, exactly one initial write, CRUD reload, existing raw state unchanged, absent legacy links/intro/arrows, month selection, corrupt/denied/quota recovery and explicit backup restoration')
finally:server.shutdown();server.server_close()
