"""WCAG AA automated checks plus actual keyboard/responsive tests, synthetic only."""
import functools, http.server, threading, subprocess, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]; ART=ROOT/'docs/new-entry/phase-7-evidence';ART.mkdir(parents=True,exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
raw=subprocess.check_output(['node','--input-type=module','-e',"import {syntheticReimbursementState} from './tests/fixtures/reimbursement-ledger.mjs';console.log(JSON.stringify(syntheticReimbursementState()))"],cwd=ROOT,text=True).strip()
results=[];issues=[];errors=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,headless=True)
  for theme in ['graphite','dark','light']:
   c=b.new_context(viewport={'width':1440,'height':900},locale='pt-BR',reduced_motion='reduce');c.add_init_script("if(!localStorage.getItem('finly-v2'))localStorage.setItem('finly-v2',"+json.dumps(raw)+");localStorage.setItem('saldoclaro-v1','legado-intocado');localStorage.setItem('finly-react-theme',"+json.dumps(theme)+");")
   pg=c.new_page();pg.on('dialog',lambda a:a.accept());pg.on('pageerror',lambda e:errors.append(str(e)))
   def axe(label):
    pg.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
    result=pg.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {passes:r.passes.length,incomplete:r.incomplete.length,violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}}")
    results.append({'theme':theme,'screen':label,**result});Path('/tmp/finly-phase7-axe-partial.json').write_text(json.dumps(results))
    issues.extend({'theme':theme,'screen':label,**v} for v in result['violations'])
   for route in ['visao-geral','lancamentos','fatura','reembolsos','parcelas','planejamentos','configuracoes/financeiro','configuracoes/backup']:
    pg.goto(url+'/#/'+route+'?competencia=2026-11');pg.locator('main h1').wait_for();pg.evaluate('document.fonts.ready');axe(route)
    if route in ['visao-geral','lancamentos','planejamentos']:
     pg.screenshot(path=str(ART/f'{theme}-{route}-desktop.png'))
    for w,h in [(1920,1080),(1440,900),(1366,768),(1024,900),(768,1024),(390,844),(360,800)]:
     pg.set_viewport_size({'width':w,'height':h});assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,route,w)
     if route=='visao-geral' and w>=1366:assert pg.locator('.executive-dashboard').evaluate('(e)=>e.getBoundingClientRect().bottom')<=h+1,(theme,w,h,pg.locator('.executive-dashboard').bounding_box())
     if w==390 and route in ['visao-geral','lancamentos','planejamentos']:pg.screenshot(path=str(ART/f'{theme}-{route}-mobile.png'))
    pg.set_viewport_size({'width':1440,'height':900})
   pg.goto(url+'/#/lancamentos?competencia=2026-11');opener=pg.get_by_role('button',name='Novo lançamento',exact=True);opener.click();d=pg.get_by_role('dialog')
   for tab in ['Despesa','Receita','Cartão','Reembolso','Transferência']:
    d.get_by_role('tab',name=tab,exact=True).click();axe('form-'+tab)
    for w,h in [(1920,1080),(1440,900),(1366,768),(1024,900),(768,1024),(390,844),(360,800)]:
     pg.set_viewport_size({'width':w,'height':h});assert d.evaluate('(e)=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1}')
     save=d.get_by_role('button',name='Salvar lançamento',exact=True);assert save.evaluate('(e)=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1}')
     if w in [1440,390] and tab=='Cartão':pg.screenshot(path=str(ART/f'{theme}-form-{w}.png'))
    pg.set_viewport_size({'width':1440,'height':900})
   for key in ['Tab','Shift+Tab']*12:pg.keyboard.press(key);assert d.evaluate('(e)=>e.contains(document.activeElement)')
   d.get_by_role('tab',name='Despesa',exact=True).click();pg.keyboard.press('Escape');d.wait_for(state='hidden');expect(opener).to_be_focused();assert pg.evaluate("matchMedia('(prefers-reduced-motion:reduce)').matches");assert pg.evaluate("localStorage.getItem('saldoclaro-v1')")=='legado-intocado';assert json.loads(pg.evaluate("localStorage.getItem('finly-v2')"))==json.loads(raw);c.close()
  # Touch navigation uses its drawer, without hover dependency.
  c=b.new_context(viewport={'width':360,'height':800},has_touch=True,is_mobile=True,reduced_motion='reduce');pg=c.new_page();pg.goto(url);pg.get_by_role('button',name='Alternar menu',exact=True).click();drawer=pg.get_by_role('dialog');expect(drawer).to_be_visible();pg.keyboard.press('Escape');drawer.wait_for(state='hidden');b.close()
 report={'engine':'axe-core '+json.loads((ROOT/'node_modules/axe-core/package.json').read_text())['version'],'runs':len(results),'violations':len(issues),'checks':results,'javascriptErrors':errors,'viewports':['1920x1080','1440x900','1366x768','1024','768','390','360']};(ART/'accessibility.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 if issues:print(json.dumps(issues,ensure_ascii=False,indent=2))
 assert not errors,errors
 if '--report-only' not in sys.argv:assert not issues,f'{len(issues)} WCAG AA violations; see accessibility.json'
 print(f'Accessibility: {len(results)} axe runs; {len(issues)} violations; three themes, seven widths, five tabs, real keyboard/focus/Escape/touch, preserved data')
finally:server.shutdown();server.server_close()
