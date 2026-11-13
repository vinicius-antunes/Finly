from entries_helpers import new_entry, advanced_entries
from backup_helpers import restore_backup
import re
"""Real Chromium v2 operations, synthetic data only."""
import functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'docs/finance-evidence';ART.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
fixture={'version':1,'settings':{'salary':2000,'reserve':500,'cushion':200,'goal':1000,'installmentCap':100,'dueDay':10,'cardLabel':'Cartão sintético','includeExpectedRefunds':False},'entries':[{'id':'synthetic-v1','description':'Receita sintética','amount':100,'month':'2026-11','kind':'income','status':'received'}],'pending':[],'invoiceStatuses':{}}
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  ctx=b.new_context(viewport={'width':1440,'height':1000},locale='pt-BR');ctx.add_init_script(f"if(!localStorage.getItem('saldoclaro-v1'))localStorage.setItem('saldoclaro-v1',JSON.stringify({json.dumps(fixture)}))")
  url_base=f'http://127.0.0.1:{server.server_port}'
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}');original=page.evaluate("localStorage.getItem('saldoclaro-v1')")
  page.goto(url_base+'/#/configuracoes/backup?competencia=2026-11');page.get_by_role('heading',name='Salvar meus dados').wait_for();restore_backup(page,json.dumps(fixture),'synthetic-v1.json');page.goto(url_base+'/#/visao-geral?competencia=2026-11');page.get_by_role('heading',name='Visão geral',exact=True).wait_for()
  def nav(name,mobile=False):
   if mobile:
    page.get_by_role('button',name='Alternar menu',exact=True).click();page.get_by_role('dialog').wait_for();page.wait_for_function("document.querySelector('[role=dialog]').getAnimations().every(a=>a.playState==='finished')")
   else:
    page.mouse.move(25,350);page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288")
   page.get_by_role('link',name=name,exact=True).click();page.mouse.move(1100,100)
  page.get_by_label('Competência',exact=True).fill('2026-11')
  new_entry(page);dialog=page.get_by_role('dialog');dialog.get_by_label('Descrição',exact=True).fill('Compra parcelada sintética');dialog.get_by_label(re.compile(r'^Valor.*\(R\$\)$')).fill('25,00');dialog.get_by_label('Responsável',exact=True).select_option('third');dialog.get_by_label('Parcelas',exact=True).fill('3');dialog.get_by_role('button',name=re.compile('^Salvar (lançamento|alterações)$')).click();dialog.wait_for(state='hidden')
  state=json.loads(page.evaluate("localStorage.getItem('finly-v2')"));assert len(state['transactions'])==7;assert sum(x['amountCents'] for x in state['transactions'] if x['legacyKind']=='credit')==7500
  nav('Lançamentos');advanced_entries(page);page.get_by_label('Período da listagem',exact=True).select_option('all');assert page.locator('.entry-row').count()==7
  page.get_by_label('Buscar lançamentos',exact=True).fill('Compra parcelada');assert page.locator('.entry-row').count()==6
  row=page.locator('.entry-row').filter(has_text='Cartão').first;row.get_by_role('button',name=re.compile('^Editar ')).click();dialog.get_by_label(re.compile(r'^Valor.*\(R\$\)$')).fill('26');dialog.get_by_role('button',name=re.compile('^Salvar (lançamento|alterações)$')).click();dialog.wait_for(state='hidden');state=json.loads(page.evaluate("localStorage.getItem('finly-v2')"));assert sorted(x['amountCents'] for x in state['transactions'] if x['legacyKind']=='credit')==[2500,2500,2600]
  nav('Fatura do cartão');page.get_by_label('Status da fatura').select_option('paid');nav('Parcelas e recorrências');page.once('dialog',lambda d:d.dismiss());page.get_by_role('button',name='Excluir grupo',exact=True).click();assert len(json.loads(page.evaluate("localStorage.getItem('finly-v2')"))['transactions'])==7
  nav('Reembolsos');page.locator('section.category-panel').last.get_by_role('button',name='Marcar recebido',exact=True).first.click();assert any(x['legacyKind']=='reimbursement' and x['status']=='received' for x in json.loads(page.evaluate("localStorage.getItem('finly-v2')"))['transactions']);page.locator('section.category-panel').last.get_by_role('button',name='Desfazer recebimento',exact=True).click()
  nav('Configurações');page.get_by_label('Salário líquido',exact=True).fill('2500');page.get_by_role('button',name='Salvar ajustes').click();assert json.loads(page.evaluate("localStorage.getItem('finly-v2')"))['settings']['salary']==250000
  page.get_by_role('tab',name='Backup',exact=True).click()
  with page.expect_download() as dl:page.get_by_role('button',name='Exportar backup JSON',exact=True).click()
  backup=json.loads(Path(dl.value.path()).read_text());assert len(backup['transactions'])==7
  page.reload();assert json.loads(page.evaluate("localStorage.getItem('finly-v2')"))['settings']['salary']==250000
  nav('Planejamentos');page.get_by_role('button',name='Novo planejamento',exact=True).click();page.get_by_label('Nome do objetivo').fill('Meta de simulação sintética');page.get_by_label('Preço estimado').fill('600');page.get_by_role('button',name='Salvar planejamento').click();page.get_by_role('button',name='Gerenciar cofrinho').click();before=page.evaluate("localStorage.getItem('finly-v2')");page.get_by_label('Preço total no cartão',exact=True).fill('600');page.get_by_label('Número de parcelas').fill('6');assert page.evaluate("localStorage.getItem('finly-v2')")==before
  for theme in ['Graphite Green','Escuro Padrão','Claro']:
   nav('Configurações')
   page.get_by_role('tab',name='Aparência',exact=True).click();page.get_by_role('button',name=theme,exact=True).click();nav('Planejamentos');page.screenshot(path=str(ART/(theme.split()[0]+'-planning.png')),full_page=True)
  nav('Configurações');page.get_by_role('tab',name='Aparência',exact=True).click();page.get_by_role('button',name='Graphite Green',exact=True).click();nav('Visão geral');page.screenshot(path=str(ART/'dashboard-desktop.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(ART/'dashboard-mobile.png'),full_page=True);nav('Configurações',True);page.get_by_role('heading',name='Referências financeiras').wait_for()
  page.set_viewport_size({'width':1440,'height':1000});nav('Parcelas e recorrências');page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='Excluir grupo',exact=True).click();assert len(json.loads(page.evaluate("localStorage.getItem('finly-v2')"))['transactions'])==1
  nav('Lançamentos');advanced_entries(page);page.get_by_role('button',name='Limpar filtros').click();page.once('dialog',lambda d:d.accept());page.locator('.entry-row').locator('summary').click();page.get_by_role('button',name='Excluir lançamento',exact=True).click();assert len(json.loads(page.evaluate("localStorage.getItem('finly-v2')"))['transactions'])==0
  nav('Configurações');page.get_by_role('tab',name='Backup',exact=True).click();restore_backup(page,json.dumps(backup));assert json.loads(page.evaluate("localStorage.getItem('finly-v2')"))['transactions']==backup['transactions']
  assert page.evaluate("localStorage.getItem('saldoclaro-v1')")==original;assert not errors,errors
  preserved=page.evaluate("localStorage.getItem('finly-v2')");page.evaluate("()=>{Storage.prototype.setItem=function(){throw Error('quota')}}");new_entry(page);d=page.get_by_role('dialog');d.get_by_label('Descrição',exact=True).fill('Teste de quota');d.get_by_label(re.compile(r'^Valor.*\(R\$\)$')).fill('1');d.get_by_role('button',name=re.compile('^Salvar (lançamento|alterações)$')).click();d.get_by_role('alert').wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==preserved
  for mode in ['empty','corrupt','denied']:
   fresh=b.new_context();
   if mode=='corrupt':fresh.add_init_script("localStorage.setItem('finly-v2','{bad')")
   if mode=='denied':fresh.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('denied')}})")
   pg=fresh.new_page();pg.goto(f'http://127.0.0.1:{server.server_port}')
   if mode=='empty':
    pg.get_by_role('heading',name='Visão geral',exact=True).wait_for();assert json.loads(pg.evaluate("localStorage.getItem('finly-v2')"))['transactions']==[]
   elif mode=='corrupt':assert pg.evaluate("localStorage.getItem('finly-v2')")=='{bad'
   else:
    pg.get_by_role('heading',name='Não foi possível abrir seus dados').wait_for();assert pg.get_by_role('alert').count()>=1
   fresh.close()
  b.close()
 print('PASS: explicit migration, CRUD/edit, installments/refunds, filters, invoice, cancelled group deletion, settings, backup, persistence, simulation, themes/mobile, unchanged legacy')
finally:server.shutdown();server.server_close()
