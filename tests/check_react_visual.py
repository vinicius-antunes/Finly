"""Current production UI; retains theme, invariance, contrast, fallback and legacy assertions."""
import functools,hashlib,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from visual_helpers import seed,go,theme,effects
ROOT=Path(__file__).resolve().parents[1];ART=Path('/tmp/finly-react-regression');ART.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
fixture={'version':1,'settings':{},'entries':[{'id':'i','description':'Receita sintética','amount':100,'month':'2026-11','kind':'income','status':'received'},{'id':'e','description':'Despesa sintética','amount':20,'month':'2026-11','kind':'out'},{'id':'c','description':'Compra sintética','amount':30,'month':'2026-11','kind':'credit','confirmed':True},{'id':'r','description':'Reembolso sintético','amount':5,'month':'2026-11','kind':'reimbursement','status':'received'},{'id':'p','description':'Reembolso previsto','amount':99,'month':'2026-11','kind':'reimbursement','status':'planned'}]}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True);c=b.new_context();pg=c.new_page();pg.goto(url);expect(pg.locator('.home-indicator')).to_have_count(4);empty=json.loads(pg.evaluate("localStorage.getItem('finly-v2')"));assert empty['transactions']==[] and 'entryLedger' not in empty;pg.screenshot(path=str(ART/'empty.png'));c.close()
  c=b.new_context(viewport={'width':1440,'height':900});seed(c,fixture);pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(url);baseline=pg.evaluate("localStorage.getItem('finly-v2')")
  for token,label in [('graphite','Graphite Green'),('dark','Escuro Padrão'),('light','Claro')]:
   theme(pg,label);pg.reload();go(pg,'visao-geral');assert pg.locator('html').get_attribute('data-theme')==token;assert pg.locator('.home-indicator strong').all_text_contents()==['R$\xa030,00','R$\xa020,00','R$\xa0105,00','R$\xa099,00']
   colors=pg.evaluate("()=>{const keys=['--foreground','--muted-foreground','--card','--background','--positive','--primary','--primary-foreground'];const c=document.createElement('canvas').getContext('2d');return Object.fromEntries(keys.map(k=>{c.clearRect(0,0,1,1);c.fillStyle=getComputedStyle(document.documentElement).getPropertyValue(k).trim();c.fillRect(0,0,1,1);return[k,[...c.getImageData(0,0,1,1).data].slice(0,3)]}))}")
   def lum(rgb):return sum((v/255/12.92 if v/255<=.04045 else ((v/255+.055)/1.055)**2.4)*w for v,w in zip(rgb,[.2126,.7152,.0722]))
   for fg,bg in [('--foreground','--background'),('--muted-foreground','--card'),('--positive','--card'),('--primary-foreground','--primary')]:
    lo,hi=sorted([lum(colors[fg]),lum(colors[bg])]);assert (hi+.05)/(lo+.05)>=4.5,(token,fg,bg)
   for w,h in [(1440,900),(1366,768),(768,1024),(390,844)]:pg.set_viewport_size({'width':w,'height':h});assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth');pg.screenshot(path=str(ART/f'{token}-{w}.png'))
   pg.set_viewport_size({'width':1440,'height':900});pg.locator('.magic-card').first.hover();assert pg.locator('.magic-card').first.get_attribute('data-active')=='true'
   if token=='graphite':pg.wait_for_selector('.light-rays__canvas');effects(pg,False);assert pg.locator('.light-rays__canvas').count()==0;effects(pg,True)
   go(pg,'lancamentos');assert pg.locator('.entries-desktop tbody tr').count()==5;go(pg,'planejamentos');expect(pg.get_by_role('button',name='Novo planejamento',exact=True)).to_be_visible();go(pg,'visao-geral');assert pg.evaluate("localStorage.getItem('finly-v2')")==baseline;assert pg.evaluate('financialWrites')==[]
  pg.emulate_media(reduced_motion='reduce');theme(pg,'Graphite Green');assert pg.locator('.light-rays__canvas').count()==0;pg.keyboard.press('Tab');assert pg.evaluate('document.activeElement!==document.body')
  for asset in ['legacy/index.html','legacy/assets/theme.js','legacy/assets/aurora.css']:
   r=pg.request.get(url+'/'+asset);assert r.status==200 and hashlib.sha256(r.body()).digest()==hashlib.sha256((ROOT/'public'/asset).read_bytes()).digest()
  assert not errors;c.close()
  for raw in ['{bad',None]:
   c=b.new_context(reduced_motion='reduce',has_touch=True,viewport={'width':390,'height':844})
   if raw:c.add_init_script('localStorage.setItem("finly-v2",'+json.dumps(raw)+');')
   pg=c.new_page();pg.goto(url)
   if raw:expect(pg.get_by_role('alert').first).to_be_visible();assert pg.evaluate("localStorage.getItem('finly-v2')")==raw
   else:expect(pg.locator('.home-overview')).to_be_visible()
   assert pg.locator('.light-rays__canvas').count()==0;c.close()
  c=b.new_context();c.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('denied')}})");pg=c.new_page();pg.goto(url);expect(pg.get_by_role('alert').first).to_be_visible();c.close()
  for key,value in [('finly-react-theme','dark'),('finly-theme','light')]:
   c=b.new_context();c.add_init_script(f'localStorage.setItem({json.dumps(key)},{json.dumps(value)})');pg=c.new_page();pg.goto(url);assert pg.locator('html').get_attribute('data-theme')==value;c.close()
  c=b.new_context();c.add_init_script("HTMLCanvasElement.prototype.getContext=function(){return null}");pg=c.new_page();gpuerrors=[];pg.on('pageerror',lambda e:gpuerrors.append(str(e)));pg.goto(url);expect(pg.locator('.home-balance')).to_be_visible();assert not gpuerrors;c.close();b.close()
 print('PASS: current Home/themes/preferences/contrast/four widths/hover/reduced motion/touch, exact financial invariance, corrupt/denied storage, GPU fallback, byte-identical legacy')
finally:server.shutdown();server.server_close()
