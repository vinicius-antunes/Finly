"""Current seven-route Sidebar and widget spotlight: real hover, pin, keyboard and touch."""
import functools,http.server,threading,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from visual_helpers import seed,go
ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
fixture={'version':1,'settings':{},'entries':[{'id':'synthetic-income','description':'Receita sintética','amount':100,'month':'2026-11','kind':'income','status':'received'},{'id':'synthetic-out','description':'Despesa sintética','amount':20,'month':'2026-11','kind':'out'}]}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  for theme in ['graphite','dark','light']:
   c=b.new_context(viewport={'width':1440,'height':1000});seed(c,fixture,theme);pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.mouse.move(1100,100);pg.goto(url);go(pg,'visao-geral');baseline=pg.evaluate("localStorage.getItem('finly-v2')");toggle=pg.locator('[data-sidebar=trigger]')
   def width(n):pg.wait_for_function('n=>Math.abs(document.querySelector("[data-slot=sidebar-container]").getBoundingClientRect().width-n)<.1',arg=n)
   width(60);assert pg.locator('.finance-monogram').count()==0;assert pg.locator('.finance-brand').is_hidden();pg.mouse.move(28,220);width(288);pg.get_by_role('link',name='Lançamentos',exact=True).hover();width(288);pg.mouse.move(1100,100);width(60)
   assert toggle.is_hidden();pg.keyboard.press('Control+b');width(288);assert toggle.get_attribute('aria-pressed')=='true';pg.mouse.move(28,220);pg.mouse.move(1100,100);width(288);pg.keyboard.press('Control+b');width(60)
   pg.keyboard.press('Control+b');width(288);pg.keyboard.press('Control+b');width(60);pg.get_by_role('link',name='Planejamentos',exact=True).focus();width(288);pg.keyboard.press('Enter');expect(pg.locator('main h1')).to_have_text('Meus planejamentos');go(pg,'visao-geral');card=pg.locator('.magic-card').first;before=card.get_attribute('style');card.hover(position={'x':100,'y':80});pg.wait_for_function('b=>document.querySelector(".magic-card").getAttribute("style")!==b',arg=before);card.locator('h2').evaluate('(e)=>window.getSelection().selectAllChildren(e)');assert pg.evaluate('getSelection().toString()')=='Saldo projetado';pg.evaluate('getSelection().removeAllRanges()')
   pg.emulate_media(reduced_motion='reduce');assert card.evaluate("e=>['::before','::after'].every(p=>getComputedStyle(e,p).display==='none')");assert pg.evaluate("localStorage.getItem('finly-v2')")==baseline;assert pg.evaluate('financialWrites')==[];assert not errors;c.close()
  # On a wide touch/coarse-pointer viewport, the header button is visible and pins the desktop Sidebar.
  c=b.new_context(viewport={'width':1024,'height':900},has_touch=True,reduced_motion='reduce');seed(c,fixture);pg=c.new_page();pg.goto(url);pg.locator('main h1').wait_for();toggle=pg.get_by_role('button',name='Alternar menu',exact=True)
  def width(n):pg.wait_for_function('n=>Math.abs(document.querySelector("[data-slot=sidebar-container]").getBoundingClientRect().width-n)<.1',arg=n)
  toggle.click();width(288);pg.mouse.move(20,200);pg.mouse.move(900,100);width(288);toggle.click();width(60);toggle.focus();pg.keyboard.press('Enter');width(288);pg.keyboard.press('Space');width(60);assert pg.evaluate('financialWrites')==[];c.close()
  for w in [390,768]:
   c=b.new_context(viewport={'width':w,'height':844},has_touch=True,reduced_motion='reduce');seed(c,fixture);pg=c.new_page();pg.goto(url);pg.mouse.move(20,200);assert pg.get_by_role('dialog').count()==0;toggle=pg.get_by_role('button',name='Alternar menu',exact=True);toggle.tap();d=pg.get_by_role('dialog',name='Navegação do Finly');expect(d).to_be_visible();assert d.locator('.brand-copy').is_visible()
   for key in ['Tab','Shift+Tab']*8:pg.keyboard.press(key);assert d.evaluate('(e)=>e.contains(document.activeElement)')
   pg.keyboard.press('Escape');d.wait_for(state='hidden');expect(toggle).to_be_focused();toggle.tap();d.get_by_role('link',name='Lançamentos',exact=True).tap();d.wait_for(state='hidden');expect(pg.locator('main h1')).to_have_text('Lançamentos');assert pg.locator('.entries-mobile [data-entry-id]').count()==2;toggle.tap();d.get_by_role('link',name='Planejamentos',exact=True).tap();d.wait_for(state='hidden');expect(pg.locator('main h1')).to_have_text('Meus planejamentos');assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth');assert pg.evaluate('financialWrites')==[];c.close()
  b.close()
 print('PASS: current seven routes, 60/288 hover/leave/descendants, pin/unpin, keyboard/Ctrl+B/focus, Magic Card hover/text/reduced motion, touch390/768 drawer/overlay/Escape/focus/navigation, three themes and zero financial writes after seeding')
finally:server.shutdown();server.server_close()
