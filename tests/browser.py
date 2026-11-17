"""Real Chromium functional smoke test, synthetic visual data only."""
import functools,http.server,threading,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'docs/evidence';ART.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,headless=True);page=b.new_page(viewport={'width':1440,'height':1100},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);page.get_by_role('heading',name='Sua próxima interface começa aqui.').wait_for();page.evaluate('document.fonts.ready');page.screenshot(path=str(ART/'overview-desktop.png'),full_page=True)
  page.goto(url+'/#library');page.get_by_label('Buscar componentes').fill('magic');page.get_by_role('combobox',name='Biblioteca',exact=True).select_option('magicui');page.get_by_label('Disponibilidade').select_option('integrated');page.locator('.catalog-tile').first.get_by_role('button',name='Comparar',exact=True).click();page.locator('.comparison').wait_for();page.locator('.comparison').get_by_role('button',name='Fechar',exact=True).click();page.locator('.catalog-thumb button').first.click();page.locator('.add-demo').first.click()
  page.goto(url+'/#playground');page.locator('.play-item').first.wait_for();count=page.locator('.play-item').count();page.get_by_label('Adicionar componente integrado').select_option('chart-line');assert page.locator('.play-item').count()==count+1;page.get_by_label('Desfazer',exact=True).click();assert page.locator('.play-item').count()==count;page.get_by_label('Refazer',exact=True).click();assert page.locator('.play-item').count()==count+1
  page.locator('.inspector').get_by_label('Aplicar em',exact=True).select_option('cards');page.get_by_label('Padding',exact=True).fill('30');assert page.locator('.money-card').first.evaluate('(e)=>getComputedStyle(e).paddingTop')=='30px';page.locator('.inspector').get_by_label('Aplicar em',exact=True).select_option('individual');page.locator('.inspector').get_by_label('Instância',exact=True).select_option('balance');page.get_by_label('Padding',exact=True).fill('12');assert page.locator('.money-card').first.evaluate('(e)=>getComputedStyle(e).paddingTop')=='12px';page.locator('.inspector').get_by_label('Aplicar em',exact=True).select_option('global');page.get_by_label('Arredondamento',exact=True).fill('24');page.get_by_label('Valor primary',exact=True).fill('#aaff99');page.screenshot(path=str(ART/'playground-desktop.png'),full_page=True)
  page.goto(url+'/#presets');page.locator('.save-preset input').fill('Preset de teste');page.get_by_role('button',name='Salvar cópia',exact=True).click();page.reload();page.get_by_role('button',name='Preset de teste',exact=True).wait_for();page.get_by_role('button',name='Favoritos',exact=False).click();assert page.locator('.catalog-tile').count()>0
  page.get_by_role('button',name='Exportar design',exact=True).click()
  with page.expect_download() as d:page.get_by_role('button',name='JSON estruturado',exact=True).click()
  data=json.loads(Path(d.value.path()).read_text());assert data['version']==1 and data['design']['name']=='Preset de teste' and data['design']['tokens']['primary']=='#aaff99';assert 'transactions' not in data
  page.get_by_role('button',name='Exportar design',exact=True).click()
  with page.expect_download() as d:page.get_by_role('button',name='Variáveis CSS',exact=True).click()
  assert '--primary' in Path(d.value.path()).read_text()
  for route in ['overview','library','identity','playground','preview','presets']:
   page.goto(url+'/#'+route);page.locator('main h1').wait_for()
   for width in [1440,768,390,360]:
    page.set_viewport_size({'width':width,'height':1000 if width>390 else 844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(route,width)
    if width==390:page.screenshot(path=str(ART/f'{route}-mobile.png'),full_page=True)
  assert not errors,errors;page.set_viewport_size({'width':1440,'height':1000});page.goto(url+'/#overview');page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));result=page.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)}))}");(ART/'accessibility.json').write_text(json.dumps(result,indent=2));print('Axe findings:',result);assert not result,result;b.close()
 print('PASS: routes, filtering, comparison, favorite, add, undo/redo, editor, preset persistence, JSON/CSS exports, 4 viewports, no JS errors')
finally:server.shutdown();server.server_close()
