"""Current routes and explicit synthetic data seeding for historical visual regressions."""
import json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def seed(context, fixture, theme='graphite'):
 raw=json.dumps(fixture)
 v2=subprocess.check_output(['node','--input-type=module','-e',"import {migrate} from './src/finance/model.ts';let raw='';for await(const c of process.stdin)raw+=c;console.log(JSON.stringify(await migrate(raw)))"],cwd=ROOT,input=raw,text=True).strip()
 context.add_init_script("if(!localStorage.getItem('finly-v2')){localStorage.setItem('saldoclaro-v1',"+json.dumps(raw)+");localStorage.setItem('finly-v2',"+json.dumps(v2)+");}if(!localStorage.getItem('finly-react-theme'))localStorage.setItem('finly-react-theme',"+json.dumps(theme)+");window.financialWrites=[];const setter=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(['finly-v2','saldoclaro-v1'].includes(k))financialWrites.push(k);return setter.call(this,k,v)};")
def go(page,route):
 page.goto(page.url.split('#')[0]+'#/'+route+'?competencia=2026-11')
 titles={'visao-geral':'Visão geral','lancamentos':'Lançamentos','planejamentos':'Meus planejamentos','configuracoes':'Configurações','fatura':'Fatura do cartão','reembolsos':'Reembolsos','parcelas':'Parcelas e recorrências'}
 page.get_by_role('heading',name=titles[route.split('/')[0]],exact=True).wait_for()

def theme(page,label):
 go(page,'configuracoes/aparencia');page.get_by_role('button',name=label,exact=True).click();go(page,'visao-geral')
def effects(page,enabled):
 go(page,'configuracoes/aparencia');page.get_by_label('Efeitos de luz',exact=True).set_checked(enabled);go(page,'visao-geral')
