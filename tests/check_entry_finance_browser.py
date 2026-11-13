"""Read-only Phase 2 integration, synthetic ledger and confirmed backup restore."""
import functools,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from backup_helpers import restore_backup
ROOT=Path(__file__).resolve().parent.parent;ART=ROOT/'docs/new-entry/phase-2-evidence';ART.mkdir(parents=True,exist_ok=True)
raw=subprocess.check_output(['node','--input-type=module','-e',"import {syntheticLedgerState} from './tests/fixtures/entry-ledger.mjs';console.log(JSON.stringify(syntheticLedgerState()))"],cwd=ROOT,text=True).strip()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True);ctx=b.new_context(viewport={'width':1440,'height':1000});ctx.add_init_script("localStorage.setItem('saldoclaro-v1','intocado')");page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url+'/#/configuracoes/backup?competencia=2026-11');restore_backup(page,raw,'synthetic-phase2.json');saved=page.evaluate("localStorage.getItem('finly-v2')");page.goto(url+'/#/visao-geral?competencia=2026-11');page.get_by_role('heading',name='Visão geral',exact=True).wait_for();assert page.locator('.home-balance>strong').inner_text().replace('\xa0',' ')=='R$ 255,00';assert page.locator('.home-indicator strong').all_text_contents()==['R$\xa060,00','R$\xa0100,00','R$\xa0425,00','R$\xa015,00'];page.locator('.monthly-spending table').wait_for(state='attached');assert 'R$\xa0160,00' in page.locator('.monthly-spending table tbody tr').last.inner_text();page.screenshot(path=str(ART/'dashboard.png'),full_page=True)
  page.goto(url+'/#/lancamentos?competencia=2026-11');page.get_by_role('heading',name='Operações do novo motor financeiro').wait_for();assert page.get_by_text('Parcialmente liquidado',exact=False).count()>0;assert page.get_by_text('Transferência:',exact=False).is_visible();page.screenshot(path=str(ART/'activity.png'),full_page=True);page.goto(url+'/#/fatura?competencia=2026-11');assert page.get_by_text('Fatura Cartão sintético:',exact=False).is_visible();page.reload();page.get_by_role('heading',name='Fatura do cartão',exact=True).wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==saved
  for theme in ['graphite','dark','light']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   for w,h in [(1440,1000),(768,1024),(390,844)]:page.set_viewport_size({'width':w,'height':h});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.goto(url+'/#/configuracoes/backup?competencia=2026-11')
  with page.expect_download() as dl:page.get_by_role('button',name='Exportar backup JSON',exact=True).click()
  assert json.loads(Path(dl.value.path()).read_text())['entryLedger']==json.loads(raw)['entryLedger'];assert page.evaluate("localStorage.getItem('saldoclaro-v1')")=='intocado';assert not errors,errors;b.close()
 print('PASS: explicit JSON restore, partial salary/payment/refund dashboard and chart, separate readable ledger/transfers/invoices, reload/export persistence, themes/three sizes and preserved legacy')
finally:server.shutdown();server.server_close()
