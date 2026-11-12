from backup_helpers import restore_backup
"""Home parity with main; synthetic fixtures and full-page Chromium captures."""
import functools,http.server,json,threading,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;ART=ROOT/'docs/dashboard/evidence';ART.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
servers=[]
def serve(path):
 s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(path)));threading.Thread(target=s.serve_forever,daemon=True).start();servers.append(s);return f'http://127.0.0.1:{s.server_port}'
fixture={'version':1,'settings':{'salary':2000,'reserve':500,'cushion':200,'goal':1000,'installmentCap':100,'dueDay':10,'cardLabel':'Cartão sintético','includeExpectedRefunds':False},'entries':[
 {'id':'synthetic-june','description':'Despesa histórica sintética','amount':80,'month':'2026-06','kind':'out','status':'planned'},
 {'id':'synthetic-august','description':'Compra histórica sintética','amount':150,'month':'2026-08','kind':'credit','confirmed':True},
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
  url_base=url
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);original=page.evaluate("localStorage.getItem('saldoclaro-v1')")
  page.goto(url_base+'/#/configuracoes/backup?competencia=2026-11');page.get_by_role('heading',name='Salvar meus dados').wait_for();restore_backup(page,json.dumps(fixture),'synthetic-v1.json');page.goto(url_base+'/#/visao-geral?competencia=2026-11');page.get_by_role('heading',name='Visão geral',exact=True).wait_for()
  def nav(label,mobile=False):
   if mobile:
    page.get_by_role('button',name='Alternar menu',exact=True).click();page.get_by_role('dialog').wait_for();page.wait_for_function("document.querySelector('[role=dialog]').getAnimations().every(a=>a.playState==='finished')")
   else:page.mouse.move(25,350);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288")
   page.get_by_role('link',name=label,exact=True).click();page.mouse.move(1100,100)
  baseline=page.evaluate("localStorage.getItem('finly-v2')")
  assert page.locator('.home-balance>strong').inner_text().replace('\xa0',' ')=='R$ 1.965,00'
  assert page.locator('.home-indicator strong').all_text_contents()==['R$\xa035,00','R$\xa0100,00','R$\xa0300,00','R$\xa025,00']
  assert page.locator('.home-reserve>strong').inner_text().replace('\xa0',' ')=='R$ 500,00';assert page.locator('.budget-amount strong').inner_text().replace('\xa0',' ')=='R$ 335,00';assert page.locator('.budget-amount span').inner_text()=='15%';assert page.locator('.theme-panel').count()==0
  assert page.get_by_role('button',name='Mês anterior',exact=True).count()==0 and page.get_by_role('button',name='Próximo mês',exact=True).count()==0
  assert page.locator('.home-intro').count()==0 and page.locator('a[href*="legacy"]').count()==0
  assert page.get_by_role('heading',name='Atenção do mês').is_visible();assert page.locator('.home-ledger').count()==0;assert page.get_by_text('SEU ESPAÇO FINANCEIRO · LOCAL',exact=True).count()==0;page.locator('.monthly-bars .recharts-bar').wait_for();page.get_by_text('Valores do gráfico',exact=True).click();assert page.locator('.chart-values li').count()==6;assert 'R$\xa0125,00' in page.locator('.chart-values li').last.inner_text();page.get_by_text('Valores do gráfico',exact=True).click()
  for theme in ['Graphite Green','Escuro Padrão','Claro']:
   nav('Configurações');page.get_by_role('tab',name='Aparência',exact=True).click();page.get_by_role('button',name=theme,exact=True).click();page.get_by_label('Efeitos de luz').uncheck();page.get_by_label('Efeitos de luz').check();nav('Visão geral');page.evaluate('document.fonts.ready')
   for w,h in [(1440,1000),(1366,768),(768,1024),(390,844)]:
    page.set_viewport_size({'width':w,'height':h});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    if w in (1440,390):
     page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(250);page.screenshot(path=str(ART/f'{theme.split()[0]}-{w}.png'),full_page=True)
    if w==1440:
     rects=page.locator('.home-primary-grid>*').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())');assert len(rects)==3;assert rects[0]['width']>rects[1]['width'];assert page.locator('.executive-dashboard').evaluate('(e)=>e.getBoundingClientRect().bottom')<1000;assert abs(rects[0]['y']-rects[1]['y'])<1
   page.set_viewport_size({'width':1440,'height':1000});assert page.evaluate("localStorage.getItem('finly-v2')")==baseline
  page.get_by_label('Competência',exact=True).fill('2026-10');assert page.locator('.home-balance>strong').inner_text().replace('\xa0',' ')=='R$ 1.800,00';page.get_by_label('Competência',exact=True).fill('2026-11')
  page.get_by_role('button',name='Consultar Fatura do cartão',exact=True).click();page.get_by_label('Status da fatura',exact=True).select_option('paid');state=json.loads(page.evaluate("localStorage.getItem('finly-v2')"));assert len(state['transactions'])==8 and state['invoiceStatuses']['2026-11']=='paid'
  nav('Visão geral');page.get_by_role('button',name='Consultar Reembolsos a receber').click();page.get_by_role('button',name='Marcar recebido',exact=True).click();nav('Visão geral');assert page.locator('.home-balance>strong').inner_text().replace('\xa0',' ')=='R$ 1.990,00';nav('Reembolsos');page.get_by_role('button',name='Desfazer recebimento',exact=True).click();nav('Visão geral')
  page.get_by_role('button',name='Ajustar referências →',exact=True).click();page.get_by_role('heading',name='Referências financeiras').wait_for();nav('Visão geral');page.get_by_role('button',name='Consultar Despesas fora do cartão').click();page.get_by_role('heading',name='Lançamentos',exact=True).wait_for();nav('Visão geral');page.get_by_role('button',name='1 pendências sem competência →').click();page.get_by_role('heading',name='Pendências sem competência (fora da fatura)').wait_for();assert page.get_by_label('Competência de Cobrança sem competência',exact=True).is_visible();nav('Visão geral');page.get_by_role('button',name='Notificações',exact=False).click();page.get_by_role('dialog').wait_for();page.keyboard.press('Escape')
  assert page.evaluate("localStorage.getItem('saldoclaro-v1')")==original;assert not errors,errors
  # True empty installation: verify neutral states, with no transaction injection.
  fresh=b.new_context(viewport={'width':390,'height':844});pg=fresh.new_page();pg.goto(url);pg.get_by_text('Tudo em dia',exact=True).wait_for();pg.screenshot(path=str(ART/'empty-mobile.png'),full_page=True);fresh.close()
  b.close()
 print('PASS: compact executive Home organization, v2 financial values, three themes/appearance settings, four viewports, invoice/refund actions, navigation/alerts, empty state, preserved legacy, full-page evidence')
finally:
 for s in servers:s.shutdown();s.server_close()
