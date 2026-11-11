#!/usr/bin/env python3
"""Official MIT replacements: browser behavior and synthetic visual evidence."""
import base64
import functools
import http.server
import json
from pathlib import Path
import subprocess
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'docs/graphite/replacements'
ART.mkdir(parents=True, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
fixture = {'version': 1, 'settings': {}, 'entries': [
    {'id': 'synthetic-1', 'description': 'Receita sintética', 'amount': 100, 'month': '2026-11', 'kind': 'income'},
    {'id': 'synthetic-2', 'description': 'Despesa sintética', 'amount': 20, 'month': '2026-11', 'kind': 'out', 'category': 'Transporte'},
]}
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
        for theme in ('graphite', 'dark', 'light'):
            context = browser.new_context(viewport={'width': 1440, 'height': 1000}, locale='pt-BR')
            context.add_init_script(f"localStorage.setItem('saldoclaro-v1', JSON.stringify({json.dumps(fixture)})); localStorage.setItem('finly-react-theme','{theme}'); window.financialWrites=[]; const original=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){{if(k==='saldoclaro-v1'||k==='finly-v2')financialWrites.push(k); return original.call(this,k,v)}};")
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            with tempfile.TemporaryDirectory(prefix='finly-record-') as temp:
                frames = []
                recording = context.new_cdp_session(page) if theme == 'graphite' else None
                if recording:
                    def frame(event):
                        path = Path(temp) / f'{len(frames):05d}.jpg'
                        path.write_bytes(base64.b64decode(event['data']))
                        frames.append((path, event['metadata']['timestamp']))
                        recording.send('Page.screencastFrameAck', {'sessionId': event['sessionId']})
                    recording.on('Page.screencastFrame', frame)
                    recording.send('Page.startScreencast', {'format': 'jpeg', 'quality': 75, 'maxWidth': 1440, 'maxHeight': 1000, 'everyNthFrame': 2})
                page.mouse.move(1100, 120)
                page.goto(f'http://127.0.0.1:{server.server_port}')
                page.locator('input[type="month"]').fill('2026-11')
                baseline = page.evaluate("localStorage.getItem('saldoclaro-v1')")
                toggle = page.get_by_role('button', name='Alternar menu', exact=True)
                desktop = page.locator('[data-slot="sidebar-container"]')
                def state(expected):
                    page.wait_for_function("expected => document.querySelector('[data-slot=sidebar][data-collapsible]').dataset.state===expected", arg=expected)
                def assert_width(expected):
                    page.wait_for_function("expected => Math.abs(document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width-expected)<1", arg=expected)
                state('collapsed'); assert_width(60)
                assert page.locator('.finance-monogram').count() == 0
                assert page.locator('.finance-brand').is_hidden()
                page.evaluate('document.fonts.ready')
                page.screenshot(path=str(ART / f'{theme}-sidebar-collapsed.png'), full_page=True)
                page.mouse.move(28, 220)
                state('expanded'); assert_width(288)
                assert page.locator('.brand-copy').is_visible()
                assert page.locator('.brand-copy').inner_text() == 'Finly\nFINANÇAS COM CLAREZA'
                page.screenshot(path=str(ART / f'{theme}-sidebar-expanded.png'), full_page=True)
                for name in ('Lançamentos', 'Sobre a migração', 'Visão geral'):
                    page.get_by_role('button', name=name, exact=True).hover()
                    state('expanded')
                assert page.get_by_role('tooltip').count() == 0
                planning = page.get_by_role('button', name='Planejamentos', exact=True)
                planning.click()
                assert planning.get_attribute('aria-expanded') == 'true'
                page.get_by_role('button', name='Recursos disponíveis', exact=True).click()
                page.mouse.move(1000, 120)
                state('collapsed'); assert_width(60)
                # Button pinning survives complete pointer enter/leave cycles.
                toggle.click(); state('expanded'); assert toggle.get_attribute('aria-pressed') == 'true'
                page.mouse.move(28, 220); page.mouse.move(1000, 120)
                state('expanded')
                toggle.click(); state('collapsed'); assert toggle.get_attribute('aria-pressed') == 'false'
                toggle.focus(); page.keyboard.press('Enter'); state('expanded')
                assert toggle.get_attribute('aria-pressed') == 'true'
                page.keyboard.press('Space'); state('collapsed')
                # Real keyboard navigation opens transiently without setting the pin.
                toggle.focus(); page.keyboard.press('Shift+Tab')
                state('expanded')
                planning.focus()
                if planning.get_attribute('aria-expanded') != 'true': page.keyboard.press('Space')
                assert page.get_by_role('button', name='Recursos disponíveis', exact=True).is_visible()
                page.mouse.move(1100, 120); state('expanded')
                toggle.focus(); state('collapsed')
                page.keyboard.press('Control+b'); state('expanded')
                page.keyboard.press('Control+b'); state('collapsed')
                # Keep a full-view reference of the preserved Magic UI hover.
                page.evaluate('document.fonts.ready')
                card = page.locator('[data-slot="magic-ui-card"]').first
                before = card.get_attribute('style')
                card.hover(position={'x': 100, 'y': 100})
                page.wait_for_function("before => document.querySelector('[data-slot=magic-ui-card]').getAttribute('style') !== before", arg=before)
                page.wait_for_timeout(220)
                page.screenshot(path=str(ART / f'{theme}-cards-desktop.png'), full_page=True)
                card.locator('h3').evaluate('(e)=>window.getSelection().selectAllChildren(e)')
                assert page.evaluate('window.getSelection().toString()') == 'Metas múltiplas'
                page.evaluate('window.getSelection().removeAllRanges()')
                for width, height in ((1366, 768), (1440, 1000), (768, 1024), (390, 844)):
                    page.set_viewport_size({'width': width, 'height': height})
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                toggle.click()
                dialog = page.get_by_role('dialog', name='Navegação do Finly')
                dialog.wait_for()
                assert dialog.locator('.brand-copy').is_visible()
                page.wait_for_function("document.querySelector('[role=dialog]').getAnimations().every(a=>a.playState==='finished')")
                page.screenshot(path=str(ART / f'{theme}-mobile-drawer.png'), full_page=False)
                for _ in range(12):
                    page.keyboard.press('Tab')
                    assert dialog.evaluate('(e)=>e.contains(document.activeElement)')
                page.keyboard.press('Escape')
                dialog.wait_for(state='hidden')
                assert toggle.evaluate('(e)=>e===document.activeElement')
                toggle.click()
                dialog.wait_for()
                page.get_by_role('button', name='Lançamentos', exact=True).click()
                dialog.wait_for(state='hidden')
                assert page.locator('h1').inner_text() == 'Lançamentos'
                assert page.locator('tbody tr').count() == 2
                toggle.click()
                parent = page.get_by_role('button', name='Planejamentos', exact=True)
                if parent.get_attribute('aria-expanded') != 'true': parent.click()
                page.get_by_role('button', name='Recursos disponíveis', exact=True).click()
                dialog.wait_for(state='hidden')
                page.screenshot(path=str(ART / f'{theme}-cards-mobile.png'), full_page=True)
                page.set_viewport_size({'width':1440,'height':1000})
                desktop.wait_for()
                page.emulate_media(reduced_motion='reduce')
                assert desktop.evaluate('(e)=>getComputedStyle(e).transitionDuration') == '0s'
                page.mouse.move(28,220); state('expanded'); assert_width(288)
                page.mouse.move(1100,120); state('collapsed'); assert_width(60)
                card = page.locator('[data-slot="magic-ui-card"]').first
                assert card.locator('.pointer-events-none').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).display==="none")')
                assert page.evaluate("localStorage.getItem('saldoclaro-v1')") == baseline
                assert page.evaluate('financialWrites') == []
                assert not errors, errors
                if recording:
                    recording.send('Page.stopScreencast')
                    recording.remove_listener('Page.screencastFrame', frame)
                    playlist = Path(temp) / 'frames.txt'
                    playlist.write_text(''.join(f"file '{path}'\nduration {max(.04,min(1,(frames[i+1][1]-t) if i+1<len(frames) else .1))}\n" for i,(path,t) in enumerate(frames)))
                    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(playlist), '-vf', 'scale=1440:1000:force_original_aspect_ratio=decrease,pad=1440:1000:(ow-iw)/2:(oh-ih)/2,format=yuv420p', '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', str(ART / 'navigation-magic-card.webm')], check=True)
            context.close()
        for mobile_width in (390, 768):
            touch = browser.new_context(viewport={'width': mobile_width, 'height': 844}, has_touch=True)
            page = touch.new_page()
            page.goto(f'http://127.0.0.1:{server.server_port}')
            page.mouse.move(20, 200)
            assert page.get_by_role('dialog').count() == 0
            page.get_by_role('button', name='Alternar menu', exact=True).tap()
            page.get_by_role('button', name='Planejamentos', exact=True).tap()
            page.get_by_role('button', name='Recursos disponíveis', exact=True).tap()
            page.get_by_role('dialog').wait_for(state='hidden')
            assert page.locator('[data-slot="magic-ui-card"]').count() == 3
            assert page.locator('[data-slot="magic-ui-card"] .pointer-events-none').evaluate_all('(es)=>es.every(e=>getComputedStyle(e).display==="none")')
            touch.close()
        browser.close()
    print('PASS: Sidebar initial 60px, hover 288px, leave, descendants, pin/unpin, keyboard/planning/mobile 390/768/focus/Escape, Magic UI hover/text selection/reduced motion, three themes and zero financial writes.')
finally:
    server.shutdown()
    server.server_close()
