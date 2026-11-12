from backup_helpers import restore_backup
import re
"""Navigation/history/readability and real finance flows on the isolated UX branch."""
import functools,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent;ART=ROOT/'docs/navigation-ux/evidence';ART.mkdir(parents=True,exist_ok=True)
fixture={'version':1,'settings':{'salary':2000,'reserve':500,'cushion':200,'goal':1000,'installmentCap':100,'dueDay':10,'cardLabel':'Cartão sintético','includeExpectedRefunds':False},'entries':[
 {'id':'synthetic-credit','description':'Compra parcelada sintética','amount':33,'month':'2026-11','kind':'credit','owner':'third','groupId':'synthetic-group','parts':2,'part':1},
 {'id':'synthetic-future','description':'Parcela futura sintética','amount':33,'month':'2026-12','kind':'credit','owner':'third','groupId':'synthetic-group','parts':2,'part':2,'confirmed':False},
 {'id':'synthetic-refund','description':'Reembolso sintético','amount':33,'month':'2026-11','kind':'reimbursement','status':'planned','groupId':'synthetic-group','parts':2,'part':1},
 {'id':'synthetic-received','description':'Reembolso recebido sintético','amount':10,'month':'2026-11','kind':'reimbursement','status':'received'},
 {'id':'synthetic-out','description':'Despesa sintética','amount':20,'month':'2026-11','kind':'out','status':'planned','category':'Transporte'}], 'pending':[], 'invoiceStatuses':{}}
