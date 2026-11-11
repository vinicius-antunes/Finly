#!/usr/bin/env python3
"""Browser regression + reproducible screenshots using synthetic data only.
Requires optional development tools: Python Playwright, system Chromium.
"""
import functools
import http.server
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'docs/screenshots'
ART.mkdir(exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1',0), functools.partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1100}, reduced_motion='reduce')
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.install(time=__import__('datetime').datetime(2026,11,15,12,0))
    page.goto(url)
    data=page.evaluate("JSON.parse(localStorage.getItem('saldoclaro-v1'))")
    data['noticeDismissed']=True
    data['settings'].update(salary=4800,reserve=7200,cushion=600,goal=3500)
    def entry(id,desc,amount,kind,**kw):
        return dict(id=id,description=desc,amount=amount,month='2026-11',kind=kind,category='Exemplo sintético',owner='self',status='planned',confirmed=True,note='Dado fictício para teste',**kw)
    data['entries']=[entry('demo-1','Equipamento de estudo',240,'credit',groupId='demo-group',part=1,parts=3),entry('demo-2','Transporte urbano',180,'out'),entry('demo-3','Projeto criativo',450,'income'),entry('demo-4','Compra compartilhada',120,'reimbursement'),entry('demo-5','Curso de ilustração',89.90,'credit')]
    data['entries'][2]['status']='received'
    data['entries'][-1]['confirmed']=False
    data['invoiceStatuses']={'2026-11':'unpaid'}
    page.evaluate('(d)=>localStorage.setItem("saldoclaro-v1",JSON.stringify(d))',data);page.reload()
    baseline=page.evaluate("localStorage.getItem('saldoclaro-v1')")
    assert page.locator('.hero-value').inner_text().replace('\xa0',' ')=='R$ 4.140,10'
    assert page.locator('.premium-summary').count()==1
    def nav(view):
        if page.viewport_size['width']<761:
            page.click('#mobile-menu')
        page.click(f'.sidebar [data-view="{view}"]')
    for theme in ('dark','light'):
        nav('settings');page.select_option('#ui-theme',theme);nav('overview')
        page.screenshot(path=str(ART/f'{theme}-desktop.png'),full_page=True)
        nav('entries');assert page.locator('tbody tr').count()==5
        page.select_option('#filter-status','forecast');assert page.locator('tbody tr').count()==1
        page.click('[data-action="clear-filters"]');page.fill('#search-entry','<img src=x onerror=alert(1)>');assert page.locator('tbody tr').count()==0
        page.click('[data-action="clear-filters"]');page.fill('#filter-min','200');page.locator('#filter-min').press('Tab');assert page.locator('tbody tr').count()==2
        page.screenshot(path=str(ART/f'{theme}-entries.png'),full_page=True)
        page.click('[data-action="clear-filters"]');nav('installments');page.screenshot(path=str(ART/f'{theme}-installments.png'),full_page=True)
        nav('overview');page.click('#new-entry');page.screenshot(path=str(ART/f'{theme}-form.png'))
        page.click('#cancel-dialog');page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(ART/f'{theme}-mobile.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        nav('entries');assert page.locator('tbody tr').count()==5
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.set_viewport_size({'width':1440,'height':1100})
        assert page.evaluate("localStorage.getItem('saldoclaro-v1')")==baseline
    # Local read states are stable and independent of financial data.
    page.click('#notifications-open');assert page.locator('.notification-item').count()==3
    page.locator('[data-alert-read]').first.click();read_count=page.locator('#notification-count').inner_text();page.click('#notifications-close');page.reload()
    assert page.locator('#notification-count').inner_text()==read_count
    assert page.evaluate("localStorage.getItem('saldoclaro-v1')")==baseline
    nav('settings')
    with page.expect_download() as download:
        page.click('[data-action="export-json"]')
    backup=json.loads(Path(download.value.path()).read_text());backup.pop('exportedAt');assert backup==json.loads(baseline)
    with page.expect_download() as download:
        page.click('[data-action="export-csv"]')
    assert 'Equipamento de estudo' in Path(download.value.path()).read_text(encoding='utf-8-sig')
    # Backup round trip; explicit confirmation, synthetic data only.
    page.on('dialog',lambda dialog:dialog.accept())
    page.set_input_files('#import-file',{'name':'synthetic.json','mimeType':'application/json','buffer':baseline.encode()})
    assert page.evaluate("JSON.parse(localStorage.getItem('saldoclaro-v1'))")==json.loads(baseline)
    page.click('#new-entry');page.fill('#entry-desc','Parcelamento sintético');page.fill('#entry-amount','19,99');page.fill('#entry-month','2026-12');page.select_option('#entry-parts','3');page.get_by_role('button',name='Salvar lançamento',exact=True).click()
    records=page.evaluate("JSON.parse(localStorage.getItem('saldoclaro-v1')).entries").__getitem__(slice(5,None))
    assert [r['month'] for r in records]==['2026-12','2027-01','2027-02']
    assert sum(round(r['amount']*100) for r in records)==5997
    assert len({r['id'] for r in records})==3 and len({r['groupId'] for r in records})==1
    # Accepted legacy pending arrays may contain nulls; notifications must tolerate them.
    legacy=page.evaluate("JSON.parse(localStorage.getItem('saldoclaro-v1'))")
    legacy['pending']=[None]
    page.evaluate('(d)=>localStorage.setItem("saldoclaro-v1",JSON.stringify(d))',legacy)
    page.reload();page.click('#notifications-open');page.click('#notifications-close')
    nav('settings');page.click('[data-action="reset"]')
    assert page.evaluate("localStorage.getItem('finly-notification-reads')") is None
    assert not errors,errors
    browser.close()
 print('PASS: premium layouts, both themes, filters, XSS search, local alerts, data invariance, backup/CSV/import, installments; 10 synthetic screenshots')
finally:
 server.shutdown();server.server_close()
