import {describe,it,expect} from 'vitest';
import {initialDesigns,resolve,cssExport,exportDesign} from '../src/model';
import catalog from '../src/data/catalog.json';
describe('design contracts',()=>{
 it('has independent themes and complete colors',()=>{expect(initialDesigns).toHaveLength(5);expect(new Set(initialDesigns.map(x=>x.tokens.background)).size).toBe(5);});
 it('resolves global/category/instance without mutation',()=>{const d=structuredClone(initialDesigns[0]);d.categories.cards={padding:30};d.individual.demo={padding:12};expect(resolve(d,'cards','demo').padding).toBe(12);expect(resolve(d,'cards').padding).toBe(30);expect(d.tokens.padding).toBe(20);});
 it('exports versioned visual-only JSON and CSS',()=>{const d=initialDesigns[0],data=exportDesign(d,[],[]);expect(data.version).toBe(1);expect(data.schema).toBe('finly-ui-lab/design');expect(cssExport(d)).toContain('--radius: 16px');expect(data).not.toHaveProperty('transactions');});
 it('catalogue has unique ids and genuine integration boundaries',()=>{expect(new Set(catalog.map(x=>x.id)).size).toBe(catalog.length);expect(catalog.length).toBeGreaterThan(1500);expect(catalog.filter(x=>x.status==='integrated')).toHaveLength(13);expect(catalog.filter(x=>x.source==='reactbits').every(x=>x.status==='catalogued')).toBe(true);expect(catalog.every(x=>x.official.startsWith('https://'))).toBe(true);});
});
