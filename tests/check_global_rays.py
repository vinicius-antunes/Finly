#!/usr/bin/env python3
"""Global Light Rays: synthetic browser evidence and layering/performance regressions."""
import functools
import http.server
import json
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'docs/graphite/global-rays'
ART.mkdir(parents=True, exist_ok=True)
BEFORE = '--before' in sys.argv
FIXTURE = {'version': 1, 'settings': {}, 'entries': [
    {'id': 'synthetic-income', 'description': 'Receita sintética', 'amount': 1000, 'month': '2026-11', 'kind': 'income'},
    {'id': 'synthetic-out', 'description': 'Despesa sintética', 'amount': 260, 'month': '2026-11', 'kind': 'out', 'category': 'Alimentação'},
]}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}'


def prepare(context):
    context.add_init_script(f"""
      localStorage.setItem('saldoclaro-v1', JSON.stringify({json.dumps(FIXTURE)}));
      localStorage.setItem('finly-react-theme', 'graphite');
      window.financialWrites = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k,v) {{
        if (k === 'saldoclaro-v1' || k === 'finly-v2') financialWrites.push(k);
        return original.call(this,k,v);
      }};
    """)


def ready(page):
    page.goto(URL)
    page.locator('input[type="month"]').fill('2026-11')
    page.evaluate('document.fonts.ready')
    page.wait_for_selector('.recharts-sector')


def viewport_background(page):
    assert page.locator('.rays-backdrop').count() == 1
    assert page.locator('.balance-hero .rays-backdrop').count() == 0
    assert page.locator('.finly-shell > .rays-backdrop').count() == 1
    assert page.locator('.rays-backdrop').get_attribute('aria-hidden') == 'true'
    assert page.locator('.rays-backdrop').evaluate('''e => {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      return s.position === 'fixed' && s.pointerEvents === 'none' &&
        r.x === 0 && r.y === 0 && r.width === innerWidth && r.height === innerHeight;
    }''')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')


