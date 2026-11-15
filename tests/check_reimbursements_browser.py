"""Phase 4 read-only integration and complete JSON roundtrip, synthetic data only."""
import functools,http.server,json,subprocess,threading,re
from pathlib import Path
from playwright.sync_api import sync_playwright
from backup_helpers import restore_backup
ROOT=Path(__file__).resolve().parent.parent;ART=ROOT/'docs/new-entry/phase-4-evidence';ART.mkdir(parents=True,exist_ok=True)
raw=subprocess.check_output(['node','--input-type=module','-e',"import {syntheticReimbursementState} from './tests/fixtures/reimbursement-ledger.mjs';console.log(JSON.stringify(syntheticReimbursementState()))"],cwd=ROOT,text=True).strip()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True);ctx=b.new_context(viewport={'width':1440,'height':1000});ctx.add_init_script("localStorage.setItem('saldoclaro-v1','intocado')");page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url+'/#/configuracoes/backup?competencia=2026-11');restore_backup(page,raw,'synthetic-credit.json');saved=page.evaluate("localStorage.getItem('finly-v2')");page.goto(url+'/#/reembolsos?competencia=2026-11');page.get_by_role('heading',name='Acordos de reembolso').wait_for();page.get_by_text('Cronograma e histórico do acordo',exact=True).click();assert page.get_by_text('Acordo sintético compartilhado · Pessoa sintética',exact=True).is_visible();assert page.get_by_text('Parcialmente recebido',exact=False).is_visible();assert page.get_by_text('Recebimento sintético parcial',exact=False).first.is_visible();assert page.get_by_role('heading',name=re.compile(r'Reembolsos · total a receber.*50,00')).is_visible();page.screenshot(path=str(ART/'agreements.png'),full_page=True)
  for theme in ['graphite','dark','light']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.goto(url+'/#/reembolsos?competencia=2026-11');page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(ART/(theme+'-mobile.png')),full_page=True);page.set_viewport_size({'width':1440,'height':1000})
  page.goto(url+'/#/planejamentos?competencia=2026-11');page.get_by_label('Mostrar objetivos').select_option('all');page.get_by_role('button',name='Gerenciar cofrinho',exact=True).click();page.get_by_role('link',name='synthetic-goal-purchase',exact=True).click();page.get_by_role('heading',name='Compra synthetic-goal-purchase',exact=True).wait_for()
  page.goto(url+'/#/configuracoes/backup?competencia=2026-11')
  with page.expect_download() as dl:page.get_by_role('button',name='Exportar backup JSON',exact=True).click()
  exported=Path(dl.value.path()).read_text();assert json.loads(exported)['entryLedger']==json.loads(raw)['entryLedger'];assert json.loads(exported)['planning']==json.loads(raw)['planning'];page.reload();page.get_by_role('heading',name='Salvar meus dados').wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==saved;assert page.evaluate("localStorage.getItem('saldoclaro-v1')")=='intocado';assert not errors,errors;b.close()
 print('PASS: partial agreement/person/history, three themes/mobile, full ledger and goal purchase links roundtrip, reload and untouched legacy')
finally:server.shutdown();server.server_close()
