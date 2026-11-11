"""Home parity with main; synthetic fixtures and full-page Chromium captures."""
import functools,http.server,json,threading,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;ART=ROOT/'docs/home-evidence';ART.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
servers=[]
def serve(path):
 s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(path)));threading.Thread(target=s.serve_forever,daemon=True).start();servers.append(s);return f'http://127.0.0.1:{s.server_port}'
fixture={'version':1,'settings':{'salary':2000,'reserve':500,'cushion':200,'goal':1000,'installmentCap':100,'dueDay':10,'cardLabel':'Cartão sintético','includeExpectedRefunds':False},'entries':[
 {'id':'synthetic-credit','description':'Parcela sintética','amount':25,'month':'2026-11','kind':'credit','owner':'third','groupId':'synthetic-group','part':1,'parts':3,'confirmed':True},
 {'id':'synthetic-future','description':'Parcela futura sintética','amount':25,'month':'2026-12','kind':'credit','owner':'third','groupId':'synthetic-group','part':2,'parts':3,'confirmed':False},
 {'id':'synthetic-unknown','description':'Compra a conferir','amount':10,'month':'2026-11','kind':'credit','owner':'unknown','confirmed':False},
 {'id':'synthetic-out','description':'Despesa sintética','amount':100,'month':'2026-11','kind':'out','category':'Transporte','status':'planned'},
 {'id':'synthetic-income','description':'Receita sintética','amount':300,'month':'2026-11','kind':'income','status':'received'},
 {'id':'synthetic-refund','description':'Reembolso sintético','amount':25,'month':'2026-11','kind':'reimbursement','status':'planned','groupId':'synthetic-group','part':1,'parts':3}
 ],'invoiceStatuses':{'2026-11':'unpaid'},'pending':[{'id':'synthetic-pending','description':'Cobrança sem competência','amount':12,'chargedAt':'2026-11-01'}],'noticeDismissed':True}
