"""Planning/piggy banks using only synthetic money in real Chromium."""
import functools,http.server,json,threading,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from backup_helpers import restore_backup
ROOT=Path(__file__).resolve().parent.parent;ART=ROOT/'docs/planning/evidence';ART.mkdir(parents=True,exist_ok=True)
raw=subprocess.check_output(['node','--input-type=module','-e',"import {empty} from './src/finance/model.ts';const s=empty();s.settings.salary=500000;console.log(JSON.stringify(s))"],cwd=ROOT,text=True).strip()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}'
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True);ctx=b.new_context(viewport={'width':1440,'height':1000});ctx.add_init_script(f"if(!localStorage.getItem('finly-v2'))localStorage.setItem('finly-v2',{json.dumps(raw)});localStorage.setItem('saldoclaro-v1','intocado')");page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url+'/#/planejamentos?competencia=2026-11');page.get_by_role('heading',name='Meus planejamentos').wait_for()
  def state():return json.loads(page.evaluate("localStorage.getItem('finly-v2')"))
  def create(name,initial):
   page.get_by_role('button',name='Novo planejamento',exact=True).click();page.get_by_label('Nome do objetivo').fill(name);page.get_by_label('Preço estimado',exact=True).fill('3000');page.get_by_label('Contribuição mensal',exact=True).fill('150');page.get_by_label('Valor inicial',exact=True).fill(str(initial))
   if initial:page.get_by_label('O dinheiro inicial já foi separado').check()
   page.get_by_role('button',name='Salvar planejamento',exact=True).click()
  create('Objetivo sintético A',200);create('Objetivo sintético B',0);assert len(state()['planning']['goals'])==2;page.screenshot(path=str(ART/'goals-desktop.png'),full_page=True);page.get_by_role('button',name='Gerenciar cofrinho').first.click()
  def movement(kind,value):
   page.get_by_label('Operação',exact=True).select_option(kind);page.get_by_label('Valor do aporte ou retirada',exact=True).fill(str(value));page.get_by_label('Confirmo que esta movimentação realmente ocorreu').check();page.get_by_role('button',name='Confirmar movimentação',exact=True).click()
  movement('monthly',150);assert len(state()['planning']['goals'][0]['movements'])==2;before=state();movement('monthly',150);assert state()==before;movement('withdraw',400);assert state()==before;movement('withdraw',50);assert sum(m['delta'] for m in state()['planning']['goals'][0]['movements'])==30000
  page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='Desfazer',exact=True).last.click();assert sum(m['delta'] for m in state()['planning']['goals'][0]['movements'])==35000
  page.get_by_label('Modalidade',exact=True).select_option('cash');page.get_by_label('Preço total no cartão',exact=True).fill('300');before=state();page.get_by_label('Modalidade',exact=True).select_option('credit');page.get_by_label('Número de parcelas',exact=True).fill('3');page.get_by_label('Juros simples mensais (%)',exact=True).fill('1');page.get_by_label('Modalidade',exact=True).select_option('down');page.get_by_label('Entrada reservada',exact=True).fill('100');assert state()==before;assert page.get_by_role('table',name='Comparação das modalidades').locator('tbody tr').count()==3;page.screenshot(path=str(ART/'simulation-desktop.png'),full_page=True)
  page.get_by_label('Autorizo separadamente criar os lançamentos financeiros desta compra').check();page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='Compra realizada',exact=True).click();assert len(state()['transactions'])==4;assert page.get_by_role('button',name='Compra realizada',exact=True).is_disabled();page.reload();page.get_by_role('heading',name='Meus planejamentos').wait_for();assert len(state()['planning']['goals'][0]['movements'])==5
  page.get_by_role('button',name='Gerenciar cofrinho',exact=True).click();page.get_by_role('button',name='Adiar contribuição',exact=True).click();assert state()['planning']['goals'][1]['months']['2026-11']['status']=='deferred';page.once('dialog',lambda d:d.accept());page.get_by_label('Situação do objetivo',exact=True).select_option('paused');page.once('dialog',lambda d:d.accept());page.get_by_label('Situação do objetivo',exact=True).select_option('active');page.get_by_role('button',name='Voltar aos planejamentos').click()
  for theme in ['graphite','dark','light']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   for w,h in [(1440,1000),(768,1024),(390,844)]:
    page.set_viewport_size({'width':w,'height':h});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    if w==390:page.screenshot(path=str(ART/(theme+'-mobile.png')),full_page=True)
  page.goto(url+'/#/configuracoes/backup?competencia=2026-11');page.get_by_role('heading',name='Salvar meus dados').wait_for()
  saved=state()
  with page.expect_download() as dl:page.get_by_role('button',name='Exportar backup JSON',exact=True).click()
  backup=Path(dl.value.path()).read_text();assert json.loads(backup)['planning']==saved['planning'];restore_backup(page,backup,'synthetic-goals.json');assert state()['planning']==saved['planning']
  assert page.evaluate("localStorage.getItem('saldoclaro-v1')")=='intocado';assert not errors,errors;b.close()
 print('PASS: multiple goals/initial confirmation, monthly dedupe, withdrawals/overdraft/reversal/history, cash/interest/down comparisons without writes, separately authorized purchase/linked rows/reload, defer/pause/resume, themes/three sizes and preserved legacy')
finally:s.shutdown();s.server_close()
