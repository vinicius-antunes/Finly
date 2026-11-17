from month_picker_helpers import select_month
"""Phase 5 management, histories and persistence failures, synthetic data only."""
import functools, http.server, json, subprocess, threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from backup_helpers import restore_backup
ROOT=Path(__file__).resolve().parent.parent
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
raw=subprocess.check_output(['node','--input-type=module','-e',"import {syntheticReimbursementState} from './tests/fixtures/reimbursement-ledger.mjs';console.log(JSON.stringify(syntheticReimbursementState()))"],cwd=ROOT,text=True).strip()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  ctx=b.new_context(viewport={'width':1440,'height':1000},locale='pt-BR')
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url+'/#/configuracoes/backup?competencia=2026-11');restore_backup(page,raw,'synthetic-management.json')
  def state(): return json.loads(page.evaluate("localStorage.getItem('finly-v2')"))
  def entries(): page.goto(url+'/#/lancamentos?competencia=2026-11')
  def open_form(tab='Despesa'):
   page.get_by_role('button',name='Novo lançamento',exact=True).click()
   d=page.get_by_role('dialog');d.get_by_role('tab',name=tab,exact=True).click();return d
  def confirm_preview(d):
   d.get_by_label('Conferi os valores, vínculos e o impacto financeiro.').check()
   d.get_by_role('button',name='Confirmar e salvar',exact=True).click();d.wait_for(state='hidden')
  entries()
  row=page.locator('.entries-desktop .entry-row').filter(has_text='Contrato sintético com centavos')
  row.get_by_role('button',name='Editar Contrato sintético com centavos',exact=True).click()
  d=page.get_by_role('dialog');assert d.get_by_label('Data da compra',exact=True).is_disabled()
  d.get_by_label('Valor (R$)',exact=True).fill('40');d.get_by_label('Aplicar alteração a',exact=True).select_option('following')
  d.get_by_label('Motivo da alteração',exact=True).fill('Ajuste sintético das parcelas');d.get_by_role('button',name='Revisar alterações',exact=True).click();confirm_preview(d)
  contract=next(c for c in state()['entryLedger']['purchases'] if c['id']=='synthetic-contract')
  assert contract['contractedCents']==12000
  assert next(a for a in state()['entryLedger']['agreements'] if a['id']=='synthetic-agreement')['terms']['totalCents']==4500
  row=page.locator('.entries-desktop .entry-row').filter(has_text='Contrato sintético com centavos')
  row.get_by_label('Mais ações de Contrato sintético com centavos',exact=True).click();row.get_by_role('button',name='Duplicar lançamento',exact=True).click()
  d=page.get_by_role('dialog');d.get_by_label('Descrição',exact=True).fill('Cópia independente sintética')
  old=state();d.get_by_role('button',name='Salvar lançamento',exact=True).click();confirm_preview(d)
  now=state();assert len(now['entryLedger']['purchases'])==len(old['entryLedger']['purchases'])+1
  assert now['entryLedger']['settlements']==old['entryLedger']['settlements']
  assert now['entryLedger']['agreements']==old['entryLedger']['agreements']
  d=open_form('Reembolso');d.get_by_label('Descrição',exact=True).fill('Cronograma personalizado sintético');d.get_by_label('Valor (R$)',exact=True).fill('80');d.get_by_label('Modalidade do reembolso',exact=True).select_option('custom')
  for i,(amount,period) in enumerate([('30','2026-11'),('50','2026-12')],start=1):
   d.get_by_role('button',name='Adicionar previsão',exact=True).click();d.get_by_label(f'Valor previsto {i}',exact=True).fill(amount);select_month(d.get_by_label(f'Mês de referência previsto {i}',exact=True), period)
  before=len(state()['entryLedger']['agreements']);d.get_by_role('button',name='Salvar lançamento',exact=True).click();d.get_by_label('Conferi os valores, vínculos e o impacto financeiro.').check()
  d.get_by_role('button',name='Confirmar e salvar',exact=True).evaluate('(e)=>{e.click();e.click()}');d.wait_for(state='hidden')
  assert len(state()['entryLedger']['agreements'])==before+1
  assert [r['amountCents'] for r in state()['entryLedger']['agreements'][-1]['terms']['schedule']]==[3000,5000]
  d=open_form();d.get_by_label('Descrição',exact=True).fill('Despesa preservada na falha');d.get_by_label('Valor (R$)',exact=True).fill('25')
  previous=page.evaluate("localStorage.getItem('finly-v2')")
  page.evaluate("()=>{window.__set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='finly-v2')throw new DOMException('Quota','QuotaExceededError');return window.__set.call(this,k,v)}}")
  d.get_by_role('button',name='Salvar lançamento',exact=True).click();expect(d.get_by_role('alert')).to_contain_text('Não foi possível salvar')
  assert page.evaluate("localStorage.getItem('finly-v2')")==previous
  assert d.get_by_label('Descrição',exact=True).input_value()=='Despesa preservada na falha'
  page.evaluate('()=>{Storage.prototype.setItem=window.__set}');d.get_by_role('button',name='Salvar lançamento',exact=True).click();d.wait_for(state='hidden')
  d=open_form('Transferência');d.get_by_label('Valor (R$)',exact=True).fill('10');d.get_by_label('Conta de destino',exact=True).select_option('cash-b');d.get_by_role('button',name='Salvar lançamento',exact=True).click()
  other=ctx.new_page();other.goto(url);other.evaluate("const s=JSON.parse(localStorage.getItem('finly-v2'));s.revision++;localStorage.setItem('finly-v2',JSON.stringify(s))")
  expect(d.get_by_label('Conferi os valores, vínculos e o impacto financeiro.')).to_have_count(0)
  expect(d.get_by_role('alert')).to_contain_text('dados foram atualizados')
  assert '10' in d.get_by_label('Valor (R$)',exact=True).input_value()
  other.close();d.get_by_role('button',name='Salvar lançamento',exact=True).click();confirm_preview(d)
  # Category/account creation is explicit and cannot submit its surrounding entry form.
  d=open_form();d.get_by_label('Descrição',exact=True).fill('Despesa categorizada sintética');d.get_by_label('Valor (R$)',exact=True).fill('12')
  count=len(state()['entryLedger']['operations']);d.get_by_label('Categoria (opcional)',exact=True).fill('Categoria do modal')
  d.get_by_role('option',name='Criar “Categoria do modal”',exact=True).click();assert len(state()['entryLedger']['operations'])==count
  d.get_by_role('button',name='Cadastrar contas e cartões',exact=True).click();d.get_by_text('Gerenciar contas',exact=True).click();d.get_by_label('Nome da conta',exact=True).fill('Conta criada no modal');d.get_by_role('button',name='Adicionar conta',exact=True).click()
  assert len(state()['entryLedger']['operations'])==count
  assert state()['entryLedger']['accounts'][-1]['name']=='Conta criada no modal'
  d.get_by_role('button',name='Salvar lançamento',exact=True).click();d.wait_for(state='hidden')
  category=state()['entryLedger']['categories'][-1];assert next(o for o in state()['entryLedger']['operations'] if o['description']=='Despesa categorizada sintética')['categoryId']==category['id']
  page.goto(url+'/#/fatura?competencia=2026-11');page.get_by_role('button',name='Gerenciar pagamentos da fatura',exact=True).first.click();d=page.get_by_role('dialog')
  refund_before=state()['entryLedger']['settlements'];d.get_by_label('Valor do pagamento / recebimento',exact=True).fill('40');page.once('dialog',lambda a:a.dismiss());page.keyboard.press('Escape');assert d.is_visible();d.get_by_label('Data efetiva',exact=True).fill('2026-11-15');d.get_by_role('button',name='Registrar pagamento',exact=True).click()
  assert state()['entryLedger']['settlements']==refund_before
  assert len(state()['entryLedger']['invoicePayments'])==2
  page.once('dialog',lambda a:a.accept());d.get_by_role('button',name='Estornar',exact=True).first.click()
  assert len(state()['entryLedger']['invoicePayments'])==3
  d.get_by_role('button',name='Concluir',exact=True).click()
  page.goto(url+'/#/parcelas?competencia=2026-11')
  page.get_by_role('tab',name='Recorrências',exact=True).click();page.locator('.contract-card').filter(has=page.get_by_role('heading',name='Recorrência sintética mensal',exact=True)).get_by_text('Ocorrências, histórico e ações',exact=True).click()
  recurring=page.locator('.entry-subcard').filter(has=page.get_by_role('heading',name='Recorrência sintética mensal',exact=True))
  recurring.get_by_text('Alterar recorrência e consultar ocorrências',exact=True).click()
  for action,date,status in [('Pausar','2026-11-15','paused'),('Retomar','2026-11-16','active'),('Cancelar recorrência','2026-11-17','cancelled')]:
   recurring.get_by_label('Data da alteração da recorrência',exact=True).fill(date);page.once('dialog',lambda a:a.accept());recurring.get_by_role('button',name=action,exact=True).click();assert next(r for r in state()['entryLedger']['recurrences'] if r['id']=='synthetic-rec')['status']==status
  assert len(next(r for r in state()['entryLedger']['recurrences'] if r['id']=='synthetic-rec')['events'])==3
  # An external edit must not close or silently overwrite a legacy draft.
  other=ctx.new_page();other.goto(url)
  other.evaluate("()=>{const s=JSON.parse(localStorage.getItem('finly-v2'));s.transactions.push({id:'legacy-ui-guard',description:'Legado sintético protegido',amountCents:1000,period:'2026-11',legacyKind:'out',accountId:'legacy-cash',category:'Casa',owner:'self',status:'planned',confirmed:true,note:''});s.revision++;localStorage.setItem('finly-v2',JSON.stringify(s))}")
  entries();row=page.locator('.entries-desktop .entry-row').filter(has_text='Legado sintético protegido');row.get_by_role('button',name='Editar Legado sintético protegido',exact=True).click()
  d=page.get_by_role('dialog');d.get_by_label('Descrição',exact=True).fill('Rascunho legado preservado')
  other.evaluate("()=>{const s=JSON.parse(localStorage.getItem('finly-v2'));s.transactions.find(x=>x.id==='legacy-ui-guard').amountCents=2000;s.revision++;localStorage.setItem('finly-v2',JSON.stringify(s))}")
  expect(row.locator('.entry-value')).to_contain_text('20,00')
  expect(d.get_by_label('Descrição',exact=True)).to_have_value('Rascunho legado preservado')
  d.get_by_role('button',name='Salvar alterações',exact=True).click();expect(d.get_by_role('alert')).to_contain_text('alterado em outra aba')
  assert next(x for x in state()['transactions'] if x['id']=='legacy-ui-guard')['amountCents']==2000
  page.once('dialog',lambda a:a.dismiss());page.keyboard.press('Escape');assert d.is_visible()
  page.once('dialog',lambda a:a.accept());d.get_by_role('button',name='Cancelar',exact=True).click();d.wait_for(state='hidden');other.close()
  assert not errors,errors;b.close()
 print('PASS: installment scopes, audited edits, independent duplication, exact custom schedules/double-submit, quota preservation/retry, stale preview invalidation, real category/account creation without accidental submit, independent invoice payment/reversal and recurrence pause/resume/cancel')
finally:
 server.shutdown();server.server_close()
