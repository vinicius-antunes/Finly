"""Reproduce the compact CSS comparison with identical synthetic data and current JS."""
import functools, http.server, threading, subprocess, json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'docs/new-entry/phase-7-evidence'
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
raw = subprocess.check_output(['node', '--input-type=module', '-e', "import {syntheticReimbursementState} from './tests/fixtures/reimbursement-ledger.mjs';console.log(JSON.stringify(syntheticReimbursementState()))"], cwd=ROOT, text=True).strip()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
        context = browser.new_context(viewport={'width': 1366, 'height': 768}, reduced_motion='reduce')
        context.add_init_script("localStorage.setItem('finly-v2'," + json.dumps(raw) + ");")
        page = context.new_page()
        page.goto(f'http://127.0.0.1:{server.server_port}/#/visao-geral?competencia=2026-11')
        page.locator('.monthly-spending table').wait_for(state='attached')
        page.evaluate('document.fonts.ready')
        after = page.locator('.executive-dashboard').bounding_box()
        assert after['y'] + after['height'] <= 768
        page.screenshot(path=str(ART / 'compact-after.png'))
        # Delete only the new short-desktop rule in this disposable page to recreate the preceding CSS state.
        removed = page.evaluate("""() => {let removed=0;for(const sheet of document.styleSheets){for(let i=sheet.cssRules.length-1;i>=0;i--){const r=sheet.cssRules[i];if(r.type===CSSRule.MEDIA_RULE && r.conditionText.includes('max-height: 800px') && r.conditionText.includes('min-width: 1101px') && r.cssText.includes('executive-dashboard')){sheet.deleteRule(i);removed++;}}}return removed;}""")
        assert removed == 1
        before = page.locator('.executive-dashboard').bounding_box()
        assert before['y'] + before['height'] > 768
        page.screenshot(path=str(ART / 'compact-before.png'))
        assert page.evaluate("localStorage.getItem('finly-v2')") == raw
        (ART / 'layout-comparison.json').write_text(json.dumps({'viewport': {'width': 1366, 'height': 768}, 'before': before, 'after': after, 'method': 'Same current application and synthetic data. Before removes only the newly added compact CSS media rule in a disposable page; after uses the actual production build.'}, indent=2) + '\n')
        browser.close()
    print('PASS compact comparison:', round(before['y']+before['height'],2), '→', round(after['y']+after['height'],2))
finally:
    server.shutdown()
    server.server_close()
