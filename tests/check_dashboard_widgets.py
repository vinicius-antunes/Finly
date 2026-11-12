import ast,json,functools,http.server,threading,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;art=root/'docs/dashboard-tuning/evidence';art.mkdir(parents=True,exist_ok=True);tree=ast.parse((root/'tests/check_home.py').read_text());fixture=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture' for t in n.targets));raw=subprocess.check_output(['node','--input-type=module','-e',"import {migrate} from './src/finance/model.ts';console.log(JSON.stringify(await migrate(process.argv[1])))",json.dumps(fixture)],cwd=root,text=True).strip()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root/'dist')));threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True);pg=b.new_page(viewport={'width':1920,'height':1080});pg.add_init_script(f"localStorage.setItem('finly-v2',{json.dumps(raw)})");pg.goto(f'http://127.0.0.1:{s.server_port}/#/visao-geral?competencia=2026-11');pg.locator('.recharts-bar-rectangle').last.wait_for();original=pg.evaluate("localStorage.getItem('finly-v2')");cards=pg.locator('.executive-dashboard .magic-card');assert cards.count()==9
 for i in range(9):
  card=cards.nth(i);card.hover();assert card.get_attribute('data-active')=='true';assert card.evaluate('(e)=>getComputedStyle(e,"::before").pointerEvents')=='none'
 pg.locator('.monthly-spending').hover();pg.screenshot(path=str(art/'glow-chart.png'));pg.locator('.recharts-bar-rectangle').last.hover();pg.get_by_text('novembro de 2026',exact=True).wait_for();pg.screenshot(path=str(art/'tooltip.png'))
 assert pg.locator('.chart-values').count()==0;assert pg.locator('.monthly-spending table tbody tr').count()==6
 chart=pg.locator('.monthly-bars [tabindex="0"]').first;pg.mouse.move(10,5);chart.focus();pg.keyboard.press('ArrowRight');pg.locator('.recharts-tooltip-wrapper').wait_for(state='visible');pg.locator('h1').click()
 sizes=[]
 for w,h,name in [(1920,1080,'desktop'),(1366,768,'notebook'),(390,844,'mobile')]:
  pg.set_viewport_size({'width':w,'height':h});pg.mouse.move(w-5,5);pg.wait_for_timeout(250);assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth');assert pg.locator('.home-primary-grid').evaluate('(e)=>e.getBoundingClientRect().bottom')<=pg.locator('.home-indicators').evaluate('(e)=>e.getBoundingClientRect().top');assert pg.locator('.home-indicators').evaluate('(e)=>e.getBoundingClientRect().bottom')<=pg.locator('.home-middle-grid').evaluate('(e)=>e.getBoundingClientRect().top');pg.screenshot(path=str(art/(name+'.png')),full_page=True);sizes.append({'width':w,'height':h,'dashboardHeight':round(pg.locator('.executive-dashboard').bounding_box()['height'])})
 assert sizes[0]['dashboardHeight']>sizes[1]['dashboardHeight'];(art.parent/'layout.json').write_text(json.dumps(sizes,indent=2))
 for theme in ['graphite','dark','light']:
  pg.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme);pg.set_viewport_size({'width':1440,'height':1000});cards.last.hover();assert cards.last.get_attribute('data-active')=='true';pg.screenshot(path=str(art/(theme+'.png')))
 pg.mouse.move(1435,5);pg.emulate_media(reduced_motion='reduce');cards.last.hover();assert cards.last.get_attribute('data-active') is None
 assert pg.evaluate("localStorage.getItem('finly-v2')")==original
 pg.get_by_role('button',name='Consultar Fatura do cartão',exact=True).click();pg.get_by_role('heading',name='Fatura do cartão',exact=True).wait_for();assert pg.evaluate("localStorage.getItem('finly-v2')")==original
 b.close();print('PASS: nine shared MagicCards, pointer-transparent glow, tooltip, keyboard chart, accessible six-row table, height-aware desktop/notebook/mobile, themes/reduced motion, actions and unchanged finances')

s.shutdown()
