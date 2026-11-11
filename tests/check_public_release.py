#!/usr/bin/env python3
"""Validação estática mínima, sem dependências externas.

Não substitui revisão manual por informações financeiras pessoais.
"""
from pathlib import Path
import re
import subprocess
import sys
import tempfile

BASE=Path(__file__).resolve().parent.parent
s=(BASE/'index.html').read_text(encoding='utf-8')
js=re.findall(r'<script>(.*?)</script>', s, flags=re.S|re.I)
assert len(js)==1, 'Esperado um bloco JS embutido.'
assert 'const KEY=\'saldoclaro-v1\';' in s, 'Chave de compatibilidade v1 ausente'
assert 'entries:[],invoiceStatuses:{},pending:[]' in s, 'A primeira instalacao deve iniciar sem transacoes'
assert 'function validState' in s and 'function exportJSON' in s and 'function handleSaveEntry' in s
# Exige instalacao sem lancamentos embutidos; uma lista de valores reais na verificacao
# seria ela propria uma exposicao desnecessaria de dados particulares.
seed=re.search(r'function starter\(\)\s*\{([\s\S]*?)\n  \}\n  function validState',s)
assert seed, 'Bloco de inicializacao ausente'
assert 'entries:[]' in seed.group(1) and 'pending:[]' in seed.group(1)
assert 'salary:0,reserve:0' in seed.group(1)
assert not re.search(r'\badd\(',seed.group(1)), 'Nao inclua dados financeiros cadastrados no starter'
with tempfile.NamedTemporaryFile(mode='w',suffix='.js',encoding='utf-8') as tmp:
    tmp.write(js[0]);tmp.flush()
    subprocess.run(['node','--check',tmp.name],check=True)
print('OK: JavaScript valido; instalacao vazia; sem exemplos financeiros anteriores conhecidos.')
