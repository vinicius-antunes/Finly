#!/usr/bin/env python3
"""Validate repository agent infrastructure; standard library, Python >= 3.11."""
from pathlib import Path
import re
import shutil
import sys
import tempfile
import tomllib

BASE = Path(__file__).resolve().parent.parent
AGENTS = {
    'finance-architect': 'finance_architect',
    'frontend-reviewer': 'frontend_reviewer',
    'test-analyst': 'test_analyst',
    'privacy-reviewer': 'privacy_reviewer',
}
SKILLS = ('finly-financial-invariants', 'finly-safe-migration',
          'finly-browser-qa', 'finly-public-release')
COMMANDS = ('python3 tests/check_public_release.py',
            'python3 tests/check_agent_setup.py')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(root, relative):
    path = root / relative
    require(path.is_file(), f'{relative}: arquivo ausente')
    return path.read_text(encoding='utf-8')


def parse(root, relative):
    try:
        return tomllib.loads(read(root, relative))
    except tomllib.TOMLDecodeError as exc:
        raise ValueError(f'{relative}: TOML inválido: {exc}') from exc


def validate(root):
    config = parse(root, '.codex/config.toml')
    require(set(config) == {'agents'}, '.codex/config.toml: seção inesperada')
    roles = config['agents']
    require(isinstance(roles, dict), 'agents: tabela TOML obrigatória')
    limit = roles.get('max_concurrent_threads_per_session')
    require(type(limit) is int and 1 <= limit <= 3, 'agents: concorrência deve ser 1..3')
    require(set(roles) == set(AGENTS.values()) | {'max_concurrent_threads_per_session'},
            'agents: papéis esperados ausentes ou desconhecidos')
    paths = list((root / '.codex/agents').glob('*.toml'))
    require({p.stem for p in paths} == set(AGENTS), '.codex/agents: arquivos inesperados/ausentes')
    names = set()
    for path in paths:
        relative = path.relative_to(root).as_posix()
        agent = parse(root, relative)
        for field in ('name', 'description', 'developer_instructions'):
            require(isinstance(agent.get(field), str) and agent[field].strip(),
                    f'{relative}: {field} obrigatório')
        require(set(agent) == {'name', 'description', 'developer_instructions'},
                f'{relative}: não force modelo, raciocínio ou permissões')
        name = agent['name']
        require(name not in names, f'{relative}: nome duplicado')
        names.add(name)
        require(name == AGENTS[path.stem], f'{relative}: nome inesperado')
        role = roles[name]
        require(isinstance(role, dict), f'agents.{name}: tabela obrigatória')
        require(set(role) == {'config_file', 'description'}, f'agents.{name}: campos inválidos')
        require(isinstance(role['description'], str) and role['description'].strip(), f'agents.{name}: descrição vazia')
        require(role['config_file'] == f'agents/{path.name}', f'agents.{name}: caminho incorreto')
    names, descriptions = set(), set()
    actual = {p.parent.name for p in (root / '.agents/skills').glob('*/SKILL.md')}
    require(actual == set(SKILLS), '.agents/skills: Skills ausentes ou inesperadas')
    for skill in SKILLS:
        relative = f'.agents/skills/{skill}/SKILL.md'
        text = read(root, relative)
        parts = text.split('---\n', 2)
        require(len(parts) == 3 and not parts[0], f'{relative}: frontmatter obrigatório')
        metadata = {}
        # Restricted scalar YAML subset used by these Skills; not a general YAML parser.
        for line in parts[1].splitlines():
            match = re.fullmatch(r'(name|description): (.+)', line)
            require(match is not None, f'{relative}: esperado campo YAML escalar')
            key, value = match.groups()
            require(key not in metadata and value.strip(), f'{relative}: campo vazio/duplicado')
            metadata[key] = value.strip()
        require(set(metadata) == {'name', 'description'}, f'{relative}: metadados incompletos')
        require(metadata['name'] == skill and skill not in names, f'{relative}: nome inválido/duplicado')
        require(metadata['description'] not in descriptions, f'{relative}: descrição duplicada')
        require(parts[2].strip(), f'{relative}: corpo vazio')
        names.add(skill)
        descriptions.add(metadata['description'])
    docs = read(root, 'docs/AGENT_WORKFLOW.md')
    workflow = read(root, '.github/workflows/validate.yml')
    require('docs/AGENT_WORKFLOW.md' in read(root, 'README.md'), 'README: link de workflow ausente')
    for command in COMMANDS:
        require(command in docs and command in workflow, f'{command}: ausente da documentação/CI')
    for command in re.findall(r'python3 (tests/[\w./-]+\.py)', docs + workflow):
        read(root, command)
    for fragment in ('pull_request:', 'push:', 'branches: [main]', 'contents: read',
                     'actions/setup-python@', 'actions/setup-node@'):
        require(fragment in workflow, f'validate.yml: contrato ausente: {fragment}')
    require('${{ secrets.' not in workflow and 'pull_request_target:' not in workflow,
            'validate.yml: secrets/evento privilegiado proibidos')


def negative_checks():
    cases = {
        'TOML inválido': ('.codex/config.toml', '[agents'),
        'tipo inválido': ('.codex/config.toml', 'agents = []\n'),
        'campo de agente ausente': ('.codex/agents/finance-architect.toml', 'name = "finance_architect"\n'),
        'Skill sem descrição': ('.agents/skills/finly-safe-migration/SKILL.md',
                                '---\nname: finly-safe-migration\n---\nCorpo\n'),
        'comando inexistente': ('docs/AGENT_WORKFLOW.md',
                                (BASE / 'docs/AGENT_WORKFLOW.md').read_text() + '\npython3 tests/missing.py\n'),
    }
    for label, (relative, invalid) in cases.items():
        with tempfile.TemporaryDirectory(prefix='finly-agent-check-') as directory:
            root = Path(directory)
            for item in ('.codex', '.agents', '.github', 'docs', 'tests'):
                shutil.copytree(BASE / item, root / item)
            shutil.copy2(BASE / 'README.md', root / 'README.md')
            (root / relative).write_text(invalid, encoding='utf-8')
            try:
                validate(root)
            except ValueError as exc:
                print(f'OK: amostra rejeitada ({label}): {exc}')
            else:
                raise ValueError(f'amostra inválida aceita: {label}')


if __name__ == '__main__':
    try:
        validate(BASE)
        negative_checks()
    except (ValueError, OSError, TypeError, KeyError) as exc:
        print(f'FAIL: {exc}', file=sys.stderr)
        sys.exit(1)
    print('OK: agentes, Skills, comandos e configuração; 5 testes negativos passaram.')
