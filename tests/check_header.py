"""Synthetic header/toast/notification regressions in real Chromium."""
import functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from backup_helpers import restore_backup
ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'docs/header/evidence';ART.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  ctx=browser.new_context(viewport={'width':1440,'height':1000})
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url+'/#/configuracoes/backup?competencia=2026-11');page.locator('.heading h1').wait_for()
  assert page.get_by_role('button',name='Alternar menu',exact=True).is_hidden()
  page.mouse.move(25,350);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288")
  page.mouse.move(1100,100);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===60")
  page.get_by_role('link',name='Lançamentos',exact=True).focus();page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288")
  page.keyboard.press('Control+b');page.locator('h1').focus();assert page.locator('[data-slot=sidebar]').get_attribute('data-state')=='expanded';page.keyboard.press('Control+b')
  raw=(ROOT/'tests/fixtures/synthetic-backup-v1.json').read_text();restore_backup(page,raw,'synthetic.json')
  toast=page.get_by_role('status').filter(has_text='Backup importado!');toast.wait_for();assert '2 lançamentos restaurados' in toast.inner_text();page.screenshot(path=str(ART/'toast-desktop.png'));toast.wait_for(state='hidden',timeout=6500)
  page.reload();page.locator('.heading h1').wait_for();assert page.locator('.success-toast').count()==0
  restore_backup(page,raw,'synthetic.json');page.get_by_role('button',name='Fechar aviso').click();page.locator('.success-toast').wait_for(state='hidden')
  before=json.loads(page.evaluate("localStorage.getItem('finly-v2')"));bell=page.get_by_role('button',name='Notificações',exact=True);bell.click();panel=page.get_by_role('dialog',name='Notificações',exact=True);panel.wait_for();assert panel.locator('.unread').count()==int(page.locator('.notification-count').inner_text());page.screenshot(path=str(ART/'notifications-desktop.png'))
  while panel.get_by_role('button',name='Marcar como lida',exact=True).count():panel.get_by_role('button',name='Marcar como lida',exact=True).first.click()
  assert page.locator('.notification-count').count()==0;page.keyboard.press('Escape');panel.wait_for(state='hidden');assert bell.evaluate('(e)=>e===document.activeElement')
  bell.click();page.mouse.click(20,500);panel.wait_for(state='hidden');bell.click();page.get_by_role('button',name='Fechar notificações').click();panel.wait_for(state='hidden')
  after=json.loads(page.evaluate("localStorage.getItem('finly-v2')"));assert before['transactions']==after['transactions'];assert before['invoiceStatuses']==after['invoiceStatuses']
  for theme in ['Graphite Green','Escuro Padrão','Claro']:
   page.goto(url+'/#/configuracoes/aparencia?competencia=2026-11');page.get_by_role('button',name=theme,exact=True).click();bell.click();panel.wait_for();page.screenshot(path=str(ART/(theme.split()[0]+'-panel.png')));page.keyboard.press('Escape');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  touch=browser.new_context(viewport={'width':390,'height':844},has_touch=True,reduced_motion='reduce');tp=touch.new_page();tp.goto(url);toggle=tp.get_by_role('button',name='Alternar menu',exact=True);toggle.tap();tp.get_by_role('dialog').wait_for();tp.keyboard.press('Escape');tp.get_by_role('dialog').wait_for(state='hidden');tp.get_by_role('button',name='Notificações',exact=True).tap();tp.get_by_role('dialog',name='Notificações').wait_for();assert tp.get_by_text('Nenhum aviso para este período.',exact=True).is_visible();assert tp.locator('.notification-count').count()==0;tp.screenshot(path=str(ART/'mobile.png'));assert tp.evaluate('document.documentElement.scrollWidth<=innerWidth');tp.keyboard.press('Escape')
  tp.set_viewport_size({'width':1200,'height':900});assert toggle.is_visible();toggle.tap();assert tp.locator('[data-slot=sidebar]').get_attribute('data-state')=='expanded'
  assert not errors,errors;touch.close();ctx.close();browser.close()
 print('PASS: hover/keyboard/shortcut, capability-based trigger, touch, import toast count/timeout/dismiss/reload, notification reads/count/close/focus, three themes, unchanged financial records')
finally:server.shutdown();server.server_close()
