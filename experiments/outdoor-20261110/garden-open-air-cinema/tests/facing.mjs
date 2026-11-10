import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { analyze } from '../placement.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const layout = JSON.parse(readFileSync(join(root, 'layout.json'), 'utf8'));
const report = analyze(layout);
const out = {
  ok: report.ok,
  chairCount: report.chairCount,
  facing: report.facing,
  minDot: report.minDot,
  issues: report.issues,
  rays: report.rays,
  feet: report.feet,
};
writeFileSync(join(root, 'tests', 'facing-result.json'), JSON.stringify(out, null, 2));
if (!report.ok) {
  console.error(report.issues.join('\n'));
  process.exit(1);
}
console.log(
  `ok — ${report.facing}/${report.chairCount} deckchairs face the screen, min dot ${report.minDot}, rays ${report.rays.map((r) => r.name + (r.clear ? ' clear' : ' blocked')).join(', ')}`,
);