def navigate(page, label, mobile=False):
    if mobile:
        page.get_by_role('button', name='Alternar menu', exact=True).click()
        page.get_by_role('dialog').wait_for()
    page.get_by_role('button', name=label, exact=True).click()
    if mobile and label == 'Planejamentos':
        page.get_by_role('button', name='Recursos disponíveis', exact=True).click()
    if mobile:
        page.get_by_role('dialog').wait_for(state='hidden')
    page.mouse.move(1100 if not mobile else 370, 100)
    page.locator('h1').click()


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
        for width, height, device in ((1440, 1000, 'desktop'), (390, 844, 'mobile')):
            ctx = browser.new_context(viewport={'width': width, 'height': height}, has_touch=device == 'mobile', locale='pt-BR')
            prepare(ctx)
            page = ctx.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            ready(page)
            baseline = page.evaluate("localStorage.getItem('saldoclaro-v1')")
            page.wait_for_timeout(400)
            page.screenshot(path=str(ART / f'{"before" if BEFORE else "after"}-{device}.png'), full_page=True)
            if BEFORE:
                ctx.close()
                continue
            viewport_background(page)
            if device == 'desktop':
                canvas = page.wait_for_selector('.light-rays__canvas')
                assert page.locator('.light-rays__canvas').count() == 1
                assert canvas.evaluate('(c) => c.width*c.height <= 2400000 && c.width <= innerWidth')
            else:
                assert page.locator('.light-rays__canvas').count() == 0
                assert page.locator('.rays-backdrop').evaluate("e => getComputedStyle(e).backgroundImage !== 'none'")
            for label, name in (('Lançamentos', 'entries'), ('Planejamentos', 'planning'), ('Visão geral', 'overview')):
                navigate(page, label, device == 'mobile')
                viewport_background(page)
                if device == 'desktop':
                    assert canvas.evaluate('c => c.isConnected && c === document.querySelector(".light-rays__canvas")')
                if name != 'overview':
                    page.screenshot(path=str(ART / f'after-{device}-{name}.png'), full_page=True)
            # A viewport-fixed backdrop still covers the viewport after document scrolling.
            page.evaluate('window.scrollTo(0,600)')
            viewport_background(page)
            page.evaluate('window.scrollTo(0,0)')
            toggle = page.get_by_label('Efeitos de luz')
            toggle.uncheck()
            assert page.locator('.rays-backdrop').is_hidden()
            assert page.locator('.light-rays__canvas').count() == 0
            navigate(page, 'Lançamentos', device == 'mobile')
            assert page.locator('.rays-backdrop').is_hidden()
            toggle.check()
            viewport_background(page)
            for label in ('Escuro Padrão', 'Claro'):
                page.get_by_role('button', name=label, exact=True).click()
                assert page.locator('.rays-backdrop').is_hidden()
                assert page.locator('.light-rays__canvas').count() == 0
                page.screenshot(path=str(ART / f'{label.split()[0].lower()}-{device}.png'), full_page=True)
            page.get_by_role('button', name='Graphite Green', exact=True).click()
            viewport_background(page)
            # Background remains below both desktop Sidebar and mobile Sheet/overlay.
            if device == 'desktop':
                page.mouse.move(25,220)
                page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288")
                assert page.get_by_role('button', name='Planejamentos', exact=True).evaluate('e => {const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+20,r.y+20))}')
            else:
                page.get_by_role('button', name='Alternar menu', exact=True).click()
                dialog = page.get_by_role('dialog')
                dialog.wait_for()
                page.wait_for_function('''() => {
                  const e = document.querySelector('[role=dialog]'), r = e.getBoundingClientRect();
                  return r.x >= 0 && e.contains(document.elementFromPoint(r.x+30,r.y+30));
                }''')
                page.screenshot(path=str(ART / 'after-mobile-drawer.png'), full_page=True)
                page.keyboard.press('Escape')
                dialog.wait_for(state='hidden')
            for w,h in ((1366,768),(1440,1000),(768,1024),(390,844)):
                page.set_viewport_size({'width':w,'height':h})
                viewport_background(page)
            assert page.evaluate("localStorage.getItem('saldoclaro-v1')") == baseline
            assert page.evaluate('financialWrites') == []
            assert not errors, errors
            ctx.close()
        if not BEFORE:
            # Reduced motion and data savings avoid loading the WebGL module at all.
            for mode in ('reduced', 'save-data', 'no-webgl'):
                ctx = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce' if mode == 'reduced' else 'no-preference')
                prepare(ctx)
                if mode == 'save-data':
                    ctx.add_init_script("window.testConnection = new EventTarget(); testConnection.saveData = true; Object.defineProperty(navigator,'connection',{value:testConnection})")
                if mode == 'no-webgl':
                    ctx.add_init_script("const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args)}")
                page = ctx.new_page()
                rays_requests = []
                page.on('request', lambda request: rays_requests.append(request.url) if '/LightRays-' in request.url else None)
                ready(page)
                viewport_background(page)
                assert page.locator('.rays-backdrop').evaluate("e => getComputedStyle(e).backgroundImage !== 'none'")
                if mode != 'no-webgl':
                    assert page.locator('.light-rays__canvas').count() == 0
                    assert not rays_requests
                if mode == 'save-data':
                    page.evaluate('testConnection.saveData=false;testConnection.dispatchEvent(new Event("change"))')
                    page.wait_for_selector('.light-rays__canvas')
                    page.evaluate('testConnection.saveData=true;testConnection.dispatchEvent(new Event("change"))')
                    page.wait_for_function("!document.querySelector('.light-rays__canvas')")
                if mode == 'reduced':
                    page.screenshot(path=str(ART / 'after-reduced-motion.png'), full_page=True)
                    page.emulate_media(reduced_motion='no-preference')
                    page.wait_for_selector('.light-rays__canvas')
                    page.emulate_media(reduced_motion='reduce')
                    page.wait_for_function("!document.querySelector('.light-rays__canvas')")
                ctx.close()
        browser.close()
    print('PASS:', 'before captures' if BEFORE else 'global viewport/scroll/navigation, one persistent canvas, layers/clicks/Sidebar, toggle, three themes, mobile, reduced motion/save-data/WebGL fallback, zero financial writes')
finally:
    server.shutdown()
    server.server_close()
