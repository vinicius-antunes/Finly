#!/usr/bin/env python3
"""Optional browser regression check: Python Playwright + system Chromium."""
from pathlib import Path
import functools
import http.server
import threading
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
        context = browser.new_context()
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        url = f'http://127.0.0.1:{server.server_port}'
        page.goto(url)
        assert page.locator('html').get_attribute('data-theme') == 'dark'
        initial = page.evaluate("localStorage.getItem('saldoclaro-v1')")
        assert not page.evaluate("JSON.parse(localStorage.getItem('saldoclaro-v1')).entries.length")
        page.click('#planning-toggle')
        assert page.locator('#planning-toggle').get_attribute('aria-expanded') == 'true'
        page.click('#planning-add')
        assert page.locator('#planning-info').is_visible()
        assert page.locator('#planning-toggle').get_attribute('aria-expanded') == 'true'
        page.keyboard.press('Escape')
        assert page.locator('#planning-add').evaluate('(e)=>e===document.activeElement')
        page.click('[data-view="settings"]')
        page.select_option('#ui-theme', 'light')
        assert page.locator('html').get_attribute('data-theme') == 'light'
        assert page.evaluate("localStorage.getItem('saldoclaro-v1')") == initial
        page.reload()
        page.click('[data-view="settings"]')
        assert page.locator('#ui-theme').input_value() == 'light'
        other = context.new_page()
        other.goto(url)
        other.click('[data-view="settings"]')
        other.select_option('#ui-theme', 'dark')
        page.wait_for_function("document.documentElement.dataset.theme === 'dark'")
        for theme in ('dark', 'light'):
            page.select_option('#ui-theme', theme)
            for view in ('overview','entries','installments','settings'):
                page.click(f'.sidebar [data-view="{view}"]')
                assert page.locator('#view-root').inner_text()
            if page.locator('#planning-toggle').get_attribute('aria-expanded') != 'true':
                page.click('#planning-toggle')
            page.click('.sidebar [data-view="goal"]')
            assert page.locator('#sim-price').is_visible()
            page.click('#new-entry')
            page.fill('#entry-desc','Compra sintética')
            page.fill('#entry-amount','25,00')
            page.select_option('#entry-parts','2')
            page.click('#cancel-dialog')
            assert page.evaluate("localStorage.getItem('saldoclaro-v1')") == initial
            page.set_viewport_size({'width':390,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.set_viewport_size({'width':1280,'height':900})
            page.click('[data-view="settings"]')
        page.click('[data-view="overview"]')
        page.click('#new-entry')
        page.fill('#entry-desc', 'Compra sintética')
        page.fill('#entry-amount', '25,00')
        page.select_option('#entry-parts', '2')
        page.get_by_role('button', name='Salvar lançamento', exact=True).click()
        entries = page.evaluate("JSON.parse(localStorage.getItem('saldoclaro-v1')).entries")
        assert len(entries) == 2 and sum(round(e['amount'] * 100) for e in entries) == 5000
        assert entries[0]['month'] != entries[1]['month']
        page.emulate_media(media='print', reduced_motion='reduce')
        assert page.locator('body').evaluate('(e)=>getComputedStyle(e).backgroundColor') == 'rgb(255, 255, 255)'
        assert not errors, errors
        context.close()
        # Simulate denied preference storage, without disabling financial storage.
        context = browser.new_context()
        context.add_init_script("""const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function(k,v) {if(k==='finly-theme') throw new Error('blocked');return original.call(this,k,v)};""")
        page = context.new_page()
        page.goto(url)
        page.click('[data-view="settings"]')
        page.select_option('#ui-theme', 'light')
        assert page.locator('html').get_attribute('data-theme') == 'light'
        assert 'nesta sessão' in page.locator('#theme-feedback').inner_text()
        browser.close()
    print('PASS: default, persistence, cross-tab sync, data preservation, accordion/modal, views, mobile, print and storage denial')
finally:
    server.shutdown()
    server.server_close()
