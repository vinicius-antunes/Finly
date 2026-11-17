"""Keyboard sorting, theme independence, preview modal and storage failures."""
import functools,http.server,threading,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'docs/evidence'
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,headless=True);page=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');page.goto(url+'/#playground');page.locator('.play-item').first.wait_for();initial=page.locator('.play-item>header small').all_text_contents();handle=page.get_by_role('button',name='Mover magic-card',exact=True);handle.focus();page.keyboard.press('Space');page.wait_for_timeout(150);page.keyboard.press('ArrowRight');page.wait_for_timeout(150);page.keyboard.press('Space');page.wait_for_timeout(250);assert page.locator('.play-item>header small').all_text_contents()!=initial
  page.get_by_role('button',name='Desfazer',exact=True).click();assert page.locator('.play-item>header small').all_text_contents()==initial
  for name in ['bar','line','area','donut','pie','radial','composed']:
   page.get_by_label('Adicionar componente integrado').select_option('chart-'+name)
  page.locator('.recharts-responsive-container').last.wait_for();assert page.locator('.chart').count()==8
  page.get_by_role('button',name='Capturar estado anterior').click();page.get_by_label('Arredondamento',exact=True).fill('22');page.get_by_role('button',name='Comparar antes/depois').click();assert page.get_by_role('heading',name='Antes',exact=True).is_visible()
  page.goto(url+'/#presets');page.get_by_role('combobox',name='Tema TweakCN',exact=True).select_option(index=1);assert page.locator('.preset-list').inner_text().find('TweakCN')>=0
  page.goto(url+'/#preview');page.locator('.preview-main').get_by_role('button',name='Novo lançamento',exact=True).click();modal=page.get_by_role('dialog');modal.wait_for();
  for _ in range(8):page.keyboard.press('Tab');assert modal.evaluate('(e)=>e.contains(document.activeElement)')
  page.keyboard.press('Escape');modal.wait_for(state='hidden')
  for name in ['Lançamentos','Parcelas','Cartões e contas','Planejamentos','Cofrinhos','Reembolsos','Calendário','Configurações','Novo lançamento']:
   page.get_by_title(name,exact=True).click();assert page.locator('.preview-main h2').inner_text()==name
  for mode in ['corrupt','quota']:
   c=b.new_context()
   if mode=='corrupt':c.add_init_script("localStorage.setItem('finly-ui-lab:v1','{broken')")
   else:c.add_init_script("const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='finly-ui-lab:v1')throw Error('quota');return original.call(this,k,v)}")
   pg=c.new_page();pg.goto(url);pg.locator('main h1').wait_for()
   if mode=='quota':pg.get_by_label('Arredondamento',exact=True).fill('25')
   pg.locator('.toast').wait_for()
   if mode=='corrupt':assert pg.evaluate("localStorage.getItem('finly-ui-lab:v1')")=='{broken'
   c.close()
  normal=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference');np=normal.new_page();np.goto(url);np.locator('.magic-demo').wait_for();box=np.locator('.magic-demo').first.bounding_box();np.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);np.wait_for_timeout(200);np.screenshot(path=str(ART/'magic-card-motion.png'));np.locator('.inspector').get_by_text('Comportamento e modelos',exact=True).click();np.get_by_label('Animações',exact=True).uncheck();assert np.locator('.magic-demo').count()==0;normal.close()
  b.close()
 print('PASS: keyboard dnd/undo, seven chart models, snapshot comparison, TweakCN tokens, modal focus/Escape, ten preview contexts, corrupt/quota handling')
finally:server.shutdown();server.server_close()
