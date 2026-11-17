"""Default lab pages AA scan at desktop/mobile, plus five preview palettes."""
import functools,http.server,threading,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}';results=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,headless=True);pg=b.new_page(reduced_motion='reduce')
  for route in ['overview','library','identity','playground','preview','presets']:
   pg.goto(url+'/#'+route);pg.locator('main h1').wait_for()
   for width in [1440,390]:
    pg.set_viewport_size({'width':width,'height':1000 if width==1440 else 844});pg.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));r=pg.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}");results.append({'route':route,'width':width,'violations':r})
  b.close()
 (ROOT/'docs/evidence/accessibility-pages.json').write_text(json.dumps(results,indent=2));violations=[x for x in results if x['violations']];print(json.dumps(violations,indent=2));assert not violations;print('PASS: 12 axe AA page scans at desktop/mobile')
finally:server.shutdown();server.server_close()
