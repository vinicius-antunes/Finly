#!/usr/bin/env python3
"""Measure Sidebar icon alignment in Chromium; --before captures the old build."""
import functools
import http.server
import json
import sys
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'docs/graphite/sidebar-alignment'
ART.mkdir(parents=True, exist_ok=True)
BEFORE = '--before' in sys.argv
GEOMETRY = '''() => ['Visão geral','Lançamentos','Planejamentos','Sobre a migração'].map(label => {
  const button = document.querySelector(`button[aria-label="${label}"]`);
  const rect = button.getBoundingClientRect(), icon = button.querySelector('svg').getBoundingClientRect();
  const text = button.querySelector('span'), arrow = button.querySelector('.planning-chevron');
  return {label, slot:button.dataset.slot, active:button.dataset.active,
    center:icon.x+icon.width/2, buttonCenter:rect.x+rect.width/2, width:rect.width,
    textHidden:getComputedStyle(text).display==='none', arrowHidden:!arrow || getComputedStyle(arrow).display==='none'};
})'''


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()


def collapsed(page):
    page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===60")
    rows = page.evaluate(GEOMETRY)
    if not BEFORE:
        assert all(abs(row['center'] - 30) < .1 for row in rows), rows
        assert all(abs(row['center'] - row['buttonCenter']) < .1 and row['width'] == 44 for row in rows), rows
        assert all(row['textHidden'] and row['arrowHidden'] for row in rows), rows
        assert all(row['slot'] == 'sidebar-menu-button' for row in rows), rows
    return rows


def screenshot(page, name):
    page.screenshot(path=str(ART / f'{name}.png'), clip={'x':0,'y':0,'width':340,'height':500})


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
        results = {}
        for theme in ('graphite','dark','light'):
            context = browser.new_context(viewport={'width':1440,'height':1000}, locale='pt-BR')
            context.add_init_script(f"localStorage.setItem('finly-react-theme','{theme}')")
            page = context.new_page()
            page.mouse.move(1100,100)
            page.goto(f'http://127.0.0.1:{server.server_port}')
            page.evaluate('document.fonts.ready')
            prefix = f'{theme}-{"before" if BEFORE else "after"}'
            results[f'{theme}-inactive'] = collapsed(page)
            screenshot(page, f'{prefix}-inactive')
            page.get_by_role('button', name='Planejamentos', exact=True).click()
            page.mouse.move(1100,100)
            page.locator('h1').click()
            results[f'{theme}-active'] = collapsed(page)
            assert results[f'{theme}-active'][2]['active'] == 'true'
            screenshot(page, f'{prefix}-active')
            if not BEFORE:
                # Sample every animation frame: the Target must track the other icons.
                page.evaluate(f'''window.alignmentFrames=[]; window.sampleAlignment=true;
                  const geometry={GEOMETRY};
                  function sample(){{alignmentFrames.push(geometry().map(row=>row.center));
                    if(sampleAlignment)requestAnimationFrame(sample)}}
                  requestAnimationFrame(sample);''')
                page.mouse.move(28,220)
                page.wait_for_function("document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width===288")
                expanded = page.evaluate(GEOMETRY)
                assert all(abs(row['center'] - expanded[0]['center']) < .1 for row in expanded), expanded
                assert all(not row['textHidden'] for row in expanded)
                assert not expanded[2]['arrowHidden']
                assert page.get_by_role('button', name='Recursos disponíveis', exact=True).is_visible()
                screenshot(page, f'{prefix}-expanded')
                page.mouse.move(1100,100)
                collapsed(page)
                page.evaluate('window.sampleAlignment=false')
                frames = page.evaluate('alignmentFrames')
                assert len(frames) > 2
                assert all(max(frame)-min(frame) < .1 for frame in frames), frames
                results[f'{theme}-transition-max-delta'] = max(max(frame)-min(frame) for frame in frames)
                page.get_by_role('button', name='Visão geral', exact=True).click()
                page.mouse.move(1100,100)
                page.locator('h1').click()
                collapsed(page)
                assert not page.evaluate("localStorage.getItem('saldoclaro-v1') || localStorage.getItem('finly-v2')")
            context.close()
        browser.close()
    (ART / f'{"before" if BEFORE else "after"}-measurements.json').write_text(json.dumps(results, ensure_ascii=False, indent=2)+'\n')
    print('PASS:', 'before measurements/captures' if BEFORE else 'four icon centers x=30, active highlight centered, hidden labels/arrow, expanded submenu, animation frames aligned, three themes')
finally:
    server.shutdown()
    server.server_close()
