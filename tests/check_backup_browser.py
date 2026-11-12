"""Single-window backup wizard, synthetic data only, real production-build browser."""
import functools,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from backup_helpers import restore_backup
ROOT=Path(__file__).resolve().parent.parent;ART=ROOT/'docs/backup-import/evidence';ART.mkdir(parents=True,exist_ok=True)
fixture={'version':1,'settings':{'salary':1800,'reserve':300,'cushion':100,'goal':1000,'installmentCap':100,'dueDay':10,'cardLabel':'Cartão sintético','includeExpectedRefunds':False},'entries':[{'id':'synthetic-credit','description':'Parcela sintética','amount':25,'month':'2026-11','kind':'credit','groupId':'synthetic-group','part':1,'parts':3},{'id':'synthetic-refund','description':'Reembolso sintético','amount':25,'month':'2026-11','kind':'reimbursement','status':'planned','groupId':'synthetic-group','part':1,'parts':3}],'pending':[{'id':'synthetic-pending','description':'Cobrança sem competência','amount':10}],'invoiceStatuses':{'2026-11':'unpaid'}}
raw=json.dumps(fixture);v2=subprocess.run(['node','--input-type=module','-e',"import {migrate} from './src/finance/model.ts';console.log(JSON.stringify(await migrate(process.argv[1])))",raw],cwd=ROOT,check=True,capture_output=True,text=True).stdout.strip()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  ctx=b.new_context(viewport={'width':1440,'height':1000},locale='pt-BR');ctx.add_init_script(f"if(!localStorage.getItem('finly-v2'))localStorage.setItem('finly-v2',{json.dumps(v2)});if(!localStorage.getItem('saldoclaro-v1'))localStorage.setItem('saldoclaro-v1','legado intocado')")
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url+'/#/configuracoes/backup?competencia=2026-11');page.get_by_role('heading',name='Salvar meus dados').wait_for();baseline=page.evaluate("localStorage.getItem('finly-v2')")
  assert page.get_by_text('Recuperação avançada',exact=True).count()==0
  trigger=page.get_by_role('button',name='Importar backup JSON',exact=True);trigger.click();m=page.get_by_role('dialog');assert m.count()==1
  assert m.get_by_role('button',name='Continuar',exact=True).is_disabled();assert m.get_by_role('button',name='Cancelar',exact=True).count()==1
  page.screenshot(path=str(ART/'step-1-desktop.png'),full_page=True)
  def choose(content,name='synthetic-v1.json'):
   m.get_by_label('Selecionar arquivo JSON',exact=True).set_input_files({'name':name,'mimeType':'application/json','buffer':content.encode()})
  for invalid,name in [('{bad','synthetic-corrupt.json'),(json.dumps({'version':9}),'synthetic-incompatible.json'),(raw,'synthetic.txt')]:
   choose(invalid,name);m.get_by_role('alert').wait_for();assert m.get_by_role('button',name='Continuar',exact=True).is_disabled();assert page.evaluate("localStorage.getItem('finly-v2')")==baseline
  choose(' '*(4*1024*1024+1),'synthetic-large.json');m.get_by_text('O arquivo ultrapassa o limite de 4 MB.',exact=True).wait_for();assert m.get_by_role('button',name='Continuar',exact=True).is_disabled()
  transfer=page.evaluate_handle("raw=>{const data=new DataTransfer();data.items.add(new File([raw],'synthetic-drop.json',{type:'application/json'}));return data}",raw);m.locator('.backup-drop').dispatch_event('drop',{'dataTransfer':transfer});transfer.dispose();m.get_by_text('Arquivo válido. Você pode continuar.',exact=True).wait_for();assert m.get_by_role('alert').count()==0;m.get_by_role('button',name='Continuar',exact=True).click();m.get_by_role('heading',name='Confira os dados do backup').wait_for()
  assert m.get_by_text('Dados do arquivo',exact=True).is_visible();assert m.get_by_text('Dados atuais',exact=True).is_visible();assert m.get_by_text('Soma descritiva',exact=False).count()==0;assert page.get_by_role('dialog').count()==1
  page.screenshot(path=str(ART/'step-2-desktop.png'),full_page=True);m.get_by_role('button',name='Voltar',exact=True).click();m.get_by_role('heading',name='Importar backup',exact=True).wait_for();m.get_by_role('button',name='Continuar',exact=True).click();m.get_by_role('button',name='Continuar',exact=True).click();m.get_by_role('heading',name='Confirmar restauração',exact=True).wait_for();assert m.get_by_role('button',name='Restaurar dados',exact=True).is_disabled()
  with page.expect_download() as dl:m.get_by_role('button',name='Baixar backup dos dados atuais',exact=True).click()
  assert Path(dl.value.path()).read_text()==baseline;assert page.evaluate("localStorage.getItem('finly-v2')")==baseline
  page.screenshot(path=str(ART/'step-3-desktop.png'),full_page=True);m.get_by_role('button',name='Cancelar',exact=True).click();m.wait_for(state='hidden');assert page.evaluate("localStorage.getItem('finly-v2')")==baseline;assert trigger.evaluate('e=>e===document.activeElement')
  restore_backup(page,raw,'synthetic-v1.json');page.get_by_role('status').filter(has_text='Backup importado com sucesso').wait_for();state=json.loads(page.evaluate("localStorage.getItem('finly-v2')"));assert len(state['transactions'])==2 and state['transactions'][0]['amountCents']==2500;assert state['transactions'][0]['groupId']==state['transactions'][1]['groupId'];assert state['pending'][0]['amountCents']==1000
  saved=page.evaluate("localStorage.getItem('finly-v2')");page.reload();page.get_by_role('heading',name='Salvar meus dados').wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==saved
  restore_backup(page,v2);assert json.loads(page.evaluate("localStorage.getItem('finly-v2')"))==json.loads(v2)
  # Concurrent edits after review must never be overwritten by restoration.
  trigger.click();choose(raw);m.get_by_text('Arquivo válido. Você pode continuar.',exact=True).wait_for();m.get_by_role('button',name='Continuar',exact=True).click();m.get_by_role('button',name='Continuar',exact=True).click();m.get_by_role('checkbox').check();other=json.loads(v2);other['revision']=99;otherRaw=json.dumps(other);page.evaluate('(v)=>localStorage.setItem("finly-v2",v)',otherRaw);m.get_by_role('button',name='Restaurar dados',exact=True).click();m.get_by_role('alert').wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==otherRaw;m.get_by_role('button',name='Cancelar',exact=True).click();page.reload();page.get_by_role('heading',name='Salvar meus dados').wait_for()
  for theme in ['Graphite Green','Escuro Padrão','Claro']:
   page.get_by_role('tab',name='Aparência',exact=True).click();page.get_by_role('button',name=theme,exact=True).click();page.get_by_role('tab',name='Backup',exact=True).click();page.set_viewport_size({'width':390,'height':844});trigger.click();choose(raw);m.get_by_text('Arquivo válido. Você pode continuar.',exact=True).wait_for()
   for stage in (1,2,3):
    assert page.get_by_role('dialog').count()==1;assert m.evaluate('e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}')
    if theme=='Graphite Green':page.screenshot(path=str(ART/f'step-{stage}-mobile.png'),full_page=False)
    if stage<3:m.get_by_role('button',name='Continuar',exact=True).click()
   for _ in range(10):page.keyboard.press('Tab');assert m.evaluate('e=>e.contains(document.activeElement)')
   page.keyboard.press('Escape');m.wait_for(state='hidden');page.set_viewport_size({'width':1440,'height':1000})
  # Failure at final write keeps all current data and the dialog open.
  protected=page.evaluate("localStorage.getItem('finly-v2')");trigger.click();choose(raw);m.get_by_text('Arquivo válido. Você pode continuar.',exact=True).wait_for();m.get_by_role('button',name='Continuar',exact=True).click();m.get_by_role('button',name='Continuar',exact=True).click();m.get_by_role('checkbox').check();page.evaluate("()=>{window.savedSetter=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='finly-v2')throw Error('quota');return savedSetter.call(this,k,v)}}");m.get_by_role('button',name='Restaurar dados',exact=True).click();m.get_by_role('alert').wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==protected;page.evaluate('()=>{Storage.prototype.setItem=savedSetter}');page.keyboard.press('Escape')
  # Local recovery is advanced and only shown for compatible v1 data.
  page.evaluate('(v)=>localStorage.setItem("saldoclaro-v1",v)',raw);page.reload();page.get_by_text('Recuperação avançada',exact=True).wait_for();page.get_by_text('Recuperação avançada',exact=True).click();page.get_by_role('button',name='Recuperar dados antigos deste navegador').click();m.get_by_text('Arquivo válido. Você pode continuar.',exact=True).wait_for();assert page.get_by_role('dialog').count()==1;page.keyboard.press('Escape');assert page.evaluate("localStorage.getItem('saldoclaro-v1')")==raw
  assert not errors,errors;b.close()
 print('PASS: v1/v2 wizard steps/back/cancel, backup download, invalid/corrupt/oversize refusal, explicit replacement, linked cents/pending, reload, concurrency, single modal, themes/mobile/focus/Escape and advanced compatible-only legacy')
finally:s.shutdown();s.server_close()
