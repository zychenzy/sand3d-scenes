import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { validate, buildInstances } from '../placement.js';

const sceneDir = path.resolve(import.meta.dirname, '..');

test('chairs face games, tables are large, and zones clear each other', () => {
  const errors = validate();
  assert.deepEqual(errors, [], errors.join('\n'));
});

test('every instance kind points at a GLB that exists on disk', () => {
  const layout = JSON.parse(fs.readFileSync(path.join(sceneDir, 'layout.json'), 'utf8'));
  const instances = buildInstances();
  assert.ok(instances.length > 35);
  const kinds = new Set(instances.map((i) => i.kind));
  for (const kind of kinds) {
    assert.ok(layout.assets[kind], `layout missing asset ${kind}`);
    const file = path.resolve(sceneDir, layout.assets[kind].glb);
    assert.ok(fs.existsSync(file), file);
  }
});
