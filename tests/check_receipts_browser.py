"""Real Chromium/IndexedDB/download/ZIP flows; exclusively synthetic in-memory documents."""
import functools, http.server, threading, subprocess, json, io, zipfile, hashlib
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect
from backup_helpers import restore_backup
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'docs/assets/phase6';ART.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
raw=subprocess.check_output(['node','--input-type=module','-e',"import {syntheticReimbursementState} from './tests/fixtures/reimbursement-ledger.mjs';const s=syntheticReimbursementState();s.transactions.push({id:'legacy-phase6',description:'Registro anterior sintético',amountCents:1000,period:'2026-11',legacyKind:'out',accountId:'legacy-cash',category:'',owner:'self',status:'planned',confirmed:true,note:''});console.log(JSON.stringify(s))"],cwd=ROOT,text=True).strip()
def pdf(label):
 content=('BT /F1 12 Tf 20 80 Td (Comprovante sintetico: '+label.replace('(','').replace(')','')+') Tj ET').encode('ascii','replace')
 objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 160] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',b'<< /Length '+str(len(content)).encode()+b' >>\nstream\n'+content+b'\nendstream']
 data=b'%PDF-1.4\n';offsets=[0]
 for i,obj in enumerate(objects,1):offsets.append(len(data));data+=str(i).encode()+b' 0 obj\n'+obj+b'\nendobj\n'
 xref=len(data);data+=b'xref\n0 6\n0000000000 65535 f \n'+b''.join(f'{n:010d} 00000 n \n'.encode() for n in offsets[1:])+b'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+str(xref).encode()+b'\n%%EOF\n'
 return {'name':label+'.pdf','mimeType':'application/pdf','buffer':data}

