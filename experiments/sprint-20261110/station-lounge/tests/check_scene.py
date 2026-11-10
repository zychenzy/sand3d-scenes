"""Static checks for the Northgate waiting-hall scene. No browser required."""
import json
import os
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


class SceneLayoutTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(os.path.join(ROOT, 'layout.json'), encoding='utf-8') as fh:
            cls.layout = json.load(fh)

    def test_zones_and_room(self):
        meta = self.layout['meta']
        self.assertIn('booking', meta['zones'])
        self.assertIn('waiting', meta['zones'])
        self.assertGreater(meta['room']['height'], 4.5)
        self.assertGreater(meta['vaultRise'], 1.2)
        crown = meta['springY'] + meta['vaultRise']
        self.assertGreater(crown, meta['springY'] + 1.5)

    def test_assets_resolve(self):
        for kind, spec in self.layout['assets'].items():
            path = os.path.join(ROOT, spec['glb'])
            self.assertTrue(os.path.isfile(path), kind)
            self.assertGreater(os.path.getsize(path), 500, kind)
            self.assertGreater(spec['targetHeight'], 0.02)

    def test_vendor_symlink(self):
        three = os.path.join(ROOT, 'vendor', 'three.module.js')
        self.assertTrue(os.path.isfile(three))

    def test_instances(self):
        kinds = set(self.layout['assets'])
        benches = [i for i in self.layout['instances'] if i['kind'] == 'museum_bench']
        self.assertGreaterEqual(len(benches), 6)
        rots = {round(i.get('rotationY', 0), 2) for i in benches}
        self.assertGreaterEqual(len(rots), 2, 'benches should not be one repeated orientation')
        ids = [i['id'] for i in self.layout['instances']]
        self.assertEqual(len(ids), len(set(ids)))
        for inst in self.layout['instances']:
            self.assertIn(inst['kind'], kinds)
            x, y, z = inst['position']
            self.assertTrue(-6.6 <= x <= 6.4, inst['id'])
            self.assertTrue(-0.05 <= y <= 4.6, inst['id'])
            self.assertTrue(-5.7 <= z <= 4.6, inst['id'])

    def test_booking_chair_faces_window(self):
        chair = next(i for i in self.layout['instances'] if i['id'] == 'booking_chair')
        self.assertAlmostEqual(chair['rotationY'], 3.1416, places=3)
        self.assertLess(chair['position'][2], -2.5)

    def test_cameras_and_warm_cool_lights(self):
        self.assertIn('corner', self.layout['cameraPresets'])
        self.assertIn('close', self.layout['cameraPresets'])
        dirs = {d['name'] for d in self.layout['lights']['dirs']}
        self.assertIn('windows', dirs)
        self.assertIn('key', dirs)
        self.assertGreaterEqual(len(self.layout['lights']['points']), 3)

    def test_entry_files(self):
        for name in ('index.html', 'station.js', 'scene_lib.js', 'README.md', 'SPEC.md'):
            self.assertTrue(os.path.isfile(os.path.join(ROOT, name)), name)


if __name__ == '__main__':
    unittest.main()
