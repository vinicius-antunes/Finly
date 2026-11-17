"""Synthetic empty-state monthly picker interaction in real Chromium."""
import functools,http.server,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'docs/new-entry/improvement-03-evidence';ART.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True);page=b.new_page(viewport={'width':1440,'height':1000},locale='pt-BR');page.goto(f'http://127.0.0.1:{server.server_port}/#/visao-geral?competencia=2026-11');page.get_by_role('heading',name='Visão geral',exact=True).wait_for();before=page.evaluate("localStorage.getItem('finly-v2')")
  def open():page.get_by_label('Mês de referência',exact=True).click();return page.get_by_role('dialog',name='Selecionar mês e ano',exact=True)
  for i,m in enumerate(['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],1):
   d=open();d.get_by_role('button',name=f'{m} de 2026',exact=True).click();assert f'competencia=2026-{i:02}' in page.url
  d=open();d.get_by_role('button',name='Próximo ano').click();assert '2026-12' in page.url;d.get_by_role('button',name='Janeiro de 2027',exact=True).click();assert '2027-01' in page.url
  d=open();page.keyboard.press('Escape');d.wait_for(state='hidden');assert page.get_by_label('Mês de referência',exact=True).evaluate('(e)=>e===document.activeElement')
  for theme in ['graphite','dark','light']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   for width in [1440,390]:
    page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});d=open();assert d.locator('.month-grid button').count()==12;assert d.evaluate('(e)=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}')
    page.wait_for_timeout(250);page.screenshot(path=str(ART/f'{theme}-{width}.png'));page.keyboard.press('Escape')
  assert page.evaluate("localStorage.getItem('finly-v2')")==before
  d=open();d.get_by_role('button',name='Mês atual',exact=True).click();assert page.evaluate("location.hash.includes(new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'))")
  page.get_by_role('button',name='Novo lançamento',exact=True).click();dialog=page.get_by_role('dialog').filter(has=page.get_by_role('tab',name='Despesa',exact=True));dialog.wait_for();dates=dialog.locator('input[type=date]').count();assert dates>0
  dialog.get_by_label('Mês de referência',exact=True).click();picker=page.get_by_role('dialog',name='Selecionar mês e ano',exact=True);picker.get_by_role('button',name='Ano anterior').click();page.keyboard.press('Escape');assert dialog.is_visible();assert dialog.locator('input[type=date]').count()==dates
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');b.close()
 print('PASS: 12 months, year navigation, December/January, URL, current month, Escape/focus, three themes/two widths, modal/full dates, no financial writes')
finally:server.shutdown();server.server_close()