def image(fmt):
 b=io.BytesIO();Image.new('RGB',(64,64),(24,150,80)).save(b,fmt);ext={'JPEG':'jpg','PNG':'png','WEBP':'webp'}[fmt];return {'name':'imagem-sintetica.'+ext,'mimeType':'image/'+('jpeg' if fmt=='JPEG' else ext),'buffer':b.getvalue()}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,headless=True);ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',accept_downloads=True);ctx.add_init_script("if(!localStorage.getItem('seed-phase6')){localStorage.setItem('seed-phase6','1');localStorage.setItem('finly-v2',"+json.dumps(raw)+");localStorage.setItem('saldoclaro-v1','legado-intocado');}");page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url+'/#/lancamentos?competencia=2026-11');page.get_by_role('heading',name='Lançamentos',exact=True).wait_for()
  def state(pg=page):return json.loads(pg.evaluate("localStorage.getItem('finly-v2')"))
  def open_form(tab='Despesa'):
   page.get_by_role('button',name='Novo lançamento',exact=True).click();d=page.get_by_role('dialog');d.get_by_role('tab',name=tab,exact=True).click();return d
  def basic(d,name):
   d.get_by_label('Descrição',exact=True).fill(name);d.get_by_label('Valor (R$)',exact=True).fill('100');
   field='Data da compra' if d.get_by_role('tab',name='Cartão',exact=True).get_attribute('aria-selected')=='true' else 'Data prevista' if d.get_by_role('tab',name='Receita',exact=True).get_attribute('aria-selected')=='true' or d.get_by_role('tab',name='Reembolso',exact=True).get_attribute('aria-selected')=='true' else 'Data da operação';d.get_by_label(field,exact=True).fill('2026-11-15')
   if d.get_by_label('Competência',exact=True).count():d.get_by_label('Competência',exact=True).fill('2026-11')
  def attach(container,files):
   f=container.locator('.receipt-fields').first
   if f.get_attribute('open') is None:f.locator('summary').click()
   f.locator('input[type=file]').set_input_files(files);expect(f.locator('.receipt-list li')).to_have_count(len(files));expect(f.get_by_text('Validando arquivos…',exact=True)).to_have_count(0);return f
  def finish(d,review=False):
   d.get_by_role('button',name='Salvar lançamento',exact=True).click()
   if review:d.get_by_label('Conferi os valores, vínculos e o impacto financeiro.').check();d.get_by_role('button',name='Confirmar e salvar',exact=True).click()
   d.wait_for(state='hidden')
  # Signature rejection, multiple formats, draft discard protection and responsive themes.
  d=open_form();basic(d,'Despesa com comprovantes');f=attach(d,[image('PNG'),pdf('recibo-despesa')]);f.locator('input[type=file]').set_input_files({'name':'falso.png','mimeType':'image/png','buffer':b'<html>invalid</html>'});f.get_by_role('alert').filter(has_text='Formato inválido').wait_for();expect(f.locator('.receipt-list li')).to_have_count(2)
  f.locator('input[type=file]').set_input_files({'name':'grande.pdf','mimeType':'application/pdf','buffer':b'x'*(10*1024*1024+1)});f.get_by_role('alert').filter(has_text='10 MiB').wait_for();page.once('dialog',lambda a:a.dismiss());page.keyboard.press('Escape');expect(d).to_be_visible();page.screenshot(path=str(ART/'validacao-limite.png'));f.locator('input[type=file]').set_input_files([]);expect(f.get_by_role('alert')).to_have_count(0)
  for theme in ['graphite','dark','light']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   for width in [1440,390]:
    page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});f.scroll_into_view_if_needed();assert d.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1');page.screenshot(path=str(ART/f'{theme}-{width}-comprovantes.png'))
  page.set_viewport_size({'width':1440,'height':1000});finish(d);assert len(state()['receipts'])==2;expense=next(o for o in state()['entryLedger']['operations'] if o['description']=='Despesa com comprovantes');
  row=page.locator('.entries-desktop .entry-row').filter(has_text='Despesa com comprovantes');expect(row.locator('.receipt-badge')).to_have_text('2 comprovante(s)');row.get_by_role('button',name='Comprovantes de Despesa com comprovantes',exact=True).click();d=page.get_by_role('dialog');d.get_by_role('button',name='Ampliar imagem-sintetica.png',exact=True).click();assert d.locator('.receipt-large').count()==1
  with page.expect_download() as dl:d.get_by_role('link',name='Baixar recibo-despesa.pdf',exact=True).click()
  assert Path(dl.value.path()).read_bytes()==pdf('recibo-despesa')['buffer'];d.get_by_role('button',name='Concluir',exact=True).click();saved=page.evaluate("localStorage.getItem('finly-v2')");page.reload();page.get_by_role('heading',name='Lançamentos',exact=True).wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==saved
  print('PASS receipts browser: forms/validation/themes/reload/download',flush=True)
  # Partial settlement explicitly linked to the payment, not copied to the operation.
  row=page.locator('.entries-desktop .entry-row').filter(has_text='Despesa com comprovantes');row.get_by_role('button',name='Editar Despesa com comprovantes',exact=True).click();d=page.get_by_role('dialog');d.get_by_text('Gerenciar pagamentos e histórico',exact=True).click();history=d.locator('.entry-history');attach(history,[pdf('pagamento-parcial')]);history.get_by_label('Observação do pagamento',exact=True).fill('temporário');history.get_by_label('Observação do pagamento',exact=True).fill('');page.once('dialog',lambda a:a.dismiss());page.keyboard.press('Escape');expect(d).to_be_visible();history.get_by_label('Valor do pagamento / recebimento',exact=True).fill('25');history.get_by_label('Data efetiva',exact=True).fill('2026-11-15');history.get_by_role('button',name='Registrar pagamento',exact=True).click();expect(history.locator('.receipt-saved')).to_have_count(1);pay=next(p for p in state()['entryLedger']['settlements'] if p['operationId']==expense['id']);assert any(r['target']=={'kind':'settlement','id':pay['id']} for r in state()['receipts']);d.get_by_role('button',name='Cancelar',exact=True).click()
  # Remaining entry types, genuine JPEG/WebP decoders and shared physical content.
  for tab in ['Receita','Cartão','Reembolso','Transferência']:
   d=open_form(tab)
   if tab!='Transferência':basic(d,tab+' com comprovante')
   else:d.get_by_label('Valor (R$)',exact=True).fill('25');d.get_by_label('Data da operação',exact=True).fill('2026-11-15');d.get_by_label('Conta de destino',exact=True).select_option('cash-b')
   if tab=='Cartão':d.get_by_label('Cartão utilizado',exact=True).select_option('second-card');d.get_by_label('Forma de lançamento',exact=True).select_option('installments');d.get_by_label('Quantidade de parcelas',exact=True).fill('3')
   if tab=='Reembolso':d.get_by_label('Nome da pessoa (opcional)',exact=True).fill('Pessoa sintética')
   attach(d,[image('JPEG' if tab=='Receita' else 'WEBP') if tab in ['Receita','Cartão'] else pdf('recibo-'+tab)]);finish(d,tab in ['Cartão','Transferência'])
  card=next(o for o in state()['entryLedger']['operations'] if o['description']=='Cartão com comprovante');assert any(r['target']=={'kind':'purchase','id':card['purchaseId']} for r in state()['receipts']);assert len([r for r in state()['receipts'] if r['target'].get('id')==card['purchaseId']])==1
  print('PASS receipts browser: five entry types and installments',flush=True)
  # Older records do not need ledger migration; attachments leave finance totals unchanged.
  row=page.locator('.entries-desktop .entry-row').filter(has_text='Registro anterior sintético');row.get_by_role('button',name='Comprovantes de Registro anterior sintético',exact=True).click();d=page.get_by_role('dialog');before=state();attach(d,[image('PNG')]);stable=page.evaluate("localStorage.getItem('finly-v2')");page.evaluate("() => {window.originalReceiptPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='files'){IDBObjectStore.prototype.put=window.originalReceiptPut;throw new DOMException('quota','QuotaExceededError')}return window.originalReceiptPut.apply(this,args)};}");d.get_by_role('button',name='Salvar comprovantes',exact=True).click();d.get_by_role('alert').wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==stable;expect(d.locator('.receipt-fields .receipt-list li')).to_have_count(1);d.get_by_role('button',name='Salvar comprovantes',exact=True).click();d.wait_for(state='hidden');after=state();assert before['transactions']==after['transactions'];assert before['entryLedger']==after['entryLedger'];assert before['planning']==after['planning'];assert any(r['target']=={'kind':'legacy','id':'legacy-phase6'} for r in after['receipts'])
  # Duplicate entry never inherits receipt links.
  row=page.locator('.entries-desktop .entry-row').filter(has_text='Despesa com comprovantes');row.locator('summary').scroll_into_view_if_needed();page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');row.locator('summary').click();row.locator('.entry-menu button').first.wait_for(state='visible');page.wait_for_function('(e)=>!!e.style.top',arg=row.locator('.entry-menu>div').element_handle());row.get_by_role('button',name='Duplicar lançamento',exact=True).click();d=page.get_by_role('dialog');d.get_by_label('Descrição',exact=True).fill('Cópia sem arquivo');finish(d);copy=next(o for o in state()['entryLedger']['operations'] if o['description']=='Cópia sem arquivo');assert not any(r['target']['id']==copy['id'] for r in state()['receipts'])
  print('PASS receipts browser: legacy/quota retry and independent duplication',flush=True)
  row=page.locator('.entries-desktop .entry-row').filter(has_text='Registro anterior sintético');row.get_by_role('button',name='Comprovantes de Registro anterior sintético',exact=True).click();d=page.get_by_role('dialog');attach(d,[pdf('concorrencia')]);other=ctx.new_page();other.goto(url+'/#/lancamentos?competencia=2026-11');other.evaluate("()=>{const s=JSON.parse(localStorage.getItem('finly-v2'));s.revision++;localStorage.setItem('finly-v2',JSON.stringify(s));}");page.wait_for_timeout(150);stable=page.evaluate("localStorage.getItem('finly-v2')");d.get_by_role('button',name='Salvar comprovantes',exact=True).click();d.get_by_role('alert').filter(has_text='Os dados mudaram').wait_for();assert page.evaluate("localStorage.getItem('finly-v2')")==stable;expect(d.locator('.receipt-fields .receipt-list li')).to_have_count(1);page.once('dialog',lambda a:a.accept());d.get_by_role('button',name='Concluir',exact=True).click();other.close()
  # Storage overview and actual ZIP download.
  page.goto(url+'/#/configuracoes/backup?competencia=2026-11');panel=page.get_by_role('region',name='Armazenamento local');panel.get_by_role('button',name='Verificar integridade',exact=True).click();panel.get_by_text('Arquivos físicos',exact=False).wait_for()
  for theme in ['graphite','dark','light']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   for width in [1366,1440,390,768]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.evaluate("[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width})).slice(0,12)");panel.scroll_into_view_if_needed()
    if width in [1440,390]:page.screenshot(path=str(ART/f'{theme}-{width}-armazenamento.png'))
  page.set_viewport_size({'width':1440,'height':1000});panel.get_by_role('button',name='Conferir backup completo',exact=True).click();panel.get_by_role('button',name='Exportar backup completo ZIP',exact=True).wait_for()
  with page.expect_download() as dl:panel.get_by_role('button',name='Exportar backup completo ZIP',exact=True).click()
  zipbytes=Path(dl.value.path()).read_bytes();archive=zipfile.ZipFile(io.BytesIO(zipbytes));manifest=json.loads(archive.read('manifest.json'));backup=archive.read('backup.json');assert hashlib.sha256(backup).hexdigest()==manifest['backupSha256'];assert len(manifest['attachments'])==len(state()['receipts'])
  for a in manifest['attachments']:assert hashlib.sha256(archive.read(a['path'])).hexdigest()==a['sha256']
  original=state();ctx2=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',reduced_motion='reduce');pg=ctx2.new_page();pg.goto(url+'/#/configuracoes/backup?competencia=2026-11');restore_backup(pg,zipbytes,'synthetic-full.zip');assert state(pg)==original;pg.get_by_role('region',name='Armazenamento local').get_by_role('button',name='Verificar integridade',exact=True).click();pg.get_by_text('Arquivos físicos',exact=False).wait_for();pg.screenshot(path=str(ART/'zip-restaurado-mobile.png'))
  print('PASS receipts browser: ZIP downloaded and restored',flush=True)
  # Real browser hashes from restored IndexedDB, not the source ZIP alone.
  stored=pg.evaluate("""async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('finly-receipts',1);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});const rows=await new Promise(ok=>{const r=db.transaction('files').objectStore('files').getAll();r.onsuccess=()=>ok(r.result)});db.close();return Promise.all(rows.map(async r=>({hash:r.hash,actual:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await r.blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('')})))}""");assert all(r['hash']==r['actual'] for r in stored)
  print('PASS receipts browser: restored IndexedDB hashes',flush=True)
  # Tampered ZIP must not replace finance; JSON metadata-only restore explicitly reports missing files.
  bad=io.BytesIO()
  with zipfile.ZipFile(bad,'w',compression=zipfile.ZIP_STORED) as z:
   for name in archive.namelist():z.writestr(name,b'changed' if name=='backup.json' else archive.read(name))
  before=pg.evaluate("localStorage.getItem('finly-v2')");pg.get_by_role('button',name='Importar backup JSON ou ZIP',exact=True).click();d=pg.get_by_role('dialog');d.get_by_label('Selecionar arquivo JSON ou ZIP',exact=True).set_input_files({'name':'tampered.zip','mimeType':'application/zip','buffer':bad.getvalue()});d.get_by_role('alert').wait_for();assert pg.evaluate("localStorage.getItem('finly-v2')")==before;assert d.get_by_role('button',name='Continuar',exact=True).is_disabled();d.get_by_role('button',name='Fechar importação',exact=True).click()
  ctx3=browser.new_context();pj=ctx3.new_page();pj.goto(url+'/#/configuracoes/backup?competencia=2026-11');restore_backup(pj,backup,'metadata.json');pj.get_by_role('region',name='Armazenamento local').get_by_role('button',name='Verificar integridade',exact=True).click();pj.get_by_text('Arquivos ausentes ou corrompidos',exact=False).wait_for();assert len(state(pj)['receipts'])==len(original['receipts'])
  assert page.evaluate("localStorage.getItem('saldoclaro-v1')")=='legado-intocado';assert not errors,errors;browser.close()
 print('PASS Chromium: actual images/PDF/signature+size rejection/multiple/draft protection, saved previews/download/reload, all five types/contracts/partial settlements/legacy, duplication, storage/themes/1366/1440/390/768, real ZIP download+restore and IndexedDB hashes, corrupt ZIP preservation, metadata-only JSON missing reports, unchanged financial data/legacy')
finally:server.shutdown();server.server_close()
