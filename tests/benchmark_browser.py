"""Measured synthetic datasets; no hard-coded speed threshold or production fixtures."""
import functools,http.server,threading,subprocess,json,time,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'docs/new-entry/phase-7-evidence'
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
results=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,headless=True)
  for n in [100,1000,5000]:
   raw=subprocess.check_output(['node','--input-type=module','-e',"import {phase7State} from './tests/fixtures/phase7.mjs';const s=phase7State();for(let i=0;i<"+str(n)+";i++){s.entryLedger.operations.push({id:'perf-'+i,type:'expense',description:'Operação sintética '+i,amountCents:100,period:'2026-11',operationDate:'2026-11-09',accountId:'a',cancelled:false});s.entryLedger.settlements.push({id:'pay-'+i,operationId:'perf-'+i,amountCents:50,date:'2026-11-10',accountId:'a',method:'Pix',note:''});}console.log(JSON.stringify(s))"],cwd=ROOT,text=True).strip()
   c=b.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce');c.add_init_script("localStorage.setItem('finly-v2',"+json.dumps(raw)+");");pg=c.new_page();pg.set_default_timeout(60000);start=time.perf_counter();pg.goto(url+'/#/visao-geral?competencia=2026-11');pg.get_by_role('heading',name='Visão geral',exact=True).wait_for();pg.locator('.monthly-spending table').wait_for(state='attached');home=(time.perf_counter()-start)*1000;start=time.perf_counter();pg.goto(url+'/#/lancamentos?competencia=2026-11');pg.get_by_role('heading',name='Lançamentos',exact=True).wait_for();pg.locator('.entries-desktop .entry-row').first.wait_for();pg.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');entries=(time.perf_counter()-start)*1000;rows=pg.locator('.entries-desktop .entry-row').count()
   if '--before' not in sys.argv:
    assert rows==50;pg.get_by_role('button',name='Última página',exact=True).click();assert pg.locator('.entries-desktop .entry-row').count()==50;assert len(json.loads(pg.evaluate("localStorage.getItem('finly-v2')"))['entryLedger']['operations'])==n
    pg.get_by_text('Opções da lista',exact=True).click()
    with pg.expect_download() as dl:pg.get_by_role('button',name='Exportar CSV',exact=True).click()
    assert len(Path(dl.value.path()).read_text(encoding='utf-8-sig').splitlines())==n+1
    pg.get_by_label('Buscar lançamentos',exact=True).fill('Operação sintética '+str(n-1));pg.locator('.entries-desktop .entry-row').first.wait_for();assert pg.locator('.entries-desktop .entry-row').count()==1
   results.append({'entries':n,'homeMs':round(home,1),'entriesMs':round(entries,1),'renderedDesktopRows':rows,'sourceUnchanged':pg.evaluate("localStorage.getItem('finly-v2')")==raw});print(results[-1],flush=True);c.close()
  b.close()
 out=Path('/tmp/finly-phase7-browser-before.json') if '--before' in sys.argv else ART/'browser-performance.json';out.write_text(json.dumps(results,indent=2)+'\n')
finally:server.shutdown();server.server_close()
