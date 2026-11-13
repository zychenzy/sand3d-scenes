#!/usr/bin/env python3
"""Layout checks for the watchmaker repair shop. No browser required."""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LAYOUT = os.path.join(HERE, 'layout.json')


def forward(rot):
    return (-math.sin(rot), math.cos(rot))


def main():
    with open(LAYOUT, encoding='utf-8') as f:
        layout = json.load(f)
    errors = []

    def check(cond, msg):
        if not cond:
            errors.append(msg)

    room = layout['meta']['room']
    anchors = layout['meta']['anchors']
    zones = {z['id'] for z in layout['meta']['zones']}
    for zid in ('bench', 'drawers', 'clocks', 'counter', 'waiting'):
        check(zid in zones, 'missing zone ' + zid)

    ids = [i['id'] for i in layout['instances']]
    check(len(ids) == len(set(ids)), 'duplicate instance ids')
    by_id = {i['id']: i for i in layout['instances']}

    half_w = room['width'] / 2 - 0.12
    half_d = room['depth'] / 2 - 0.12
    for inst in layout['instances']:
        spec = layout['assets'].get(inst['kind'])
        check(spec is not None, 'unknown kind ' + inst['kind'])
        x, y, z = inst['position']
        check(-half_w <= x <= half_w, inst['id'] + ' x out of room')
        check(-half_d <= z <= half_d, inst['id'] + ' z out of room')
        check(-0.01 <= y <= room['height'], inst['id'] + ' y out of room')
        if inst['kind'] in ('dining_chair', 'bar_stool'):
            check('lookAt' in inst, inst['id'] + ' missing lookAt')
            if 'lookAt' in inst:
                fx, fz = forward(inst.get('rotationY') or 0)
                dx = inst['lookAt'][0] - x
                dz = inst['lookAt'][1] - z
                n = math.hypot(dx, dz)
                check(n > 0.3, inst['id'] + ' lookAt too close')
                if n > 0:
                    dot = (fx * dx + fz * dz) / n
                    check(dot > 0.75, '%s faces away (dot %.2f)' % (inst['id'], dot))

    for kind, spec in layout['assets'].items():
        glb = spec['glb']
        check(glb.startswith('../../../'), kind + ' must use a repo-root relative path')
        check('://' not in glb, kind + ' must be offline')
        path = os.path.normpath(os.path.join(HERE, glb))
        check(path.startswith(REPO + os.sep), kind + ' escapes the repo')
        check(os.path.isfile(path), 'missing ' + glb)
        check(spec['targetHeight'] > 0.05, kind + ' target height')

    bench = anchors['bench']
    counter = anchors['counter']
    check(bench['top'] - counter['top'] >= 0.2, 'bench should be clearly raised above the counter')
    check(abs(by_id['bench_lamp']['position'][1] - bench['top']) < 0.001, 'bench lamp not on the bench')
    check(abs(by_id['counter_lamp']['position'][1] - counter['top']) < 0.001, 'counter lamp not on the counter')
    check(abs(by_id['bench_etagere']['position'][1] - bench['top']) < 0.001, 'parts rack not on the bench')
    check(abs(by_id['maker_stool']['position'][0] - anchors['stool']['x']) < 0.001, 'stool anchor drift')
    check(abs(by_id['maker_stool']['position'][2] - anchors['stool']['z']) < 0.001, 'stool z drift')

    front = bench['z'] + bench['d'] / 2
    stool_z = by_id['maker_stool']['position'][2]
    check(stool_z > front + 0.15, 'stool is not on the room side of the bench')
    check(stool_z < front + 0.7, 'stool is too far from the bench to use the bite')

    customer_edge = counter['z'] + counter['d'] / 2
    for cid in ('chair_customer_l', 'chair_customer_r'):
        cz = by_id[cid]['position'][2]
        check(cz > customer_edge + 0.25, cid + ' is not on the customer side')
    maker_side = counter['z'] - counter['d'] / 2
    check(stool_z < maker_side - 0.9, 'no walkway between the counter and the bench stool')

    # Customer approach, between the chairs and the waiting bench, stays empty.
    for inst in layout['instances']:
        x, _, z = inst['position']
        in_lane = -0.15 < x < 1.25 and 0.95 < z < 3.3
        check(not in_lane, inst['id'] + ' stands in the customer lane')

    check(abs(by_id['waiting_bench']['rotationY'] - math.pi / 2) < 0.02, 'waiting bench should run along X')
    check(by_id['parts_shelf']['position'][1] > 1.4, 'parts shelf should be on the wall, not the floor')
    check(by_id['pendant']['position'][1] > 1.8, 'pendant should hang')

    html = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
    check('watchmaker.js' in html, 'index does not load watchmaker.js')
    check('http://' not in html and 'https://' not in html, 'index pulls a remote URL')
    check('workshop/vendor/three.module.js' in html, 'three.js is not the vendored offline build')
    lib = open(os.path.join(HERE, 'scene_lib.js'), encoding='utf-8').read()
    check('MeshToonMaterial' in lib and 'MeshBasicMaterial' in lib, 'toon/unlit pair missing')
    check("shadingMode = 'toon'" in lib, 'toon is not the default')

    if errors:
        print('FAIL')
        for e in errors:
            print(' -', e)
        return 1
    print('ok', len(layout['instances']), 'instances', len(layout['assets']), 'assets')
    return 0


if __name__ == '__main__':
    sys.exit(main())
