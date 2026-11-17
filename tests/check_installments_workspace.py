"""Synthetic unified contracts, responsive themes, immutable navigation and preserved actions."""
import functools,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'docs/new-entry/improvement-04-evidence';ART.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/#/parcelas?competencia=2026-11'
raw=subprocess.check_output(['node','--input-type=module','-e',"import {syntheticReimbursementState} from './tests/fixtures/reimbursement-ledger.mjs';const s=syntheticReimbursementState();s.transactions.push({id:'legacy-test',description:'Compra anterior sintética',amountCents:2000,period:'2026-11',legacyKind:'credit',accountId:'legacy-credit',category:'Casa',owner:'unknown',status:'planned',confirmed:true,note:'',groupId:'old',part:2,parts:3});console.log(JSON.stringify(s));"],cwd=ROOT,text=True).strip()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  for mode in ['empty','legacy','new','mixed']:
   c=b.new_context(viewport={'width':1440,'height':1000},locale='pt-BR')
   if mode!='empty':
    state=json.loads(raw)
    if mode=='legacy':
     state.pop('entryLedger');state.pop('planning',None)
    if mode=='new':state['transactions']=[]
    c.add_init_script('if(!localStorage.getItem("finly-v2"))localStorage.setItem("finly-v2",'+json.dumps(json.dumps(state))+');')
   page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));print('Testing',mode,flush=True);page.goto(url);page.get_by_role('heading',name='Parcelas e recorrências',exact=True).wait_for();before=page.evaluate("localStorage.getItem('finly-v2')")
   for tab in ['Parcelamentos','Recorrências']:
    page.get_by_role('tab',name=tab,exact=True).click();assert page.get_by_role('tabpanel').count()==1
    if mode=='empty':assert page.locator('.installments-workspace .empty-state').count()==1
   if mode=='mixed':
    for theme in ['graphite','dark','light']:
     page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
     for width in [1440,768,390]:
      page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
      for tab in ['Parcelamentos','Recorrências']:
       page.get_by_role('tab',name=tab,exact=True).click();assert page.locator('.contract-card').count()>0
       assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
       if width!=768:page.screenshot(path=str(ART/f'{theme}-{width}-{tab}.png'),full_page=True)
    page.get_by_role('tab',name='Parcelamentos',exact=True).click();page.get_by_label('Pesquisar compra',exact=True).fill('inexistente');assert page.locator('.contract-card').count()==0;page.get_by_label('Pesquisar compra',exact=True).fill('');page.get_by_label('Situação',exact=True).select_option('cancelled');assert page.locator('.contract-card').count()==0;page.get_by_label('Situação',exact=True).select_option('all')
    card=page.locator('.contract-card').filter(has=page.get_by_role('heading',name='Contrato sintético com centavos',exact=True));card.get_by_text('Ver parcelas e detalhes',exact=True).click();assert card.locator('tbody tr').count()==3;card.get_by_text('Ver parcelas e detalhes',exact=True).click();card.locator('.contract-actions>summary').click();card.get_by_role('button',name='Editar parcelas',exact=True).click();dialog=page.get_by_role('dialog').filter(has=page.get_by_role('tab',name='Cartão',exact=True));dialog.wait_for();dialog.get_by_role('button',name='Cancelar',exact=True).click()
   assert page.evaluate("localStorage.getItem('finly-v2')")==before,mode
   if mode=='empty':
    for tab,button,kind,expected in [('Parcelamentos','Cadastrar compra parcelada','Cartão','installments'),('Recorrências','Cadastrar recorrência','Despesa','recurring')]:
     page.get_by_role('tab',name=tab,exact=True).click();page.get_by_role('button',name=button,exact=True).click();dialog=page.get_by_role('dialog').filter(has=page.get_by_role('tab',name=kind,exact=True));dialog.wait_for();assert dialog.get_by_label('Forma de lançamento',exact=True).input_value()==expected;dialog.get_by_role('button',name='Cancelar',exact=True).click()
   assert not errors,errors;c.close()
  b.close()
 print('PASS: empty, legacy, new, mixed; tabs/search/status/expansion/edit; three themes at 1440/768/390; no financial writes or page errors')
finally:server.shutdown();server.server_close()