try:
 url=serve(ROOT/'dist')
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  ctx=b.new_context(viewport={'width':1440,'height':1000},locale='pt-BR');ctx.add_init_script(f"if(!localStorage.getItem('saldoclaro-v1'))localStorage.setItem('saldoclaro-v1',JSON.stringify({json.dumps(fixture)}))")
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);original=page.evaluate("localStorage.getItem('saldoclaro-v1')")
  page.get_by_role('heading',name='Visão geral',exact=True).wait_for();page.mouse.move(25,350);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288");page.get_by_role('button',name='Ajustes e backup',exact=True).click();page.get_by_role('button',name='Importar / restaurar backup').click();page.get_by_role('button',name='Preparar migração dos dados locais').click();d=page.get_by_role('dialog').last;d.get_by_role('checkbox').check();d.get_by_role('button',name='Confirmar importação').click();page.mouse.move(25,350);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288");page.get_by_role('button',name='Visão geral',exact=True).click();page.mouse.move(1100,100)
  def nav(label,mobile=False):
   if mobile:
    page.get_by_role('button',name='Alternar menu',exact=True).click();page.get_by_role('dialog').wait_for();page.wait_for_function("document.querySelector('[role=dialog]').getAnimations().every(a=>a.playState==='finished')")
   else:page.mouse.move(25,350);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288")
   page.get_by_role('button',name=label,exact=True).click();page.mouse.move(1100,100)
  baseline=page.evaluate("localStorage.getItem('finly-v2')")
  assert page.locator('.home-balance>strong').inner_text().replace('\xa0',' ')=='R$ 1.965,00'
  assert page.locator('.home-indicator strong').all_text_contents()==['R$\xa035,00','R$\xa0100,00','R$\xa0300,00','R$\xa025,00']
  assert page.locator('.theme-panel').count()==0
  assert page.get_by_role('button',name='Mês anterior',exact=True).count()==0 and page.get_by_role('button',name='Próximo mês',exact=True).count()==0
  assert page.locator('.home-intro').count()==0 and page.locator('a[href*="legacy"]').count()==0
  assert page.get_by_role('heading',name='Fora do cartão e reembolsos').is_visible()
  for theme in ['Graphite Green','Escuro Padrão','Claro']:
   nav('Ajustes e backup');page.get_by_role('button',name=theme,exact=True).click();page.get_by_label('Efeitos de luz').uncheck();page.get_by_label('Efeitos de luz').check();nav('Visão geral');page.evaluate('document.fonts.ready')
   for w,h in [(1440,1000),(1366,768),(768,1024),(390,844)]:
    page.set_viewport_size({'width':w,'height':h});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    if w in (1440,390):
     page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(250);page.screenshot(path=str(ART/f'{theme.split()[0]}-{w}.png'),full_page=True)
    if w==1440:
     rects=page.locator('.home-primary-grid>div').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())');assert rects[0]['width']>rects[1]['width']*1.6;assert abs(rects[0]['y']-rects[1]['y'])<1
   page.set_viewport_size({'width':1440,'height':1000});assert page.evaluate("localStorage.getItem('finly-v2')")==baseline
  page.get_by_label('Competência',exact=True).fill('2026-10');assert page.locator('.home-balance>strong').inner_text().replace('\xa0',' ')=='R$ 1.800,00';page.get_by_label('Competência',exact=True).fill('2026-11')
  page.get_by_label('Status da fatura na Home').select_option('paid');state=json.loads(page.evaluate("localStorage.getItem('finly-v2')"));assert len(state['transactions'])==6 and state['invoiceStatuses']['2026-11']=='paid'
  page.get_by_role('button',name='Marcar recebido',exact=True).click();assert page.locator('.home-balance>strong').inner_text().replace('\xa0',' ')=='R$ 1.990,00';page.get_by_role('button',name='Desfazer recebimento / pagamento',exact=True).click()
  page.get_by_role('button',name='Ajustar referências →',exact=True).click();page.get_by_role('heading',name='Referências financeiras').wait_for();nav('Visão geral');page.get_by_role('button',name='Explorar lançamentos').click();page.get_by_role('heading',name='Lançamentos',exact=True).wait_for();nav('Visão geral');page.get_by_role('button',name='Planejamento atual →').click();page.get_by_role('heading',name='Compra à vista').wait_for();nav('Visão geral');page.get_by_role('button',name='Notificações',exact=False).click();page.get_by_role('dialog').wait_for();page.keyboard.press('Escape')
  assert page.evaluate("localStorage.getItem('saldoclaro-v1')")==original;assert not errors,errors
  # True empty installation: verify neutral states, with no transaction injection.
  fresh=b.new_context(viewport={'width':390,'height':844});pg=fresh.new_page();pg.goto(url);pg.get_by_text('Seu histórico começa com o primeiro lançamento.',exact=True).wait_for();pg.screenshot(path=str(ART/'empty-mobile.png'),full_page=True);fresh.close()
  reference=Path('/tmp/finly-main-home')
  if reference.exists():
   mainurl=serve(reference)
   for theme in ['dark','light']:
    mainctx=b.new_context(viewport={'width':1440,'height':1000},locale='pt-BR');mainctx.add_init_script(f"localStorage.setItem('saldoclaro-v1',JSON.stringify({json.dumps(fixture)}));localStorage.setItem('finly-theme','{theme}')")
    main=mainctx.new_page();main.goto(mainurl);main.evaluate('document.fonts.ready')
    for w,h in [(1440,1000),(390,844)]:
     main.set_viewport_size({'width':w,'height':h});main.evaluate('window.scrollTo(0,0)');main.screenshot(path=str(ART/f'main-{theme}-{w}.png'),full_page=True)
    mainctx.close()
  b.close()
 print('PASS: main Home organization, v2 financial values, three themes/appearance settings, four viewports, invoice/refund actions, navigation/alerts, empty state, preserved legacy, full-page evidence')
finally:
 for s in servers:s.shutdown();s.server_close()