raw=subprocess.run(['node','--input-type=module','-e',"import {migrate} from './src/finance/model.ts';console.log(JSON.stringify(await migrate(process.argv[1])))",json.dumps(fixture)],cwd=ROOT,check=True,capture_output=True,text=True).stdout.strip()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
routes=[('visao-geral','Visão geral'),('lancamentos','Lançamentos'),('fatura','Fatura do cartão'),('parcelas','Parcelas e recorrências'),('reembolsos','Reembolsos'),('planejamentos','Planejamentos'),('configuracoes','Configurações')]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  ctx=b.new_context(viewport={'width':1440,'height':1000},locale='pt-BR');ctx.add_init_script(f"if(!localStorage.getItem('finly-v2'))localStorage.setItem('finly-v2',{json.dumps(raw)});localStorage.setItem('saldoclaro-v1','original intocado');window.financialWrites=[];const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){{if(k==='finly-v2'||k==='saldoclaro-v1')financialWrites.push(k);return original.call(this,k,v)}}")
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url+'/#/visao-geral?competencia=2026-11');page.get_by_role('heading',name='Visão geral',exact=True).wait_for()
  def nav(label,mobile=False):
   if mobile:
    page.get_by_role('button',name='Alternar menu',exact=True).click();page.get_by_role('dialog').wait_for();page.wait_for_function("document.querySelector('[role=dialog]').getAnimations().every(a=>a.playState==='finished')")
   else:page.mouse.move(25,350);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288")
   page.get_by_role('link',name=label,exact=True).click();page.mouse.move(1100 if not mobile else 370,100);page.get_by_role('heading',name=label,exact=True).wait_for()
  for slug,label in routes:
   nav(label);assert '/'+slug in page.url;assert page.get_by_label('Competência',exact=True).input_value()=='2026-11';assert page.locator('[aria-current=page]').get_attribute('aria-label')==label
   page.evaluate('document.fonts.ready');page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(250);page.screenshot(path=str(ART/(slug+'.png')),full_page=True)
  assert page.get_by_role('link',name='Sobre a migração',exact=True).count()==0
  for tab in ['Financeiro','Aparência','Backup','Sobre']:
   page.get_by_role('tab',name=tab,exact=True).click();assert page.get_by_role('tabpanel').is_visible();page.screenshot(path=str(ART/('settings-'+tab+'.png')),full_page=True)
  page.get_by_role('tab',name='Financeiro',exact=True).focus();page.keyboard.press('ArrowRight');assert page.get_by_role('tab',name='Aparência',exact=True).get_attribute('aria-selected')=='true'
  page.get_by_role('tab',name='Aparência',exact=True).evaluate('(e)=>{if(e!==document.activeElement)throw Error("Tab focus lost")}')
  nav('Visão geral');page.get_by_label('Competência',exact=True).fill('2026-12');nav('Fatura do cartão');nav('Reembolsos');page.go_back();page.get_by_role('heading',name='Fatura do cartão',exact=True).wait_for();page.go_forward();page.get_by_role('heading',name='Reembolsos',exact=True).wait_for();assert page.get_by_label('Competência',exact=True).input_value()=='2026-12'
  for slug,label in routes:
   page.goto(url+'/#/'+slug+'?competencia=2026-11');page.get_by_role('heading',name=label,exact=True).wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==raw
  assert page.evaluate('financialWrites')==[]
  # Desktop hover/pin and keyboard remain available with the new links.
  page.mouse.move(1100,100);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===60");page.mouse.move(25,350);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288");page.get_by_role('link',name='Reembolsos',exact=True).hover();page.mouse.move(1100,100);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===60")
  toggle=page.get_by_role('button',name='Alternar menu',exact=True);toggle.click();page.mouse.move(25,350);page.mouse.move(1100,100);assert toggle.get_attribute('aria-pressed')=='true';toggle.click()
  page.get_by_label('Criar por tipo',exact=True).select_option('income');d=page.get_by_role('dialog');assert d.get_by_label('Tipo',exact=True).input_value()=='income';d.get_by_label('Descrição',exact=True).fill('Receita rápida sintética');d.get_by_label(re.compile(r'^Valor.*\(R\$\)$')).fill('50');d.get_by_label('Situação',exact=True).select_option('received');d.get_by_role('button',name='Salvar lançamento').click();page.get_by_role('heading',name='Lançamentos',exact=True).wait_for();assert '/lancamentos?' in page.url
  state=json.loads(page.evaluate("localStorage.getItem('finly-v2')"));created=next(x for x in state['transactions'] if x['description']=='Receita rápida sintética');row=page.locator('tbody tr').filter(has_text='Receita rápida sintética');row.get_by_role('button',name='Editar',exact=True).click();d.get_by_label(re.compile(r'^Valor.*\(R\$\)$')).fill('55');d.get_by_role('button',name='Salvar lançamento').click();assert next(x for x in json.loads(page.evaluate("localStorage.getItem('finly-v2')"))['transactions'] if x['id']==created['id'])['amountCents']==5500
  nav('Fatura do cartão');page.get_by_label('Status da fatura',exact=True).select_option('paid');nav('Parcelas e recorrências');assert page.get_by_text('Reembolsos vinculados: 1.',exact=False).count()>0;nav('Reembolsos');page.get_by_role('heading',name='Pendentes',exact=True).wait_for();page.get_by_role('heading',name='Recebidos',exact=True).wait_for()
  nav('Configurações');page.get_by_role('tab',name='Backup',exact=True).click()
  with page.expect_download() as dl:page.get_by_role('button',name='Exportar backup JSON',exact=True).click()
  backup=Path(dl.value.path()).read_bytes();baseline=json.loads(backup);restore_backup(page,backup);assert json.loads(page.evaluate("localStorage.getItem('finly-v2')"))==baseline
  for theme in ['Graphite Green','Escuro Padrão','Claro']:
   nav('Configurações');page.get_by_role('tab',name='Aparência',exact=True).click();page.get_by_role('button',name=theme,exact=True).click();nav('Visão geral')
   for w,h in [(1440,1000),(1366,768),(768,1024),(390,844)]:
    page.set_viewport_size({'width':w,'height':h});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    if w==390:page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(ART/(theme.split()[0]+'-mobile.png')),full_page=True)
   page.set_viewport_size({'width':1440,'height':1000})
  page.set_viewport_size({'width':390,'height':844});nav('Fatura do cartão',True);nav('Reembolsos',True);page.screenshot(path=str(ART/'refunds-mobile.png'),full_page=True);page.get_by_role('button',name='Alternar menu',exact=True).click();page.get_by_role('dialog').wait_for();page.keyboard.press('Escape');page.get_by_role('dialog').wait_for(state='hidden')
  assert page.evaluate("localStorage.getItem('saldoclaro-v1')")=='original intocado';assert not errors,errors;b.close()
 print('PASS: seven direct routes, back/forward, preserved period/data, selected links, settings keyboard tabs, quick CRUD/list return, invoice/groups/refunds, backup restore, themes/responsive/hover/pin/mobile/Escape')
finally:server.shutdown();server.server_close()
