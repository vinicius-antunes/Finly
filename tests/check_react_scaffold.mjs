import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const root = process.cwd();
const content = path => readFileSync(join(root, path), 'utf8');
const pkg = JSON.parse(content('package.json'));
assert.equal(pkg.name, 'finly-react');
assert.ok(pkg.dependencies.react && pkg.devDependencies.vite && pkg.devDependencies.tailwindcss);
assert.ok(existsSync(join(root,'public/legacy/index.html')), 'Aplicação legada ausente');
assert.ok(existsSync(join(root,'public/legacy/assets/aurora.css')));
assert.ok(existsSync(join(root,'public/legacy/assets/theme.js')));
assert.match(content('public/legacy/index.html'), /saldoclaro-v1/);
assert.match(content('src/lib/legacy.ts'), /saldoclaro-v1/);
const files = readdirSync(join(root,'src'), {recursive:true}).filter(path => /\.(ts|tsx)$/.test(path)).map(path => 'src/'+path);
const src = [...files,'public/theme-init.js'].map(content).join('\n');
assert.doesNotMatch(src, /localStorage\.setItem\s*\(\s*['"]saldoclaro-v1['"]/);
assert.doesNotMatch(src, /localStorage\.removeItem\s*\(\s*['"]saldoclaro-v1['"]/);
assert.doesNotMatch(src, /finly-v2/);
assert.ok(existsSync(join(root,'MIGRACAO_REACT.md')));
console.log('OK: scaffold React, fallback legado e nenhuma gravação financeira na prévia.');

assert.ok(existsSync(join(root, 'package-lock.json')), 'Lockfile necessário para npm ci');
assert.ok(existsSync(join(root, 'docs/licenses/react-bits.txt')));
assert.ok(existsSync(join(root, 'docs/licenses/shadcn-ui.txt')));
assert.match(content('index.html'), /theme-init\.js/);

assert.ok(!existsSync(join(root, 'src/components/aceternity')), 'Não publicar os fontes protegidos da Aceternity');
assert.doesNotMatch(src, /CanvasRevealEffect/);
assert.ok(existsSync(join(root, 'docs/licenses/magic-ui.txt')));
